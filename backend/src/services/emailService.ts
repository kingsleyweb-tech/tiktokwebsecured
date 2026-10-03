import nodemailer from 'nodemailer';

export interface EmailConfigResponse {
  tiktok: { displayName: string; email: string; configured: boolean; smtpHost: string };
  snapchat: { displayName: string; email: string; configured: boolean; smtpHost: string };
}

export interface EmailStatusResponse {
  tiktok: { status: 'connected' | 'disconnected' | 'not_configured'; error?: string };
  snapchat: { status: 'connected' | 'disconnected' | 'not_configured'; error?: string };
}

// Rate limiting storage: client IP -> array of timestamps
const emailRateLimits = new Map<string, number[]>();

export function checkEmailRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1-minute window
  const maxRequests = 5;      // max 5 requests per window

  let timestamps = emailRateLimits.get(ip) || [];
  timestamps = timestamps.filter(ts => now - ts < windowMs);
  if (timestamps.length >= maxRequests) return false;
  timestamps.push(now);
  emailRateLimits.set(ip, timestamps);
  return true;
}

/** Classify SMTP errors into safe, user-readable messages without leaking credentials */
export function classifySmtpError(err: any): { statusCode: number; message: string } {
  const raw: string = (err?.message || err?.code || err?.response || '').toLowerCase();
  const code: string = (err?.responseCode || err?.code || '').toString().toLowerCase();

  console.error('[EmailService] Raw SMTP error:', {
    message: err?.message,
    code: err?.code,
    responseCode: err?.responseCode,
    response: err?.response,
    command: err?.command,
  });

  if (raw.includes('invalid login') || raw.includes('badcredentials') || raw.includes('535') || raw.includes('username and password not accepted') || code === '535') {
    return { statusCode: 401, message: 'SMTP authentication failed. Check that your Google App Password is correct and that 2-Step Verification is enabled on your Google account.' };
  }
  if (raw.includes('econnrefused') || raw.includes('etimedout') || raw.includes('enotfound') || raw.includes('connect timeout') || raw.includes('connection timeout')) {
    return { statusCode: 503, message: 'Cannot reach the SMTP server. Check SMTP_HOST and SMTP_PORT, and make sure port 465 (SSL) is not blocked by a firewall.' };
  }
  if (raw.includes('self signed') || raw.includes('unable to verify') || raw.includes('certificate')) {
    return { statusCode: 502, message: 'TLS/SSL certificate error connecting to SMTP server.' };
  }
  if (raw.includes('550') || raw.includes('message rejected') || raw.includes('policy')) {
    return { statusCode: 422, message: `Email rejected by Gmail: ${err?.response || 'policy violation or spam filter'}. Try sending from a different Gmail account.` };
  }
  if (raw.includes('421') || raw.includes('too many') || raw.includes('rate')) {
    return { statusCode: 429, message: 'Gmail rate limit hit. Wait a few minutes and try again.' };
  }
  // Fallback — include the raw error for debugging
  return { statusCode: 500, message: `Email sending failed: ${err?.message || err?.code || 'Unknown SMTP error'}. Check server logs for full details.` };
}

/** Build a nodemailer transport config.
 *  Tries platform-specific vars first (TIKTOK_SMTP_* / SNAPCHAT_SMTP_*),
 *  then falls back to the shared SMTP_* vars.
 *  Supports port 465 (SSL/secure=true) and port 587 (STARTTLS/secure=false). */
export function buildTransporter(platform?: string) {
  const pfx = platform ? `${platform.toUpperCase()}_SMTP` : null;

  const host = (pfx && process.env[`${pfx}_HOST`]) || process.env.SMTP_HOST || '';
  const port = parseInt((pfx && process.env[`${pfx}_PORT`]) || process.env.SMTP_PORT || '587', 10);
  const user = (pfx && process.env[`${pfx}_USER`]) || process.env.SMTP_USER || '';
  const pass = (pfx && process.env[`${pfx}_PASSWORD`]) || process.env.SMTP_PASSWORD || '';
  const resendApiKey = process.env.RESEND_API_KEY || '';
  const fromEmail = (pfx && process.env[`${pfx}_FROM`]) || process.env.SMTP_FROM_EMAIL || 'onboarding@resend.dev';

  // Port 465 uses direct SSL; port 587 uses STARTTLS (secure=false + requireTLS=true)
  const useSSL = port === 465;

  return { 
    host, 
    port, 
    user, 
    pass, 
    configured: !!(host && user && pass), 
    useSSL,
    resendApiKey,
    fromEmail
  };
}

/** Verify connection status of the SMTP transporters */
export async function checkPlatformSmtpStatus(platform: string): Promise<{ status: 'connected' | 'disconnected' | 'not_configured'; error?: string }> {
  const { host: h, port: p, user: u, pass: pw, configured: c, useSSL, resendApiKey } = buildTransporter(platform);
  
  if (resendApiKey) {
    return { status: 'connected' };
  }
  
  if (!c) {
    return { status: 'not_configured', error: `Missing ${platform.toUpperCase()} configuration variables in env` };
  }
  try {
    const transporter = nodemailer.createTransport({ host: h, port: p, secure: useSSL, auth: { user: u, pass: pw }, connectionTimeout: 6000 });
    await transporter.verify();
    return { status: 'connected' };
  } catch (err: any) {
    const { message } = classifySmtpError(err);
    return { status: 'disconnected', error: message };
  }
}

import path from 'path';
import fs from 'fs';

export interface PlatformBrandInfo {
  displayName: string;
  headerBg: string;
  accentBarBg: string;
  senderName: string;
  companyName: string;
  address: string;
  termsUrl: string;
  privacyUrl: string;
  logoFilename: string;
  cid: string;
}

export function getPlatformBrandInfo(platform: string): PlatformBrandInfo {
  const p = (platform || '').toLowerCase();
  if (p.includes('tiktok') || p === 'tpl-002') {
    return {
      displayName: 'Team TikTok',
      headerBg: '#010101',
      accentBarBg: '#FE2C55',
      senderName: 'TikTok Team',
      companyName: 'TikTok Inc.',
      address: 'TikTok Inc. 10100 Venice Blvd, Culver City, CA 90232',
      termsUrl: 'https://www.tiktok.com/legal/terms-of-service',
      privacyUrl: 'https://www.tiktok.com/legal/privacy-policy',
      logoFilename: 'tiktok.png',
      cid: 'tiktok-logo@platform',
    };
  }
  if (p.includes('facebook') || p === 'tpl-001') {
    return {
      displayName: 'Team Facebook',
      headerBg: '#1877F2',
      accentBarBg: '#1877F2',
      senderName: 'The Facebook Team',
      companyName: 'Meta Platforms, Inc.',
      address: 'Meta Platforms Inc. 1 Meta Way, Menlo Park, CA 94025',
      termsUrl: 'https://www.facebook.com/legal/terms',
      privacyUrl: 'https://www.facebook.com/privacy/policy',
      logoFilename: 'facebook.png',
      cid: 'facebook-logo@platform',
    };
  }
  // Default: Snapchat
  return {
    displayName: 'Team Snapchat',
    headerBg: '#FFFC00',
    accentBarBg: '#FFFC00',
    senderName: 'Team Snapchat',
    companyName: 'Snap Inc.',
    address: 'Snap Inc. 2772 Donald Douglas Loop North, Santa Monica, CA 90405',
    termsUrl: 'https://values.snap.com/terms',
    privacyUrl: 'https://values.snap.com/privacy/privacy-policy',
    logoFilename: 'snapchat.png',
    cid: 'snapchat-logo@platform',
  };
}

export function resolveLogoAsset(logoFilename: string, cid: string): { filename: string; filePath?: string; cid: string; fallbackUrl: string } {
  const candidatePaths = [
    path.resolve(process.cwd(), 'frontend/src/assets/images', logoFilename),
    path.resolve(process.cwd(), '../frontend/src/assets/images', logoFilename),
    path.resolve(__dirname, '../../../frontend/src/assets/images', logoFilename),
    path.resolve(__dirname, '../../frontend/src/assets/images', logoFilename),
    path.resolve(__dirname, '../frontend/src/assets/images', logoFilename),
  ];

  const filePath = candidatePaths.find((cp) => {
    try {
      return fs.existsSync(cp);
    } catch {
      return false;
    }
  });

  const fallbackUrl = `https://raw.githubusercontent.com/kingsleyweb-tech/tiktokwebsecured/main/frontend/src/assets/images/${logoFilename}`;

  return { filename: logoFilename, filePath, cid, fallbackUrl };
}

/** Generate a mobile-friendly, branded HTML email card matching platform styles */
export function generateBrandedEmailHtml(options: {
  platform: string;
  subject: string;
  message: string;
  logoSrc: string;
}): string {
  const brand = getPlatformBrandInfo(options.platform);

  // Parse paragraphs and links
  const paragraphs = options.message.split(/\n{2,}/);
  const formattedBody = paragraphs
    .map((para) => {
      let p = para.trim();
      if (!p) return '';
      // Bold: **text**
      p = p.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#0f172a;">$1</strong>');
      // Markdown links: [label](url)
      p = p.replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" style="color: #0076b2; text-decoration: underline; font-weight: 600; word-break: break-all;">$1</a>'
      );
      // Raw URLs not already inside tags
      p = p.replace(
        /(^|[^">])(https?:\/\/[^\s<)]+?)([.,;]?)(\s|$|<)/g,
        '$1<a href="$2" target="_blank" style="color: #0076b2; text-decoration: underline; font-weight: 600; word-break: break-all;">$2</a>$3$4'
      );
      // Single line breaks inside paragraph
      p = p.replace(/\n/g, '<br/>');
      return `<p style="margin: 0 0 16px 0; font-size: 14.5px; line-height: 1.7; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${p}</p>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${options.subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f3f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f1f3f6; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Email Container Card -->
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 480px; width: 100%; background-color: #ffffff; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);">
          
          <!-- Brand Header -->
          <tr>
            <td align="center" style="background-color: ${brand.headerBg}; padding: 28px 20px 22px 20px;">
              <img
                src="${options.logoSrc}"
                alt="${brand.displayName}"
                width="84"
                height="84"
                style="display: block; margin: 0 auto; width: 84px; height: 84px; max-width: 84px; border: 0; outline: none; text-decoration: none;"
              />
            </td>
          </tr>

          <!-- Email Content Body -->
          <tr>
            <td style="padding: 32px 30px 24px 30px; background-color: #ffffff; text-align: left;">
              <h1 style="margin: 0 0 20px 0; font-size: 21px; font-weight: 700; color: #0f172a; line-height: 1.35; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                ${options.subject}
              </h1>

              <div style="font-size: 14.5px; line-height: 1.7; color: #334155;">
                ${formattedBody}
              </div>

              <!-- Sign-off -->
              <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 14px; line-height: 1.6; color: #334155;">
                Thanks,<br/>
                <strong style="color: #0f172a;">${brand.senderName}</strong>
              </div>
            </td>
          </tr>

          <!-- Accent Bottom Bar -->
          <tr>
            <td style="background-color: ${brand.accentBarBg}; height: 8px; line-height: 8px; font-size: 8px;">&nbsp;</td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #fafafa; border-top: 1px solid #eeeeee; padding: 18px 24px; font-size: 11px; line-height: 1.6; color: #718096; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              <p style="margin: 0 0 6px 0;">
                &copy; 2024 ${brand.companyName} &nbsp;|&nbsp;
                <a href="${brand.termsUrl}" target="_blank" style="color: #4a5568; text-decoration: underline;">Terms of Service</a> &nbsp;|&nbsp;
                <a href="${brand.privacyUrl}" target="_blank" style="color: #4a5568; text-decoration: underline;">Privacy Policy</a>
              </p>
              <p style="margin: 0; font-size: 10px; color: #a0aec0;">
                ${brand.address}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Convert plain text markdown links and raw standalone URLs to HTML anchor tags */
export function convertMarkdownToHtml(text: string): string {
  // 1. Convert markdown-style links [Anchor Text](http...)
  let html = text.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" style="color: #2563eb; font-weight: 600; text-decoration: underline;">$1</a>'
  );

  // 2. Convert standalone raw URLs (not already inside href="...")
  html = html.replace(
    /(^|[^">])(https?:\/\/[^\s<)]+?)([.,;]?)(\s|$|<)/g,
    '$1<a href="$2" style="color: #2563eb; font-weight: 600; text-decoration: underline;">$2</a>$3$4'
  );

  // 3. Convert newlines to HTML breaks
  html = html.replace(/\n/g, '<br/>');
  return html;
}

/** Helper to test verified connection on server startup */
export function verifyAllSmtpOnStartup() {
  for (const platform of ['tiktok', 'snapchat']) {
    const { host: h, port: p, user: u, pass: pw, configured: c, useSSL } = buildTransporter(platform);
    if (c) {
      console.info(`[EmailService] Testing ${platform.toUpperCase()} SMTP with Host: ${h}, Port: ${p}, User: ${u}`);
      const transporter = nodemailer.createTransport({ host: h, port: p, secure: useSSL, auth: { user: u, pass: pw } });
      transporter.verify().then(() => {
        console.info(`[EmailService] ✓ ${platform.toUpperCase()} SMTP connection verified. Ready to send from:`, u);
      }).catch((err: any) => {
        const { message } = classifySmtpError(err);
        console.warn(`[EmailService] ✗ ${platform.toUpperCase()} SMTP verification failed on startup:`, message);
      });
    } else {
      console.warn(`[EmailService] ${platform.toUpperCase()} SMTP not configured in env`);
    }
  }
}

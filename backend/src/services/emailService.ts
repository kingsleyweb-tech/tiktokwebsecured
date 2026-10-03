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

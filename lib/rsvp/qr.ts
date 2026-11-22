import 'server-only';
import QRCode from 'qrcode';

/**
 * What a QR code contains: a URL carrying a random 128-bit verification id. NO personal data is ever encoded.
 * Opening the URL in a normal phone camera shows a neutral page; only a signed-in administrator is taken to
 * the check-in screen, where the server looks the guest up.
 */
export const isWellFormedQr = (code: unknown): code is string => typeof code === 'string' && /^[A-Za-z0-9_-]{22}$/.test(code);

export function siteOrigin(req?: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (configured) return configured;
  if (req) return new URL(req.url).origin;
  return '';
}

export const qrTargetUrl = (origin: string, qrToken: string) => `${origin}/v/${qrToken}`;

const OPTIONS = { errorCorrectionLevel: 'M' as const, margin: 2, width: 560, color: { dark: '#3a0d18', light: '#ffffff' } };

export const qrDataUrl = (url: string) => QRCode.toDataURL(url, OPTIONS);
export const qrPng = (url: string) => QRCode.toBuffer(url, { ...OPTIONS, type: 'png' });

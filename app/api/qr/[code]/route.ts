import { isWellFormedQr, qrPng, qrTargetUrl, siteOrigin } from '@/lib/rsvp/qr';

export const dynamic = 'force-dynamic';

/**
 * PNG of the QR code for a verification id (used as the image in emails).
 * The image only encodes a link containing that id: no guest information, and no database lookup happens here.
 */
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  if (!isWellFormedQr(code)) return new Response('Not found', { status: 404 });
  const png = await qrPng(qrTargetUrl(siteOrigin(req), code));
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=86400', 'X-Robots-Tag': 'noindex' },
  });
}

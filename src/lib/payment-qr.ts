/**
 * Builds the public URL for a branch's payment QR from its stored object path.
 *
 * Payment QRs live in the PUBLIC `payment-qrs` bucket (migration 0033), so the
 * URL is stable and needs no signing — it can render anywhere, on the server or
 * the client (including the printed invoice). Returns null when none is set.
 */
export function paymentQrUrl(qrPath: string | null | undefined): string | null {
  if (!qrPath) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/payment-qrs/${qrPath}`;
}

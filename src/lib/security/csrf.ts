export function verifySameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');
  if (!host) return false;
  const sourceUrl = origin ?? referer;
  if (!sourceUrl) return false;
  try { const sourceHost = new URL(sourceUrl).host; return sourceHost === host; } catch { return false; }
}

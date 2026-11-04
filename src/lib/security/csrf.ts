/**
 * Proteção CSRF para rotas de API REST (route handlers em src/app/api/).
 * Server Actions do Next.js já têm proteção built-in (verificação de Origin);
 * rotas de API não têm, então checamos manualmente aqui.
 *
 * A ideia: uma requisição state-changing (POST/PUT/PATCH/DELETE) só é aceita
 * se o header Origin (ou, na ausência dele, Referer) bater com o host da
 * própria aplicação. Um site malicioso tentando disparar a requisição a
 * partir do navegador da vítima não consegue forjar esse header.
 */
export function verifySameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');

  if (!host) return false;

  const sourceUrl = origin ?? referer;
  if (!sourceUrl) return false;

  try {
    const sourceHost = new URL(sourceUrl).host;
    return sourceHost === host;
  } catch {
    return false;
  }
}

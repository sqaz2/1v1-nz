/** Pages service-binding proxy. Existing /api endpoints for classic games are untouched. */
export async function onRequest({ request, env }) {
  if (env.STARMUFF_MULTIPLAYER) return env.STARMUFF_MULTIPLAYER.fetch(request);
  if (env.STARMUFF_MULTIPLAYER_URL) {
    const upstream = new URL(env.STARMUFF_MULTIPLAYER_URL);
    if (upstream.protocol !== 'https:') return Response.json({ error: 'configuration', message: 'Multiplayer URL must use HTTPS.' }, { status: 503 });
    const source = new URL(request.url);
    upstream.pathname = source.pathname; upstream.search = source.search;
    return fetch(new Request(upstream, request));
  }
  return Response.json({ error: 'not-configured', message: 'Online multiplayer is not connected to this deployment yet. Solo and local modes still work.' }, { status: 503, headers: { 'cache-control': 'no-store' } });
}

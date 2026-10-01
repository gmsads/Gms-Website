const BACKEND = "https://gms-api.gms-website.workers.dev";

export function onRequest({ request }) {
  const url = new URL(request.url);
  return fetch(new Request(BACKEND + url.pathname + url.search, request));
}

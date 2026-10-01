const BACKEND = "https://gms.globalmarketingsolutions.in";

export function onRequest({ request }) {
  const url = new URL(request.url);
  return fetch(new Request(BACKEND + url.pathname + url.search, request));
}

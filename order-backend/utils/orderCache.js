// In-memory cache for the big GET /api/orders list.
// Cleared on any write to the Order collection (see hooks in models/Order.js); TTL is a safety net.
const TTL_MS = 60 * 1000;
const MAX_KEYS = 50;
const store = new Map();

module.exports = {
  get(key) {
    const hit = store.get(key);
    if (!hit) return null;
    if (Date.now() - hit.t > TTL_MS) {
      store.delete(key);
      return null;
    }
    return hit.body;
  },
  set(key, body) {
    if (store.size >= MAX_KEYS) store.delete(store.keys().next().value);
    store.set(key, { t: Date.now(), body });
  },
  clear() {
    store.clear();
  },
};

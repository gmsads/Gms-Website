// setInterval that skips ticks while the browser tab is hidden.
// Background tabs polling the API keep the backend container awake (and billed) all day.
// Returns a normal interval id, so clearInterval(id) still works.
export function visibleInterval(fn, ms) {
  return setInterval(() => {
    if (!document.hidden) fn();
  }, ms);
}

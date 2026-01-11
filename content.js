(async () => {
  const mySession = window.__FULLPAGE_CAPTURE_SESSION__;

  const isStale = () =>
    window.__FULLPAGE_CAPTURE_SESSION__ !== mySession;

  document.body.style.scrollBehavior = "auto";

  const images = [];
  const scroller = detectScroller();

  scroller.scrollTop = 0;
  scroller.focus?.();

  const viewport = scroller.clientHeight;
  const maxScroll = scroller.scrollHeight - viewport;

  while (true) {
    if (isStale()) return;
    if (await chrome.runtime.sendMessage({ type: "IS_CANCELLED" })) return;

    await wait(400);

    const img = await chrome.runtime.sendMessage({
      type: "CAPTURE_VIEWPORT"
    });
    if (img) images.push(img);

    const before = scroller.scrollTop;

    scroller.scrollTop = Math.min(before + viewport, maxScroll);
    scroller.dispatchEvent(new Event("scroll"));
    await wait(300);

    const after = scroller.scrollTop;

    chrome.runtime.sendMessage({
      type: "PROGRESS",
      value: Math.min(100, Math.round((after / maxScroll) * 100))
    });

    if (after === before) break;
  }

  if (isStale()) return;

  scroller.scrollTop = 0;
  chrome.runtime.sendMessage({
    type: "CAPTURE_COMPLETE",
    images
  });
})();

function detectScroller() {
  const candidates = [];
  const vh = window.innerHeight;

  for (const el of document.querySelectorAll("*")) {
    const s = getComputedStyle(el);
    if (
      (s.overflowY === "auto" || s.overflowY === "scroll") &&
      el.scrollHeight > el.clientHeight + 150
    ) {
      const r = el.getBoundingClientRect();
      if (r.height > 200 && r.top < vh && r.bottom > 0) {
        candidates.push(el);
      }
    }
  }

  candidates.sort((a, b) => b.scrollHeight - a.scrollHeight);
  return candidates[0] || document.scrollingElement || document.documentElement;
}

const wait = ms => new Promise(r => setTimeout(r, ms));

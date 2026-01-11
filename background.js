// 🔥 WELCOME PAGE ON FIRST INSTALL ONLY
chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === "install") {
    chrome.tabs.create({
      url: chrome.runtime.getURL("welcome.html")
    });
  }
});

let cancelled = false;
let title = "capture";
let format = "pdf";
let mode = "full";
let darkMode = false;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.type === "START_CAPTURE") {
    cancelled = false;
    title = msg.title || "capture";
    format = msg.format || "pdf";
    mode = msg.mode || "full";
    darkMode = msg.darkMode === true;

    if (mode === "selection") {
      chrome.scripting.executeScript({
        target: { tabId: msg.tabId },
        func: startSelection
      });
    } 
    else if (mode === "visible") {
      chrome.tabs.get(msg.tabId, tab => {
        chrome.tabs.captureVisibleTab(
          tab.windowId,
          { format: "png" },
          img => openOffscreen([img], false)
        );
      });
    } 
    else {
      chrome.scripting.executeScript({
        target: { tabId: msg.tabId },
        func: capturePage
      });
    }

    sendResponse(true);
    return true;
  }

  if (msg.type === "IS_CANCELLED") {
    sendResponse(cancelled);
    return true;
  }

  if (msg.type === "CAPTURE_VIEWPORT") {
    chrome.tabs.captureVisibleTab(
      sender.tab.windowId,
      { format: "png" },
      img => sendResponse(img)
    );
    return true;
  }

  if (msg.type === "SELECTION_DONE") {
    chrome.tabs.captureVisibleTab(
      sender.tab.windowId,
      { format: "png" },
      img => openOffscreen([{ img, rect: msg.rect }], true)
    );
    return true;
  }

  if (msg.type === "PROGRESS") {
    chrome.runtime.sendMessage(msg);
  }

  if (msg.type === "CAPTURE_COMPLETE") {
    openOffscreen(msg.images, false);
  }

  if (msg.type === "DOWNLOAD") {
    chrome.downloads.download({
      url: msg.url,
      filename: msg.filename,
      saveAs: false
    });
  }
});

async function openOffscreen(images, isSelection) {
  if (!await chrome.offscreen.hasDocument()) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["DOM_PARSER"],
      justification: "Generate export"
    });
  }

  chrome.runtime.sendMessage({
    type: "EXPORT",
    images,
    title,
    format,
    darkMode,
    isSelection
  });
}

/* ================= FULL PAGE CAPTURE ================= */

function capturePage() {
  const wait = ms => new Promise(r => setTimeout(r, ms));

  function detectScroller() {
    const list = [];
    const vh = innerHeight;

    for (const el of document.querySelectorAll("*")) {
      const s = getComputedStyle(el);
      if (
        (s.overflowY === "auto" || s.overflowY === "scroll") &&
        el.scrollHeight > el.clientHeight + 150
      ) {
        const r = el.getBoundingClientRect();
        if (r.height > 200 && r.top < vh && r.bottom > 0) {
          list.push(el);
        }
      }
    }

    list.sort((a, b) => b.scrollHeight - a.scrollHeight);
    return list[0] || document.documentElement;
  }

  (async () => {
    const images = [];
    const scroller = detectScroller();

    scroller.scrollTop = 0;

    const viewport = scroller.clientHeight;
    const maxScroll = scroller.scrollHeight - viewport;

    while (true) {
      if (await chrome.runtime.sendMessage({ type: "IS_CANCELLED" })) return;

      await wait(120); // 🔥 reduced

      const img = await chrome.runtime.sendMessage({
        type: "CAPTURE_VIEWPORT"
      });
      if (img) images.push(img);

      const before = scroller.scrollTop;
      scroller.scrollTop = Math.min(before + viewport, maxScroll);

      await wait(80); // 🔥 reduced

      chrome.runtime.sendMessage({
        type: "PROGRESS",
        value: Math.min(
          100,
          Math.round((scroller.scrollTop / maxScroll) * 100)
        )
      });

      if (scroller.scrollTop === before) break;
    }

    scroller.scrollTop = 0;
    chrome.runtime.sendMessage({
      type: "CAPTURE_COMPLETE",
      images
    });
  })();
}

/* ================= SELECTION MODE (UNCHANGED) ================= */

function startSelection() {
  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.25)",
    cursor: "crosshair",
    zIndex: 999999
  });

  const box = document.createElement("div");
  Object.assign(box.style, {
    position: "absolute",
    border: "2px dashed #4f46e5",
    background: "rgba(79,70,229,0.2)"
  });

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  let sx, sy;

  overlay.onmousedown = e => {
    sx = e.clientX;
    sy = e.clientY;
  };

  overlay.onmousemove = e => {
    if (sx == null) return;

    const x = Math.min(sx, e.clientX);
    const y = Math.min(sy, e.clientY);
    const w = Math.abs(e.clientX - sx);
    const h = Math.abs(e.clientY - sy);

    Object.assign(box.style, {
      left: x + "px",
      top: y + "px",
      width: w + "px",
      height: h + "px"
    });
  };

  overlay.onmouseup = e => {
    overlay.remove();

    chrome.runtime.sendMessage({
      type: "SELECTION_DONE",
      rect: {
        x: Math.min(sx, e.clientX),
        y: Math.min(sy, e.clientY),
        width: Math.abs(e.clientX - sx),
        height: Math.abs(e.clientY - sy),
        dpr: window.devicePixelRatio
      }
    });
  };
}

const { jsPDF } = window.jspdf;

chrome.runtime.onMessage.addListener(async msg => {
  if (msg.type !== "EXPORT") return;

  const wantDark = msg.darkMode === true;
  let images = msg.images;

  /* ===== SELECTION MODE ===== */
  if (msg.isSelection) {
    const { img, rect } = images[0];
    const bitmap = await fetch(img).then(r => r.blob()).then(createImageBitmap);

    const c = new OffscreenCanvas(
      rect.width * rect.dpr,
      rect.height * rect.dpr
    );

    c.getContext("2d").drawImage(
      bitmap,
      rect.x * rect.dpr,
      rect.y * rect.dpr,
      rect.width * rect.dpr,
      rect.height * rect.dpr,
      0,
      0,
      c.width,
      c.height
    );

    images = [c];
  }

  /* ===== DECODE IMAGES ===== */
  const canvases = await Promise.all(
    images.map(async src => {
      if (src instanceof OffscreenCanvas) return src;

      const bm = await fetch(src).then(r => r.blob()).then(createImageBitmap);
      const c = new OffscreenCanvas(bm.width, bm.height);
      const ctx = c.getContext("2d");

      if (wantDark) {
        ctx.filter = "invert(1) hue-rotate(180deg)";
      }

      ctx.drawImage(bm, 0, 0);
      ctx.filter = "none";
      return c;
    })
  );

  /* ===== PDF EXPORT ===== */
  if (msg.format === "pdf") {
    const pdf = new jsPDF({
      orientation:
        canvases[0].width > canvases[0].height ? "landscape" : "portrait",
      unit: "px",
      format: [canvases[0].width, canvases[0].height]
    });

    for (let i = 0; i < canvases.length; i++) {
      if (i > 0) {
        pdf.addPage([canvases[i].width, canvases[i].height]);
      }

      const img = await canvasToBase64(canvases[i]);
      pdf.addImage(img, "PNG", 0, 0, canvases[i].width, canvases[i].height);
    }

    chrome.runtime.sendMessage({
      type: "DOWNLOAD",
      url: pdf.output("bloburl"),
      filename: sanitize(msg.title) + ".pdf"
    });

    return;
  }

  /* ===== PNG / JPEG EXPORT ===== */
  const width = Math.max(...canvases.map(c => c.width));
  const height = canvases.reduce((s, c) => s + c.height, 0);

  const out = new OffscreenCanvas(width, height);
  const ctx = out.getContext("2d");

  let y = 0;
  canvases.forEach(c => {
    ctx.drawImage(c, 0, y);
    y += c.height;
  });

  const blob = await out.convertToBlob({
    type: msg.format === "jpeg" ? "image/jpeg" : "image/png",
    quality: 0.95
  });

  chrome.runtime.sendMessage({
    type: "DOWNLOAD",
    url: URL.createObjectURL(blob),
    filename: sanitize(msg.title) + "." + msg.format
  });
});

/* ===== HELPERS ===== */

function canvasToBase64(canvas) {
  return new Promise(resolve => {
    canvas.convertToBlob({ type: "image/png" }).then(blob => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result.split(",")[1]);
      r.readAsDataURL(blob);
    });
  });
}

function sanitize(name) {
  return name.replace(/[<>:"/\\|?*]+/g, "").slice(0, 80);
}

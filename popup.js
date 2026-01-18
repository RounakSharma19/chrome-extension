// 🔹 Load card HTML first
fetch(chrome.runtime.getURL("popup-card.html"))
  .then(res => res.text())
  .then(html => {
    document.getElementById("card-root").innerHTML = html;
    initPopup(); // ⬅ start original logic AFTER DOM exists
  });

function initPopup() {
  const bar = document.getElementById("bar");
  const darkToggle = document.getElementById("darkMode");

  /* ===== FORMAT DROPDOWN ===== */
  const formatBtn = document.getElementById("formatBtn");
  const formatList = document.getElementById("formatList");
  const formatLabel = document.getElementById("formatLabel");
  const formatInput = document.getElementById("format");

  formatBtn.onclick = () => {
    formatList.style.display =
      formatList.style.display === "block" ? "none" : "block";
  };

  formatList.querySelectorAll(".dropdown-item").forEach(item => {
    item.onclick = () => {
      formatList.querySelectorAll(".dropdown-item")
        .forEach(i => i.classList.remove("active"));

      item.classList.add("active");
      formatLabel.textContent = item.textContent;
      formatInput.value = item.dataset.value;
      formatList.style.display = "none";
    };
  });

  /* ===== MODE DROPDOWN ===== */
  const modeBtn = document.getElementById("modeBtn");
  const modeList = document.getElementById("modeList");
  const modeLabel = document.getElementById("modeLabel");
  const modeInput = document.getElementById("mode");

  modeBtn.onclick = () => {
    modeList.style.display =
      modeList.style.display === "block" ? "none" : "block";
  };

  modeList.querySelectorAll(".dropdown-item").forEach(item => {
    item.onclick = () => {
      modeList.querySelectorAll(".dropdown-item")
        .forEach(i => i.classList.remove("active"));

      item.classList.add("active");
      modeLabel.textContent = item.textContent;
      modeInput.value = item.dataset.value;
      modeList.style.display = "none";
    };
  });

  /* ===== DARK MODE ===== */
  chrome.storage.sync.get("darkMode", r => {
    darkToggle.checked = !!r.darkMode;
  });

  darkToggle.onchange = () => {
    chrome.storage.sync.set({ darkMode: darkToggle.checked });
  };

  /* ===== START CAPTURE ===== */
  document.getElementById("start").onclick = async () => {
    bar.style.width = "0%";

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    chrome.runtime.sendMessage({
      type: "START_CAPTURE",
      tabId: tab.id,
      title: tab.title,
      format: formatInput.value,
      mode: modeInput.value,
      darkMode: darkToggle.checked
    });
  };

  /* ===== PROGRESS ===== */
  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === "PROGRESS") {
      bar.style.width = msg.value + "%";
    }
  });
}

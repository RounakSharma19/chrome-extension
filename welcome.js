// 🔹 Load welcome sections first
fetch(chrome.runtime.getURL("welcome-sections.html"))
  .then(res => res.text())
  .then(html => {
    document.getElementById("welcome-root").innerHTML = html;
    initWelcome();
  });

function initWelcome() {
  // FAQ accordion
  document.querySelectorAll(".faq-item").forEach(item => {
    item.addEventListener("click", () => {
      document.querySelectorAll(".faq-item").forEach(i => {
        if (i !== item) i.classList.remove("active");
      });
      item.classList.toggle("active");
    });
  });

  // Feedback via Gmail Web
  document.getElementById("sendFeedback").addEventListener("click", () => {
    const text = document.getElementById("feedback").value.trim();

    if (!text) {
      alert("Please write some feedback first 🙂");
      return;
    }

    const subject = encodeURIComponent(
      "Feedback – Full Page Screenshot Exporter"
    );

    const body = encodeURIComponent(text);

    const gmailUrl =
      `https://mail.google.com/mail/?view=cm&fs=1` +
      `&to=rounaksharma808@gmail.com` +
      `&su=${subject}` +
      `&body=${body}`;

    window.open(gmailUrl, "_blank");
  });
}

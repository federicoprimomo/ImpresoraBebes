const ICONS = {
  idle: "✏️",
  listening: "🎤",
  transcribing: "🤔",
  moderating: "🤔",
  generating: "🪄",
  ready: "🎉",
  printing: "🖨️",
  error: "😅",
};

const SPINNING_STATES = new Set(["transcribing", "moderating", "generating", "printing"]);

const appEl = document.getElementById("app");
const iconEl = document.getElementById("icon");
const messageEl = document.getElementById("message");
const heardEl = document.getElementById("heard");
const drawingEl = document.getElementById("drawing");

function applyState(data) {
  appEl.dataset.status = data.status;
  iconEl.textContent = ICONS[data.status] || "✏️";
  iconEl.classList.toggle("spinning", SPINNING_STATES.has(data.status));
  messageEl.textContent = data.message || "";
  heardEl.textContent = data.heard_text ? `"${data.heard_text}"` : "";

  if (data.image_url) {
    // cache-busting simple para forzar recarga si es el mismo nombre
    drawingEl.src = data.image_url + "?t=" + Date.now();
    drawingEl.style.display = "block";
  } else {
    drawingEl.style.display = "none";
  }
}

function connect() {
  const source = new EventSource("/events");
  source.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      applyState(data);
    } catch (err) {
      console.error("Error parseando evento", err);
    }
  };
  source.onerror = () => {
    // El navegador de EventSource reintenta solo la conexión.
    console.warn("Conexión de eventos perdida, reintentando...");
  };
}

connect();

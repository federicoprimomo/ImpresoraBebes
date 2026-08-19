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
const printerBadgeEl = document.getElementById("printer-badge");

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

  // printer_online puede ser true, false o null (todavía no se chequeó)
  printerBadgeEl.dataset.online = data.printer_online;
  if (data.printer_online === true) {
    printerBadgeEl.textContent = "🖨️ lista";
  } else if (data.printer_online === false) {
    printerBadgeEl.textContent = "🖨️ no lista";
  } else {
    printerBadgeEl.textContent = "🖨️ ...";
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

// --- Controles de teclado (modo prueba, sin botones físicos) ---
// Mantener apretada la barra espaciadora = botón 1 (grabar).
// Enter = botón 2 (imprimir). Útil para probar en una PC/Windows sin GPIO,
// o como respaldo si un botón físico falla.
let spaceHeld = false;

function post(path) {
  fetch(path, { method: "POST" }).catch((err) => console.error("Error llamando", path, err));
}

document.addEventListener("keydown", (event) => {
  if (event.code === "Space" && !spaceHeld && !event.repeat) {
    spaceHeld = true;
    post("/api/record/start");
  } else if (event.code === "Enter") {
    post("/api/print");
  }
});

document.addEventListener("keyup", (event) => {
  if (event.code === "Space" && spaceHeld) {
    spaceHeld = false;
    post("/api/record/stop");
  }
});

connect();

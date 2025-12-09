// This demo assumes the generated JS protobuf stubs are available under youworld.overlay.
// Replace the import mechanism with your build step (e.g., webpack/parcel/esbuild).

const WS_URL = "wss://overlay.example.com/v1/ws?demo=true";

const overlayRoot = document.getElementById("overlay-root");
const logEl = document.getElementById("log");

function log(line) {
  const div = document.createElement("div");
  div.textContent = `[${new Date().toISOString()}] ${line}`;
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

let socket = null;
let serverTimeOffsetMs = 0;
let buffer = [];

const BUFFER_WINDOW_MS = 250;
const LATENESS_THRESHOLD_MS = 200;

function nowMs() {
  return Date.now() + serverTimeOffsetMs;
}

function connect() {
  socket = new WebSocket(WS_URL);
  socket.binaryType = "arraybuffer";

  socket.onopen = () => {
    log("WS open; sending ClientHello");
    sendClientHello();
  };

  socket.onmessage = (ev) => {
    if (typeof ev.data === "string") {
      handleText(ev.data);
    } else {
      handleBinary(new Uint8Array(ev.data));
    }
  };

  socket.onclose = (ev) => {
    log("WS closed " + ev.code + " " + ev.reason);
  };

  socket.onerror = (err) => {
    log("WS error " + err);
  };
}

function sendClientHello() {
  if (!window.youworld || !youworld.overlay) {
    log("ERROR: generated protobuf stubs (youworld.overlay) not found. Serve overlay_bundle.js or generate stubs and include them.");
    return;
  }

  const hello = new youworld.overlay.ClientHello();
  hello.setWireVersion(youworld.overlay.WireVersion.WIRE_VERSION_V1);
  hello.setSupportedCodecsList([youworld.overlay.Codec.CODEC_PROTOBUF]);
  hello.setSupportedOverlaySchemasList(["overlay-1.0.0"]);
  hello.setSupportedPlaylistSchemasList(["playlist-1.0.0"]);
  hello.setClientId("browser-demo");
  hello.setSessionId("demo-session");
  hello.setUserAgent(navigator.userAgent);

  const bytes = hello.serializeBinary();
  const frame = new Uint8Array(1 + bytes.length);
  frame[0] = 0x01; // wire version
  frame.set(bytes, 1);
  socket.send(frame);
}

function handleText(text) {
  log("TEXT: " + text);
  try {
    const obj = JSON.parse(text);
    if (obj.server_time_ms) {
      serverTimeOffsetMs = obj.server_time_ms - Date.now();
      log("Server time sync delta " + serverTimeOffsetMs + " ms");
    }
  } catch (e) {
    // ignore
  }
}

function handleBinary(bytes) {
  const wireVersion = bytes[0];
  if (wireVersion !== 0x01) {
    log("Unknown wire version " + wireVersion);
    return;
  }
  const payload = bytes.slice(1);

  try {
    const batch = youworld.overlay.OverlayEventBatch.deserializeBinary(payload);
    if (!batch) return;
    const events = batch.getEventsList();
    for (const evt of events) {
      buffer.push(evt);
    }
    reorderBuffer();
  } catch (e) {
    log("Failed to decode OverlayEventBatch: " + e);
  }
}

function reorderBuffer() {
  buffer.sort((a, b) => {
    const aTime = Number(a.getPresentationTsMs());
    const bTime = Number(b.getPresentationTsMs());
    if (aTime !== bTime) return aTime - bTime;
    if (a.getPriority() !== b.getPriority()) return b.getPriority() - a.getPriority();
    return Number(a.getSequence()) - Number(b.getSequence());
  });
}

function tick() {
  const t = nowMs();
  const ready = [];
  const remaining = [];

  for (const evt of buffer) {
    const presentation = Number(evt.getPresentationTsMs());
    if (presentation < t - LATENESS_THRESHOLD_MS) {
      // drop overly late events
      continue;
    }
    if (presentation <= t + BUFFER_WINDOW_MS) {
      ready.push(evt);
    } else {
      remaining.push(evt);
    }
  }

  buffer = remaining;

  for (const evt of ready) {
    renderOverlay(evt);
  }

  requestAnimationFrame(tick);
}

function renderOverlay(evt) {
  let text = "";
  try {
    if (evt.getPayload() && evt.getPayload().length > 0) {
      text = new TextDecoder("utf-8").decode(evt.getPayload());
    } else {
      text = evt.getPayloadRef() || "(empty)";
    }
  } catch (e) {
    text = "(invalid payload)";
  }

  const div = document.createElement("div");
  div.className = "overlay-bubble";
  div.textContent = text;

  const x = Math.random() * 60 + 20;
  const y = Math.random() * 60 + 20;
  div.style.left = x + "%";
  div.style.top = y + "%";

  overlayRoot.appendChild(div);
  setTimeout(() => {
    if (div.parentNode === overlayRoot) overlayRoot.removeChild(div);
  }, 4000);
}

connect();
requestAnimationFrame(tick);

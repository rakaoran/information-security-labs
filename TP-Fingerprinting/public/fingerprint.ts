/// <reference lib="dom" />

const target = document.querySelector<HTMLElement>("#target-sentence")!;
const input = document.querySelector<HTMLInputElement>("#typing-input")!;
const resetButton = document.querySelector<HTMLButtonElement>("#reset-button")!;
const status = document.querySelector<HTMLElement>("#typing-status")!;

type BrowserFeatures = {
  language: string;
  languages: string[];
  screen: string;
  availableScreen: string;
  colorDepth: number;
  pixelRatio: number;
  cpuCores: number | null;
  deviceMemory: number | null;
  timezone: string;
  viewport: string;
  platform: string;
};

type NavigatorWithMemory = Navigator & { deviceMemory?: number };

const navigatorWithMemory = navigator as NavigatorWithMemory;
const features: BrowserFeatures = {
  language: navigator.language,
  languages: [...navigator.languages],
  screen: `${screen.width}×${screen.height}`,
  availableScreen: `${screen.availWidth}×${screen.availHeight}`,
  colorDepth: screen.colorDepth,
  pixelRatio: window.devicePixelRatio,
  cpuCores: navigator.hardwareConcurrency || null,
  deviceMemory: navigatorWithMemory.deviceMemory ?? null,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  viewport: `${window.innerWidth}×${window.innerHeight}`,
  platform: navigator.platform || "not exposed",
};

const featureLabels: Record<keyof BrowserFeatures, string> = {
  language: "Main language",
  languages: "Language list",
  screen: "Screen",
  availableScreen: "Available screen",
  colorDepth: "Colour depth",
  pixelRatio: "Pixel ratio",
  cpuCores: "Logical CPU cores",
  deviceMemory: "Device memory (GB)",
  timezone: "Time zone",
  viewport: "Viewport",
  platform: "Platform",
};

function displayFeatures(): void {
  const output = document.querySelector<HTMLElement>("#feature-output")!;
  output.replaceChildren();

  for (
    const [key, value] of Object.entries(features) as [keyof BrowserFeatures, unknown][]
  ) {
    const wrapper = document.createElement("div");
    const term = document.createElement("dt");
    const detail = document.createElement("dd");
    term.textContent = featureLabels[key];
    detail.textContent = Array.isArray(value)
      ? value.join(", ")
      : String(value ?? "not exposed");
    wrapper.append(term, detail);
    output.append(wrapper);
  }
}

async function sendJson(path: string, data: unknown): Promise<void> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function generateFingerprint(): Promise<void> {
  // JSON gives us a fixed field order because this object is created deterministically above.
  const fingerprint = await sha256(JSON.stringify(features));
  document.querySelector<HTMLOutputElement>("#fingerprint-hash")!.value = fingerprint;
  await sendJson("/api/fingerprint-hash", { fingerprint });
}

let startTime: number | null = null;
let corrections = 0;
let completed = false;

input.addEventListener("keydown", (event) => {
  if (completed) return;
  if (startTime === null && event.key.length === 1) {
    startTime = performance.now();
    status.textContent = "Timer running…";
  }
  if ((event.key === "Backspace" || event.key === "Delete") && input.value.length > 0) {
    corrections += 1;
  }
});

input.addEventListener("input", async () => {
  if (completed || startTime === null || input.value !== target.textContent?.trim()) {
    return;
  }

  completed = true;
  const typingTime = (performance.now() - startTime) / 1000;
  const wordCount = target.textContent.trim().split(/\s+/).length;
  const typingSpeed = (wordCount / typingTime) * 60;

  document.querySelector("#typing-time")!.textContent = `${
    typingTime.toFixed(2)
  } seconds`;
  document.querySelector("#typing-speed")!.textContent = `${typingSpeed.toFixed(2)} WPM`;
  document.querySelector("#typing-corrections")!.textContent = String(corrections);
  status.textContent = "Done. Results sent to the local server.";

  await sendJson("/api/typing-results", { typingTime, typingSpeed, corrections });
});

resetButton.addEventListener("click", () => {
  input.value = "";
  startTime = null;
  corrections = 0;
  completed = false;
  status.textContent = "Timer has not started.";
  document.querySelector("#typing-time")!.textContent = "—";
  document.querySelector("#typing-speed")!.textContent = "—";
  document.querySelector("#typing-corrections")!.textContent = "—";
  input.focus();
});

displayFeatures();
await Promise.all([
  sendJson("/api/fingerprint", features),
  generateFingerprint(),
]).catch((error: unknown) => {
  console.error("Could not send fingerprint data:", error);
});

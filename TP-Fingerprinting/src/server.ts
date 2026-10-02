import express, { type Request, type Response } from "express";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const port = Number(Deno.env.get("PORT") ?? "8000");
const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDirectory = join(projectRoot, "public");

app.disable("x-powered-by");
app.use(express.json({ limit: "16kb" }));

type ActiveFingerprint = {
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

type TypingResult = {
  typingTime: number;
  typingSpeed: number;
  corrections: number;
};

function printBlock(title: string, values: Record<string, unknown>): void {
  console.log(`\n========== ${title} ==========`);
  for (const [key, value] of Object.entries(values)) {
    console.log(`${key.padEnd(20)}:`, value ?? "(not sent)");
  }
  console.log("=".repeat(title.length + 22));
}

app.get("/", (request: Request, response: Response) => {
  printBlock("NEW VISIT", {
    "IP address": request.ip,
    "HTTP method": request.method,
    "User-Agent": request.get("user-agent"),
    "Accept-Language": request.get("accept-language"),
    Accept: request.get("accept"),
    "Accept-Encoding": request.get("accept-encoding"),
    Referer: request.get("referer"),
    Origin: request.get("origin"),
    "Sec-Fetch-Site": request.get("sec-fetch-site"),
    "Sec-CH-UA": request.get("sec-ch-ua"),
    "Sec-CH-UA-Platform": request.get("sec-ch-ua-platform"),
  });

  response.sendFile(join(publicDirectory, "index.html"));
});

// The browser receives this JS-compatible TypeScript source as a module. Keeping the
// source as .ts lets `deno check` validate it without adding a frontend build step.
app.get("/assets/fingerprint.js", (_request: Request, response: Response) => {
  response
    .type("text/javascript")
    .sendFile(join(publicDirectory, "fingerprint.ts"));
});

app.use("/assets", express.static(publicDirectory));

app.post("/api/fingerprint", (request: Request, response: Response) => {
  const features = request.body as Partial<ActiveFingerprint>;
  printBlock("ACTIVE FINGERPRINT", features);
  response.json({ status: "received" });
});

app.post("/api/typing-results", (request: Request, response: Response) => {
  const result = request.body as Partial<TypingResult>;
  printBlock("TYPING RESULTS", {
    "Typing time (s)": result.typingTime,
    "Typing speed (WPM)": result.typingSpeed,
    Corrections: result.corrections,
  });
  response.json({ status: "received" });
});

app.post("/api/fingerprint-hash", (request: Request, response: Response) => {
  const fingerprint = String(request.body?.fingerprint ?? "");

  if (!/^[a-f0-9]{64}$/.test(fingerprint)) {
    response.status(400).json({ status: "invalid fingerprint" });
    return;
  }

  printBlock("FINGERPRINT HASH", { "SHA-256": fingerprint });
  response.json({ status: "received" });
});

app.use((_request: Request, response: Response) => {
  response.status(404).json({ error: "not found" });
});

const server = app.listen(port, "127.0.0.1", () => {
  console.log(`Fingerprinting lab running at http://127.0.0.1:${port}`);
});

server.on("error", (error) => {
  console.error("Could not start the server:", error);
  Deno.exit(1);
});

server.ref();

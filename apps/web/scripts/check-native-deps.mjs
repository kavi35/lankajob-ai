#!/usr/bin/env node
/**
 * Pre-build diagnostic: verify native Tailwind/lightningcss bindings exist
 * where module resolution expects them (workspace-aware).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");
const repoRoot = path.join(webRoot, "../..");
const logPath = path.join(repoRoot, "debug-1097fa.log");
const endpoint =
  "http://127.0.0.1:7523/ingest/01830c5a-da63-41de-85f1-57f3dd26c1d8";

const checks = [
  {
    id: "H1",
    label: "lightningcss in workspace node_modules",
    p: path.join(webRoot, "node_modules/lightningcss/node/index.js"),
  },
  {
    id: "H1",
    label: "lightningcss sibling gnu (workspace)",
    p: path.join(webRoot, "node_modules/lightningcss-linux-x64-gnu"),
  },
  {
    id: "H1",
    label: "lightningcss sibling gnu (repo root)",
    p: path.join(repoRoot, "node_modules/lightningcss-linux-x64-gnu"),
  },
  {
    id: "H2",
    label: "oxide in workspace node_modules",
    p: path.join(webRoot, "node_modules/@tailwindcss/oxide/index.js"),
  },
  {
    id: "H2",
    label: "oxide-linux-x64-gnu (workspace @tailwindcss)",
    p: path.join(
      webRoot,
      "node_modules/@tailwindcss/oxide-linux-x64-gnu"
    ),
  },
  {
    id: "H2",
    label: "oxide-linux-x64-gnu (repo root)",
    p: path.join(repoRoot, "node_modules/@tailwindcss/oxide-linux-x64-gnu"),
  },
  {
    id: "H5",
    label: "lightningcss .node file relative path",
    p: path.join(
      webRoot,
      "node_modules/lightningcss-linux-x64-gnu/lightningcss.linux-x64-gnu.node"
    ),
  },
];

function exists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

const platform = process.platform;
const arch = process.arch;
const cwd = process.cwd();

const results = checks.map((c) => ({
  hypothesisId: c.id,
  label: c.label,
  path: c.p,
  exists: exists(c.p),
}));

const payload = {
  sessionId: "1097fa",
  runId: process.env.DEBUG_RUN_ID || "prebuild",
  hypothesisId: "ALL",
  location: "scripts/check-native-deps.mjs",
  message: "native binding path audit",
  data: { platform, arch, cwd, webRoot, repoRoot, results },
  timestamp: Date.now(),
};

// #region agent log
try {
  fs.appendFileSync(logPath, JSON.stringify(payload) + "\n");
} catch {
  /* ignore on CI if path missing */
}
fetch(endpoint, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Debug-Session-Id": "1097fa",
  },
  body: JSON.stringify(payload),
}).catch(() => {});
// #endregion

console.log("[debug-native-deps]", JSON.stringify(payload.data, null, 2));

const missing = results.filter((r) => !r.exists);
if (missing.length > 0) {
  console.warn(
    "[debug-native-deps] MISSING:",
    missing.map((m) => m.label).join(", ")
  );
}

#!/usr/bin/env node
/**
 * npm workspaces hoist platform-specific optional deps to repo root,
 * but lightningcss/@tailwindcss/oxide resolve siblings under apps/web/node_modules.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const webRoot = path.join(repoRoot, "apps/web");
const webNm = path.join(webRoot, "node_modules");
const rootNm = path.join(repoRoot, "node_modules");
const logPath = path.join(repoRoot, "debug-1097fa.log");
const endpoint =
  "http://127.0.0.1:7523/ingest/01830c5a-da63-41de-85f1-57f3dd26c1d8";

/** [rootRelativePath, workspaceRelativePath] */
const NATIVE_PACKAGES = [
  ["lightningcss-linux-x64-gnu", "lightningcss-linux-x64-gnu"],
  ["lightningcss-linux-x64-musl", "lightningcss-linux-x64-musl"],
  ["lightningcss-win32-x64-msvc", "lightningcss-win32-x64-msvc"],
  ["lightningcss-darwin-x64", "lightningcss-darwin-x64"],
  ["lightningcss-darwin-arm64", "lightningcss-darwin-arm64"],
  [
    "@tailwindcss/oxide-linux-x64-gnu",
    "@tailwindcss/oxide-linux-x64-gnu",
  ],
  [
    "@tailwindcss/oxide-linux-x64-musl",
    "@tailwindcss/oxide-linux-x64-musl",
  ],
  [
    "@tailwindcss/oxide-win32-x64-msvc",
    "@tailwindcss/oxide-win32-x64-msvc",
  ],
  [
    "@tailwindcss/oxide-darwin-x64",
    "@tailwindcss/oxide-darwin-x64",
  ],
  [
    "@tailwindcss/oxide-darwin-arm64",
    "@tailwindcss/oxide-darwin-arm64",
  ],
];

function exists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function copyDir(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });
}

function log(message, data, hypothesisId = "H1") {
  const payload = {
    sessionId: "1097fa",
    runId: process.env.DEBUG_RUN_ID || "postinstall",
    hypothesisId,
    location: "scripts/fix-workspace-native-deps.mjs",
    message,
    data,
    timestamp: Date.now(),
  };
  // #region agent log
  try {
    fs.appendFileSync(logPath, JSON.stringify(payload) + "\n");
  } catch {
    /* ignore */
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
  console.log(`[fix-native-deps] ${message}`, JSON.stringify(data));
}

if (!exists(webNm)) {
  log("skip: apps/web/node_modules missing", { webNm });
  process.exit(0);
}

const actions = [];

for (const [rootRel, webRel] of NATIVE_PACKAGES) {
  const src = path.join(rootNm, rootRel);
  const dest = path.join(webNm, webRel);
  if (exists(src) && !exists(dest)) {
    copyDir(src, dest);
    actions.push({ action: "copied", from: src, to: dest });
  }
}

const platformPackages =
  process.platform === "linux"
    ? [
        "lightningcss-linux-x64-gnu@1.32.0",
        "lightningcss-linux-x64-musl@1.32.0",
        "@tailwindcss/oxide-linux-x64-gnu@4.3.1",
        "@tailwindcss/oxide-linux-x64-musl@4.3.1",
      ]
    : process.platform === "win32"
      ? [
          "lightningcss-win32-x64-msvc@1.32.0",
          "@tailwindcss/oxide-win32-x64-msvc@4.3.1",
        ]
      : [];

function pkgDirName(spec) {
  if (spec.startsWith("@")) {
    const idx = spec.lastIndexOf("@");
    return spec.slice(0, idx);
  }
  return spec.split("@")[0];
}

const stillMissing = platformPackages.filter((pkg) => {
  return !exists(path.join(webNm, pkgDirName(pkg)));
});

if (stillMissing.length > 0) {
  try {
    execSync(
      `npm install --no-save --legacy-peer-deps ${stillMissing.join(" ")}`,
      { cwd: webRoot, stdio: "inherit" }
    );
    actions.push({ action: "npm-install", packages: stillMissing });
  } catch (err) {
    log(
      "npm install fallback failed",
      { stillMissing, error: String(err) },
      "H3"
    );
  }
}

const verify = NATIVE_PACKAGES.filter(([_, webRel]) =>
  exists(path.join(webNm, webRel))
).map(([_, webRel]) => webRel);

log("postinstall native deps fix complete", {
  platform: process.platform,
  actions,
  verify,
  stillMissingAfter: platformPackages
    .map(pkgDirName)
    .filter((name) => !exists(path.join(webNm, name))),
});

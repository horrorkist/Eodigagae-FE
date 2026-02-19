import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const HOST = "127.0.0.1";
const PORT = 3199;
const BASE_URL = `http://${HOST}:${PORT}`;
const SMOKE_DIST_DIR = process.env.NEXT_DIST_DIR ?? ".next-smoke";
const SHOULD_CLEAN_DIST_DIR = !process.env.NEXT_DIST_DIR;
const STRICT_HOME_CHECK = process.env.SMOKE_STRICT_HOME === "1";
const STARTUP_TIMEOUT_MS = 120_000;
const SHUTDOWN_TIMEOUT_MS = 8_000;

function startServer() {
  const nextBin = path.resolve("node_modules/next/dist/bin/next");
  const child = spawn(
    process.execPath,
    [nextBin, "dev", "--webpack", "--hostname", HOST, "--port", String(PORT)],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        TMAP_APP_KEY: process.env.TMAP_APP_KEY ?? "smoke-key",
        NEXT_DIST_DIR: SMOKE_DIST_DIR,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let stdout = "";
  let stderr = "";

  child.stdout?.on("data", (chunk) => {
    stdout += String(chunk);
  });
  child.stderr?.on("data", (chunk) => {
    stderr += String(chunk);
  });

  return {
    child,
    getLogs() {
      return { stdout, stderr };
    },
  };
}

async function waitUntilReady(child, getLogs) {
  const start = Date.now();
  let lastErr = null;

  while (Date.now() - start < STARTUP_TIMEOUT_MS) {
    if (child.exitCode != null) {
      const { stdout, stderr } = getLogs();
      throw new Error(
        `next dev exited early (code=${child.exitCode}).\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`,
      );
    }

    try {
      const res = await fetch(`${BASE_URL}/api/petpois?lat=abc&lng=def`);
      if (res.status === 400) return;
    } catch (err) {
      lastErr = err;
    }

    await sleep(1000);
  }

  const { stdout, stderr } = getLogs();
  throw new Error(
    `server startup timed out (${STARTUP_TIMEOUT_MS}ms).\nLast error: ${String(lastErr)}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`,
  );
}

async function stopServer(child) {
  if (child.exitCode != null) return;

  child.kill("SIGTERM");

  const timedOut = sleep(SHUTDOWN_TIMEOUT_MS).then(() => true);
  const exited = once(child, "exit").then(() => false);
  const shouldForceKill = await Promise.race([timedOut, exited]);

  if (shouldForceKill && child.exitCode == null) {
    child.kill("SIGKILL");
    await once(child, "exit");
  }
}

async function runSmokeChecks() {
  const homeRes = await fetch(`${BASE_URL}/`);
  if (STRICT_HOME_CHECK) {
    assert.equal(homeRes.status, 200, "home page should return HTTP 200");
    const homeHtml = await homeRes.text();
    assert.match(
      homeHtml,
      /경로 추천/,
      "home page should render main entry text",
    );
  }

  const petPoiRes = await fetch(`${BASE_URL}/api/petpois?lat=abc&lng=def`);
  assert.equal(
    petPoiRes.status,
    400,
    "/api/petpois without lat/lng should return HTTP 400",
  );
  const petPoiPayload = await petPoiRes.json();
  assert.match(
    String(petPoiPayload?.error ?? ""),
    /lat\/lng are required/i,
    "petpoi validation error shape changed",
  );

  const routeRes = await fetch(`${BASE_URL}/api/tmap/pedestrian`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ startX: "x" }),
  });
  assert.equal(
    routeRes.status,
    400,
    "/api/tmap/pedestrian with invalid body should return HTTP 400",
  );
  const routePayload = await routeRes.json();
  assert.match(
    String(routePayload?.error ?? ""),
    /must be numbers/i,
    "route validation error shape changed",
  );
}

const { child, getLogs } = startServer();
const tsConfigPath = path.resolve("tsconfig.json");
const originalTsConfig = await readFile(tsConfigPath, "utf8").catch(() => null);

try {
  await waitUntilReady(child, getLogs);
  await runSmokeChecks();
  console.log("app smoke checks passed");
} catch (err) {
  const { stdout, stderr } = getLogs();
  console.error("app smoke checks failed");
  console.error(String(err));
  console.error("---- next dev stdout ----");
  console.error(stdout);
  console.error("---- next dev stderr ----");
  console.error(stderr);
  process.exitCode = 1;
} finally {
  await stopServer(child);
  if (originalTsConfig != null) {
    await writeFile(tsConfigPath, originalTsConfig, "utf8");
  }
  if (SHOULD_CLEAN_DIST_DIR) {
    await rm(path.resolve(SMOKE_DIST_DIR), { recursive: true, force: true });
  }
}

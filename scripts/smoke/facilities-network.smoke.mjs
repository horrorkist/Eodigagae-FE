import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const HOST = "127.0.0.1";
const PORT = 3203;
const BASE_URL = `http://${HOST}:${PORT}`;
const SMOKE_DIST_DIR = process.env.NEXT_DIST_DIR ?? ".next-smoke-facility";
const SHOULD_CLEAN_DIST_DIR = !process.env.NEXT_DIST_DIR;
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
      const res = await fetch(
        `${BASE_URL}/api/fountains?minLat=abc&maxLat=0&minLng=0&maxLng=0`,
      );
      if (res.status === 400) return;
    } catch (error) {
      lastErr = error;
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

function assertArrayPayload(payload, key, expectedKeys = []) {
  assert.ok(
    payload && typeof payload === "object",
    `${key}: payload is not object`,
  );
  assert.ok(Array.isArray(payload.items), `${key}: items is not array`);

  if (payload.items.length === 0 || expectedKeys.length === 0) return;
  const first = payload.items[0];
  if (!first || typeof first !== "object") {
    assert.fail(`${key}: first item is not object`);
  }

  const hasAnyExpectedKey = expectedKeys.some((candidateKey) =>
    Object.hasOwn(first, candidateKey),
  );
  assert.equal(
    hasAnyExpectedKey,
    true,
    `${key}: first item missing expected keys`,
  );
}

async function runSmokeChecks() {
  const bounds =
    "minLat=37.55&maxLat=37.59&minLng=126.95&maxLng=127.03&size=20";

  const fountainsRes = await fetch(`${BASE_URL}/api/fountains?${bounds}`);
  assert.equal(fountainsRes.status, 200, "/api/fountains should return HTTP 200");
  const fountainsPayload = await fountainsRes.json();
  assertArrayPayload(fountainsPayload, "fountains", [
    "fountainName",
    "address",
    "latitude",
    "longitude",
  ]);

  const trashRes = await fetch(
    `${BASE_URL}/api/trash-bins?${bounds}&centerLat=37.57&centerLng=126.99`,
  );
  assert.equal(trashRes.status, 200, "/api/trash-bins should return HTTP 200");
  const trashPayload = await trashRes.json();
  assertArrayPayload(trashPayload, "trash-bins", [
    "address",
    "latitude",
    "longitude",
    "binType",
    "locationDesc",
  ]);

  const invalidSizeRes = await fetch(
    `${BASE_URL}/api/fountains?minLat=37.55&maxLat=37.59&minLng=126.95&maxLng=127.03&size=501`,
  );
  assert.equal(
    invalidSizeRes.status,
    400,
    "size=501 should return HTTP 400",
  );

  const missingCenterRes = await fetch(
    `${BASE_URL}/api/trash-bins?${bounds}`,
  );
  assert.equal(
    missingCenterRes.status,
    400,
    "trash-bins without center should return HTTP 400",
  );
}

const { child, getLogs } = startServer();
const tsConfigPath = path.resolve("tsconfig.json");
const originalTsConfig = await readFile(tsConfigPath, "utf8").catch(() => null);

try {
  await waitUntilReady(child, getLogs);
  await runSmokeChecks();
  console.log("facilities network smoke checks passed");
} catch (error) {
  const { stdout, stderr } = getLogs();
  console.error("facilities network smoke checks failed");
  console.error(String(error));
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

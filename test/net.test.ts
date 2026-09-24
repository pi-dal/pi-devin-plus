import assert from "node:assert/strict";
import test from "node:test";
import { fetchWithRetry, isTransientNetworkError } from "../src/net.js";

test("detects transient network errors", () => {
  assert.equal(isTransientNetworkError(new TypeError("fetch failed")), true);
  const reset = new Error("socket hang up");
  assert.equal(isTransientNetworkError(reset), true);
  assert.equal(isTransientNetworkError(new Error("GetUserJwt HTTP 401: unauthorized")), false);
  assert.equal(isTransientNetworkError("nope"), false);
});

test("retries transient failures and returns the first successful response", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    if (calls < 3) throw new TypeError("fetch failed");
    return new Response("ok", { status: 200 });
  }) as typeof fetch;

  try {
    const resp = await fetchWithRetry("https://example.test/", { method: "POST" }, isTransientNetworkError);
    assert.equal(resp.status, 200);
    assert.equal(calls, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("gives up after the third attempt", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    throw new TypeError("fetch failed");
  }) as typeof fetch;

  try {
    await assert.rejects(
      fetchWithRetry("https://example.test/", { method: "POST" }, isTransientNetworkError),
      /fetch failed/,
    );
    assert.equal(calls, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not retry non-transient errors", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    throw new Error("GetUserJwt HTTP 401: unauthorized");
  }) as typeof fetch;

  try {
    await assert.rejects(
      fetchWithRetry("https://example.test/", { method: "POST" }, isTransientNetworkError),
      /401/,
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not retry when already aborted", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  const controller = new AbortController();
  controller.abort();
  globalThis.fetch = (async () => {
    calls++;
    throw new TypeError("fetch failed");
  }) as typeof fetch;

  try {
    await assert.rejects(
      fetchWithRetry("https://example.test/", { method: "POST" }, isTransientNetworkError, controller.signal),
    );
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

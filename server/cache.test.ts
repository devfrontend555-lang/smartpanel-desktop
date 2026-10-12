import { test } from "node:test";
import assert from "node:assert/strict";
import { RateLimiter, TtlCache } from "./cache";
import { resilientFetch, resilienceStats } from "./resilience";

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

test("coalesces concurrent requests into one fetch", async () => {
  const cache = new TtlCache();
  let fetchCount = 0;

  const values = await Promise.all(
    Array.from({ length: 25 }, () =>
      cache.coalesce("same-key", 60, async () => {
        fetchCount++;
        await wait(20);
        return { source: "upstream" };
      }),
    ),
  );

  assert.equal(fetchCount, 1);
  assert.equal(values.length, 25);
  assert.deepEqual(values[0], { source: "upstream" });
  assert.ok(values.every(value => value === values[0]));
});

test("serves stale data briefly when the upstream fetch fails", async () => {
  const cache = new TtlCache();
  cache.set("stale-key", { source: "previous-response" }, 0.01);
  await wait(25);

  const value = await cache.coalesce("stale-key", 60, async () => {
    throw new Error("simulated upstream outage");
  });

  assert.deepEqual(value, { source: "previous-response" });
  assert.equal(cache.stats().staleHits, 1);
});

test("expires values after their TTL", async () => {
  const cache = new TtlCache();
  cache.set("short-key", "old", 0.01);
  await wait(25);

  let fetchCount = 0;
  const value = await cache.coalesce("short-key", 60, async () => {
    fetchCount++;
    return "new";
  });

  assert.equal(value, "new");
  assert.equal(fetchCount, 1);
});

test("rate limits each client independently", async () => {
  const limiter = new RateLimiter(2, 60_000);

  assert.equal(await limiter.allow("client-a"), true);
  assert.equal(await limiter.allow("client-a"), true);
  assert.equal(await limiter.allow("client-a"), false);
  assert.equal(await limiter.allow("client-b"), true);
});

test("retries a temporary upstream failure and recovers", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    if (calls === 1) return new Response("temporary failure", { status: 503 });
    return new Response("ok", { status: 200 });
  }) as typeof fetch;

  try {
    const response = await resilientFetch(
      "https://retry-test.example/data",
      {},
      { retries: 2, baseDelayMs: 1, timeoutMs: 100 },
    );
    assert.equal(response.status, 200);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("opens a circuit after repeated upstream failures", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    throw new Error("simulated outage");
  }) as typeof fetch;

  try {
    for (let i = 0; i < 3; i++) {
      await assert.rejects(
        resilientFetch(
          "https://circuit-test.example/data",
          {},
          { retries: 0, timeoutMs: 100 },
        ),
        /simulated outage/,
      );
    }

    await assert.rejects(
      resilientFetch("https://circuit-test.example/data", {}, { retries: 0 }),
      /Upstream circuit open/,
    );
    assert.equal(calls, 3);
    assert.equal(
      resilienceStats().find(item => item.host === "circuit-test.example")?.circuit,
      "open",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
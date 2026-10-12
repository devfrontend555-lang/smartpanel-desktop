interface CircuitState {
  failures: number;
  openedAt: number | null;
  halfOpenInFlight: boolean;
}

interface ResilientFetchOptions {
  timeoutMs?: number;
  retries?: number;
  baseDelayMs?: number;
}

const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 30_000;
const circuits = new Map<string, CircuitState>();

function stateFor(host: string): CircuitState {
  let state = circuits.get(host);
  if (!state) {
    state = { failures: 0, openedAt: null, halfOpenInFlight: false };
    circuits.set(host, state);
  }
  return state;
}

function retryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function recordSuccess(state: CircuitState): void {
  state.failures = 0;
  state.openedAt = null;
  state.halfOpenInFlight = false;
}

function recordFailure(state: CircuitState): void {
  state.failures++;
  state.halfOpenInFlight = false;
  if (state.failures >= FAILURE_THRESHOLD) state.openedAt = Date.now();
}

/**
 * Fetch with a bounded retry policy and one circuit per upstream host.
 * Retryable responses are thrown after the final attempt so route-level
 * stale-if-error fallback can protect users from a temporary outage.
 */
export async function resilientFetch(
  input: string | URL,
  init: RequestInit = {},
  options: ResilientFetchOptions = {},
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? 8_000;
  const retries = options.retries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 250;
  const host = new URL(input.toString()).host;
  const state = stateFor(host);
  const now = Date.now();

  if (state.openedAt !== null) {
    if (now - state.openedAt < COOLDOWN_MS) {
      throw new Error(`Upstream circuit open: ${host}`);
    }
    if (state.halfOpenInFlight) {
      throw new Error(`Upstream circuit half-open: ${host}`);
    }
    state.halfOpenInFlight = true;
  }

  const { signal: _ignoredSignal, ...requestInit } = init;
  let lastError: unknown;
  let succeeded = false;
  try {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(input, { ...requestInit, signal: controller.signal });
        if (!retryableStatus(response.status)) {
          recordSuccess(state);
          succeeded = true;
          return response;
        }

        lastError = new Error(`Upstream ${host} returned HTTP ${response.status}`);
        if (attempt < retries) {
          await sleep(Math.min(baseDelayMs * 2 ** attempt, 2_000));
          continue;
        }
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          await sleep(Math.min(baseDelayMs * 2 ** attempt, 2_000));
          continue;
        }
      } finally {
        clearTimeout(timer);
      }
    }
  } finally {
    if (!succeeded && lastError) recordFailure(state);
  }

  throw lastError instanceof Error ? lastError : new Error("Upstream request failed");
}

export function resilienceStats() {
  return Array.from(circuits.entries()).map(([host, state]) => ({
    host,
    failures: state.failures,
    circuit: state.openedAt === null
      ? "closed"
      : Date.now() - state.openedAt < COOLDOWN_MS
        ? "open"
        : "half-open",
  }));
}
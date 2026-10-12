interface RefreshJob {
  name: string;
  path: string;
  intervalMs: number;
  initialDelayMs: number;
  running: boolean;
  lastRun: number | null;
  lastSuccess: number | null;
  lastError: string | null;
}

const jobs: RefreshJob[] = [
  { name: "weather",   path: "/api/weather?city=Toshkent", intervalMs: 9 * 60_000,  initialDelayMs: 10_000, running: false, lastRun: null, lastSuccess: null, lastError: null },
  { name: "currency",  path: "/api/currency?base=USD",     intervalMs: 27 * 60_000, initialDelayMs: 15_000, running: false, lastRun: null, lastSuccess: null, lastError: null },
  { name: "crypto",    path: "/api/crypto",                intervalMs: 90_000,       initialDelayMs: 20_000, running: false, lastRun: null, lastSuccess: null, lastError: null },
  { name: "radio",     path: "/api/radio",                 intervalMs: 55 * 60_000,  initialDelayMs: 25_000, running: false, lastRun: null, lastSuccess: null, lastError: null },
  { name: "news",      path: "/api/news?cat=top",          intervalMs: 4 * 60_000,   initialDelayMs: 30_000, running: false, lastRun: null, lastSuccess: null, lastError: null },
  { name: "prayer",    path: "/api/prayer?city=Toshkent",  intervalMs: 55 * 60_000,  initialDelayMs: 35_000, running: false, lastRun: null, lastSuccess: null, lastError: null },
];

let workerStarted = false;
let workerPort: number | null = null;
const timers = new Set<ReturnType<typeof setTimeout>>();

async function refreshJob(job: RefreshJob): Promise<void> {
  if (job.running || workerPort === null) return;
  job.running = true;
  job.lastRun = Date.now();
  try {
    const response = await fetch(`http://127.0.0.1:${workerPort}${job.path}`, {
      headers: {
        "User-Agent": "SmartPanel-RefreshWorker/1.0",
        "X-SmartPanel-Internal": "refresh",
      },
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new Error(`local endpoint returned ${response.status}`);
    job.lastSuccess = Date.now();
    job.lastError = null;
  } catch (error) {
    job.lastError = (error as Error).message;
    console.warn(`[refresh] ${job.name} failed: ${job.lastError}`);
  } finally {
    job.running = false;
  }
}

function schedule(job: RefreshJob, delayMs: number): void {
  const timer = setTimeout(async () => {
    timers.delete(timer);
    await refreshJob(job);
    schedule(job, job.intervalMs);
  }, delayMs);
  timer.unref();
  timers.add(timer);
}

export function startBackgroundRefresh(port: number): void {
  if (workerStarted) return;
  workerStarted = true;
  workerPort = port;
  jobs.forEach(job => schedule(job, job.initialDelayMs));
  console.log(`[refresh] background worker started (${jobs.length} jobs)`);
}

export function stopBackgroundRefresh(): void {
  for (const timer of timers) clearTimeout(timer);
  timers.clear();
  workerStarted = false;
  workerPort = null;
}

export function refreshStats() {
  return {
    enabled: workerStarted,
    port: workerPort,
    jobs: jobs.map(({ name, intervalMs, running, lastRun, lastSuccess, lastError }) => ({
      name,
      intervalMs,
      running,
      lastRun,
      lastSuccess,
      lastError,
    })),
  };
}
export type ZohoSchedulerHandle = {
  stop(): void;
};

type StartZohoSchedulerInput = {
  intervalMs: number;
  runSync: () => Promise<unknown>;
  setIntervalFn?: typeof setInterval;
  clearIntervalFn?: typeof clearInterval;
};

export function startZohoScheduler({
  intervalMs,
  runSync,
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval
}: StartZohoSchedulerInput): ZohoSchedulerHandle {
  if (intervalMs <= 0) {
    return { stop: () => {} };
  }

  let timer: ReturnType<typeof setInterval> | null = setIntervalFn(() => {
    void runSync().catch(() => {
      // Sync failures are recorded by the sync service. Scheduler should never crash the process.
    });
  }, intervalMs);

  if (typeof timer === 'object' && timer !== null && 'unref' in timer && typeof timer.unref === 'function') {
    timer.unref();
  }

  return {
    stop() {
      if (!timer) {
        return;
      }

      clearIntervalFn(timer);
      timer = null;
    }
  };
}

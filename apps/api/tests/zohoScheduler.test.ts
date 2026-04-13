import { describe, expect, it, vi } from 'vitest';
import { startZohoScheduler } from '../src/services/zohoScheduler.js';

describe('startZohoScheduler', () => {
  it('schedules recurring sync runs and ignores rejected promises', async () => {
    const callbacks: Array<() => void> = [];
    const setIntervalFn = vi.fn((callback: () => void) => {
      callbacks.push(callback);
      return { id: 'timer-1' } as unknown as NodeJS.Timeout;
    });
    const clearIntervalFn = vi.fn();
    const runSync = vi.fn().mockRejectedValue(new Error('zoho unavailable'));

    const scheduler = startZohoScheduler({
      intervalMs: 15 * 60 * 1000,
      runSync,
      setIntervalFn,
      clearIntervalFn
    });

    expect(setIntervalFn).toHaveBeenCalledTimes(1);
    callbacks[0]?.();
    await Promise.resolve();
    expect(runSync).toHaveBeenCalledTimes(1);

    scheduler.stop();
    expect(clearIntervalFn).toHaveBeenCalledWith({ id: 'timer-1' });
  });
});

import { mapZohoSalesOrder } from './zohoMapper.js';
import type { OrderApiRecord } from '../lib/dispatch.js';
import type { ZohoSalesOrder } from '../lib/zoho.js';
import type { DispatchRepository } from '../repositories/dispatchRepository.js';

export type ZohoSyncTrigger = 'manual' | 'scheduled';

export type ZohoSyncFailure = {
  salesOrderNumber: string;
  zohoSalesOrderId: string;
  message: string;
};

export type ZohoSyncSummary = {
  trigger: ZohoSyncTrigger;
  success: boolean;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  fetchedOrderCount: number;
  reconciledOrderCount: number;
  failedOrderCount: number;
  deletedMachineUnitCount: number;
  reconciledOrders: OrderApiRecord[];
  failedOrders: ZohoSyncFailure[];
};

export interface ZohoOrdersClient {
  fetchSalesOrders(): Promise<ZohoSalesOrder[]>;
}

export interface ZohoSyncService {
  start(): void;
  stop(): void;
  runManualSync(): Promise<ZohoSyncSummary>;
  getLastSummary(): ZohoSyncSummary | null;
}

type CreateZohoSyncServiceInput = {
  dispatchRepository: DispatchRepository;
  zohoClient: ZohoOrdersClient;
  intervalMs: number;
  now?: () => Date;
  setIntervalFn?: typeof setInterval;
  clearIntervalFn?: typeof clearInterval;
};

export function createZohoSyncService({
  dispatchRepository,
  zohoClient,
  intervalMs,
  now = () => new Date(),
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval
}: CreateZohoSyncServiceInput): ZohoSyncService {
  let lastSummary: ZohoSyncSummary | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let activeRun: Promise<ZohoSyncSummary> | null = null;

  const runSync = async (trigger: ZohoSyncTrigger): Promise<ZohoSyncSummary> => {
    if (activeRun) {
      return activeRun;
    }

    activeRun = (async () => {
      const startedAt = now();
      const salesOrders = await zohoClient.fetchSalesOrders();
      const reconciledOrders: OrderApiRecord[] = [];
      const failedOrders: ZohoSyncFailure[] = [];
      let deletedMachineUnitCount = 0;

      for (const salesOrder of salesOrders) {
        try {
          const result = await dispatchRepository.reconcileZohoOrder(mapZohoSalesOrder(salesOrder));
          reconciledOrders.push(result.order);
          deletedMachineUnitCount += result.deletedMachineUnitIds.length;
        } catch (error) {
          failedOrders.push({
            salesOrderNumber: salesOrder.salesorder_number,
            zohoSalesOrderId: salesOrder.salesorder_id,
            message: error instanceof Error ? error.message : 'Unknown sync error'
          });
        }
      }

      const completedAt = now();
      lastSummary = {
        trigger,
        success: failedOrders.length === 0,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs: completedAt.getTime() - startedAt.getTime(),
        fetchedOrderCount: salesOrders.length,
        reconciledOrderCount: reconciledOrders.length,
        failedOrderCount: failedOrders.length,
        deletedMachineUnitCount,
        reconciledOrders,
        failedOrders
      };

      return lastSummary;
    })();

    try {
      return await activeRun;
    } finally {
      activeRun = null;
    }
  };

  return {
    start() {
      if (timer || intervalMs <= 0) {
        return;
      }

      timer = setIntervalFn(() => {
        if (activeRun) {
          return;
        }

        return runSync('scheduled');
      }, intervalMs);

      if (typeof timer === 'object' && timer !== null && 'unref' in timer && typeof timer.unref === 'function') {
        timer.unref();
      }
    },
    stop() {
      if (!timer) {
        return;
      }

      clearIntervalFn(timer);
      timer = null;
    },
    runManualSync() {
      return runSync('manual');
    },
    getLastSummary() {
      return lastSummary;
    }
  };
}

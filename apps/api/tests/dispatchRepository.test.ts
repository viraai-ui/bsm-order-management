import { describe, expect, it, vi } from 'vitest';
import { defaultSeedOrders, seedDispatchData } from '../src/repositories/dispatchRepository.js';

describe('seedDispatchData', () => {
  it('seeds without using interactive callback transactions', async () => {
    const create = vi.fn((input: unknown) => Promise.resolve(input));
    const transaction = vi.fn(async (input: unknown) => {
      if (typeof input === 'function') {
        throw new Error('interactive transactions are not supported by the pooled connection');
      }

      return Promise.all(input as Promise<unknown>[]);
    });

    const prismaClient = {
      order: {
        count: vi.fn().mockResolvedValue(0),
        create,
      },
      $transaction: transaction,
    };

    await seedDispatchData(prismaClient as never);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(typeof transaction.mock.calls[0]?.[0]).not.toBe('function');
    expect(create).toHaveBeenCalledTimes(defaultSeedOrders.length);
  });
});

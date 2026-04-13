import { describe, expect, it } from 'vitest';
import { formatSerialNumber, getFinancialYearCode, nextSerialNumber } from '../src/services/serials.js';

describe('serial generation', () => {
  it('uses the Indian financial year boundary', () => {
    expect(getFinancialYearCode(new Date('2026-03-31T00:00:00Z'))).toBe('2526');
    expect(getFinancialYearCode(new Date('2026-04-01T00:00:00Z'))).toBe('2627');
  });

  it('pads sequence numbers to 5 digits', () => {
    expect(formatSerialNumber(new Date('2026-04-03T00:00:00Z'), 1)).toBe('262700001');
    expect(formatSerialNumber(new Date('2026-04-03T00:00:00Z'), 42)).toBe('262700042');
  });

  it('increments from the last used sequence', () => {
    const result = nextSerialNumber({ date: new Date('2026-04-03T00:00:00Z'), lastSequence: 41 });

    expect(result.sequence).toBe(42);
    expect(result.serialNumber).toBe('262700042');
  });
});

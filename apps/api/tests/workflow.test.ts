import { describe, expect, it } from 'vitest';
import { evaluateWorkflowReadiness } from '../src/services/workflow.js';

describe('workflow readiness', () => {
  it('blocks dispatch readiness when serial, qr, or media are missing', () => {
    const result = evaluateWorkflowReadiness({
      serialNumber: null,
      qrCodeValue: null,
      imageCount: 0,
      videoCount: 0,
      requiredVideoCount: 2,
    });

    expect(result.dispatchReady).toBe(false);
    expect(result.nextStage).toBe('PACKING_TESTING');
    expect(result.blockers).toEqual([
      'Serial number is missing',
      'QR code is missing',
      'At least one photo is required',
      'At least 2 testing videos are required',
    ]);
  });

  it('allows ready for dispatch only when all guards pass', () => {
    const result = evaluateWorkflowReadiness({
      serialNumber: '262700042',
      qrCodeValue: 'qr://262700042',
      imageCount: 3,
      videoCount: 2,
      requiredVideoCount: 2,
    });

    expect(result.dispatchReady).toBe(true);
    expect(result.nextStage).toBe('READY_FOR_DISPATCH');
    expect(result.blockers).toEqual([]);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { buildGeneratedQrAssets, runGenerateQrWorkflow } from '../features/qr/qrWorkflow';

describe('qrWorkflow helpers', () => {
  it('generates serial first before generating QR when a machine is missing a serial number', async () => {
    const generateSerial = vi.fn().mockResolvedValue({
      id: 'MU-001',
      serialNumber: '262700111',
    });
    const generateQr = vi.fn().mockResolvedValue({
      id: 'MU-001',
      serialNumber: '262700111',
      qrCodeValue: 'qr://262700111',
    });

    const result = await runGenerateQrWorkflow(
      { id: 'MU-001', productName: 'Freezer Unit 1', serialNumber: null, qrCodeValue: null },
      { generateSerial, generateQr },
    );

    expect(generateSerial).toHaveBeenCalledWith('MU-001');
    expect(generateQr).toHaveBeenCalledWith('MU-001');
    expect(result.qrCodeValue).toBe('qr://262700111');
  });

  it('collects download assets for generated QR codes only', () => {
    expect(buildGeneratedQrAssets([
      { id: 'MU-001', productName: 'Freezer Unit 1', serialNumber: null, qrCodeValue: null },
      { id: 'MU-002', productName: 'Freezer Unit 2', serialNumber: '262700014', qrCodeValue: 'qr://262700014' },
    ], 'SO-24018')).toEqual([
      {
        fileName: 'SO-24018-Freezer-Unit-2-262700014.png',
        label: 'Freezer Unit 2',
        serialNumber: '262700014',
        value: 'qr://262700014',
      },
    ]);
  });
});

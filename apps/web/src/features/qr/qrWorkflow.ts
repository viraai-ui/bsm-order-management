import QRCode from 'qrcode';
import type { MachineUnitDetail, OrderMachineSummary } from '../../lib/apiClient';

export type QrWorkflowMachine = Pick<OrderMachineSummary, 'id' | 'productName' | 'serialNumber' | 'qrCodeValue'>;
export type QrWorkflowMutation = Pick<MachineUnitDetail, 'id' | 'serialNumber' | 'qrCodeValue'>;

export type QrWorkflowActions<TResult extends QrWorkflowMutation = QrWorkflowMutation> = {
  generateSerial: (machineId: string) => Promise<TResult>;
  generateQr: (machineId: string) => Promise<TResult>;
};

export type GeneratedQrAsset = {
  fileName: string;
  label: string;
  serialNumber: string;
  value: string;
};

const previewCache = new Map<string, Promise<string>>();

function hasText(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function sanitizeFileSegment(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'QR';
}

export async function runGenerateQrWorkflow<TMachine extends QrWorkflowMachine, TResult extends QrWorkflowMutation = QrWorkflowMutation>(
  machine: TMachine,
  actions: QrWorkflowActions<TResult>,
): Promise<TMachine & TResult> {
  const serialResult = hasText(machine.serialNumber)
    ? null
    : await actions.generateSerial(machine.id);
  const qrResult = await actions.generateQr(machine.id);

  return {
    ...machine,
    ...serialResult,
    ...qrResult,
    serialNumber: qrResult.serialNumber ?? serialResult?.serialNumber ?? machine.serialNumber ?? null,
    qrCodeValue: qrResult.qrCodeValue ?? serialResult?.qrCodeValue ?? machine.qrCodeValue ?? null,
  } as TMachine & TResult;
}

export function buildGeneratedQrAssets(
  machines: readonly QrWorkflowMachine[],
  orderNumber: string,
): GeneratedQrAsset[] {
  return machines.flatMap((machine) => {
    if (!hasText(machine.serialNumber) || !hasText(machine.qrCodeValue)) {
      return [];
    }

    return [{
      fileName: `${sanitizeFileSegment(orderNumber)}-${sanitizeFileSegment(machine.productName)}-${sanitizeFileSegment(machine.serialNumber)}.png`,
      label: machine.productName,
      serialNumber: machine.serialNumber,
      value: machine.qrCodeValue,
    }];
  });
}

export function buildQrPreviewUrl(asset: Pick<GeneratedQrAsset, 'value'>) {
  const cached = previewCache.get(asset.value);
  if (cached) return cached;

  const promise = QRCode.toDataURL(asset.value, {
    errorCorrectionLevel: 'M',
    margin: 1,
    scale: 8,
    color: {
      dark: '#111827',
      light: '#FFFFFF',
    },
  });

  previewCache.set(asset.value, promise);
  return promise;
}

export async function downloadGeneratedQrAsset(asset: GeneratedQrAsset) {
  const previewUrl = await buildQrPreviewUrl(asset);

  if (typeof document === 'undefined') {
    return previewUrl;
  }

  const link = document.createElement('a');
  link.href = previewUrl;
  link.download = asset.fileName;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();

  return previewUrl;
}

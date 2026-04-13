import type { WorkflowStage } from '../lib/dispatch.js';

export type WorkflowCheckInput = {
  serialNumber?: string | null;
  qrCodeValue?: string | null;
  imageCount: number;
  videoCount: number;
  requiredVideoCount?: number;
};

export type WorkflowCheckResult = {
  dispatchReady: boolean;
  blockers: string[];
  nextStage: WorkflowStage;
};

export function evaluateWorkflowReadiness(input: WorkflowCheckInput): WorkflowCheckResult {
  const blockers: string[] = [];
  const requiredVideoCount = input.requiredVideoCount ?? 2;

  if (!input.serialNumber) blockers.push('Serial number is missing');
  if (!input.qrCodeValue) blockers.push('QR code is missing');
  if (input.imageCount < 1) blockers.push('At least one photo is required');
  if (input.videoCount < requiredVideoCount) blockers.push(`At least ${requiredVideoCount} testing videos are required`);

  const dispatchReady = blockers.length === 0;
  const mediaComplete = input.imageCount >= 1 && input.videoCount >= requiredVideoCount;

  return {
    dispatchReady,
    blockers,
    nextStage: dispatchReady ? 'READY_FOR_DISPATCH' : mediaComplete ? 'MEDIA_UPLOADED' : 'PACKING_TESTING',
  };
}

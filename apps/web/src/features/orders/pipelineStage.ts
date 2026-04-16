import type { OrderSummary } from '../../lib/apiClient';

export type OrderStageCode = 'QR_QUEUE' | 'DISPATCH' | 'MEDIA' | 'CLOSED';

export function isQrComplete(order: OrderSummary) {
  return order.machineUnitCount > 0 && order.qrCodeCount >= order.machineUnitCount;
}

export function isMediaReady(order: OrderSummary) {
  const hasRequiredImages = order.imageCount >= order.machineUnitCount;
  const hasRequiredVideos = order.videoCount >= order.requiredVideoCount;
  return isQrComplete(order) && hasRequiredImages && hasRequiredVideos;
}

export function getOrderStageCode(order: OrderSummary): OrderStageCode {
  if (order.status === 'Dispatched') return 'CLOSED';
  if (isMediaReady(order)) return 'MEDIA';
  if (isQrComplete(order)) return 'DISPATCH';
  return 'QR_QUEUE';
}

export function getOrderStageLabel(order: OrderSummary) {
  const stage = getOrderStageCode(order);
  if (stage === 'CLOSED') return 'Closed';
  if (stage === 'MEDIA') return 'Media';
  if (stage === 'DISPATCH') return 'Dispatch';
  return 'QR Queue';
}

export function getOrderStageTone(order: OrderSummary) {
  const stage = getOrderStageCode(order);
  if (stage === 'CLOSED') return 'tone-muted';
  if (stage === 'MEDIA') return 'tone-live';
  if (stage === 'DISPATCH') return 'tone-neutral';
  return 'tone-urgent';
}

export function getOrderStageSummary(order: OrderSummary) {
  const stage = getOrderStageCode(order);
  if (stage === 'CLOSED') return 'Order completed and closed.';
  if (stage === 'MEDIA') return 'QR complete, media ready for closeout.';
  if (stage === 'DISPATCH') return 'QR complete, ready for dispatch lane work.';
  if (order.qrCodeCount > 0) return `${order.qrCodeCount}/${order.machineUnitCount} QR codes generated.`;
  return 'QR generation still pending.';
}

export const MAX_GRID_SIDE = 512;
export type ImageFit = 'contain' | 'cover';
export function validateGridSide(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > MAX_GRID_SIDE) throw new Error(`画布每边请输入 1–${MAX_GRID_SIDE} 的整数。`);
  return value;
}
export function gridDimensions(sourceWidth: number, sourceHeight: number, width: number, height?: number) {
  validateGridSide(width);
  if (height !== undefined) return { width, height: validateGridSide(height) };
  const scale = Math.min(width / sourceWidth, MAX_GRID_SIDE / sourceHeight);
  return { width: Math.max(1, Math.round(sourceWidth * scale)), height: Math.max(1, Math.round(sourceHeight * scale)) };
}

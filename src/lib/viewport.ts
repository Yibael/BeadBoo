import type { Region, Viewport } from './projects';
export type Size = { width: number; height: number };
export function fitRegion(region: Region, size: Size): Viewport {
  return { cx: region.x + region.width / 2, cy: region.y + region.height / 2,
    scale: Math.min(64, Math.max(0.1, Math.min(size.width / (region.width + 2), size.height / (region.height + 2)))) };
}
export function clampViewport(view: Viewport, board: Size, window: Size): Viewport {
  const minimum = Math.min(window.width / (board.width + 4), window.height / (board.height + 4));
  const scale = Math.max(Math.max(0.1, minimum * 0.7), Math.min(80, view.scale));
  // Allow modest overscroll while always keeping part of the pattern in view.
  return { scale, cx: Math.max(-window.width / scale * 0.25, Math.min(board.width + window.width / scale * 0.25, view.cx)),
    cy: Math.max(-window.height / scale * 0.25, Math.min(board.height + window.height / scale * 0.25, view.cy)) };
}
export function zoomAt(view: Viewport, factor: number, point: { x: number; y: number }, size: Size): Viewport {
  const scale = Math.max(0.1, Math.min(80, view.scale * factor));
  return { scale, cx: view.cx + (point.x - size.width / 2) * (1 / view.scale - 1 / scale),
    cy: view.cy + (point.y - size.height / 2) * (1 / view.scale - 1 / scale) };
}
export function cellAt(point: { x: number; y: number }, view: Viewport, size: Size, board: Size): number | null {
  const x = Math.floor(view.cx + (point.x - size.width / 2) / view.scale);
  const y = Math.floor(view.cy + (point.y - size.height / 2) / view.scale);
  return x >= 0 && x < board.width && y >= 0 && y < board.height ? y * board.width + x : null;
}

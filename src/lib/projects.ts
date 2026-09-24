import { type Options, type Pattern, parsePalette } from './pattern';
import { MAX_GRID_SIDE, validateGridSide } from './dimensions';
import { validateCardInfo } from './color-cards';

export type Viewport = { cx: number; cy: number; scale: number };
export type WorkView = { viewport: Viewport | null; regionSize: number; region: number; color: number | null; locked: boolean };
export type Project = {
  id: string; title: string; createdAt: string; updatedAt: string;
  pattern: Pattern; options: Options; completed: number[]; batches: number[][];
  view: WorkView; deletedAt: string | null;
};
export type Region = { x: number; y: number; width: number; height: number };
export function newProject(title: string, pattern: Pattern, options: Options): Project {
  const now = new Date().toISOString();
  const first = Math.max(0, pattern.cells.findIndex(c => c >= 0));
  const firstRegion = Math.floor(Math.floor(first / pattern.width) / 16) * Math.ceil(pattern.width / 16) + Math.floor(first % pattern.width / 16);
  return { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`,
    title: title.trim().slice(0, 80) || '未命名图纸', createdAt: now, updatedAt: now,
    pattern: { ...pattern, ...(pattern.colorCard ? { colorCard: { ...pattern.colorCard } } : {}), cells: [...pattern.cells], palette: pattern.palette.map(c => ({ ...c })), counts: [...pattern.counts] },
    options: { ...options }, completed: [], batches: [], deletedAt: null,
    view: { viewport: null, regionSize: 16, region: firstRegion, color: null, locked: false } };
}
export function regionCount(pattern: Pattern, size: number) {
  return Math.ceil(pattern.width / size) * Math.ceil(pattern.height / size);
}
export function workRegion(pattern: Pattern, size: number, index: number): Region {
  const columns = Math.ceil(pattern.width / size);
  const safeIndex = Math.max(0, Math.min(regionCount(pattern, size) - 1, index));
  const x = safeIndex % columns * size, y = Math.floor(safeIndex / columns) * size;
  return { x, y, width: Math.min(size, pattern.width - x), height: Math.min(size, pattern.height - y) };
}
export function remainingInRegion(project: Project, region: Region, color?: number | null): number[] {
  const done = new Set(project.completed), indices: number[] = [];
  for (let y = region.y; y < region.y + region.height; y++) for (let x = region.x; x < region.x + region.width; x++) {
    const i = y * project.pattern.width + x, c = project.pattern.cells[i];
    if (c >= 0 && !done.has(i) && (color == null || c === color)) indices.push(i);
  }
  return indices;
}
export function completeColor(project: Project, region: Region, color: number): Project {
  const batch = remainingInRegion(project, region, color);
  if (!batch.length) return project;
  return { ...project, completed: [...project.completed, ...batch], batches: [...project.batches, batch], updatedAt: new Date().toISOString() };
}
export function undoCompletion(project: Project): Project {
  const last = project.batches.at(-1);
  if (!last) return project;
  const removed = new Set(last);
  return { ...project, completed: project.completed.filter(i => !removed.has(i)), batches: project.batches.slice(0, -1), updatedAt: new Date().toISOString() };
}
export function projectStatus(project: Project): string {
  return project.pattern.total > 0 && project.completed.length === project.pattern.total ? '已完成'
    : project.completed.length ? '拼制中' : '未开始';
}

// Validate persisted data before it reaches rendering or progress calculations.
export function validateProjects(value: unknown): Project[] {
  if (!Array.isArray(value)) throw new Error('图纸列表格式无效');
  const ids = new Set<string>();
  for (const p of value as Project[]) {
    if (!p || typeof p.id !== 'string' || !/^[a-z0-9-]+$/.test(p.id) || ids.has(p.id)
      || typeof p.title !== 'string' || p.title.length > 80 || !Number.isFinite(Date.parse(p.createdAt))
      || !Number.isFinite(Date.parse(p.updatedAt)) || !(p.deletedAt === null || Number.isFinite(Date.parse(p.deletedAt)))) throw new Error('图纸信息无效');
    ids.add(p.id);
    const b = p.pattern;
    if (!b || !Number.isInteger(b.width) || b.width < 1 || b.width > MAX_GRID_SIDE || !Number.isInteger(b.height) || b.height < 1 || b.height > MAX_GRID_SIDE
      || !Array.isArray(b.cells) || b.cells.length !== b.width * b.height) throw new Error('图纸网格无效');
    parsePalette(b.palette);
    if (b.colorCard !== undefined) validateCardInfo(b.colorCard);
    const counts = b.palette.map(() => 0);
    for (const c of b.cells) { if (!Number.isInteger(c) || c < -1 || c >= counts.length) throw new Error('图纸色号无效'); if (c >= 0) counts[c]++; }
    if (!Array.isArray(b.counts) || b.counts.length !== counts.length || counts.some((n, i) => n !== b.counts[i]) || b.total !== counts.reduce((a, n) => a + n, 0)) throw new Error('图纸用量无效');
    if (!Array.isArray(p.completed) || new Set(p.completed).size !== p.completed.length || p.completed.some(i => !Number.isInteger(i) || i < 0 || i >= b.cells.length || b.cells[i] < 0)) throw new Error('拼制进度无效');
    const done = new Set(p.completed), seen = new Set<number>();
    if (!Array.isArray(p.batches)) throw new Error('进度记录无效');
    for (const batch of p.batches) {
      if (!Array.isArray(batch) || !batch.length) throw new Error('进度批次无效');
      for (const i of batch) { if (!done.has(i) || seen.has(i)) throw new Error('进度批次无效'); seen.add(i); }
    }
    const o = p.options, v = p.view;
    if (!o || !Number.isFinite(o.width) || o.width < 1 || !Number.isFinite(o.maxColors) || o.maxColors < 1
      || ['dithering', 'cleanup', 'removeBackground'].some(k => typeof o[k as keyof Options] !== 'boolean')) throw new Error('转换设置无效');
    validateGridSide(o.width); if (o.height !== undefined) validateGridSide(o.height);
    if (o.fit !== undefined && !['contain','cover'].includes(o.fit)) throw new Error('图片适配方式无效');
    if (!v || !Number.isInteger(v.regionSize) || v.regionSize < 1 || v.regionSize > MAX_GRID_SIDE || !Number.isInteger(v.region) || v.region < 0 || v.region >= regionCount(b, v.regionSize)
      || !(v.color === null || Number.isInteger(v.color) && v.color >= 0 && v.color < b.palette.length) || typeof v.locked !== 'boolean') throw new Error('阅读位置无效');
    if (v.viewport !== null && (!v.viewport || ![v.viewport.cx, v.viewport.cy, v.viewport.scale].every(Number.isFinite) || v.viewport.scale <= 0 || v.viewport.scale > 100)) throw new Error('画布位置无效');
  }
  return value as Project[];
}

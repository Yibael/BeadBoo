import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newProject, completeColor, undoCompletion, workRegion, remainingInRegion, validateProjects } from '../src/lib/projects';
import { ProjectRepository, type StoragePort } from '../src/storage/repository';
import { cellAt, fitRegion, zoomAt, clampViewport } from '../src/lib/viewport';
import type { Pattern } from '../src/lib/pattern';
const board: Pattern = { width: 5, height: 3, palette: [{ code: 'A1', name: '白', hex: '#ffffff' }, { code: 'B1', name: '黑', hex: '#000000' }],
  cells: [0, 0, 1, 1, -1, 0, 1, 0, 1, 0, 1, 0, 1, -1, 0], counts: [7, 6], total: 13 };
const make = () => newProject('示例', board, { width: 5, maxColors: 2, dithering: false, cleanup: false, removeBackground: false });
function memory() {
  const slots: (string | null)[] = [null, null];
  const storage: StoragePort = { read: slot => slots[slot], write: (slot, text) => { slots[slot] = text; } };
  return { slots, storage };
}
test('batch completion affects only selected color in clipped region, counts remain physical totals', () => {
  const p = make(), area = workRegion(p.pattern, 2, 1);
  assert.deepEqual(area, { x: 2, y: 0, width: 2, height: 2 });
  const marked = completeColor(p, area, 1);
  assert.deepEqual(marked.completed, [2, 3, 8]);
  assert.equal(marked.pattern, p.pattern);
  assert.deepEqual(marked.pattern.counts, [7, 6]);
  assert.deepEqual(p.completed, []);
  assert.equal(completeColor(marked, area, 1), marked);
  assert.deepEqual(remainingInRegion(marked, area), [7]);
  assert.deepEqual(workRegion(p.pattern, 2, 5), { x: 4, y: 2, width: 1, height: 1 });
});
test('undo removes only the last batch; changing area size never changes recorded cell identities', () => {
  let p = make(); p = completeColor(p, workRegion(p.pattern, 2, 0), 0);
  const first = [...p.completed]; p = completeColor(p, workRegion(p.pattern, 5, 0), 1);
  assert.equal(p.completed.length, first.length + 6);
  const undone = undoCompletion(p);
  assert.deepEqual(undone.completed, first);
  validateProjects([{ ...undone, view: { ...undone.view, regionSize: 5, region: 0 } }]);
});
test('editing a copied pattern preserves original data and starts independent progress', () => {
  const p = completeColor(make(), workRegion(board, 5, 0), 1);
  const copy = newProject('副本', p.pattern, p.options);
  copy.pattern.cells[0] = 1;
  assert.equal(p.pattern.cells[0], 0);
  assert.deepEqual(copy.completed, []);
  assert.notEqual(copy.id, p.id);
});
test('repository restores pattern, batches, viewport and deleted state across a new instance', () => {
  const { storage } = memory(); const repo = new ProjectRepository(storage); repo.load();
  const p = completeColor(make(), workRegion(board, 5, 0), 0);
  p.view = { viewport: { cx: 2, cy: 1, scale: 32 }, regionSize: 2, region: 4, color: 0, locked: true };
  repo.commit([p]); repo.commit([{ ...p, deletedAt: new Date().toISOString() }]);
  const reloaded = new ProjectRepository(storage); const result = reloaded.load();
  assert.deepEqual(result.projects[0].view, p.view);
  assert.deepEqual(result.projects[0].batches, p.batches);
  assert.ok(result.projects[0].deletedAt);
  const restored = reloaded.commit(result.projects.map(p => ({ ...p, deletedAt: null })));
  assert.equal(restored[0].deletedAt, null);
});
test('partial snapshot write recovers last committed data without claiming failed data was saved', () => {
  const { storage, slots } = memory(); const repo = new ProjectRepository(storage); repo.load(); const p = make(); repo.commit([p]);
  storage.write = (slot, text) => { slots[slot] = text.slice(0, 30); throw new Error('disk full'); };
  assert.throws(() => repo.commit([{ ...p, title: '尚未保存' }]));
  assert.equal(repo.projects[0].title, '示例');
  const recovered = new ProjectRepository(storage).load();
  assert.equal(recovered.recovered, true); assert.equal(recovered.projects[0].title, '示例');
});
test('corrupt storage and access errors cannot silently turn into an empty writable library', () => {
  const { slots, storage } = memory(); slots[0] = '{bad'; slots[1] = '{broken'; const repo = new ProjectRepository(storage);
  assert.throws(() => repo.load()); assert.throws(() => repo.commit([]));
  assert.throws(() => new ProjectRepository({ ...storage, read: () => { throw new Error('permission'); } }).load());
  const invalid = make(); invalid.completed = [4]; assert.throws(() => validateProjects([invalid]));
  const duplicate = make(); duplicate.completed = [0, 0]; assert.throws(() => validateProjects([duplicate]));
});
test('pinch zoom keeps the focal grid point fixed and maps taps after pan correctly', () => {
  const size = { width: 320, height: 400 }, view = { cx: 10, cy: 12, scale: 20 }, point = { x: 240, y: 120 };
  const next = zoomAt(view, 2, point, size);
  const beforeX = view.cx + (point.x - size.width / 2) / view.scale;
  const afterX = next.cx + (point.x - size.width / 2) / next.scale;
  assert.equal(afterX, beforeX);
  const beforeY = view.cy + (point.y - size.height / 2) / view.scale;
  assert.equal(next.cy + (point.y - size.height / 2) / next.scale, beforeY);
  assert.equal(cellAt({ x: 160, y: 200 }, { cx: 2.5, cy: 1.5, scale: 30 }, size, board), 7);
  assert.equal(cellAt({ x: 0, y: 0 }, { cx: 2.5, cy: 1.5, scale: 30 }, size, board), null);
});
test('fit and pan limits keep extreme aspect ratio boards reachable', () => {
  const size = { width: 320, height: 350 }, tall = { width: 3, height: 200 };
  const fit = fitRegion({ x: 0, y: 0, ...tall }, size);
  assert.ok(fit.scale * tall.height < size.height);
  assert.equal(fit.cy, 100);
  const bounded = clampViewport({ cx: 100000, cy: -10000, scale: 1000 }, tall, size);
  assert.equal(bounded.scale, 80); assert.ok(bounded.cx < 10 && bounded.cy > -10);
});

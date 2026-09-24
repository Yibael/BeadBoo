import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addPresetToCollection, validateUserCards, customCard, PRESET_CARDS, patternWithCard, validateCustomCards } from '../src/lib/color-cards';
import { MAX_PALETTE_COLORS, parsePalette, createPattern, toCSV, type Options, type Raster } from '../src/lib/pattern';
import { newProject, validateProjects } from '../src/lib/projects';
import { ColorCardRepository } from '../src/storage/color-card-repository';
import { bundledPresetSource, loadPresetCatalog, parsePresetCatalog } from '../src/storage/preset-source';
const options: Options = { width: 3, maxColors: 256, cleanup: false, dithering: false, removeBackground: false };
const raster: Raster = { width: 3, height: 1, data: new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255, 255]) };
function memory() { const slots: (string | null)[] = [null, null]; let fail = false; return { slots, setFail: (value: boolean) => { fail = value; }, read: (s: 0 | 1) => slots[s], write(s: 0 | 1, value: string) { slots[s] = fail ? value.slice(0, 10) : value; if (fail) throw new Error('disk full'); } }; }

test('preset wire contract validates official sample identifiers, RGB and metadata', async () => {
  const catalog = await loadPresetCatalog(bundledPresetSource);
  assert.equal(catalog.cards.length, 10);
  const artkal = catalog.cards[0];
  assert.equal(artkal.colors.length, 24);
  assert.equal(artkal.size, '2.6 mm');
  assert.equal(artkal.colors.find(c => c.code === 'MA4')?.hex, '#ffdf58');
  assert(artkal.sourceUrl.startsWith('https://cdn.shopify.com/'));
  assert.notEqual(artkal.colors, PRESET_CARDS[0].colors);
});
test('invalid remote catalogs reject duplicates, custom collisions, unsafe links and bad colors', async () => {
  const good = await loadPresetCatalog(bundledPresetSource);
  assert.throws(() => parsePresetCatalog({ ...good, schemaVersion: 2 }));
  assert.throws(() => parsePresetCatalog({ ...good, cards: [good.cards[0], good.cards[0]] }));
  assert.throws(() => parsePresetCatalog({ ...good, cards: [customCard(good.cards[0])] }));
  assert.throws(() => parsePresetCatalog({ ...good, cards: [{ ...good.cards[0], sourceUrl: 'javascript:alert(1)' }] }));
  assert.throws(() => parsePresetCatalog({ ...good, cards: [{ ...good.cards[0], colors: [] }] }));
});
test('async source accepts a future API response, propagates errors and ignores cancelled results', async () => {
  const good = await loadPresetCatalog(bundledPresetSource);
  const next = await loadPresetCatalog({ load: async () => ({ ...good, catalogVersion: 'server-v2' }) });
  assert.equal(next.catalogVersion, 'server-v2');
  await assert.rejects(loadPresetCatalog({ load: async () => { throw new Error('offline'); } }), /offline/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(loadPresetCatalog(bundledPresetSource, controller.signal), /取消/);
});
test('custom subset generates only its colors with automatic and reduced color counts', () => {
  const card = customCard(PRESET_CARDS[0]); card.colors = card.colors.filter(c => ['MH2', 'MH7'].includes(c.code));
  validateCustomCards([card]);
  for (const dithering of [false, true]) {
    const pattern = patternWithCard(raster, { ...options, dithering }, card);
    assert.deepEqual(pattern.palette.map(c => c.code), ['MH2', 'MH7']);
    assert(pattern.cells.every(c => c >= 0 && c < 2));
    assert.equal(pattern.total, 3);
    const limited = patternWithCard(raster, { ...options, maxColors: 1, dithering }, card);
    assert.equal(limited.counts.filter(Boolean).length, 1);
  }
  assert.equal(PRESET_CARDS[0].colors.length, 24);
});
test('project snapshot survives color-card modification, disappearance, and JSON reload; old projects load', () => {
  const card = customCard(PRESET_CARDS[0]);
  const project = newProject('色卡快照', patternWithCard(raster, options, card), options);
  card.name = 'changed'; card.colors[0].hex = '#123456'; card.colors.length = 1;
  const restored = validateProjects(JSON.parse(JSON.stringify([project])))[0];
  assert.equal(restored.pattern.palette.length, 24);
  assert.equal(restored.pattern.palette[0].hex, '#ffffff');
  assert.notEqual(restored.pattern.colorCard?.name, 'changed');
  validateProjects([newProject('历史图纸', createPattern(raster, options), options)]);
});
test('custom card storage retains previous snapshot after partial write and supports retry', () => {
  const port = memory(), repo = new ColorCardRepository(port); repo.load();
  const card = customCard(PRESET_CARDS[1]); repo.commit([card]);
  port.setFail(true);
  assert.throws(() => repo.commit([{ ...card, name: 'new', revision: 2 }]));
  assert.equal(repo.cards[0].name, card.name);
  const recovered = new ColorCardRepository(port); assert.equal(recovered.load().recovered, true);
  assert.equal(recovered.cards[0].revision, 1);
  port.setFail(false); recovered.commit([{ ...card, name: 'new', revision: 2 }]);
  const reload = new ColorCardRepository(port); assert.equal(reload.load().cards[0].name, 'new');
});
test('invalid or unreadable custom storage cannot be overwritten as an empty library', () => {
  const port = memory(); port.slots[0] = 'broken';
  const repo = new ColorCardRepository(port); assert.throws(() => repo.load()); assert.throws(() => repo.commit([]));
  assert.throws(() => new ColorCardRepository({ read() { throw new Error('denied'); }, write() { assert.fail(); } }).load());
  assert.throws(() => validateCustomCards([PRESET_CARDS[0]]));
  const card = customCard(); assert.throws(() => validateCustomCards([card]));
});
test('material CSV keeps brand identity and escapes user-provided spreadsheet formulas', () => {
  const card = customCard(PRESET_CARDS[0]); card.name = '=CUSTOM()'; card.brand = '+BRAND';
  const csv = toCSV(patternWithCard(raster, options, card));
  assert(csv.includes('色卡,品牌,系列,尺寸,色卡版本'));
  assert(csv.includes('"\'=CUSTOM()"')); assert(csv.includes('"\'+BRAND"')); assert(csv.includes('"2.6 mm"'));
});

test('user collection starts empty and catalog loading never imports presets', async () => {
  const repo = new ColorCardRepository(memory());
  assert.deepEqual(repo.load().cards, []);
  await loadPresetCatalog(bundledPresetSource);
  assert.deepEqual(repo.cards, []);
});
test('explicit preset addition is deduplicated and snapshots survive catalog changes and restart', () => {
  const port = memory(), repo = new ColorCardRepository(port); repo.load();
  const preset = structuredClone(PRESET_CARDS[0]);
  repo.commit(addPresetToCollection(repo.cards, preset));
  const original = structuredClone(repo.cards);
  preset.colors[0].hex = '#123456'; preset.revision++;
  assert.equal(addPresetToCollection(repo.cards, preset), repo.cards);
  assert.deepEqual(new ColorCardRepository(port).load().cards, original);
  const project = newProject('keep', patternWithCard(raster, options, repo.cards[0]), options);
  repo.commit([]);
  assert.deepEqual(new ColorCardRepository(port).load().cards, []);
  assert.equal(validateProjects([project])[0].pattern.palette[0].hex, original[0].colors[0].hex);
});
test('schema 1 custom cards migrate without enrolling old automatic presets', () => {
  const port = memory(), custom = customCard(PRESET_CARDS[0]);
  port.slots[1] = JSON.stringify({ schema: 1, revision: 1, cards: [custom] });
  const repo = new ColorCardRepository(port);
  assert.deepEqual(repo.load().cards, [custom]);
  repo.commit(addPresetToCollection(repo.cards, PRESET_CARDS[1]));
  assert.equal(JSON.parse(port.slots[0]!).schema, 2);
  const restored = new ColorCardRepository(port).load().cards;
  assert.deepEqual(restored.map(c => c.id), [PRESET_CARDS[1].id, custom.id]);
  assert.throws(() => validateUserCards([custom, custom]));
  assert.throws(() => validateUserCards([{ ...custom, kind: 'preset' }]));
});
test('expanded catalog has traceable distinct datasets and complete known numeric counts', () => {
  const expected = { 'artkal-m-rgb-220': 220, 'artkal-c-rgb-172': 172, 'mard-291-github': 291, 'coco-291': 291, 'manman-278': 278 };
  for (const [id, count] of Object.entries(expected)) {
    const card = PRESET_CARDS.find(c => c.id === id)!;
    assert.equal(parsePalette(card.colors).length, count);
    assert.equal(new Set(card.colors.map(c => c.code)).size, count);
    assert(card.sourceUrl.startsWith('https://'));
  }
  assert(!PRESET_CARDS.find(c => c.id === 'artkal-m-rgb-220')!.colors.some(c => c.code === 'MH1'));
});
test('palettes larger than 256 retain high-index colors through conversion, persistence and CSV', () => {
  const card = customCard();
  card.colors = Array.from({ length: 300 }, (_, i) => ({ code: `X${i}`, name: `X${i}`, hex: `#${i.toString(16).padStart(6, '0')}` }));
  const wideOptions = { ...options, maxColors: MAX_PALETTE_COLORS };
  const image: Raster = { width: 1, height: 1, data: new Uint8ClampedArray([0, 1, 43, 255]) };
  const pattern = patternWithCard(image, wideOptions, card);
  assert(pattern.cells.every(c => c === 299));
  const project = newProject('large', pattern, wideOptions);
  assert.equal(validateProjects(JSON.parse(JSON.stringify([project])))[0].pattern.counts[299], pattern.total);
  assert(toCSV(pattern).includes('X299'));
  const port = memory(), repo = new ColorCardRepository(port); repo.load(); repo.commit([card]);
  assert.equal(new ColorCardRepository(port).load().cards[0].colors.length, 300);
  const allPixels = new Uint8ClampedArray(card.colors.flatMap((_, i) => [0, i >> 8, i & 255, 255]));
  const allPattern = patternWithCard({ width: 150, height: 2, data: allPixels }, { ...wideOptions, width: 150 }, card);
  assert.equal(allPattern.counts.filter(Boolean).length, 300);
});

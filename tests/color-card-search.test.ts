import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRESET_CARDS, customCard } from '../src/lib/color-cards';
import { searchColorCards, searchColors, presetDisplayOrder } from '../src/lib/color-card-search';
const mi = PRESET_CARDS.find(c => c.id === 'mixiaowo-reference-286')!;

test('Moxiaowo aliases, case, fullwidth text and combined brand/code queries find the same card', () => {
  for (const query of ['咪小窝', '咪小窩', '米小窝', 'mixiaowo', 'MXW', 'ｍｘｗ', 'mi xiao wo']) {
    assert.equal(searchColorCards(PRESET_CARDS, query)[0]?.card.id, mi.id, query);
  }
  const found = searchColorCards(PRESET_CARDS, 'mxw 77');
  assert.equal(found.length, 1);
  assert.deepEqual(found[0].matchingColors.map(c => c.code), ['77']);
  assert.equal(found[0].colorQuery, '77');
  assert.deepEqual(searchColors(mi.colors, found[0].colorQuery), found[0].matchingColors);
});
test('color search treats numeric codes as identifiers and also accepts names and HEX', () => {
  const colors = [{ code: '177', name: '177', hex: '#ffeecc' }, { code: '77', name: '77', hex: '#faf5cd' }, { code: '770', name: '柔黄', hex: '#faf500' }];
  assert.deepEqual(searchColors(colors, '77').map(c => c.code), ['77', '770']);
  assert.deepEqual(searchColors(colors, '柔黄').map(c => c.code), ['770']);
  assert.deepEqual(searchColors(colors, 'ＦＡＦ５ＣＤ').map(c => c.code), ['77']);
  assert.equal(searchColors(colors, '#faf5').length, 2);
  assert.deepEqual(searchColors(colors, '77 177'), []);
  assert.equal(searchColors(colors, '  ').length, colors.length);
});
test('brand filter combines with search, clearing restores results, search does not alter collection', () => {
  const original = PRESET_CARDS.map(c => c.id);
  const matches = searchColorCards(PRESET_CARDS, '77', '咪小窝');
  assert.equal(matches.length, 1);
  assert.equal(searchColorCards(PRESET_CARDS, 'coco', '咪小窝').length, 0);
  assert.equal(searchColorCards(PRESET_CARDS, '').length, PRESET_CARDS.length);
  assert.equal(presetDisplayOrder(PRESET_CARDS)[0].id, mi.id);
  assert.deepEqual(PRESET_CARDS.map(c => c.id), original);
  assert.deepEqual(searchColorCards([], '咪小窝'), []);
  const owned = customCard(mi); owned.name = '我的小猫配色'; owned.colors = owned.colors.slice(0, 3);
  assert.equal(searchColorCards([owned], '小猫')[0]?.card.id, owned.id);
  assert.deepEqual(searchColorCards([owned], 'not-found'), []);
});
test('new brand reference cards exclude placeholders and preserve known color codes', () => {
  const pan = PRESET_CARDS.find(c => c.id === 'panpan-reference-285')!;
  assert.equal(mi.colors.length, 286); assert.equal(pan.colors.length, 285);
  for (const card of [mi, pan]) {
    assert(card.colors.every(c => !c.code.includes('UNKNOWN') && c.code !== '-'));
    assert.equal(new Set(card.colors.map(c => c.code)).size, card.colors.length);
    assert(card.source.includes('非品牌官方'));
    assert.equal(card.size, '');
  }
  assert.equal(mi.colors.find(c => c.code === '77')?.hex, '#faf5cd');
  assert.equal(pan.colors.find(c => c.code === '65')?.hex, '#faf5cd');
  assert.equal(searchColors(mi.colors, 'zg1')[0]?.code, 'ZG1');
});

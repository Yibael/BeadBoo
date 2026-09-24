import { DEMO_PALETTE, parsePalette, type Color, type Options, type Pattern, type Raster, createPattern } from './pattern';
import expandedPresets from './presets/catalog.json';
import artkalSample from './artkal-m-sample.json';

export type ColorCardInfo = {
  id: string; name: string; kind: 'preset' | 'custom'; revision: number;
  brand: string; series: string; size: string; description: string;
  source: string; sourceUrl: string;
};
export type ColorCard = ColorCardInfo & { colors: Color[] };
export const PRESET_CARDS: ColorCard[] = [
  { id: 'artkal-m-sample', name: 'Artkal M 系列', kind: 'preset', revision: 1,
    brand: 'Artkal', series: 'M', size: '2.6 mm',
    description: '选取 24 色供体验，不代表品牌完整色卡或销售套装。',
    source: 'Artkal 官方 M 系列 RGB 表（2025），应用选取部分颜色；名称沿用色号。',
    sourceUrl: 'https://cdn.shopify.com/s/files/1/1323/8195/files/M_MINI_Beads_RGB_Color_Chart_2025.pdf?v=1760661747', colors: artkalSample },
  { id: 'demo-36', name: '基础 36 色', kind: 'preset', revision: 1, brand: '', series: '', size: '',
    description: '示例色卡，D 编号不对应品牌拼豆。', source: '应用示例配色', sourceUrl: '', colors: DEMO_PALETTE },
  { id: 'demo-gray', name: '黑白灰', kind: 'preset', revision: 1, brand: '', series: '', size: '',
    description: '4 色示例，适合体验单色图案；D 编号不对应品牌拼豆。', source: '应用示例配色', sourceUrl: '',
    colors: DEMO_PALETTE.filter(c => ['D02', 'D04', 'D05', 'D06'].includes(c.code)) },
  ...expandedPresets as ColorCard[],
];
export function cardInfo(card: ColorCard): ColorCardInfo {
  const { colors: _, ...info } = card;
  return { ...info };
}
export function validateCardInfo(value: unknown): asserts value is ColorCardInfo {
  const c = value as ColorCardInfo;
  if (!c || typeof c.id !== 'string' || !/^[a-z0-9-]{1,100}$/.test(c.id)
    || !['preset', 'custom'].includes(c.kind) || !Number.isSafeInteger(c.revision) || c.revision < 1
    || typeof c.name !== 'string' || !c.name.trim() || c.name.length > 80
    || ['brand', 'series', 'size', 'description', 'source', 'sourceUrl'].some(k => typeof c[k as keyof ColorCardInfo] !== 'string' || String(c[k as keyof ColorCardInfo]).length > 1000)) throw new Error('色卡信息无效');
}
export function validateCustomCards(value: unknown): ColorCard[] {
  if (!Array.isArray(value)) throw new Error('色卡列表格式无效');
  const ids = new Set<string>();
  for (const c of value as ColorCard[]) {
    validateCardInfo(c);
    if (c.kind !== 'custom' || !c.id.startsWith('custom-') || ids.has(c.id)) throw new Error('自定义色卡编号无效');
    ids.add(c.id); parsePalette(c.colors);
  }
  return value as ColorCard[];
}
export function customCard(base?: ColorCard): ColorCard {
  return { id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`, name: base ? `${base.name} · 副本`.slice(0, 80) : '我的色卡', kind: 'custom', revision: 1,
    brand: base?.brand ?? '', series: base?.series ?? '', size: base?.size ?? '',
    description: '自定义色卡', source: base ? `由「${base.name}」复制，可自行调整。${base.source}`.slice(0, 1000) : '用户自定义',
    sourceUrl: base?.sourceUrl ?? '', colors: base?.colors.map(c => ({ ...c })) ?? [] };
}
export function patternWithCard(image: Raster, options: Options, card: ColorCard): Pattern {
  return { ...createPattern(image, options, card.colors), colorCard: cardInfo(card) };
}
export function cardCaption(card: ColorCardInfo) {
  return [card.kind === 'custom' ? '自定义' : card.brand || '示例', card.series ? `${card.series} 系列` : '', card.size].filter(Boolean).join(' · ');
}

// User collection is independent from the catalog. Persist complete selected snapshots.
export function validateUserCards(value: unknown): ColorCard[] {
  if (!Array.isArray(value)) throw new Error('色卡列表格式无效');
  const ids = new Set<string>();
  for (const c of value as ColorCard[]) {
    validateCardInfo(c);
    if ((c.kind === 'custom') !== c.id.startsWith('custom-') || ids.has(c.id)) throw new Error('色卡编号无效');
    if (c.sourceUrl && !/^https:\/\//i.test(c.sourceUrl)) throw new Error('色卡来源地址无效');
    ids.add(c.id); parsePalette(c.colors);
  }
  return value as ColorCard[];
}
export function addPresetToCollection(cards: ColorCard[], preset: ColorCard): ColorCard[] {
  if (preset.kind !== 'preset') throw new Error('请选择预设色卡');
  validateUserCards([preset]);
  if (cards.some(c => c.id === preset.id)) return cards;
  return [{ ...preset, colors: preset.colors.map(c => ({ ...c })) }, ...cards];
}
export function cardSourceLabel(card: ColorCardInfo) {
  return card.kind === 'custom' ? '自定义' : !card.brand ? '示例' : card.brand === 'Artkal' && card.sourceUrl.startsWith('https://cdn.shopify.com/') ? '官方 RGB 数据' : '社区参考';
}

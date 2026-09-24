import { PRESET_CARDS, validateCardInfo, type ColorCard } from '../lib/color-cards';
import { parsePalette } from '../lib/pattern';

// Stable wire contract. A later HTTP adapter can implement load with fetch + signal.
// Screens consume the provider, never bundled data or an API endpoint directly.
export type PresetCatalog = { schemaVersion: 1; catalogVersion: string; cards: ColorCard[] };
export interface PresetCardSource { load(signal?: AbortSignal): Promise<unknown> }
export function parsePresetCatalog(value: unknown): PresetCatalog {
  const catalog = value as PresetCatalog;
  if (!catalog || catalog.schemaVersion !== 1 || typeof catalog.catalogVersion !== 'string' || !catalog.catalogVersion.trim()
    || catalog.catalogVersion.length > 100 || !Array.isArray(catalog.cards) || !catalog.cards.length) throw new Error('预设色卡目录格式无效');
  const ids = new Set<string>();
  const cards = catalog.cards.map(card => {
    validateCardInfo(card);
    if (card.kind !== 'preset' || card.id.startsWith('custom-') || ids.has(card.id)) throw new Error('预设色卡编号无效');
    if (card.sourceUrl && !/^https:\/\//i.test(card.sourceUrl)) throw new Error('色卡来源地址无效');
    ids.add(card.id);
    return { ...card, colors: parsePalette(card.colors) };
  });
  return { schemaVersion: 1, catalogVersion: catalog.catalogVersion, cards };
}
export async function loadPresetCatalog(source: PresetCardSource, signal?: AbortSignal) {
  const result = await source.load(signal);
  if (signal?.aborted) throw new Error('色卡加载已取消');
  return parsePresetCatalog(result);
}
export const bundledPresetSource: PresetCardSource = {
  async load() { return { schemaVersion: 1, catalogVersion: '2026-09-13.1', cards: PRESET_CARDS }; },
};

import { cardSourceLabel, type ColorCard } from './color-cards';
import type { Color } from './pattern';

const aliases: Record<string, string[]> = {
  '咪小窝': ['咪小窩', '米小窝', 'mixiaowo', 'mxw'],
  '盼盼': ['盼盼家', 'panpan', 'pp'],
  '漫漫': ['漫漫家', '慢慢', 'manman', 'mm'],
  'COCO': ['可可'],
  'Artkal': ['优肯', '優肯'],
};
const normalize = (value: string) => value.normalize('NFKC').trim().toLowerCase();
const tokens = (query: string) => normalize(query).split(/\s+/).filter(Boolean);
function matchesColor(color: Color, term: string) {
  const code = normalize(color.code), name = normalize(color.name);
  if (term.startsWith('#') || /^[a-f0-9]{6}$/.test(term)) return color.hex.toLowerCase().startsWith(term.startsWith('#') ? term : `#${term}`);
  return code.startsWith(term) || name !== code && name.includes(term);
}
export function searchColors(colors: Color[], query: string) {
  const terms = tokens(query);
  const result = colors.filter(c => terms.every(t => matchesColor(c, t)));
  if (!terms.length) return result;
  // Numeric bead codes are identifiers: searching 77 must not match 177.
  const exact = (c: Color) => terms.some(t => normalize(c.code) === t) ? 0 : 1;
  return result.sort((a, b) => exact(a) - exact(b));
}
export type CardSearchResult = { card: ColorCard; matchingColors: Color[]; colorQuery: string };
export function searchColorCards(cards: ColorCard[], query: string, brand = ''): CardSearchResult[] {
  const terms = tokens(query);
  const results: CardSearchResult[] = [];
  for (const card of cards) {
    if (brand && card.brand !== brand) continue;
    const metadata = normalize([card.name, card.brand, card.series, card.size, cardSourceLabel(card), ...(aliases[card.brand] ?? [])].join(' '));
    const colorTerms = terms.filter(t => !metadata.includes(t));
    const matchingColors = colorTerms.length ? searchColors(card.colors, colorTerms.join(' ')) : [];
    if (!colorTerms.length || matchingColors.length) results.push({ card, matchingColors, colorQuery: colorTerms.join(' ') });
  }
  return results;
}
export function presetDisplayOrder(cards: ColorCard[]) {
  const rank = (c: ColorCard) => !c.brand || c.id.endsWith('-sample') ? 2 : c.brand === '咪小窝' ? 0 : 1;
  return [...cards].sort((a, b) => rank(a) - rank(b));
}

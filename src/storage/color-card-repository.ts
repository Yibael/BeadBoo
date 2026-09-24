import { validateCustomCards, validateUserCards, type ColorCard } from '../lib/color-cards';
import type { StoragePort } from './repository';
type Snapshot = { schema: 1 | 2; revision: number; cards: ColorCard[] };
export class ColorCardRepository {
  private revision = 0;
  private ready = false;
  cards: ColorCard[] = [];
  constructor(private storage: StoragePort) {}
  load() {
    const valid: Snapshot[] = []; let recovered = false;
    for (const slot of [0, 1] as const) {
      const raw = this.storage.read(slot);
      if (raw === null) continue;
      try {
        const s = JSON.parse(raw) as Snapshot;
        if (![1, 2].includes(s.schema) || !Number.isSafeInteger(s.revision) || s.revision < 1) throw new Error();
        (s.schema === 1 ? validateCustomCards : validateUserCards)(s.cards); valid.push(s);
      } catch { recovered = true; }
    }
    if (recovered && !valid.length) throw new Error('色卡暂时无法读取，原始记录已保留。');
    const s = valid.sort((a, b) => b.revision - a.revision)[0];
    this.cards = s?.cards ?? []; this.revision = s?.revision ?? 0; this.ready = true;
    return { cards: this.cards, recovered };
  }
  commit(cards: ColorCard[]) {
    if (!this.ready) throw new Error('请先读取色卡');
    validateUserCards(cards);
    const revision = this.revision + 1;
    this.storage.write((revision % 2) as 0 | 1, JSON.stringify({ schema: 2, revision, cards }));
    this.revision = revision; this.cards = cards;
  }
}

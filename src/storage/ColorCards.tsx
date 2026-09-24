import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { PRESET_CARDS, addPresetToCollection, validateUserCards, type ColorCard } from '../lib/color-cards';
import { AsyncRepository, browserStorage } from '../web/storage';
import { bundledPresetSource, loadPresetCatalog, type PresetCardSource } from './preset-source';
type Library = { cards: ColorCard[]; presets: ColorCard[]; addPreset: (card: ColorCard) => Promise<ColorCard | null>; remove: (id: string) => Promise<boolean>; ready: boolean; error: string; reload: () => void; save: (card: ColorCard) => Promise<boolean>;
  presetsLoading: boolean; presetError: string; catalogVersion: string; refreshPresets: () => void };
const Context = createContext<Library | null>(null);
export function ColorCardsProvider({ children, presetSource = bundledPresetSource }: PropsWithChildren<{ presetSource?: PresetCardSource }>) {
  const repo = useRef(new AsyncRepository(browserStorage('cards'), validateUserCards));
  const [custom, setCustom] = useState<ColorCard[]>([]), [ready, setReady] = useState(false), [error, setError] = useState('');
  const [presets, setPresets] = useState(PRESET_CARDS), [catalogVersion, setCatalogVersion] = useState('bundled-fallback');
  const [presetsLoading, setPresetsLoading] = useState(true), [presetError, setPresetError] = useState(''), [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setPresetsLoading(true); setPresetError('');
    void loadPresetCatalog(presetSource, controller.signal).then(catalog => {
      if (!controller.signal.aborted) { setPresets(catalog.cards); setCatalogVersion(catalog.catalogVersion); }
    }).catch(() => {
      if (!controller.signal.aborted) setPresetError('预设色卡暂时无法更新，仍可使用当前色卡。');
    }).finally(() => { if (!controller.signal.aborted) setPresetsLoading(false); });
    return () => controller.abort();
  }, [presetSource, refresh]);
  async function reload() {
    try { const result = await repo.current.load(); setCustom(result.items); setReady(true); setError(result.recovered ? '已恢复上一份有效色卡记录，请检查最近的修改。' : ''); }
    catch (e) { setError(e instanceof Error ? e.message : '色卡读取失败，请重试。'); }
  }
  useEffect(() => { void reload(); }, []);
  const writing=useRef(false); const [saving,setSaving]=useState(false);
  async function save(card: ColorCard) {
    if(writing.current)return false;
    writing.current=true;setSaving(true);
    try {
      const next = [card, ...repo.current.items.filter(c => c.id !== card.id)];
      await repo.current.commit(next); setCustom(next); setError(''); return true;
    } catch { setError('色卡未保存，请检查设备空间后重试。'); return false; } finally { writing.current=false;setSaving(false); }
  }
  async function addPreset(card: ColorCard) {
    if(writing.current)return null;
    writing.current=true;setSaving(true);
    try {
      const next = addPresetToCollection(repo.current.items, card);
      if (next !== repo.current.items) { await repo.current.commit(next); setCustom(next); }
      setError(''); return next.find(c => c.id === card.id)!;
    } catch { setError('色卡未添加，请检查设备空间后重试。'); return null; } finally { writing.current=false;setSaving(false); }
  }
  async function remove(id: string) {
    if(writing.current)return false;
    writing.current=true;setSaving(true);
    try { const next = repo.current.items.filter(c => c.id !== id); await repo.current.commit(next); setCustom(next); setError(''); return true; }
    catch { setError('色卡未移除，请重试。'); return false; } finally { writing.current=false;setSaving(false); }
  }
  return <Context.Provider value={{ cards: custom, presets, addPreset, remove, ready: ready && !saving, error, reload, save, presetsLoading, presetError, catalogVersion, refreshPresets: () => setRefresh(n => n + 1) }}>{children}</Context.Provider>;
}
export function useColorCards() { const value = useContext(Context); if (!value) throw new Error('Missing ColorCardsProvider'); return value; }

import dataLicense from '../lib/presets/license.json';
import { useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cardCaption, cardSourceLabel, customCard, type ColorCard } from '../lib/color-cards';
import { MAX_PALETTE_COLORS, parsePalette, type Color } from '../lib/pattern';
import { presetDisplayOrder, searchColorCards, searchColors } from '../lib/color-card-search';
import { useColorCards } from '../storage/ColorCards';
import { Button, FullScreenModal, IconButton, Notice, Sheet, colors, ui } from './UI';

export function ColorCardLibrary({ selectedId, onSelect }: { selectedId?: string; onSelect?: (card: ColorCard) => void }) {
  const library = useColorCards();
  const [detail, setDetail] = useState<ColorCard | null>(null), [draft, setDraft] = useState<ColorCard | null>(null);
  const [linkError, setLinkError] = useState('');
  const [browse, setBrowse] = useState<'mine' | 'add' | 'presets'>('mine');
  const [mineQuery, setMineQuery] = useState(''), [presetQuery, setPresetQuery] = useState(''), [brand, setBrand] = useState('');
  const [detailQuery, setDetailQuery] = useState(''), [showSource, setShowSource] = useState(false);
  const [detailSearchFocused, setDetailSearchFocused] = useState(false);
  const query = browse === 'presets' ? presetQuery : mineQuery;
  const setQuery = browse === 'presets' ? setPresetQuery : setMineQuery;
  const [removing, setRemoving] = useState(false), [showLicense, setShowLicense] = useState(false);
  const sourceCards = browse === 'presets' ? presetDisplayOrder(library.presets) : library.cards;
  const listed = searchColorCards(sourceCards, query, browse === 'presets' ? brand : '');
  const brands = [...new Set(presetDisplayOrder(library.presets).map(c => c.brand).filter(Boolean))];
  const detailColors = detail ? searchColors(detail.colors, detailQuery) : [];
  const detailOwned = detail ? library.cards.some(c => c.id === detail.id) : false;
  function showDetail(card: ColorCard, colorQuery = '') { Keyboard.dismiss(); setDetailSearchFocused(false); setDetail(card); setDetailQuery(colorQuery); setShowSource(false); setLinkError(''); setRemoving(false); setShowLicense(false); }
  async function add(card: ColorCard) { const saved = await library.addPreset(card); if (saved) { onSelect?.(saved); setDetail(null); setMineQuery(''); setBrowse('mine'); } }
  const pendingEditor = useRef<ColorCard | null>(null);
  function edit(card: ColorCard) {
    if (Platform.OS === 'ios') pendingEditor.current = card;
    else setDraft(card);
    setDetail(null);
  }
  return <View style={{ gap: 12 }}>
    {browse !== 'mine' && <Button label="返回我的色卡" onPress={() => setBrowse('mine')} />}
    {browse === 'add' && <><Text style={s.heading}>添加色卡</Text><Button label="品牌预设" onPress={() => { setPresetQuery(''); setBrand(''); setBrowse('presets'); }} /><Text style={ui.note}>选择品牌色表，查看颜色和数据来源后添加。</Text><Button label="自定义色卡" onPress={() => setDraft(customCard())} /><Text style={ui.note}>自己添加颜色，也可以从预设复制后调整。</Text></>}
    {browse === 'presets' && <><Text style={s.heading}>预设色卡</Text><Text style={ui.note}>添加后才会出现在我的色卡中。</Text></>}
    {browse !== 'add' && (browse === 'presets' || library.cards.length > 0) && <>
      <SearchField label={browse === 'presets' ? '搜索预设色卡' : '搜索我的色卡'} value={query} onChangeText={setQuery} placeholder="品牌、系列、名称或色号" />
      {browse === 'presets' && <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8 }}>
        {['', ...brands].map(item => <Pressable key={item || 'all'} accessibilityRole="button" accessibilityLabel={item ? `筛选${item}` : '全部品牌'} accessibilityState={{ selected: brand === item }} style={[ui.choice, { minHeight: 44, justifyContent: 'center' }, brand === item && ui.selected]} onPress={() => { setBrand(item); Keyboard.dismiss(); }}><Text style={ui.text}>{item || '全部品牌'}</Text></Pressable>)}
      </ScrollView>}
      <Text style={ui.note}>{query.trim() || browse === 'presets' && brand ? `找到 ${listed.length} 张色卡` : `${listed.length} 张色卡`}{browse === 'presets' && library.presetsLoading ? ' · 正在更新…' : ''}</Text>
    </>}
    {browse === 'presets' && library.presetError ? <View><Notice text={library.presetError} /><Button label="重试更新预设" disabled={library.presetsLoading} onPress={library.refreshPresets} /></View> : null}
    {library.error ? <View><Notice text={library.error} /><Button label="重新读取色卡" onPress={library.reload} /></View> : null}
    {browse === 'mine' && <Text style={ui.note}>只显示你添加的色卡。</Text>}
    {browse === 'mine' && <Button label="添加色卡" icon="plus" disabled={!library.ready} onPress={() => setBrowse('add')} />}
    {browse === 'mine' && library.ready && !library.cards.length && <View style={ui.card}><Text style={s.cardTitle}>还没有色卡</Text><Text style={[ui.note, { marginTop: 8 }]}>添加一张品牌预设，或创建自己的色卡。</Text></View>}
    {browse !== 'add' && !listed.length && (query.trim() || browse === 'presets') && <View style={{ gap: 8 }}><Notice text={browse === 'mine' ? '我的色卡中没有匹配项，可以到预设目录查找。' : '没有匹配的色卡，试试品牌名称或包装上的色号。'} /><Button label="清除搜索与筛选" onPress={() => { setQuery(''); setBrand(''); Keyboard.dismiss(); }} />{browse === 'mine' && <Button label="到预设中查找" onPress={() => { setPresetQuery(mineQuery); setBrand(''); Keyboard.dismiss(); setBrowse('presets'); }} />}</View>}
    {browse !== 'add' && listed.map(({ card, matchingColors, colorQuery }) => <View key={card.id} style={[ui.card, s.card, selectedId === card.id && ui.selected]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${onSelect && browse === 'mine' ? '使用' : '查看'}${card.name}，${card.colors.length} 色`} accessibilityState={{ selected: selectedId === card.id }}
        onPress={() => onSelect && browse === 'mine' ? onSelect(card) : showDetail(card, colorQuery)} style={{ gap: 7 }}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}><Text style={s.cardTitle} numberOfLines={2}>{card.name}</Text><Text style={[ui.note, { flexShrink: 0 }]}>{browse === 'presets' && library.cards.some(c => c.id === card.id) ? '已添加 · ' : selectedId === card.id ? '✓ ' : ''}{card.colors.length} 色</Text></View>
        <Text style={ui.note}>{cardCaption(card)}{card.kind === 'preset' && card.brand ? ` · ${cardSourceLabel(card)}` : ''}{card.id === 'artkal-m-sample' ? ' · 部分颜色' : ''}</Text>
        <View style={s.swatches}>{(matchingColors.length ? matchingColors : card.colors).slice(0, 16).map(c => <View key={c.code} style={[s.dot, { backgroundColor: c.hex }]} />)}</View>
        {matchingColors.length > 0 && <Text style={ui.note} numberOfLines={2}>匹配色号：{matchingColors.slice(0, 6).map(c => c.code).join('、')}{matchingColors.length > 6 ? ` 等 ${matchingColors.length} 色` : ''}</Text>}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`${card.name}色卡详情`} onPress={() => showDetail(card, colorQuery)} style={s.detailButton}><Text style={s.link}>{matchingColors.length ? '查看匹配颜色' : '查看颜色与来源'}</Text></Pressable>
    </View>)}
    <Sheet visible={!!detail} title={detail?.name ?? '色卡详情'} onClose={() => setDetail(null)}
      onDismiss={() => { if (pendingEditor.current) { setDraft(pendingEditor.current); pendingEditor.current = null; } }}
      footer={detail && (detailSearchFocused ? <Button compact label="完成查找" onPress={() => { Keyboard.dismiss(); setDetailSearchFocused(false); }} /> : <>
        {!detailOwned && <Button label={onSelect ? '添加并使用' : '添加到我的色卡'} primary disabled={!library.ready} onPress={() => add(detail)} />}
        {onSelect && detailOwned && <Button label="使用这张色卡" primary onPress={() => { onSelect(library.cards.find(c => c.id === detail.id)!); setDetail(null); setBrowse('mine'); }} />}
        {detail.kind === 'custom' && <Button label="编辑色卡" disabled={!library.ready} onPress={() => edit({ ...detail, colors: detail.colors.map(c => ({ ...c })) })} />}
        <Button label="复制为自定义色卡" disabled={!library.ready} onPress={() => edit(customCard(detail))} />
        {detailOwned && (removing ? <><Text style={ui.note}>从我的色卡移除？已有图纸和拼制进度会保留。{detail.kind === 'custom' ? '自定义色卡移除后无法恢复。' : '以后可从预设目录重新添加。'}</Text><View style={ui.row}><Button label="取消" onPress={() => setRemoving(false)} /><Button label="确认移除" disabled={!library.ready} onPress={async () => { if (await library.remove(detail.id)) setDetail(null); }} /></View></> : <Button label="从我的色卡移除" disabled={!library.ready} onPress={() => setRemoving(true)} />)}
        {library.error ? <Notice text={library.error} /> : null}
      </>)}>
      {detail && <>
        {!detailSearchFocused && <Text style={ui.text}>{cardCaption(detail)} · {detail.colors.length} 色</Text>}
        <View style={{ marginVertical: 12 }}><SearchField label="查找色卡内颜色" value={detailQuery} onChangeText={setDetailQuery} placeholder="输入色号、名称或 HEX" onFocus={() => setDetailSearchFocused(true)} onBlur={() => setDetailSearchFocused(false)} /></View>
        <Text style={ui.note}>{detailQuery.trim() ? `找到 ${detailColors.length} / ${detail.colors.length} 色` : `全部 ${detail.colors.length} 色`}</Text>
        {!detailSearchFocused && <Notice text={detail.description} />}
        {!detailSearchFocused && <Pressable accessibilityRole="button" accessibilityState={{ expanded: showSource }} style={s.detailButton} onPress={() => setShowSource(!showSource)}><Text style={s.link}>{showSource ? '收起来源说明' : '数据来源与许可'}</Text></Pressable>}
        {showSource && !detailSearchFocused && <><Text style={ui.note}>{detail.source} · 色卡版本 {detail.revision}</Text>
        {detail.sourceUrl ? <Pressable accessibilityRole="link" accessibilityLabel="打开色卡原始来源" style={s.detailButton} onPress={() => { void Linking.openURL(detail.sourceUrl).catch(() => setLinkError('无法打开来源，请稍后重试。')); }}><Text style={s.link}>查看原始来源 ↗</Text></Pressable> : null}
        {linkError ? <Notice text={linkError} /> : null}
        {detail.source.includes('HansBug') && <><Pressable accessibilityRole="button" style={s.detailButton} onPress={() => setShowLicense(!showLicense)}><Text style={s.link}>{showLicense ? '收起数据许可' : '数据许可 · MIT'}</Text></Pressable>{showLicense && <Text style={ui.note}>{dataLicense}</Text>}</>}
        </>}
        {!detailColors.length && <Notice text="这张色卡中没有匹配颜色，请检查色号或清除搜索。" />}
        <View style={[s.colorGrid, { marginVertical: 16 }]}>{detailColors.map(c => <View key={c.code} accessible accessibilityLabel={`${c.code} ${c.name} ${c.hex}`} style={s.colorTile}><View style={[s.colorSquare, { backgroundColor: c.hex }]} /><Text style={ui.note}>{c.code}</Text>{c.name !== c.code && <Text style={ui.note} numberOfLines={2}>{c.name}</Text>}</View>)}</View>
      </>}
    </Sheet>
    {draft && <ColorCardEditor key={draft.id} initial={draft} onClose={() => setDraft(null)} onSaved={card => { onSelect?.(card); setDraft(null); setMineQuery(''); setBrowse('mine'); }} />}
  </View>;
}

function SearchField({ label, value, onChangeText, placeholder, onFocus, onBlur }: { label: string; value: string; onChangeText: (text: string) => void; placeholder: string; onFocus?: () => void; onBlur?: () => void }) {
  return <View style={[s.input, { flexDirection: 'row', alignItems: 'center', paddingVertical: 0, paddingRight: 0 }]}>
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder} autoCorrect={false} autoCapitalize="none" maxLength={100} returnKeyType="search" onSubmitEditing={Keyboard.dismiss} onFocus={onFocus} onBlur={onBlur} style={{ flex: 1, minHeight: 46, color: colors.ink, fontSize: 14 }} />
    {!!value && <IconButton icon="close" label={`清除${label}`} onPress={() => onChangeText('')} />}
  </View>;
}

function ColorCardEditor({ initial, onClose, onSaved }: { initial: ColorCard; onClose: () => void; onSaved: (card: ColorCard) => void }) {
  const library = useColorCards();
  const [name, setName] = useState(initial.name), [brand, setBrand] = useState(initial.brand), [series, setSeries] = useState(initial.series), [size, setSize] = useState(initial.size);
  const [items, setItems] = useState(initial.colors), [selected, setSelected] = useState(new Set(initial.colors.map(c => c.code)));
  const [error, setError] = useState(''), [info, setInfo] = useState(false), [discard, setDiscard] = useState(false), [dirty, setDirty] = useState(false);
  const [color, setColor] = useState<Color | null>(null), [editCode, setEditCode] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const referenceHex = color ? `#${color.hex.trim().replace(/^#/, '')}` : '';
  const selectedColors = items.filter(c => selected.has(c.code));
  function close() { if (color) { setColor(null); setError(''); } else if (dirty) setDiscard(true); else onClose(); }
  function saveColor() {
    if (!color) return;
    try {
      const normalized = { code: color.code.trim(), name: color.name.trim() || color.code.trim(), hex: referenceHex };
      parsePalette([...items.filter(c => c.code !== editCode), normalized]);
      setItems(editCode ? items.map(c => c.code === editCode ? normalized : c) : [...items, normalized]);
      setSelected(old => { const next = new Set(old); if (editCode) next.delete(editCode); if (!editCode || old.has(editCode)) next.add(normalized.code); return next; });
      Keyboard.dismiss(); setColor(null); setDirty(true); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : '请检查颜色信息。'); }
  }
  async function save() {
    try {
      if (!name.trim()) throw new Error('请输入色卡名称。');
      const card = { ...initial, name: name.trim(), brand: brand.trim(), series: series.trim(), size: size.trim(), colors: parsePalette(selectedColors),
        revision: library.cards.some(c => c.id === initial.id) ? initial.revision + 1 : 1 };
      if (await library.save(card)) onSaved(card);
    } catch (e) { setError(e instanceof Error ? e.message : '请检查色卡信息。'); }
  }
  return <FullScreenModal onClose={close}>
    <SafeAreaView style={s.modal}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}><IconButton icon="back" label={color ? '返回色卡编辑' : '关闭色卡编辑'} onPress={close} /><Text style={s.heading}>{color ? (editCode ? '编辑颜色' : '添加颜色') : '自定义色卡'}</Text><View style={{ width: 44 }} /></View>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ padding: 20, gap: 12 }}>
          {error ? <Notice text={error} /> : null}{library.error ? <Notice text={library.error} /> : null}
          {color ? <>
            <View style={[s.colorPreview, { backgroundColor: /^#[0-9a-f]{6}$/i.test(referenceHex) ? referenceHex : '#e3e6eb' }]} />
            <Field label="色号" value={color.code} onChangeText={code => setColor({ ...color, code })} maxLength={8} placeholder="例如 A01" />
            <Field label="颜色名称" value={color.name} onChangeText={name => setColor({ ...color, name })} maxLength={40} placeholder="可选，默认使用色号" />
            <Field label="参考颜色" value={color.hex} onChangeText={hex => setColor({ ...color, hex })} maxLength={7} placeholder="#RRGGBB，可省略 #" />
            <Text style={ui.note}>参考颜色用于图纸匹配与预览，名称和色号用于识别豆子。</Text>
          </> : <>
            <Field label="色卡名称" value={name} onChangeText={v => { setName(v); setDirty(true); }} maxLength={80} />
            <Pressable accessibilityRole="button" onPress={() => setInfo(!info)} style={s.detailButton}><Text style={s.link}>{info ? '收起品牌信息' : '品牌、系列与尺寸（选填）'}</Text></Pressable>
            {info && <><Field label="品牌" value={brand} onChangeText={v => { setBrand(v); setDirty(true); }} /><Field label="系列" value={series} onChangeText={v => { setSeries(v); setDirty(true); }} /><Field label="尺寸" value={size} onChangeText={v => { setSize(v); setDirty(true); }} placeholder="例如 2.6 mm" /></>}
            <View style={[ui.row, { justifyContent: 'space-between' }]}><Text style={ui.text}>已选 {selectedColors.length} 色</Text><Pressable accessibilityRole="button" style={s.detailButton} onPress={() => { setSelected(new Set(selected.size === items.length ? [] : items.map(c => c.code))); setDirty(true); }}><Text style={s.link}>{selected.size === items.length && items.length ? '取消全选' : '全选'}</Text></Pressable></View>
            {items.length > 0 && <View style={ui.row}>{[false, true].map(mode => <Pressable key={String(mode)} accessibilityRole="button" accessibilityLabel={mode ? '修改颜色信息' : '选择保留的颜色'} accessibilityState={{ selected: editMode === mode }} onPress={() => setEditMode(mode)} style={[ui.choice, { flex: 1 }, editMode === mode && ui.selected]}><Text style={ui.text}>{mode ? '修改颜色' : '选择颜色'}</Text></Pressable>)}</View>}
            <Text style={ui.note}>{items.length ? editMode ? '轻点颜色，修改色号、名称与参考色。' : '轻点保留或移除颜色，勾选的颜色将存入色卡。' : '添加第一种颜色，或返回后复制一张预设色卡。'}</Text>
            <View style={s.colorGrid}>{items.map(c => <Pressable key={c.code} accessibilityRole={editMode ? 'button' : 'checkbox'} accessibilityLabel={`${editMode ? '修改 ' : ''}${c.code} ${c.name}`} accessibilityState={editMode ? {} : { checked: selected.has(c.code) }}
              onPress={() => { if (editMode) { setEditCode(c.code); setColor({ ...c }); setError(''); return; } setSelected(old => { const next = new Set(old); if (next.has(c.code)) next.delete(c.code); else next.add(c.code); return next; }); setDirty(true); }}
              onLongPress={() => { setEditCode(c.code); setColor({ ...c }); setError(''); }} style={[s.colorTile, s.checkTile, selected.has(c.code) && ui.selected]}>
              <View style={[s.colorSquare, { backgroundColor: c.hex }]} /><Text style={ui.note}>{c.code}</Text><Text style={s.link}>{editMode ? '修改' : selected.has(c.code) ? '✓' : '—'}</Text>
            </Pressable>)}</View>
            <Button label="添加颜色" icon="plus" disabled={items.length >= MAX_PALETTE_COLORS} onPress={() => { setEditCode(null); setColor({ code: '', name: '', hex: '#' }); setError(''); }} />
          </>}
        </ScrollView>
        <View style={s.footer}><Button primary label={color ? '确认颜色' : '保存色卡'} disabled={!library.ready || !color && !selectedColors.length} onPress={color ? saveColor : save} /></View>
      </KeyboardAvoidingView>
      <Sheet visible={discard} title="放弃色卡修改？" onClose={() => setDiscard(false)}><View style={{ gap: 12 }}><Button primary label="继续编辑色卡" onPress={() => setDiscard(false)} /><Button label="放弃修改" onPress={onClose} /></View></Sheet>
    </SafeAreaView>
  </FullScreenModal>;
}
function Field({ label, ...props }: { label: string; value: string; onChangeText: (v: string) => void; maxLength?: number; placeholder?: string }) {
  return <View><Text style={[ui.label, { marginBottom: 6 }]}>{label}</Text><TextInput accessibilityLabel={label} autoCorrect={false} autoCapitalize="none" returnKeyType="done" maxLength={80} {...props} style={s.input} /></View>;
}
const s = StyleSheet.create({
  card: { paddingVertical: 12 }, cardTitle: { fontSize: 16, fontWeight: '600', color: colors.ink, flexShrink: 1 },
  swatches: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' }, dot: { width: 15, height: 15, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: '#00000022' },
  detailButton: { minHeight: 44, justifyContent: 'center' }, link: { fontSize: 12, color: colors.accent }, colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  colorTile: { width: 61, alignItems: 'center', paddingVertical: 7, gap: 4 }, checkTile: { borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  colorSquare: { width: 32, height: 32, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: '#00000033' },
  modal: { flex: 1, backgroundColor: colors.background }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, minHeight: 52 }, heading: { color: colors.ink, fontSize: 18, fontWeight: '600' },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.background },
  input: { minHeight: 48, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, fontSize: 15, color: colors.ink },
  colorPreview: { width: 84, height: 84, alignSelf: 'center', borderRadius: 20, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
});

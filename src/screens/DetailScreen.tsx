import { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PatternCanvas, type CanvasHandle } from '../components/PatternCanvas';
import { Button, IconButton, Notice, Sheet, ui, colors } from '../components/UI';
import { selectionFeedback } from '../components/NativeUI';
import { applyEdits, type CellEdit, type Pattern, toCSV } from '../lib/pattern';
import { completeColor, newProject, remainingInRegion, regionCount, undoCompletion, workRegion, type Project, type Viewport, type WorkView } from '../lib/projects';
import { runTask } from '../web/tasks';
import { saveFile } from '../lib/files';
type Props = { project: Project; onBack: () => void; onUpdate: (change: (project: Project) => Project) => Promise<boolean>; onCopy: (project: Project) => Promise<boolean>; saving: boolean; error: string; onRetry: () => void };
type Panel = 'regions' | 'colors' | 'more' | 'export' | 'discard' | null;
export function DetailScreen({ project, onBack, onUpdate, onCopy, saving, error, onRetry }: Props) {
  const [panel, setPanel] = useState<Panel>(null), [selected, setSelected] = useState<number | null>(null), [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false), [edits, setEdits] = useState<CellEdit[]>([]), [cursor, setCursor] = useState(0), [brush, setBrush] = useState(0);
  const [exporting, setExporting] = useState(false), [customSize, setCustomSize] = useState(String(project.view.regionSize));
  const canvas = useRef<CanvasHandle>(null), pendingView = useRef<Viewport | null>(null);
  const shown = useMemo(() => editing ? applyEdits(project.pattern, edits.slice(0, cursor)) : project.pattern, [editing, project.pattern, edits, cursor]);
  const region = workRegion(shown, project.view.regionSize, project.view.region);
  const [regionPage,setRegionPage]=useState(0);
  const areaCount = regionCount(shown, project.view.regionSize), color = project.view.color;
  const remaining = useMemo(() => remainingInRegion(project, region), [project.pattern, project.completed, region.x, region.y, region.width, region.height]);
  const localCounts = useMemo(() => { const counts = shown.palette.map(() => 0); for (const i of remaining) counts[project.pattern.cells[i]]++; return counts; }, [remaining, shown.palette, project.pattern]);
  const areaColors = useMemo(() => { const used = new Set<number>(); for (let y = region.y; y < region.y + region.height; y++) for (let x = region.x; x < region.x + region.width; x++) { const c = shown.cells[y * shown.width + x]; if (c >= 0) used.add(c); } return [...used].sort((a, b) => a - b); }, [shown, region.x, region.y, region.width, region.height]);
  const regionRemaining=useMemo(()=>{const counts=Array(areaCount).fill(0);const done=new Set(project.completed);const columns=Math.ceil(shown.width/project.view.regionSize);shown.cells.forEach((c,i)=>{if(c>=0&&!done.has(i))counts[Math.floor(Math.floor(i/shown.width)/project.view.regionSize)*columns+Math.floor((i%shown.width)/project.view.regionSize)]++;});return counts;},[shown,project.completed,project.view.regionSize,areaCount]);
  const progress = project.pattern.total ? project.completed.length / project.pattern.total : 0;
  const viewWriting = useRef(false);
  async function flushView() {
    if (viewWriting.current || !pendingView.current) return;
    viewWriting.current = true;
    const viewport = pendingView.current;
    if (await onUpdate(p => ({ ...p, view: { ...p.view, viewport } }))) {
      if (pendingView.current === viewport) pendingView.current = null;
    }
    viewWriting.current = false;
  }
  const saveView = (viewport: Viewport) => { pendingView.current = viewport; void flushView(); };
  useEffect(() => { if (!saving && !error) void flushView(); }, [saving, error]);
  async function updateView(patch: Partial<WorkView>) { return onUpdate(p => ({ ...p, view: { ...p.view, ...patch } })); }
  async function back() {
    if (editing && cursor > 0) { setPanel('discard'); return; }
    if (saving) return;
    if (pendingView.current) { await flushView(); if (pendingView.current) return; }
    onBack();
  }
  useEffect(() => { const subscription = BackHandler.addEventListener('hardwareBackPress', () => { if (panel) setPanel(null); else back(); return true; }); return () => subscription.remove(); });
  async function chooseRegion(index: number, size = project.view.regionSize) {
    const area = workRegion(shown, size, index);
    if (await updateView({ region: index, regionSize: size, locked: false, viewport: null })) {
      selectionFeedback(); setSelected(null); setPanel(null);
      // Defer until the lock state has updated, then fit the newly selected region.
      requestAnimationFrame(() => canvas.current?.fit(area));
    }
  }
  function nextArea() {
    for (let step = 1; step <= areaCount; step++) { const i = (project.view.region + step) % areaCount;
      if (regionRemaining[i]) { chooseRegion(i); return; } }
    setMessage('全部图纸已完成。');
  }
  async function complete() {
    if (color === null) { setPanel('colors'); return; }
    if (!localCounts[color]) return;
    const count = localCounts[color];
    if (await onUpdate(p => {
      const next = completeColor(p, region, color);
      const nextCounts = shown.palette.map(() => 0);
      for (const i of remainingInRegion(next, region)) nextCounts[next.pattern.cells[i]]++;
      const nextColor = areaColors.find(c => nextCounts[c] > 0) ?? color;
      return { ...next, view: { ...next.view, color: nextColor } };
    })) { selectionFeedback(); setMessage(`已完成本区 ${shown.palette[color].code} · ${count} 颗`); }
  }
  function inspect(i: number) {
    setSelected(i);
    if (editing && shown.cells[i] !== brush) { setEdits([...edits.slice(0, cursor), { index: i, color: brush }]); setCursor(cursor + 1); }
  }
  function startEditing() { setEditing(true); setEdits([]); setCursor(0); setSelected(null); setBrush(color ?? 0); setPanel(null); }
  async function saveCopy() {
    if (!shown.total) { setMessage('图纸至少需要一颗拼豆。'); return; }
    const copy = newProject(`${project.title} · 副本`, shown, project.options);
    copy.view = { ...project.view, locked: false };
    if (await onCopy(copy)) { setEditing(false); setEdits([]); setCursor(0); }
  }
  async function exportAs(format: 'png' | 'svg' | 'csv' | 'json') {
    setExporting(true); setMessage('');
    try {
      await new Promise(resolve => setTimeout(resolve, 20));
      const name = `bead-${shown.width}x${shown.height}`;
      if (format === 'png') await saveFile(await runTask<Uint8Array>('png', shown), `${name}.png`, 'image/png');
      if (format === 'svg') await saveFile(await runTask<string>('svg', shown), `${name}.svg`, 'image/svg+xml');
      if (format === 'csv') await saveFile(toCSV(shown), `${name}.csv`, 'text/csv;charset=utf-8');
      if (format === 'json') await saveFile(JSON.stringify({ version: 1, options: project.options, ...shown, completed: editing ? [] : project.completed }, null, 2), `${name}.json`, 'application/json');
      setPanel(null);
    } catch { setMessage('导出失败，请重试。'); } finally { setExporting(false); }
  }
  const selectedColor = selected === null ? null : shown.cells[selected];
  return <View style={s.root}>
    <SafeAreaView edges={['top', 'left', 'right']} style={s.headerSafe}>
      <View style={s.header}><IconButton icon="back" label="返回图纸列表" onPress={back} /><View style={{ flex: 1 }}><Text style={s.name} numberOfLines={1}>{editing ? '编辑副本' : project.title}</Text><Text style={ui.note}>{editing ? '点格子改色，拖动浏览' : `${shown.width} × ${shown.height} 格 · 已完成 ${project.completed.length} / ${shown.total}`}</Text></View><IconButton icon="more" label="图纸更多操作" onPress={() => setPanel('more')} /></View>
      {!editing && <View style={s.track}><View style={[s.progress, { width: `${progress * 100}%` }]} /></View>}
    </SafeAreaView>
    {error ? <Pressable accessibilityRole="button" accessibilityLabel="重试保存" onPress={() => { if (pendingView.current) saveView(pendingView.current); else onRetry(); }} style={s.error}><Text style={ui.note}>{error} · 轻点重试</Text></Pressable> : null}
    <PatternCanvas ref={canvas} pattern={shown} completed={editing ? [] : project.completed} region={region} color={editing ? null : color}
      initialView={project.view.viewport} locked={project.view.locked} selected={selected} onCell={inspect} onView={saveView} onLock={() => updateView({ locked: !project.view.locked })} />
    <SafeAreaView edges={['bottom', 'left', 'right']} style={s.bottom}>
      {selected !== null && <View style={s.inspection}><Text style={ui.note}>行 {Math.floor(selected / shown.width) + 1} · 列 {selected % shown.width + 1} · {selectedColor !== null && selectedColor >= 0 ? shown.palette[selectedColor].code : '空格'}{project.completed.includes(selected) && !editing ? ' · 已完成' : ''}</Text><Pressable accessibilityRole="button" accessibilityLabel="关闭格子信息" onPress={() => setSelected(null)} hitSlop={10}><Text style={{ color: colors.accent }}>关闭</Text></Pressable></View>}
      {editing ? <>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}><ColorChip label="擦除" selected={brush === -1} onPress={() => setBrush(-1)} />{shown.palette.map((c, i) => <ColorChip key={c.code} label={c.code} hex={c.hex} selected={brush === i} onPress={() => setBrush(i)} />)}</ScrollView>
        <View style={[ui.row, { paddingHorizontal: 16, paddingBottom: 8 }]}><IconButton icon="undo" label="撤销改色" disabled={!cursor} onPress={() => setCursor(cursor - 1)} /><Button compact label="重做" disabled={cursor === edits.length} onPress={() => setCursor(cursor + 1)} /><View style={{ flex: 1 }}><Button label="保存为新图纸" primary disabled={saving || !shown.total} onPress={saveCopy} /></View></View>
      </> : <>
        <View style={s.regionRow}><Pressable accessibilityRole="button" accessibilityLabel="选择工作区域" onPress={() => setPanel('regions')}><Text style={s.regionTitle}>区域 {project.view.region + 1} / {areaCount} ▾</Text><Text style={s.regionNote}>行 {region.y + 1}–{region.y + region.height} · 列 {region.x + 1}–{region.x + region.width}</Text></Pressable><View style={{ flex: 1 }} /><Button compact icon="palette" label="用量" onPress={() => setPanel('colors')} /></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          <ColorChip label="全色" selected={color === null} onPress={() => updateView({ color: null })} />
          {areaColors.map(i => <ColorChip key={i} label={`${shown.palette[i].code} · ${localCounts[i]}`} hex={shown.palette[i].hex} selected={color === i} onPress={() => { updateView({ color: i }); selectionFeedback(); }} />)}
        </ScrollView>
        <View style={[ui.row, { paddingHorizontal: 16, paddingBottom: 8 }]}>
          <IconButton icon="undo" label="撤销完成标记" disabled={saving || !project.batches.length} onPress={async () => { if (await onUpdate(undoCompletion)) setMessage('已撤销上一次完成标记。'); }} />
          <View style={{ flex: 1 }}><Button primary label={!remaining.length ? (progress === 1 ? '全部已完成' : '本区完成 · 下一待拼区域') : color === null ? '选择本区颜色' : localCounts[color] ? `完成本区 ${shown.palette[color].code} · ${localCounts[color]} 颗` : '此色已完成'}
            disabled={saving || progress === 1 || !!remaining.length && color !== null && !localCounts[color]} onPress={!remaining.length ? nextArea : complete} /></View>
          <IconButton icon="next" label="定位下一个待拼位置" disabled={!remaining.length || project.view.locked} onPress={() => {
            const candidates = color === null ? remaining : remaining.filter(i => shown.cells[i] === color);
            const next = candidates.find(i => selected === null || i > selected) ?? candidates[0];
            if (next !== undefined) { setSelected(next); canvas.current?.focusCell(next); }
          }} />
        </View>
      </>}
      {message ? <Pressable accessibilityRole="button" accessibilityLabel="关闭操作提示" onPress={() => setMessage('')}><Text style={s.message}>{message}</Text></Pressable> : null}
    </SafeAreaView>
    <Sheet visible={panel === 'regions'} title="工作区域" onClose={() => setPanel(null)}>
      <Text style={ui.note}>分区用于定位与批量记录，不会裁切图纸或清空进度。</Text>
      <View style={[ui.row, { marginVertical: 16 }]}>{[16, 29, Math.max(shown.width, shown.height)].filter((n, i, list) => list.indexOf(n) === i).map(n => <Button key={n} compact label={n === Math.max(shown.width, shown.height) ? '全图' : `${n} × ${n}`} onPress={() => chooseRegion(0, n)} />)}</View>
      <View style={[ui.row, { marginBottom: 18 }]}><Text style={ui.note}>区域边长</Text><TextInput accessibilityLabel="自定义区域边长" value={customSize} onChangeText={setCustomSize} keyboardType="number-pad" maxLength={3} style={s.sizeInput} /><Button compact label="应用" onPress={() => { const n = Number(customSize); if (Number.isInteger(n) && n >= 1 && n <= 512) chooseRegion(0, n); else setMessage('区域边长请输入 1–512。'); }} /></View>
      {areaCount>64 && <View style={[ui.row,{marginBottom:12}]}><Button compact label="上一页区域" disabled={!regionPage} onPress={()=>setRegionPage(n=>n-1)}/><Text style={ui.note}>{Math.min(regionPage,Math.floor((areaCount-1)/64))+1} / {Math.ceil(areaCount/64)}</Text><Button compact label="下一页区域" disabled={(regionPage+1)*64>=areaCount} onPress={()=>setRegionPage(n=>n+1)}/></View>}
      <View style={s.regionGrid}>{Array.from({ length: Math.min(64,areaCount-Math.min(regionPage,Math.floor((areaCount-1)/64))*64) }, (_, offset) => { const i=Math.min(regionPage,Math.floor((areaCount-1)/64))*64+offset, count = regionRemaining[i]; return <Pressable accessibilityRole="button" accessibilityLabel={`区域 ${i + 1}，剩余 ${count} 颗`} accessibilityState={{ selected: project.view.region === i }} key={i} onPress={() => chooseRegion(i)} style={[ui.choice, s.regionChoice, project.view.region === i && ui.selected]}><Text style={ui.text}>{i + 1}</Text><Text style={ui.note}>{count ? `余 ${count}` : '已完成'}</Text></Pressable>; })}</View>
    </Sheet>
    <Sheet visible={panel === 'colors'} title="用量与颜色" onClose={() => setPanel(null)}>
      <Text style={ui.note}>轻点颜色返回图纸。区域余量随完成标记更新。</Text><Notice text={shown.colorCard ? `${shown.colorCard.name} · 版本 ${shown.colorCard.revision}\n${[shown.colorCard.brand, shown.colorCard.series, shown.colorCard.size].filter(Boolean).join(' · ')}\n${shown.colorCard.description}` : 'D 系列为示例色号，不对应品牌拼豆。'} />
      <View style={[ui.row, { justifyContent: 'space-between', paddingBottom: 10 }]}><Text style={ui.note}>颜色</Text><Text style={ui.note}>全图用量 / 本区剩余</Text></View>
      {shown.palette.map((c, i) => shown.counts[i] ? <Pressable key={c.code} accessibilityRole="button" accessibilityLabel={`选择 ${c.code}，本区剩余 ${localCounts[i]} 颗`} onPress={async () => { if (await updateView({ color: i })) { setPanel(null); selectionFeedback(); } }} style={s.colorRow}><View style={[s.swatch, { backgroundColor: c.hex }]} /><View style={{ flex: 1 }}><Text style={ui.text}>{c.code} · {c.name}</Text><Text style={ui.note}>{c.hex.toUpperCase()}</Text></View><Text style={ui.text}>{shown.counts[i]} / {localCounts[i]}</Text></Pressable> : null)}
      <View style={{ marginTop: 16 }}><Button label="导出用量清单" icon="download" disabled={exporting} onPress={() => void exportAs('csv')} /></View>
    </Sheet>
    <Sheet visible={panel === 'more'} title="图纸操作" onClose={() => setPanel(null)}>
      <View style={{ gap: 12 }}><Button label="导出图纸" icon="download" onPress={() => setPanel('export')} />
        {editing ? <Button label="取消编辑副本" onPress={() => cursor ? setPanel('discard') : (setEditing(false), setPanel(null))} /> : <Button label="编辑副本" icon="brush" onPress={startEditing} />}
      </View><Notice text="修改颜色时编辑副本，原图和拼制进度会保留。图纸及进度保存在当前设备，清除网站数据可能删除记录，请定期备份。" />
      <Text style={ui.note}>创建于 {new Date(project.createdAt).toLocaleDateString()} · {shown.width} × {shown.height} 格</Text><Text style={ui.note}>按间距 2.6 mm 估算约 {(shown.width * .26).toFixed(1)} × {(shown.height * .26).toFixed(1)} cm，实际尺寸以底板为准。</Text>
    </Sheet>
    <Sheet visible={panel === 'export'} title="导出图纸" onClose={() => { if (!exporting) setPanel(null); }}>
      <View style={{ gap: 12 }}><Button primary label={exporting ? '正在导出…' : 'PNG 预览图 · 用量'} disabled={exporting} onPress={() => void exportAs('png')} /><Button label="SVG 高清图纸 · 完整色号" disabled={exporting} onPress={() => void exportAs('svg')} /><Button label="CSV 用量清单" disabled={exporting} onPress={() => void exportAs('csv')} /><Button label="JSON 图纸数据" disabled={exporting} onPress={() => void exportAs('json')} /></View><Notice text="PNG 大图会缩小，细小格子不显示色号；SVG 保留完整色号，适合放大或打印。JSON 含进度，可在「我的」导入。" />
    </Sheet>
    <Sheet visible={panel === 'discard'} title="保存编辑副本？" onClose={() => setPanel(null)}>
      <Text style={[ui.text, { marginBottom: 18 }]}>原图和拼制进度不会改变。当前副本有尚未保存的修改。</Text><View style={{ gap: 12 }}><Button primary label="保存为新图纸" onPress={saveCopy} /><Button label="放弃副本修改" onPress={() => { setEditing(false); setEdits([]); setCursor(0); setPanel(null); }} /><Button label="继续编辑" onPress={() => setPanel(null)} /></View>
    </Sheet>
  </View>;
}
function ColorChip({ label, hex, selected, onPress }: { label: string; hex?: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress} style={[s.chip, selected && ui.selected]}>{hex && <View style={[s.chipDot, { backgroundColor: hex }]} />}<Text style={[ui.note, selected && { color: colors.accent, fontWeight: '700' }]}>{label}</Text></Pressable>;
}
const s = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background }, headerSafe: { backgroundColor: '#fff' }, header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, minHeight: 58, gap: 3 }, name: { fontSize: 16, fontWeight: '600', color: colors.ink }, track: { height: 2, backgroundColor: '#edf0f3' }, progress: { height: 2, backgroundColor: colors.accent }, bottom: { backgroundColor: '#fff', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }, regionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 17, paddingTop: 9, gap: 8 }, regionTitle: { fontSize: 14, fontWeight: '600', color: colors.ink }, regionNote: { fontSize: 10, color: colors.secondary, marginTop: 3 }, chips: { gap: 7, paddingHorizontal: 16, paddingVertical: 9 }, chip: { minHeight: 39, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' }, chipDot: { width: 15, height: 15, borderRadius: 5, borderWidth: StyleSheet.hairlineWidth, borderColor: '#00000022' }, inspection: { minHeight: 33, paddingHorizontal: 17, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f5f6f8' }, message: { fontSize: 11, color: '#59665e', textAlign: 'center', paddingHorizontal: 12, paddingBottom: 7 }, regionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, regionChoice: { width: '22%', minHeight: 66 }, sizeInput: { minHeight: 44, width: 66, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10, textAlign: 'center', fontSize: 15 }, colorRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingVertical: 9 }, swatch: { width: 34, height: 34, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: '#00000022' }, error: { backgroundColor: '#fff0e5', padding: 9 } });

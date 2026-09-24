import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { version } from './package.json';
import { GlassSurface, NativePreferences, Navigation, PageTransition, type Tab } from './src/components/NativeUI';
import { Button, IconButton, Notice, Sheet, ui, colors } from './src/components/UI';
import { ColorCardsProvider } from './src/storage/ColorCards';
import { ColorCardsScreen } from './src/screens/ColorCardsScreen';
import { CreateScreen } from './src/screens/CreateScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { DetailScreen } from './src/screens/DetailScreen';
import { newProject, type Project } from './src/lib/projects';
import { type Options, type Pattern } from './src/lib/pattern';
import { AsyncRepository, browserStorage } from './src/web/storage';
import { validateProjects } from './src/lib/projects';
import { WebSettings } from './src/web/WebSettings';
function AppContent() {
  const [tab, setTab] = useState<Tab>('create'), [detailId, setDetailId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]), [ready, setReady] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [guide, setGuide] = useState(false);
  const repository = useRef(new AsyncRepository(browserStorage('projects'), validateProjects));
  const pending = useRef<{ change: (projects: Project[]) => Project[]; after?: () => void } | null>(null);
  const insets = useSafeAreaInsets();
  async function load() {
    try { const result = await repository.current.load(); setProjects(result.items); setReady(true); setError(''); if (result.recovered) setNotice('已从上一份有效记录恢复图纸，请检查最近一次操作。'); }
    catch (e) { setError(e instanceof Error ? e.message : '无法读取本地图纸，请重试。'); }
  }
  useEffect(() => { void load(); }, []);
  const writing = useRef(false);
  const [saving, setSaving] = useState(false);
  async function commit(change: (projects: Project[]) => Project[], after?: () => void): Promise<boolean> {
    if (!ready || writing.current) return false;
    if (pending.current) return false;
    writing.current = true; setSaving(true);
    try { const next = change(repository.current.items); await repository.current.commit(next); setProjects(next); setError(''); after?.(); return true; }
    catch (e) { pending.current = { change, after }; setError(e instanceof Error ? e.message : '保存失败，请检查设备剩余空间后重试。'); return false; } finally { writing.current = false; setSaving(false); }
  }
  function retry() { const operation = pending.current; pending.current = null; if (operation) commit(operation.change, operation.after); else if (!ready) load(); else setError(''); }
  function open(id: string) { setTab('library'); setDetailId(id); }
  function add(project: Project): Promise<boolean> { return commit(items => [project, ...items], () => open(project.id)); }
  function create(title: string, pattern: Pattern, options: Options) { return add(newProject(title, pattern, options)); }
  const project = detailId ? projects.find(p => p.id === detailId && !p.deletedAt) : undefined;
  return <View style={s.safe}><StatusBar style="dark" />
    {project ? <DetailScreen key={project.id} project={project} onBack={() => setDetailId(null)} error={error} saving={saving} onRetry={retry}
      onUpdate={change => commit(items => items.map(p => p.id === project.id ? change(p) : p))} onCopy={add} /> : <View style={s.shell}>
      <SafeAreaView edges={['top', 'left', 'right']}><View style={s.header}><View style={ui.row}><View style={s.logo}>{Array.from({ length: 9 }, (_, i) => <View key={i} style={[s.dot, { backgroundColor: i % 3 === 2 ? '#9caf9f' : '#bd7857' }]} />)}</View><Text style={s.brand}>豆豆工坊</Text></View><GlassSurface interactive style={{ borderRadius: 22 }}><IconButton icon="info" label="使用说明" onPress={() => setGuide(true)} /></GlassSurface></View></SafeAreaView>
      {!ready && !error && <ActivityIndicator color={colors.accent} />}
      {notice ? <View style={{ paddingHorizontal: 20 }}><Notice text={notice} /></View> : null}
      {!ready && error ? <View style={{ padding: 20 }}><Notice text={error} /><Button label="重试读取图纸" onPress={load} /></View> : <>
        <View style={[s.page, tab !== 'create' && { display: 'none' }]}><CreateScreen onCreate={create} ready={ready && !saving} active={tab === 'create'} /></View>
        {tab === 'library' && <View style={s.page}><LibraryScreen projects={projects} onOpen={open} onCreate={() => setTab('create')}
          onDelete={id => commit(items => items.map(p => p.id === id ? { ...p, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : p))}
          onRestore={id => { commit(items => items.map(p => p.id === id ? { ...p, deletedAt: null, updatedAt: new Date().toISOString() } : p)); }} /></View>}
        {tab === 'cards' && <View style={s.page}><ColorCardsScreen /></View>}
        {tab === 'profile' && <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 110 + insets.bottom }}><PageTransition page="profile"><Text style={ui.title}>我的</Text><Text style={ui.subtitle}>应用信息与使用说明。</Text><View style={[ui.card, { gap: 16 }]}><Text style={s.brand}>豆豆工坊</Text><Text style={ui.text}>v{version}</Text><Button label="使用说明" icon="info" onPress={() => setGuide(true)} /></View><WebSettings projects={projects} onImport={async incoming => { const ids=new Set(repository.current.items.map(p=>p.id)); return commit(items=>[...incoming.filter(p=>!ids.has(p.id)),...items]); }} /><Notice text="图纸和进度保存在当前浏览器。清除网站数据可能删除记录，请定期导出备份。" /></PageTransition></ScrollView>}
      </>}
      <Navigation selected={tab} onSelect={setTab} />
    </View>}
    <Sheet visible={guide} title="使用说明" onClose={() => setGuide(false)}><Text style={ui.text}>{'1. 在「制作」依次选择图片、色卡和尺寸，预览后点击「创建图纸」保存并进入详情。效果调整为可选。\n\n2. 在「图纸」打开已有图纸，可继续拼制、删除或从最近删除恢复。\n\n3. 详情中单指拖动、双指缩放，轻点格子查看色号与坐标。用侧边工具查看全图、定位区域或锁定视图。\n\n4. 选择工作区域和颜色，按高亮位置摆豆。一批完成后点击「完成本区此色」，无需逐颗记录；误标可以撤销。进度和查看位置会自动保存。\n\n5. 在「用量」查看数量和选择颜色。更多操作中可导出完整图纸，或编辑副本，保留原图和进度。\n\n6. 在「色卡」添加品牌预设或自定义色卡，可复制、筛选颜色或手动添加。预设需确认添加后才会出现在我的色卡中，已保存的图纸保留创建时的色卡。品牌数据来源与缺项见色卡详情，D 系列为示例色号。成品尺寸请按实际底板校准。在「我的」可导出备份或导入图纸 JSON。'}</Text><Text style={[ui.note, { marginVertical: 20 }]}>豆豆工坊 · v{version}</Text><Button primary label="关闭" onPress={() => setGuide(false)} /></Sheet>
    <Sheet visible={!!error && ready && !!pending.current} title="操作尚未保存" onClose={() => {}}><Text style={[ui.text, { marginBottom: 20 }]}>{error} 保存成功前不会覆盖当前图纸。</Text><View style={{ gap: 12 }}><Button primary label="重试保存" onPress={retry} /><Button label="取消本次操作" onPress={() => { pending.current = null; setError(''); }} /></View></Sheet>
  </View>;
}
export default function App() { return <SafeAreaProvider><NativePreferences><ColorCardsProvider><AppContent /></ColorCardsProvider></NativePreferences></SafeAreaProvider>; }
const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, shell: { flex: 1, width: '100%', maxWidth: 900, alignSelf: 'center' }, page: { flex: 1 }, header: { height: 54, paddingHorizontal: 21, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, brand: { fontSize: 18, fontWeight: '600', color: colors.ink }, logo: { width: 25, flexDirection: 'row', flexWrap: 'wrap', gap: 2 }, dot: { width: 6, height: 6, borderRadius: 1.5 } });

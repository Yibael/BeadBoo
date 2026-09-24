import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Board } from '../components/Board';
import { Button, IconButton, Sheet, ui, colors } from '../components/UI';
import { projectStatus, type Project } from '../lib/projects';
export function LibraryScreen({ projects, onOpen, onDelete, onRestore, onCreate }: { projects: Project[]; onOpen: (id: string) => void; onDelete: (id: string) => Promise<boolean>; onRestore: (id: string) => void; onCreate: () => void }) {
  const insets = useSafeAreaInsets(), [trash, setTrash] = useState(false), [deleting, setDeleting] = useState<Project | null>(null);
  const visible = useMemo(() => projects.filter(p => trash ? p.deletedAt : !p.deletedAt).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [projects, trash]);
  return <>
    <FlatList data={visible} keyExtractor={p => p.id} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 110 + insets.bottom, gap: 12 }}
      ListHeaderComponent={<><View style={[ui.row, { justifyContent: 'space-between' }]}><Text style={ui.title}>{trash ? '最近删除' : '图纸'}</Text><IconButton icon={trash ? 'back' : 'trash'} label={trash ? '返回全部图纸' : '查看最近删除'} onPress={() => setTrash(!trash)} /></View><Text style={ui.subtitle}>{trash ? '删除的图纸保留在这里，可随时恢复。' : '打开图纸，继续上次的拼制。'}</Text></>}
      ListEmptyComponent={<View style={[ui.card, { alignItems: 'center', paddingVertical: 36, gap: 15 }]}><Text style={ui.label}>{trash ? '没有已删除的图纸' : '还没有保存的图纸'}</Text><Text style={[ui.note, { textAlign: 'center', marginBottom: 6 }]}>{trash ? '恢复的图纸会回到图纸列表。' : '从图片创建一份图纸，进度会自动保存。'}</Text>{!trash && <Button primary icon="plus" label="制作第一份图纸" onPress={onCreate} />}</View>}
      renderItem={({ item: p }) => <View style={s.card}>
        <Pressable accessibilityRole="button" accessibilityLabel={`打开图纸 ${p.title}，${projectStatus(p)}，已完成 ${p.completed.length} 颗`} disabled={trash} onPress={() => onOpen(p.id)} style={s.body}>
          <View style={s.thumbnail}><Board pattern={p.pattern} beads={false} /></View>
          <View style={{ flex: 1, gap: 6 }}><Text style={s.name} numberOfLines={2}>{p.title}</Text><Text style={ui.note}>{p.pattern.width} × {p.pattern.height} 格 · {p.pattern.total.toLocaleString()} 颗</Text><Text style={s.status}>{projectStatus(p)}{p.completed.length ? ` · ${Math.round(p.completed.length / p.pattern.total * 100)}%` : ''}</Text><View style={s.track}><View style={[s.progress, { width: `${p.pattern.total ? p.completed.length / p.pattern.total * 100 : 0}%` }]} /></View></View>
        </Pressable>
        <View style={s.actions}><Text style={[ui.note, { flex: 1 }]}>{new Date(p.createdAt).toLocaleDateString()}</Text>{trash ? <Button compact label={`恢复 ${p.title}`} onPress={() => onRestore(p.id)} /> : <><IconButton icon="trash" label={`删除图纸 ${p.title}`} onPress={() => setDeleting(p)} /><Button compact label={p.completed.length ? '继续拼制' : '查看图纸'} onPress={() => onOpen(p.id)} /></>}</View>
      </View>} />
    <Sheet visible={!!deleting} title="删除这份图纸？" onClose={() => setDeleting(null)}><Text style={[ui.text, { marginBottom: 20 }]}>「{deleting?.title}」将移至最近删除，图纸和拼制进度仍可恢复。</Text><View style={{ gap: 12 }}><Button label="移至最近删除" onPress={async () => { if (deleting && await onDelete(deleting.id)) setDeleting(null); }} /><Button primary label="保留图纸" onPress={() => setDeleting(null)} /></View></Sheet>
  </>;
}
const s = StyleSheet.create({ card: { backgroundColor: '#fff', borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, padding: 14 }, body: { flexDirection: 'row', alignItems: 'center', gap: 14 }, thumbnail: { width: 96, height: 96, backgroundColor: '#faf9f4', borderRadius: 12, overflow: 'hidden', justifyContent: 'center' }, name: { fontSize: 16, color: colors.ink, fontWeight: '600' }, status: { fontSize: 12, color: '#8d563c' }, track: { height: 4, backgroundColor: '#eef0f3', borderRadius: 4, overflow: 'hidden' }, progress: { height: 4, backgroundColor: colors.accent }, actions: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 } });

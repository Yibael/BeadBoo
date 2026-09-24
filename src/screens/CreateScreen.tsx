import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, useWindowDimensions, View, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Board } from '../components/Board';
import { ColorCardLibrary } from '../components/ColorCardLibrary';
import { Button, Sheet, Notice, ui, colors } from '../components/UI';
import { PageTransition, selectionFeedback } from '../components/NativeUI';
import { MAX_PALETTE_COLORS, type Options, type Pattern, type Raster } from '../lib/pattern';
import { cardCaption, type ColorCard } from '../lib/color-cards';
import { useColorCards } from '../storage/ColorCards';
import { decodeRaster } from '../lib/png';
import { readImage } from '../lib/images';
import { runTask } from '../web/tasks';
import cat from '../lib/cat-sample';
import flower from '../lib/flower-sample';
const initial: Options = { width: 48, maxColors: MAX_PALETTE_COLORS, dithering: false, cleanup: false, removeBackground: false };
const samples = [
  { name: '围巾小猫', data: cat, asset: require('../../assets/cat.png') },
  { name: '微笑小花', data: flower, asset: require('../../assets/flower.png') },
];
const steps = [
  { short: '图片', title: '选择一张图片', note: '从相册导入，或先试试下面的示例。' },
  { short: '色卡', title: '选择使用的色卡', note: '图纸只会使用这张色卡中的颜色。' },
  { short: '尺寸', title: '决定图纸大小', note: '格数越多，保留的细节越丰富。' },
  { short: '预览', title: '确认你的图纸', note: '检查效果，保存后就可以开始拼制。' },
];
type SourceImage = { raster: Raster; source: ImageSourcePropType };
export function CreateScreen({ onCreate, ready, active }: { onCreate: (title: string, pattern: Pattern, options: Options) => Promise<boolean>; ready: boolean; active: boolean }) {
  const insets = useSafeAreaInsets(), dimensions = useWindowDimensions(), library = useColorCards();
  const [step, setStep] = useState(0), [image, setImage] = useState<SourceImage | null>(null), [title, setTitle] = useState('');
  const [settings, setSettings] = useState(false), [renaming, setRenaming] = useState(false), [original, setOriginal] = useState(false), [reading, setReading] = useState(false);
  const [error, setError] = useState(''), [generationError, setGenerationError] = useState(''), [attempt, setAttempt] = useState(0);
  const [custom, setCustom] = useState(false), [gridW, setGridW] = useState('96'), [gridH, setGridH] = useState('96');
  const validSize = /^\d+$/.test(gridW) && /^\d+$/.test(gridH) && +gridW >= 1 && +gridW <= 512 && +gridH >= 1 && +gridH <= 512;
  const [options, setOptions] = useState(initial), [selectedCard, setSelectedCard] = useState<ColorCard | null>(null);
  // Preserve a removed remote preset for the current draft; never silently switch brands.
  const card = library.cards.find(c => c.id === selectedCard?.id) ?? selectedCard;
  useEffect(() => { if (card !== selectedCard) setSelectedCard(card); }, [card, selectedCard]);
  const [generated, setGenerated] = useState<{ image: SourceImage; options: Options; card: typeof card; pattern: Pattern } | null>(null);
  const scroll = useRef<ScrollView>(null), pattern = generated?.pattern;
  const [contentHeight, setContentHeight] = useState(0);
  const busy = reading || !!image && !!card && (!generated || generated.image !== image || generated.options !== options || generated.card !== card);
  const previewHeight = Math.min(300, Math.max(90, contentHeight ? contentHeight - (step === 2 ? 235 : 265) : dimensions.height * .18));
  useEffect(() => {
    if (!image || !card) return;
    setGenerationError('');
    const controller = new AbortController();
    void runTask<Pattern>('generate', { raster: image.raster, options, card }, controller.signal)
      .then(pattern => { if (!controller.signal.aborted) setGenerated({ image, options, card, pattern }); })
      .catch(e => { if (!controller.signal.aborted) setGenerationError(e.message || '未能生成图纸，请重试。'); });
    return () => controller.abort();
  }, [image, options, card, attempt]);
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [step]);
  useEffect(() => {
    if (!active) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (reading) return true;
      if (step > 0) { setStep(s => s - 1); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [active, reading, step]);
  const option = <K extends keyof Options>(key: K, value: Options[K]) => {
    if (options[key] !== value) { selectionFeedback(); setOptions(o => ({ ...o, [key]: value })); }
  };
  async function pick() {
    if (reading) return;
    setReading(true); setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (result.canceled) return;
      const a = result.assets[0];
      if (a.fileSize && a.fileSize > 20 * 1024 * 1024) throw new Error('请选择小于 20 MB 的图片。');
      const raster = await readImage(a.uri, a.width, a.height);
      setImage({ raster, source: { uri: a.uri } }); setTitle(a.fileName?.replace(/\.[^.]+$/, '').slice(0, 80) || '未命名图纸'); setOriginal(false);
    } catch (e) { setError(e instanceof Error ? e.message : '未能读取图片，请重试。'); }
    finally { setReading(false); }
  }
  function go(next: number) { selectionFeedback(); setOriginal(false); setStep(next); }
  return <View style={{ flex: 1, paddingBottom: 88 + insets.bottom }}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={s.stepHeader} accessibilityLabel={`第 ${step + 1} 步，共 4 步：${steps[step].short}`}>
      <View style={[ui.row, { justifyContent: 'space-between' }]}><Text style={s.stepText}>创建图纸</Text><Text style={ui.note}>{step + 1} / 4 · {steps[step].short}</Text></View>
      <View style={[ui.row, { gap: 5, marginTop: 10 }]}>{steps.map((_, i) => <View key={i} style={[s.segment, i <= step && { backgroundColor: colors.accent }]} />)}</View>
    </View>
    <ScrollView ref={scroll} onLayout={event => setContentHeight(event.nativeEvent.layout.height)} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <PageTransition page={`create-${step}`}>
        <Text style={ui.title}>{steps[step].title}</Text><Text style={[ui.subtitle, { marginBottom: 16 }]}>{steps[step].note}</Text>
        {error ? <Notice text={error} /> : null}
        {step === 0 && <>
          {image && <View style={[ui.card, { padding: 10, marginBottom: 12 }]}><Image source={image.source} resizeMode="contain" style={{ width: '100%', height: Math.min(110, previewHeight) }} /><Text style={[ui.note, { textAlign: 'center' }]} numberOfLines={1}>{title}</Text></View>}
          <Button label={reading ? '正在读取图片…' : image ? '更换图片' : '从相册选择'} icon="image" onPress={() => void pick()} disabled={reading} />
          <Text style={[ui.label, { marginTop: 22 }]}>试用示例</Text>
          <View style={ui.row}>{samples.map(sample => <Pressable key={sample.name} accessibilityRole="button" accessibilityLabel={`使用${sample.name}示例`} disabled={reading} style={[ui.card, s.sample, image?.source === sample.asset && ui.selected]} onPress={() => {
            setImage({ raster: decodeRaster(sample.data), source: sample.asset }); setTitle(sample.name); setOriginal(false); setError(''); selectionFeedback();
          }}><Image source={sample.asset} resizeMode="contain" style={{ width: '100%', height: image ? 66 : 125 }} /><Text style={ui.note}>{sample.name}</Text></Pressable>)}</View>
          <Text style={[ui.note, { marginTop: 16, textAlign: 'center' }]}>图片仅在当前设备处理</Text>
        </>}
        {step === 1 && <><ColorCardLibrary selectedId={card?.id} onSelect={selected => { setSelectedCard(selected); selectionFeedback(); }} />{card && !library.cards.some(c => c.id === card.id) && <Notice text={`当前草稿保留「${card.name}」，也可以选择其他色卡。`} />}</>}
        {step >= 2 && <>
          <View style={[ui.card, { padding: 12 }]}>
            {step === 3 && <View style={[ui.row, { justifyContent: 'space-between', marginBottom: 8 }]}><Pressable accessibilityRole="button" accessibilityLabel="修改图纸名称" onPress={() => setRenaming(true)} style={{ flex: 1, paddingVertical: 6 }}><Text style={ui.note} numberOfLines={1}>{title.trim() || '未命名图纸'} · 改名</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={original ? '查看图纸' : '查看原图'} hitSlop={12} onPress={() => setOriginal(!original)}><Text style={s.link}>{original ? '查看图纸' : '查看原图'}</Text></Pressable></View>}
            <View style={{ alignItems: 'center', justifyContent: 'center', minHeight: previewHeight }}>
              {pattern && (original && image ? <Image source={image.source} resizeMode="contain" style={{ width: '100%', height: previewHeight }} /> : <View style={{ width: Math.min(dimensions.width - 72, 480, previewHeight * pattern.width / pattern.height) }}><Board pattern={pattern} /></View>)}
              {busy && !generationError && <View style={s.overlay}><ActivityIndicator color={colors.accent} /><Text style={ui.note}>正在生成预览…</Text></View>}
            </View>
            {pattern && <Text style={[ui.note, { textAlign: 'center', marginTop: 9 }]}>{busy ? '正在更新' : `${pattern.width} × ${pattern.height} 格 · ${pattern.total.toLocaleString()} 颗 · ${pattern.counts.filter(n => n > 0).length} 色`}</Text>}
          </View>
          {generationError ? <View><Notice text={generationError} /><Button label="重新生成预览" onPress={() => setAttempt(n => n + 1)} /></View> : null}
          {step === 2 && <>
            <Text style={[ui.label, { marginTop: 14 }]}>画布尺寸</Text>
            <View style={s.sizeGrid}>{[24, 32, 48, 64, 96, 128, 256].map(n => <Pressable key={n} accessibilityRole="button" accessibilityLabel={`${n} 格`} accessibilityState={{ selected: !custom && options.width === n }} onPress={() => {setCustom(false);setOptions(o=>({...o,width:n,height:undefined,fit:undefined}));}} style={[ui.choice, s.sizeChoice, !custom && options.width === n && ui.selected]}><Text style={ui.text}>{n} 格</Text></Pressable>)}<Pressable accessibilityRole="button" accessibilityLabel="自定义画布" onPress={()=>setCustom(true)} style={[ui.choice,s.sizeChoice,custom && ui.selected]}><Text style={ui.text}>自定义</Text></Pressable></View>
            {custom ? <View style={{gap:12,marginTop:14}}><View style={ui.row}><View style={{flex:1}}><Text style={ui.label}>宽（列）</Text><TextInput accessibilityLabel="画布宽度" value={gridW} onChangeText={setGridW} keyboardType="number-pad" maxLength={3} style={s.input}/></View><Text style={ui.text}>×</Text><View style={{flex:1}}><Text style={ui.label}>高（行）</Text><TextInput accessibilityLabel="画布高度" value={gridH} onChangeText={setGridH} keyboardType="number-pad" maxLength={3} style={s.input}/></View></View><Text style={ui.note}>每边 1–512 格，最多 262,144 格。大图纸需要更多拼制时间。</Text><Button label="应用尺寸" disabled={!validSize} onPress={()=>setOptions(o=>({...o,width:+gridW,height:+gridH,fit:o.fit??'contain'}))}/><View style={ui.row}>{(['contain','cover'] as const).map(f=><Pressable key={f} accessibilityRole="button" accessibilityLabel={f==='contain'?'完整放入':'裁剪铺满'} style={[ui.choice,(options.fit??'contain')===f && ui.selected]} onPress={()=>option('fit',f)}><Text style={ui.text}>{f==='contain'?'完整放入':'裁剪铺满'}</Text></Pressable>)}</View><Text style={ui.note}>完整放入保留原图比例，空白位置不放豆；裁剪铺满会裁去超出部分。</Text></View> : <Text style={[ui.note, { marginTop: 12 }]}>预设为横向格数，高度随图片比例调整；每边最多 512 格。</Text>}

          </>}
          {step === 3 && card && <>
            <View style={[ui.row, { justifyContent: 'space-between', marginVertical: 8 }]}><View style={{ flex: 1 }}><Text style={ui.text}>{card.name} · {card.colors.length} 色</Text><Text style={ui.note}>{cardCaption(card)}</Text></View><Button compact label="调整效果" icon="sliders" onPress={() => setSettings(true)} /></View>
            <Text style={[ui.note, { marginBottom: 12 }]}>{card.description}</Text>
            {pattern && !busy && !pattern.total && <Notice text="当前图纸没有可拼制的格子，请调整背景设置或更换图片。" />}
          </>}
        </>}
      </PageTransition>
    </ScrollView>
    <View style={s.footer}>{step > 0 && <Button label="上一步" disabled={reading} onPress={() => go(step - 1)} />}<View style={{ flex: 1 }}><Button primary
      label={step === 3 ? '创建图纸' : ['下一步 · 选色卡', '下一步 · 定尺寸', '下一步 · 看预览'][step]}
      disabled={!image || reading || step >= 1 && !card || step >= 2 && (busy || !!generationError || custom && (!validSize || options.width !== +gridW || options.height !== +gridH)) || step === 3 && (!ready || !pattern?.total)}
      onPress={() => { if (step < 3) go(step + 1); else if (pattern && !busy) onCreate(title, pattern, options); }} /></View></View>
    <Sheet visible={renaming} title="图纸名称" onClose={() => setRenaming(false)}><TextInput accessibilityLabel="图纸名称" autoCorrect={false} value={title} onChangeText={setTitle} maxLength={80} placeholder="输入图纸名称" style={s.input} returnKeyType="done" onSubmitEditing={() => setRenaming(false)} /><View style={{ marginTop: 16 }}><Button label="确认名称" primary onPress={() => setRenaming(false)} /></View></Sheet>
    <Sheet visible={settings} title="调整效果" onClose={() => setSettings(false)}>
      <Text style={ui.label}>用色数量</Text>
      <View style={[ui.row, { flexWrap: 'wrap', marginBottom: 10 }]}>{[MAX_PALETTE_COLORS, 6, 12, 16, 24].map(n => <Pressable accessibilityRole="button" accessibilityLabel={n === MAX_PALETTE_COLORS ? '自动用色' : `最多 ${n} 色`} accessibilityState={{ selected: options.maxColors === n }} key={n} onPress={() => option('maxColors', n)} style={[ui.choice, options.maxColors === n && ui.selected]}><Text style={ui.text}>{n === MAX_PALETTE_COLORS ? '自动' : `${n} 色`}</Text></Pressable>)}</View>
      <Text style={ui.note}>自动按图片匹配色卡；减少用色可以简化图案。</Text>
      {([{ key: 'dithering', title: '柔和渐变', detail: '用相邻色点表现渐变' }, { key: 'cleanup', title: '清理孤立杂点', detail: '也可能移除单格细节' }, { key: 'removeBackground', title: '移除白色背景', detail: '移除与边缘相连的近白区域' }] as const).map(o => <View style={s.toggle} key={o.key}><View style={{ flex: 1 }}><Text style={ui.text}>{o.title}</Text><Text style={ui.note}>{o.detail}</Text></View><Switch accessibilityLabel={o.title} value={options[o.key]} onValueChange={v => option(o.key, v)} trackColor={{ true: colors.accent }} /></View>)}
      <View style={{ marginTop: 20 }}><Button label="查看效果" primary onPress={() => setSettings(false)} /></View>
    </Sheet>
  </KeyboardAvoidingView></View>;
}
const s = StyleSheet.create({
  stepHeader: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 16 }, stepText: { fontSize: 12, fontWeight: '600', color: colors.secondary }, segment: { height: 3, flex: 1, borderRadius: 2, backgroundColor: '#dfe2e7' },
  content: { paddingHorizontal: 20, paddingBottom: 14 }, footer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.background },
  sample: { flex: 1, alignItems: 'center', gap: 8, padding: 12 }, sizeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, sizeChoice: { width: '23%', backgroundColor: '#fff', paddingHorizontal: 4 },
  link: { color: colors.accent, fontSize: 12 }, overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: '#ffffffdd', justifyContent: 'center', alignItems: 'center', gap: 12 },
  input: { minHeight: 48, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, fontSize: 15, color: colors.ink },
  toggle: { paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 },
});

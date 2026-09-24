import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Svg, { G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { type Pattern, rgb } from '../lib/pattern';
import { type Region, type Viewport } from '../lib/projects';
import { cellAt, clampViewport, fitRegion, zoomAt, type Size } from '../lib/viewport';
import { GlassSurface } from './NativeUI';
import { IconButton, colors } from './UI';
export type CanvasHandle = { fit: (region?: Region) => void; focusCell: (index: number) => void };
type Props = { pattern: Pattern; completed: number[]; region: Region; color: number | null; initialView: Viewport | null;
  locked: boolean; selected: number | null; onCell: (index: number) => void; onView: (view: Viewport) => void; onLock: () => void };
type Contact = { x: number; y: number; distance: number; count: number };
function contact(event: GestureResponderEvent): Contact {
  const touches = event.nativeEvent.touches;
  const a = touches[0], b = touches[1];
  return { x: b ? (a.pageX + b.pageX) / 2 : a?.pageX ?? event.nativeEvent.pageX,
    y: b ? (a.pageY + b.pageY) / 2 : a?.pageY ?? event.nativeEvent.pageY,
    distance: b ? Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY) : 0, count: touches.length };
}
export const PatternCanvas = forwardRef<CanvasHandle, Props>(function PatternCanvas(props, ref) {
  const { pattern, region, completed, color, selected, locked } = props;
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [viewport, setViewport] = useState<Viewport>(props.initialView ?? { cx: pattern.width / 2, cy: pattern.height / 2, scale: 10 });
  const initialized = useRef(false), host = useRef<View>(null), origin = useRef({ x: 0, y: 0 });
  const live = useRef({ props, size, viewport }); live.current = { props, size, viewport };
  const change = (v: Viewport, persist = false) => {
    const next = clampViewport(v, live.current.props.pattern, live.current.size);
    live.current.viewport = next; setViewport(next);
    if (persist) live.current.props.onView(next);
  };
  useEffect(() => {
    if (!size.width || !size.height || initialized.current) return;
    initialized.current = true;
    change(props.initialView ?? fitRegion({ x: 0, y: 0, width: pattern.width, height: pattern.height }, size));
  }, [size]);
  useImperativeHandle(ref, () => ({
    fit: area => { if (locked) return; change(fitRegion(area ?? { x: 0, y: 0, width: pattern.width, height: pattern.height }, size), true); },
    focusCell: i => { if (locked) return; change({ cx: i % pattern.width + 0.5, cy: Math.floor(i / pattern.width) + 0.5, scale: Math.max(viewport.scale, 32) }, true); },
  }), [size, pattern, viewport, locked]);
  const gesture = useRef<{ start: Contact; base: Viewport; moved: boolean; multiple: boolean; tap: { x: number; y: number } } | null>(null);
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: event => {
      const start = contact(event);
      // The input overlay has no children, so locationX/Y use stable canvas coordinates.
      origin.current = { x: event.nativeEvent.pageX - event.nativeEvent.locationX, y: event.nativeEvent.pageY - event.nativeEvent.locationY };
      gesture.current = { start, base: live.current.viewport, moved: false, multiple: start.count > 1, tap: { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY } };
    },
    onPanResponderMove: event => {
      const g = gesture.current; if (!g) return;
      const now = contact(event), { props: current, size: window } = live.current;
      if (now.count > 1) g.multiple = true;
      if (now.count !== g.start.count) { g.base = live.current.viewport; g.start = now; g.moved = true; return; }
      const dx = now.x - g.start.x, dy = now.y - g.start.y;
      if (Math.hypot(dx, dy) > 5 || now.count > 1) g.moved = true;
      if (current.locked || !g.moved) return;
      const zoomed = now.count > 1 && g.start.distance > 0
        ? zoomAt(g.base, now.distance / g.start.distance, { x: g.start.x - origin.current.x, y: g.start.y - origin.current.y }, window) : g.base;
      change({ ...zoomed, cx: zoomed.cx - dx / zoomed.scale, cy: zoomed.cy - dy / zoomed.scale });
    },
    onPanResponderRelease: () => {
      const g = gesture.current; gesture.current = null; if (!g) return;
      if (!g.moved && !g.multiple) {
        const i = cellAt(g.tap, live.current.viewport, live.current.size, live.current.props.pattern);
        if (i !== null) live.current.props.onCell(i);
      } else if (!live.current.props.locked) live.current.props.onView(live.current.viewport);
    },
    onPanResponderTerminate: () => { gesture.current = null; live.current.props.onView(live.current.viewport); },
  }), []);
  const left = viewport.cx - size.width / viewport.scale / 2, top = viewport.cy - size.height / viewport.scale / 2;
  const visibleW = size.width / viewport.scale, visibleH = size.height / viewport.scale;
  const done = useMemo(() => new Set(completed), [completed]);
  const drawing = useMemo(() => {
    const normal = pattern.palette.map(() => ''), faded = pattern.palette.map(() => '');
    const finished: string[] = [], stripes: string[] = [], badges: string[] = [], marks: string[] = [];
    const labels: { x: number; y: number; text: string; light: boolean; faded: boolean; completed: boolean }[] = [];
    const x0 = Math.max(0, Math.floor(left)), x1 = Math.min(pattern.width, Math.ceil(left + visibleW));
    const y0 = Math.max(0, Math.floor(top)), y1 = Math.min(pattern.height, Math.ceil(top + visibleH));
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = y * pattern.width + x, c = pattern.cells[i]; if (c < 0) continue;
      const isCompleted = done.has(i), fade = color !== null && c !== color;
      if (isCompleted) {
        // Progress has its own fill and texture, independent of the active color filter.
        finished.push(`M${x} ${y}h1v1h-1z`);
        stripes.push(`M${x} ${y + .5}l.5-.5M${x} ${y + 1}l1-1M${x + .5} ${y + 1}l.5-.5`);
        if (viewport.scale >= 26) {
          badges.push(`M${x + .57} ${y + .04}h.38v.3h-.38z`);
          marks.push(`M${x + .63} ${y + .18}l.08 .08 .17-.16`);
        } else if (viewport.scale >= 12) {
          marks.push(`M${x + .23} ${y + .49}l.19 .19 .36-.39`);
        }
      } else {
        (fade ? faded : normal)[c] += `M${x} ${y}h1v1h-1z`;
      }
      if (viewport.scale >= 26) {
        const [r, g, b] = rgb(pattern.palette[c].hex);
        labels.push({ x: x + .5, y: y + (isCompleted ? .75 : .62), text: pattern.palette[c].code,
          light: !isCompleted && !fade && r * .299 + g * .587 + b * .114 < 155, faded: fade, completed: isCompleted });
      }
    }
    let grid = '', major = '';
    if (viewport.scale >= 6) {
      for (let x = x0; x <= x1; x++) grid += `M${x} ${y0}V${y1}`;
      for (let y = y0; y <= y1; y++) grid += `M${x0} ${y}H${x1}`;
    }
    for (let x = Math.ceil(x0 / 5) * 5; x <= x1; x += 5) major += `M${x} ${y0}V${y1}`;
    for (let y = Math.ceil(y0 / 5) * 5; y <= y1; y += 5) major += `M${x0} ${y}H${x1}`;
    return { normal, faded, labels, grid, major, finished: finished.join(''), stripes: stripes.join(''), badges: badges.join(''), marks: marks.join('') };
  }, [pattern, done, color, left, top, visibleW, visibleH, viewport.scale]);
  const zoom = (factor: number) => change(zoomAt(viewport, factor, { x: size.width / 2, y: size.height / 2 }, size), true);
  return <View ref={host} style={s.host} onLayout={event => { setSize(event.nativeEvent.layout); host.current?.measureInWindow((x, y) => { origin.current = { x, y }; }); }}>
    {size.width > 0 && <Svg width={size.width} height={size.height} viewBox={`${left} ${top} ${visibleW} ${visibleH}`} pointerEvents="none">
      <Rect x={0} y={0} width={pattern.width} height={pattern.height} fill="#fff" />
      {drawing.faded.map((d, i) => d ? <Path key={`f${i}`} d={d} fill={pattern.palette[i].hex} opacity={.16} /> : null)}
      {drawing.normal.map((d, i) => d ? <Path key={i} d={d} fill={pattern.palette[i].hex} /> : null)}
      <Path d={drawing.finished} fill="#dcebe2" />
      <Path d={drawing.stripes} stroke="#608572" strokeOpacity={viewport.scale >= 26 ? .16 : .32} strokeWidth={Math.min(.12, .8 / viewport.scale)} />
      <Path d={drawing.grid} stroke="#616977" strokeOpacity={.22} strokeWidth={.6 / viewport.scale} />
      <Path d={drawing.major} stroke="#555e6d" strokeOpacity={.45} strokeWidth={1 / viewport.scale} />
      {selected !== null && <G><Rect x={0} y={Math.floor(selected / pattern.width)} width={pattern.width} height={1} fill="#b85b36" opacity={.1} /><Rect x={selected % pattern.width} y={0} width={1} height={pattern.height} fill="#b85b36" opacity={.1} /><Rect x={selected % pattern.width} y={Math.floor(selected / pattern.width)} width={1} height={1} fill="none" stroke="#b85b36" strokeWidth={2 / viewport.scale} /></G>}
      {drawing.labels.map((label, i) => <SvgText key={i} x={label.x} y={label.y} textAnchor="middle" fontSize={label.text.length > 4 ? .23 : .32} fontFamily="monospace" fill={label.completed ? '#355d49' : label.light ? '#fff' : label.faded ? '#8c939b' : '#222936'}>{label.text}</SvgText>)}
      <Path d={drawing.badges} fill="#35634e" />
      <Path d={drawing.marks} stroke={viewport.scale >= 26 ? '#fff' : '#35634e'} strokeWidth={viewport.scale >= 26 ? .05 : .08} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Rect x={region.x} y={region.y} width={region.width} height={region.height} stroke={colors.accent} strokeWidth={2 / viewport.scale} strokeDasharray={`${6 / viewport.scale} ${4 / viewport.scale}`} fill="none" />
      <Rect x={0} y={0} width={pattern.width} height={pattern.height} fill="none" stroke="#afb6c0" strokeWidth={1 / viewport.scale} />
    </Svg>}
    <View {...responder.panHandlers} style={StyleSheet.absoluteFill} accessible accessibilityRole="image" accessibilityLabel={`拼豆图纸画布，${pattern.width} 列、${pattern.height} 行。单指拖动，双指缩放，轻点查看色号。`} />
    {completed.length > 0 && <View pointerEvents="none" style={s.completedLegend}><Text style={s.completedLegendText}>✓ 已完成 · {completed.length} 格</Text></View>}
    <View style={s.tools} pointerEvents="box-none"><GlassSurface style={s.toolSurface}>
      <IconButton icon="plus" label="放大图纸" disabled={locked || viewport.scale >= 80} onPress={() => zoom(1.5)} />
      <IconButton icon="minus" label="缩小图纸" disabled={locked} onPress={() => zoom(1 / 1.5)} />
      <IconButton icon="fit" label="查看全图" disabled={locked} onPress={() => change(fitRegion({ x: 0, y: 0, width: pattern.width, height: pattern.height }, size), true)} />
      <IconButton icon="target" label="定位当前区域" disabled={locked} onPress={() => change(fitRegion(region, size), true)} />
      <IconButton icon={locked ? 'lock' : 'unlock'} label={locked ? '解锁视图' : '锁定视图'} active={locked} onPress={props.onLock} />
    </GlassSurface></View>
    <View pointerEvents="none" style={s.readout}><Text style={s.readoutText}>{locked ? '视图已锁定' : viewport.scale < 26 ? '双指放大查看色号' : '轻点格子查看位置'} · {Math.round(viewport.scale)} px / 格</Text></View>
  </View>;
});
const s = StyleSheet.create({ completedLegend: { position: 'absolute', left: 10, top: 12, backgroundColor: '#edf5eff5', borderColor: '#b7cdbf', borderWidth: StyleSheet.hairlineWidth, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7 }, completedLegendText: { fontSize: 11, color: '#355d49', fontWeight: '600' }, host: { flex: 1, minHeight: 150, backgroundColor: '#e9edf2', overflow: 'hidden' }, tools: { position: 'absolute', right: 12, top: 12 }, toolSurface: { borderRadius: 23, paddingVertical: 3 }, readout: { position: 'absolute', bottom: 9, left: 10, backgroundColor: '#fffffff0', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 }, readoutText: { fontSize: 10, color: '#606b79' } });

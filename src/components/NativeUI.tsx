import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle, } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { Icon, type IconName } from './Icon';
const Preferences = createContext({ reduceMotion: true, reduceTransparency: true, liquidGlass: false });

function glassCapabilities() {
    if (Platform.OS !== 'ios') return { design: false, api: false };
    try {
        return { design: isLiquidGlassAvailable(), api: isGlassEffectAPIAvailable() };
    } catch {
        // A development client may predate the native module; keep navigation usable.
        return { design: false, api: false };
    }
}

export function selectionFeedback() {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
        void Haptics.selectionAsync().catch(() => {});
    }
}

export function NativePreferences({ children }: PropsWithChildren) {
    const [capabilities] = useState(glassCapabilities);
    const [reduceMotion, setReduceMotion] = useState(true);
    const [reduceTransparency, setReduceTransparency] = useState(true);
    useEffect(() => {
        let active = true;
        void AccessibilityInfo.isReduceMotionEnabled().then(value => {
            if (active)
                setReduceMotion(value);
        }).catch(() => { });
        const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
        if (Platform.OS !== 'ios')
            setReduceTransparency(false);
        else
            void AccessibilityInfo.isReduceTransparencyEnabled().then(value => {
                if (active)
                    setReduceTransparency(value);
            }).catch(() => { });
        const transparency = Platform.OS === 'ios'
            ? AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduceTransparency)
            : undefined;
        return () => { active = false; motion.remove(); transparency?.remove(); };
    }, []);
    const liquidGlass = capabilities.design && capabilities.api && !reduceTransparency;
    useEffect(() => {
        if (__DEV__) console.info('[appearance]', JSON.stringify({ platform: Platform.OS,
            glassDesign: capabilities.design, glassAPI: capabilities.api,
            reduceMotion, reduceTransparency, liquidGlass }));
    }, [capabilities, reduceMotion, reduceTransparency, liquidGlass]);
    return <Preferences.Provider value={{ reduceMotion, reduceTransparency, liquidGlass }}>{children}</Preferences.Provider>;
}
export const useNativePreferences = () => useContext(Preferences);
export function GlassSurface({ children, style, interactive = false }: PropsWithChildren<{
    style?: StyleProp<ViewStyle>;
    interactive?: boolean;
}>) {
    const { liquidGlass, reduceMotion } = useNativePreferences();
    if (liquidGlass) return <GlassView style={style} glassEffectStyle="regular"
        colorScheme="light" isInteractive={interactive && !reduceMotion}>{children}</GlassView>;
    return <View style={[styles.solid, style]}>{children}</View>;
}
export function Touch({ children, style, disabled, onPressIn, onPressOut, ...props }: Omit<PressableProps, 'style' | 'children'> & {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}) {
    const { reduceMotion } = useNativePreferences();
    const scale = useRef(new Animated.Value(1)).current;
    const animate = (toValue: number) => {
        scale.stopAnimation();
        if (reduceMotion)
            scale.setValue(1);
        else
            Animated.spring(scale, { toValue, stiffness: 420, damping: 28, mass: 0.7, useNativeDriver: true }).start();
    };
    useEffect(() => { if (reduceMotion || disabled) {
        scale.stopAnimation();
        scale.setValue(1);
    } }, [reduceMotion, disabled, scale]);
    return <Animated.View style={{ transform: [{ scale }] }}>
    <Pressable {...props} disabled={disabled} accessibilityState={{ ...props.accessibilityState, disabled: !!disabled }} onPressIn={event => { animate(0.97); onPressIn?.(event); }} onPressOut={event => { animate(1); onPressOut?.(event); }} style={({ pressed }) => [style, disabled && styles.disabled, pressed && styles.pressed]}>
      {children}
    </Pressable>
  </Animated.View>;
}
export type Tab = 'create' | 'library' | 'cards' | 'profile';
const tabs: {
    key: Tab;
    label: string;
    icon: IconName;
}[] = [
    { key: 'create', label: '制作', icon: 'image' },
    { key: 'library', label: '图纸', icon: 'grid' },
    { key: 'cards', label: '色卡', icon: 'palette' },
    { key: 'profile', label: '我的', icon: 'person' },
];
export function Navigation({ selected, onSelect }: {
    selected: Tab;
    onSelect: (tab: Tab) => void;
}) {
    const insets = useSafeAreaInsets();
    const { reduceMotion } = useNativePreferences();
    const [width, setWidth] = useState(0);
    const offset = useRef(new Animated.Value(0)).current;
    const index = tabs.findIndex(tab => tab.key === selected);
    useEffect(() => {
        offset.stopAnimation();
        const toValue = index * width / tabs.length;
        if (reduceMotion)
            offset.setValue(toValue);
        else
            Animated.spring(offset, { toValue, stiffness: 320, damping: 30, mass: 1, useNativeDriver: true }).start();
    }, [index, width, reduceMotion, offset]);
    return <View pointerEvents="box-none" style={[styles.dock, {
                bottom: Math.max(insets.bottom, 12), left: 22 + insets.left, right: 22 + insets.right,
            }]}>
    <GlassSurface style={styles.dockSurface}>
      <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={styles.tabRow}>
        {width > 0 && <Animated.View pointerEvents="none" style={[styles.selection, {
                    width: width / tabs.length, transform: [{ translateX: offset }],
                }]}><View style={styles.selectionFill}/></Animated.View>}
        {tabs.map(tab => <Pressable key={tab.key} accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{ selected: selected === tab.key }} style={styles.tab} onPress={() => { if (selected !== tab.key) {
            selectionFeedback(); onSelect(tab.key); } }}>
          <Icon name={tab.icon} size={22} color={selected === tab.key ? '#a34d2b' : '#555b63'}/>
          <Text style={[styles.tabText, selected === tab.key && styles.activeText]}>{tab.label}</Text>
        </Pressable>)}
      </View>
    </GlassSurface>
  </View>;
}
export function PageTransition({ children, page }: PropsWithChildren<{
    page: string;
}>) {
    const { reduceMotion } = useNativePreferences();
    const y = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        y.stopAnimation();
        if (reduceMotion) {
            y.setValue(0);
            return;
        }
        y.setValue(8);
        Animated.spring(y, { toValue: 0, stiffness: 280, damping: 28, useNativeDriver: true }).start();
    }, [page, reduceMotion, y]);
    return <Animated.View style={{ transform: [{ translateY: y }] }}>{children}</Animated.View>;
}
const styles = StyleSheet.create({
    solid: { backgroundColor: '#fff', borderWidth: StyleSheet.hairlineWidth, borderColor: '#d8dadd' },
    disabled: { opacity: 0.4 }, pressed: { opacity: 0.78 },
    dock: { position: 'absolute', shadowColor: '#27303c', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
    dockSurface: { borderRadius: 34, padding: 5 },
    tabRow: { flexDirection: 'row', height: 58 },
    tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
    tabText: { fontSize: 11, fontWeight: '500', color: '#555b63' },
    activeText: { color: '#a34d2b', fontWeight: '700' },
    selection: { position: 'absolute', top: 0, bottom: 0 },
    selectionFill: { flex: 1, borderRadius: 29, backgroundColor: '#b7613518', marginHorizontal: 1 },
});

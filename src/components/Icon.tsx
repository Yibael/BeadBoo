import Svg, { Path, Circle, Rect } from 'react-native-svg';
export type IconName = 'plus' | 'image' | 'grid' | 'palette' | 'sliders' | 'download' | 'back' | 'next' | 'close' | 'undo' | 'sparkles' | 'check' | 'brush' | 'leaf' | 'info' | 'person' | 'minus' | 'fit' | 'target' | 'lock' | 'unlock' | 'more' | 'trash';
const paths: Partial<Record<IconName, string>> = {
    person: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2',
    minus: 'M5 12h14', fit: 'M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6',
    target: 'M12 2v4m0 12v4M2 12h4m12 0h4M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
    lock: 'M5 10h14v11H5zM8 10V7a4 4 0 0 1 8 0v3', unlock: 'M5 10h14v11H5zM8 10V7a4 4 0 0 1 8 0',
    more: 'M4 12h.01M12 12h.01M20 12h.01', trash: 'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7',
    info: 'M12 8h.01M12 11v5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0', plus: 'M12 5v14M5 12h14', image: 'M4 17l5-5 4 4 3-3 4 4M4 4h16v16H4z',
    sliders: 'M5 3v6m0 4v8M12 3v10m0 4v4M19 3v3m0 4v11M2 9h6m1 8h6m1-11h6',
    download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5', back: 'M15 5l-7 7 7 7', next: 'm9 5 7 7-7 7', close: 'm5 5 14 14M19 5 5 19',
    undo: 'M8 5 3 10l5 5M3 10h10a6 6 0 0 1 0 12', sparkles: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z',
    check: 'm5 12 4 4L19 6', brush: 'm15 3 6 6-11 11H4v-6zM12 6l6 6', leaf: 'M20 3C5 1 0 12 6 18S23 15 20 3ZM6 18l9-10'
};
export function Icon({ name, size = 20, color = '#7b8972' }: {
    name: IconName;
    size?: number;
    color?: string;
}) {
    return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
  {name === 'grid' ? <>{[3, 14].flatMap(x => [3, 14].map(y => <Rect key={`${x}-${y}`} x={x} y={y} width={7} height={7} rx={1.5}/>))}</> : name === 'palette' ? <><Path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 0-4h-1a2 2 0 0 1 0-4h5c6 0 3-10-5-10Z"/><Circle cx={7} cy={10} r={.7}/><Circle cx={10} cy={6.5} r={.7}/><Circle cx={15} cy={7} r={.7}/></> : <Path d={paths[name]}/>}
 </Svg>;
}

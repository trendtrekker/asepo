import Svg, { Circle, Path, Rect } from 'react-native-svg';

type IconProps = {
  color: string;
  size?: number;
};

export function ChevronLeft({ color, size = 16 }: IconProps) {
  return (
    <Svg width={(size * 10) / 16} height={size} viewBox="0 0 10 16">
      <Path
        d="M8 1L2 8l6 7"
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function Close({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14">
      <Path d="M1 1l12 12M13 1L1 13" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

/** Filled circle with a white tick — the multi-select affordance. */
export function CheckCircle({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      <Circle cx={9} cy={9} r={9} fill={color} />
      <Path
        d="M5 9l3 3 5-6"
        stroke="#fff"
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Tinted circle with an accent tick — used in benefit lists. */
export function CheckCircleTinted({
  color,
  tint,
  size = 18,
}: IconProps & { tint: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      <Circle cx={9} cy={9} r={9} fill={tint} />
      <Path
        d="M5 9l3 3 5-6"
        stroke={color}
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function Check({ color, size = 12 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12">
      <Path
        d="M2 6l3 3 5-6"
        stroke={color}
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function Search({ color, size = 15 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 15 15">
      <Circle cx={6.5} cy={6.5} r={5.2} stroke={color} strokeWidth={1.6} fill="none" />
      <Path d="M10.3 10.3L14 14" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function Eye({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={(size * 14) / 20} viewBox="0 0 20 14">
      <Path
        d="M1 7C3 3 6.5 1 10 1s7 2 9 6c-2 4-5.5 6-9 6S3 11 1 7z"
        stroke={color}
        strokeWidth={1.4}
        fill="none"
      />
      <Circle cx={10} cy={7} r={2.6} stroke={color} strokeWidth={1.4} fill="none" />
    </Svg>
  );
}

export function Heart({
  fill,
  stroke,
  size = 13,
  strokeWidth = 0.8,
}: {
  fill: string;
  stroke: string;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <Svg width={size} height={(size * 12) / 13} viewBox="0 0 13 12">
      <Path
        d="M6.5 11C3 8.6 1 6.6 1 4.3 1 2.5 2.4 1 4.2 1c1 0 1.9.5 2.3 1.3C6.9 1.5 7.8 1 8.8 1 10.6 1 12 2.5 12 4.3 12 6.6 10 8.6 6.5 11z"
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
}

export function GridIcon({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14">
      <Rect x={0} y={0} width={6} height={6} rx={1.5} fill={color} />
      <Rect x={8} y={0} width={6} height={6} rx={1.5} fill={color} />
      <Rect x={0} y={8} width={6} height={6} rx={1.5} fill={color} />
      <Rect x={8} y={8} width={6} height={6} rx={1.5} fill={color} />
    </Svg>
  );
}

export function Sliders({ color, size = 15 }: IconProps) {
  return (
    <Svg width={size} height={(size * 12) / 15} viewBox="0 0 15 12">
      <Path d="M0 1h15M3 6h9M6 11h3" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

export function Refresh({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Path
        d="M14 8a6 6 0 11-1.8-4.3M14 2v3.6h-3.6"
        stroke={color}
        strokeWidth={1.6}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function Clock({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14">
      <Circle cx={7} cy={7} r={6} stroke={color} strokeWidth={1.3} fill="none" />
      <Path d="M7 4v3l2 2" stroke={color} strokeWidth={1.3} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

/** Six-dot drag handle on editable ingredient rows. */
export function DragHandle({ color, size = 18 }: IconProps) {
  return (
    <Svg width={(size * 12) / 18} height={size} viewBox="0 0 12 18" opacity={0.4}>
      <Circle cx={3} cy={4} r={1.4} fill={color} />
      <Circle cx={9} cy={4} r={1.4} fill={color} />
      <Circle cx={3} cy={9} r={1.4} fill={color} />
      <Circle cx={9} cy={9} r={1.4} fill={color} />
      <Circle cx={3} cy={14} r={1.4} fill={color} />
      <Circle cx={9} cy={14} r={1.4} fill={color} />
    </Svg>
  );
}

export function MoreHorizontal({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={(size * 4) / 16} viewBox="0 0 16 4">
      <Circle cx={2} cy={2} r={1.8} fill={color} />
      <Circle cx={8} cy={2} r={1.8} fill={color} />
      <Circle cx={14} cy={2} r={1.8} fill={color} />
    </Svg>
  );
}

export function ImagePlaceholderIcon({ color, size = 30 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30">
      <Rect x={4} y={7} width={22} height={17} rx={3} stroke={color} strokeWidth={1.8} fill="none" />
      <Circle cx={11} cy={13.5} r={2.2} stroke={color} strokeWidth={1.6} fill="none" />
      <Path d="M4 21l6-6 5 5 4-4 7 7" stroke={color} strokeWidth={1.6} fill="none" />
    </Svg>
  );
}

export function ErrorCircle({ color, size = 44 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 44 44">
      <Circle cx={22} cy={22} r={20} stroke={color} strokeWidth={2.4} fill="none" />
      <Path d="M15 15l14 14M29 15L15 29" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

export function BigCheck({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M5 12l5 5 9-11"
        stroke={color}
        strokeWidth={2.4}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* --- Tab bar icons --- */

export function HomeIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"
        stroke={color}
        strokeWidth={1.8}
        fill="none"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BookIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M4 4.5A1.5 1.5 0 015.5 3H19v16H5.5A1.5 1.5 0 004 20.5z"
        stroke={color}
        strokeWidth={1.8}
        fill="none"
        strokeLinejoin="round"
      />
      <Path d="M4 20.5A1.5 1.5 0 015.5 19H19v2H5.5A1.5 1.5 0 014 20.5z" stroke={color} strokeWidth={1.8} fill="none" />
    </Svg>
  );
}

export function CalendarIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3} y={5} width={18} height={16} rx={2.5} stroke={color} strokeWidth={1.8} fill="none" />
      <Path d="M3 10h18M8 3v4M16 3v4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function CartIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M3 4h2.2l2.2 11h10.2l2.2-8H6"
        stroke={color}
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={9} cy={19} r={1.6} fill={color} />
      <Circle cx={17} cy={19} r={1.6} fill={color} />
    </Svg>
  );
}

export function PersonIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={1.8} fill="none" />
      <Path
        d="M4.5 21c0-4.1 3.4-6.5 7.5-6.5s7.5 2.4 7.5 6.5"
        stroke={color}
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function PlusIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

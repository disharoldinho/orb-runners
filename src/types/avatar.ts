export type BodyType = 'bean' | 'blob' | 'bot' | 'critter';

export type EyeType = 'googly' | 'happy' | 'sparkle' | 'determined' | 'shades' | 'derpy';

export type MouthType = 'cat' | 'grin' | 'shock' | 'tongue' | 'mustache';

export type HatType = 'none' | 'propeller' | 'crown' | 'wizard' | 'viking' | 'chef' | 'halo';

export type OrbShellStyle = 'clear' | 'neon' | 'candy' | 'starlight';

export interface AvatarConfig {
  name: string;
  bodyType: BodyType;
  eyeType: EyeType;
  mouthType: MouthType;
  hatType: HatType;
  primaryColor: string;
  secondaryColor: string;
  orbStyle: OrbShellStyle;
}

export interface CosmeticItem<T extends string> {
  id: T;
  label: string;
  icon: string;
  requiredMedals?: number; // Number of total medals (any tier) or gold medals to unlock
  description?: string;
}

export const BODY_OPTIONS: CosmeticItem<BodyType>[] = [
  { id: 'bean', label: 'Chubby Bean', icon: '🫘', description: 'Classic balanced capsule buddy' },
  { id: 'blob', label: 'Squishy Blob', icon: '💧', description: 'Round bouncy jelly silhouette' },
  { id: 'bot', label: 'Boxy Bot', icon: '🤖', description: 'Cute retro arcade robot torso' },
  { id: 'critter', label: 'Forest Critter', icon: '🐰', description: 'Includes floppy upright ears!' },
];

export const EYE_OPTIONS: CosmeticItem<EyeType>[] = [
  { id: 'googly', label: 'Googly Eyes', icon: '👀' },
  { id: 'happy', label: 'Happy Arcs', icon: '😊' },
  { id: 'sparkle', label: 'Anime Sparkle', icon: '✨' },
  { id: 'determined', label: 'Speedrunner', icon: '😠' },
  { id: 'derpy', label: 'Derpy Cross', icon: '🤪' },
  { id: 'shades', label: 'Deal With It', icon: '😎', requiredMedals: 2 },
];

export const MOUTH_OPTIONS: CosmeticItem<MouthType>[] = [
  { id: 'cat', label: 'Cat Whiskers :3', icon: '🐱' },
  { id: 'grin', label: 'Big Cheesin', icon: '😁' },
  { id: 'shock', label: 'Whoa :O', icon: '😮' },
  { id: 'tongue', label: 'Blep Tongue', icon: '😛' },
  { id: 'mustache', label: 'Sir Mustache', icon: '🥸', requiredMedals: 3 },
];

export const HAT_OPTIONS: CosmeticItem<HatType>[] = [
  { id: 'none', label: 'No Hat', icon: '🚫' },
  { id: 'propeller', label: 'Propeller Cap', icon: '🚁' },
  { id: 'chef', label: 'Chef Toque', icon: '👨‍🍳' },
  { id: 'wizard', label: 'Starlight Wizard', icon: '🧙', requiredMedals: 1 },
  { id: 'viking', label: 'Viking Horns', icon: '⚔️', requiredMedals: 3 },
  { id: 'crown', label: 'Royal Crown', icon: '👑', requiredMedals: 5 },
  { id: 'halo', label: 'Grandmaster Halo', icon: '😇', requiredMedals: 8 },
];

export const ORB_STYLE_OPTIONS: CosmeticItem<OrbShellStyle>[] = [
  { id: 'clear', label: 'Crystal Glass', icon: '🔮' },
  { id: 'candy', label: 'Arcade Stripes', icon: '🍬' },
  { id: 'neon', label: 'Cyber Plasma', icon: '⚡', requiredMedals: 2 },
  { id: 'starlight', label: 'Golden Champ', icon: '🌟', requiredMedals: 6 },
];

export const COLOR_SWATCHES = [
  '#FF5964', // Coral Red
  '#FF9F1C', // Arcade Orange
  '#FFE74C', // Sunny Yellow
  '#2EC4B6', // Mint Teal
  '#35A7FF', // Sky Blue
  '#8338EC', // Electric Purple
  '#FF66B3', // Bubblegum Pink
  '#6BF178', // Slime Green
  '#F8F9FA', // Cloud White
  '#2B2D42', // Midnight Slate
];

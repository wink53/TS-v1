// Shared types for sprite components

// Re-export DetectionMode from analyzer
export type { DetectionMode } from '../../utils/spriteSheetAnalyzer';
export type Direction = 'up' | 'down' | 'left' | 'right';

export type Animation = {
    name: string;
    action_type: string;
    direction: Direction | null;
    start_x: number;
    start_y: number;
    frame_start: number;
    frame_count: number;
    frame_rate: number | null;
};

export type SpriteState = {
    name: string;
    description: string;
    tags: string[];
    file: File | null;
    frameCount: number;
    frameWidth: number;
    frameHeight: number;
    hitboxOffsetX: number;
    hitboxOffsetY: number;
    hitboxWidth: number;
    hitboxHeight: number;
};

export const DEFAULT_SPRITE_STATE: SpriteState = {
    name: '',
    description: '',
    tags: [],
    file: null,
    frameCount: 1,
    frameWidth: 32,
    frameHeight: 32,
    hitboxOffsetX: 8,
    hitboxOffsetY: 40,
    hitboxWidth: 16,
    hitboxHeight: 24,
};

export const ACTION_TYPES = ['walk', 'run', 'attack', 'idle', 'jump', 'die', 'cast', 'hurt', 'block'] as const;
export const DIRECTIONS: (Direction | null)[] = [null, 'up', 'down', 'left', 'right'];

export const DEFAULT_ANIMATION: Animation = {
    name: '',
    action_type: 'idle',
    direction: null,
    start_x: 0,
    start_y: 0,
    frame_start: 0,
    frame_count: 1,
    frame_rate: null
};

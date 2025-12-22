// Sprite Sheet Types matching backend Motoko definitions

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Animation {
    name: string;              // e.g., "walk_down", "attack_left"
    action_type: string;       // e.g., "walk", "attack", "jump"
    direction?: Direction;     // Optional direction
    start_x: number;           // X pixel coordinate where this animation starts
    start_y: number;           // Y pixel coordinate where this animation starts
    frame_start: number;       // Starting frame index (for backward compatibility)
    frame_count: number;       // Number of frames for this animation
    frame_rate?: number;       // Optional FPS for animation
}

export interface SpriteSheet {
    id: string;                // Unique sheet ID
    name: string;              // User-friendly name
    blob_id: string;           // Reference to uploaded image
    frame_width: number;
    frame_height: number;
    total_frames: number;      // Total frames in the sheet
    animations: Animation[];   // Multiple animations defined on this sheet
    created_at: bigint;
    updated_at: bigint;
}

// Predefined action types
export const PREDEFINED_ACTION_TYPES = [
    // Movement
    'walk', 'run', 'sprint', 'crouch', 'crawl',
    // Combat
    'attack', 'defend', 'block', 'dodge', 'cast',
    // States
    'idle', 'death', 'hurt', 'stunned',
    // Interactions
    'interact', 'pickup', 'use', 'throw',
    // Emotions
    'celebrate', 'taunt', 'emote',
] as const;

export type PredefinedActionType = typeof PREDEFINED_ACTION_TYPES[number];

/**
 * NPC Core Type Definitions
 * 
 * NPCs are composed of modules and state. Behavior comes from modules,
 * the core system only handles state management and routing.
 */

// =============================================================================
// NPC State Machine
// =============================================================================

/**
 * NPC states ordered by priority (highest first):
 * - combat (4): In active combat
 * - alert (3): Aware of threat, not yet fighting
 * - interacting (2): Talking to player
 * - idle (1): Default state
 * - disabled (0): Cannot act (dead, frozen, etc.)
 */
export type NPCState = 'idle' | 'interacting' | 'alert' | 'combat' | 'disabled';

/** Priority values for state machine decisions */
export const STATE_PRIORITY: Record<NPCState, number> = {
    combat: 4,
    alert: 3,
    interacting: 2,
    idle: 1,
    disabled: 0,
};

/** Direction an NPC can face */
export type NPCDirection = 'up' | 'down' | 'left' | 'right';

// =============================================================================
// NPC Core Definition
// =============================================================================

/** Optional metadata attached to an NPC */
export interface NPCMetadata {
    name?: string;
    faction?: string;
    tags?: string[];
}

/** Tile position on the game map */
export interface TilePosition {
    x: number;
    y: number;
}

/** Core NPC structure - behavior comes from modules, not directly from NPC */
export interface NPC {
    id: string;
    position: TilePosition;
    direction: NPCDirection;
    state: NPCState;
    modules: NPCModuleInstance[];
    metadata: NPCMetadata;
}

// =============================================================================
// Module System Types
// =============================================================================

/** Module category types */
export type MovementType = 'static' | 'patrol' | 'wander' | 'flee';
export type InteractionType = 'dialogue' | 'shop' | 'crafting';
export type CombatType = 'none' | 'basic';
export type AuthorityType = 'none' | 'guard';

/** Base module instance - extended by specific modules */
export interface NPCModuleInstance {
    category: 'movement' | 'interaction' | 'combat' | 'authority';
    type: string;
    handlesStates: NPCState[];
}

/** Request to change NPC state */
export interface StateChangeRequest {
    requestedState: NPCState;
    priority: number;
}

/** Result of an interaction attempt */
export interface InteractionResult {
    handled: boolean;
    response?: string;
    newState?: NPCState;
}

// =============================================================================
// Movement Modules
// =============================================================================

export interface MovementModule extends NPCModuleInstance {
    category: 'movement';
    type: MovementType;
}

export interface StaticMovementModule extends MovementModule {
    type: 'static';
}

export interface PatrolMovementModule extends MovementModule {
    type: 'patrol';
    waypoints: TilePosition[];
    currentWaypointIndex: number;
}

export interface WanderMovementModule extends MovementModule {
    type: 'wander';
    radius: number;
    origin: TilePosition;
}

export interface FleeMovementModule extends MovementModule {
    type: 'flee';
    fleeFromTags: string[];
}

// =============================================================================
// Dialogue System Types
// =============================================================================

/** A single choice in a dialogue */
export interface DialogueChoice {
    text: string;           // Choice button text (e.g., "Yes, please")
    nextLineIndex?: number; // Jump to specific line (for branching)
}

/** A single line of dialogue */
export interface DialogueLine {
    speaker?: string;           // Speaker name (defaults to NPC name if not set)
    text: string;               // The dialogue text
    choices?: DialogueChoice[]; // Optional choices at this line
    isEnding?: boolean;         // If true, dialogue ends after this line
}

/** A complete dialogue script with multiple lines */
export interface DialogueScript {
    lines: DialogueLine[];
}

/** Active dialogue state during interaction */
export interface DialogueState {
    npcId: string;
    script: DialogueScript;
    currentLineIndex: number;
}

// =============================================================================
// Interaction Modules
// =============================================================================

export interface InteractionModule extends NPCModuleInstance {
    category: 'interaction';
    type: InteractionType;
}

export interface DialogueInteractionModule extends InteractionModule {
    type: 'dialogue';
    dialogueText?: string;       // Simple single-line dialogue (legacy)
    dialogueScript?: DialogueScript; // Multi-line dialogue script
}

export interface ShopInteractionModule extends InteractionModule {
    type: 'shop';
    shopId?: string; // Placeholder for future shop system
}

export interface CraftingInteractionModule extends InteractionModule {
    type: 'crafting';
    craftingType?: string; // Placeholder for future crafting system
}

// =============================================================================
// Combat Modules
// =============================================================================

export interface CombatModule extends NPCModuleInstance {
    category: 'combat';
    type: CombatType;
}

export interface NoCombatModule extends CombatModule {
    type: 'none';
}

export interface BasicCombatModule extends CombatModule {
    type: 'basic';
    // Placeholder for future combat stats
}

// =============================================================================
// Authority Modules
// =============================================================================

export interface AuthorityModule extends NPCModuleInstance {
    category: 'authority';
    type: AuthorityType;
}

export interface NoAuthorityModule extends AuthorityModule {
    type: 'none';
}

export interface GuardAuthorityModule extends AuthorityModule {
    type: 'guard';
    guardRadius?: number; // Placeholder for future guard logic
}

// =============================================================================
// NPC Configuration (for creating NPCs)
// =============================================================================

export interface NPCConfig {
    id?: string; // Auto-generated if not provided
    position: TilePosition;
    direction?: NPCDirection;
    initialState?: NPCState;
    modules: NPCModuleInstance[];
    metadata?: NPCMetadata;
}

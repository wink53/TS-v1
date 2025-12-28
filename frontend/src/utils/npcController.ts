/**
 * NPC Controller
 * 
 * Core logic for managing NPCs - state machine, interaction routing,
 * and module coordination. NPCs are data, this module provides the logic.
 */

import {
    NPC,
    NPCConfig,
    NPCState,
    NPCDirection,
    NPCModuleInstance,
    StateChangeRequest,
    InteractionResult,
    STATE_PRIORITY,
    TilePosition,
} from '../types/npc';

// =============================================================================
// NPC Factory
// =============================================================================

let npcIdCounter = 0;

/**
 * Create a new NPC from configuration.
 * Modules define behavior - the NPC is just data.
 */
export function createNPC(config: NPCConfig): NPC {
    return {
        id: config.id || `npc_${++npcIdCounter}`,
        position: { ...config.position },
        direction: config.direction || 'down',
        state: config.initialState || 'idle',
        modules: [...config.modules],
        metadata: config.metadata ? { ...config.metadata } : {},
    };
}

// =============================================================================
// State Machine
// =============================================================================

/**
 * Check if a state change request should be accepted based on priority.
 * Higher priority states override lower priority states.
 */
export function canChangeState(
    currentState: NPCState,
    requestedState: NPCState
): boolean {
    // Disabled state can only be exited by explicit reset
    if (currentState === 'disabled') {
        return false;
    }

    return STATE_PRIORITY[requestedState] >= STATE_PRIORITY[currentState];
}

/**
 * Request a state change for an NPC.
 * Returns a new NPC with the state changed if allowed.
 */
export function requestStateChange(
    npc: NPC,
    request: StateChangeRequest
): NPC {
    if (!canChangeState(npc.state, request.requestedState)) {
        return npc; // Reject - current state has higher priority
    }

    return {
        ...npc,
        state: request.requestedState,
    };
}

/**
 * Force a state change, ignoring priority rules.
 * Use sparingly - for things like death, cutscenes, etc.
 */
export function forceStateChange(npc: NPC, newState: NPCState): NPC {
    return {
        ...npc,
        state: newState,
    };
}

// =============================================================================
// Module Management
// =============================================================================

/**
 * Add a module to an NPC.
 * Returns a new NPC with the module added.
 */
export function addModule(npc: NPC, module: NPCModuleInstance): NPC {
    // Check if a module of this category already exists
    const existingIndex = npc.modules.findIndex(
        (m: NPCModuleInstance) => m.category === module.category
    );

    if (existingIndex >= 0) {
        // Replace existing module of same category
        const newModules = [...npc.modules];
        newModules[existingIndex] = module;
        return { ...npc, modules: newModules };
    }

    // Add new module
    return {
        ...npc,
        modules: [...npc.modules, module],
    };
}

/**
 * Remove a module from an NPC by category.
 */
export function removeModule(
    npc: NPC,
    category: NPCModuleInstance['category']
): NPC {
    return {
        ...npc,
        modules: npc.modules.filter((m: NPCModuleInstance) => m.category !== category),
    };
}

/**
 * Get a module by category.
 */
export function getModule<T extends NPCModuleInstance>(
    npc: NPC,
    category: NPCModuleInstance['category']
): T | undefined {
    return npc.modules.find((m: NPCModuleInstance) => m.category === category) as T | undefined;
}

// =============================================================================
// Interaction Routing
// =============================================================================

/**
 * Route a player interaction to the NPC's modules.
 * Modules are checked in order; first handler wins.
 */
export function interactWithNPC(npc: NPC): InteractionResult {
    // Cannot interact with disabled NPCs
    if (npc.state === 'disabled') {
        return { handled: false };
    }

    // Cannot interact with NPCs in combat
    if (npc.state === 'combat') {
        return { handled: false };
    }

    // Find an interaction module
    const interactionModule = getModule(npc, 'interaction');

    if (!interactionModule) {
        // No interaction module - safe fallback
        return { handled: false };
    }

    // Check if module handles current state
    if (!interactionModule.handlesStates.includes(npc.state) &&
        !interactionModule.handlesStates.includes('idle')) {
        return { handled: false };
    }

    // Route to specific interaction handler
    return handleInteraction(npc, interactionModule);
}

/**
 * Handle interaction based on module type.
 * Returns interaction result with optional state change.
 */
function handleInteraction(
    npc: NPC,
    module: NPCModuleInstance
): InteractionResult {
    switch (module.type) {
        case 'dialogue': {
            // Simple dialogue - return placeholder text
            const dialogueModule = module as { dialogueText?: string } & NPCModuleInstance;
            return {
                handled: true,
                response: dialogueModule.dialogueText || 'Hello, traveler!',
                newState: 'interacting',
            };
        }

        case 'shop': {
            return {
                handled: true,
                response: 'Welcome to my shop!',
                newState: 'interacting',
            };
        }

        case 'crafting': {
            return {
                handled: true,
                response: 'What would you like me to craft?',
                newState: 'interacting',
            };
        }

        default:
            return { handled: false };
    }
}

// =============================================================================
// NPC Updates (Tick)
// =============================================================================

/** Player position for NPC awareness */
interface PlayerContext {
    x: number;  // Tile position
    y: number;
}

/**
 * Update an NPC for one game tick.
 * Handles movement, state triggers, and module behaviors.
 */
export function updateNPC(
    npc: NPC,
    delta: number,
    playerContext?: PlayerContext
): NPC {
    // Disabled NPCs don't update
    if (npc.state === 'disabled') {
        return npc;
    }

    let updatedNpc = { ...npc };

    // Check for state triggers based on player proximity
    if (playerContext) {
        updatedNpc = checkStateTriggers(updatedNpc, playerContext);
    }

    // Process movement if not interacting or in higher priority state
    if (updatedNpc.state === 'idle' || updatedNpc.state === 'alert') {
        updatedNpc = processMovement(updatedNpc, delta);
    }

    return updatedNpc;
}

/**
 * Check if NPC should change state based on player proximity.
 */
function checkStateTriggers(npc: NPC, player: PlayerContext): NPC {
    const distance = getDistanceToPlayer(npc, player);

    // Check for combat trigger (hostile NPCs)
    const combatModule = getModule(npc, 'combat');
    if (combatModule && combatModule.type === 'basic') {
        const combatRange = 2; // tiles
        if (distance <= combatRange && npc.state !== 'combat') {
            // Enter combat - highest priority
            return requestStateChange(npc, {
                requestedState: 'combat',
                priority: STATE_PRIORITY.combat
            });
        } else if (distance > combatRange + 1 && npc.state === 'combat') {
            // Disengage from combat
            return forceStateChange(npc, 'idle');
        }
    }

    // Check for alert trigger (guard NPCs)
    const authorityModule = getModule(npc, 'authority');
    if (authorityModule && authorityModule.type === 'guard') {
        const guardRadius = (authorityModule as { guardRadius?: number }).guardRadius || 3;
        if (distance <= guardRadius && npc.state === 'idle') {
            // Go alert
            return requestStateChange(npc, {
                requestedState: 'alert',
                priority: STATE_PRIORITY.alert
            });
        } else if (distance > guardRadius + 1 && npc.state === 'alert') {
            // Stand down
            return forceStateChange(npc, 'idle');
        }
    }

    return npc;
}

/**
 * Calculate distance from NPC to player (in tiles).
 */
function getDistanceToPlayer(npc: NPC, player: PlayerContext): number {
    const dx = npc.position.x - player.x;
    const dy = npc.position.y - player.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Process NPC movement based on movement module.
 */
function processMovement(npc: NPC, delta: number): NPC {
    const movementModule = getModule(npc, 'movement');
    if (!movementModule) return npc;

    switch (movementModule.type) {
        case 'patrol':
            return processPatrolMovement(npc, movementModule, delta);
        case 'wander':
            return processWanderMovement(npc, movementModule, delta);
        case 'static':
        default:
            return npc; // No movement
    }
}

// Patrol timing - track last move time per NPC
const patrolTimers = new Map<string, number>();

/**
 * Process patrol movement - move between waypoints.
 */
function processPatrolMovement(
    npc: NPC,
    module: NPCModuleInstance,
    delta: number
): NPC {
    const patrolModule = module as {
        waypoints: TilePosition[];
        currentWaypointIndex: number
    } & NPCModuleInstance;

    if (!patrolModule.waypoints || patrolModule.waypoints.length === 0) {
        return npc;
    }

    // Get or initialize timer
    const lastMove = patrolTimers.get(npc.id) || 0;
    const moveInterval = 1000; // ms between moves
    const now = Date.now();

    if (now - lastMove < moveInterval) {
        return npc; // Not time to move yet
    }

    patrolTimers.set(npc.id, now);

    // Get current waypoint
    const waypoint = patrolModule.waypoints[patrolModule.currentWaypointIndex];

    // Check if at waypoint
    if (npc.position.x === waypoint.x && npc.position.y === waypoint.y) {
        // Move to next waypoint
        const nextIndex = (patrolModule.currentWaypointIndex + 1) % patrolModule.waypoints.length;

        // Update module with new index
        const updatedModules = npc.modules.map((m: NPCModuleInstance) =>
            m.category === 'movement'
                ? { ...patrolModule, currentWaypointIndex: nextIndex }
                : m
        );

        return { ...npc, modules: updatedModules };
    }

    // Move toward waypoint (one tile at a time)
    const newPos = { ...npc.position };
    let newDirection = npc.direction;

    if (npc.position.x < waypoint.x) {
        newPos.x++;
        newDirection = 'right';
    } else if (npc.position.x > waypoint.x) {
        newPos.x--;
        newDirection = 'left';
    } else if (npc.position.y < waypoint.y) {
        newPos.y++;
        newDirection = 'down';
    } else if (npc.position.y > waypoint.y) {
        newPos.y--;
        newDirection = 'up';
    }

    return { ...npc, position: newPos, direction: newDirection };
}

// Wander timing
const wanderTimers = new Map<string, number>();

/**
 * Process wander movement - random movement within radius.
 */
function processWanderMovement(
    npc: NPC,
    module: NPCModuleInstance,
    delta: number
): NPC {
    const wanderModule = module as {
        origin: TilePosition;
        radius: number
    } & NPCModuleInstance;

    // Get or initialize timer
    const lastMove = wanderTimers.get(npc.id) || 0;
    const moveInterval = 1500; // ms between moves (slower than patrol)
    const now = Date.now();

    if (now - lastMove < moveInterval) {
        return npc; // Not time to move yet
    }

    wanderTimers.set(npc.id, now);

    // 50% chance to move
    if (Math.random() > 0.5) {
        return npc;
    }

    // Random direction
    const directions = ['up', 'down', 'left', 'right'] as const;
    const dir = directions[Math.floor(Math.random() * 4)];

    const newPos = { ...npc.position };
    switch (dir) {
        case 'up': newPos.y--; break;
        case 'down': newPos.y++; break;
        case 'left': newPos.x--; break;
        case 'right': newPos.x++; break;
    }

    // Check if still within radius
    const dx = newPos.x - wanderModule.origin.x;
    const dy = newPos.y - wanderModule.origin.y;
    if (Math.sqrt(dx * dx + dy * dy) > wanderModule.radius) {
        return npc; // Would go out of bounds, stay put
    }

    return { ...npc, position: newPos, direction: dir };
}

/**
 * Set NPC facing direction.
 */
export function setDirection(npc: NPC, direction: NPCDirection): NPC {
    return {
        ...npc,
        direction,
    };
}

/**
 * Set NPC position.
 */
export function setPosition(npc: NPC, position: TilePosition): NPC {
    return {
        ...npc,
        position: { ...position },
    };
}

// =============================================================================
// Interaction Flow Helpers
// =============================================================================

/**
 * Complete an interaction, returning NPC to idle state.
 */
export function endInteraction(npc: NPC): NPC {
    if (npc.state !== 'interacting') {
        return npc;
    }

    return {
        ...npc,
        state: 'idle',
    };
}

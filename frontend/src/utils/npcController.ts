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

/**
 * Update an NPC for one game tick.
 * Modules can request state changes based on game logic.
 */
export function updateNPC(npc: NPC, _delta: number): NPC {
    // Disabled NPCs don't update
    if (npc.state === 'disabled') {
        return npc;
    }

    // For now, just return the NPC unchanged
    // Movement and other logic will be added when we implement module behaviors
    return npc;
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

/**
 * NPC Module Factories
 * 
 * Factory functions for creating NPC modules.
 * These make it easy to compose NPCs from reusable modules.
 */

import {
    NPCState,
    TilePosition,
    // Movement modules
    StaticMovementModule,
    PatrolMovementModule,
    WanderMovementModule,
    FleeMovementModule,
    // Interaction modules
    DialogueInteractionModule,
    ShopInteractionModule,
    CraftingInteractionModule,
    // Combat modules
    NoCombatModule,
    BasicCombatModule,
    // Authority modules
    NoAuthorityModule,
    GuardAuthorityModule,
} from '../../types/npc';

// =============================================================================
// Movement Module Factories
// =============================================================================

/** Create a static movement module - NPC stays in place */
export function createStaticMovement(): StaticMovementModule {
    return {
        category: 'movement',
        type: 'static',
        handlesStates: ['idle', 'alert'] as NPCState[],
    };
}

/** Create a patrol movement module - NPC walks between waypoints */
export function createPatrolMovement(
    waypoints: TilePosition[]
): PatrolMovementModule {
    return {
        category: 'movement',
        type: 'patrol',
        handlesStates: ['idle'] as NPCState[],
        waypoints,
        currentWaypointIndex: 0,
    };
}

/** Create a wander movement module - NPC randomly moves within radius */
export function createWanderMovement(
    origin: TilePosition,
    radius: number
): WanderMovementModule {
    return {
        category: 'movement',
        type: 'wander',
        handlesStates: ['idle'] as NPCState[],
        origin,
        radius,
    };
}

/** Create a flee movement module - NPC runs from threats */
export function createFleeMovement(
    fleeFromTags: string[] = ['player', 'hostile']
): FleeMovementModule {
    return {
        category: 'movement',
        type: 'flee',
        handlesStates: ['alert'] as NPCState[],
        fleeFromTags,
    };
}

// =============================================================================
// Interaction Module Factories
// =============================================================================

/** Create a dialogue interaction module */
export function createDialogueInteraction(
    dialogueText: string = 'Hello, traveler!'
): DialogueInteractionModule {
    return {
        category: 'interaction',
        type: 'dialogue',
        handlesStates: ['idle', 'interacting'] as NPCState[],
        dialogueText,
    };
}

/** Create a shop interaction module */
export function createShopInteraction(
    shopId?: string
): ShopInteractionModule {
    return {
        category: 'interaction',
        type: 'shop',
        handlesStates: ['idle', 'interacting'] as NPCState[],
        shopId,
    };
}

/** Create a crafting interaction module */
export function createCraftingInteraction(
    craftingType?: string
): CraftingInteractionModule {
    return {
        category: 'interaction',
        type: 'crafting',
        handlesStates: ['idle', 'interacting'] as NPCState[],
        craftingType,
    };
}

// =============================================================================
// Combat Module Factories
// =============================================================================

/** Create a non-combat module - NPC can't fight */
export function createNoCombat(): NoCombatModule {
    return {
        category: 'combat',
        type: 'none',
        handlesStates: [] as NPCState[],
    };
}

/** Create a basic combat module - placeholder for future combat */
export function createBasicCombat(): BasicCombatModule {
    return {
        category: 'combat',
        type: 'basic',
        handlesStates: ['combat', 'alert'] as NPCState[],
    };
}

// =============================================================================
// Authority Module Factories
// =============================================================================

/** Create a no-authority module - NPC has no special authority */
export function createNoAuthority(): NoAuthorityModule {
    return {
        category: 'authority',
        type: 'none',
        handlesStates: [] as NPCState[],
    };
}

/** Create a guard authority module - NPC acts as a guard */
export function createGuardAuthority(
    guardRadius: number = 5
): GuardAuthorityModule {
    return {
        category: 'authority',
        type: 'guard',
        handlesStates: ['idle', 'alert'] as NPCState[],
        guardRadius,
    };
}

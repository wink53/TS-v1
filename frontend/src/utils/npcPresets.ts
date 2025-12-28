/**
 * NPC Presets
 * 
 * Pre-configured NPCs for common use cases.
 * Shows how NPCs are just "modules + initial state".
 */

import { NPC, NPCConfig } from '../types/npc';
import { createNPC } from './npcController';
import {
    createStaticMovement,
    createPatrolMovement,
    createDialogueInteraction,
    createShopInteraction,
    createNoCombat,
    createBasicCombat,
    createNoAuthority,
    createGuardAuthority,
} from './npcModules';

// =============================================================================
// Proof of Concept NPC - "Old Man"
// =============================================================================

/**
 * Create the test "Old Man" NPC.
 * - Static movement (stays in place)
 * - Dialogue interaction ("Hello, traveler!")
 * - No combat
 * - No authority
 * 
 * This proves:
 * - Modules attach correctly
 * - State changes work (idle → interacting → idle)
 * - Interaction routing works
 */
export function createOldManNPC(
    x: number,
    y: number,
    customDialogue?: string
): NPC {
    const config: NPCConfig = {
        position: { x, y },
        direction: 'down',
        initialState: 'idle',
        modules: [
            createStaticMovement(),
            createDialogueInteraction(customDialogue || 'Hello, traveler! The road ahead is dangerous.'),
            createNoCombat(),
            createNoAuthority(),
        ],
        metadata: {
            name: 'Old Man',
            faction: 'villager',
            tags: ['friendly', 'npc'],
        },
    };

    return createNPC(config);
}

// =============================================================================
// Additional Preset NPCs
// =============================================================================

/**
 * Create a shopkeeper NPC.
 */
export function createShopkeeperNPC(
    x: number,
    y: number,
    shopId?: string
): NPC {
    const config: NPCConfig = {
        position: { x, y },
        direction: 'down',
        initialState: 'idle',
        modules: [
            createStaticMovement(),
            createShopInteraction(shopId),
            createNoCombat(),
            createNoAuthority(),
        ],
        metadata: {
            name: 'Shopkeeper',
            faction: 'merchant',
            tags: ['friendly', 'npc', 'shop'],
        },
    };

    return createNPC(config);
}

/**
 * Create a guard NPC.
 */
export function createGuardNPC(
    x: number,
    y: number,
    patrolWaypoints?: Array<{ x: number; y: number }>
): NPC {
    const config: NPCConfig = {
        position: { x, y },
        direction: 'down',
        initialState: 'idle',
        modules: [
            patrolWaypoints && patrolWaypoints.length > 0
                ? createPatrolMovement(patrolWaypoints)
                : createStaticMovement(),
            createDialogueInteraction('Move along, citizen.'),
            createBasicCombat(),
            createGuardAuthority(5),
        ],
        metadata: {
            name: 'Guard',
            faction: 'guard',
            tags: ['neutral', 'npc', 'authority'],
        },
    };

    return createNPC(config);
}

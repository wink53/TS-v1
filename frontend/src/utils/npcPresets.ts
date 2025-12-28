/**
 * NPC Presets
 * 
 * Pre-configured NPCs for common use cases.
 * Shows how NPCs are just "modules + initial state".
 */

import { NPC, NPCConfig, DialogueScript } from '../types/npc';
import { createNPC } from './npcController';
import {
    createStaticMovement,
    createPatrolMovement,
    createDialogueInteraction,
    createScriptedDialogue,
    createShopInteraction,
    createNoCombat,
    createBasicCombat,
    createNoAuthority,
    createGuardAuthority,
} from './npcModules';

// =============================================================================
// Test Dialogue Script
// =============================================================================

const OLD_MAN_DIALOGUE: DialogueScript = {
    lines: [
        { speaker: 'Old Man', text: 'Greetings, traveler.' },
        { speaker: 'Old Man', text: 'The road ahead is dangerous...' },
        {
            speaker: 'Old Man',
            text: 'Would you like some advice?',
            choices: [
                { text: 'Yes, please', nextLineIndex: 3 },
                { text: 'No thanks', nextLineIndex: 5 }
            ]
        },
        { speaker: 'Old Man', text: 'Beware the stone path! It blocks your way.' },
        { speaker: 'Old Man', text: 'Good luck on your journey, friend.', isEnding: true },
        { speaker: 'Old Man', text: 'Very well. Safe travels.', isEnding: true }
    ]
};

// =============================================================================
// Proof of Concept NPC - "Old Man"
// =============================================================================

/**
 * Create the test "Old Man" NPC.
 * - Static movement (stays in place)
 * - Scripted dialogue with choices
 * - No combat
 * - No authority
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
            // Use scripted dialogue if no custom text, otherwise simple text
            customDialogue
                ? createDialogueInteraction(customDialogue)
                : createScriptedDialogue(OLD_MAN_DIALOGUE),
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

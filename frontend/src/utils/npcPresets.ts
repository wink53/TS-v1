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
    createWanderMovement,
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
// Guard Dialogue Script
// =============================================================================

const GUARD_DIALOGUE: DialogueScript = {
    lines: [
        { speaker: 'Guard', text: 'Halt! State your business.' },
        {
            speaker: 'Guard',
            text: 'Are you a citizen of this town?',
            choices: [
                { text: 'Yes, I live here', nextLineIndex: 2 },
                { text: 'Just passing through', nextLineIndex: 4 }
            ]
        },
        { speaker: 'Guard', text: 'Very well. Keep to the main roads.' },
        { speaker: 'Guard', text: 'And stay out of trouble.', isEnding: true },
        { speaker: 'Guard', text: 'Travelers must register at the gate.' },
        { speaker: 'Guard', text: 'Move along now.', isEnding: true }
    ]
};

// =============================================================================
// Shopkeeper Dialogue Script
// =============================================================================

const SHOPKEEPER_DIALOGUE: DialogueScript = {
    lines: [
        { speaker: 'Shopkeeper', text: 'Welcome to my humble shop!' },
        { speaker: 'Shopkeeper', text: 'Take a look around. Finest goods in town!' },
        {
            speaker: 'Shopkeeper',
            text: 'Can I help you with something?',
            choices: [
                { text: 'What do you sell?', nextLineIndex: 3 },
                { text: 'Just browsing', nextLineIndex: 5 }
            ]
        },
        { speaker: 'Shopkeeper', text: 'Potions, weapons, armor... you name it!' },
        { speaker: 'Shopkeeper', text: 'Come back when you have coin!', isEnding: true },
        { speaker: 'Shopkeeper', text: 'Let me know if you need anything.', isEnding: true }
    ]
};

// =============================================================================
// Additional Preset NPCs
// =============================================================================

/**
 * Create a shopkeeper NPC with scripted dialogue.
 */
export function createShopkeeperNPC(
    x: number,
    y: number
): NPC {
    const config: NPCConfig = {
        position: { x, y },
        direction: 'down',
        initialState: 'idle',
        modules: [
            createStaticMovement(),
            createScriptedDialogue(SHOPKEEPER_DIALOGUE),
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
 * Create a guard NPC with scripted dialogue.
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
            createScriptedDialogue(GUARD_DIALOGUE),
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

/**
 * Create a hostile wanderer NPC (tests Combat state).
 * Wanders randomly and enters Combat when player is near.
 */
export function createHostileWandererNPC(
    x: number,
    y: number,
    radius: number = 2
): NPC {
    const config: NPCConfig = {
        position: { x, y },
        direction: 'down',
        initialState: 'idle',
        modules: [
            createWanderMovement({ x, y }, radius),
            createDialogueInteraction('*snarls*'),
            createBasicCombat(),
            createNoAuthority(),
        ],
        metadata: {
            name: 'Hostile',
            faction: 'enemy',
            tags: ['hostile', 'enemy'],
        },
    };

    return createNPC(config);
}

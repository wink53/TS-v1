/**
 * NPC Modules - Barrel Export
 * 
 * Re-exports all module factories for easy importing.
 */

export {
    // Movement
    createStaticMovement,
    createPatrolMovement,
    createWanderMovement,
    createFleeMovement,
    // Interaction
    createDialogueInteraction,
    createScriptedDialogue,
    createShopInteraction,
    createCraftingInteraction,
    createQuestInteraction,
    // Combat
    createNoCombat,
    createBasicCombat,
    // Authority
    createNoAuthority,
    createGuardAuthority,
} from './factories';

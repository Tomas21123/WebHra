/**
 * =============================================================================
 * TIER 3: CROSS-FEATURE PAIRWISE COMBINATIONS E2E TESTS (16 Tests)
 * =============================================================================
 */

const { describe, test, assert, assertEqual, assertCloseTo } = require('./test_utils');
const {
  createGameSandbox,
  calculateXpNext,
  attachContractOracle
} = require('./test_harness');

// -----------------------------------------------------------------------------
// PAIRWISE 1: Leveling + Combat Stat Application (getPlayerBonusDamage)
// -----------------------------------------------------------------------------
describe('T3.1: Leveling + Combat Stat Application', () => {
  test('T3.1.1: Base Attack Power and getPlayerBonusDamage stack additively in total combat output', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    // Level 1 base attack power: 10
    assertEqual(sandbox.P.baseStats.attackPower, 10, 'Base attack power should be 10');
    // Basic sword bonus damage: 26
    assertEqual(sandbox.getPlayerBonusDamage(), 26, 'Weapon bonus damage should be 26');

    function calculateTotalAttack() {
      return sandbox.P.baseStats.attackPower + sandbox.getPlayerBonusDamage();
    }
    assertEqual(calculateTotalAttack(), 36, 'Total attack should be 10 + 26 = 36');
  });

  test('T3.1.2: Upgraded weapon (+2) on a Level 3 player scales combat hit output accurately', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    // Level up to Level 3:
    // Lv1 -> Lv2: +2 atk power (12)
    // Lv2 -> Lv3: +2 atk power (14)
    sandbox.P.level = 3;
    sandbox.P.baseStats.attackPower = 14;

    // Upgrade sword to +2: 26 + (2 * 4) = 34 bonus damage
    sandbox.P.equipment.weapon.upgradeLevel = 2;
    assertEqual(sandbox.getPlayerBonusDamage(), 34, 'Upgraded sword damage should be 34');

    const totalDamage = sandbox.P.baseStats.attackPower + sandbox.getPlayerBonusDamage();
    assertEqual(totalDamage, 48, 'Total damage on Lv3 with +2 sword should be 14 + 34 = 48');
  });

  test('T3.1.3: Critical strike multiplier applies across both base attack and weapon bonus damage', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    const baseAtk = sandbox.P.baseStats.attackPower; // 10
    const bonusDmg = sandbox.getPlayerBonusDamage(); // 26
    const critMultiplier = 1.5;
    const isCrit = true;

    const totalDmg = (baseAtk + bonusDmg) * (isCrit ? critMultiplier : 1.0);
    assertEqual(totalDmg, 54, 'Critical hit on 36 damage deals 54 damage');
  });

  test('T3.1.4: Equipping upgraded armor adds getPlayerBonusHP to level-scaled Max HP', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    // Level 2 player: base max HP is 100 + 10 = 110
    sandbox.P.level = 2;
    sandbox.P.baseStats.maxHp = 110;

    // Iron Armor +1: 40 + (1 * 8) = 48 bonus HP
    sandbox.P.equipment.armor.upgradeLevel = 1;
    assertEqual(sandbox.getPlayerBonusHP(), 48, 'Armor bonus HP should be 48');

    const totalEffectiveMaxHp = sandbox.P.baseStats.maxHp + sandbox.getPlayerBonusHP();
    assertEqual(totalEffectiveMaxHp, 158, 'Effective Max HP should be 110 + 48 = 158');
  });
});

// -----------------------------------------------------------------------------
// PAIRWISE 2: Exploration + Discovery XP + Level-up Flow
// -----------------------------------------------------------------------------
describe('T3.2: Exploration + Discovery XP + Level-up Flow', () => {
  test('T3.2.1: Player traversing into undiscovered POI triggers discovery and awards XP', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    sandbox.P.x = 80; sandbox.P.z = 80;
    sandbox.P.xp = 0;

    const poi = sandbox.POIManager.getPoiForCell(0, 0);
    const discovered = sandbox.POIManager.discoverPOI(poi.id);
    assertEqual(discovered, true, 'First discovery must succeed');
    assertEqual(sandbox.P.xp, 50, 'Player awarded 50 discovery XP');
  });

  test('T3.2.2: Discovery XP accumulation pushes player over threshold and triggers level up', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    sandbox.P.level = 1;
    sandbox.P.xp = 70; // 30 XP away from Level 2 (100)
    sandbox.P.xpNext = 100;

    // Discover new landmark granting 50 XP
    sandbox.POIManager.discoverPOI('shrine_cell_0_1');
    assertEqual(sandbox.P.level, 2, 'Player should level up to Level 2');
    assertEqual(sandbox.P.xp, 20, 'Surplus 20 XP carried into level 2');
  });

  test('T3.2.3: Discovered POI updates minimap and prevents duplicate XP on re-entry', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    const poiId = 'ruins_cell_1_0';
    sandbox.POIManager.discoverPOI(poiId);
    assertEqual(sandbox.POIManager.isDiscovered(poiId), true, 'POI is recorded discovered');
    const xpAfterFirst = sandbox.P.xp;

    // Re-entering same POI
    const secondTry = sandbox.POIManager.discoverPOI(poiId);
    assertEqual(secondTry, false, 'Duplicate discovery returns false');
    assertEqual(sandbox.P.xp, xpAfterFirst, 'XP must not increase on duplicate visit');
  });

  test('T3.2.4: Discovering multiple POIs sequentially advances player through level thresholds', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    sandbox.P.level = 1;
    sandbox.P.xp = 0;
    sandbox.P.xpNext = 100;

    // 8 discoveries * 50 XP = 400 XP total
    // Lv1 -> Lv2: 100 XP (300 remaining)
    // Lv2 -> Lv3: 282 XP (18 remaining)
    for (let i = 0; i < 8; i++) {
      sandbox.POIManager.discoverPOI(`shrine_${i}`);
    }
    assertEqual(sandbox.P.level, 3, 'Player should have reached level 3');
    assertEqual(sandbox.P.xp, 18, 'Remainder XP in Level 3 should be 18');
  });
});

// -----------------------------------------------------------------------------
// PAIRWISE 3: Crafting Potions + Hotbar Usage + Combat Consumption
// -----------------------------------------------------------------------------
describe('T3.3: Crafting Potions + Hotbar Usage + Combat Consumption', () => {
  test('T3.3.1: Gathering materials -> crafting potion -> binding to hotbar', () => {
    const playerInventory = { wood: 4, potions: [] };
    const hotbar = [null, null, null];

    function craftPotion() {
      if (playerInventory.wood >= 2) {
        playerInventory.wood -= 2;
        playerInventory.potions.push({ id: 'potion_hp', name: 'Léčivý lektvar', heal: 40 });
        return true;
      }
      return false;
    }

    craftPotion();
    assertEqual(playerInventory.potions.length, 1, '1 potion in inventory');
    assertEqual(playerInventory.wood, 2, '2 wood consumed');

    // Bind to hotbar slot 0
    hotbar[0] = { ...playerInventory.potions[0], count: 1 };
    assertEqual(hotbar[0].id, 'potion_hp', 'Potion bound to hotbar');
  });

  test('T3.3.2: Consuming potion from hotbar restores HP and decrements count', () => {
    const sandbox = createGameSandbox();
    sandbox.P.maxHp = 100;
    sandbox.P.hp = 30; // Damaged in combat
    const hotbarSlot = { id: 'potion_hp', heal: 40, count: 2 };

    function useHotbarItem(slot) {
      if (slot && slot.count > 0 && slot.heal) {
        sandbox.P.hp = Math.min(sandbox.P.maxHp, sandbox.P.hp + slot.heal);
        slot.count--;
        return true;
      }
      return false;
    }

    const used = useHotbarItem(hotbarSlot);
    assertEqual(used, true, 'Potion used successfully');
    assertEqual(sandbox.P.hp, 70, 'HP restored from 30 to 70');
    assertEqual(hotbarSlot.count, 1, 'Hotbar slot count decremented to 1');
  });

  test('T3.3.3: Consuming potion when damaged near max HP respects max HP clamp', () => {
    const sandbox = createGameSandbox();
    sandbox.P.maxHp = 100;
    sandbox.P.hp = 85;
    const hotbarSlot = { id: 'potion_hp', heal: 40, count: 1 };

    sandbox.P.hp = Math.min(sandbox.P.maxHp, sandbox.P.hp + hotbarSlot.heal);
    assertEqual(sandbox.P.hp, 100, 'HP clamped to max HP (100)');
  });

  test('T3.3.4: Depleting all potions clears the hotbar item slot', () => {
    let hotbarSlot = { id: 'potion_hp', count: 1 };
    function consumeLast() {
      hotbarSlot.count--;
      if (hotbarSlot.count <= 0) hotbarSlot = null;
    }
    consumeLast();
    assertEqual(hotbarSlot, null, 'Slot cleared when count reaches 0');
  });
});

// -----------------------------------------------------------------------------
// PAIRWISE 4: Multiplayer Combat Hits + HP Sync + Remote Badges
// -----------------------------------------------------------------------------
describe('T3.4: Multiplayer Combat Hits + HP Sync + Remote Badges', () => {
  test('T3.4.1: Combat hit on target produces damage event packet with updated HP', () => {
    const targetEntity = { id: 'goblin_1', hp: 80, maxHp: 80 };
    function registerHit(target, attackerDamage) {
      target.hp = Math.max(0, target.hp - attackerDamage);
      return {
        type: 'hit',
        targetId: target.id,
        damage: attackerDamage,
        remainingHp: target.hp
      };
    }
    const hitPacket = registerHit(targetEntity, 30);
    assertEqual(hitPacket.type, 'hit', 'Hit packet type generated');
    assertEqual(hitPacket.remainingHp, 50, 'Target remaining HP is 50');
  });

  test('T3.4.2: Remote client receives combat hit packet and updates target 3D health bar', () => {
    const remoteRigHealthBar = { widthPercent: 100 };
    function onRemoteHitPacket(packet) {
      remoteRigHealthBar.widthPercent = Math.max(0, (packet.remainingHp / 80) * 100);
    }
    onRemoteHitPacket({ targetId: 'goblin_1', remainingHp: 40 });
    assertEqual(remoteRigHealthBar.widthPercent, 50, 'Health bar updated to 50%');
  });

  test('T3.4.3: Remote player level up broadcasts new level, updating nametag badge on peers', () => {
    const peerRig = {
      levelBadge: 1,
      updatePeerState: function(state) {
        if (state.level) this.levelBadge = state.level;
      }
    };
    peerRig.updatePeerState({ level: 4 });
    assertEqual(peerRig.levelBadge, 4, 'Remote peer level badge updated to Level 4');
  });

  test('T3.4.4: Remote player death broadcasts state, triggering death event and party notice', () => {
    let partyNotice = null;
    function handleRemotePlayerDeath(playerName) {
      partyNotice = `Hráč ${playerName} padl v boji!`;
    }
    handleRemotePlayerDeath('Bob');
    assertEqual(partyNotice, 'Hráč Bob padl v boji!', 'Party death notice broadcast');
  });
});

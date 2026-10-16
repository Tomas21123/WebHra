/**
 * =============================================================================
 * TIER 4: REAL-WORLD APPLICATION SCENARIOS E2E TESTS (5 Complete Scenarios)
 * =============================================================================
 */

const { describe, test, assert, assertEqual, assertDeepEqual, assertCloseTo } = require('./test_utils');
const {
  createGameSandbox,
  calculateXpNext,
  attachContractOracle
} = require('./test_harness');

// -----------------------------------------------------------------------------
// SCENARIO 1: New Player Spawn -> Explore -> Discover Landmark -> Level Up
// -----------------------------------------------------------------------------
describe('T4.1: Scenario 1 - Player Exploration & Level Up Lifecycle', () => {
  test('Complete lifecycle: Spawn at (0,50,0) -> Travel -> Discover 2 Landmarks -> Level up to Lv2', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);

    // Step 1: New player spawn
    sandbox.P.x = 0; sandbox.P.y = 50; sandbox.P.z = 0;
    sandbox.P.level = 1;
    sandbox.P.xp = 0;
    sandbox.P.xpNext = 100;
    sandbox.P.baseStats.maxHp = 100;
    sandbox.P.baseStats.attackPower = 10;
    assertEqual(sandbox.P.level, 1, 'Initial level is 1');
    assertEqual(sandbox.P.xp, 0, 'Initial XP is 0');

    // Step 2: Player explores world, moving toward first POI at (80, 47, 80)
    for (let step = 1; step <= 5; step++) {
      sandbox.P.x += 16;
      sandbox.P.z += 16;
    }
    assertEqual(sandbox.P.x, 80, 'Player reached POI X');
    assertEqual(sandbox.P.z, 80, 'Player reached POI Z');

    // Step 3: Discover first landmark
    const poi1 = sandbox.POIManager.getPoiForCell(0, 0);
    const discovered1 = sandbox.POIManager.discoverPOI(poi1.id);
    assertEqual(discovered1, true, 'First POI discovered');
    assertEqual(sandbox.P.xp, 50, 'Player has 50 XP');
    assertEqual(sandbox.P.level, 1, 'Still Level 1');

    // Step 4: Player travels to second landmark in cell (0, 1)
    sandbox.P.z = 240;
    const poi2 = sandbox.POIManager.getPoiForCell(0, 1);
    const discovered2 = sandbox.POIManager.discoverPOI(poi2.id);
    assertEqual(discovered2, true, 'Second POI discovered');

    // Step 5: Threshold crossed (50 + 50 = 100 XP >= 100 threshold) -> Level Up!
    assertEqual(sandbox.P.level, 2, 'Player reached Level 2');
    assertEqual(sandbox.P.xp, 0, 'XP reset after exact threshold');
    assertEqual(sandbox.P.xpNext, 282, 'Level 2 next threshold is 282');
    assertEqual(sandbox.P.baseStats.maxHp, 110, 'Max HP scaled to 110');
    assertEqual(sandbox.P.baseStats.attackPower, 12, 'Attack power scaled to 12');

    // Step 6: Verify persistence to localStorage
    const savedState = { level: sandbox.P.level, xp: sandbox.P.xp, maxHp: sandbox.P.baseStats.maxHp };
    sandbox.localStorage.setItem('voxel_rpg_stats', JSON.stringify(savedState));
    const loadedState = JSON.parse(sandbox.localStorage.getItem('voxel_rpg_stats'));
    assertEqual(loadedState.level, 2, 'Saved level matches loaded level');
    assertEqual(loadedState.maxHp, 110, 'Saved Max HP matches loaded');
  });
});

// -----------------------------------------------------------------------------
// SCENARIO 2: Combat Encounter -> Slay Goblin -> Collect Loot -> Craft Potion
// -----------------------------------------------------------------------------
describe('T4.2: Scenario 2 - Combat Encounter & Alchemy Crafting Lifecycle', () => {
  test('Complete lifecycle: Engage Goblin -> Shield block -> Slay -> Loot materials -> Craft healing potion', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);

    // Step 1: Spawn Goblin entity near player
    sandbox.P.x = 0; sandbox.P.z = 0; sandbox.P.hp = 100;
    const goblin = sandbox.EntityManager.spawnCreature('Goblin', 2, 48, 0, 1);
    assertEqual(goblin.hp, 80, 'Goblin starts with 80 HP');

    // Step 2: Player attack 1
    const playerDamage = sandbox.P.baseStats.attackPower + sandbox.getPlayerBonusDamage(); // 10 + 26 = 36
    goblin.takeDamage(playerDamage);
    assertEqual(goblin.hp, 44, 'Goblin HP after hit 1: 80 - 36 = 44');
    assertEqual(goblin.state, 'Chase', 'Damaged goblin is aggressive');

    // Step 3: Goblin retaliates, player blocks with shield
    sandbox.P.isBlocking = true;
    const goblinAtk = 20;
    const blockMitigation = 0.65;
    const damageTaken = goblinAtk * (1 - blockMitigation);
    sandbox.P.hp -= damageTaken;
    sandbox.P.stamina -= 15;
    assertEqual(sandbox.P.hp, 93, 'Player HP is 93 after blocked attack');
    assertEqual(sandbox.P.stamina, 85, 'Stamina consumed by shield block');

    // Step 4: Player attack 2
    goblin.takeDamage(playerDamage);
    assertEqual(goblin.hp, 8, 'Goblin HP after hit 2: 44 - 36 = 8');

    // Step 5: Player attack 3 (Lethal)
    goblin.takeDamage(playerDamage);
    assertEqual(goblin.hp, 0, 'Goblin HP is 0');
    assertEqual(goblin.state, 'Dead', 'Goblin enters Dead state');

    // Step 6: Collect loot into inventory
    const inventory = { wood: 0, gold: 0, potions: [] };
    inventory.wood += goblin.loot.wood; // 2 wood
    inventory.gold += goblin.loot.gold; // 5 gold
    sandbox.addPlayerXP(goblin.loot.xp, 'combat');
    assertEqual(inventory.wood, 2, 'Player received 2 wood');
    assertEqual(inventory.gold, 5, 'Player received 5 gold');
    assertEqual(sandbox.P.xp, 25, 'Player received 25 XP');

    // Step 7: Craft healing potion
    function craftPotion() {
      if (inventory.wood >= 2) {
        inventory.wood -= 2;
        inventory.potions.push({ id: 'potion_hp', heal: 40 });
        return true;
      }
      return false;
    }
    const crafted = craftPotion();
    assertEqual(crafted, true, 'Potion crafted');
    assertEqual(inventory.wood, 0, 'Wood used up');
    assertEqual(inventory.potions.length, 1, '1 healing potion obtained');

    // Step 8: Drink potion to restore HP
    const pot = inventory.potions.pop();
    sandbox.P.hp = Math.min(sandbox.P.maxHp, sandbox.P.hp + pot.heal);
    assertEqual(sandbox.P.hp, 100, 'Player restored to full 100 HP');
  });
});

// -----------------------------------------------------------------------------
// SCENARIO 3: Equipment Upgrade -> Upgrade Sword to +1 and +2 -> Contract Damage
// -----------------------------------------------------------------------------
describe('T4.3: Scenario 3 - Forge Equipment Upgrades & Contract Function', () => {
  test('Complete lifecycle: Sword +0 (26 dmg) -> Upgrade +1 (30 dmg) -> Upgrade +2 (34 dmg) -> Contract verification', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);

    const sword = sandbox.P.equipment.weapon;
    assertEqual(sword.upgradeLevel, 0, 'Initial sword is +0');
    assertEqual(sandbox.getPlayerBonusDamage(), 26, 'Initial getPlayerBonusDamage() returns 26');

    // Player gathers materials for +1
    let playerMaterials = { ore_iron: 4, gold: 100 };

    function upgradeWeapon(item) {
      if (item.upgradeLevel >= 5) return false;
      if (playerMaterials.ore_iron < 2 || playerMaterials.gold < 50) return false;
      playerMaterials.ore_iron -= 2;
      playerMaterials.gold -= 50;
      item.upgradeLevel += 1;
      item.name = `Ocelový meč +${item.upgradeLevel}`;
      return true;
    }

    // Upgrade 1: +0 -> +1
    const ok1 = upgradeWeapon(sword);
    assertEqual(ok1, true, 'First upgrade succeeded');
    assertEqual(sword.upgradeLevel, 1, 'Upgrade level is 1');
    assertEqual(sword.name, 'Ocelový meč +1', 'Name has +1 suffix');
    assertEqual(sandbox.getPlayerBonusDamage(), 30, 'getPlayerBonusDamage() increased to 30');

    // Upgrade 2: +1 -> +2
    const ok2 = upgradeWeapon(sword);
    assertEqual(ok2, true, 'Second upgrade succeeded');
    assertEqual(sword.upgradeLevel, 2, 'Upgrade level is 2');
    assertEqual(sword.name, 'Ocelový meč +2', 'Name has +2 suffix');
    assertEqual(sandbox.getPlayerBonusDamage(), 34, 'getPlayerBonusDamage() increased to 34');

    // Remaining materials check
    assertEqual(playerMaterials.ore_iron, 0, 'Ore deducted');
    assertEqual(playerMaterials.gold, 0, 'Gold deducted');
  });
});

// -----------------------------------------------------------------------------
// SCENARIO 4: Multiplayer P2P Host & Guest -> Approval -> Spawn -> Teleport
// -----------------------------------------------------------------------------
describe('T4.4: Scenario 4 - Multiplayer P2P Handshake & Party Management', () => {
  test('Complete lifecycle: Host room -> Guest requests join -> Host approves -> Guest spawns near host -> Teleport', () => {
    // 1. Host creates room
    const host = {
      peerId: 'peer_host_99',
      roomCode: 'VOX-7K9A',
      x: 120, y: 52, z: 210,
      party: []
    };

    // 2. Guest requests join
    const guest = {
      peerId: 'peer_guest_01',
      name: 'GuestKnight',
      level: 4,
      status: 'waiting_for_approval',
      x: 0, y: 0, z: 0
    };

    const pendingRequests = [];
    function onGuestRequestJoin(req) {
      pendingRequests.push(req);
    }
    onGuestRequestJoin({ peerId: guest.peerId, name: guest.name, level: guest.level });
    assertEqual(pendingRequests.length, 1, 'Host received join request');

    // 3. Host approves guest join via approveP2PJoin
    function approveP2PJoin(peerId) {
      const idx = pendingRequests.findIndex(r => r.peerId === peerId);
      if (idx !== -1) {
        const approvedReq = pendingRequests.splice(idx, 1)[0];
        host.party.push(approvedReq);
        return {
          approved: true,
          spawnX: host.x + 1.5,
          spawnY: host.y,
          spawnZ: host.z + 1.5,
          seed: 12345
        };
      }
      return { approved: false };
    }

    const approvalResponse = approveP2PJoin(guest.peerId);
    assertEqual(approvalResponse.approved, true, 'Join was approved');
    assertEqual(host.party.length, 1, 'Guest added to host party');

    // 4. Guest sets spawn near host
    guest.status = 'playing';
    guest.x = approvalResponse.spawnX;
    guest.y = approvalResponse.spawnY;
    guest.z = approvalResponse.spawnZ;
    assertEqual(guest.x, 121.5, 'Guest spawned within 1.5m of host X');
    assertEqual(guest.z, 211.5, 'Guest spawned within 1.5m of host Z');

    // 5. Guest wanders away to (320, 52, 410)
    guest.x = 320; guest.z = 410;

    // 6. Host uses Party Management 1-click teleport to teleport to guest
    function teleportToPartyMember(target) {
      host.x = target.x;
      host.y = target.y;
      host.z = target.z;
    }
    teleportToPartyMember(guest);
    assertEqual(host.x, 320, 'Host teleported to guest X');
    assertEqual(host.z, 410, 'Host teleported to guest Z');
  });
});

// -----------------------------------------------------------------------------
// SCENARIO 5: Dedicated WebSocket Server Session -> Connect -> Sync -> Chat -> Leave
// -----------------------------------------------------------------------------
describe('T4.5: Scenario 5 - Dedicated WebSocket Server Session Lifecycle', () => {
  test('Complete lifecycle: Start server simulation -> Alice & Bob connect -> Position & HP sync -> Chat /time -> Disconnect', () => {
    const serverState = {
      seed: 12345,
      time: 0.25,
      clients: new Map(),
      chatLog: []
    };

    let nextClientId = 1;

    function handleServerPacket(clientId, packet) {
      if (packet.type === 'join') {
        serverState.clients.set(clientId, {
          id: clientId,
          name: packet.name,
          level: packet.level,
          hp: packet.hp,
          x: 0, y: 50, z: 0
        });
        return { type: 'welcome', id: clientId, seed: serverState.seed };
      }

      if (packet.type === 'move') {
        const client = serverState.clients.get(clientId);
        if (client) {
          client.x = packet.x;
          client.y = packet.y;
          client.z = packet.z;
          client.level = packet.level;
          client.hp = packet.hp;
        }
        return { type: 'broadcast_move', id: clientId, ...packet };
      }

      if (packet.type === 'chat') {
        serverState.chatLog.push({ sender: packet.name, text: packet.text });
        if (packet.text.startsWith('/time ')) {
          const arg = packet.text.split(' ')[1];
          if (arg === 'night') serverState.time = 0.75;
          if (arg === 'day') serverState.time = 0.25;
        }
        return { type: 'broadcast_chat', sender: packet.name, text: packet.text };
      }

      if (packet.type === 'leave') {
        serverState.clients.delete(clientId);
        return { type: 'broadcast_leave', id: clientId };
      }
    }

    // 1. Alice connects
    const aliceId = nextClientId++;
    const aliceWelcome = handleServerPacket(aliceId, { type: 'join', name: 'Alice', level: 3, hp: 120 });
    assertEqual(aliceWelcome.type, 'welcome', 'Alice welcomed');
    assertEqual(serverState.clients.size, 1, '1 client on server');

    // 2. Bob connects
    const bobId = nextClientId++;
    const bobWelcome = handleServerPacket(bobId, { type: 'join', name: 'Bob', level: 5, hp: 140 });
    assertEqual(serverState.clients.size, 2, '2 clients on server');

    // 3. Alice sends move packet with RPG level and HP
    const moveBroadcast = handleServerPacket(aliceId, {
      type: 'move',
      x: 45.2, y: 50.0, z: -18.7,
      level: 3, hp: 120
    });
    assertEqual(moveBroadcast.type, 'broadcast_move', 'Move broadcast created');
    assertEqual(serverState.clients.get(aliceId).x, 45.2, 'Server updated Alice X');
    assertEqual(serverState.clients.get(aliceId).level, 3, 'Server updated Alice Level');

    // 4. Bob sends chat message including slash command /time night
    const chatBroadcast = handleServerPacket(bobId, {
      type: 'chat',
      name: 'Bob',
      text: 'Stmívá se! /time night'
    });
    assertEqual(chatBroadcast.type, 'broadcast_chat', 'Chat broadcast created');
    assertEqual(serverState.time, 0.75, 'Server world time updated to night (0.75)');

    // 5. Bob disconnects
    const leaveBroadcast = handleServerPacket(bobId, { type: 'leave' });
    assertEqual(leaveBroadcast.type, 'broadcast_leave', 'Leave broadcast created');
    assertEqual(serverState.clients.size, 1, 'Only Alice remains connected');
    assertEqual(serverState.clients.has(bobId), false, 'Bob removed from server registry');
  });
});

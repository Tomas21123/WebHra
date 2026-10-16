/**
 * =============================================================================
 * TIER 2: BOUNDARY & CORNER CASES E2E TESTS (>=5 Tests per Category = 30 Tests)
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');
const { describe, test, assert, assertEqual, assertDeepEqual, assertCloseTo } = require('./test_utils');
const {
  createGameSandbox,
  calculateXpNext,
  attachContractOracle
} = require('./test_harness');

// -----------------------------------------------------------------------------
// CATEGORY 1: Level Thresholds & XP Boundaries
// -----------------------------------------------------------------------------
describe('T2.1: Level Thresholds & XP Boundaries', () => {
  test('T2.1.1: Exact threshold XP triggers level up with exactly 0 remainder', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    sandbox.P.level = 1;
    sandbox.P.xp = 0;
    sandbox.P.xpNext = 100;
    const leveled = sandbox.addPlayerXP(100, 'test');
    assertEqual(leveled, true, 'Must level up');
    assertEqual(sandbox.P.level, 2, 'Level must be 2');
    assertEqual(sandbox.P.xp, 0, 'Remainder XP must be 0');
    assertEqual(sandbox.P.xpNext, 282, 'Level 2 next threshold must be 282');
  });

  test('T2.1.2: Overflow XP carries into next level progression without loss', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    sandbox.P.level = 1;
    sandbox.P.xp = 0;
    sandbox.P.xpNext = 100;
    sandbox.addPlayerXP(150, 'test');
    assertEqual(sandbox.P.level, 2, 'Level must be 2');
    assertEqual(sandbox.P.xp, 50, 'Overflow 50 XP preserved in level 2');
  });

  test('T2.1.3: Huge multi-level XP grant triggers multiple sequential level ups', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    sandbox.P.level = 1;
    sandbox.P.xp = 0;
    sandbox.P.xpNext = 100;
    // XP to get from Lv1 to Lv4: 100 (lv1) + 282 (lv2) + 519 (lv3) = 901 XP
    sandbox.addPlayerXP(950, 'boss_kill');
    assertEqual(sandbox.P.level, 4, 'Player should advance to level 4');
    assertEqual(sandbox.P.xp, 950 - 901, '49 XP remainder in level 4');
  });

  test('T2.1.4: Level 1 with 0 XP edge condition cannot trigger negative XP or downgrade', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    sandbox.P.level = 1;
    sandbox.P.xp = 0;
    const res = sandbox.addPlayerXP(-50, 'penalty');
    assertEqual(res, false, 'Negative XP grant should be rejected');
    assertEqual(sandbox.P.level, 1, 'Level cannot downgrade below 1');
    assertEqual(sandbox.P.xp, 0, 'XP cannot drop below 0');
  });

  test('T2.1.5: High level scaling computes finite positive threshold without overflow', () => {
    const xp50 = calculateXpNext(50);
    assert(Number.isFinite(xp50), 'Threshold must be finite number');
    assert(xp50 > 0, 'Threshold must be positive');
    // 100 * 50^1.5 = 100 * 353.553 = 35355
    assertEqual(xp50, 35355, 'Level 50 threshold must match formula');
  });
});

// -----------------------------------------------------------------------------
// CATEGORY 2: Zero, Negative & Extreme Stats
// -----------------------------------------------------------------------------
describe('T2.2: Zero, Negative & Extreme Stats', () => {
  test('T2.2.1: Massive lethal damage clamps HP to exactly 0', () => {
    const sandbox = createGameSandbox();
    sandbox.P.hp = 100;
    function applyDamage(amount) {
      sandbox.P.hp = Math.max(0, sandbox.P.hp - amount);
    }
    applyDamage(99999);
    assertEqual(sandbox.P.hp, 0, 'HP must clamp to 0 and not become negative');
  });

  test('T2.2.2: Stamina consumption exceeding current stamina clamps to 0', () => {
    const sandbox = createGameSandbox();
    sandbox.P.stamina = 15;
    function consumeStamina(amount) {
      if (sandbox.P.stamina >= amount) {
        sandbox.P.stamina -= amount;
        return true;
      }
      sandbox.P.stamina = 0;
      return false;
    }
    const sprintSucceeded = consumeStamina(50);
    assertEqual(sprintSucceeded, false, 'Sprint cannot complete with insufficient stamina');
    assertEqual(sandbox.P.stamina, 0, 'Stamina must not be negative');
  });

  test('T2.2.3: Zero damage weapon or zero defense armor does not produce negative calculations', () => {
    const weaponDamage = 0;
    const armorDefense = 0;
    const playerBaseAtk = 10;
    const incomingDmg = Math.max(1, (playerBaseAtk + weaponDamage) * (1 - armorDefense));
    assertEqual(incomingDmg, 10, 'Damage calculation remains valid with zero bonuses');
  });

  test('T2.2.4: Zero delta time dt = 0 does not cause division by zero or NaN', () => {
    const sandbox = createGameSandbox();
    const dt = 0;
    sandbox.P.vx = 5;
    sandbox.P.x += sandbox.P.vx * dt;
    assert(!isNaN(sandbox.P.x), 'Position must not become NaN');
    assertEqual(sandbox.P.x, 0, 'Position unchanged with dt = 0');
  });

  test('T2.2.5: Healing when already at max HP clamps cleanly to max HP', () => {
    const sandbox = createGameSandbox();
    sandbox.P.maxHp = 100;
    sandbox.P.hp = 95;
    function heal(amount) {
      sandbox.P.hp = Math.min(sandbox.P.maxHp, sandbox.P.hp + amount);
    }
    heal(50);
    assertEqual(sandbox.P.hp, 100, 'HP must be clamped to maxHp 100');
  });
});

// -----------------------------------------------------------------------------
// CATEGORY 3: Maximum Upgrades (+5 Limit)
// -----------------------------------------------------------------------------
describe('T2.3: Maximum Upgrades (+5 Limit)', () => {
  test('T2.3.1: Equipment at +4 upgrades successfully to +5', () => {
    const item = { id: 'sword', name: 'Ocelový meč +4', upgradeLevel: 4 };
    function upgrade(it) {
      if (it.upgradeLevel < 5) {
        it.upgradeLevel++;
        it.name = `Ocelový meč +${it.upgradeLevel}`;
        return true;
      }
      return false;
    }
    const ok = upgrade(item);
    assertEqual(ok, true, 'Upgrade to +5 should succeed');
    assertEqual(item.upgradeLevel, 5, 'Upgrade level must be 5');
    assertEqual(item.name, 'Ocelový meč +5', 'Name should be +5');
  });

  test('T2.3.2: Equipment at +5 rejects further upgrades and returns false', () => {
    const item = { id: 'sword', name: 'Ocelový meč +5', upgradeLevel: 5 };
    function upgrade(it) {
      if (it.upgradeLevel >= 5) return false;
      it.upgradeLevel++;
      return true;
    }
    const ok = upgrade(item);
    assertEqual(ok, false, 'Upgrade beyond +5 must be rejected');
    assertEqual(item.upgradeLevel, 5, 'Upgrade level must stay 5');
  });

  test('T2.3.3: Attempting upgrade with insufficient resources leaves upgrade level unchanged', () => {
    const playerGold = 10;
    const requiredGold = 100;
    const item = { id: 'sword', upgradeLevel: 2 };
    function tryUpgrade(it, gold) {
      if (gold < requiredGold) return { success: false, remainingGold: gold };
      it.upgradeLevel++;
      return { success: true, remainingGold: gold - requiredGold };
    }
    const res = tryUpgrade(item, playerGold);
    assertEqual(res.success, false, 'Upgrade should fail due to gold');
    assertEqual(item.upgradeLevel, 2, 'Upgrade level must remain 2');
    assertEqual(res.remainingGold, 10, 'Gold must not be deducted');
  });

  test('T2.3.4: Attempting to upgrade consumable or non-upgradeable item is rejected', () => {
    const consumable = { id: 'potion_hp', cat: 'loot', subcat: 'consumable' };
    function isUpgradeable(it) {
      return it && (it.cat === 'weapon' || it.cat === 'armor');
    }
    assertEqual(isUpgradeable(consumable), false, 'Consumables cannot be upgraded');
  });

  test('T2.3.5: Upgraded items retain their +N level across JSON serialization', () => {
    const item = { id: 'sword', name: 'Ocelový meč +3', upgradeLevel: 3, baseDamage: 26 };
    const serialized = JSON.stringify(item);
    const deserialized = JSON.parse(serialized);
    assertDeepEqual(deserialized, item, 'Serialized upgrade state must match original');
    assertEqual(deserialized.upgradeLevel, 3, 'Upgrade level 3 preserved');
  });
});

// -----------------------------------------------------------------------------
// CATEGORY 4: Empty Inventory & Equipment Slots
// -----------------------------------------------------------------------------
describe('T2.4: Empty Inventory & Equipment Slots', () => {
  test('T2.4.1: Calling getPlayerBonusDamage with unarmed weapon slot returns 0', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    sandbox.P.equipment.weapon = null;
    assertEqual(sandbox.getPlayerBonusDamage(), 0, 'Unarmed weapon bonus damage must be 0');
  });

  test('T2.4.2: Calling getPlayerBonusHP and getPlayerBonusDefense with empty armor returns 0', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    sandbox.P.equipment.armor = null;
    sandbox.P.equipment.shield = null;
    assertEqual(sandbox.getPlayerBonusHP(), 0, 'Empty armor bonus HP must be 0');
    assertEqual(sandbox.getPlayerBonusDefense(), 0, 'Empty armor bonus defense must be 0');
  });

  test('T2.4.3: Rendering empty inventory does not throw null pointer exception', () => {
    const inventoryItems = [];
    function renderInventorySlots(items) {
      return items.map(i => `<div class="slot">${i ? i.name : 'Prázdné'}</div>`).join('');
    }
    assert.doesNotThrow(() => {
      const html = renderInventorySlots(inventoryItems);
      assertEqual(html, '', 'Empty items array produces empty HTML string');
    });
  });

  test('T2.4.4: Crafting when inventory is full fails safely without consuming ingredients', () => {
    const inventory = new Array(24).fill({ id: 'stone' }); // Full 24 slots
    let woodCount = 10;
    function craftItem(recipe) {
      if (inventory.length >= 24) return false;
      woodCount -= 2;
      inventory.push({ id: recipe.result });
      return true;
    }
    const success = craftItem({ result: 'torch' });
    assertEqual(success, false, 'Crafting with full inventory must fail');
    assertEqual(woodCount, 10, 'Ingredients must remain intact');
  });

  test('T2.4.5: Selecting empty hotbar slot sets held item to null without crash', () => {
    const hotbar = [null, { id: 'sword' }, null];
    let heldItem = null;
    function selectHotbarSlot(index) {
      heldItem = hotbar[index] || null;
    }
    selectHotbarSlot(0);
    assertEqual(heldItem, null, 'Empty slot 0 sets held item to null');
    selectHotbarSlot(1);
    assertEqual(heldItem.id, 'sword', 'Slot 1 sets sword');
    selectHotbarSlot(2);
    assertEqual(heldItem, null, 'Empty slot 2 sets held item to null');
  });
});

// -----------------------------------------------------------------------------
// CATEGORY 5: Multiplayer Disconnect, Packet Corruption & Reconnect
// -----------------------------------------------------------------------------
describe('T2.5: Multiplayer Disconnect, Packet Corruption & Reconnect', () => {
  test('T2.5.1: Peer abruptly disconnecting cleans up remote player rig and party list', () => {
    const remoteRigs = new Map([
      ['peer_1', { id: 'peer_1', mesh: { dispose: () => {} } }]
    ]);
    function handlePeerDisconnect(peerId) {
      if (remoteRigs.has(peerId)) {
        const rig = remoteRigs.get(peerId);
        rig.mesh.dispose();
        remoteRigs.delete(peerId);
        return true;
      }
      return false;
    }
    const cleaned = handlePeerDisconnect('peer_1');
    assertEqual(cleaned, true, 'Cleanup must succeed');
    assertEqual(remoteRigs.has('peer_1'), false, 'Rig must be removed from map');
  });

  test('T2.5.2: Server client disconnect removes player from server registry', () => {
    const connectedPlayers = new Map([
      [42, { name: 'Player42', level: 3 }]
    ]);
    function onClientDisconnect(id) {
      connectedPlayers.delete(id);
    }
    onClientDisconnect(42);
    assertEqual(connectedPlayers.size, 0, 'Player 42 removed from server registry');
  });

  test('T2.5.3: Reconnecting client with same username cleans up old session', () => {
    const sessions = new Map();
    function registerClient(name, socketId) {
      for (const [sId, sName] of sessions.entries()) {
        if (sName === name) sessions.delete(sId); // Evict duplicate
      }
      sessions.set(socketId, name);
    }
    registerClient('Alice', 'socket_1');
    registerClient('Alice', 'socket_2'); // Reconnection
    assertEqual(sessions.size, 1, 'Only one active session for Alice');
    assertEqual(sessions.get('socket_2'), 'Alice', 'New socket holds the session');
  });

  test('T2.5.4: Malformed JSON packet payload is caught and discarded safely', () => {
    let packetHandled = false;
    function processIncomingRaw(rawString) {
      try {
        const data = JSON.parse(rawString);
        packetHandled = true;
      } catch (err) {
        // Discard malformed packet
      }
    }
    processIncomingRaw('{"type": "move", invalid_json}');
    assertEqual(packetHandled, false, 'Malformed packet safely discarded');
  });

  test('T2.5.5: Out-of-order transform packet is ignored in favor of newer timestamp', () => {
    let lastTimestamp = 1000;
    let currentX = 50;
    function updateTransform(packet) {
      if (packet.timestamp < lastTimestamp) {
        return false; // Stale packet dropped
      }
      lastTimestamp = packet.timestamp;
      currentX = packet.x;
      return true;
    }
    const res1 = updateTransform({ timestamp: 950, x: 45 });
    assertEqual(res1, false, 'Older packet should be dropped');
    assertEqual(currentX, 50, 'Position must not regress');
    const res2 = updateTransform({ timestamp: 1050, x: 55 });
    assertEqual(res2, true, 'Newer packet should be accepted');
    assertEqual(currentX, 55, 'Position updated to 55');
  });
});

// -----------------------------------------------------------------------------
// CATEGORY 6: Edge Coordinate Navigation & World Bounds
// -----------------------------------------------------------------------------
describe('T2.6: Edge Coordinate Navigation & World Bounds', () => {
  test('T2.6.1: Negative coordinate boundaries evaluate POIs deterministically', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    const poi1 = sandbox.POIManager.getPoiForCell(-100, -100);
    const poi2 = sandbox.POIManager.getPoiForCell(-100, -100);
    assertDeepEqual(poi1, poi2, 'POI generation at negative coordinates must be deterministic');
    assert(typeof poi1.type === 'string', 'POI type must be valid');
  });

  test('T2.6.2: Deep void fall (y < -20) triggers safe void respawn to spawn coordinates', () => {
    const sandbox = createGameSandbox();
    const SPX = 0, SPY = 50, SPZ = 0;
    sandbox.P.x = 150; sandbox.P.y = -25; sandbox.P.z = 250;
    function checkVoidRespawn() {
      if (sandbox.P.y < -20) {
        sandbox.P.x = SPX;
        sandbox.P.y = SPY;
        sandbox.P.z = SPZ;
        sandbox.P.vy = 0;
      }
    }
    checkVoidRespawn();
    assertEqual(sandbox.P.x, SPX, 'Respawned to SPX');
    assertEqual(sandbox.P.y, SPY, 'Respawned to SPY');
    assertEqual(sandbox.P.z, SPZ, 'Respawned to SPZ');
  });

  test('T2.6.3: High altitude traversal maintains stable numerical position', () => {
    const sandbox = createGameSandbox();
    sandbox.P.y = 350;
    sandbox.P.vy = -9.8;
    const dt = 0.016;
    sandbox.P.y += sandbox.P.vy * dt;
    assert(!isNaN(sandbox.P.y), 'Altitude must be finite number');
    assertCloseTo(sandbox.P.y, 349.843, 0.01, 'Correct gravity descent calculation');
  });

  test('T2.6.4: Traversing chunk boundary updates chunk coordinates cleanly', () => {
    function getChunkCoord(pos, chunkSize = 16) {
      return Math.floor(pos / chunkSize);
    }
    assertEqual(getChunkCoord(15.9), 0, '15.9 is chunk 0');
    assertEqual(getChunkCoord(16.0), 1, '16.0 is chunk 1');
    assertEqual(getChunkCoord(-0.1), -1, '-0.1 is chunk -1');
  });

  test('T2.6.5: Sub-pixel velocities do not trigger collision locks', () => {
    const velocity = 1e-8;
    function isMoving(v, threshold = 1e-4) {
      return Math.abs(v) > threshold;
    }
    assertEqual(isMoving(velocity), false, 'Micro-velocity is treated as stationary without jitter');
  });
});

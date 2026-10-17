/**
 * =============================================================================
 * Integration Verification Test: RPG Attributes, Scaling & Biome Exploration
 * =============================================================================
 */

const { createGameSandbox, loadScriptIntoSandbox, attachContractOracle } = require('./test_harness');
const { assert, assertEqual } = require('./test_utils');

console.log('🧪 Starting RPG Progression, Enemy Scaling & Biome System Tests...');

// Test 1: RPG Attributes & Skill Point Allocation
{
  const sandbox = createGameSandbox();
  loadScriptIntoSandbox('js/config.js', sandbox);
  loadScriptIntoSandbox('js/player.js', sandbox);
  loadScriptIntoSandbox('js/items.js', sandbox);
  loadScriptIntoSandbox('js/inventory.js', sandbox);

  assert(sandbox.P, 'Player P must exist');
  sandbox.P.level = 1;
  sandbox.P.skillPoints = 0;
  sandbox.P.xp = 0;
  sandbox.P.xpNext = 100;

  // Level up grants 1 skill point
  sandbox.addPlayerXP(100, 'combat');
  assertEqual(sandbox.P.level, 2, 'Player should reach level 2');
  assertEqual(sandbox.P.skillPoints, 1, 'Player should have 1 available skill point');

  const initialHp = sandbox.P.baseStats.maxHp;
  const initialDef = sandbox.P.baseStats.defense || 0;

  // Invest point into Defense
  const res = sandbox.investSkillPoint('defense');
  assertEqual(res, true, 'investSkillPoint(defense) should succeed');
  assertEqual(sandbox.P.skillPoints, 0, 'Skill points should decrement to 0');
  assert((sandbox.P.baseStats.defense || 0) > initialDef, 'Defense attribute should increase');

  // Investing with 0 points fails cleanly
  const resFail = sandbox.investSkillPoint('hp');
  assertEqual(resFail, false, 'investSkillPoint with 0 points must fail');

  console.log('  ✔ Test 1 Passed: Leveling grants skill points & investSkillPoint updates attributes instantly');
}

// Test 2: Enemy Level Scaling & Zone Distance Scaling
{
  const sandbox = createGameSandbox();
  loadScriptIntoSandbox('js/entities.js', sandbox);

  sandbox.P = { x: 0, y: 50, z: 0, level: 5 };

  // Near spawn (distance ~0) with player level 5
  const scaledLvlNear = sandbox.EntityManager.computeScaledLevel(10, 10);
  assert(scaledLvlNear >= 3 && scaledLvlNear <= 7, `Near spawn level should be within [3, 7], got: ${scaledLvlNear}`);

  // Far from spawn (distance ~720m) adds distance tier
  const scaledLvlFar = sandbox.EntityManager.computeScaledLevel(500, 500);
  assert(scaledLvlFar >= scaledLvlNear, 'Far zone enemies should have equal or higher level than near spawn');

  // Creature stats scale directly with level
  const mobLv1 = sandbox.EntityManager.spawnCreature('Wolf', 0, 50, 0, 1);
  const mobLv5 = sandbox.EntityManager.spawnCreature('Wolf', 0, 50, 0, 5);

  assertEqual(mobLv1.level, 1, 'Mob 1 level is 1');
  assertEqual(mobLv5.level, 5, 'Mob 5 level is 5');
  assert(mobLv5.maxHp > mobLv1.maxHp, 'Lv5 wolf must have significantly higher HP than Lv1');
  assert(mobLv5.baseDamage > mobLv1.baseDamage, 'Lv5 wolf must have higher base damage than Lv1');
  assert(mobLv5.loot.xp > mobLv1.loot.xp, 'Lv5 wolf must grant more XP');

  console.log('  ✔ Test 2 Passed: Enemies scale level, stats, damage & rewards by player level and distance');
}

// Test 3: World Generation & Continental Dominance
{
  const sandbox = createGameSandbox();
  loadScriptIntoSandbox('js/config.js', sandbox);
  loadScriptIntoSandbox('js/world.js', sandbox);

  let landCount = 0;
  let waterCount = 0;
  const samplePoints = 200;

  for (let i = 0; i < samplePoints; i++) {
    const rx = (i % 20) * 100 - 1000;
    const rz = Math.floor(i / 20) * 100 - 1000;
    const h = sandbox.height(rx, rz);
    if (h >= sandbox.SEA) landCount++;
    else waterCount++;
  }

  const landPercentage = (landCount / samplePoints) * 100;
  assert(landPercentage > 75, `Land should dominate the world (>75%), current land: ${landPercentage}%`);

  // Test biome stability across distance (10x larger scale means biomes don't jitter every few blocks)
  const b1 = sandbox.biome(0, 0, 50);
  const b2 = sandbox.biome(50, 50, 50);
  assertEqual(b1, b2, 'Nearby points should stay in the same macro-biome with 10x noise scale');

  console.log(`  ✔ Test 3 Passed: Continental landmass dominates (${landPercentage.toFixed(1)}% land), biomes are vast and smooth`);
}

console.log('🎉 All RPG, Enemy Scaling & Biome tests passed with 100% success!\n');

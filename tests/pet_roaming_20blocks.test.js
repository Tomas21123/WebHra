const assert = require('assert');
const { createGameSandbox, loadScriptIntoSandbox } = require('./test_harness');

console.log('🧪 Starting Pet 20-Block Roaming & Combat Perimeter Tests...\n');

const sandbox = createGameSandbox();
loadScriptIntoSandbox('js/config.js', sandbox);
loadScriptIntoSandbox('js/items.js', sandbox);
loadScriptIntoSandbox('js/entities.js', sandbox);

// 1. Initial State & Roam Radius
console.log('▶ Test 1: Verifying active pet roamRadius is 20.0 blocks by default...');
sandbox.P.x = 100;
sandbox.P.y = 50;
sandbox.P.z = 100;
sandbox.P.renderY = 50;
sandbox.P.isRiding = false;
sandbox.EQUIPPED_SLOTS = { pet: 'pet_dog_husky' };

const pet = sandbox.PetManager.summonPet('pet_dog_husky');
assert(pet, 'Pet must be summoned successfully');
assert.strictEqual(pet.roamRadius, 20.0, `Expected roamRadius to be 20.0, got ${pet.roamRadius}`);
assert.strictEqual(sandbox.PetManager.defaultRoamRadius, 20.0, 'PetManager defaultRoamRadius should be 20.0');
console.log('✔ Pet initialized with 20.0 block roaming perimeter!\n');

// 2. Autonomous Roaming Within 20-Block Circle
console.log('▶ Test 2: Verifying autonomous roaming generates waypoints within 20 blocks...');
// Run multiple simulation steps without enemies
for (let step = 0; step < 120; step++) {
  sandbox.PetManager.update(0.05, step * 50);
  const distToPlayer = Math.hypot(pet.x - sandbox.P.x, pet.z - sandbox.P.z);
  assert(
    distToPlayer <= 20.5,
    `Pet wandered too far from player: ${distToPlayer.toFixed(2)} blocks (max 20.0)`
  );
  if (pet.roamTargetX !== null && pet.roamTargetZ !== null) {
    const targetDist = Math.hypot(pet.roamTargetX - sandbox.P.x, pet.roamTargetZ - sandbox.P.z);
    assert(
      targetDist <= 20.0,
      `Roam target waypoint exceeded 20 blocks: ${targetDist.toFixed(2)} blocks`
    );
  }
}
console.log('✔ Pet autonomously wanders and selects waypoints strictly within 20 blocks!\n');

// 3. Freedom of Movement (Not locked to 1.65m hip anchor)
console.log('▶ Test 3: Verifying pet explores freely beyond close 1.65m hip anchor...');
let reachedFurtherThan5Blocks = false;
// Place roam target at 10 blocks
pet.roamTargetX = sandbox.P.x + 10;
pet.roamTargetZ = sandbox.P.z;
pet.roamWaitTimer = 0;
pet.roamMoveSpeed = 8.0;

for (let i = 0; i < 40; i++) {
  sandbox.PetManager.update(0.05, 1000 + i * 50);
  const d = Math.hypot(pet.x - sandbox.P.x, pet.z - sandbox.P.z);
  if (d > 5.0) {
    reachedFurtherThan5Blocks = true;
    break;
  }
}
assert(
  reachedFurtherThan5Blocks,
  'Pet should roam freely away from player (dist > 5 blocks) instead of snapping to 1.65m'
);
console.log(`✔ Pet successfully roamed to ${Math.hypot(pet.x - sandbox.P.x, pet.z - sandbox.P.z).toFixed(2)} blocks from player!\n`);

// 4. Return to 20-Block Boundary When Outside
console.log('▶ Test 4: Verifying pet returns into 20-block circle when outside (e.g. player walks away)...');
// Move pet artificially to 26 blocks away
pet.x = sandbox.P.x + 26;
pet.z = sandbox.P.z;
const distBefore = Math.hypot(pet.x - sandbox.P.x, pet.z - sandbox.P.z);
assert(distBefore > 20.0, 'Pet starts outside 20 blocks');

// Run updates: pet should path back towards player
for (let i = 0; i < 50; i++) {
  sandbox.PetManager.update(0.05, 5000 + i * 50);
  if (Math.hypot(pet.x - sandbox.P.x, pet.z - sandbox.P.z) <= 20.0) break;
}
const distAfter = Math.hypot(pet.x - sandbox.P.x, pet.z - sandbox.P.z);
assert(
  distAfter <= 20.0,
  `Pet should return inside 20 blocks, but is at ${distAfter.toFixed(2)} blocks`
);
console.log(`✔ Pet returned from ${distBefore.toFixed(1)} blocks to ${distAfter.toFixed(1)} blocks inside the 20-block radius!\n`);

// 5. Emergency Teleport on Player Teleport (> 35 blocks)
console.log('▶ Test 5: Verifying emergency teleport when player teleports far away (> 35 blocks)...');
sandbox.P.x = 500;
sandbox.P.z = 500;
const distFar = Math.hypot(pet.x - sandbox.P.x, pet.z - sandbox.P.z);
assert(distFar > 35.0, 'Player teleported far away');

sandbox.PetManager.update(0.05, 10000);
const distAfterTeleport = Math.hypot(pet.x - sandbox.P.x, pet.z - sandbox.P.z);
assert(
  distAfterTeleport <= 6.0,
  `Pet should emergency teleport near player, got distance ${distAfterTeleport.toFixed(2)}`
);
console.log(`✔ Pet emergency caught up to player (now ${distAfterTeleport.toFixed(2)} blocks away)!\n`);

// 6. Perimeter Enemy Defense within 20 Blocks
console.log('▶ Test 6: Verifying pet defense targets enemies within 20 blocks, ignores enemies beyond 20 blocks...');
// Spawn enemy at 16 blocks (within 20 blocks)
const nearbyEnemy = sandbox.EntityManager.spawnCreature('Goblin', sandbox.P.x + 15, sandbox.P.y, sandbox.P.z, 1);
sandbox.PetManager.update(0.05, 12000);
assert.strictEqual(
  pet.targetEnemy,
  nearbyEnemy,
  'Pet must target and defend against enemy located within 20 blocks'
);
console.log('✔ Pet targeted enemy within 20-block perimeter (15 blocks away)!');

// Despawn nearby enemy, test far enemy at 28 blocks
nearbyEnemy.state = 'Dead';
nearbyEnemy.hp = 0;
pet.targetEnemy = null;

const farEnemy = sandbox.EntityManager.spawnCreature('Goblin', sandbox.P.x + 28, sandbox.P.y, sandbox.P.z, 1);
sandbox.PetManager.update(0.05, 13000);
assert.strictEqual(
  pet.targetEnemy,
  null,
  'Pet must NOT target enemy located beyond 20 blocks'
);
console.log('✔ Pet ignored enemy outside 20-block perimeter (28 blocks away)!\n');

// 7. Mounting and Dismounting with 20-Block Roaming
console.log('▶ Test 7: Verifying mounting and dismounting preserves 20-block roaming behavior...');
// Move pet close and mount
pet.x = sandbox.P.x + 1;
pet.z = sandbox.P.z + 1;
const mountSuccess = sandbox.PetManager.interactClosestPet(sandbox.P.x, sandbox.P.y, sandbox.P.z);
assert(mountSuccess === true, 'Mounting must succeed when close');
assert(sandbox.P.isRiding === true, 'Player is riding');

// Update while mounted
sandbox.PetManager.update(0.05, 14000);
assert.strictEqual(pet.x, sandbox.P.x, 'Mounted pet follows player directly');
assert.strictEqual(pet.z, sandbox.P.z, 'Mounted pet follows player directly');

// Dismount
const dismountSuccess = sandbox.PetManager.interactClosestPet(sandbox.P.x, sandbox.P.y, sandbox.P.z);
assert(dismountSuccess === true, 'Dismounting must succeed');
assert(sandbox.P.isRiding === false, 'Player is no longer riding');
assert.strictEqual(pet.roamRadius, 20.0, 'Roam radius is maintained at 20.0 on dismount');

console.log('✔ Mounting and dismounting seamless with 20-block roaming!\n');

console.log('🎉 ALL PET 20-BLOCK ROAMING & PERIMETER DEFENSE TESTS PASSED (100% SUCCESS)!');
process.exit(0);

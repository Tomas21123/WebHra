const assert = require('assert');
const { createGameSandbox, loadScriptIntoSandbox } = require('./test_harness');

console.log('🧪 Starting Dragon Tiers 1-5, Wyvern Model, Egg Separation & Mount Breath Tests...\n');

const sandbox = createGameSandbox();
loadScriptIntoSandbox('js/config.js', sandbox);
loadScriptIntoSandbox('js/items.js', sandbox);
loadScriptIntoSandbox('js/entities.js', sandbox);
loadScriptIntoSandbox('js/player.js', sandbox);
loadScriptIntoSandbox('js/skills.js', sandbox);

// 1. Ověření existence všech vajíček a mazlíčků pro Tier 1 až Tier 5
console.log('▶ Test 1: Checking Tier 1 to 5 Egg & Pet item definitions...');
const tiers = [1, 2, 3, 4, 5];
const types = ['fire', 'ice'];

types.forEach(type => {
  tiers.forEach(tier => {
    const eggId = `egg_dragon_${type}_t${tier}`;
    const egg = sandbox.INV.find(i => i.id === eggId);
    assert(egg, `Item ${eggId} must exist in INV`);
    assert(egg.tier === tier, `Egg ${eggId} tier must be ${tier}`);
    assert(egg.dragonType === type, `Egg ${eggId} dragonType must be ${type}`);

    const petId = `pet_wyvern_${type}_t${tier}`;
    const pet = sandbox.INV.find(i => i.id === petId);
    assert(pet, `Item ${petId} must exist in INV`);
    assert(pet.tier === tier, `Pet ${petId} tier must be ${tier}`);
    assert(pet.isDragon === true, `Pet ${petId} must have isDragon: true`);
    assert(pet.dragonType === type, `Pet ${petId} dragonType must be ${type}`);
    assert(pet.canFly === true, `Pet ${petId} canFly must be true`);
  });
});
console.log('✔ All 10 Tiered eggs and 10 Tiered wyvern pets correctly defined with tier metadata!');

// 2. Líhnutí dračích vajec na odpovídající Tier peta
console.log('\n▶ Test 2: Egg hatching maps correctly to matching Tier pet...');
tiers.forEach(tier => {
  types.forEach(type => {
    const eggId = `egg_dragon_${type}_t${tier}`;
    const egg = sandbox.INV.find(i => i.id === eggId);
    egg.count = 1;
    const expectedPetId = `pet_wyvern_${type}_t${tier}`;
    const hatchedPetId = sandbox.hatchDragonEgg(eggId);
    assert.strictEqual(hatchedPetId, expectedPetId, `Hatching ${eggId} must produce ${expectedPetId}`);
  });
});
console.log('✔ hatchDragonEgg cleanly maps each Tier 1-5 egg to its respective Tier pet!');

// 3. Spawnování wyveren různých Tierů a škálování jejich statistik
console.log('\n▶ Test 3: Wild Wyvern Tiers 1-5 stat & scale validation...');
const t1Wyvern = sandbox.EntityManager.spawnCreature('WyvernFire', 10, 5, 10, 10, 1);
assert.strictEqual(t1Wyvern.tier, 1, 'Wyvern should have tier 1');
assert.strictEqual(t1Wyvern.tierScale, 0.65, 'T1 Wyvern scale should be 0.65');

const t5Wyvern = sandbox.EntityManager.spawnCreature('WyvernFire', 20, 5, 20, 50, 5);
assert.strictEqual(t5Wyvern.tier, 5, 'Wyvern should have tier 5');
assert.strictEqual(t5Wyvern.tierScale, 2.05, 'T5 Wyvern scale should be 2.05 (Titan)');
assert(t5Wyvern.maxHp > t1Wyvern.maxHp * 3, 'T5 Wyvern must have significantly more HP than T1');
assert(t5Wyvern.baseDamage > t1Wyvern.baseDamage * 2, 'T5 Wyvern baseDamage must be higher than T1');
console.log(`✔ T1 Wyvern HP=${t1Wyvern.maxHp}, Dmg=${t1Wyvern.baseDamage} vs T5 Titan Wyvern HP=${t5Wyvern.maxHp}, Dmg=${t5Wyvern.baseDamage}`);

// 4. Mrtvola draka uchovává Tier a lootování dává vejce odpovídajícího Tieru
console.log('\n▶ Test 4: Dragon corpse looting drops matching Tier egg...');
// Spawnujeme corpse s tierem 4
const corpseT4 = sandbox.EntityManager.spawnDragonCorpse('WyvernFire', 30, 5, 30, 4);
assert(corpseT4, 'Corpse must spawn');
assert.strictEqual(corpseT4.tier, 4, 'Corpse must remember tier 4');

// Test looting (vynutíme drop vajíčka nastavením Math.random)
const origRandom = Math.random;
Math.random = () => 0.10; // šance 10% < 30% -> vejce spadne

sandbox.P.x = 30;
sandbox.P.y = 5;
sandbox.P.z = 30;

let eggFound = false;
sandbox.EntityManager.tryLootClosestCorpse(30, 5, 30);
const lootedEgg = sandbox.INV.find(i => i.id === 'egg_dragon_fire_t4');
assert(lootedEgg && lootedEgg.count > 0, 'Looting T4 Fire Dragon corpse must award egg_dragon_fire_t4');
Math.random = origRandom;
console.log('✔ Looting T4 Dragon corpse yields egg_dragon_fire_t4!');

// 5. Nasednutí na draka a nahrazení útoku zbraně chrlením ohně/mrazu
console.log('\n▶ Test 5: Dragon riding intercepts weapon attacks with spectacular dragon breath...');
sandbox.EQUIPPED_SLOTS = { pet: 'pet_wyvern_fire_t3' };
const petIt = sandbox.INV.find(i => i.id === 'pet_wyvern_fire_t3');
if (petIt) petIt.count = 1;
const petWyvern = sandbox.PetManager.summonPet('pet_wyvern_fire_t3');
assert(petWyvern, 'Pet Wyvern T3 summoned');
assert.strictEqual(petWyvern.isDragon, true, 'Pet wyvern isDragon is true');
assert.strictEqual(petWyvern.tier, 3, 'Pet wyvern tier is 3');

// Nasednout na draka
sandbox.PetManager.mountPet();
assert.strictEqual(sandbox.P.isRiding, true, 'Player is riding');
assert.strictEqual(sandbox.P.canFly, true, 'Player can fly while riding dragon');

// Sledujeme volání triggerMountDragonBreath
let breathCalled = false;
let breathParams = null;
const origBreath = sandbox.PetManager.triggerMountDragonBreath;
sandbox.PetManager.triggerMountDragonBreath = function() {
  breathCalled = true;
  return origBreath.apply(this, arguments);
};

// Spustit útok dominantní rukou (LMB)
const attackResult = sandbox.handleHandAction('dominant');
assert.strictEqual(attackResult, true, 'handleHandAction should return true from dragon breath');
assert.strictEqual(breathCalled, true, 'Dragon breath must be triggered instead of swinging player sword!');
console.log('✔ Attack LMB while riding dragon successfully triggers dragon breath!');

// 6. Ověření otevírání čelisti (jaw opening) a cooldownu chrlení
console.log('\n▶ Test 6: Dragon jaw animation and cooldown verification...');
assert(petWyvern.attackCooldownTimer > 0, 'Pet dragon should have breath cooldown active');
assert(petWyvern.attackAnimTimer > 0, 'Pet dragon should have attackAnimTimer active');

// Animace v PetManager.update
sandbox.PetManager.update(0.016, 2000);
if (petWyvern.limbMeshes && petWyvern.limbMeshes.jaw) {
  assert(petWyvern.limbMeshes.jaw.rotation.x > 0, 'Dragon jaw must be opened during breath attack');
  console.log(`✔ Dragon jaw successfully rotated to ${petWyvern.limbMeshes.jaw.rotation.x.toFixed(2)} rad during breath!`);
}

// 7. Ověření klávesy [R] vs [E]
console.log('\n▶ Test 7: Key [R] dismisses and summons pet without auto-mounting...');
// Hráč nyní sedí na drakovi. Stisknutí [R] schová mazlíčka (sesedne a odvolá)
sandbox.PetManager.handleKeyR();
assert.strictEqual(sandbox.PetManager.activePet, null, 'Key [R] must dismiss active pet');
assert.strictEqual(sandbox.P.isRiding, false, 'Key [R] dismounts player');

// Další stisknutí [R] mazlíčka pouze vyvolá vedle hráče (NESMÍ automaticky nasednout!)
sandbox.PetManager.handleKeyR();
assert(sandbox.PetManager.activePet !== null, 'Key [R] summons pet');
assert.strictEqual(sandbox.P.isRiding, false, 'Key [R] MUST NOT mount pet! Only [E] mounts.');
console.log('✔ Key [R] only summons and dismisses pet. Auto-mounting is cleanly separated to key [E]!');

console.log('\n🎉 ALL DRAGON TIERS 1-5, WYVERN MODEL, EGG SEPARATION & MOUNT BREATH TESTS PASSED (100% SUCCESS)!');
process.exit(0);

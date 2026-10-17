const assert = require('assert');
const { createGameSandbox, loadScriptIntoSandbox } = require('./test_harness');

console.log('Testing Pet Combat & Riding Smoothness...');

const sandbox = createGameSandbox();
loadScriptIntoSandbox('js/config.js', sandbox);
loadScriptIntoSandbox('js/items.js', sandbox);
loadScriptIntoSandbox('js/entities.js', sandbox);

// 1. Verify CREATURE_CONFIGS for pets have baseDamage > 0
assert(sandbox.CREATURE_CONFIGS.DogShepherd.baseDamage === 18, 'DogShepherd should have baseDamage 18');
assert(sandbox.CREATURE_CONFIGS.DogHusky.baseDamage === 22, 'DogHusky should have baseDamage 22');
assert(sandbox.CREATURE_CONFIGS.Cat.baseDamage === 16, 'Cat should have baseDamage 16');
assert(sandbox.CREATURE_CONFIGS.Cow.baseDamage === 26, 'Cow should have baseDamage 26');
console.log('✔ Pet CREATURE_CONFIGS have proper baseDamage');

// 2. Setup player and inventory
sandbox.P.x = 10;
sandbox.P.y = 5;
sandbox.P.z = 20;
sandbox.P.renderY = 5;
sandbox.P.isRiding = false;
sandbox.P.level = 2;

const petItem = sandbox.INV.find(i => i.id === 'pet_dog_shepherd');
assert(petItem, 'pet_dog_shepherd item exists');
assert(petItem.baseDamage === 18, 'petItem has baseDamage 18');
petItem.count = 1;
sandbox.EQUIPPED_SLOTS = { pet: 'pet_dog_shepherd' };

// 3. Summon pet
const pet = sandbox.PetManager.summonPet('pet_dog_shepherd');
assert(pet, 'Pet should be summoned');
assert(pet.baseDamage === 18, `Pet baseDamage expected 18, got ${pet.baseDamage}`);
assert(pet.labelSprite.visible === true, 'Pet label should be visible when not riding');
console.log('✔ Pet summoned with baseDamage and visible label');

// 4. Mount pet
sandbox.PetManager.mountPet();
assert(sandbox.P.isRiding === true, 'Player should be riding');
assert(pet.labelSprite.visible === false, 'Pet billboard label must be hidden while riding to avoid blocking screen');
assert(pet.x === 10 && pet.z === 20, 'Pet must be positioned directly at player position');
console.log('✔ Mounting pet hides overhead billboard label and aligns pet under player');

// 5. Test pet attack on hostile enemy
const enemy = sandbox.EntityManager.spawnCreature('Goblin', 11, 5, 20, 1);
const initialHp = enemy.hp;
assert(initialHp > 0, 'Enemy has initial HP');

const hitSuccess = sandbox.PetManager.attackTarget(enemy);
assert(hitSuccess === true, 'attackTarget should succeed');
assert(enemy.hp < initialHp, `Enemy HP should have decreased from ${initialHp}, now ${enemy.hp}`);
console.log(`✔ Pet successfully attacked enemy: HP ${initialHp} -> ${enemy.hp}`);

// 6. Test dismount
sandbox.PetManager.dismountPet();
assert(sandbox.P.isRiding === false, 'Player should not be riding');
assert(pet.labelSprite.visible === true, 'Pet label should be visible after dismount');
console.log('✔ Dismounting restores pet label visibility');

// 7. Test companion auto-combat update when dismounted
sandbox.PetManager.update(0.016, 1000);
assert(pet.targetEnemy === enemy, 'Pet should target nearby enemy');
console.log('✔ Dismounted pet targets enemy');

console.log('\nAll Pet Combat & Riding Smoothness tests passed successfully!');
process.exit(0);

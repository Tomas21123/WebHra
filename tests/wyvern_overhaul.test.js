const assert = require('assert');
const { createGameSandbox, loadScriptIntoSandbox } = require('./test_harness');

console.log('🧪 Starting Wyvern 3D Overhaul & Attack Animation Verification Tests...\n');

const sandbox = createGameSandbox();
loadScriptIntoSandbox('js/config.js', sandbox);
loadScriptIntoSandbox('js/items.js', sandbox);
loadScriptIntoSandbox('js/entities.js', sandbox);
loadScriptIntoSandbox('js/player.js', sandbox);
loadScriptIntoSandbox('js/skills.js', sandbox);

// 1. Ověření modelu Wyverny - anatomie tetrapoda, detailní segmentace
console.log('▶ Test 1: Spawning Fire & Ice Wyvern and verifying anatomical mesh hierarchy...');
const wyvern = sandbox.EntityManager.spawnCreature('WyvernFire', 15, 5, 15, 10, 3);
assert(wyvern, 'WyvernFire must spawn');
assert.strictEqual(wyvern.isDragon, true, 'isDragon must be true');
assert(wyvern.limbMeshes, 'limbMeshes must be defined');

// Ověření specifických segmentů modelu:
assert(wyvern.limbMeshes.head, 'wyvern must have head mesh');
assert(wyvern.limbMeshes.jaw, 'wyvern must have hinged jaw');
assert(wyvern.limbMeshes.chest, 'wyvern must have chest group for breathing expansion');
assert(wyvern.limbMeshes.neckSegments && wyvern.limbMeshes.neckSegments.length === 3, 'wyvern must have 3 articulated neck segments');
assert(wyvern.limbMeshes.wings && wyvern.limbMeshes.wings.length === 2, 'wyvern must have 2 massive wings acting as forelimbs');
assert(wyvern.limbMeshes.legs && wyvern.limbMeshes.legs.length === 2, 'wyvern must have 2 digitigrade raptor hind legs');
assert(wyvern.limbMeshes.tail, 'wyvern must have whipping tail');
assert(wyvern.limbMeshes.throatMat, 'wyvern must have emissive throat material');
console.log('✔ Wyvern 3D model properly rigged with keeled chest, 3 neck segments, hinged jaw, wings, raptor legs & emissive throat!');

// 2. Ověření klidového cyklu (Idle / Breathing)
console.log('\n▶ Test 2: Verifying wyvern idle breathing and smoldering embers...');
wyvern.state = 'Idle';
wyvern.update(0.033, 1000);
assert(wyvern.limbMeshes.chest.scale.x > 0.95 && wyvern.limbMeshes.chest.scale.x < 1.15, 'Chest scale should subtly breathe in idle');
assert(wyvern.limbMeshes.throatMat.emissiveIntensity > 0, 'Throat should have smoldering ember glow in idle');
console.log(`✔ Wyvern idle verified: chest scale=${wyvern.limbMeshes.chest.scale.x.toFixed(3)}, throat emissive=${wyvern.limbMeshes.throatMat.emissiveIntensity}`);

// 3. Fáze 1 útoku: Wind-up (Příprava)
console.log('\n▶ Test 3: Triggering attack & verifying Wind-up phase (Inhale, Wing spread, Glowing throat)...');
sandbox.P.x = 15;
sandbox.P.z = 15;
wyvern.state = 'Attack';
wyvern.attackTimer = 0;
wyvern.wyvernAttackStage = 'idle';

// Simulujeme update, který aktivuje windup
wyvern.update(0.016, 2000);
assert.strictEqual(wyvern.wyvernAttackStage, 'windup', 'Wyvern must transition to windup attack stage');
assert(wyvern.wyvernStageTimer > 0, 'windup timer must be active');

// Posun v čase windupu (např. 0.35s)
wyvern.update(0.35, 2350);
assert(wyvern.limbMeshes.chest.scale.x > 1.05, 'Chest must noticeably expand during deep inhale');
assert(wyvern.limbMeshes.throatMat.emissiveIntensity > 0.5, 'Throat emissive glow must flare up during windup');
assert(wyvern.limbMeshes.jaw.rotation.x > 0, 'Jaw must slightly part to inhale air');
console.log(`✔ Wind-up phase verified: chest expanded to ${wyvern.limbMeshes.chest.scale.x.toFixed(2)}x, throat glowing at ${wyvern.limbMeshes.throatMat.emissiveIntensity.toFixed(2)}, jaw open ${wyvern.limbMeshes.jaw.rotation.x.toFixed(2)} rad!`);

// 4. Fáze 2 útoku: Fire Blast & Recoil (Samotný útok)
console.log('\n▶ Test 4: Verifying Fire Blast phase (Head lunge, wide jaw opening & body recoil)...');
// Posunout čas tak, aby vypršel windup (0.75s) a přešel do 'fire'
wyvern.update(0.45, 2800);
assert.strictEqual(wyvern.wyvernAttackStage, 'fire', 'Wyvern must transition to fire stage after windup');
assert(wyvern.limbMeshes.jaw.rotation.x > 1.0, `Jaw must open wide (>1.0 rad) during fire blast, got ${wyvern.limbMeshes.jaw.rotation.x}`);
assert(wyvern.limbMeshes.root.position.z < 0, `Wyvern body must recoil backwards, got z=${wyvern.limbMeshes.root.position.z}`);
assert(wyvern.limbMeshes.throatMat.emissiveIntensity >= 2.5, 'Throat must blaze at peak emissive intensity');
console.log(`✔ Fire blast phase verified: jaw open to ${wyvern.limbMeshes.jaw.rotation.x.toFixed(2)} rad (~66°), recoil z=${wyvern.limbMeshes.root.position.z.toFixed(2)}, throat emissive=${wyvern.limbMeshes.throatMat.emissiveIntensity}!`);

// 5. Fáze 3 útoku: Recovery & Smoke (Doznívání a kouř)
console.log('\n▶ Test 5: Verifying Recovery phase (Jaw closing, throat cooling, smoke trail & idle reset)...');
let smokeCalled = false;
sandbox.window.spawnWyvernSmokePuff = () => { smokeCalled = true; };

// Posunout čas tak, aby vypršela fáze fire (0.85s) a přešla do 'recovery'
wyvern.update(0.90, 3700);
assert.strictEqual(wyvern.wyvernAttackStage, 'recovery', 'Wyvern must transition to recovery stage');

// Další posun v recovery
wyvern.update(0.20, 3900);
assert(wyvern.limbMeshes.jaw.rotation.x < 0.5, 'Jaw must begin closing during recovery');
assert(wyvern.limbMeshes.throatMat.emissiveIntensity < 2.5, 'Throat must begin cooling during recovery');
assert(smokeCalled, 'spawnWyvernSmokePuff must be called during recovery to vent smoke from mouth/nostrils');

// Dokončit recovery (0.65s) -> návrat do idle
wyvern.update(0.50, 4400);
assert.strictEqual(wyvern.wyvernAttackStage, 'idle', 'Wyvern must return cleanly to idle after recovery');
console.log('✔ Recovery phase verified: smoke puff vented, jaw closed, throat cooled, reset to idle!');

// 6. Ověření PetManager jízdy a dechu s novou animací
console.log('\n▶ Test 6: Verifying PetManager mount breath animation...');
sandbox.EQUIPPED_SLOTS = { pet: 'pet_wyvern_fire_t3' };
const petItem = sandbox.INV.find(i => i.id === 'pet_wyvern_fire_t3');
if (petItem) petItem.count = 1;
const pet = sandbox.PetManager.summonPet('pet_wyvern_fire_t3');
assert(pet, 'Pet wyvern summoned');
sandbox.PetManager.mountPet();
assert.strictEqual(sandbox.P.isRiding, true, 'Player mounted wyvern');

// Spustit dech přes LMB
sandbox.handleHandAction('dominant');
assert(pet.attackAnimTimer > 0, 'attackAnimTimer must be active');
sandbox.PetManager.update(0.016, 5000);
assert(pet.limbMeshes.jaw.rotation.x > 0, 'Pet jaw must open during breath');
console.log(`✔ Pet mounted wyvern breath animation active with jaw rotation ${pet.limbMeshes.jaw.rotation.x.toFixed(2)} rad!`);

console.log('\n🎉 ALL WYVERN 3D OVERHAUL & ATTACK ANIMATION TESTS PASSED (100% SUCCESS)!');
process.exit(0);

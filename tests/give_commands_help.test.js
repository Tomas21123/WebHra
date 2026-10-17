/**
 * =============================================================================
 * Verification Test: Empty New World Inventory, /give & /help detail Modal
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { assert, assertEqual } = require('./test_utils');
const { createGameSandbox, loadScriptIntoSandbox } = require('./test_harness');

console.log('🧪 Starting Give Commands, Help Detail Modal & Inventory Tests...');

function createChatSandbox() {
  const sandbox = createGameSandbox();
  sandbox.toasts = [];
  sandbox.toast = msg => sandbox.toasts.push(msg);
  sandbox.ui = () => {};
  sandbox.renderInv = () => {};
  sandbox.renderHB = () => {};
  sandbox.updateEquipmentUI = () => {};
  sandbox.applyHeld = () => {};
  sandbox.updatePlayerAppearance = () => {};
  sandbox.syncEQArray = () => {};

  loadScriptIntoSandbox('js/config.js', sandbox);
  loadScriptIntoSandbox('js/player.js', sandbox);
  loadScriptIntoSandbox('js/items.js', sandbox);
  loadScriptIntoSandbox('js/inventory.js', sandbox);
  loadScriptIntoSandbox('js/chat.js', sandbox);

  return sandbox;
}

// Test 1: /give item <kategorie> <nazev>
{
  const sb = createChatSandbox();
  const sword = sb.INV.find(it => it.id === 'sword');
  sword.count = 0;

  sb.executeCommand('/give item weapon sword');
  assertEqual(sword.count, 1, 'Sword count should be 1 after /give item weapon sword');
  const msgs = sb.document.getElementById('chatMessages').children;
  assert(msgs.some(c => c.innerHTML && c.innerHTML.includes('Ocelový meč')), 'Chat should confirm item added');

  sb.executeCommand('/give item material ore_iron 15');
  const iron = sb.INV.find(it => it.id === 'ore_iron');
  assert(iron.count >= 15, 'Iron ore count should increase by 15');
  console.log('  ✔ Test 1 Passed: /give item <kategorie> <nazev> gives specific item');
}

// Test 2: /give item all and /give all
{
  const sb = createChatSandbox();
  sb.executeCommand('/clearinv');
  assertEqual(sb.INV.find(it => it.id === 'sword').count, 0, 'Inventory should be empty after /clearinv');

  sb.executeCommand('/give item all');
  assert(sb.INV.every(it => (it.count || 0) > 0), 'Every item in INV should have count > 0 after /give item all');
  console.log('  ✔ Test 2 Passed: /give item all gives all items in the game');
}

// Test 3: /give xp <počet> with overflow into subsequent levels
{
  const sb = createChatSandbox();
  sb.P.level = 1;
  sb.P.xp = 0;
  sb.P.xpNext = 100;
  sb.P.skillPoints = 0;

  // Player needs 100 XP to level 2. We give 105 XP -> 5 XP overflows into level 2.
  sb.executeCommand('/give xp 105');
  assertEqual(sb.P.level, 2, 'Player should advance to level 2');
  assertEqual(sb.P.xp, 5, 'Overflow 5 XP should be preserved in level 2');
  assertEqual(sb.P.skillPoints, 1, 'Player should gain 1 skill point on level up');

  // Multi-level jump test: give 5000 XP
  const prevLevel = sb.P.level;
  sb.executeCommand('/give xp 5000');
  assert(sb.P.level > prevLevel + 2, 'Huge XP grant should skip multiple levels');
  assert(sb.P.xp >= 0 && sb.P.xp < sb.P.xpNext, 'Current XP must be within [0, xpNext)');
  console.log('  ✔ Test 3 Passed: /give xp <počet> cleanly carries overflow into next levels');
}

// Test 4: /give gold & /give pet
{
  const sb = createChatSandbox();
  const goldBefore = (sb.INV.find(it => it.id === 'coin_gold' || it.id === 'ore_gold') || {}).count || 0;
  sb.executeCommand('/give gold 50');
  const goldAfter = (sb.INV.find(it => it.id === 'coin_gold' || it.id === 'ore_gold') || {}).count || 0;
  assertEqual(goldAfter, goldBefore + 50, 'Gold should increase by 50');

  sb.executeCommand('/give pet husky');
  const husky = sb.INV.find(it => it.id === 'pet_dog_husky');
  assert(husky && husky.count > 0, 'Husky pet should be given to inventory');
  console.log('  ✔ Test 4 Passed: /give gold and /give pet work correctly');
}

// Test 5: /help detail and /clearinv
{
  const sb = createChatSandbox();
  let modalOpened = false;
  sb.openHelpDetailModal = () => { modalOpened = true; };

  sb.executeCommand('/help detail');
  assertEqual(modalOpened, true, '/help detail should call openHelpDetailModal()');

  sb.executeCommand('/clearinv');
  assert(sb.INV.every(it => (it.count || 0) === 0), 'All items should have count 0 after /clearinv');
  console.log('  ✔ Test 5 Passed: /help detail triggers modal and /clearinv clears all items');
}

console.log('🎉 All Give Commands, Help Detail Modal & Inventory tests passed with 100% success!');

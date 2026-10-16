#!/usr/bin/env node
/**
 * =============================================================================
 * Voxelový Svět - Opaque-Box E2E Master Test Runner (Tiers 1 - 4)
 * =============================================================================
 * Usage:
 *   node test_e2e_runner.js
 *   node test_e2e_runner.js --tier 1
 *   node test_e2e_runner.js --tier 1,2
 *   node test_e2e_runner.js --tier 4
 *
 * Exit code:
 *   0 = All tests passed
 *   1 = One or more tests failed
 * =============================================================================
 */

const path = require('path');
const { runSuites, suites } = require('./tests/test_utils');

// Parse command line arguments
const args = process.argv.slice(2);
let tierFilter = null;
let verbose = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--tier' && args[i + 1]) {
    tierFilter = args[i + 1].split(',').map(s => s.trim());
    i++;
  } else if (args[i].startsWith('--tier=')) {
    tierFilter = args[i].split('=')[1].split(',').map(s => s.trim());
  } else if (args[i] === '--verbose' || args[i] === '-v') {
    verbose = true;
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
Voxelový Svět E2E Test Suite Runner
Usage:
  node test_e2e_runner.js [options]

Options:
  --tier <1,2,3,4>    Run specific tiers (e.g. --tier 1 or --tier 1,4)
  --verbose, -v       Print detailed execution output
  --help, -h          Show this help message
`);
    process.exit(0);
  }
}

// Load test tier suites
console.log('\x1b[1m\x1b[35m');
console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║       VOXELOVÝ SVĚT — OPAQUE-BOX E2E TEST RUNNER (TIERS 1 - 4)       ║');
console.log('║           Action-RPG, Exploration, Multiplayer & Contracts           ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝');
console.log('\x1b[0m');

const startTime = Date.now();

try {
  // Load Tiers based on filter
  if (!tierFilter || tierFilter.includes('1')) {
    require('./tests/tier1_features.test');
  }
  if (!tierFilter || tierFilter.includes('2')) {
    require('./tests/tier2_boundaries.test');
  }
  if (!tierFilter || tierFilter.includes('3')) {
    require('./tests/tier3_cross_features.test');
  }
  if (!tierFilter || tierFilter.includes('4')) {
    require('./tests/tier4_scenarios.test');
  }
} catch (err) {
  console.error('\x1b[31mFailed to load test suites:\x1b[0m', err);
  process.exit(1);
}

// Execute suites
(async () => {
  const result = await runSuites(null, { verbose });
  const duration = Date.now() - startTime;

  console.log('\n\x1b[1m\x1b[35m══════════════════════════════════════════════════════════════════════\x1b[0m');
  console.log('\x1b[1m                    E2E TEST RUN SUMMARY\x1b[0m');
  console.log('\x1b[1m\x1b[35m══════════════════════════════════════════════════════════════════════\x1b[0m');
  console.log(`  Total Tests Run: \x1b[1m${result.total}\x1b[0m`);
  console.log(`  Passed:          \x1b[1m\x1b[32m${result.passed}\x1b[0m`);
  console.log(`  Failed:          \x1b[1m\x1b[31m${result.failed}\x1b[0m`);
  console.log(`  Execution Time:  ${duration} ms`);
  console.log('\x1b[1m\x1b[35m══════════════════════════════════════════════════════════════════════\x1b[0m');

  if (result.failed > 0) {
    console.log('\n\x1b[1m\x1b[31mFAILURES:\x1b[0m');
    result.failures.forEach((f, idx) => {
      console.log(`  ${idx + 1}) [${f.suite}] ${f.test}`);
      console.log(`     Error: ${f.error.message}`);
    });
    console.log('\n\x1b[1m\x1b[31mRESULT: E2E TEST SUITE FAILED\x1b[0m\n');
    process.exit(1);
  } else {
    console.log('\n\x1b[1m\x1b[32mRESULT: ALL E2E TEST TIERS PASSED PERFECTLY (100% SUCCESS)\x1b[0m\n');
    process.exit(0);
  }
})();

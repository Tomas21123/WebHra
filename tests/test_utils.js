/**
 * =============================================================================
 * Test Utilities and Assertion Framework for E2E Tests
 * =============================================================================
 */

const suites = [];
let currentSuite = null;

function describe(suiteName, fn) {
  const suite = {
    name: suiteName,
    tests: []
  };
  suites.push(suite);
  const prevSuite = currentSuite;
  currentSuite = suite;
  try {
    fn();
  } finally {
    currentSuite = prevSuite;
  }
}

function test(testName, fn) {
  if (!currentSuite) {
    throw new Error(`Test "${testName}" must be defined inside a describe() block`);
  }
  currentSuite.tests.push({
    name: testName,
    fn
  });
}

function assert(condition, message = 'Assertion failed') {
  if (!condition) {
    const err = new Error(message);
    err.name = 'AssertionError';
    throw err;
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    const msg = message || `Expected ${JSON.stringify(expected)}, but received ${JSON.stringify(actual)}`;
    const err = new Error(msg);
    err.name = 'AssertionError';
    err.actual = actual;
    err.expected = expected;
    throw err;
  }
}

function assertDeepEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    const msg = message || `Deep equality mismatch:\nExpected: ${expectedStr}\nActual:   ${actualStr}`;
    const err = new Error(msg);
    err.name = 'AssertionError';
    throw err;
  }
}

function assertCloseTo(actual, expected, tolerance = 1e-4, message) {
  if (Math.abs(actual - expected) > tolerance) {
    const msg = message || `Expected ${actual} to be close to ${expected} within tolerance ${tolerance}`;
    const err = new Error(msg);
    err.name = 'AssertionError';
    throw err;
  }
}

function assertThrows(fn, regex, message) {
  let threw = false;
  let thrownError = null;
  try {
    fn();
  } catch (err) {
    threw = true;
    thrownError = err;
  }
  if (!threw) {
    throw new Error(message || 'Expected function to throw, but it did not throw.');
  }
  if (regex && !regex.test(thrownError.message)) {
    throw new Error(message || `Expected error message matching ${regex}, but got: "${thrownError.message}"`);
  }
}

async function runSuites(filterSuiteNames = null, options = { verbose: false }) {
  let total = 0;
  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const suite of suites) {
    if (filterSuiteNames && !filterSuiteNames.includes(suite.name)) {
      continue;
    }

    console.log(`\n  \x1b[1m\x1b[36m▶ Suite: ${suite.name}\x1b[0m`);

    for (const t of suite.tests) {
      total++;
      try {
        const result = t.fn();
        if (result && typeof result.then === 'function') {
          await result;
        }
        passed++;
        console.log(`    \x1b[32m✔\x1b[0m ${t.name}`);
      } catch (err) {
        failed++;
        console.log(`    \x1b[31m✖\x1b[0m ${t.name}`);
        console.log(`      \x1b[31mError: ${err.message}\x1b[0m`);
        failures.push({
          suite: suite.name,
          test: t.name,
          error: err
        });
      }
    }
  }

  return { total, passed, failed, failures };
}

function clearSuites() {
  suites.length = 0;
  currentSuite = null;
}

module.exports = {
  describe,
  test,
  assert,
  assertEqual,
  assertDeepEqual,
  assertCloseTo,
  assertThrows,
  runSuites,
  clearSuites,
  suites
};

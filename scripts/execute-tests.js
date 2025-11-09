#!/usr/bin/env node
/**
 * execute-tests.js
 * Executes sanity tests from sanity-tests.json
 *
 * Inputs:
 *   sanity-tests.json - Test plan
 *   outputs.json - Deployment outputs (for variable substitution)
 *
 * Exit Code:
 *   0 - All tests passed
 *   1 - At least one test failed
 */

import fs from 'fs';
import axios from 'axios';

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function getNestedValue(obj, path) {
  // Handle paths like "response.data.id"
  const parts = path.replace(/^response\./, '').split('.');
  let value = obj;

  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part];
    } else {
      return undefined;
    }
  }

  return value;
}

function replaceVariables(str, variables) {
  if (typeof str !== 'string') return str;

  return str.replace(/\$\{(\w+)\}/g, (match, varName) => {
    if (varName in variables) {
      return variables[varName];
    }
    return match;
  });
}

function replaceVariablesInObject(obj, variables) {
  if (typeof obj === 'string') {
    return replaceVariables(obj, variables);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => replaceVariablesInObject(item, variables));
  }

  if (obj && typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = replaceVariablesInObject(value, variables);
    }
    return result;
  }

  return obj;
}

async function executeStep(step, variables, baseUrl) {
  const { action, endpoint, method, body, headers, expectedStatus, storeVariables } = step;

  // Replace variables in endpoint and body
  const processedEndpoint = replaceVariables(endpoint, variables);
  const processedBody = body ? replaceVariablesInObject(body, variables) : undefined;

  const url = `${baseUrl}${processedEndpoint}`;

  log(`  → ${action}`, colors.blue);
  log(`    ${method} ${processedEndpoint}`);

  try {
    const response = await axios({
      method: method.toLowerCase(),
      url: url,
      data: processedBody,
      headers: headers || {},
      validateStatus: () => true, // Don't throw on any status
      timeout: 30000, // 30 second timeout
    });

    // Check status code
    if (response.status !== expectedStatus) {
      log(
        `    ❌ FAILED: Expected status ${expectedStatus}, got ${response.status}`,
        colors.red
      );
      log(`    Response: ${JSON.stringify(response.data).substring(0, 200)}`, colors.red);
      return { success: false, error: `Status code mismatch: ${response.status}` };
    }

    log(`    ✅ PASSED (${response.status})`, colors.green);

    // Store variables if specified
    if (storeVariables) {
      for (const [varName, varPath] of Object.entries(storeVariables)) {
        const value = getNestedValue(response.data, varPath);
        if (value !== undefined) {
          variables[varName] = value;
          log(`    Stored ${varName} = ${value}`, colors.yellow);
        } else {
          log(`    ⚠️  Could not extract ${varName} from ${varPath}`, colors.yellow);
        }
      }
    }

    return { success: true };
  } catch (error) {
    log(`    ❌ FAILED: ${error.message}`, colors.red);
    return { success: false, error: error.message };
  }
}

async function main() {
  log('🧪 Executing Sanity Tests\n', colors.blue);

  // Read test plan
  if (!fs.existsSync('sanity-tests.json')) {
    log('❌ sanity-tests.json not found', colors.red);
    process.exit(1);
  }

  const testPlan = JSON.parse(fs.readFileSync('sanity-tests.json', 'utf-8'));

  // Read deployment outputs for API URL and initial variables
  const outputs = fs.existsSync('outputs.json')
    ? JSON.parse(fs.readFileSync('outputs.json', 'utf-8'))
    : {};

  const baseUrl =
    outputs.ApiUrl ||
    outputs.api_url ||
    outputs.endpoint ||
    outputs.url ||
    outputs.ServiceEndpoint ||
    outputs.HttpApiUrl ||
    Object.values(outputs).find((v) => typeof v === 'string' && v.startsWith('http'));

  if (!baseUrl) {
    log('❌ No API URL found in outputs.json', colors.red);
    process.exit(1);
  }

  log(`🌐 API Base URL: ${baseUrl}\n`);

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  // Execute all test suites
  for (const suite of testPlan.tests) {
    log(`\n📋 ${suite.name}`, colors.blue);
    log(`   ${suite.description}`);

    // Variables for this test suite
    const variables = { ...outputs };

    let suiteSuccess = true;

    for (const step of suite.steps) {
      totalTests++;
      const result = await executeStep(step, variables, baseUrl);

      if (result.success) {
        passedTests++;
      } else {
        failedTests++;
        suiteSuccess = false;
        // Continue to next suite on failure
        break;
      }

      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (suiteSuccess) {
      log(`\n  ✅ Suite passed`, colors.green);
    } else {
      log(`\n  ❌ Suite failed`, colors.red);
    }
  }

  // Summary
  log(`\n${'='.repeat(60)}`, colors.blue);
  log('📊 Test Summary\n', colors.blue);
  log(`  Total Steps:  ${totalTests}`);
  log(`  Passed:       ${passedTests}`, colors.green);
  log(`  Failed:       ${failedTests}`, failedTests > 0 ? colors.red : colors.green);
  log(`${'='.repeat(60)}\n`, colors.blue);

  if (failedTests > 0) {
    log('❌ Some tests failed', colors.red);
    process.exit(1);
  } else {
    log('✅ All tests passed!', colors.green);
    process.exit(0);
  }
}

main();

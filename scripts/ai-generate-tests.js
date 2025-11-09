#!/usr/bin/env node
/**
 * ai-generate-tests.js
 * Generates sanity tests for a deployed API using AI
 *
 * Environment:
 *   AI_API_KEY, AI_MODEL, AI_ENDPOINT - AI configuration
 *
 * Inputs:
 *   outputs.json - Deployment outputs with API URL
 *
 * Output:
 *   sanity-tests.json - Test plan with structure:
 *   {
 *     tests: [{
 *       name: string,
 *       description: string,
 *       steps: [{
 *         action: string,
 *         endpoint: string,
 *         method: string,
 *         body?: object,
 *         headers?: object,
 *         expectedStatus: number,
 *         storeVariables?: {varName: "response.path"}
 *       }]
 *     }]
 *   }
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { callAI, extractJSON } from './ai-client.js';

async function scanCodebase() {
  console.error('🔍 Scanning codebase for API structure...');

  const relevantFiles = await glob([
    '**/*.{js,ts,py,java,go}',
    '**/openapi.{yaml,yml,json}',
    '**/swagger.{yaml,yml,json}',
    '!node_modules/**',
    '!.git/**',
    '!dist/**',
    '!build/**',
    '!coverage/**',
  ]);

  let codeContext = '';
  let fileCount = 0;

  for (const file of relevantFiles.slice(0, 20)) {
    // Limit to first 20 files
    try {
      const content = fs.readFileSync(file, 'utf-8');

      // Only include files that look like they define routes/handlers
      if (
        content.includes('app.get') ||
        content.includes('app.post') ||
        content.includes('router.') ||
        content.includes('@app.route') ||
        content.includes('http.HandleFunc') ||
        content.includes('@RestController') ||
        content.includes('openapi') ||
        content.includes('swagger')
      ) {
        codeContext += `\n\n--- ${file} ---\n${content.substring(0, 2000)}\n`;
        fileCount++;
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }

  console.error(`✅ Scanned ${fileCount} API-related files`);
  return codeContext;
}

async function main() {
  console.error('🧪 Generating sanity tests via AI...');

  // Read deployment outputs
  if (!fs.existsSync('outputs.json')) {
    console.error('❌ outputs.json not found');
    process.exit(1);
  }

  const outputs = JSON.parse(fs.readFileSync('outputs.json', 'utf-8'));
  console.error('📦 Deployment outputs:', outputs);

  // Find API URL from outputs
  const apiUrl =
    outputs.ApiUrl ||
    outputs.api_url ||
    outputs.endpoint ||
    outputs.url ||
    outputs.ServiceEndpoint ||
    outputs.HttpApiUrl ||
    Object.values(outputs).find((v) => typeof v === 'string' && v.startsWith('http'));

  if (!apiUrl) {
    console.error('❌ No API URL found in deployment outputs');
    console.error('Available outputs:', Object.keys(outputs));
    process.exit(1);
  }

  console.error(`🌐 API URL: ${apiUrl}`);

  // Scan codebase for API structure
  const codeContext = await scanCodebase();

  const systemPrompt = `You are a QA engineer specialized in API testing.

Your task is to generate comprehensive happy-flow sanity tests for a deployed API.

Return a JSON object with this exact structure:
{
  "tests": [
    {
      "name": "Test Suite Name",
      "description": "Brief description",
      "steps": [
        {
          "action": "Human-readable action description",
          "endpoint": "/api/path",
          "method": "GET|POST|PUT|DELETE|PATCH",
          "body": { "key": "value" },
          "headers": { "Content-Type": "application/json" },
          "expectedStatus": 200,
          "storeVariables": { "varName": "response.data.id" }
        }
      ]
    }
  ]
}

Guidelines:
- Generate ONLY happy-flow tests (successful scenarios)
- Test the most critical API endpoints
- Use realistic test data
- Chain requests (use storeVariables to pass data between steps)
- Include proper HTTP methods and expected status codes
- Typical flow: CREATE → READ → UPDATE → DELETE
- Maximum 3-5 test suites, each with 2-5 steps
`;

  const userPrompt = `Generate sanity tests for this API:

**API Base URL:** ${apiUrl}

**Code Context (API definitions):**
${codeContext || 'No code files found - infer from common REST patterns'}

**Additional Context (deployment outputs):**
${JSON.stringify(outputs, null, 2)}

Generate comprehensive happy-flow sanity tests that verify the API is working correctly.
Return ONLY the JSON object specified in the system prompt.`;

  try {
    const response = await callAI({
      systemPrompt,
      prompt: userPrompt,
      maxTokens: 8192,
      temperature: 0.7,
    });

    console.error('✅ AI response received');

    // Extract JSON from response
    const testPlan = extractJSON(response);

    // Validate structure
    if (!testPlan.tests || !Array.isArray(testPlan.tests)) {
      throw new Error('Invalid test plan: missing or invalid "tests" array');
    }

    console.error(`📋 Generated ${testPlan.tests.length} test suite(s)`);
    testPlan.tests.forEach((suite, i) => {
      console.error(`  ${i + 1}. ${suite.name} (${suite.steps.length} steps)`);
    });

    // Write test plan
    fs.writeFileSync('sanity-tests.json', JSON.stringify(testPlan, null, 2));

    console.error('✅ Test plan written to sanity-tests.json');
  } catch (error) {
    console.error('❌ Error generating tests:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

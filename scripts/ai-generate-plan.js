#!/usr/bin/env node
/**
 * ai-generate-plan.js
 * Generates a project scaffold plan via AI
 *
 * Environment:
 *   SCAFFOLD_PROMPT - Full specification prompt
 *   PROJECT_NAME - Name of the project
 *
 * Output:
 *   Writes plan.json with structure:
 *   {
 *     files: [{path: string, prompt: string}],
 *     dependencies: {package.json content} | null
 *   }
 */

import fs from 'fs';
import { callAI, extractJSON } from './ai-client.js';

const SCAFFOLD_PROMPT = process.env.SCAFFOLD_PROMPT;
const PROJECT_NAME = process.env.PROJECT_NAME;

if (!SCAFFOLD_PROMPT) {
  console.error('Error: SCAFFOLD_PROMPT environment variable is required');
  process.exit(1);
}

if (!PROJECT_NAME) {
  console.error('Error: PROJECT_NAME environment variable is required');
  process.exit(1);
}

const systemPrompt = `You are an expert software architect and project planner.

Your task is to analyze a project specification and create a detailed scaffold plan.

Return a JSON object with this exact structure:
{
  "files": [
    {
      "path": "relative/path/to/file.ext",
      "prompt": "Detailed prompt for AI to generate this specific file"
    }
  ],
  "dependencies": {
    "name": "project-name",
    "version": "1.0.0",
    "dependencies": {}
  }
}

Guidelines:
- Include ALL necessary files (source code, configs, docs, tests)
- Each file.prompt should be specific enough for another AI to generate that file
- For package.json/requirements.txt, include in dependencies field
- Use modern best practices and security standards
- Consider the specification's compliance and security requirements
- Typical structure: src/, tests/, docs/, config files, README
`;

const userPrompt = `Create a scaffold plan for this project:

**Project Name:** ${PROJECT_NAME}

**Specification:**
${SCAFFOLD_PROMPT}

Return the JSON plan following the exact schema specified in the system prompt.`;

async function main() {
  console.error('🤖 Generating project scaffold plan...');
  console.error(`Project: ${PROJECT_NAME}`);
  console.error(`Prompt length: ${SCAFFOLD_PROMPT.length} characters`);

  try {
    const response = await callAI({
      systemPrompt,
      prompt: userPrompt,
      maxTokens: 8192,
      temperature: 0.7,
    });

    console.error('✅ AI response received');

    // Extract JSON from response
    const plan = extractJSON(response);

    // Validate plan structure
    if (!plan.files || !Array.isArray(plan.files)) {
      throw new Error('Invalid plan: missing or invalid "files" array');
    }

    if (plan.files.length === 0) {
      throw new Error('Invalid plan: files array is empty');
    }

    for (const file of plan.files) {
      if (!file.path || !file.prompt) {
        throw new Error(`Invalid file entry: ${JSON.stringify(file)}`);
      }
    }

    console.error(`📦 Plan generated: ${plan.files.length} files`);
    console.error('Files to generate:');
    plan.files.forEach((f, i) => {
      console.error(`  ${i + 1}. ${f.path}`);
    });

    // Write plan to file
    fs.writeFileSync('plan.json', JSON.stringify(plan, null, 2));

    console.error('✅ Plan written to plan.json');
  } catch (error) {
    console.error('❌ Error generating plan:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

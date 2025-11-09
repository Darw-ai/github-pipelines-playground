#!/usr/bin/env node
/**
 * ai-generate-file.js
 * Generates a single file via AI based on a specific prompt
 *
 * Environment:
 *   FILE_PATH - Path of the file to generate
 *   FILE_PROMPT - Specific prompt for this file
 *   PROJECT_NAME - Name of the project (for context)
 *
 * Output:
 *   Writes generated-file.txt with the file contents
 */

import fs from 'fs';
import path from 'path';
import { callAI } from './ai-client.js';

const FILE_PATH = process.env.FILE_PATH;
const FILE_PROMPT = process.env.FILE_PROMPT;
const PROJECT_NAME = process.env.PROJECT_NAME;

if (!FILE_PATH || !FILE_PROMPT) {
  console.error('Error: FILE_PATH and FILE_PROMPT environment variables are required');
  process.exit(1);
}

const fileExtension = path.extname(FILE_PATH);
const fileName = path.basename(FILE_PATH);

const systemPrompt = `You are an expert software developer generating a specific file for a project.

Rules:
1. Return ONLY the file contents - no explanations, no markdown
2. Do NOT wrap the code in markdown code blocks
3. The code should be production-ready and follow best practices
4. Include appropriate comments and documentation
5. Follow security best practices
6. Use modern syntax and patterns

File type: ${fileExtension}
File name: ${fileName}`;

const userPrompt = `Generate the file: ${FILE_PATH}

Project: ${PROJECT_NAME}

Requirements:
${FILE_PROMPT}

Return ONLY the raw file contents, nothing else.`;

async function main() {
  console.error(`📝 Generating file: ${FILE_PATH}`);

  try {
    let response = await callAI({
      systemPrompt,
      prompt: userPrompt,
      maxTokens: 8192,
      temperature: 0.7,
    });

    // Strip markdown code blocks if present
    const codeBlockMatch = response.match(/```[\w]*\s*\n([\s\S]*?)\n```/);
    if (codeBlockMatch) {
      console.error('⚠️  Removing markdown code block wrapper');
      response = codeBlockMatch[1];
    }

    // Trim extra whitespace
    response = response.trim();

    console.error(`✅ Generated ${response.length} characters`);

    // Write to output file
    fs.writeFileSync('generated-file.txt', response);

    console.error(`✅ File written to generated-file.txt`);
  } catch (error) {
    console.error(`❌ Error generating file ${FILE_PATH}:`, error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

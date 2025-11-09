#!/usr/bin/env node
/**
 * ai-generate-fix.js
 * Generates a fix patch for deployment/test failures using AI
 *
 * Environment:
 *   FAILURE_STAGE - "deploy" or "test"
 *
 * Inputs:
 *   logs/*.log - Error logs from failed stage
 *
 * Output:
 *   fix.patch - Git patch file with the fix
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { callAI } from './ai-client.js';

async function scanCodebase() {
  console.error('🔍 Scanning codebase...');

  const allFiles = await glob([
    '**/*.{js,ts,py,java,go,yaml,yml,json,tf,sh}',
    '!node_modules/**',
    '!.git/**',
    '!dist/**',
    '!build/**',
    '!coverage/**',
    '!*.log',
  ]);

  let codeContext = '';
  let fileCount = 0;

  // Prioritize certain file types
  const priorityPatterns = [
    /package\.json$/,
    /serverless\.y(a)?ml$/,
    /template\.y(a)?ml$/,
    /cdk\.json$/,
    /\.tf$/,
    /index\.(js|ts|py)$/,
    /handler\.(js|ts|py)$/,
  ];

  // Sort files by priority
  const sortedFiles = allFiles.sort((a, b) => {
    const aPriority = priorityPatterns.findIndex((p) => p.test(a));
    const bPriority = priorityPatterns.findIndex((p) => p.test(b));

    if (aPriority !== -1 && bPriority === -1) return -1;
    if (bPriority !== -1 && aPriority === -1) return 1;
    if (aPriority !== bPriority) return aPriority - bPriority;

    return a.localeCompare(b);
  });

  for (const file of sortedFiles.slice(0, 30)) {
    // Limit to first 30 files
    try {
      const content = fs.readFileSync(file, 'utf-8');

      // Skip very large files
      if (content.length > 10000) {
        codeContext += `\n\n--- ${file} (truncated) ---\n${content.substring(0, 3000)}\n... (file too large, truncated)\n`;
      } else {
        codeContext += `\n\n--- ${file} ---\n${content}\n`;
      }

      fileCount++;
    } catch (error) {
      // Skip files that can't be read
    }
  }

  console.error(`✅ Scanned ${fileCount} files`);
  return codeContext;
}

function readLogs() {
  console.error('📋 Reading error logs...');

  const logFiles = fs.existsSync('logs') ? fs.readdirSync('logs').filter((f) => f.endsWith('.log')) : [];

  let errorLog = '';

  for (const logFile of logFiles) {
    const content = fs.readFileSync(path.join('logs', logFile), 'utf-8');
    errorLog += `\n\n=== ${logFile} ===\n${content}\n`;
  }

  if (!errorLog) {
    console.error('⚠️  No error logs found, scanning current directory...');

    // Try current directory
    const currentLogs = fs.readdirSync('.').filter((f) => f.endsWith('.log'));
    for (const logFile of currentLogs) {
      const content = fs.readFileSync(logFile, 'utf-8');
      errorLog += `\n\n=== ${logFile} ===\n${content}\n`;
    }
  }

  if (!errorLog) {
    throw new Error('No error logs found');
  }

  console.error(`✅ Read ${errorLog.length} characters of logs`);
  return errorLog;
}

async function main() {
  console.error('🔧 Generating AI fix...');

  const failureStage = process.env.FAILURE_STAGE || 'deploy';
  console.error(`Failure stage: ${failureStage}`);

  try {
    // Read error logs
    const errorLog = readLogs();

    // Scan codebase
    const codeContext = await scanCodebase();

    const systemPrompt = `You are an expert DevOps engineer and debugger.

Your task is to analyze a deployment or test failure and generate a fix in git patch format.

Rules:
1. Analyze the error logs carefully
2. Identify the root cause
3. Generate a minimal fix that addresses ONLY the error
4. Return a valid git patch file (unified diff format)
5. Include only necessary changes
6. Do NOT make unrelated improvements

Return ONLY the patch file contents, starting with:
diff --git a/...

Do not include any explanations outside the patch.`;

    const userPrompt = `Analyze this ${failureStage} failure and generate a fix:

**Error Logs:**
${errorLog.substring(0, 5000)}

**Codebase:**
${codeContext.substring(0, 15000)}

Generate a git patch file that fixes this error.`;

    const response = await callAI({
      systemPrompt,
      prompt: userPrompt,
      maxTokens: 8192,
      temperature: 0.7,
    });

    console.error('✅ AI response received');

    // Extract patch from response
    let patch = response;

    // Try to extract from code blocks if wrapped
    const codeBlockMatch = response.match(/```(?:diff|patch)?\s*\n([\s\S]*?)\n```/);
    if (codeBlockMatch) {
      console.error('⚠️  Extracting patch from code block');
      patch = codeBlockMatch[1];
    }

    // Validate patch format
    if (!patch.includes('diff --git') && !patch.includes('---') && !patch.includes('+++')) {
      console.error('⚠️  Response does not look like a valid patch, trying to extract...');

      // Look for patch-like content
      const patchMatch = patch.match(/(diff --git[\s\S]*)/);
      if (patchMatch) {
        patch = patchMatch[1];
      } else {
        throw new Error('AI did not return a valid git patch');
      }
    }

    patch = patch.trim();

    console.error(`📝 Generated patch (${patch.length} characters)`);
    console.error('Preview:');
    console.error(patch.substring(0, 500));

    // Write patch file
    fs.writeFileSync('fix.patch', patch);

    console.error('✅ Fix patch written to fix.patch');
  } catch (error) {
    console.error('❌ Error generating fix:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

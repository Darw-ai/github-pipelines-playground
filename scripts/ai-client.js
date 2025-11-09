/**
 * ai-client.js
 * Universal AI client supporting multiple providers:
 * - AWS Bedrock (Amazon Nova, Claude)
 * - OpenAI (GPT-4, GPT-4 Turbo)
 * - Anthropic (Claude direct API)
 * - Azure OpenAI
 */

import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// Environment configuration
const AI_MODEL = process.env.AI_MODEL || 'bedrock/amazon.nova-pro-v1:0';
const AI_API_KEY = process.env.AI_API_KEY;
const AI_ENDPOINT = process.env.AI_ENDPOINT;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

/**
 * Parse model string to determine provider and model
 * Format: "provider/model-id"
 * Examples:
 *   - "bedrock/amazon.nova-pro-v1:0"
 *   - "openai/gpt-4-turbo"
 *   - "anthropic/claude-3-5-sonnet-20241022"
 */
function parseModel(modelString) {
  const [provider, modelId] = modelString.split('/', 2);
  return { provider: provider.toLowerCase(), modelId };
}

/**
 * Call AI model with unified interface
 * @param {Object} options
 * @param {string} options.prompt - The prompt text
 * @param {string} [options.systemPrompt] - System prompt
 * @param {number} [options.maxTokens=4096] - Max tokens
 * @param {number} [options.temperature=0.7] - Temperature
 * @returns {Promise<string>} - AI response text
 */
export async function callAI({ prompt, systemPrompt = '', maxTokens = 4096, temperature = 0.7 }) {
  const { provider, modelId } = parseModel(AI_MODEL);

  console.error(`[AI] Calling ${provider}/${modelId}...`);
  console.error(`[AI] Prompt length: ${prompt.length} chars`);

  switch (provider) {
    case 'bedrock':
      return await callBedrock({ prompt, systemPrompt, maxTokens, temperature, modelId });

    case 'openai':
      return await callOpenAI({ prompt, systemPrompt, maxTokens, temperature, modelId });

    case 'anthropic':
      return await callAnthropic({ prompt, systemPrompt, maxTokens, temperature, modelId });

    case 'azure':
      return await callAzureOpenAI({ prompt, systemPrompt, maxTokens, temperature, modelId });

    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

/**
 * Call AWS Bedrock using Converse API
 */
async function callBedrock({ prompt, systemPrompt, maxTokens, temperature, modelId }) {
  const client = new BedrockRuntimeClient({ region: AWS_REGION });

  const messages = [
    {
      role: 'user',
      content: [{ text: prompt }],
    },
  ];

  const systemMessages = systemPrompt ? [{ text: systemPrompt }] : undefined;

  const command = new ConverseCommand({
    modelId: modelId,
    messages: messages,
    system: systemMessages,
    inferenceConfig: {
      maxTokens: maxTokens,
      temperature: temperature,
    },
  });

  try {
    const response = await client.send(command);

    if (!response.output || !response.output.message) {
      throw new Error('Invalid response from Bedrock');
    }

    const text = response.output.message.content[0].text;
    console.error(`[AI] Response length: ${text.length} chars`);
    return text;
  } catch (error) {
    console.error('[AI] Bedrock error:', error);
    throw new Error(`Bedrock API call failed: ${error.message}`);
  }
}

/**
 * Call OpenAI API
 */
async function callOpenAI({ prompt, systemPrompt, maxTokens, temperature, modelId }) {
  if (!AI_API_KEY) {
    throw new Error('AI_API_KEY environment variable is required for OpenAI');
  }

  const openai = new OpenAI({ apiKey: AI_API_KEY });

  const messages = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  messages.push({ role: 'user', content: prompt });

  try {
    const response = await openai.chat.completions.create({
      model: modelId || 'gpt-4-turbo',
      messages: messages,
      max_tokens: maxTokens,
      temperature: temperature,
    });

    const text = response.choices[0].message.content;
    console.error(`[AI] Response length: ${text.length} chars`);
    return text;
  } catch (error) {
    console.error('[AI] OpenAI error:', error);
    throw new Error(`OpenAI API call failed: ${error.message}`);
  }
}

/**
 * Call Anthropic Claude API directly
 */
async function callAnthropic({ prompt, systemPrompt, maxTokens, temperature, modelId }) {
  if (!AI_API_KEY) {
    throw new Error('AI_API_KEY environment variable is required for Anthropic');
  }

  const anthropic = new Anthropic({ apiKey: AI_API_KEY });

  try {
    const message = await anthropic.messages.create({
      model: modelId || 'claude-3-5-sonnet-20241022',
      max_tokens: maxTokens,
      temperature: temperature,
      system: systemPrompt || undefined,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const text = message.content[0].text;
    console.error(`[AI] Response length: ${text.length} chars`);
    return text;
  } catch (error) {
    console.error('[AI] Anthropic error:', error);
    throw new Error(`Anthropic API call failed: ${error.message}`);
  }
}

/**
 * Call Azure OpenAI Service
 */
async function callAzureOpenAI({ prompt, systemPrompt, maxTokens, temperature, modelId }) {
  if (!AI_API_KEY || !AI_ENDPOINT) {
    throw new Error('AI_API_KEY and AI_ENDPOINT required for Azure OpenAI');
  }

  const openai = new OpenAI({
    apiKey: AI_API_KEY,
    baseURL: AI_ENDPOINT,
    defaultQuery: { 'api-version': '2024-02-01' },
  });

  const messages = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  messages.push({ role: 'user', content: prompt });

  try {
    const response = await openai.chat.completions.create({
      model: modelId,
      messages: messages,
      max_tokens: maxTokens,
      temperature: temperature,
    });

    const text = response.choices[0].message.content;
    console.error(`[AI] Response length: ${text.length} chars`);
    return text;
  } catch (error) {
    console.error('[AI] Azure OpenAI error:', error);
    throw new Error(`Azure OpenAI API call failed: ${error.message}`);
  }
}

/**
 * Extract JSON from AI response
 * Handles responses that might have markdown code blocks
 */
export function extractJSON(text) {
  // Try to extract JSON from code blocks first
  const codeBlockMatch = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (codeBlockMatch) {
    return JSON.parse(codeBlockMatch[1]);
  }

  // Try to find JSON object directly
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  // If no JSON found, try parsing the whole text
  return JSON.parse(text);
}

export default {
  callAI,
  extractJSON,
};

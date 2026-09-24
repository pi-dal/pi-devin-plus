/**
 * Reproduce pi's auto-compaction summarization call against the Devin provider,
 * exactly the way core/compaction/compaction.js does it.
 */
import { normalizeContext } from "@earendil-works/pi-ai";
import { readFileSync } from "node:fs";
import { streamDevin } from "../src/stream.js";
import { readCredentials } from "../src/credentials.js";

const creds = readCredentials();
if (!creds) throw new Error("no devin credentials");

const SUMMARIZATION_SYSTEM_PROMPT = `You are a context summarization assistant. Your task is to read a conversation between a user and an AI assistant, then produce a structured summary following the exact format specified.

Do NOT continue the conversation. Do NOT respond to any questions in the conversation. ONLY output the structured summary.`;

// Fake a decently large conversation like a real session would have.
const turns: string[] = [];
for (let i = 1; i <= 40; i++) {
  turns.push(`[Turn ${i}] User asked to refactor module_${i}.ts; assistant read the file, edited 3 functions, ran tests (2 failed), fixed imports, tests green.`);
}
const conversationText = turns.join("\n");
const promptText = `<conversation>\n${conversationText}\n</conversation>\n\nThe messages above are a conversation to summarize. Create a structured context checkpoint summary.`;

const model = {
  id: "claude-opus-5",
  name: "Claude Opus 5",
  api: "devin-local",
  provider: "devin",
  baseUrl: "https://server.codeium.com",
  reasoning: true,
  thinkingLevelMap: {
    off: null, minimal: null,
    low: "claude-opus-5-low", medium: "claude-opus-5-medium",
    high: "claude-opus-5-high", xhigh: "claude-opus-5-xhigh", max: "claude-opus-5-max",
  },
  input: ["text", "image"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 1_000_000,
  maxTokens: 128_000,
} as const;

// pi: maxTokens = min(floor(0.8 * reserveTokens), model.maxTokens); typical reserveTokens ~ 16k-32k
const maxTokens = Math.min(Math.floor(0.8 * 32_000), model.maxTokens);
const thinkingLevel = "medium";

const stream = streamDevin(model as never, normalizeContext({
  systemPrompt: SUMMARIZATION_SYSTEM_PROMPT,
  messages: [{ role: "user", content: [{ type: "text", text: promptText }], timestamp: Date.now() }],
}), { maxTokens, apiKey: creds.apiKey, reasoning: thinkingLevel as never });

const result = await stream.result();
console.log("stopReason:", result.stopReason);
if (result.errorMessage) console.log("errorMessage:", result.errorMessage);
const toolCalls = result.content.filter((b: { type: string }) => b.type === "toolCall");
const text = result.content.filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
console.log("toolCall blocks:", toolCalls.length, toolCalls.map((t: { name: string }) => t.name));
console.log("text length:", text.length);
console.log("text head:", text.slice(0, 200).replace(/\n/g, " "));
console.log("usage:", JSON.stringify(result.usage.totalTokens), "tokens");

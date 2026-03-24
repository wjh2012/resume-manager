// benchmarks/lib/providers/google.ts
import { generateText, tool, jsonSchema } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { ModelMessage, ToolSet } from "ai";
import type { StepResult } from "ai";
import { GoogleGenAI } from "@google/genai";
import type {
  Content,
  Part,
  FunctionDeclaration,
  InlinedRequest,
  GenerateContentConfig,
} from "@google/genai";

import type {
  BenchmarkToolDef,
  BenchmarkToolCall,
  BenchmarkMessage,
  BenchmarkRequest,
  BenchmarkResponse,
  BenchmarkProvider,
} from "./types";

// ---------------------------------------------------------------------------
// Realtime mode helpers (Vercel AI SDK)
// ---------------------------------------------------------------------------

function getClient() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY 환경 변수가 설정되지 않았습니다.");
  }
  return createGoogleGenerativeAI({ apiKey });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AiSdkToolSet = Record<string, ReturnType<typeof tool<any, string>>>;

function convertTools(defs: BenchmarkToolDef[]): AiSdkToolSet {
  const tools: AiSdkToolSet = {};
  for (const def of defs) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools[def.name] = tool<any, string>({
      description: def.description,
      inputSchema: jsonSchema(def.parameters as Parameters<typeof jsonSchema>[0]),
      execute: async () => JSON.stringify({ success: true }),
    });
  }
  return tools;
}

function extractToolCalls(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  steps: StepResult<ToolSet>[] | StepResult<any>[]
): BenchmarkToolCall[] {
  const calls: BenchmarkToolCall[] = [];
  for (const step of steps) {
    for (const tc of step.toolCalls ?? []) {
      calls.push({
        name: tc.toolName,
        args: (tc.input as Record<string, unknown>) ?? {},
      });
    }
  }
  return calls;
}

function convertMessages(messages: BenchmarkMessage[]): ModelMessage[] {
  const result: ModelMessage[] = [];
  for (const msg of messages) {
    if (msg.role === "tool") {
      result.push({
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: msg.toolCallId,
            toolName: msg.toolCallId,
            output: { type: "text" as const, value: msg.content },
          },
        ],
      });
    } else {
      result.push({ role: msg.role, content: msg.content });
    }
  }
  return result;
}

async function run(req: BenchmarkRequest): Promise<BenchmarkResponse> {
  const google = getClient();
  const start = Date.now();

  const tools = req.tools && req.tools.length > 0 ? convertTools(req.tools) : undefined;

  const result = await generateText({
    model: google(req.model),
    system: req.system,
    messages: convertMessages(req.messages),
    ...(tools ? { tools, maxSteps: req.maxSteps ?? 5 } : {}),
  });

  const durationMs = Date.now() - start;

  const toolCalls = extractToolCalls(result.steps);

  const inputTokens = result.usage?.inputTokens ?? 0;
  const outputTokens = result.usage?.outputTokens ?? 0;

  return {
    id: req.id,
    model: req.model,
    text: result.text,
    toolCalls,
    inputTokens,
    outputTokens,
    durationMs,
  };
}

// ---------------------------------------------------------------------------
// Batch mode helpers (native @google/genai SDK)
// ---------------------------------------------------------------------------

function getNativeClient(): GoogleGenAI {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY 환경 변수가 설정되지 않았습니다.");
  }
  return new GoogleGenAI({ apiKey });
}

function convertToolsForBatch(defs: BenchmarkToolDef[]): FunctionDeclaration[] {
  return defs.map((def) => ({
    name: def.name,
    description: def.description,
    parametersJsonSchema: def.parameters,
  }));
}

/**
 * Map BenchmarkMessage[] to Google Content[] (for inline batch requests).
 * Google uses "user"/"model" roles; tool responses become functionResponse parts.
 */
function buildContents(messages: BenchmarkMessage[]): Content[] {
  const contents: Content[] = [];

  for (const msg of messages) {
    if (msg.role === "tool") {
      // Append a functionResponse part to the last content, or create a user turn
      const functionResponsePart: Part = {
        functionResponse: {
          name: msg.toolCallId,
          response: { content: msg.content },
        },
      };
      const lastContent = contents[contents.length - 1];
      if (lastContent && lastContent.role === "user") {
        lastContent.parts = [...(lastContent.parts ?? []), functionResponsePart];
      } else {
        contents.push({ role: "user", parts: [functionResponsePart] });
      }
    } else {
      const googleRole = msg.role === "assistant" ? "model" : "user";
      contents.push({ role: googleRole, parts: [{ text: msg.content }] });
    }
  }

  return contents;
}

function buildInlinedRequests(reqs: BenchmarkRequest[]): InlinedRequest[] {
  return reqs.map((req) => {
    const config: GenerateContentConfig = {
      systemInstruction: req.system,
    };

    if (req.tools && req.tools.length > 0) {
      config.tools = [{ functionDeclarations: convertToolsForBatch(req.tools) }];
    }

    const inlinedReq: InlinedRequest = {
      model: req.model,
      contents: buildContents(req.messages),
      config,
    };

    return inlinedReq;
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runBatch(reqs: BenchmarkRequest[]): Promise<BenchmarkResponse[]> {
  if (reqs.length === 0) return [];

  const client = getNativeClient();
  const inlinedRequests = buildInlinedRequests(reqs);

  // Create batch job with inline requests
  const batchJob = await client.batches.create({
    src: { inlinedRequests },
  });

  const batchStart = Date.now();

  // Poll with exponential backoff
  const MAX_WAIT_MS = 2 * 60 * 60 * 1000; // 2 hours
  let delay = 30_000; // start 30s
  const MAX_DELAY = 120_000; // max 120s

  const TERMINAL_STATES = new Set([
    "JOB_STATE_SUCCEEDED",
    "JOB_STATE_FAILED",
    "JOB_STATE_CANCELLED",
    "JOB_STATE_EXPIRED",
  ]);

  const FAILED_STATES = new Set([
    "JOB_STATE_FAILED",
    "JOB_STATE_CANCELLED",
    "JOB_STATE_EXPIRED",
  ]);

  let currentBatchJob = batchJob;

  while (true) {
    const elapsed = Date.now() - batchStart;
    if (elapsed > MAX_WAIT_MS) {
      throw new Error(`Google Batch ${batchJob.name} timed out after 2 hours`);
    }

    await sleep(delay);
    delay = Math.min(delay * 1.5, MAX_DELAY);

    currentBatchJob = await client.batches.get({ name: batchJob.name! });

    const state = currentBatchJob.state as string | undefined;

    if (state && TERMINAL_STATES.has(state)) {
      if (FAILED_STATES.has(state)) {
        throw new Error(
          `Google Batch ${batchJob.name} ended with state: ${state}`
        );
      }
      break;
    }
  }

  const batchDurationMs = Date.now() - batchStart;

  // Get inline responses from dest
  const inlinedResponses = currentBatchJob.dest?.inlinedResponses;
  if (!inlinedResponses || inlinedResponses.length === 0) {
    throw new Error(
      `Google Batch ${batchJob.name} completed but has no inlinedResponses`
    );
  }

  // Build response map, collecting failed IDs
  const responseMap = new Map<string, BenchmarkResponse>();
  const failedIds: string[] = [];

  for (let i = 0; i < inlinedResponses.length; i++) {
    const req = reqs[i];
    if (!req) continue;

    const inlinedResp = inlinedResponses[i];

    if (inlinedResp.error) {
      failedIds.push(req.id);
      continue;
    }

    const genResp = inlinedResp.response;
    if (!genResp) {
      failedIds.push(req.id);
      continue;
    }

    const text = genResp.text ?? "";

    // Extract function calls
    const rawFunctionCalls = genResp.functionCalls;
    const toolCalls: BenchmarkToolCall[] = (rawFunctionCalls ?? []).map((fc: { name?: string; args?: Record<string, unknown> }) => ({
      name: fc.name ?? "",
      args: fc.args ?? {},
    }));

    const usage = genResp.usageMetadata;

    responseMap.set(req.id, {
      id: req.id,
      model: req.model,
      text,
      toolCalls,
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
      durationMs: batchDurationMs,
    });
  }

  if (failedIds.length > 0) {
    process.stderr.write(
      `[google batch] 실패한 요청 IDs: ${failedIds.join(", ")}\n`
    );
  }

  // Return responses in request order, filtering out missing
  return reqs
    .map((req) => responseMap.get(req.id))
    .filter((res): res is BenchmarkResponse => res !== undefined);
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const googleProvider: BenchmarkProvider = {
  name: "google",
  run,
  runBatch,
};

// benchmarks/lib/providers/openai.ts
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { jsonSchema, tool } from "ai";
import OpenAI from "openai";
import type { ModelMessage, StepResult, ToolSet } from "ai";

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
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.");
  }
  return createOpenAI({ apiKey });
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
            toolName: "",
            output: { type: "text", value: msg.content },
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
  const openai = getClient();
  const start = Date.now();

  const hasTools = req.tools && req.tools.length > 0;
  const tools = hasTools ? convertTools(req.tools!) : undefined;

  const result = await generateText({
    model: openai(req.model),
    system: req.system,
    messages: convertMessages(req.messages),
    ...(tools ? { tools, maxSteps: req.maxSteps ?? 5 } : {}),
  });

  const durationMs = Date.now() - start;

  const toolCalls = extractToolCalls(result.steps);

  const inputTokens =
    result.usage?.inputTokens ??
    result.steps.reduce((sum, s) => sum + (s.usage?.inputTokens ?? 0), 0);
  const outputTokens =
    result.usage?.outputTokens ??
    result.steps.reduce((sum, s) => sum + (s.usage?.outputTokens ?? 0), 0);

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
// Batch mode helpers (native OpenAI SDK)
// ---------------------------------------------------------------------------

function getNativeClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.");
  }
  return new OpenAI({ apiKey });
}

type OpenAITool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

function convertToolsForBatch(defs: BenchmarkToolDef[]): OpenAITool[] {
  return defs.map((def) => ({
    type: "function" as const,
    function: {
      name: def.name,
      description: def.description,
      parameters: def.parameters,
    },
  }));
}

type BatchRequestLine = {
  custom_id: string;
  method: "POST";
  url: "/v1/chat/completions";
  body: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    tools?: OpenAITool[];
  };
};

function buildBatchLines(reqs: BenchmarkRequest[]): BatchRequestLine[] {
  return reqs.map((req) => {
    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: req.system },
      ...req.messages
        .filter(
          (m): m is { role: "user" | "assistant"; content: string } =>
            m.role !== "tool"
        )
        .map((m) => ({ role: m.role, content: m.content })),
    ];

    const line: BatchRequestLine = {
      custom_id: req.id,
      method: "POST",
      url: "/v1/chat/completions",
      body: {
        model: req.model,
        messages,
      },
    };

    if (req.tools && req.tools.length > 0) {
      line.body.tools = convertToolsForBatch(req.tools);
    }

    return line;
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type BatchOutputLine = {
  custom_id: string;
  response?: {
    status_code: number;
    body?: {
      model?: string;
      choices?: Array<{
        message?: {
          content?: string | null;
          tool_calls?: Array<{
            function?: {
              name?: string;
              arguments?: string;
            };
          }>;
        };
      }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
      };
    };
  };
  error?: { message: string };
};

function parseOutputLine(
  line: BatchOutputLine,
  req: BenchmarkRequest,
  durationMs: number
): BenchmarkResponse | null {
  const body = line.response?.body;
  if (!body) return null;

  const choice = body.choices?.[0];
  const message = choice?.message;

  const text = message?.content ?? "";
  const toolCalls: BenchmarkToolCall[] = (message?.tool_calls ?? []).map(
    (tc) => ({
      name: tc.function?.name ?? "",
      args: (() => {
        try {
          return JSON.parse(tc.function?.arguments ?? "{}") as Record<
            string,
            unknown
          >;
        } catch {
          return {};
        }
      })(),
    })
  );

  return {
    id: req.id,
    model: body.model ?? req.model,
    text,
    toolCalls,
    inputTokens: body.usage?.prompt_tokens ?? 0,
    outputTokens: body.usage?.completion_tokens ?? 0,
    durationMs,
  };
}

async function runBatch(reqs: BenchmarkRequest[]): Promise<BenchmarkResponse[]> {
  if (reqs.length === 0) return [];

  const client = getNativeClient();
  const lines = buildBatchLines(reqs);
  const jsonl = lines.map((l) => JSON.stringify(l)).join("\n");

  // Upload JSONL file
  const file = new File([jsonl], "batch_input.jsonl", {
    type: "application/jsonl",
  });
  const uploadedFile = await client.files.create({
    file,
    purpose: "batch",
  });

  // Create batch
  const batch = await client.batches.create({
    input_file_id: uploadedFile.id,
    endpoint: "/v1/chat/completions",
    completion_window: "24h",
  });

  const batchStart = Date.now();

  // Poll with exponential backoff
  const MAX_WAIT_MS = 2 * 60 * 60 * 1000; // 2 hours
  let delay = 30_000; // start 30s
  const MAX_DELAY = 120_000; // max 120s

  let currentBatch = batch;

  while (true) {
    const elapsed = Date.now() - batchStart;
    if (elapsed > MAX_WAIT_MS) {
      throw new Error(`Batch ${batch.id} timed out after 2 hours`);
    }

    await sleep(delay);
    delay = Math.min(delay * 1.5, MAX_DELAY);

    currentBatch = await client.batches.retrieve(batch.id);

    if (
      currentBatch.status === "completed" ||
      currentBatch.status === "failed"
    ) {
      break;
    }

    if (
      currentBatch.status === "expired" ||
      currentBatch.status === "cancelled"
    ) {
      throw new Error(
        `Batch ${batch.id} ended with status: ${currentBatch.status}`
      );
    }
  }

  // Get output file
  const outputFileId = currentBatch.output_file_id;
  if (!outputFileId) {
    throw new Error(`Batch ${batch.id} completed but has no output_file_id`);
  }

  const outputFile = await client.files.content(outputFileId);
  const outputText = await outputFile.text();

  const batchDurationMs = Date.now() - batchStart;

  // Parse output JSONL
  const outputLines: BatchOutputLine[] = outputText
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      try {
        return JSON.parse(line) as BatchOutputLine;
      } catch {
        return null;
      }
    })
    .filter((l): l is BatchOutputLine => l !== null);

  // Build response map
  const responseMap = new Map<string, BenchmarkResponse>();
  const failedIds: string[] = [];

  for (const outputLine of outputLines) {
    const req = reqs.find((r) => r.id === outputLine.custom_id);
    if (!req) continue;

    if (outputLine.error) {
      failedIds.push(outputLine.custom_id);
      continue;
    }

    const response = parseOutputLine(outputLine, req, batchDurationMs);
    if (response) {
      responseMap.set(outputLine.custom_id, response);
    } else {
      failedIds.push(outputLine.custom_id);
    }
  }

  if (failedIds.length > 0) {
    process.stderr.write(
      `[openai batch] 실패한 요청 IDs: ${failedIds.join(", ")}\n`
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

export const openaiProvider: BenchmarkProvider = {
  name: "openai",
  run,
  runBatch,
};

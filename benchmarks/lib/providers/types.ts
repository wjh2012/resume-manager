// benchmarks/lib/providers/types.ts
import type { BenchmarkMessage } from "../../fixtures/types";

export type { BenchmarkMessage };

/** 도구 정의 — Provider 중립적 포맷 */
export interface BenchmarkToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
}

/** 도구 호출 결과 — Provider 중립적 포맷 */
export interface BenchmarkToolCall {
  name: string;
  args: Record<string, unknown>;
}

/** 단일 요청 정의 */
export interface BenchmarkRequest {
  id: string;
  model: string;
  system: string;
  messages: BenchmarkMessage[];
  tools?: BenchmarkToolDef[];
  maxSteps?: number; // 실시간 전용 (Batch에서는 무시)
}

/** 단일 응답 */
export interface BenchmarkResponse {
  id: string;
  model: string;
  text: string;
  toolCalls: BenchmarkToolCall[];
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

/** Provider 구현체 인터페이스 */
export interface BenchmarkProvider {
  name: "openai" | "anthropic" | "google";
  run(req: BenchmarkRequest): Promise<BenchmarkResponse>;
  runBatch(reqs: BenchmarkRequest[]): Promise<BenchmarkResponse[]>;
}

export type ProviderName = BenchmarkProvider["name"];

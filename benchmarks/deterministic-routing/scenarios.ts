import type { BenchmarkMessage } from "../fixtures/types";
import type { MockPersona } from "../fixtures/mock-data";
import type { RoutingClassification } from "./schema";
import { ALL_PERSONAS, ALL_CONV_STYLES, ALL_CAREER_NOTES } from "../fixtures/mock-data";

export interface RoutingExpectation {
  /** 정확히 일치해야 하는 필드 */
  exact?: Partial<RoutingClassification>;
  /** 최소 조건: 이 조건만 만족하면 pass */
  atLeast?: Partial<RoutingClassification>;
  /** 비어있으면 안 되는 배열 필드 */
  nonEmpty?: Array<"documentsToRead" | "careerNotesToRead">;
}

export interface RoutingScenario {
  id: string;
  name: string;
  persona: MockPersona;
  messages: BenchmarkMessage[];
  expected: RoutingExpectation;
}

/**
 * tc-2에서 "deploy-ez" 관련 노트 ID를 찾는다.
 * 해당 페르소나에 deploy-ez 관련 노트가 없으면 빈 배열.
 */
function findDeployEzNoteIds(personaId: string): string[] {
  return ALL_CAREER_NOTES
    .filter((n) => n.personaId === personaId)
    .filter((n) => {
      const text = `${n.title} ${n.summary} ${n.content}`.toLowerCase();
      return text.includes("deploy-ez") || text.includes("deploy");
    })
    .map((n) => n.id);
}

export function buildScenarios(personaId: string): RoutingScenario[] {
  const persona = ALL_PERSONAS.find((p) => p.id === personaId);
  if (!persona) throw new Error(`Unknown persona: ${personaId}`);

  const convStyles = ALL_CONV_STYLES[personaId];
  if (!convStyles?.polite) throw new Error(`No polite conv style: ${personaId}`);

  const baseConversation: BenchmarkMessage[] = convStyles.polite.slice(0, 8);
  const deployEzNoteIds = findDeployEzNoteIds(personaId);

  return [
    {
      id: "tc-1",
      name: "새 경험",
      persona,
      messages: [
        ...baseConversation,
        { role: "user", content: "작년에 Rust로 고성능 메시지 큐 만들었는데 초당 50만 건 처리했어" },
      ],
      expected: {
        exact: {
          documentsToRead: [],
          careerNotesToRead: [],
          saveCareerNote: true,
        },
      },
    },
    {
      id: "tc-2",
      name: "수치 변경",
      persona,
      messages: [
        ...baseConversation,
        { role: "user", content: "아 그 deploy-ez Stars가 450개가 아니라 800개로 늘었어" },
      ],
      expected: deployEzNoteIds.length > 0
        ? {
            atLeast: { saveCareerNote: true },
            exact: { documentsToRead: [] },
          }
        : {
            atLeast: { saveCareerNote: true },
          },
    },
    {
      id: "tc-3",
      name: "초안 요청",
      persona,
      messages: [
        ...baseConversation,
        { role: "user", content: "deploy-ez 프로젝트 중심으로 핵심역량 써줘" },
      ],
      expected: {
        atLeast: {
          saveCareerNote: false,
        },
        nonEmpty: ["documentsToRead"],
      },
    },
    {
      id: "tc-4",
      name: "단순 질문",
      persona,
      messages: [
        ...baseConversation,
        { role: "user", content: "자소서 분량은 보통 얼마나 돼?" },
      ],
      expected: {
        exact: {
          documentsToRead: [],
          careerNotesToRead: [],
          saveCareerNote: false,
        },
      },
    },
  ];
}

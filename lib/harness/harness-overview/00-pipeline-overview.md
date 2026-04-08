# Superpowers 하네스 전체 파이프라인

## 개요

Superpowers는 AI 코딩 에이전트를 위한 **제약 기반 실행 프레임워크**다. 14개의 재사용 가능한 스킬이 자가 강제(self-enforcing) 파이프라인을 형성하여, 에이전트의 소프트웨어 개발 워크플로우를 구조적으로 통제한다.

## 전체 파이프라인 흐름

```
사용자 요청 도착
  │
  ▼
[1] using-superpowers (자동 주입)
  │ "1%라도 해당하면 스킬 호출"
  │ 합리화 방지 11개 Red Flag
  │ 우선순위: 사용자 지시 > 스킬 > 시스템 프롬프트
  │
  ▼
[2] brainstorming (HARD-GATE: 승인 전 구현 금지)
  │ 설계 → 문서 → 셀프 리뷰 → 사용자 리뷰
  │ 종단 상태: writing-plans 호출
  │
  ▼
[3] writing-plans (Zero Context 엔지니어 가정)
  │ Bite-sized 태스크 (2-5분 단위)
  │ No Placeholder 원칙
  │ 셀프 리뷰 → 실행 핸드오프
  │
  ▼
[4] using-git-worktrees (격리된 작업 공간)
  │ 디렉토리 선택 → 안전 검증 → 클린 베이스라인
  │
  ▼
[5] subagent-driven-development (실행 엔진)
  │ 태스크별 루프:
  │   ├── Implementer 서브에이전트 (구현)
  │   ├── Spec Reviewer 서브에이전트 (스펙 준수 확인)
  │   └── Code Quality Reviewer 서브에이전트 (코드 품질 확인)
  │ 모든 태스크 완료 → 최종 코드 리뷰
  │
  ▼
[6] verification-before-completion (증거 먼저)
  │ Gate Function: IDENTIFY → RUN → READ → VERIFY → CLAIM
  │
  ▼
[7] finishing-a-development-branch (4개 옵션 → 정리)
      1. 로컬 병합
      2. Push + PR 생성
      3. 브랜치 유지
      4. 작업 폐기
```

## 자가 강제 체인

각 단계의 **종료 조건이 다음 단계의 호출**이다. 이를 통해 파이프라인을 임의로 건너뛸 수 없는 구조가 형성된다:

- `brainstorming`의 종단 상태 → `writing-plans` 호출
- `writing-plans`의 종단 상태 → `subagent-driven-development` 또는 `executing-plans` 호출
- `subagent-driven-development`의 종단 상태 → `finishing-a-development-branch` 호출
- 각 단계에는 HARD-GATE, Iron Law 등 진행 차단 메커니즘 존재

## 보조 파이프라인

메인 파이프라인 외에 특정 상황에서 활성화되는 보조 스킬들:

```
버그 발견
  ▼
systematic-debugging (4단계 과학적 방법)
  │ Phase 1: 근본 원인 조사 (수정 시도 전 필수)
  │ Phase 2: 패턴 분석
  │ Phase 3: 가설과 테스트
  │ Phase 4: 구현 (TDD 연동)
  │ 3회 실패 → 아키텍처 의심

다수 독립 실패
  ▼
dispatching-parallel-agents
  │ 문제 도메인당 1 에이전트 디스패치
  │ 통합 → 충돌 확인 → 전체 테스트

코드 리뷰
  ▼
requesting-code-review → receiving-code-review
  │ 의도적 불신 기반 검증
  │ 성능적 동의 금지
  │ YAGNI 체크
```

## 부트스트랩 메커니즘

```
세션 시작
  │
  ├── Claude Code: hooks/session-start (Shell 훅)
  ├── Cursor: hooks/hooks-cursor.json
  ├── OpenCode: .opencode/plugins/superpowers.js (Config 싱글턴 수정)
  ├── Codex: 심링크 기반 디스커버리
  └── Gemini CLI: GEMINI.md (도구 매핑)
      │
      ▼
  모두 동일한 using-superpowers 스킬 주입으로 수렴
```

## 핵심 설계 철학

1. **제안이 아닌 강제**: 규칙은 선택이 아니라 필수 (Iron Law, HARD-GATE)
2. **합리화 사전 차단**: 에이전트가 규율을 우회하는 전형적 사고 패턴을 명시적으로 나열
3. **격리를 통한 품질**: 태스크당 fresh agent, 역할 분리 (구현/스펙 리뷰/품질 리뷰)
4. **증거 기반 진행**: 검증 명령 실행 결과 없이 완료 주장 불가
5. **점진적 에스컬레이션**: 실패 시 단계적 대응 (재시도 → 모델 업그레이드 → 분할 → 사람 에스컬레이션)

## 문서 목록

| 파일 | 내용 |
|------|------|
| [01-bootstrap-harness.md](01-bootstrap-harness.md) | 부트스트랩 하네스: 세션 시작 시 규율 주입 |
| [02-skill-invocation-control.md](02-skill-invocation-control.md) | 스킬 호출 제어: using-superpowers |
| [03-brainstorming.md](03-brainstorming.md) | 브레인스토밍: 설계 선행 원칙 |
| [04-writing-plans.md](04-writing-plans.md) | 계획 작성: 컨텍스트-프리 실행 청사진 |
| [05-tdd.md](05-tdd.md) | TDD: 테스트 주도 개발의 철칙 |
| [06-systematic-debugging.md](06-systematic-debugging.md) | 체계적 디버깅: 4단계 과학적 방법 |
| [07-subagent-driven-development.md](07-subagent-driven-development.md) | 서브에이전트 주도 개발: 실행 엔진 |
| [08-verification.md](08-verification.md) | 검증 먼저 완료: 증거 없이 주장 금지 |
| [09-code-review.md](09-code-review.md) | 코드 리뷰 시스템: 요청과 수신 |
| [10-git-worktree.md](10-git-worktree.md) | Git Worktree: 격리된 작업 공간 |
| [11-branch-completion.md](11-branch-completion.md) | 브랜치 완료: 통합 워크플로우 |
| [12-parallel-agents.md](12-parallel-agents.md) | 병렬 에이전트 디스패치 |
| [13-writing-skills.md](13-writing-skills.md) | 스킬 작성: 메타 스킬 (TDD for docs) |

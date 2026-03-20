# Docs 구조 재편 설계

**작성일**: 2026-03-19
**상태**: 승인됨

---

## 목표

분산된 문서 디렉토리를 `docs/` 단일 루트로 통합하고, 중복 콘텐츠를 제거하며, 각 문서의 역할을 명확히 구분한다.

---

## 현재 구조 문제

| 문제 | 현황 |
|------|------|
| 스펙 분리 | `specs/`와 `docs/`가 루트 레벨에 병립 |
| 플랜 분산 | `docs/plans/` + `docs/superpowers/plans/` 두 곳에 혼재 |
| 이슈 관리 | `docs/references/known-issues.md`가 GitHub Issues 역할 중복 |
| 불필요 파일 | `docs/changelog/spec-review-updates.md` 내용 중복 |
| 완료된 플랜 파일 | 구현 완료된 작업 플랜이 docs에 잔류 (git history로 충분) |
| 중간 리뷰 보고서 | phase-3 리뷰 중간본/최종본 공존 |
| 스펙 이탈 산재 | `spec-deviations.md`와 리뷰 보고서에 이중 기록 |
| API 엔드포인트 중복 | `specs/api-reference.md`와 `docs/features/`에 이중 나열 |
| 문서 역할 불명확 | `specs/phases/`(요구사항)와 `docs/features/`(구현 결과) 역할 미구분 |

---

## 최종 구조

```
docs/
  features/              (변동 없음)
  guides/                (변동 없음)
  references/
    decisions.md         (유지)
    spec-deviations.md   (유지)
    ← known-issues.md 삭제 (GitHub Issues로 이전)
  reports/               (변동 없음)
  rules/                 (변동 없음)
  specs/                 ← NEW: 기존 specs/ 전체 이동
    README.md
    api-reference.md
    architecture.md
    database-schema.md
    phases/
      phase-0-foundation.md
      phase-1-documents.md
      phase-2-ai-infra.md
      phase-3-cover-letter.md
      phase-4-interview.md
      phase-5-insights.md
      phase-6-resume.md
      phase-7-polish.md
  superpowers/
    plans/               ← 삭제 (완료된 플랜이므로 git history로 대체)
    specs/               ← 브레인스토밍 설계 문서 (이미 존재, 이 파일이 위치하는 곳)
  ← changelog/ 삭제

specs/                   ← 삭제 (docs/specs/로 이동)
```

---

## 작업 목록

### 1. 파일 이동

| 소스 | 대상 |
|------|------|
| `specs/` 전체 | `docs/specs/` |

### 2. 디렉토리/파일 삭제

| 대상 | 이유 |
|------|------|
| `docs/changelog/` 디렉토리 전체 | 내용 중복, 불필요. 현재 파일 1개(`spec-review-updates.md`)만 존재 |
| `docs/plans/` 디렉토리 전체 (3개 파일) | 구현 완료된 플랜. git history로 대체 |
| `docs/superpowers/plans/2026-03-19-phase-4-interview.md` | 구현 완료된 플랜. git history로 대체 |
| `docs/references/known-issues.md` | GitHub Issues로 이전 후 삭제 |
| `docs/reports/2026-03-18-phase-review-phase-3.md` | 중간본. 최종본(`-final`)으로 대체 |

### 3. GitHub Issues 등록

`known-issues.md`의 미해결(미~~취소선~~) 항목을 GitHub Issues로 등록:

| 제목 | 레이블 |
|------|--------|
| 카카오 로그인 비활성화 (비즈앱 전환 필요) | enhancement |
| API 키 검증 엔드포인트 Rate Limiting 미적용 | security |
| AiSettings.apiKey 평문 저장 | security |
| 임베딩 모델 OpenAI 고정 | enhancement |
| 에디터 부분 삽입 미지원 (인라인 패치 UI) | enhancement |
| Radix UI Hydration ID Mismatch | bug |
| Storage 고아 파일 가능성 | enhancement |

### 4. 콘텐츠 정리

| 파일 | 작업 |
|------|------|
| `docs/reports/2026-03-18-phase-review-phase-3-final.md` | 스펙 이탈 섹션 → `docs/references/spec-deviations.md` 참조 링크로 교체 |
| `docs/reports/2026-03-19-phase-review-phase-4.md` | 스펙 이탈 섹션 → `docs/references/spec-deviations.md` 참조 링크로 교체 |
| `docs/features/06-cover-letters.md` | API 엔드포인트 나열 섹션 → `docs/specs/api-reference.md` 참조 링크로 교체 |
| `docs/features/07-interviews.md` | API 엔드포인트 나열 섹션 → `docs/specs/api-reference.md` 참조 링크로 교체 |

**문서 역할 구분 원칙** (신규 문서 작성 시 준수):
- `docs/specs/phases/` — 요구사항 및 설계 명세 (WHAT & WHY)
- `docs/features/` — 실제 구현 결과 기록 (WHAT WAS BUILT)
- API 엔드포인트 상세는 `docs/specs/api-reference.md` 단일 출처 유지

### 5. 참조 업데이트

| 파일 | 변경 내용 |
|------|-----------|
| `README.md` | line 20: `specs/README.md` → `docs/specs/README.md`; line 21: `specs/` 항목 삭제 또는 설명 업데이트 (`docs/`가 스펙 포함함을 반영) |
| `.claude/agents/project-manager.md` (line 13) | 검색 가이드의 `specs/` → `docs/specs/` |
| `.claude/agents/project-manager.md` (line 30) | `specs/phases/` → `docs/specs/phases/` |
| `.claude/agents/project-manager.md` (line 47) | `known-issues.md` 참조 → GitHub Issues 레이블 확인 지침으로 교체 |
| `.claude/skills/docs-sync/SKILL.md` | 디렉토리 테이블에서 `docs/changelog/` 항목 제거 |
| `docs/rules/workflow-rule.md` | `known-issues.md` 언급 2곳 → GitHub Issues 포인터로 교체; `docs/changelog/` 작성 지침(changelog 섹션) → 제거 |
| `docs/specs/README.md` | 내부 링크 확인 (상대 경로이므로 변동 없음) |

---

## 범위 외

- `docs/guides/` — 변경 없음
- `docs/rules/` — `workflow-rule.md`만 참조 업데이트 필요 (위 섹션 5 참고), 나머지 파일 변경 없음
- 완료된 phase 스펙(0~4)은 아카이브 없이 그대로 유지
- CLAUDE.md — `docs/rules/`, `docs/references/spec-deviations.md` 경로 변동 없으므로 수정 불필요

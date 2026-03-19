# Docs 구조 재편 설계

**작성일**: 2026-03-19
**상태**: 승인됨

---

## 목표

분산된 문서 디렉토리를 `docs/` 단일 루트로 통합하고, 플랜 파일을 한 곳으로 모으며, 관리 비용이 낮은 파일을 적절한 위치로 이전한다.

---

## 현재 구조 문제

| 문제 | 현황 |
|------|------|
| 스펙 분리 | `specs/`와 `docs/`가 루트 레벨에 병립 |
| 플랜 분산 | `docs/plans/` + `docs/superpowers/plans/` 두 곳에 혼재 |
| 이슈 관리 | `docs/references/known-issues.md`가 GitHub Issues 역할 중복 |
| 불필요 파일 | `docs/changelog/spec-review-updates.md` 내용 중복 |

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
    plans/               ← docs/plans/ 3개 + 기존 1개 통합
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
| `docs/plans/*.md` (3개) | `docs/superpowers/plans/` |

### 2. 디렉토리/파일 삭제

| 대상 | 이유 |
|------|------|
| `docs/changelog/` 디렉토리 전체 | 내용 중복, 불필요. 현재 파일 1개(`spec-review-updates.md`)만 존재 |
| `docs/references/known-issues.md` | GitHub Issues로 이전 후 삭제 |

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

### 4. 참조 업데이트

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

- `docs/features/`, `docs/guides/`, `docs/reports/` — 변경 없음
- `docs/rules/` — `workflow-rule.md`만 참조 업데이트 필요 (위 섹션 4 참고), 나머지 파일 변경 없음
- 완료된 phase 스펙(0~4)은 아카이브 없이 그대로 유지
- CLAUDE.md — `docs/rules/`, `docs/references/spec-deviations.md` 경로 변동 없으므로 수정 불필요

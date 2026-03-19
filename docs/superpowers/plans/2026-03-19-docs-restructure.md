# Docs 구조 재편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `specs/`를 `docs/specs/`로 통합하고, 중복 파일을 삭제하며, 콘텐츠 중복을 제거하고 참조를 갱신한다.

**Architecture:** 코드 변경 없이 docs 디렉토리만 재편. git mv로 이력을 보존하며 이동, 불필요한 파일 삭제, 기존 문서의 중복 섹션을 참조 링크로 교체.

**Tech Stack:** git, gh CLI, markdown

**Spec:** `docs/superpowers/specs/2026-03-19-docs-restructure-design.md`

---

### Task 1: GitHub Issues 등록

**Files:**
- Read: `docs/references/known-issues.md`

- [ ] **Step 1: 미해결 이슈 7개를 GitHub Issues로 등록**

```bash
gh issue create --title "카카오 로그인 비활성화 (비즈앱 전환 필요)" \
  --label "enhancement" \
  --body "카카오 OAuth에서 이메일을 받아오려면 비즈니스 계정 전환이 필요합니다.

**원인**: 카카오 비즈니스 계정이 없으면 OAuth에서 이메일을 받아올 수 없음. 이메일 없이는 users 테이블 upsert가 불가하므로 비활성화.
**현황**: \`app/(auth)/login/page.tsx\`에 주석 처리됨
**해결 조건**: 카카오 비즈앱 전환 후 활성화"

gh issue create --title "API 키 검증 엔드포인트 Rate Limiting 미적용" \
  --label "security" \
  --body "POST /api/settings/ai/validate에 Rate Limiting이 없습니다.

**원인**: Redis/Upstash 등 외부 인프라 의존. 인증된 사용자만 호출 가능하나, 반복 호출 시 외부 API(OpenAI/Anthropic/Google)에 과도한 요청 발생 가능.
**해결 조건**: Rate Limiting 인프라 도입 후 userId 기반 분당 호출 제한 적용"

gh issue create --title "AiSettings.apiKey 평문 저장" \
  --label "security" \
  --body "prisma/schema.prisma의 apiKey 필드가 평문으로 저장됩니다.

**원인**: Phase 2 AI 설정 기능에서 암호화 미적용
**해결 조건**: 프로덕션 배포 전 암호화 적용 필수"

gh issue create --title "임베딩 모델 OpenAI 고정" \
  --label "enhancement" \
  --body "lib/ai/embedding.ts가 text-embedding-3-small (OpenAI)로 하드코딩되어 있습니다.

**증상**: OPENAI_API_KEY 환경 변수가 없으면 문서 업로드 및 RAG 컨텍스트 빌드 시 AI_LoadAPIKeyError 발생
**제한사항**: 임베딩 벡터 차원이 OpenAI 1536으로 고정되어 있어 다른 모델(Google text-embedding-004: 768차원 등)로 교체 시 기존 벡터 데이터 마이그레이션 필요
**해결 조건**: 서버 .env에 OPENAI_API_KEY 설정 필수. 임베딩 모델 교체는 pgvector 스키마 및 기존 데이터 마이그레이션과 함께 검토"

gh issue create --title "에디터 부분 삽입 미지원 (인라인 패치 UI)" \
  --label "enhancement" \
  --body "\"에디터에 반영\" 버튼 클릭 시 AI 응답이 에디터 끝에 단순 추가됩니다.

**개선 방향**: git diff처럼 변경 구간을 -/+로 시각적으로 표시하고 사용자가 수락/거절할 수 있는 인라인 패치 UI 구현
**구현 참고**:
- diff-match-patch 또는 fast-diff 라이브러리로 기존 텍스트와 AI 제안 텍스트 비교
- 변경 구간을 배경색으로 하이라이트 (삭제: 빨강, 추가: 초록)
- 수락 시 변경사항 적용, 거절 시 원본 유지
- textarea 한계로 인라인 하이라이트가 어렵다면 contenteditable 또는 CodeMirror/ProseMirror 기반 에디터로 교체 필요"

gh issue create --title "Radix UI Hydration ID Mismatch" \
  --label "bug" \
  --body "대시보드 레이아웃 진입 시 콘솔에 React hydration 경고가 발생합니다.

**증상**: SSR에서 생성된 radix-_R_... ID와 클라이언트에서 생성된 ID가 불일치
**영향 범위**: UserMenu (DropdownMenuTrigger), AI 설정 폼 (SelectTrigger × 2). 기능 동작에는 영향 없음
**원인**: Radix UI 내부 ID 카운터가 SSR/클라이언트 컴포넌트 트리 순서 차이로 달라짐
**해결 조건**: Radix UI 업그레이드 또는 SSR/클라이언트 렌더 트리 구조 일치 확인"

gh issue create --title "Storage 고아 파일 가능성" \
  --label "enhancement" \
  --body "문서 삭제 시 Storage 파일 삭제 실패하면 DB 레코드만 삭제되고 Storage에 파일이 남을 수 있습니다.

**원인**: Storage 삭제 실패를 catch 후 무시하고 DB 삭제를 진행하는 설계 (DB 삭제가 더 중요)
**해결 조건**: 고아 파일이 누적되면 cron 기반 정리 작업 도입"
```

- [ ] **Step 2: 등록 확인**

```bash
gh issue list --limit 10
```

Expected: 7개 이슈가 목록에 표시됨

---

### Task 2: specs/ → docs/specs/ 이동

**Files:**
- Move: `specs/` → `docs/specs/`

- [ ] **Step 1: git mv로 이동 (이력 보존)**

```bash
cd D:/prj/resume-manager
git mv specs docs/specs
```

- [ ] **Step 2: 이동 결과 확인**

```bash
git status
ls docs/specs/
ls docs/specs/phases/
```

Expected: `docs/specs/README.md`, `docs/specs/api-reference.md`, `docs/specs/architecture.md`, `docs/specs/database-schema.md`, `docs/specs/phases/phase-0~7.md` 모두 존재

- [ ] **Step 3: 커밋**

```bash
git add -A
git commit -m "refactor(docs): move specs/ to docs/specs/"
```

---

### Task 3: 불필요 파일/디렉토리 삭제

**Files:**
- Delete: `docs/changelog/`
- Delete: `docs/plans/`
- Delete: `docs/superpowers/plans/2026-03-19-phase-4-interview.md`
- Delete: `docs/references/known-issues.md`
- Delete: `docs/reports/2026-03-18-phase-review-phase-3.md`

- [ ] **Step 1: 파일 삭제**

```bash
cd D:/prj/resume-manager
git rm -r docs/changelog/
git rm -r docs/plans/
git rm docs/superpowers/plans/2026-03-19-phase-4-interview.md
git rm docs/references/known-issues.md
git rm docs/reports/2026-03-18-phase-review-phase-3.md
```

- [ ] **Step 2: 삭제 결과 확인**

```bash
git status
```

Expected: 위 파일들이 `deleted:` 상태로 staged됨. `docs/superpowers/plans/` 디렉토리 자체는 남아있어야 함 (specs/ 서브디렉토리가 있으므로).

- [ ] **Step 3: 커밋**

```bash
git commit -m "refactor(docs): remove obsolete files (plans, changelog, known-issues, phase-3 draft report)"
```

---

### Task 4: 리뷰 보고서 콘텐츠 정리

두 phase 리뷰 보고서의 "스펙 대비 의도적 차이" 섹션을 `spec-deviations.md` 참조 링크로 교체한다.

**Files:**
- Modify: `docs/reports/2026-03-18-phase-review-phase-3-final.md`
- Modify: `docs/reports/2026-03-19-phase-review-phase-4.md`

- [ ] **Step 1: phase-3-final 보고서 수정**

`docs/reports/2026-03-18-phase-review-phase-3-final.md`의 아래 섹션(line 59~77)을 찾아 교체한다:

현재:
```markdown
## 스펙 대비 의도적 차이 (이미 `spec-deviations.md`에 등록된 패턴)

- **서비스 레이어 분리**: 스펙은 API route 직접 구현이나, `lib/cover-letters/service.ts`로 분리
- **에러 응답 형식**: `{ error: string }` 단순 문자열 (기존 패턴 동일)
- **status enum 케이스**: 스펙 `"draft"/"completed"` vs 구현 `"DRAFT"/"COMPLETED"` (Prisma enum 적응)
- **toDataStreamResponse -> toUIMessageStreamResponse**: AI SDK v6에서 UIMessage 기반 응답 포맷 사용
```

교체 후:
```markdown
## 스펙 대비 의도적 차이

→ [`docs/references/spec-deviations.md`](../references/spec-deviations.md) 참조
```

- [ ] **Step 2: phase-4 보고서에서 spec-deviations 관련 섹션 확인 및 수정**

`docs/reports/2026-03-19-phase-review-phase-4.md`를 읽고 "스펙 대비 의도적 차이" 또는 "spec-deviations" 관련 섹션을 찾아 동일하게 참조 링크로 교체한다.

```bash
grep -n "스펙 대비 의도적\|spec-deviation" docs/reports/2026-03-19-phase-review-phase-4.md
```

동일한 패턴으로 교체:
```markdown
## 스펙 대비 의도적 차이

→ [`docs/references/spec-deviations.md`](../references/spec-deviations.md) 참조
```

- [ ] **Step 3: 커밋**

```bash
git add docs/reports/
git commit -m "refactor(docs): replace spec-deviations content in reports with reference links"
```

---

### Task 5: features 문서 API 섹션 정리

두 feature 문서의 API 엔드포인트 나열 섹션을 `api-reference.md` 참조 링크로 교체한다.

**Files:**
- Modify: `docs/features/06-cover-letters.md`
- Modify: `docs/features/07-interviews.md`

- [ ] **Step 1: 06-cover-letters.md API 섹션 교체**

`docs/features/06-cover-letters.md`의 `## API` 섹션(line 36~46)을 교체:

현재:
```markdown
## API

| 메서드 | 경로 | 용도 |
|--------|------|------|
| POST | `/api/cover-letters` | 생성 (+ Conversation + CoverLetterDocument) |
| GET | `/api/cover-letters/[id]` | 상세 조회 |
| PUT | `/api/cover-letters/[id]` | 내용/상태 업데이트 |
| PATCH | `/api/cover-letters/[id]/documents` | 참고 문서 변경 |
| DELETE | `/api/cover-letters/[id]` | 삭제 (cascade) |
| POST | `/api/chat/cover-letter` | AI 스트리밍 채팅 |
```

교체 후:
```markdown
## API

→ [`docs/specs/api-reference.md`](../specs/api-reference.md) 참조
```

- [ ] **Step 2: 07-interviews.md API 섹션 교체**

`docs/features/07-interviews.md`의 `### API 엔드포인트` 섹션(line 27~35)을 교체:

현재:
```markdown
### API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/interviews` | 면접 세션 생성 (트랜잭션: Session + Documents + Conversation) |
| GET | `/api/interviews/[id]` | 면접 세션 상세 조회 |
| PUT | `/api/interviews/[id]` | 면접 종료 (`status: "COMPLETED"`) |
| DELETE | `/api/interviews/[id]` | 면접 세션 삭제 |
| POST | `/api/chat/interview` | 면접 채팅 스트리밍 |
```

교체 후:
```markdown
### API 엔드포인트

→ [`docs/specs/api-reference.md`](../specs/api-reference.md) 참조
```

- [ ] **Step 3: 커밋**

```bash
git add docs/features/
git commit -m "refactor(docs): replace API endpoint tables in features with api-reference links"
```

---

### Task 6: 참조 업데이트

**Files:**
- Modify: `README.md`
- Modify: `.claude/agents/project-manager.md`
- Modify: `.claude/skills/docs-sync/SKILL.md`
- Modify: `docs/rules/workflow-rule.md`

- [ ] **Step 1: README.md 업데이트**

현재 (line 20~21):
```markdown
- [specs/](./specs/README.md) — 설계 명세 + 구현 단계별 문서
- [docs/](./docs/) — 프로젝트 규칙 및 워크플로우
```

교체 후:
```markdown
- [docs/](./docs/) — 설계 명세, 구현 단계별 문서, 프로젝트 규칙 및 워크플로우
```

- [ ] **Step 2: project-manager.md 업데이트 (3곳)**

`.claude/agents/project-manager.md`:

**(line 13)** `specs/` → `docs/specs/`:
```
look in `docs/`, `specs/`, or any directory containing project specifications, PRDs, or feature requirements
```
→
```
look in `docs/`, `docs/specs/`, or any directory containing project specifications, PRDs, or feature requirements
```

**(line 30)** `specs/phases/` → `docs/specs/phases/`:
```
영향받는 미구현 Phase 스펙 파일(`specs/phases/`)을 읽고
```
→
```
영향받는 미구현 Phase 스펙 파일(`docs/specs/phases/`)을 읽고
```

**(line 47)** `known-issues.md` 참조 교체:
```
   - `known-issues.md` — 알려진 이슈 목록. 이미 인지된 문제를 중복 보고하지 않는다
```
→
```
   - GitHub Issues — 알려진 이슈 목록. `gh issue list` 로 확인. 이미 인지된 문제를 중복 보고하지 않는다
```

- [ ] **Step 3: docs-sync/SKILL.md 업데이트**

`.claude/skills/docs-sync/SKILL.md` 디렉토리 테이블에서 `docs/changelog/` 행 제거:

현재:
```markdown
| `docs/changelog/` | 대규모 변경 이력 |
```
→ 이 행 전체 삭제

- [ ] **Step 4: workflow-rule.md 업데이트 (3곳)**

`docs/rules/workflow-rule.md`:

**(line 12)** `known-issues.md` 참조 교체:
```
1. **`docs/references/` 참조** — 구현 전 `decisions.md`, `known-issues.md`, `spec-deviations.md`를 확인하여 기존 결정사항·제약사항을 반영한다.
```
→
```
1. **`docs/references/` 참조** — 구현 전 `decisions.md`, `spec-deviations.md`를 확인하고, GitHub Issues에서 알려진 이슈를 확인하여 기존 결정사항·제약사항을 반영한다.
```

**(line 27)** `known-issues.md` 등록 지침 교체:
```
당장 해결 불가하거나 보류할 항목은 PR 코멘트로 사유를 남기고 `docs/references/known-issues.md`에 등록한다.
```
→
```
당장 해결 불가하거나 보류할 항목은 PR 코멘트로 사유를 남기고 GitHub Issues에 등록한다.
```

**(line 31~35)** `## Changelog` 섹션 전체 제거:
```markdown
## Changelog

- 대규모 변경(아키텍처 변경, 핵심 로직 재설계 등)이 발생하면 `docs/changelog/`에 변경 이력 문서를 작성한다.
- 파일명: `{변경-주제}.md`
```
→ 이 섹션 전체 삭제

- [ ] **Step 5: 커밋**

```bash
git add README.md .claude/ docs/rules/workflow-rule.md
git commit -m "refactor(docs): update all references after docs restructure"
```

---

### Task 7: 검증

- [ ] **Step 1: 구 경로 참조 잔존 여부 확인**

```bash
# specs/ 루트 참조 잔존 확인 (docs/specs/는 정상이므로 제외)
grep -r "\bspecs/" D:/prj/resume-manager --include="*.md" --include="*.json" | grep -v "docs/specs/" | grep -v "node_modules" | grep -v ".git"
```

Expected: 출력 없음 (잔존 참조 없음)

```bash
# known-issues.md 참조 잔존 확인
grep -r "known-issues" D:/prj/resume-manager --include="*.md" | grep -v "node_modules" | grep -v ".git"
```

Expected: 출력 없음

```bash
# docs/changelog 참조 잔존 확인
grep -r "docs/changelog" D:/prj/resume-manager --include="*.md" | grep -v "node_modules" | grep -v ".git"
```

Expected: 출력 없음

- [ ] **Step 2: 최종 디렉토리 구조 확인**

```bash
find D:/prj/resume-manager/docs -type f -name "*.md" | sort
find D:/prj/resume-manager/specs -type f 2>/dev/null || echo "specs/ 삭제 확인됨"
```

Expected:
- `docs/specs/` 하위에 `README.md`, `api-reference.md`, `architecture.md`, `database-schema.md`, `phases/phase-0~7.md` 존재
- `specs/` 디렉토리 없음
- `docs/changelog/` 없음
- `docs/plans/` 없음

- [ ] **Step 3: 최종 커밋 및 push 여부 확인**

```bash
git log --oneline -7
git status
```

Expected: working tree clean, 위 Task들의 커밋 5개 확인됨

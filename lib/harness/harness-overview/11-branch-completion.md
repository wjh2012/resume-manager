# 브랜치 완료: 통합 워크플로우

## 개요

`finishing-a-development-branch` 스킬은 구현이 완료되고 모든 테스트가 통과한 후, 작업을 어떻게 통합할지 결정하고 실행하는 구조화된 프로세스를 제공한다.

## 핵심 원리

```
테스트 검증 → 옵션 제시 → 선택 실행 → 정리
```

## 프로세스

### Step 1: 테스트 검증

옵션 제시 **전에** 테스트 통과를 먼저 확인한다:

```bash
npm test / cargo test / pytest / go test ./...
```

**테스트 실패 시:**
```
Tests failing (<N> failures). Must fix before completing:
[실패 목록]
Cannot proceed with merge/PR until tests pass.
```
STOP. Step 2로 진행하지 않는다.

### Step 2: 베이스 브랜치 결정

```bash
git merge-base HEAD main 2>/dev/null || \
git merge-base HEAD master 2>/dev/null
```

또는 질문: "This branch split from main - is that correct?"

### Step 3: 옵션 제시

**정확히 4개 옵션**을 제시한다. 설명 추가 없이 간결하게:

```
Implementation complete. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```

### Step 4: 선택 실행

#### Option 1: 로컬 병합

```bash
git checkout <base-branch>
git pull
git merge <feature-branch>
<test command>              # 병합 결과에서 테스트 검증
git branch -d <feature-branch>
```

#### Option 2: Push + PR 생성

```bash
git push -u origin <feature-branch>
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
<2-3 bullets>

## Test Plan
- [ ] <verification steps>
EOF
)"
```

#### Option 3: 브랜치 유지

```
"Keeping branch <name>. Worktree preserved at <path>."
```

워크트리 정리 **안 함**.

#### Option 4: 작업 폐기

**반드시 확인 먼저:**

```
This will permanently delete:
- Branch <name>
- All commits: <commit-list>
- Worktree at <path>

Type 'discard' to confirm.
```

정확한 문자열 "discard" 입력을 기다린다.

```bash
git checkout <base-branch>
git branch -D <feature-branch>
```

### Step 5: 워크트리 정리

```bash
# 워크트리인지 확인
git worktree list | grep $(git branch --show-current)

# 워크트리이면 제거
git worktree remove <worktree-path>
```

| 옵션 | 워크트리 정리 |
|------|-------------|
| 1. 로컬 병합 | 정리 |
| 2. PR 생성 | 유지 |
| 3. 유지 | 유지 |
| 4. 폐기 | 정리 |

## Quick Reference

| 옵션 | Merge | Push | Worktree 유지 | Branch 정리 |
|------|-------|------|---------------|-------------|
| 1. 로컬 병합 | O | - | - | O |
| 2. PR 생성 | - | O | O | - |
| 3. 유지 | - | - | O | - |
| 4. 폐기 | - | - | - | O (force) |

## 흔한 실수

| 실수 | 문제 | 해결 |
|------|------|------|
| 테스트 검증 건너뜀 | 깨진 코드 병합, 실패하는 PR | 옵션 제시 전 항상 테스트 검증 |
| 열린 질문 | "다음 뭐 할까요?" → 모호 | 정확히 4개 구조화된 옵션 |
| 자동 워크트리 정리 | 필요할 수 있는데 삭제 | Option 1, 4에서만 정리 |
| 폐기 확인 없음 | 작업 실수로 삭제 | "discard" 문자열 확인 필수 |

## Red Flags

**절대 하지 말 것:**
- 실패하는 테스트로 진행
- 병합 결과에서 테스트 검증 없이 병합
- 확인 없이 작업 삭제
- 명시적 요청 없이 force-push

**항상 해야 할 것:**
- 옵션 제시 전 테스트 검증
- 정확히 4개 옵션 제시
- Option 4에서 문자열 확인
- Option 1, 4에서만 워크트리 정리

## 연동 스킬

**호출자:**
- `subagent-driven-development` (모든 태스크 완료 후)
- `executing-plans` (모든 배치 완료 후)

**짝 스킬:**
- `using-git-worktrees` — 이 스킬이 생성한 워크트리를 정리

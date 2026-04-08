# Git Worktree: 격리된 작업 공간

## 개요

`using-git-worktrees` 스킬은 기능 작업이 현재 작업 공간으로부터 격리가 필요할 때, 또는 구현 계획 실행 전에 사용한다. 체계적인 디렉토리 선택과 안전 검증으로 신뢰할 수 있는 격리를 보장한다.

## 핵심 원리

```
체계적 디렉토리 선택 + 안전 검증 = 신뢰할 수 있는 격리
```

## 디렉토리 선택 프로세스

우선순위 순서를 따른다:

### 1. 기존 디렉토리 확인

```bash
ls -d .worktrees 2>/dev/null     # 우선 (hidden)
ls -d worktrees 2>/dev/null      # 대안
```

둘 다 존재하면 `.worktrees`가 우선.

### 2. CLAUDE.md 확인

```bash
grep -i "worktree.*director" CLAUDE.md 2>/dev/null
```

설정이 있으면 질문 없이 사용.

### 3. 사용자에게 질문

```
No worktree directory found. Where should I create worktrees?

1. .worktrees/ (project-local, hidden)
2. ~/.config/superpowers/worktrees/<project-name>/ (global location)

Which would you prefer?
```

## 안전 검증

### 프로젝트 로컬 디렉토리

워크트리 생성 **전에** 디렉토리가 `.gitignore`에 포함되어 있는지 반드시 확인:

```bash
git check-ignore -q .worktrees 2>/dev/null || \
git check-ignore -q worktrees 2>/dev/null
```

**무시되지 않으면:**
1. `.gitignore`에 적절한 줄 추가
2. 변경 커밋
3. 워크트리 생성 진행

**왜 중요한가**: 워크트리 콘텐츠가 리포지토리에 커밋되는 것을 방지. git status 오염 방지.

### 글로벌 디렉토리 (`~/.config/superpowers/worktrees`)

프로젝트 외부이므로 `.gitignore` 검증 불필요.

## 생성 절차

### 1. 프로젝트 이름 감지

```bash
project=$(basename "$(git rev-parse --show-toplevel)")
```

### 2. 워크트리 생성

```bash
# 경로 결정
case $LOCATION in
  .worktrees|worktrees)
    path="$LOCATION/$BRANCH_NAME"
    ;;
  ~/.config/superpowers/worktrees/*)
    path="~/.config/superpowers/worktrees/$project/$BRANCH_NAME"
    ;;
esac

# 새 브랜치와 함께 워크트리 생성
git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

### 3. 프로젝트 셋업 자동 감지

```bash
# Node.js
if [ -f package.json ]; then npm install; fi

# Rust
if [ -f Cargo.toml ]; then cargo build; fi

# Python
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
if [ -f pyproject.toml ]; then poetry install; fi

# Go
if [ -f go.mod ]; then go mod download; fi
```

### 4. 클린 베이스라인 검증

워크트리가 깨끗한 상태에서 시작하는지 확인:

```bash
npm test / cargo test / pytest / go test ./...
```

- **테스트 실패 시**: 실패 보고 + 진행 여부 질문
- **테스트 통과 시**: ready 보고

### 5. 위치 보고

```
Worktree ready at <full-path>
Tests passing (<N> tests, 0 failures)
Ready to implement <feature-name>
```

## Quick Reference

| 상황 | 동작 |
|------|------|
| `.worktrees/` 존재 | 사용 (ignored 확인) |
| `worktrees/` 존재 | 사용 (ignored 확인) |
| 둘 다 존재 | `.worktrees/` 사용 |
| 둘 다 없음 | CLAUDE.md 확인 → 사용자 질문 |
| 디렉토리 미무시 | .gitignore 추가 + 커밋 |
| 베이스라인 테스트 실패 | 실패 보고 + 질문 |
| package.json 없음 | 의존성 설치 건너뜀 |

## 흔한 실수

| 실수 | 문제 | 해결 |
|------|------|------|
| ignore 검증 건너뜀 | 워크트리 콘텐츠가 추적됨, git status 오염 | 항상 `git check-ignore` 사용 |
| 디렉토리 위치 가정 | 불일치, 프로젝트 관례 위반 | 우선순위: 기존 > CLAUDE.md > 질문 |
| 실패 테스트로 진행 | 새 버그와 기존 이슈 구분 불가 | 실패 보고, 명시적 허가 받기 |
| 셋업 명령 하드코딩 | 다른 도구 사용 프로젝트에서 실패 | 프로젝트 파일에서 자동 감지 |

## Red Flags

**절대 하지 말 것:**
- 무시 여부 확인 없이 프로젝트 로컬 워크트리 생성
- 베이스라인 테스트 검증 건너뛰기
- 실패 테스트 상태에서 질문 없이 진행
- 모호할 때 디렉토리 위치 가정
- CLAUDE.md 확인 건너뛰기

## 연동 스킬

| 호출자 | 시점 |
|--------|------|
| `brainstorming` (Phase 4) | 설계 승인 후 구현 전 |
| `subagent-driven-development` | 태스크 실행 시작 전 (필수) |
| `executing-plans` | 태스크 실행 시작 전 (필수) |

| 짝 스킬 | 역할 |
|---------|------|
| `finishing-a-development-branch` | 작업 완료 후 워크트리 정리 (필수) |

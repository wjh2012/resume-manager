# 부트스트랩 하네스: 세션 시작 시 규율 주입

## 개요

Superpowers는 에이전트가 세션을 시작하는 **첫 순간부터** 규율을 주입한다. 이것은 SessionStart 훅과 폴리글롯 래퍼로 구현된다.

## SessionStart 훅 (`hooks/session-start`)

세션이 시작되면 자동 실행되는 bash 스크립트로, `using-superpowers` 스킬의 **전체 본문**을 읽어 JSON으로 직렬화하고 에이전트 컨텍스트에 주입한다.

### 동작 순서

```
1. SKILL.md 전체 내용 읽기
2. JSON용 이스케이프 처리 (백슬래시, 따옴표, 개행 등)
3. <EXTREMELY_IMPORTANT> 태그로 감싸기
4. 플랫폼 감지
5. 해당 플랫폼 형식으로 JSON 출력
```

### 플랫폼 감지 로직

```bash
if [ -n "${CURSOR_PLUGIN_ROOT:-}" ]; then
  # Cursor → additional_context 필드
elif [ -n "${CLAUDE_PLUGIN_ROOT:-}" ]; then
  # Claude Code → hookSpecificOutput.additionalContext 필드
else
  # 기타 → additional_context (폴백)
fi
```

### 핵심 설계 결정

**중복 주입 방지**: Claude Code는 `additional_context`와 `hookSpecificOutput` 두 필드를 모두 읽지만 중복 제거를 하지 않는다. 따라서 현재 플랫폼에 맞는 **하나의 필드만** emit하여 이중 주입을 방지한다.

**레거시 경고 주입**: `~/.config/superpowers/skills` 디렉토리가 존재하면 마이그레이션 경고를 `<important-reminder>` 태그로 주입한다.

**printf 사용**: heredoc(`cat <<EOF`) 대신 `printf`를 사용한다. bash 5.3+에서 heredoc 변수 확장이 512바이트 이상의 콘텐츠에서 hang되는 버그를 회피하기 위함이다.

## 폴리글롯 래퍼 (`hooks/run-hook.cmd`)

Windows와 Unix를 **단일 파일**로 지원하는 크로스 플랫폼 장치이다.

### 구조

```
: << 'CMDBLOCK'          ← bash: no-op + heredoc 시작, cmd: 라벨
@echo off                ← Windows batch 코드 시작
... bash.exe 경로 탐색 ...
exit /b 0
CMDBLOCK                 ← heredoc 끝
# Unix 코드             ← bash가 여기부터 실행
exec bash "$SCRIPT"
```

### Windows bash 탐색 순서

1. `C:\Program Files\Git\bin\bash.exe` (Git for Windows 표준)
2. `C:\Program Files (x86)\Git\bin\bash.exe` (32비트)
3. PATH의 `bash` (MSYS2, Cygwin 등)
4. 모두 없으면 → `exit /b 0` (에러 없이 종료)

### 설계 원리

- **우아한 열화(graceful degradation)**: bash가 없어도 플러그인은 동작, 컨텍스트 주입만 생략
- **확장자 없는 스크립트명**: `session-start`(`.sh` 없음)을 사용하여 Claude Code의 Windows 자동 감지(`.sh` 포함 시 `bash` 자동 prepend)와의 충돌 방지

## 플랫폼 적응 아키텍처

```
Claude Code  → hooks/session-start (Shell 훅)
Cursor       → hooks/hooks-cursor.json (camelCase 형식)
OpenCode     → .opencode/plugins/superpowers.js (Config 싱글턴 수정)
Codex        → 심링크 기반 디스커버리 (~/.agents/skills/superpowers → repo/skills)
Gemini CLI   → GEMINI.md (도구 매핑)
         ↓
    모두 동일한 using-superpowers 스킬 주입으로 수렴
```

### OpenCode 플러그인 방식

`Config` 싱글턴을 직접 수정하여 심링크 없이 스킬 디렉토리를 등록한다:

```javascript
config: async (config) => {
  config.skills = config.skills || {};
  config.skills.paths = config.skills.paths || [];
  if (!config.skills.paths.includes(superpowersSkillsDir)) {
    config.skills.paths.push(superpowersSkillsDir);
  }
}
```

## 핵심 요약

| 원리 | 구현 |
|------|------|
| 단일 진입점 수렴 | 모든 플랫폼이 동일한 스킬로 수렴 |
| 플랫폼 감지 후 적응 | 환경변수로 플랫폼 감지, 해당 형식으로 출력 |
| 중복 주입 방지 | 플랫폼에 맞는 필드 하나만 emit |
| 우아한 열화 | bash 없어도 에러 없이 동작 |
| 크로스 플랫폼 | 폴리글롯 래퍼로 단일 파일 지원 |

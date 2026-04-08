# Superpowers

Superpowers는 조합 가능한 "스킬" 세트와, 에이전트가 이를 활용하도록 하는 초기 지시사항을 기반으로 구축된, 코딩 에이전트를 위한 완전한 소프트웨어 개발 워크플로우입니다.

## 작동 방식

코딩 에이전트를 실행하는 순간부터 시작됩니다. 에이전트는 여러분이 무언가를 만들고 있다는 걸 감지하면, 바로 코드를 작성하려 들지 *않습니다*. 대신 한 발 물러서서, 여러분이 진짜로 하려는 게 무엇인지 물어봅니다.

대화를 통해 스펙을 이끌어낸 뒤에는, 실제로 읽고 소화할 수 있을 만큼 짧은 단위로 나누어 보여줍니다.

디자인에 대한 승인이 떨어지면, 에이전트는 구현 계획을 수립합니다. 이 계획은 열정은 넘치지만 안목은 부족하고, 판단력도 없고, 프로젝트 맥락도 모르며, 테스트를 기피하는 주니어 엔지니어도 따라갈 수 있을 만큼 명확합니다. 진정한 Red/Green TDD, YAGNI(You Aren't Gonna Need It), 그리고 DRY 원칙을 강조합니다.

그다음, 여러분이 "진행해"라고 하면 *서브에이전트 주도 개발* 프로세스가 시작됩니다. 각 엔지니어링 태스크를 에이전트들에게 분배하고, 그들의 작업을 검수하고 리뷰하면서 앞으로 나아갑니다. Claude가 여러분이 함께 수립한 계획에서 벗어나지 않고 한 번에 몇 시간씩 자율적으로 작업하는 것은 드문 일이 아닙니다.

이 외에도 많은 기능이 있지만, 이것이 시스템의 핵심입니다. 그리고 스킬이 자동으로 트리거되기 때문에, 여러분이 특별히 할 일은 없습니다. 코딩 에이전트에 그저 Superpowers가 장착될 뿐입니다.


## 후원

Superpowers가 수익 창출에 도움이 되었고, 그럴 의향이 있으시다면 [오픈소스 작업을 후원](https://github.com/sponsors/obra)해 주시면 정말 감사하겠습니다.

감사합니다!

- Jesse


## 설치

**참고:** 설치 방법은 플랫폼에 따라 다릅니다. Claude Code나 Cursor는 내장 플러그인 마켓플레이스가 있습니다. Codex와 OpenCode는 수동 설정이 필요합니다.

### Claude Code 공식 마켓플레이스

Superpowers는 [공식 Claude 플러그인 마켓플레이스](https://claude.com/plugins/superpowers)에서 사용할 수 있습니다.

Claude 마켓플레이스에서 플러그인을 설치하세요:

```bash
/plugin install superpowers@claude-plugins-official
```

### Claude Code (플러그인 마켓플레이스 경유)

Claude Code에서 먼저 마켓플레이스를 등록하세요:

```bash
/plugin marketplace add obra/superpowers-marketplace
```

그런 다음 이 마켓플레이스에서 플러그인을 설치하세요:

```bash
/plugin install superpowers@superpowers-marketplace
```

### Cursor (플러그인 마켓플레이스 경유)

Cursor Agent 채팅에서 마켓플레이스를 통해 설치하세요:

```text
/add-plugin superpowers
```

또는 플러그인 마켓플레이스에서 "superpowers"를 검색하세요.

### Codex

Codex에 다음과 같이 입력하세요:

```
Fetch and follow instructions from https://raw.githubusercontent.com/obra/superpowers/refs/heads/main/.codex/INSTALL.md
```

**상세 문서:** [docs/README.codex.md](docs/README.codex.md)

### OpenCode

OpenCode에 다음과 같이 입력하세요:

```
Fetch and follow instructions from https://raw.githubusercontent.com/obra/superpowers/refs/heads/main/.opencode/INSTALL.md
```

**상세 문서:** [docs/README.opencode.md](docs/README.opencode.md)

### Gemini CLI

```bash
gemini extensions install https://github.com/obra/superpowers
```

업데이트:

```bash
gemini extensions update superpowers
```

### 설치 확인

선택한 플랫폼에서 새 세션을 시작하고, 스킬이 트리거될 만한 요청을 해보세요 (예: "이 기능을 설계해줘" 또는 "이 이슈를 디버깅하자"). 에이전트가 자동으로 관련 superpowers 스킬을 호출해야 합니다.

## 기본 워크플로우

1. **brainstorming (브레인스토밍)** - 코드 작성 전에 활성화됩니다. 질문을 통해 대략적인 아이디어를 다듬고, 대안을 탐색하며, 디자인을 섹션별로 나누어 검증합니다. 디자인 문서를 저장합니다.

2. **using-git-worktrees (Git 워크트리 사용)** - 디자인 승인 후 활성화됩니다. 새 브랜치에 격리된 작업 공간을 생성하고, 프로젝트 설정을 실행하며, 깨끗한 테스트 기준선을 확인합니다.

3. **writing-plans (계획 작성)** - 승인된 디자인과 함께 활성화됩니다. 작업을 작은 단위(각 2-5분)로 나눕니다. 모든 태스크에는 정확한 파일 경로, 완전한 코드, 검증 단계가 포함됩니다.

4. **subagent-driven-development (서브에이전트 주도 개발)** 또는 **executing-plans (계획 실행)** - 계획과 함께 활성화됩니다. 태스크마다 새로운 서브에이전트를 투입하여 2단계 리뷰(스펙 준수 확인 후 코드 품질 확인)를 수행하거나, 사람의 체크포인트와 함께 배치로 실행합니다.

5. **test-driven-development (테스트 주도 개발)** - 구현 중에 활성화됩니다. RED-GREEN-REFACTOR를 강제합니다: 실패하는 테스트를 작성하고, 실패를 확인하고, 최소한의 코드를 작성하고, 통과를 확인하고, 커밋합니다. 테스트 전에 작성된 코드는 삭제합니다.

6. **requesting-code-review (코드 리뷰 요청)** - 태스크 사이에 활성화됩니다. 계획 대비 리뷰하고, 심각도별로 이슈를 보고합니다. 치명적 이슈는 진행을 차단합니다.

7. **finishing-a-development-branch (개발 브랜치 마무리)** - 태스크가 완료되면 활성화됩니다. 테스트를 검증하고, 옵션(병합/PR/유지/폐기)을 제시하며, 워크트리를 정리합니다.

**에이전트는 모든 태스크 전에 관련 스킬을 확인합니다.** 제안이 아닌 필수 워크플로우입니다.

## 구성 요소

### 스킬 라이브러리

**테스트**
- **test-driven-development** - RED-GREEN-REFACTOR 사이클 (테스트 안티패턴 참조 포함)

**디버깅**
- **systematic-debugging** - 4단계 근본 원인 분석 프로세스 (근본 원인 추적, 심층 방어, 조건 기반 대기 기법 포함)
- **verification-before-completion** - 실제로 수정되었는지 확인

**협업**
- **brainstorming** - 소크라테스식 디자인 정제
- **writing-plans** - 상세 구현 계획
- **executing-plans** - 체크포인트가 있는 배치 실행
- **dispatching-parallel-agents** - 동시 서브에이전트 워크플로우
- **requesting-code-review** - 사전 리뷰 체크리스트
- **receiving-code-review** - 피드백 대응
- **using-git-worktrees** - 병렬 개발 브랜치
- **finishing-a-development-branch** - 병합/PR 결정 워크플로우
- **subagent-driven-development** - 2단계 리뷰(스펙 준수 확인 후 코드 품질 확인)를 통한 빠른 반복

**메타**
- **writing-skills** - 모범 사례에 따른 새 스킬 작성 (테스트 방법론 포함)
- **using-superpowers** - 스킬 시스템 소개

## 철학

- **테스트 주도 개발** - 항상 테스트를 먼저 작성
- **체계적 접근 > 즉흥적 접근** - 추측이 아닌 프로세스
- **복잡성 감소** - 단순함이 최우선 목표
- **주장보다 증거** - 성공을 선언하기 전에 검증

더 읽기: [Superpowers for Claude Code](https://blog.fsck.com/2025/10/09/superpowers/)

## 기여하기

스킬은 이 저장소에 직접 있습니다. 기여하려면:

1. 저장소를 포크하세요
2. 스킬을 위한 브랜치를 생성하세요
3. 새 스킬을 만들고 테스트할 때 `writing-skills` 스킬을 따르세요
4. PR을 제출하세요

완전한 가이드는 `skills/writing-skills/SKILL.md`를 참조하세요.

## 업데이트

플러그인을 업데이트하면 스킬도 자동으로 업데이트됩니다:

```bash
/plugin update superpowers
```

## 라이선스

MIT 라이선스 - 자세한 내용은 LICENSE 파일을 참조하세요

## 커뮤니티

Superpowers는 [Jesse Vincent](https://blog.fsck.com)와 [Prime Radiant](https://primeradiant.com)의 멤버들이 만들었습니다.

커뮤니티 지원, 질문, 그리고 Superpowers로 만들고 있는 것을 공유하려면 [Discord](https://discord.gg/Jd8Vphy9jq)에 참여하세요.

## 지원

- **Discord**: [Discord 참여하기](https://discord.gg/Jd8Vphy9jq)
- **이슈**: https://github.com/obra/superpowers/issues
- **마켓플레이스**: https://github.com/obra/superpowers-marketplace

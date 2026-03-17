# 워크플로우 규칙

## Plan Review

- `/plan` 모드에서 구현 계획 작성 완료 후, 과도한 설계, 누락된 고려사항, 규칙 위반을 점검한다.
- 요구사항이 모호하거나 설계 방향이 여러 갈래인 경우, 임의로 판단하지 말고 사용자에게 선택지를 제시하여 확인을 받는다.

## Commit Rule

- 기능 구현 완료 후, 커밋 전에 반드시 `/simplify`를 실행하여 코드 품질을 점검한다.
- Git 커밋은 항상 `/git-commit` 스킬을 통해 실행한다.

## PR Rule

- PR 생성 전에 `npm run typecheck`과 `npm run lint`를 실행하여 통과를 확인한다.
- PR 본문은 `.github/pull_request_template.md` 템플릿을 따른다.

## Changelog

- 대규모 변경(아키텍처 변경, 핵심 로직 재설계 등)이 발생하면 `docs/changelog/`에 변경 이력 문서를 작성한다.
- 파일명: `{변경-주제}.md`

## Action Restrictions

- 빌드/테스트: 명시적으로 요청받을 때만 실행한다.
- 코드 포맷팅/린트: 명시적으로 요청받을 때만 실행한다.
- 외부 API 호출: 명시적으로 요청받을 때만 실행한다.

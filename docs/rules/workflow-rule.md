# 워크플로우 규칙

## Plan Review

- `/plan` 모드에서 구현 계획 작성 완료 후, 과도한 설계, 누락된 고려사항, 규칙 위반을 점검한다.
- 요구사항이 모호하거나 설계 방향이 여러 갈래인 경우, 임의로 판단하지 말고 사용자에게 선택지를 제시하여 확인을 받는다.

## 커밋 플로우 (매 커밋마다)

> 표기법: `/name` = 스킬 (Skill tool), `[name]` = 에이전트 (Agent tool)

1. **구현** — 기능 코드 작성
2. **`/simplify`** — 코드 품질 점검 (중복, 효율성, 재사용)
3. **`[test-writer]`** — simplify된 코드에 대해 테스트 작성 및 통과 확인
4. **`typecheck` + `lint`** — `npm run typecheck && npm run lint` 통과 확인
5. **`/git-commit`** — 커밋

## PR 플로우 (Phase 완료 시)

1. **`docs/features/` 문서화** — 주요 기능 추가 시 해당 기능 문서 작성
2. **`[project-manager]` 점검** — 스펙 대비 구현 상태 검증
3. **PR 생성** — `.github/pull_request_template.md` 템플릿 사용. Test Plan의 체크박스는 실제로 검증 완료한 항목만 체크한다.
4. **`@claude` 리뷰** — PR에 `@claude` 호출하여 코드 리뷰
5. **리뷰 피드백 반영** — `@claude` 지적사항 수정 (커밋 플로우 적용)
6. **`[project-manager]` 최종 점검** — 변경사항 반영 후 스펙 대비 재검증
7. **머지**

## Changelog

- 대규모 변경(아키텍처 변경, 핵심 로직 재설계 등)이 발생하면 `docs/changelog/`에 변경 이력 문서를 작성한다.
- 파일명: `{변경-주제}.md`

## Action Restrictions

- 빌드/테스트: 명시적으로 요청받을 때만 실행한다.
- 코드 포맷팅/린트: 명시적으로 요청받을 때만 실행한다.
- 외부 API 호출: 명시적으로 요청받을 때만 실행한다.

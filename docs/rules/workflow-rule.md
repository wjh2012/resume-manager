# 워크플로우 규칙

## Plan Review

- `/plan` 모드에서 구현 계획 작성 완료 후, 과도한 설계, 누락된 고려사항, 규칙 위반을 점검한다.
- 요구사항이 모호하거나 설계 방향이 여러 갈래인 경우, 임의로 판단하지 말고 사용자에게 선택지를 제시하여 확인을 받는다.

## 구현 플로우

> 표기법: `/name` = 스킬 (Skill tool), `[name]` = 에이전트 (Agent tool)

1. **`docs/references/` 참조** — 구현 전 `decisions.md`, `spec-deviations.md`를 확인하고, GitHub Issues에서 알려진 이슈를 확인하여 기존 결정사항·제약사항을 반영한다.
2. **구현** — 기능 코드 작성. 기능 추가·버그 수정 시 `[test-writer]`로 테스트도 함께 작성

## 커밋 플로우 (매 커밋마다)

1. **`/simplify`** — 코드 품질 점검 (중복, 효율성, 재사용)
2. **`typecheck` + `lint`** — `npm run typecheck && npm run lint` 통과 확인
3. **`/git-commit`** — 커밋

## PR 플로우 (Phase 완료 시)

> `superpowers:finishing-a-development-branch`에서 PR 옵션을 선택한 경우, push + PR 생성(3번) 후 이 플로우의 나머지 단계(1, 2, 4~7)를 이어서 진행한다.

1. **`/docs-sync`** — 주요 기능 추가 시 docs 동기화 실행 (features 문서 포함)
2. **`[project-manager]` 점검** — 스펙 대비 구현 상태 검증
3. **PR 생성** — `.github/pull_request_template.md` 템플릿 사용. Test Plan의 체크박스는 실제로 검증 완료한 항목만 체크한다.
4. **`@claude` 리뷰** — PR에 `@claude` 호출하여 코드 리뷰. 비동기(GitHub Actions)이므로 `/loop 2m` 으로 리뷰 도착을 폴링한다.
5. **리뷰 피드백 반영** — `@claude` 지적사항 수정 (커밋 플로우 적용). 당장 해결 불가하거나 보류할 항목은 PR 코멘트로 사유를 남기고 GitHub Issues에 등록한다. 리뷰에서 도출된 결정사항은 `docs/references/decisions.md`에 출처(PR URL)와 함께 기록한다. 수정 후 `@claude 피드백 반영 커밋 포함하여 전체 변경사항을 다시 리뷰해주세요.`로 재리뷰 요청 → 지적사항 해소될 때까지 4↔5 반복.
6. **`[project-manager]` 최종 점검** — 변경사항 반영 후 스펙 대비 재검증
7. **머지**

## Action Restrictions

- 빌드/테스트: 명시적으로 요청받을 때만 실행한다.
- 코드 포맷팅/린트: 명시적으로 요청받을 때만 실행한다.
- 외부 API 호출: 명시적으로 요청받을 때만 실행한다.

## DB 마이그레이션 규칙

- **`prisma db push` 사용 금지.** 모든 스키마 변경은 `prisma migrate dev`로 migration 파일을 생성하고 커밋한다.
- 스키마 변경이 있는 feature는 **순차적으로 develop에 merge**한다.
- merge 후 다음 에이전트는 최신 develop을 rebase한 뒤 `prisma migrate dev`를 재실행한다.
- 에이전트 병렬 작업 시 **feature별 독립 DB**를 사용한다 (로컬 셋업 가이드 참조).

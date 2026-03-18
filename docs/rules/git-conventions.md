# Git 규칙

## 1. 브랜치 전략

- **`master`**: 프로덕션 배포 가능한 안정 브랜치. PR 병합을 통해서만 반영.
- **`develop`**: 다음 배포를 위한 통합 개발 브랜치.
- **`feature/`**: 새 기능 개발 시 `develop`에서 분기.
  - 명명 규칙: `feature/{기능명}` (예: `feature/resume-editor`)
- **`bugfix/`**: `develop` 브랜치의 버그 수정.
- **`hotfix/`**: 프로덕션(`master`)의 긴급 수정.

## 2. 커밋 단위 규칙

- 실행 가능한 단위로 원자적으로 커밋한다.
- 커밋 메시지 형식은 `git-commit` 스킬에 위임한다.

## 3. PR 규칙

- PR 본문은 `.github/pull_request_template.md` 템플릿을 따른다.
- 셀프 리뷰 완료 후 PR을 생성한다.
- **PR base 브랜치 규칙**:
  - `feature/`, `bugfix/` → 반드시 `develop`을 base로 지정
  - `hotfix/` → `master`를 base로 지정
  - `master`에 직접 feature/bugfix PR을 생성하지 않는다

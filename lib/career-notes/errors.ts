export class CareerNoteNotFoundError extends Error {
  constructor() {
    super("커리어노트를 찾을 수 없습니다.")
  }
}

export class CareerNoteForbiddenError extends Error {
  constructor() {
    super("이 커리어노트에 대한 권한이 없습니다.")
  }
}

export class ConversationNotFoundError extends Error {
  constructor() {
    super("대화를 찾을 수 없습니다.")
  }
}

export class MergeProposalNotFoundError extends Error {
  constructor() {
    super("병합 제안을 찾을 수 없습니다.")
  }
}

export class MergeProposalForbiddenError extends Error {
  constructor() {
    super("이 병합 제안에 대한 권한이 없습니다.")
  }
}

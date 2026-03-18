import "@testing-library/jest-dom"

// 외부 서비스 호출 없이 모듈 로딩만 가능하도록 더미 환경변수 설정
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "test-key-placeholder"

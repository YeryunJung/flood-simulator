export class ApiError extends Error {
  readonly status: number
  readonly statusText: string

  constructor(status: number, statusText: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.statusText = statusText
  }

  get isNotFound(): boolean {
    return this.status === 404
  }

  get isServerError(): boolean {
    return this.status >= 500 && this.status < 600
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500 && this.status !== 404
  }

  get userMessage(): string {
    if (this.isNotFound) return '요청하신 데이터를 찾을 수 없습니다'
    if (this.isServerError) return '서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요'
    if (this.isClientError) return '잘못된 요청입니다'
    return '알 수 없는 오류가 발생했습니다'
  }
}

export class NetworkError extends Error {
  constructor(message = '네트워크 연결을 확인해주세요') {
    super(message)
    this.name = 'NetworkError'
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError
}

export function isNotFoundError(error: unknown): boolean {
  return isApiError(error) && error.isNotFound
}
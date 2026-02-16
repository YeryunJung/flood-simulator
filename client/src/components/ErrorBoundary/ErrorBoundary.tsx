import { Component, type ReactNode } from 'react'
import { getUserFriendlyMessage, isNetworkError, normalizeError } from '../../api/errors'
import './ErrorBoundary.css'

type FallbackRender = (props: { error: Error; reset: () => void }) => ReactNode

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode | FallbackRender
  onReset?: () => void
  level?: 'root' | 'widget'
  resetKeys?: unknown[]
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error: normalizeError(error) }
  }

  // resetKeys가 변경되면 자동으로 에러 상태를 초기화
  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && this.props.resetKeys) {
      const prevKeys = prevProps.resetKeys ?? []
      const currentKeys = this.props.resetKeys
      const hasChanged =
        prevKeys.length !== currentKeys.length ||
        currentKeys.some((key, index) => !Object.is(key, prevKeys[index]))

      if (hasChanged) {
        this.resetSilently()
      }
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.level ?? 'widget'}] caught an error:`, error, errorInfo)
  }

  reset = () => {
    this.resetWithNotify()
  }

  private resetSilently = () => {
    this.resetWithNotify(false)
  }

  private resetWithNotify = (shouldNotify = true) => {
    this.setState({ hasError: false, error: null })
    if (shouldNotify) {
      this.props.onReset?.()
    }
  }

  render() {
    const { hasError, error } = this.state
    const { fallback, level = 'widget', children } = this.props

    if (hasError && error) {
      if (typeof fallback === 'function') {
        return fallback({ error, reset: this.reset })
      }

      if (fallback) {
        return fallback
      }

      return (
        <ErrorFallback
          error={error}
          onReset={this.reset}
          level={level}
        />
      )
    }

    return children
  }
}

// 기본 에러 화면
interface ErrorFallbackProps {
  error: Error
  onReset: () => void
  level: 'root' | 'widget'
}

export function ErrorFallback({ error, onReset, level }: ErrorFallbackProps) {
  const isNetwork = isNetworkError(error)
  const errorMessage = getUserFriendlyMessage(error, import.meta.env.DEV)

  return (
    <div className={`error-fallback error-fallback--${level}`} data-testid="error-fallback-container">
      <span className="error-fallback__icon" data-testid="error-fallback-icon">{isNetwork ? '📡' : '⚠️'}</span>
      <h3 className="error-fallback__title" data-testid="error-fallback-title">
        {level === 'root' ? '앱에 문제가 발생했습니다' : '문제가 발생했습니다'}
      </h3>
      <p className="error-fallback__message" data-testid="error-fallback-message">
        {errorMessage}
      </p>
      <button className="error-fallback__button" data-testid="error-fallback-retry-btn" onClick={onReset}>
        다시 시도
      </button>
    </div>
  )
}

// 앱 전체 에러 화면
export function RootErrorFallback({ error }: { error: Error | null }) {
  const errorMessage = error
    ? getUserFriendlyMessage(error, false)
    : '예상치 못한 오류가 발생했습니다'

  return (
    <div className="error-fallback error-fallback--root error-fallback--fullscreen" data-testid="error-root-container">
      <div className="error-fallback__content" data-testid="error-root-content">
        <span className="error-fallback__icon" data-testid="error-root-icon">🚨</span>
        <h1 className="error-fallback__title" data-testid="error-root-title">앱에 문제가 발생했습니다</h1>
        <p className="error-fallback__message" data-testid="error-root-message">
          {errorMessage}
        </p>
        <p className="error-fallback__message">
          문제가 계속되면 관리자에게 문의해주세요.
        </p>
        {import.meta.env.DEV && error && (
          <p className="error-fallback__message" data-testid="error-root-dev-message">
            {error.message}
          </p>
        )}
        <div className="error-fallback__actions" data-testid="error-root-actions">
          <button
            className="error-fallback__button"
            data-testid="error-root-refresh-btn"
            onClick={() => window.location.reload()}
          >
            페이지 새로고침
          </button>
        </div>
      </div>
    </div>
  )
}

export default ErrorBoundary
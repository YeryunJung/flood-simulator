import { Component, type ReactNode } from 'react'
import { isNetworkError } from '../../api/errors'
import './ErrorBoundary.css'

type FallbackRender = (props: { error: Error; reset: () => void }) => ReactNode

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode | FallbackRender
  onReset?: () => void
  level?: 'root' | 'page' | 'widget'
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

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  // resetKeys가 변경되면 자동으로 에러 상태를 초기화
  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && this.props.resetKeys) {
      const prevKeys = prevProps.resetKeys ?? []
      const currentKeys = this.props.resetKeys
      const hasChanged = currentKeys.some((key, index) => key !== prevKeys[index])

      if (hasChanged) {
        this.reset()
      }
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.level ?? 'widget'}] caught an error:`, error, errorInfo)
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
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
  level: 'root' | 'page' | 'widget'
}

function ErrorFallback({ error, onReset, level }: ErrorFallbackProps) {
  const isNetwork = isNetworkError(error)
  const errorMessage = error.message ?? '알 수 없는 오류'

  return (
    <div className={`error-fallback error-fallback--${level}`}>
      <span className="error-fallback__icon">{isNetwork ? '📡' : '⚠️'}</span>
      <h3 className="error-fallback__title">
        {level === 'root' ? '앱에 문제가 발생했습니다' : '문제가 발생했습니다'}
      </h3>
      <p className="error-fallback__message">
        {isNetwork ? '네트워크 연결을 확인해주세요' : errorMessage}
      </p>
      <button className="error-fallback__button" onClick={onReset}>
        다시 시도
      </button>
    </div>
  )
}

// 앱 전체 에러 화면
export function RootErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  return (
    <div className="error-fallback error-fallback--root error-fallback--fullscreen">
      <div className="error-fallback__content">
        <span className="error-fallback__icon">🚨</span>
        <h1 className="error-fallback__title">앱에 문제가 발생했습니다</h1>
        <p className="error-fallback__message">
          {error?.message ?? '예상치 못한 오류가 발생했습니다'}
        </p>
        <div className="error-fallback__actions">
          <button className="error-fallback__button" onClick={onReset}>
            다시 시도
          </button>
          <button
            className="error-fallback__button error-fallback__button--secondary"
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
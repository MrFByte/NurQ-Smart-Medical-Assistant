import { Component, ErrorInfo, ReactNode } from 'react'
import doctorGif from '@/assets/julientromeur-doctor-400.gif'

interface Props {
  children: ReactNode
  /** Optional fallback to render instead of the default error page. */
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Catches uncaught render errors anywhere in the Doctor-Frontend tree and
 * shows a friendly error page styled for both dark and light themes.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  private handleGoHome = () => {
    window.location.href = '/queue'
  }

  render() {
    if (!this.state.hasError) return this.props.children
    if (this.props.fallback) return this.props.fallback

    const { error } = this.state
    const errorName = error?.name || 'UnknownError'

    const codeMatch = error?.message?.match(/\b([45]\d{2})\b/)
    const statusCode = codeMatch ? codeMatch[1] : null

    const oneLiner = getOneLiner(errorName, statusCode)

    return (
      <div id="error-boundary-page" className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full text-center animate-fade-in">

          {/* Animated doctor GIF */}
          <div className="w-52 h-52 mx-auto mb-7 rounded-full overflow-hidden glass shadow-lg border-2 border-accent/20 dark:border-accent-400/20">
            <img
              src={doctorGif}
              alt="Doctor illustration"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Status code (if present) */}
          {statusCode && (
            <div className="text-6xl font-extrabold tracking-tight leading-none mb-2 bg-gradient-to-r from-accent-400 to-accent bg-clip-text text-transparent">
              {statusCode}
            </div>
          )}

          {/* Error name */}
          <h1 className={`font-display font-bold text-slate-800 dark:text-white mb-2 ${statusCode ? 'text-xl' : 'text-2xl'}`}>
            {errorName}
          </h1>

          {/* One-liner */}
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
            {oneLiner}
          </p>

          {/* Actions */}
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              id="error-try-again"
              onClick={this.handleReset}
              className="btn-primary"
            >
              Try Again
            </button>

            <button
              id="error-go-home"
              onClick={this.handleGoHome}
              className="btn-ghost"
            >
              Go to Queue
            </button>
          </div>

          {/* Collapsed error details */}
          {error?.message && (
            <details className="mt-7 text-left glass rounded-xl overflow-hidden">
              <summary className="px-4 py-2.5 text-xs font-semibold text-slate-400 dark:text-slate-500 cursor-pointer select-none uppercase tracking-wider">
                Error Details
              </summary>
              <pre className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-pre-wrap break-words border-t border-slate-200/80 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] max-h-48 overflow-auto">
                {error.message}
              </pre>
            </details>
          )}
        </div>
      </div>
    )
  }
}

/* ─── Helper: returns a friendly one-liner based on error name or code ───── */
function getOneLiner(name: string, code: string | null): string {
  if (code) {
    switch (code) {
      case '400': return 'The request was malformed. Please check your input and try again.'
      case '401': return 'You need to be signed in to access this page.'
      case '403': return "You don't have permission to view this resource."
      case '404': return "The page you're looking for doesn't exist or has been moved."
      case '408': return 'The request timed out. Please check your connection.'
      case '429': return "Too many requests — let's slow down and try again shortly."
      case '500': return 'Something went wrong on our end. Our team has been notified.'
      case '502': return 'Bad gateway — the server received an invalid response.'
      case '503': return 'Service temporarily unavailable. Please try again in a moment.'
    }
  }

  switch (name) {
    case 'TypeError':      return 'Something unexpected happened in the application.'
    case 'RangeError':     return 'A value was outside its expected range.'
    case 'ReferenceError': return 'The app tried to use something that doesn\'t exist.'
    case 'SyntaxError':    return 'There was a syntax issue in the application code.'
    case 'NetworkError':   return 'Could not reach the server. Check your internet connection.'
    case 'ChunkLoadError': return 'A required resource failed to load. Try refreshing.'
    default:               return 'An unexpected error occurred. Please try again.'
  }
}

export default ErrorBoundary

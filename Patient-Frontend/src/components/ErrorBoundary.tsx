import React, { Component, ErrorInfo, ReactNode } from 'react';
import doctorGif from '@/assets/illustrations/julientromeur-doctor-400.gif';

interface Props {
  children: ReactNode;
  /** Optional fallback to render instead of the default error page. */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches uncaught render errors anywhere in the Patient-Frontend tree and
 * shows a friendly error page with the animated doctor GIF.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const { error } = this.state;
    const errorName = error?.name || 'UnknownError';

    // Try to extract a numeric code if the error message contains one
    const codeMatch = error?.message?.match(/\b([45]\d{2})\b/);
    const statusCode = codeMatch ? codeMatch[1] : null;

    const oneLiner = getOneLiner(errorName, statusCode);

    return (
      <div
        id="error-boundary-page"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f0f4ff 0%, #e8ecf8 50%, #f5f0ff 100%)',
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          padding: '24px',
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: '100%',
            textAlign: 'center',
            animation: 'ebFadeIn 0.6s ease-out',
          }}
        >
          {/* Animated doctor GIF */}
          <div
            style={{
              width: 220,
              margin: '0 auto 28px',
              borderRadius: '10%',
              overflow: 'hidden',
              background: 'white',
              boxShadow: '0 8px 40px rgba(99,102,241,0.12), 0 2px 8px rgba(0,0,0,0.06)',
              border: '3px solid rgba(99,102,241,0.15)',
            }}
          >
            <img
              src={doctorGif}
              alt="Doctor illustration"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          {/* Status code (if present) */}
          {statusCode && (
            <div
              style={{
                fontSize: 56,
                fontWeight: 800,
                letterSpacing: '-0.03em',
                background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                lineHeight: 1,
                marginBottom: 8,
              }}
            >
              {statusCode}
            </div>
          )}

          {/* Error name */}
          <h1
            style={{
              fontSize: statusCode ? 20 : 28,
              fontWeight: 700,
              color: '#1e293b',
              margin: '0 0 8px',
              letterSpacing: '-0.01em',
            }}
          >
            {errorName}
          </h1>

          {/* One-liner */}
          <p
            style={{
              fontSize: 15,
              color: '#64748b',
              margin: '0 0 32px',
              lineHeight: 1.5,
            }}
          >
            {oneLiner}
          </p>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              id="error-try-again"
              onClick={this.handleReset}
              style={{
                padding: '12px 28px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(99,102,241,0.25)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 24px rgba(99,102,241,0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.25)';
              }}
            >
              Try Again
            </button>

            <button
              id="error-go-home"
              onClick={this.handleGoHome}
              style={{
                padding: '12px 28px',
                borderRadius: 12,
                border: '1.5px solid #e2e8f0',
                background: 'white',
                color: '#475569',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              Go Home
            </button>
          </div>

          {/* Collapsed error details */}
          {error?.message && (
            <details
              style={{
                marginTop: 28,
                textAlign: 'left',
                background: 'rgba(255,255,255,0.7)',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
              }}
            >
              <summary
                style={{
                  padding: '10px 16px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#94a3b8',
                  cursor: 'pointer',
                  userSelect: 'none',
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                }}
              >
                Error Details
              </summary>
              <pre
                style={{
                  padding: '12px 16px',
                  fontSize: 12,
                  color: '#64748b',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  margin: 0,
                  borderTop: '1px solid #f1f5f9',
                  background: '#fafbfd',
                  maxHeight: 200,
                  overflow: 'auto',
                }}
              >
                {error.message}
              </pre>
            </details>
          )}
        </div>

        {/* Inline keyframe animation */}
        <style>{`
          @keyframes ebFadeIn {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }
}

/* ─── Helper: returns a friendly one-liner based on error name or code ───── */
function getOneLiner(name: string, code: string | null): string {
  if (code) {
    switch (code) {
      case '400': return 'The request was malformed. Please check your input and try again.';
      case '401': return 'You need to be signed in to access this page.';
      case '403': return "You don't have permission to view this resource.";
      case '404': return "The page you're looking for doesn't exist or has been moved.";
      case '408': return 'The request timed out. Please check your connection.';
      case '429': return "Too many requests — let's slow down and try again shortly.";
      case '500': return 'Something went wrong on our end. Our team has been notified.';
      case '502': return 'Bad gateway — the server received an invalid response.';
      case '503': return 'Service temporarily unavailable. Please try again in a moment.';
    }
  }

  switch (name) {
    case 'TypeError':      return 'Something unexpected happened in the application.';
    case 'RangeError':     return 'A value was outside its expected range.';
    case 'ReferenceError': return "The app tried to use something that doesn't exist.";
    case 'SyntaxError':    return 'There was a syntax issue in the application code.';
    case 'NetworkError':   return 'Could not reach the server. Check your internet connection.';
    case 'ChunkLoadError': return 'A required resource failed to load. Try refreshing.';
    default:               return 'An unexpected error occurred. Please try again.';
  }
}

export default ErrorBoundary;

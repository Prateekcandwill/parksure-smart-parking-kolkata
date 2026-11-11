import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

/**
 * Catches render failures so a broken route cannot leave a blank screen.
 * The fallback is dependency-free and offers a safe way back to the app.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('ParkSure render error', error, info.componentStack)
    }
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex min-h-dvh items-center justify-center px-5 py-12">
        <div className="w-full max-w-md rounded-3xl border border-line/90 bg-surface p-6 text-center shadow-[0_30px_90px_-48px_rgba(0,0,0,.98)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-danger/30 bg-danger/10 font-mono text-lg font-semibold text-danger">
            !
          </div>
          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight text-text">Something went wrong</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            ParkSure hit an unexpected error. Your local demo data is still in this browser. Reload the app to continue
            where you left off.
          </p>
          <div className="mt-5 grid gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="focus-ring min-h-12 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink"
            >
              Reload ParkSure
            </button>
            <a
              href={import.meta.env.BASE_URL}
              className="focus-ring flex min-h-12 items-center justify-center rounded-xl border border-line/80 bg-raised px-4 text-sm font-semibold text-text"
            >
              Back to the home page
            </a>
          </div>
          <p className="mt-4 text-[10px] leading-relaxed text-muted">Demo mode: simulated data. No real money moves.</p>
        </div>
      </div>
    )
  }
}

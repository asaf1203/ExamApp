import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Application error boundary caught an error.', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <main className="app-shell">
          <div className="container py-5">
            <div className="app-panel p-4" role="alert">
              <p className="text-uppercase text-danger fw-semibold small mb-2">
                Application Error
              </p>
              <h1 className="h4">Something went wrong</h1>
              <p className="text-secondary mb-3">
                The screen failed to render. Refresh the page or return to the
                dashboard.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  window.location.hash = '#/student'
                  window.location.reload()
                }}
                type="button"
              >
                Reload Dashboard
              </button>
            </div>
          </div>
        </main>
      )
    }

    return this.props.children
  }
}

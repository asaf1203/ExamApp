import { appConfig, configService, isFeatureEnabled } from '../config'

const formatValue = (value) => {
  if (typeof value === 'boolean') {
    return value ? 'Enabled' : 'Disabled'
  }

  if (value === null || value === undefined || value === '') {
    return 'Not set'
  }

  return String(value)
}

const buildRows = () => [
  ['Environment', appConfig.env.mode],
  ['API backend', appConfig.api.backendMode],
  ['API base URL', appConfig.api.baseUrl],
  ['Auth API URL', appConfig.api.authApiUrl],
  ['API version', appConfig.api.version],
  ['Request timeout', `${appConfig.api.timeoutMs} ms`],
  ['Retry policy', `${appConfig.api.retryCount} retries / ${appConfig.api.retryDelayMs} ms`],
  ['Mock latency', appConfig.mock.enableLatency ? `${appConfig.mock.latencyMs} ms` : 'Disabled'],
  ['Mock error simulation', appConfig.mock.enableErrors ? appConfig.mock.errorRate : false],
  ['Runtime source', appConfig.runtime.source],
]

export function ConfigDebugPanel() {
  if (!isFeatureEnabled('configDebugPanel')) {
    return null
  }

  const diagnostics = configService.getDiagnostics()
  const featureEntries = Object.entries(appConfig.features).sort(([left], [right]) =>
    left.localeCompare(right),
  )

  return (
    <section className="app-panel p-3 p-md-4" aria-labelledby="config-debug-title">
      <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
        <div>
          <p className="eyebrow">Developer</p>
          <h2 className="h5 mb-1" id="config-debug-title">
            Configuration
          </h2>
          <p className="text-secondary mb-0">
            Public runtime settings currently used by this frontend.
          </p>
        </div>
        <span
          className={`status-badge ${
            appConfig.api.useMockApi ? 'status-badge-info' : 'status-badge-active'
          }`}
        >
          {appConfig.api.useMockApi ? 'Mock API' : 'HTTP API'}
        </span>
      </div>

      <div className="config-debug-grid">
        <div className="nested-panel">
          <h3 className="h6 mb-3">Runtime</h3>
          <dl className="detail-list compact">
            {buildRows().map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{formatValue(value)}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="nested-panel">
          <h3 className="h6 mb-3">Feature Flags</h3>
          <div className="feature-chip-list">
            {featureEntries.map(([flagName, enabled]) => (
              <span
                className={`status-badge ${
                  enabled ? 'status-badge-success' : 'status-badge-neutral'
                }`}
                key={flagName}
              >
                {flagName}: {enabled ? 'on' : 'off'}
              </span>
            ))}
          </div>
        </div>
      </div>

      {(diagnostics.errors.length > 0 || diagnostics.warnings.length > 0) && (
        <div className="nested-panel mt-3">
          <h3 className="h6 mb-3">Diagnostics</h3>
          {diagnostics.errors.length > 0 && (
            <div className="alert alert-danger mb-3" role="alert">
              {diagnostics.errors.map((message) => (
                <div key={message}>{message}</div>
              ))}
            </div>
          )}
          {diagnostics.warnings.length > 0 && (
            <div className="alert alert-warning mb-0" role="status">
              {diagnostics.warnings.map((message) => (
                <div key={message}>{message}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

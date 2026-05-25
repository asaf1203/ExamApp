# App Configuration

The frontend reads configuration through `configService` from `src/config`.
Components and services should not read `import.meta.env` directly.

## Main Entry Points

- `appConfig`: read-only public configuration snapshot.
- `configService.get(path, fallback)`: typed path-style lookup for utilities.
- `configService.isMockApiEnabled()`: selected transport mode.
- `isFeatureEnabled(flagName)`: feature flag helper for rendering and behavior.
- `configService.getDiagnostics()`: validation warnings and errors for developer UI.

## Configuration Sources

Configuration is merged in this order:

1. `defaultConfig.js` safe defaults.
2. Vite `VITE_*` environment variables from `.env`, `.env.local`, or CI/CD.
3. Optional `window.__EXAM_APP_CONFIG__` runtime override.

Runtime overrides are intentionally public only. Do not expose secrets in the
browser bundle. Backend secrets, JWT signing keys, database URLs, and provider
credentials must stay on the server.

## Switching Backends

Local mock mode:

```env
VITE_API_BACKEND=mock
```

Real REST backend mode:

```env
VITE_API_BACKEND=http
VITE_API_BASE_URL=https://api.example.com/api
VITE_AUTH_API_URL=https://api.example.com/api/auth
```

Service modules already branch at the API-client boundary. UI code should keep
calling `authService`, `examService`, and `teacherService`; those services are
where future REST endpoint work belongs.

## Runtime Injection

A container or host HTML page can inject public config before the React bundle:

```html
<script>
  window.__EXAM_APP_CONFIG__ = {
    api: { backendMode: 'http', baseUrl: '/api', useMockApi: false },
    features: { analytics: true }
  }
</script>
```

TODO backend: if remote config becomes required, load it before rendering the
React tree and merge it through `ConfigService` with the same validation path.

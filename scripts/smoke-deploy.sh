#!/usr/bin/env sh
# Smoke-test a running Docker Compose deployment.
# Expects client on CLIENT_BASE_URL (default http://localhost:8080)
# and server on SERVER_BASE_URL (default http://localhost:3000).

set -eu

CLIENT_BASE_URL="${CLIENT_BASE_URL:-http://localhost:8080}"
SERVER_BASE_URL="${SERVER_BASE_URL:-http://localhost:3000}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-60}"
SLEEP_SECONDS="${SLEEP_SECONDS:-2}"

log() {
  printf '%s\n' "$*"
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

wait_for_url() {
  url="$1"
  label="$2"
  attempt=1

  while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
    if curl --silent --show-error --fail --max-time 5 "$url" >/dev/null 2>&1; then
      log "Ready: $label ($url)"
      return 0
    fi

    log "Waiting for $label ($attempt/$MAX_ATTEMPTS)..."
    attempt=$((attempt + 1))
    sleep "$SLEEP_SECONDS"
  done

  fail "$label did not become ready: $url"
}

assert_http_status() {
  method="$1"
  url="$2"
  expected="$3"
  body_file="$4"
  shift 4

  status="$(
    curl --silent --show-error --output "$body_file" --write-out '%{http_code}' \
      --max-time 10 \
      -X "$method" \
      "$@" \
      "$url"
  )"

  if [ "$status" != "$expected" ]; then
    log "Response body:"
    cat "$body_file" >&2 || true
    fail "$method $url expected HTTP $expected, got $status"
  fi
}

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

log "Waiting for Compose services..."
wait_for_url "$SERVER_BASE_URL/health" "server health"
wait_for_url "$CLIENT_BASE_URL/health" "client → server health proxy"
wait_for_url "$CLIENT_BASE_URL/" "client UI"

# Server health payload
assert_http_status GET "$SERVER_BASE_URL/health" "200" "$tmpdir/server-health.json"
grep -q '"status":"ok"' "$tmpdir/server-health.json" \
  || grep -q '"status": "ok"' "$tmpdir/server-health.json" \
  || fail "server /health missing status ok"

# Client serves the built SPA
assert_http_status GET "$CLIENT_BASE_URL/" "200" "$tmpdir/client-index.html"
grep -qi '<html' "$tmpdir/client-index.html" || fail "client root did not return HTML"

# API through nginx proxy: login with seeded demo teacher
assert_http_status POST "$CLIENT_BASE_URL/api/auth/login" "200" "$tmpdir/login.json" \
  -H 'Content-Type: application/json' \
  -d '{"email":"teacher@example.com","password":"teacher123"}'

token="$(
  node -e "
const fs = require('fs');
const body = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
if (!body.token) process.exit(1);
process.stdout.write(body.token);
" "$tmpdir/login.json"
)" || fail "login response did not include a token"

# Authenticated request through the client proxy
assert_http_status GET "$CLIENT_BASE_URL/api/auth/me" "200" "$tmpdir/me.json" \
  -H "Authorization: Bearer $token"

grep -q 'teacher@example.com' "$tmpdir/me.json" || fail "/api/auth/me did not return the teacher user"

# Protected route still rejects anonymous callers through the proxy
assert_http_status GET "$CLIENT_BASE_URL/api/teacher/dashboard" "401" "$tmpdir/anon-dashboard.json"

log "Deployment smoke tests passed."

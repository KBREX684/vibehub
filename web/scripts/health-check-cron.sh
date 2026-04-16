#!/usr/bin/env bash
# G-09: Health check cron script for VibeHub.
#
# Usage:
#   */5 * * * * /path/to/health-check-cron.sh
#
# Environment variables:
#   VIBEHUB_HEALTH_URL   - Health endpoint URL (default: http://localhost:3000/api/v1/health)
#   VIBEHUB_ALERT_EMAIL  - Email to send alerts to (optional, requires mail/sendmail)
#   VIBEHUB_ALERT_WEBHOOK - Webhook URL for alerts (optional, sends JSON POST)
#
# Exit codes:
#   0 - Health check passed
#   1 - Health check failed
#   2 - Configuration error

set -euo pipefail

HEALTH_URL="${VIBEHUB_HEALTH_URL:-http://localhost:3000/api/v1/health}"
ALERT_EMAIL="${VIBEHUB_ALERT_EMAIL:-}"
ALERT_WEBHOOK="${VIBEHUB_ALERT_WEBHOOK:-}"
TIMEOUT=10

log() {
  echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] $*"
}

send_alert() {
  local message="$1"
  local timestamp
  timestamp=$(date -u +'%Y-%m-%dT%H:%M:%SZ')

  log "ALERT: $message"

  # Email alert
  if [ -n "$ALERT_EMAIL" ] && command -v mail &>/dev/null; then
    echo "$message" | mail -s "[VibeHub Alert] Health Check Failed - $timestamp" "$ALERT_EMAIL" || true
  fi

  # Webhook alert
  if [ -n "$ALERT_WEBHOOK" ]; then
    curl -s -X POST "$ALERT_WEBHOOK" \
      -H "Content-Type: application/json" \
      -d "{\"text\":\"[VibeHub Alert] $message\",\"timestamp\":\"$timestamp\"}" \
      --max-time 5 || true
  fi
}

# Perform health check
response=$(curl -s -w "\n%{http_code}" --max-time "$TIMEOUT" "$HEALTH_URL" 2>&1) || {
  send_alert "Health endpoint unreachable: $HEALTH_URL (curl failed)"
  exit 1
}

http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" != "200" ]; then
  send_alert "Health endpoint returned HTTP $http_code. Response: $body"
  exit 1
fi

# Parse status from JSON response
status=$(echo "$body" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ "$status" != "ok" ]; then
  send_alert "Health status is '$status' (expected 'ok'). Full response: $body"
  exit 1
fi

log "Health check passed (status=$status)"
exit 0

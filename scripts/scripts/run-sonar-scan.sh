#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${1:-$ROOT_DIR/.circleci/sonar.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Environment file not found: $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${SONAR_TOKEN:-}" ]]; then
  echo "SONAR_TOKEN must be set in $ENV_FILE" >&2
  exit 1
fi

if command -v circleci >/dev/null 2>&1; then
  circleci config validate >/dev/null
  circleci local execute --job sonar_scan --env-file "$ENV_FILE"
  exit $?
fi

if ! command -v docker >/dev/null 2>&1; then
  cat >&2 <<'MSG'
Neither the CircleCI CLI nor Docker is installed.
Install the CircleCI CLI (https://circleci.com/docs/local-cli/) or Docker to run the Sonar scan locally.
MSG
  exit 127
fi

export SONAR_HOST_URL
export SONAR_PROJECT_KEY
export SONAR_ORGANIZATION

DOCKER_IMAGE="sonarsource/sonar-scanner-cli:4.7.0.2747"

docker run --rm \
  -e "SONAR_TOKEN=$SONAR_TOKEN" \
  -e "SONAR_HOST_URL=${SONAR_HOST_URL:-https://sonarcloud.io}" \
  -e "SONAR_PROJECT_KEY=${SONAR_PROJECT_KEY:-}" \
  -e "SONAR_ORGANIZATION=${SONAR_ORGANIZATION:-}" \
  -v "$ROOT_DIR":/usr/src \
  -w /usr/src \
  "$DOCKER_IMAGE" \
  /bin/sh -c '
set -euo pipefail
apk add --no-cache nodejs npm git openjdk17-jre > /dev/null
cd backend && npm ci
cd ../frontend && npm ci
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk
if [ ! -d "$JAVA_HOME" ]; then
  echo "⚠️ Java 17 not found at $JAVA_HOME" >&2
  exit 1
fi
export PATH=$JAVA_HOME/bin:$PATH
ARGS="-Dsonar.host.url=${SONAR_HOST_URL:-https://sonarcloud.io} -Dsonar.login=$SONAR_TOKEN"
if [ -n "${SONAR_PROJECT_KEY:-}" ]; then
  ARGS="$ARGS -Dsonar.projectKey=$SONAR_PROJECT_KEY"
fi
if [ -n "${SONAR_ORGANIZATION:-}" ]; then
  ARGS="$ARGS -Dsonar.organization=$SONAR_ORGANIZATION"
fi
sonar-scanner $ARGS
'
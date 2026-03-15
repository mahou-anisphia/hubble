#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="hubble"
IMAGE_NAME="hubble"
HOST_PORT=3000
CONTAINER_PORT=3000

ENV_KEYS=(
  PORT
  REDIS_ENDPOINT
  REDIS_PORT
  KAFKA_ENDPOINT
  KAFKA_PORT
  OPENWEATHER_API_KEY
  OPENWEATHER_API_ENDPOINT
  AQAIR_API_KEY
  AQAIR_API_ENDPOINT
)

ENV_DESCS=(
  "HTTP port the server listens on (default: 3000)"
  "Redis host"
  "Redis port"
  "Kafka broker host"
  "Kafka broker port"
  "OpenWeather API key"
  "OpenWeather API endpoint"
  "IQAir API key"
  "IQAir API endpoint"
)

declare -A env_values

# ── Loaders ────────────────────────────────────────────────────────────────────

load_from_file() {
  local file="${1:-.env}"
  if [[ ! -f "$file" ]]; then
    echo "Error: file '$file' not found."
    exit 1
  fi
  while IFS='=' read -r key value || [[ -n "$key" ]]; do
    [[ "$key" =~ ^[[:space:]]*# || -z "${key// /}" ]] && continue
    key="${key%%[[:space:]]}"
    value="${value##[[:space:]]}"
    value="${value%%[[:space:]]}"
    value="${value%\"}"
    value="${value#\"}"
    env_values["$key"]="$value"
  done < "$file"
  echo "Loaded environment from $file"
}

load_manual() {
  echo ""
  echo "  Enter a value for each variable, or press Enter to skip."
  echo ""
  for i in "${!ENV_KEYS[@]}"; do
    local key="${ENV_KEYS[$i]}"
    local desc="${ENV_DESCS[$i]}"
    read -rp "  $key ($desc): " val || true
    [[ -n "${val:-}" ]] && env_values["$key"]="$val"
  done
}

# ── Docker helpers ─────────────────────────────────────────────────────────────

teardown() {
  if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q "^${CONTAINER_NAME}$"; then
    echo "Found existing '$CONTAINER_NAME' container — stopping and removing..."
    docker stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
    docker rm   "$CONTAINER_NAME" >/dev/null 2>&1 || true
    echo "Removed."
  else
    echo "No existing '$CONTAINER_NAME' container found."
  fi
}

build_env_flags() {
  local flags=()
  for key in "${ENV_KEYS[@]}"; do
    local val="${env_values[$key]:-}"
    [[ -n "$val" ]] && flags+=(-e "${key}=${val}")
  done
  printf '%s\n' "${flags[@]+"${flags[@]}"}"
}

# ── Argument parsing ───────────────────────────────────────────────────────────

MODE=""
ENV_FILE=".env"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      MODE="file"
      if [[ -n "${2:-}" && "${2:0:1}" != "-" ]]; then
        ENV_FILE="$2"
        shift
      fi
      ;;
    --manual)
      MODE="manual"
      ;;
    --port)
      HOST_PORT="${2:?--port requires a value}"
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [--env-file [path]] [--manual] [--port <port>]"
      echo ""
      echo "  --env-file [path]   Load environment variables from a file (default: .env)"
      echo "  --manual            Prompt for each variable interactively"
      echo "  --port <port>       Host port to bind (default: 3000)"
      echo ""
      echo "  When called with no flags, an interactive menu is shown."
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      echo "Run '$0 --help' for usage."
      exit 1
      ;;
  esac
  shift
done

# ── Interactive menu (no flags given) ─────────────────────────────────────────

if [[ -z "$MODE" ]]; then
  echo ""
  echo "  Hubble Deployment"
  echo "  ─────────────────"
  echo "  1) Load from .env file"
  echo "  2) Enter variables manually"
  echo "  3) No environment variables"
  echo ""
  read -rp "  Choose [1/2/3]: " choice || true
  case "${choice:-}" in
    1) MODE="file"   ;;
    2) MODE="manual" ;;
    3) MODE="none"   ;;
    *) echo "Invalid choice."; exit 1 ;;
  esac

  if [[ "$MODE" == "file" ]]; then
    read -rp "  Path to env file [.env]: " custom_path || true
    [[ -n "${custom_path:-}" ]] && ENV_FILE="$custom_path"
  fi
fi

# ── Load env vars ──────────────────────────────────────────────────────────────

echo ""
case "$MODE" in
  file)   load_from_file "$ENV_FILE" ;;
  manual) load_manual ;;
  none)   echo "No environment variables will be set." ;;
esac

# ── Teardown ───────────────────────────────────────────────────────────────────

echo ""
teardown

# ── Build ──────────────────────────────────────────────────────────────────────

echo ""
echo "Building Docker image '$IMAGE_NAME'..."
docker build -t "$IMAGE_NAME" .
echo "Build complete."

# ── Run ────────────────────────────────────────────────────────────────────────

echo ""
# If PORT was supplied via env file / manual input, sync both sides of the -p binding
if [[ -n "${env_values[PORT]:-}" ]]; then
  HOST_PORT="${env_values[PORT]}"
  CONTAINER_PORT="${env_values[PORT]}"
fi

echo "Starting '$CONTAINER_NAME' on port $HOST_PORT..."

mapfile -t env_flags < <(build_env_flags)

docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p "${HOST_PORT}:${CONTAINER_PORT}" \
  "${env_flags[@]+"${env_flags[@]}"}" \
  "$IMAGE_NAME"

echo ""
echo "  Hubble is up at http://localhost:${HOST_PORT}"
echo "  Swagger docs:   http://localhost:${HOST_PORT}/swagger"

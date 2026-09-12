#!/usr/bin/env bash
# Render routes with headless Brave into web/.shots/*.png at a real 393x852 viewport.
# Usage: pnpm shots [/route ...]   (default: / /cast /familiars /detour /palate)
# Env: SHOTS_URL (default http://localhost:3000), SHOTS_FULL=1 for full-page, BRAVE=<path>.
set -euo pipefail
cd "$(dirname "$0")/.."
exec node scripts/shots.mjs "$@"

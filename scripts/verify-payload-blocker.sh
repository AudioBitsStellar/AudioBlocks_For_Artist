#!/usr/bin/env bash
set -euo pipefail

# Test fixture verification for PolinRider signature detection (Issue #709)
# Ensures that block-payload fails on files containing global['!'] with long whitespace padding

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIXTURE_DIR="${SCRIPT_DIR}/fixtures"

MALICIOUS_FIXTURE="${FIXTURE_DIR}/polinrider.fixture.js"
CLEAN_FIXTURE="${FIXTURE_DIR}/clean.fixture.js"

echo "Verifying PolinRider payload detection logic against fixtures..."

PATTERN="global\['!'\]|global\[\"!\"\]|[ \t]{20,}global"

# 1. Test that the malicious fixture is detected
if grep -rEn "$PATTERN" "$MALICIOUS_FIXTURE" > /dev/null 2>&1; then
  echo "PASS: Detected malicious PolinRider signature in fixture: $MALICIOUS_FIXTURE"
else
  echo "FAIL: Blocker did not detect malicious PolinRider signature in $MALICIOUS_FIXTURE"
  exit 1
fi

# 2. Test that the clean fixture is not flagged
if grep -rEn "$PATTERN" "$CLEAN_FIXTURE" > /dev/null 2>&1; then
  echo "FAIL: False positive on clean fixture: $CLEAN_FIXTURE"
  exit 1
else
  echo "PASS: Clean fixture passed without false positives: $CLEAN_FIXTURE"
fi

# 3. Test that the repository itself is clean
echo "Scanning codebase for PolinRider signature..."
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
if grep -rEn \
  --exclude-dir=.git \
  --exclude-dir=node_modules \
  --exclude-dir=fixtures \
  --exclude='*fixture*' \
  --exclude=block-payload.yml \
  --exclude=verify-payload-blocker.sh \
  --include='*.js' \
  --include='*.mjs' \
  --include='*.cjs' \
  --include='*.ts' \
  --include='*.tsx' \
  --include='*.config.*' \
  "$PATTERN" "$ROOT_DIR" ; then
  echo "FAIL: Codebase contains files matching PolinRider signature!"
  exit 1
else
  echo "PASS: Codebase is clean."
fi

echo "Payload blocker fixture verification completed successfully."

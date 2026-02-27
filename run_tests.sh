#!/bin/bash
# Run all thyquidity modal tests
# Usage: ./run_tests.sh [HEADED]
# HEADED=1 shows the browser for debugging

cd "$(dirname "$0")/.."
export HEADED="${1:-0}"

echo "=== Offramp (home) ==="
node thyquidity/test_offramp.js || exit 1

echo ""
echo "=== Offramp (/hcp) ==="
PAGE=/hcp node thyquidity/test_offramp.js || exit 1

echo ""
echo "=== Offramp Cancel+retry (/hcp) ==="
CANCEL_RETRY=1 PAGE=/hcp node thyquidity/test_offramp.js || exit 1

echo ""
echo "=== HCP modal ==="
node thyquidity/test_hcp.js || exit 1

echo ""
echo "=== HCP all patient pages ==="
ALL_PAGES=1 node thyquidity/test_hcp.js || exit 1

echo ""
echo "All tests passed."

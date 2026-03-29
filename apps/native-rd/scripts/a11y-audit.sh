#!/usr/bin/env bash
# Usage: ./scripts/a11y-audit.sh [--json] [--pattern <pattern>]
# Runs the accessibility test suite and outputs structured results.
#
# --json      Output JSON summary instead of default Jest output
# --pattern   Filter to specific test pattern (default: "accessibility")
#
# Exit codes: matches Jest exit code (0=all pass, 1=failures)

set -euo pipefail

if ! command -v python3 &>/dev/null; then
  echo '{"error": "missing_dependency", "message": "python3 is required but not found"}' >&2
  exit 1
fi

JSON_OUTPUT=false
PATTERN="accessibility"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --json) JSON_OUTPUT=true; shift ;;
    --pattern)
      if [[ $# -lt 2 ]]; then
        echo "Error: --pattern requires a value" >&2; exit 1
      fi
      PATTERN="$2"; shift 2 ;;
    *) echo "Unknown flag: $1" >&2; exit 1 ;;
  esac
done

TMPFILE=$(mktemp /tmp/a11y-results-XXXXXX.json)
trap 'rm -f "$TMPFILE"' EXIT

# Run Jest — capture exit code without letting set -e abort
set +e
npx jest --testPathPatterns "$PATTERN" --json --outputFile "$TMPFILE" --no-coverage 2>&1 | tail -1 >&2
EXIT_CODE=$?
set -e

# Guard against missing/empty output
if [ ! -s "$TMPFILE" ]; then
  echo '{"error": "no_results", "message": "Jest did not produce output. Run manually to diagnose."}' >&2
  exit "${EXIT_CODE:-1}"
fi

if [ "$JSON_OUTPUT" = true ]; then
  python3 -c "
import json, sys

try:
    with open(sys.argv[1]) as f:
        data = json.load(f)
except (json.JSONDecodeError, FileNotFoundError) as e:
    print(json.dumps({'error': 'parse_failed', 'message': str(e)}), file=sys.stderr)
    sys.exit(1)

results = {
    'passed': data.get('numPassedTests', 0),
    'failed': data.get('numFailedTests', 0),
    'total': data.get('numTotalTests', 0),
    'status': 'pass' if data.get('numFailedTests', 0) == 0 else 'fail',
    'failures': []
}

for suite in data.get('testResults', []):
    for test in suite.get('testResults', []):
        if test.get('status') == 'failed':
            results['failures'].append({
                'test': test.get('fullName'),
                'message': test.get('failureMessages', [''])[0][:300]
            })

print(json.dumps(results, indent=2))
" "$TMPFILE"
else
  # Format the raw Jest JSON into a human-readable summary
  python3 -c "
import json, sys

try:
    with open(sys.argv[1]) as f:
        data = json.load(f)
except (json.JSONDecodeError, FileNotFoundError) as e:
    print(f'Error reading results: {e}', file=sys.stderr)
    sys.exit(1)

passed = data.get('numPassedTests', 0)
failed = data.get('numFailedTests', 0)
total = data.get('numTotalTests', 0)
status = 'PASS' if failed == 0 else 'FAIL'

print(f'\n  a11y audit: {status}  ({passed}/{total} passed)\n')

for suite in data.get('testResults', []):
    for test in suite.get('testResults', []):
        if test.get('status') == 'failed':
            print(f'  FAIL: {test.get(\"fullName\")}')
            msgs = test.get('failureMessages', [])
            if msgs:
                print(f'        {msgs[0][:200]}')
            print()
" "$TMPFILE"
fi

exit "$EXIT_CODE"

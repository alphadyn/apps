#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

python3 - <<'PY'
from pathlib import Path
import re

count = 0
for path in Path('.').rglob('*'):
    if path.is_file() and (
        path.name.startswith('test_')
        or path.name.endswith('.test.js')
        or path.name.endswith('.test.ts')
        or path.name.endswith('.spec.js')
        or path.name.endswith('.spec.ts')
    ):
        text = path.read_text(encoding='utf-8', errors='ignore')
        count += len(re.findall(r'^\s*def test_', text, re.MULTILINE))
        count += len(re.findall(r'\b(?:it|test)\s*\(', text))

if count > 51:
    raise SystemExit(f'Test suite has {count} test cases; limit is 51')
print(f'Test suite: {count}/51 test cases')
PY

python3 -m pip install -r requirements-dev.txt
python3 -m pytest "$@"

if command -v node >/dev/null 2>&1; then
  node --test \
    daily-brief/api.test.js \
    forma/documentation.test.js \
    forma/inspector-ui.test.js \
    forma/samples.test.js \
    forma/units.test.js
fi

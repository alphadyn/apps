#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

python3 - <<'PY'
import ast
from collections import Counter
import os
from pathlib import Path
import re

counts = Counter()
for directory, dirs, files in os.walk('.'):
    dirs[:] = [name for name in dirs if name not in {'.git', '.venv', 'venv', 'node_modules', '__pycache__'}]
    for name in files:
        path = Path(directory) / name
        parts = path.parts
        project = parts[0] if len(parts) > 1 else '(root)'
        if name.endswith('.py') and (name.startswith('test_') or name.endswith('_test.py')):
            tree = ast.parse(path.read_text(encoding='utf-8'), filename=str(path))
            for node in ast.walk(tree):
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name.startswith('test_'):
                    if any('parametrize' in ast.unparse(decorator) for decorator in node.decorator_list):
                        raise SystemExit(f'{path}: parametrized tests can exceed the two-test limit; group checks instead')
                    counts[project] += 1
        elif name.endswith(('.test.js', '.test.ts', '.spec.js', '.spec.ts')):
            text = path.read_text(encoding='utf-8')
            counts[project] += len(re.findall(r'(?<!\w)(?:it|test)(?:\.(?:only|skip|todo))?\s*\(', text))

excess = {project: count for project, count in counts.items() if count > 2}
if excess:
    raise SystemExit('Projects exceed two tests: ' + ', '.join(f'{project} ({count})' for project, count in sorted(excess.items())))
print('Tests per project: ' + ', '.join(f'{project} {count}/2' for project, count in sorted(counts.items())))
PY

python3 -m pip install -r requirements-dev.txt
python3 -m pytest "$@"

if command -v node >/dev/null 2>&1; then
  node --test \
    daily-brief/api.test.js \
    forma/project.test.js \
    weight-tracker/model.test.js
fi

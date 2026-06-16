from __future__ import annotations

import subprocess
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
PYTHON = REPO_ROOT / ".codex-venv" / "bin" / "python"
MANAGE_PY = REPO_ROOT / "backend" / "core" / "manage.py"
EXPECTED_DB = REPO_ROOT / "backend" / "db.sqlite3"


class ManageEntrypointTests(unittest.TestCase):
    def test_manage_py_uses_backend_db_and_api_app(self) -> None:
        result = subprocess.run(
            [
                str(PYTHON),
                str(MANAGE_PY),
                "shell",
                "-c",
                (
                    "from django.conf import settings; "
                    "print(settings.DATABASES['default']['NAME']); "
                    "print('api' in settings.INSTALLED_APPS)"
                ),
            ],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )

        self.assertEqual(result.returncode, 0, result.stderr)

        output_lines = [line.strip() for line in result.stdout.splitlines() if line.strip()]
        self.assertIn(str(EXPECTED_DB), output_lines)
        self.assertIn("True", output_lines)


if __name__ == "__main__":
    unittest.main()

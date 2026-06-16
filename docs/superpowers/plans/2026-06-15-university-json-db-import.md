# University JSON DB Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import Charles Darwin, Royal Melbourne Institute of Technology, and Deakin JSON exports into Django DB without deleting unrelated university data.

**Architecture:** Reuse `backend/import_university_courses.py` as single import path. Add explicit source-file resolution and safe partial-import behavior, cover with tests, then execute importer with working Python environment against requested JSON files.

**Tech Stack:** Python, Django, SQLite, unittest/Django test runner

---

### Task 1: Lock importer behavior with tests

**Files:**
- Create: `backend/api/test_import_university_courses.py`
- Test: `backend/api/test_import_university_courses.py`

- [ ] **Step 1: Write failing tests**

```python
class ResolveSourceFilesTests(SimpleTestCase):
    def test_resolve_source_files_supports_repo_relative_paths(self):
        resolved = resolve_source_files(["universities/deakin_university.json"])
        self.assertEqual(resolved, [REPO_ROOT / "universities" / "deakin_university.json"])


class MainImportTests(TestCase):
    def test_main_with_explicit_paths_keeps_unrelated_universities(self):
        University.objects.create(name="Keep Me", country="Australia", city="Sydney")
        main([str(json_path)])
        self.assertTrue(University.objects.filter(name="Keep Me").exists())
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m django test api.test_import_university_courses -v 2`
Expected: FAIL because `resolve_source_files` behavior does not exist and `main()` deletes unrelated data for partial imports.

- [ ] **Step 3: Write minimal implementation**

```python
def resolve_source_files(json_paths=None):
    if json_paths:
        return [(REPO_ROOT / path).resolve() if not Path(path).is_absolute() else Path(path) for path in json_paths]
    return [UNIVERSITIES_DIR / file_name for file_name in SOURCE_FILE_NAMES]


def main(json_paths=None):
    source_files = resolve_source_files(json_paths)
    prune_universities = not json_paths
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m django test api.test_import_university_courses -v 2`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/api/test_import_university_courses.py backend/import_university_courses.py
git commit -m "fix: support targeted university JSON imports"
```

### Task 2: Execute requested import

**Files:**
- Modify: `backend/import_university_courses.py`
- Use data: `universities/charles_darwin_university.json`
- Use data: `universities/royal_melbourne_institute_of_technology.json`
- Use data: `universities/deakin_university.json`

- [ ] **Step 1: Run importer for requested files**

```bash
python backend/import_university_courses.py \
  universities/charles_darwin_university.json \
  universities/royal_melbourne_institute_of_technology.json \
  universities/deakin_university.json
```

- [ ] **Step 2: Verify DB counts**

```bash
sqlite3 backend/db.sqlite3 "
select u.name, count(c.id)
from api_university u
left join api_course c on c.university_id = u.id
where u.name in (
  'Charles Darwin University',
  'Royal Melbourne Institute of Technology',
  'Deakin University'
)
group by u.id, u.name
order by u.name;
"
```

- [ ] **Step 3: Commit**

```bash
git add backend/db.sqlite3
git commit -m "chore: import requested university data"
```

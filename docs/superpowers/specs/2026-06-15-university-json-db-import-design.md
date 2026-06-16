# University JSON DB Import Design

## Goal

Import three source files into Django DB only:

- `universities/charles_darwin_university.json`
- `universities/royal_melbourne_institute_of_technology.json`
- `universities/deakin_university.json`

No file copying into `backend/universities/`. No unrelated DB cleanup.

## Current Context

- `backend/import_university_courses.py` already contains upsert logic for `University`, `Course`, `CourseFee`, `CourseIntake`, `AcademicRequirement`, and `EnglishRequirement`.
- Current script assumes default source files and currently resolves them from wrong parent path.
- Current `main()` deletes universities not present in imported set. That is unsafe for partial imports.
- Checked-in `venv` is not runnable on this machine because its shebang points at missing `/home/...` interpreter.

## Chosen Approach

Patch `backend/import_university_courses.py` so it can:

1. Accept explicit JSON file paths.
2. Resolve repo-relative paths under current repo correctly.
3. Skip stale-university deletion for targeted imports.

Then run importer against requested three files with working local Python environment.

## Expected Behavior

- Existing rows for these universities get updated.
- Missing rows get created.
- Courses for imported universities sync to source file contents.
- Other universities in DB remain untouched.

## Verification

- Add tests for path resolution and no-delete behavior during targeted import.
- Run importer for requested files.
- Query SQLite for final university/course counts for requested universities.

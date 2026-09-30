# Local refactor validation

Validated on 2026-09-30. No push or deployment performed.

| Check | Result |
|---|---|
| Registration without camera | PASS |
| Email login | PASS |
| Face enrollment with a still image | PASS |
| Admin election creation | PASS |
| Candidate creation | PASS |
| Candidate image upload, preview, and student display | PASS |
| Candidate CGPA | PASS |
| Student dashboard sync, including edited CGPA | PASS |
| Voting and real results | PASS |
| Double-vote protection | PASS |
| Mock application data and known local fixtures removed | PASS |

Headless Chrome exercised separate student/admin sessions against real FastAPI endpoints and a disposable SQLite database. No HTTP responses or biometric results were mocked. The API suite passed all four regression groups, including different-face rejection, enrollment bypass rejection, unauthorized admin access, duplicate registration, malformed images, credential replacement, cross-election token rejection, and concurrent duplicate casts. TypeScript checking, the Vite build, and `git diff --check` passed.

The native mobile camera input is present; opening a physical phone's camera was not tested. Concurrent voting was exercised on SQLite; PostgreSQL row locking remains in the implementation but was not exercised against a live PostgreSQL server.

Removed 18 known seed/test elections and nine clearly identified test students from `backend/sug_dev.db` and `backend/sug.db`. Other account records were preserved. Recovery copies from before cleanup are in `/tmp/sug-pre-cleanup-8a55an6_` on this machine. These temporary backups are not part of the application or Git changes.

Rerun instructions are in README.md. The biometric detector, recognizer, and matching threshold were not changed. The existing base64 ballot format and anonymous ballot model were retained.

# Submission Notes

## What I'd test next if I had more time

- Concurrent operations — what happens if two requests try to update the same task simultaneously.
- Input length limits — very long title/description strings and how they affect performance.
- Rate limiting and request size limits to prevent abuse.
- Testing the error handler middleware in `app.js` by forcing internal server errors.

## What surprised me in the codebase

- The `README.md` and `ASSIGNMENT.md` describe different status values — the README says `pending | in-progress | completed` but the code uses `todo | in_progress | done`. This kind of doc/code mismatch can confuse new developers.
- The `completeTask` function silently resets priority to `'medium'`, which felt like a copy-paste mistake rather than intentional behavior.
- The `getByStatus` function uses `.includes()` (substring match) instead of `===` (exact match), which is a subtle bug that wouldn't be obvious without testing edge cases.

## Questions I'd ask before shipping to production

- Do we need authentication and authorization? Currently anyone can create, modify, or delete any task.
- Should we switch from in-memory storage to a real database? All data is lost on server restart.
- Do we need input sanitization to prevent XSS if task data is rendered in a frontend?
- What's the expected scale — how many tasks and concurrent users should this handle?
- Should there be an audit log for tracking who changed what and when?
- Is the `assignee` field just a name string, or should it reference a user ID from a user system?

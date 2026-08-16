# Bug Report

Bugs discovered through writing and running the test suite (`npm test`).

---

## Bug 1: `getByStatus` uses fuzzy matching instead of exact matching

**File:** `src/services/taskService.js`, line 9  
**Code:** `tasks.filter((t) => t.status.includes(status))`

**Expected behavior:** Filtering by status should return only tasks whose status exactly matches the query. For example, `?status=todo` should return only tasks with status `"todo"`.

**What actually happens:** The `.includes()` string method checks if the status *contains* the search string as a substring. This means:
- `?status=do` matches **both** `"todo"` and `"done"` (because both contain `"do"`)
- `?status=in` matches `"in_progress"` (because it contains `"in"`)
- `?status=to` matches `"todo"` (because it contains `"to"`)

**How I discovered it:** Wrote a test that creates a "todo" task and a "done" task, then filters with `?status=do`. Expected 0 results, but got 2.

**What a fix looks like:** Replace `.includes()` with strict equality (`===`):
```javascript
// Before (buggy)
const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));

// After (fixed)
const getByStatus = (status) => tasks.filter((t) => t.status === status);
```

---

## Bug 2: Pagination offset is off by one

**File:** `src/services/taskService.js`, lines 11-14  
**Code:** `const offset = page * limit;`

**Expected behavior:** Page 1 should return the first `limit` items, page 2 the next batch, and so on. With 5 tasks and `?page=1&limit=2`, you should get Task 1 and Task 2.

**What actually happens:** The offset formula `page * limit` calculates incorrectly:
- Page 1 with limit 2: offset = `1 * 2 = 2`, so it **skips** the first 2 items and returns items 3-4
- Page 2 with limit 2: offset = `2 * 2 = 4`, returns only item 5
- The first 2 items (Task 1, Task 2) are **unreachable** — no page returns them

**How I discovered it:** Wrote a test that creates 5 tasks and requests page 1 with limit 2. Expected the first item to be "Task 1", but got "Task 3".

**What a fix looks like:** Use `(page - 1) * limit` so page 1 starts at offset 0:
```javascript
// Before (buggy)
const offset = page * limit;

// After (fixed)
const offset = (page - 1) * limit;
```

---

## Bug 3: `completeTask` silently resets priority to 'medium'

**File:** `src/services/taskService.js`, lines 63-77  
**Code:** `priority: 'medium'` on line 69

**Expected behavior:** Marking a task as complete should only change `status` to `"done"` and set `completedAt` to the current timestamp. All other fields (including `priority`) should remain unchanged.

**What actually happens:** The function hardcodes `priority: 'medium'` in the updated object. If a task has priority `"high"` or `"low"`, completing it silently overwrites the priority to `"medium"`. This is data loss — there's no way to recover the original priority.

**How I discovered it:** Created a task with `priority: "high"`, then called `completeTask`. Expected the completed task to still have `priority: "high"`, but it was `"medium"`.

**What a fix looks like:** Remove the `priority: 'medium'` line from the spread object:
```javascript
// Before (buggy)
const updated = {
  ...task,
  priority: 'medium',   // <-- remove this line
  status: 'done',
  completedAt: new Date().toISOString(),
};

// After (fixed)
const updated = {
  ...task,
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

---

## Bug 4: `update` allows overwriting protected fields (id, createdAt)

**File:** `src/services/taskService.js`, lines 46-53  
**Code:** `const updated = { ...tasks[index], ...fields };`

**Expected behavior:** The PUT endpoint should only update user-editable fields (title, description, status, priority, dueDate). Internal fields like `id` and `createdAt` should be protected and not overwritable by the client.

**What actually happens:** The `update` function blindly spreads the incoming `fields` object over the existing task. Since object spread applies left-to-right, any field in `fields` overwrites the corresponding field in the task. A client can send:
```json
{ "id": "hacked-id", "createdAt": "1999-01-01T00:00:00.000Z" }
```
and the task's `id` and `createdAt` will be overwritten. This could break data integrity (duplicate/invalid IDs, falsified timestamps).

**How I discovered it:** Wrote a test that creates a task, then calls `update` with `{ id: 'hacked-id', createdAt: '1999-...' }`. Expected the original `id` and `createdAt` to be preserved, but they were overwritten.

**What a fix looks like:** Either whitelist the allowed fields, or re-apply protected fields after the spread:
```javascript
// Option A: Whitelist allowed fields
const { title, description, status, priority, dueDate } = fields;
const updated = { ...tasks[index], title, description, status, priority, dueDate };

// Option B: Re-apply protected fields after spread
const updated = { ...tasks[index], ...fields, id: tasks[index].id, createdAt: tasks[index].createdAt };
```

---

## Bug 5: Empty string `status` or `priority` bypasses validation

**File:** `src/utils/validators.js`, lines 8 and 11  
**Code:** `if (body.status && !VALID_STATUSES.includes(body.status))`

**Expected behavior:** Sending an empty string `""` for `status` or `priority` should be rejected as invalid input, since `""` is not a valid status or priority value.

**What actually happens:** In JavaScript, `""` (empty string) is **falsy**. The check `body.status && ...` evaluates to `false` when status is `""`, so validation is skipped entirely. The task gets created with `status: ""` instead of being rejected. Same issue applies to `priority` on line 11. This also affects `validateUpdateTask` (lines 23 and 26).

A task with `status: ""` would:
- Not appear in any `?status=` filter
- Not be counted in `/tasks/stats` (since `counts[""]` is `undefined`)
- Be silently broken data

**How I discovered it:** Reviewing the validator code and noticing the truthy check pattern. In JavaScript, `""`, `0`, `null`, `undefined`, and `false` are all falsy — so any of these would skip validation.

**What a fix looks like:** Check for `undefined` explicitly instead of relying on truthiness:
```javascript
// Before (buggy)
if (body.status && !VALID_STATUSES.includes(body.status))

// After (fixed)
if (body.status !== undefined && !VALID_STATUSES.includes(body.status))
```

---

## Bug 6: PUT can set status to "done" without setting `completedAt`

**File:** `src/services/taskService.js`, lines 46-53 (update function)  
**Also related to:** `src/routes/tasks.js`, line 47

**Expected behavior:** When a task's status becomes `"done"`, the `completedAt` timestamp should be set automatically, regardless of whether the status change came through `PUT /tasks/:id` or `PATCH /tasks/:id/complete`.

**What actually happens:** Only the `completeTask` function (used by `PATCH /complete`) sets `completedAt`. If a client uses `PUT /tasks/:id` with `{ "status": "done" }`, the task becomes "done" but `completedAt` stays `null`. This is a logical inconsistency — you end up with completed tasks that have no completion timestamp.

**How I discovered it:** Comparing the `update` and `completeTask` functions. `completeTask` sets both `status: 'done'` and `completedAt`, but `update` blindly applies whatever fields are sent without any side-effect logic.

**What a fix looks like:** In the `update` function, check if status is being changed to "done" and automatically set `completedAt`:
```javascript
const update = (id, fields) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  // If status is being set to 'done', add completedAt
  if (fields.status === 'done' && tasks[index].status !== 'done') {
    fields.completedAt = new Date().toISOString();
  }

  const updated = { ...tasks[index], ...fields };
  tasks[index] = updated;
  return updated;
};
```

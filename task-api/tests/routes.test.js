const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

describe('POST /tasks', () => {
  test('should create a task and return 201', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'New task', priority: 'high' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('New task');
    expect(res.body.priority).toBe('high');
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('todo');
  });

  test('should return 400 when title is missing', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ priority: 'high' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('should return 400 when title is empty string', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('should return 400 for invalid status', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Task', status: 'invalid_status' });

    expect(res.status).toBe(400);
  });

  test('should return 400 for invalid priority', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Task', priority: 'urgent' });

    expect(res.status).toBe(400);
  });

  test('should return 400 for invalid dueDate', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Task', dueDate: 'not-a-date' });

    expect(res.status).toBe(400);
  });
});

describe('GET /tasks', () => {
  test('should return all tasks', async () => {
    taskService.create({ title: 'Task 1' });
    taskService.create({ title: 'Task 2' });

    const res = await request(app).get('/tasks');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('should return empty array when no tasks', async () => {
    const res = await request(app).get('/tasks');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('GET /tasks?status=', () => {
  beforeEach(() => {
    taskService.create({ title: 'Todo', status: 'todo' });
    taskService.create({ title: 'Done', status: 'done' });
    taskService.create({ title: 'In Progress', status: 'in_progress' });
  });

  test('should return only tasks with matching status', async () => {
    const res = await request(app).get('/tasks?status=todo');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe('todo');
  });

  test('should return empty array for status with no matches', async () => {
    taskService._reset();
    taskService.create({ title: 'Todo', status: 'todo' });

    const res = await request(app).get('/tasks?status=in_progress');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  // BUG: .includes() causes "do" to match both "todo" and "done"
  test('should not match partial status strings', async () => {
    const res = await request(app).get('/tasks?status=do');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

describe('GET /tasks?page=&limit=', () => {
  beforeEach(() => {
    for (let i = 1; i <= 5; i++) {
      taskService.create({ title: `Task ${i}` });
    }
  });

  test('page 1 should return first items', async () => {
    const res = await request(app).get('/tasks?page=1&limit=2');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('Task 1');
  });

  test('page 2 should return next items', async () => {
    const res = await request(app).get('/tasks?page=2&limit=2');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('Task 3');
  });

  test('should return empty for page beyond data', async () => {
    const res = await request(app).get('/tasks?page=100&limit=2');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

describe('PUT /tasks/:id', () => {
  test('should update a task and return it', async () => {
    const task = taskService.create({ title: 'Original' });

    const res = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ title: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
    expect(res.body.id).toBe(task.id);
  });

  test('should return 404 for non-existent task', async () => {
    const res = await request(app)
      .put('/tasks/fake-id')
      .send({ title: 'Nope' });

    expect(res.status).toBe(404);
  });

  test('should return 400 for empty title', async () => {
    const task = taskService.create({ title: 'Original' });

    const res = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ title: '' });

    expect(res.status).toBe(400);
  });

  test('should return 400 for invalid status', async () => {
    const task = taskService.create({ title: 'Original' });

    const res = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ status: 'invalid' });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /tasks/:id', () => {
  test('should delete a task and return 204', async () => {
    const task = taskService.create({ title: 'Delete me' });

    const res = await request(app).delete(`/tasks/${task.id}`);

    expect(res.status).toBe(204);
  });

  test('task should not exist after deletion', async () => {
    const task = taskService.create({ title: 'Delete me' });
    await request(app).delete(`/tasks/${task.id}`);

    const res = await request(app).get('/tasks');
    expect(res.body).toHaveLength(0);
  });

  test('should return 404 for non-existent task', async () => {
    const res = await request(app).delete('/tasks/fake-id');

    expect(res.status).toBe(404);
  });
});

describe('PATCH /tasks/:id/complete', () => {
  test('should mark task as done with completedAt', async () => {
    const task = taskService.create({ title: 'Finish me' });

    const res = await request(app).patch(`/tasks/${task.id}/complete`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).toBeDefined();
  });

  test('should return 404 for non-existent task', async () => {
    const res = await request(app).patch('/tasks/fake-id/complete');

    expect(res.status).toBe(404);
  });

  // BUG: completeTask resets priority to 'medium' instead of preserving it
  test('should preserve original priority after completing', async () => {
    const task = taskService.create({ title: 'Important', priority: 'high' });

    const res = await request(app).patch(`/tasks/${task.id}/complete`);

    expect(res.status).toBe(200);
    expect(res.body.priority).toBe('high');
  });
});

describe('GET /tasks/stats', () => {
  test('should return counts by status', async () => {
    taskService.create({ title: 'T1', status: 'todo' });
    taskService.create({ title: 'T2', status: 'in_progress' });
    taskService.create({ title: 'T3', status: 'done' });

    const res = await request(app).get('/tasks/stats');

    expect(res.status).toBe(200);
    expect(res.body.todo).toBe(1);
    expect(res.body.in_progress).toBe(1);
    expect(res.body.done).toBe(1);
  });

  test('should count overdue tasks', async () => {
    taskService.create({
      title: 'Overdue',
      status: 'todo',
      dueDate: '2020-01-01T00:00:00.000Z',
    });
    taskService.create({
      title: 'Done but past due',
      status: 'done',
      dueDate: '2020-01-01T00:00:00.000Z',
    });

    const res = await request(app).get('/tasks/stats');

    expect(res.body.overdue).toBe(1);
  });

  test('should return all zeros when no tasks', async () => {
    const res = await request(app).get('/tasks/stats');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });
});

describe('PATCH /tasks/:id/assign', () => {
  test('should assign a task and return the updated task', async () => {
    const task = taskService.create({ title: 'Assign me' });

    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Rohan' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Rohan');
    expect(res.body.id).toBe(task.id);
    expect(res.body.title).toBe('Assign me');
  });

  test('should return 404 for non-existent task', async () => {
    const res = await request(app)
      .patch('/tasks/fake-id/assign')
      .send({ assignee: 'Rohan' });

    expect(res.status).toBe(404);
  });

  test('should return 400 when assignee is missing', async () => {
    const task = taskService.create({ title: 'Assign me' });

    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('should return 400 when assignee is empty string', async () => {
    const task = taskService.create({ title: 'Assign me' });

    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: '' });

    expect(res.status).toBe(400);
  });

  test('should return 400 when assignee is only whitespace', async () => {
    const task = taskService.create({ title: 'Assign me' });

    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: '   ' });

    expect(res.status).toBe(400);
  });

  test('should return 400 when assignee is not a string', async () => {
    const task = taskService.create({ title: 'Assign me' });

    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 123 });

    expect(res.status).toBe(400);
  });

  test('should allow reassigning a task', async () => {
    const task = taskService.create({ title: 'Assign me' });

    await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Rohan' });

    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Taroo' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Taroo');
  });

  test('should trim whitespace from assignee name', async () => {
    const task = taskService.create({ title: 'Assign me' });

    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: '  Rohan  ' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Rohan');
  });
});

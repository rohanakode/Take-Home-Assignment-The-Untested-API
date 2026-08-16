const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

describe('create', () => {
  test('should create a task with defaults', () => {
    const task = taskService.create({ title: 'Test task' });

    expect(task.id).toBeDefined();
    expect(task.title).toBe('Test task');
    expect(task.description).toBe('');
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
    expect(task.dueDate).toBeNull();
    expect(task.completedAt).toBeNull();
    expect(task.createdAt).toBeDefined();
  });

  test('should create a task with all fields provided', () => {
    const task = taskService.create({
      title: 'Full task',
      description: 'A description',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2026-12-31T00:00:00.000Z',
    });

    expect(task.title).toBe('Full task');
    expect(task.description).toBe('A description');
    expect(task.status).toBe('in_progress');
    expect(task.priority).toBe('high');
    expect(task.dueDate).toBe('2026-12-31T00:00:00.000Z');
  });

  test('should generate unique IDs for each task', () => {
    const task1 = taskService.create({ title: 'Task 1' });
    const task2 = taskService.create({ title: 'Task 2' });

    expect(task1.id).not.toBe(task2.id);
  });
});

describe('getAll', () => {
  test('should return all tasks', () => {
    taskService.create({ title: 'Task 1' });
    taskService.create({ title: 'Task 2' });

    const tasks = taskService.getAll();
    expect(tasks).toHaveLength(2);
  });

  test('should return empty array when no tasks', () => {
    const tasks = taskService.getAll();
    expect(tasks).toHaveLength(0);
    expect(tasks).toEqual([]);
  });

  test('should return a copy, not a reference to internal array', () => {
    taskService.create({ title: 'Task 1' });
    const tasks = taskService.getAll();
    tasks.pop();

    expect(taskService.getAll()).toHaveLength(1);
  });
});

describe('findById', () => {
  test('should find a task by its id', () => {
    const created = taskService.create({ title: 'Find me' });
    const found = taskService.findById(created.id);

    expect(found).toBeDefined();
    expect(found.title).toBe('Find me');
  });

  test('should return undefined for non-existent id', () => {
    const found = taskService.findById('non-existent-id');
    expect(found).toBeUndefined();
  });
});

describe('getByStatus', () => {
  test('should return tasks matching the given status', () => {
    taskService.create({ title: 'Todo task', status: 'todo' });
    taskService.create({ title: 'Done task', status: 'done' });
    taskService.create({ title: 'Another todo', status: 'todo' });

    const todoTasks = taskService.getByStatus('todo');
    expect(todoTasks).toHaveLength(2);
    todoTasks.forEach((t) => expect(t.status).toBe('todo'));
  });

  test('should return empty array when no tasks match', () => {
    taskService.create({ title: 'Todo task', status: 'todo' });
    const result = taskService.getByStatus('in_progress');
    expect(result).toHaveLength(0);
  });

  // BUG: getByStatus uses .includes() instead of === so "do" matches both "todo" and "done"
  test('should NOT match partial status strings', () => {
    taskService.create({ title: 'Todo task', status: 'todo' });
    taskService.create({ title: 'Done task', status: 'done' });

    const result = taskService.getByStatus('do');
    expect(result).toHaveLength(0);
  });
});

describe('getPaginated', () => {
  beforeEach(() => {
    for (let i = 1; i <= 5; i++) {
      taskService.create({ title: `Task ${i}` });
    }
  });

  test('page 1 should return the first items', () => {
    const result = taskService.getPaginated(1, 2);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Task 1');
    expect(result[1].title).toBe('Task 2');
  });

  test('page 2 should return the next batch of items', () => {
    const result = taskService.getPaginated(2, 2);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Task 3');
    expect(result[1].title).toBe('Task 4');
  });

  test('should return empty array for page beyond data', () => {
    const result = taskService.getPaginated(10, 2);
    expect(result).toHaveLength(0);
  });
});

describe('getStats', () => {
  test('should return correct counts by status', () => {
    taskService.create({ title: 'T1', status: 'todo' });
    taskService.create({ title: 'T2', status: 'todo' });
    taskService.create({ title: 'T3', status: 'in_progress' });
    taskService.create({ title: 'T4', status: 'done' });

    const stats = taskService.getStats();
    expect(stats.todo).toBe(2);
    expect(stats.in_progress).toBe(1);
    expect(stats.done).toBe(1);
  });

  test('should count overdue tasks correctly', () => {
    taskService.create({
      title: 'Overdue',
      status: 'todo',
      dueDate: '2020-01-01T00:00:00.000Z',
    });
    taskService.create({
      title: 'Not overdue',
      status: 'done',
      dueDate: '2020-01-01T00:00:00.000Z',
    });
    taskService.create({
      title: 'Future',
      status: 'todo',
      dueDate: '2099-12-31T00:00:00.000Z',
    });

    const stats = taskService.getStats();
    expect(stats.overdue).toBe(1);
  });

  test('should return all zeros when no tasks exist', () => {
    const stats = taskService.getStats();
    expect(stats).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });
});

describe('update', () => {
  test('should update task fields', () => {
    const task = taskService.create({ title: 'Original' });
    const updated = taskService.update(task.id, { title: 'Updated' });

    expect(updated.title).toBe('Updated');
    expect(updated.id).toBe(task.id);
  });

  test('should return null for non-existent id', () => {
    const result = taskService.update('fake-id', { title: 'Nope' });
    expect(result).toBeNull();
  });

  // BUG: update spreads raw fields with no whitelist, allowing overwrite of id and createdAt
  test('should not allow overwriting id or createdAt', () => {
    const task = taskService.create({ title: 'Original' });
    const originalId = task.id;
    const originalCreatedAt = task.createdAt;

    const updated = taskService.update(task.id, {
      id: 'hacked-id',
      createdAt: '1999-01-01T00:00:00.000Z',
    });

    expect(updated.id).toBe(originalId);
    expect(updated.createdAt).toBe(originalCreatedAt);
  });
});

describe('remove', () => {
  test('should remove a task and return true', () => {
    const task = taskService.create({ title: 'Delete me' });
    const result = taskService.remove(task.id);

    expect(result).toBe(true);
    expect(taskService.getAll()).toHaveLength(0);
  });

  test('should return false for non-existent id', () => {
    const result = taskService.remove('fake-id');
    expect(result).toBe(false);
  });

  test('should not find task after removal', () => {
    const task = taskService.create({ title: 'Gone' });
    taskService.remove(task.id);

    expect(taskService.findById(task.id)).toBeUndefined();
  });
});

describe('completeTask', () => {
  test('should set status to done and add completedAt', () => {
    const task = taskService.create({ title: 'Finish me' });
    const completed = taskService.completeTask(task.id);

    expect(completed.status).toBe('done');
    expect(completed.completedAt).toBeDefined();
  });

  test('should return null for non-existent id', () => {
    const result = taskService.completeTask('fake-id');
    expect(result).toBeNull();
  });

  // BUG: completeTask resets priority to 'medium' instead of preserving it
  test('should preserve the original priority', () => {
    const task = taskService.create({ title: 'Important', priority: 'high' });
    const completed = taskService.completeTask(task.id);

    expect(completed.priority).toBe('high');
  });
});

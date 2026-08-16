const { validateCreateTask, validateUpdateTask } = require('../src/utils/validators');

describe('validateCreateTask', () => {
  test('should return null for valid input', () => {
    const error = validateCreateTask({
      title: 'Valid task',
      status: 'todo',
      priority: 'high',
    });
    expect(error).toBeNull();
  });

  test('should return error when title is missing', () => {
    const error = validateCreateTask({});
    expect(error).toBeDefined();
    expect(error).toContain('title');
  });

  test('should return error when title is empty string', () => {
    const error = validateCreateTask({ title: '   ' });
    expect(error).toBeDefined();
  });

  test('should return error when title is not a string', () => {
    const error = validateCreateTask({ title: 123 });
    expect(error).toBeDefined();
  });

  test('should return error for invalid status', () => {
    const error = validateCreateTask({ title: 'Task', status: 'invalid' });
    expect(error).toBeDefined();
  });

  test('should return error for invalid priority', () => {
    const error = validateCreateTask({ title: 'Task', priority: 'urgent' });
    expect(error).toBeDefined();
  });

  test('should return error for invalid dueDate', () => {
    const error = validateCreateTask({ title: 'Task', dueDate: 'not-a-date' });
    expect(error).toBeDefined();
  });

  test('should accept valid ISO dueDate', () => {
    const error = validateCreateTask({
      title: 'Task',
      dueDate: '2026-12-31T00:00:00.000Z',
    });
    expect(error).toBeNull();
  });
});

describe('validateUpdateTask', () => {
  test('should return null for valid update body', () => {
    const error = validateUpdateTask({ title: 'Updated' });
    expect(error).toBeNull();
  });

  test('should return null for empty body', () => {
    const error = validateUpdateTask({});
    expect(error).toBeNull();
  });

  test('should return error for empty title', () => {
    const error = validateUpdateTask({ title: '' });
    expect(error).toBeDefined();
  });

  test('should return error for invalid status', () => {
    const error = validateUpdateTask({ status: 'nope' });
    expect(error).toBeDefined();
  });

  test('should return error for invalid priority', () => {
    const error = validateUpdateTask({ priority: 'extreme' });
    expect(error).toBeDefined();
  });

  test('should return error for invalid dueDate', () => {
    const error = validateUpdateTask({ dueDate: 'bad-date' });
    expect(error).toBeDefined();
  });
});

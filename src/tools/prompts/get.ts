export const GET_DESCRIPTION = "Get a task by ID from the task list";

export const GET_PROMPT = `Use this tool to retrieve a task by its ID from the task list.

## When to Use This Tool

- When you need the full description and context before starting work on a task
- After being assigned a task, to get complete requirements

## Output

Returns full task details:
- **subject**: Task title
- **description**: Detailed requirements and context
- **status**: 'pending', 'in_progress', or 'completed'

## Tips

- Use TaskList to see all tasks in summary form.
`;

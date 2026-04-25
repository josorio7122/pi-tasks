export const LIST_DESCRIPTION = "List all tasks in the task list";

export const LIST_PROMPT = `Use this tool to list all tasks in the task list.

## When to Use This Tool

- To see what tasks are available to work on (status: 'pending')
- To check overall progress on the project
- After completing a task, to check for newly created follow-up work

## Output

Returns a summary of each task:
- **id**: Task identifier (use with TaskGet, TaskUpdate)
- **subject**: Brief description of the task
- **status**: 'pending', 'in_progress', or 'completed'

Use TaskGet with a specific task ID to view full details including description.
`;

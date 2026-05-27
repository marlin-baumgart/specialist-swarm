# Feature Requirements — Project Management MCP Server

## Target API
Project Management API (`project-management-api.yaml`)

## MCP Tools

### `create_project`
- **Purpose:** Create a new project
- **Parameters:** `name` (string, required), `description` (string, optional), `team_members` (array of user IDs, optional)
- **Behaviour:** Call `POST /projects`. Return the created project with its ID.

### `create_sprint`
- **Purpose:** Create a sprint within a project
- **Parameters:** `project_id` (string, required), `name` (string, required), `goal` (string, optional), `start_date` (date, required), `end_date` (date, required)
- **Behaviour:** Call `POST /projects/{projectId}/sprints`. Return the created sprint.

### `create_task`
- **Purpose:** Create a task in a project
- **Parameters:** `project_id` (string, required), `title` (string, required), `description` (string, optional), `sprint_id` (string, optional), `assignee` (string, optional), `priority` (enum, optional), `story_points` (number, optional), `labels` (array, optional)
- **Behaviour:** Call `POST /projects/{projectId}/tasks`. Return the created task.

### `assign_task`
- **Purpose:** Assign a task to a team member
- **Parameters:** `project_id` (string, required), `task_id` (string, required), `assignee` (string, required)
- **Behaviour:** Call `POST /projects/{projectId}/tasks/{taskId}/assign`. Return updated task.

### `transition_task`
- **Purpose:** Move a task to a new status
- **Parameters:** `project_id` (string, required), `task_id` (string, required), `to_status` (enum: backlog/todo/in_progress/in_review/done/blocked, required), `comment` (string, optional)
- **Behaviour:** Call `POST /projects/{projectId}/tasks/{taskId}/transition`. Return updated task.
- **Error handling:** If transition is invalid, return the allowed transitions for the current status.

### `create_sprint_with_tasks` (composed)
- **Purpose:** Create a sprint and populate it with tasks in one operation
- **Parameters:** `project_id` (string, required), `sprint_name` (string, required), `sprint_goal` (string, optional), `start_date` (date, required), `end_date` (date, required), `tasks` (array of task objects, required)
- **Behaviour:**
  1. Call `POST /projects/{projectId}/sprints` to create the sprint
  2. For each task in the array, call `POST /projects/{projectId}/tasks` with `sprint_id` set to the new sprint
  3. If any task creation fails, report partial success with details
- **Return:** The created sprint plus all created tasks

### `get_sprint_burndown` (composed)
- **Purpose:** Calculate sprint burndown data
- **Parameters:** `project_id` (string, required), `sprint_id` (string, required)
- **Behaviour:**
  1. Call `GET /projects/{projectId}/sprints/{sprintId}` for sprint details
  2. Call `GET /projects/{projectId}/tasks?sprint_id={sprintId}` (paginate to get all)
  3. Calculate: total points, completed points, remaining points, days elapsed, days remaining, projected completion rate
- **Return:** Structured burndown summary

### `add_comment`
- **Purpose:** Add a comment to a task
- **Parameters:** `project_id` (string, required), `task_id` (string, required), `body` (string, required)
- **Behaviour:** Call `POST /projects/{projectId}/tasks/{taskId}/comments`. Return the created comment.

## MCP Resources

### `project://{projectId}/status`
- **Purpose:** Read-only project status overview
- **Behaviour:** Calls `GET /projects/{projectId}` and returns project info with task counts
- **Use case:** Quick project health check without explicit tool call

### `sprint://{sprintId}/burndown`
- **Purpose:** Read-only sprint burndown data
- **Behaviour:** Same composed logic as `get_sprint_burndown` tool
- **Use case:** LLM can reference burndown data in context

### `task://{taskId}/details`
- **Purpose:** Read-only task details
- **Parameters:** Requires `project_id` as part of the resource URI: `task://{projectId}/{taskId}/details`
- **Behaviour:** Calls `GET /projects/{projectId}/tasks/{taskId}` with comments

## MCP Prompts

### `sprint_planning`
- **Description:** Help plan a sprint by breaking down a user story into tasks
- **Arguments:** `user_story` (required), `project_id` (required), `team_capacity_points` (optional)
- **Template:** "Break down the following user story into implementable tasks with story point estimates. Consider the team's capacity of {capacity} points. User story: {user_story}"

### `standup_summary`
- **Description:** Generate a standup summary for a sprint
- **Arguments:** `project_id` (required), `sprint_id` (required)
- **Template:** "Summarise the current sprint status for a standup meeting. Include: what was completed recently, what's in progress, what's blocked, and overall sprint health."

## Non-Functional Requirements

- **Auth:** OAuth2 bearer token from `TASKFLOW_ACCESS_TOKEN` environment variable
- **Pagination:** All list operations must handle cursor-based pagination automatically (fetch all pages)
- **Error handling:** Map API errors to user-friendly messages. For invalid transitions, include allowed transitions.
- **Logging:** Log all API calls at debug level with request/response timing
- **Mock mode:** When `MOCK_MODE=true`, use fixture data. Mock should include realistic project state with tasks in various statuses.

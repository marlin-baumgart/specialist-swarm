# Feature Requirements — Weather & Notifications MCP Server

## Target API
Weather & Notifications API (`weather-notifications-api.yaml`)

## MCP Tools

### `get_current_weather`
- **Purpose:** Retrieve current weather conditions for a city or coordinates
- **Parameters:** `city` (string, optional), `lat` (number, optional), `lon` (number, optional), `units` (enum: metric/imperial, default: metric)
- **Behaviour:** Call `GET /weather/current` with provided parameters. Return the full weather data as structured content.
- **Error handling:** If city not found, return a clear error message suggesting corrections.

### `get_forecast`
- **Purpose:** Get a multi-day weather forecast
- **Parameters:** `city` (string, required), `days` (number 1-14, default: 5), `units` (enum: metric/imperial, default: metric)
- **Behaviour:** Call `GET /weather/forecast`. Return the forecast as a formatted summary.

### `subscribe_alert`
- **Purpose:** Create a weather alert subscription
- **Parameters:** `city` (string, required), `conditions` (array of condition objects, required), `callback_url` (string, required), `name` (string, optional)
- **Behaviour:** Call `POST /alerts/subscribe`. Return the created subscription details including its ID.
- **Validation:** Ensure at least one condition is provided.

### `unsubscribe_alert`
- **Purpose:** Remove a weather alert subscription
- **Parameters:** `alert_id` (string, required)
- **Behaviour:** Call `DELETE /alerts/{alertId}`. Confirm deletion.

### `list_alerts`
- **Purpose:** List all active alert subscriptions
- **Parameters:** None
- **Behaviour:** Call `GET /alerts`. Return all subscriptions with their status.

## MCP Resources

### `weather://current/{city}`
- **Purpose:** Read-only access to current weather for a city
- **Behaviour:** Calls `GET /weather/current?city={city}` and returns formatted weather data
- **Use case:** LLM can reference current weather without an explicit tool call

### `alerts://active`
- **Purpose:** Read-only list of all active alert subscriptions
- **Behaviour:** Calls `GET /alerts` filtered to active status
- **Use case:** LLM can check existing alerts before creating duplicates

## MCP Prompts

### `weather_briefing`
- **Description:** Generate a weather briefing for a location
- **Arguments:** `city` (required), `include_forecast` (boolean, default: true)
- **Template:** "Provide a comprehensive weather briefing for {city}. Include current conditions{forecast_clause}. Highlight any notable weather events or advisories."

## Non-Functional Requirements

- **Auth:** API key passed via `X-API-Key` header, read from `WEATHER_API_KEY` environment variable
- **Error handling:** Map API error codes to user-friendly messages
- **Logging:** Log all API calls at debug level
- **Mock mode:** When `MOCK_MODE=true`, use fixture data instead of real API calls

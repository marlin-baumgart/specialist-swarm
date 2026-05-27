/**
 * @file tests/setup.ts
 * Vitest global setup: configure environment variables before any module
 * is imported. This ensures config.ts sees MOCK_MODE=true and doesn't
 * demand a real WEATHER_API_KEY.
 */
process.env["MOCK_MODE"] = "true";
process.env["WEATHER_API_KEY"] = "test-key-for-unit-tests";
process.env["LOG_LEVEL"] = "silent"; // suppress pino output during tests

import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import { isIP } from 'node:net';

type JsonObject = Record<string, unknown>;

const ROOT_FIELDS = [
  'agent_id',
  'base_board_sn',
  'computer_name',
  'system_product_uuid',
  'os_name',
  'os_major',
  'os_minor',
  'os_build',
  'last_boot_time',
  'last_update_time',
  'adapter_info',
  'session_info',
  'roles',
] as const;
const ROOT_FIELD_SET = new Set<string>(ROOT_FIELDS);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLE_VALUES = new Set(['workstation', 'server', 'domain_controller']);
const SESSION_STATES = new Set(['Active', 'Disconnected']);

// Checks whether a value is a JSON object
function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Checks that a string contains at least one non-whitespace character.
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

// Checks that a timestamp is a real UTC date and time ending in Z.
function isValidUtcTimestamp(value: unknown): boolean {
  // Reject values that are not strings.
  if (typeof value !== 'string') {
    return false;
  }

  // Require the timestamp to match the expected UTC format.
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z$/.exec(value);
  if (!match) {
    return false;
  }

  // Extract the date and time components.
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);

  // Calculate the number of days in each month, including leap years.
  const daysInMonth = [
    31,
    year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28,
    31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
  ];

  // Confirm that every date and time component is within its valid range.
  return month >= 1
    && month <= 12
    && day >= 1
    && day <= daysInMonth[month - 1]
    && hour <= 23
    && minute <= 59
    && second <= 59;
}

// Checks IPv4/IPv6 addresses and permits a valid zone on IPv6 only.
function isValidIpAddress(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  const zoneSeparator = value.indexOf('%');
  if (zoneSeparator === -1) {
    return isIP(value) !== 0;
  }

  const address = value.slice(0, zoneSeparator);
  const zone = value.slice(zoneSeparator + 1);
  return zone.length > 0
    && /^[A-Za-z0-9_.-]+$/.test(zone)
    && isIP(address) === 6;
}

// Validates every required field and returns descriptions for invalid values.
function validatePayload(payload: unknown): string[] {
  const errors: string[] = [];
  if (!isJsonObject(payload)) {
    return ['body must be a JSON object'];
  }

  for (const field of ROOT_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(payload, field)) {
      errors.push(`${field} is required`);
    }
  }
  for (const field of Object.keys(payload)) {
    if (!ROOT_FIELD_SET.has(field)) {
      errors.push(`${field} is not allowed`);
    }
  }

  for (const field of ['agent_id', 'system_product_uuid'] as const) {
    if (Object.prototype.hasOwnProperty.call(payload, field)
      && (typeof payload[field] !== 'string' || !UUID_PATTERN.test(payload[field]))) {
      errors.push(`${field} must be a UUID`);
    }
  }
  for (const field of ['computer_name', 'os_name'] as const) {
    if (Object.prototype.hasOwnProperty.call(payload, field) && !isNonEmptyString(payload[field])) {
      errors.push(`${field} must be a non-empty string`);
    }
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'base_board_sn')
    && typeof payload.base_board_sn !== 'string') {
    errors.push('base_board_sn must be a string');
  }
  for (const field of ['os_major', 'os_minor', 'os_build'] as const) {
    const value = payload[field];
    if (Object.prototype.hasOwnProperty.call(payload, field)
      && (typeof value !== 'number' || !Number.isInteger(value) || value < 0)) {
      errors.push(`${field} must be an integer greater than or equal to 0`);
    }
  }
  for (const field of ['last_boot_time', 'last_update_time'] as const) {
    if (Object.prototype.hasOwnProperty.call(payload, field) && !isValidUtcTimestamp(payload[field])) {
      errors.push(`${field} must be a valid ISO 8601 UTC timestamp ending in Z`);
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'adapter_info')) {
    const adapters = payload.adapter_info;
    if (!Array.isArray(adapters) || adapters.length === 0) {
      errors.push('adapter_info must be a non-empty array');
    } else {
      adapters.forEach((adapter: unknown, index: number) => {
        const path = `adapter_info[${index}]`;
        if (!isJsonObject(adapter)) {
          errors.push(`${path} must be an object`);
          return;
        }
        if (!Object.prototype.hasOwnProperty.call(adapter, 'name')) {
          errors.push(`${path}.name is required`);
        } else if (!isNonEmptyString(adapter.name)) {
          errors.push(`${path}.name must be a non-empty string`);
        }
        if (!Object.prototype.hasOwnProperty.call(adapter, 'addresses')) {
          errors.push(`${path}.addresses is required`);
        } else if (!Array.isArray(adapter.addresses)) {
          errors.push(`${path}.addresses must be an array`);
        } else {
          adapter.addresses.forEach((address: unknown, addressIndex: number) => {
            if (!isValidIpAddress(address)) {
              errors.push(`${path}.addresses[${addressIndex}] must be a valid IPv4 or IPv6 address`);
            }
          });
        }
      });
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'session_info')) {
    const sessions = payload.session_info;
    if (!Array.isArray(sessions)) {
      errors.push('session_info must be an array');
    } else {
      sessions.forEach((session: unknown, index: number) => {
        const path = `session_info[${index}]`;
        if (!isJsonObject(session)) {
          errors.push(`${path} must be an object`);
          return;
        }
        for (const field of ['account_name', 'account_sid', 'host_name'] as const) {
          if (!Object.prototype.hasOwnProperty.call(session, field)) {
            errors.push(`${path}.${field} is required`);
          } else if (typeof session[field] !== 'string') {
            errors.push(`${path}.${field} must be a string`);
          }
        }
        if (!Object.prototype.hasOwnProperty.call(session, 'session_id')) {
          errors.push(`${path}.session_id is required`);
        } else {
          const sessionId = session.session_id;
          if (typeof sessionId !== 'number' || !Number.isInteger(sessionId) || sessionId < 0) {
            errors.push(`${path}.session_id must be an integer greater than or equal to 0`);
          }
        }
        if (!Object.prototype.hasOwnProperty.call(session, 'session_name')) {
          errors.push(`${path}.session_name is required`);
        } else if (!isNonEmptyString(session.session_name)) {
          errors.push(`${path}.session_name must be a non-empty string`);
        }
        if (!Object.prototype.hasOwnProperty.call(session, 'state')) {
          errors.push(`${path}.state is required`);
        } else if (typeof session.state !== 'string' || !SESSION_STATES.has(session.state)) {
          errors.push(`${path}.state must be Active or Disconnected`);
        }
      });
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'roles')) {
    const roles = payload.roles;
    if (!Array.isArray(roles) || roles.length === 0) {
      errors.push('roles must be a non-empty array');
    } else {
      roles.forEach((role: unknown, index: number) => {
        if (typeof role !== 'string' || !ROLE_VALUES.has(role)) {
          errors.push(`roles[${index}] must be workstation, server, or domain_controller`);
        }
      });
    }
  }

  return errors;
}

// Creates the Express application that handles and validates healthchecks.
export function createHealthcheckApp() {
  const app = express();
  app.use(express.json({ limit: '1mb', strict: false }));

  // Returns success for valid payloads and validation errors for invalid ones.
  const handleHealthcheck: RequestHandler = (request, response) => {
    const errors = validatePayload(request.body);
    if (errors.length > 0) {
      return response.status(400).json({ status: 'error', errors });
    }
    return response.status(200).json({ status: 'ok' });
  };
  app.post('/healthcheck', handleHealthcheck);

  // Converts malformed JSON parser errors into the API's standard error shape.
  const handleJsonParsingError: ErrorRequestHandler = (error, request, response, next) => {
    if (error instanceof SyntaxError && 'body' in error) {
      return response.status(400).json({
        status: 'error',
        errors: ['request body must contain valid JSON'],
      });
    }
    return next(error);
  };
  app.use(handleJsonParsingError);
  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  createHealthcheckApp().listen(port, '127.0.0.1', () => {
    console.log(`Healthcheck mock server listening on http://127.0.0.1:${port}/healthcheck`);
  });
}

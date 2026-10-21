import { test, expect, type APIRequestContext } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { createHealthcheckApp } from '../../mock-server/healthcheck-server';

const VALID_PAYLOAD = {
  agent_id: 'BF5B45B4-FF6C-8090-E4B6-DBAED562574D',
  base_board_sn: 'None',
  computer_name: 'VM11',
  system_product_uuid: '4A114D56-62E0-8B0B-594A-6618D15F8385',
  os_name: 'Windows 11 Pro',
  os_major: 10,
  os_minor: 0,
  os_build: 22000,
  last_boot_time: '2022-07-16T20:53:27Z',
  last_update_time: '2022-09-13T09:43:46Z',
  adapter_info: [
    {
      addresses: ['fe80::8c04:b189:43dc:c8de%7', '192.168.195.150'],
      name: 'Ethernet (Kernel Debugger)',
    },
    {
      addresses: ['::1', '127.0.0.1'],
      name: 'Loopback Pseudo-Interface 1',
    },
  ],
  session_info: [
    {
      account_name: '',
      account_sid: '',
      host_name: '',
      session_id: 0,
      session_name: 'Services',
      state: 'Disconnected',
    },
    {
      account_name: 'VM11\\User',
      account_sid: 'S-1-5-21-2847140545-887463911-2297178777-1001',
      host_name: '',
      session_id: 1,
      session_name: 'Console',
      state: 'Active',
    },
  ],
  roles: ['workstation'],
};

let server: Server;
let baseUrl: string;

// Starts the mock healthcheck server before all the tests run.
test.beforeAll(async () => {
  server = createServer(createHealthcheckApp());
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address === null || typeof address === 'string') {
        reject(new Error('Could not determine the mock server address'));
        return;
      }
      baseUrl = `http://127.0.0.1:${address.port}/healthcheck`;
      resolve();
    });
  });
});

// Closes the mock server after all the tests finish.
test.afterAll(async () => {
  if (server?.listening) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});

// Sends a JSON payload to the healthcheck endpoint.
async function postPayload(request: APIRequestContext, payload: unknown) {
  return request.post(baseUrl, {
    data: JSON.stringify(payload),
    headers: { 'content-type': 'application/json' },
  });
}

// Verifies a payload is rejected with the expected validation error.
async function expectInvalidPayload(request: APIRequestContext, payload: unknown, expectedError: string) {
  const response = await postPayload(request, payload);
  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.status).toBe('error');
  expect(body.errors).toEqual(expect.arrayContaining([expect.stringContaining(expectedError)]));
}


/*
 * Tests cover:
 * - The reference payload and valid boundary values.
 * - Identity, OS, root, network, and session fields.
 * - Representative failures for each validation rule.
 *
 * Not covered:
 * - Load limits, authentication, transport security, or persistence.
 * - Every possible malformed-value combination.
 */
test.describe('Agent healthcheck payload validation', () => {
  
  // Confirms the supplied reference payload is accepted unchanged.
  test('accepts the reference payload', async ({ request }) => {
    // Send the complete reference healthcheck to the mock server.
    const response = await postPayload(request, VALID_PAYLOAD);

    // A valid healthcheck must return HTTP 200 and the success response.
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  // Confirms supported boundary values and allowed variations are accepted.
  test('accepts UUID case variations, zero values, empty optional strings and scoped IPv6', async ({ request }) => {
    // Change valid fields to exercise their allowed boundary values.
    const payload = {
      ...VALID_PAYLOAD,
      agent_id: VALID_PAYLOAD.agent_id.toLowerCase(),
      base_board_sn: '',
      os_major: 0,
      os_minor: 0,
      os_build: 0,
      last_boot_time: '2024-02-29T23:59:59.123Z',
      adapter_info: [{ name: 'Scoped interface', addresses: ['fe80::1%Ethernet_7'] }],
      session_info: [],
      roles: ['server', 'domain_controller', 'workstation'],
    };
    // Send the varied but still valid payload.
    const response = await postPayload(request, payload);

    // The server should accept all allowed variations.
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  // Confirms arrays, strings, and null are rejected as the root payload.
  test('rejects a non-object JSON root', async ({ request }) => {
    // Each primitive or array root should produce a clear validation error.
    await expectInvalidPayload(request, null, 'body must be a JSON object');
    await expectInvalidPayload(request, [], 'body must be a JSON object');
    await expectInvalidPayload(request, 'healthcheck', 'body must be a JSON object');
  });

  // Confirms required root fields cannot be omitted and extra fields are blocked.
  test('rejects missing root fields and unknown root fields', async ({ request }) => {
    // Remove a required field and verify the server reports it.
    const missingFieldPayload = { ...VALID_PAYLOAD } as Record<string, unknown>;
    delete missingFieldPayload.os_build;
    await expectInvalidPayload(request, missingFieldPayload, 'os_build is required');

    // Add an unsupported field and verify strict root validation rejects it.
    await expectInvalidPayload(request, { ...VALID_PAYLOAD, unexpected: true }, 'unexpected is not allowed');
  });

  // Confirms UUID, non-empty name, and base-board serial types are checked.
  test('rejects malformed UUIDs and invalid computer/OS names', async ({ request }) => {
    // Both identifiers must use the UUID format.
    for (const field of ['agent_id', 'system_product_uuid'] as const) {
      await expectInvalidPayload(request, { ...VALID_PAYLOAD, [field]: 'not-a-uuid' }, `${field} must be a UUID`);
    }
    // Computer and OS names must not be blank.
    for (const field of ['computer_name', 'os_name'] as const) {
      await expectInvalidPayload(request, { ...VALID_PAYLOAD, [field]: '   ' }, `${field} must be a non-empty string`);
    }
    // The board serial may be empty text but must still be a string.
    await expectInvalidPayload(request, { ...VALID_PAYLOAD, base_board_sn: null }, 'base_board_sn must be a string');
  });

  // Confirms OS version values must be non-negative whole numbers.
  test('rejects negative, fractional and non-numeric OS version fields', async ({ request }) => {
    // Try invalid value types and ranges for each OS version field.
    for (const field of ['os_major', 'os_minor', 'os_build'] as const) {
      for (const value of [-1, 1.5, '10']) {
        await expectInvalidPayload(
          request,
          { ...VALID_PAYLOAD, [field]: value },
          `${field} must be an integer greater than or equal to 0`,
        );
      }
    }
  });

  // Confirms timestamps need UTC notation and a real calendar date and time.
  test('requires valid UTC ISO timestamps with real calendar dates', async ({ request }) => {
    // Check a missing Z suffix, an impossible date, and an invalid hour.
    for (const value of ['2022-09-13T09:43:46', '2022-02-29T09:43:46Z', '2022-09-13T25:43:46Z']) {
      await expectInvalidPayload(
        request,
        { ...VALID_PAYLOAD, last_update_time: value },
        'last_update_time must be a valid ISO 8601 UTC timestamp ending in Z',
      );
    }
  });

  // Confirms adapter arrays, names, and IP addresses follow the required rules.
  test('requires non-empty adapter objects and valid addresses', async ({ request }) => {
    // The adapter list cannot be empty.
    await expectInvalidPayload(request, { ...VALID_PAYLOAD, adapter_info: [] }, 'adapter_info must be a non-empty array');
    // Each adapter needs a non-blank name.
    await expectInvalidPayload(
      request,
      { ...VALID_PAYLOAD, adapter_info: [{ addresses: [], name: '   ' }] },
      'adapter_info[0].name must be a non-empty string',
    );
    // Reject an invalid IPv4 address and an IPv6 address with an empty zone.
    await expectInvalidPayload(
      request,
      { ...VALID_PAYLOAD, adapter_info: [{ addresses: ['192.168.1.999', 'fe80::1%'], name: 'Ethernet' }] },
      'adapter_info[0].addresses[0] must be a valid IPv4 or IPv6 address',
    );
    // Each adapter must include its addresses array.
    await expectInvalidPayload(
      request,
      { ...VALID_PAYLOAD, adapter_info: [{ name: 'Ethernet' }] },
      'adapter_info[0].addresses is required',
    );
  });

  // Confirms session objects validate their fields, IDs, names, and states.
  test('validates session fields, IDs, names and state values', async ({ request }) => {
    // Reject a session entry that is not an object.
    await expectInvalidPayload(
      request,
      { ...VALID_PAYLOAD, session_info: [null] },
      'session_info[0] must be an object',
    );
    // Reject a non-string account name before checking the other fields.
    await expectInvalidPayload(
      request,
      {
        ...VALID_PAYLOAD,
        session_info: [{
          account_name: 1,
          account_sid: '',
          host_name: '',
          session_id: -1,
          session_name: '',
          state: 'LoggedOut',
        }],
      },
      'session_info[0].account_name must be a string',
    );
    // Build a session with an invalid ID, blank name, and unsupported state.
    const invalidSession = {
      account_name: '',
      account_sid: '',
      host_name: '',
      session_id: -1,
      session_name: '',
      state: 'LoggedOut',
    };
    // Check that all three invalid fields are reported together.
    const response = await postPayload(request, { ...VALID_PAYLOAD, session_info: [invalidSession] });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('session_info[0].session_id must be an integer greater than or equal to 0'),
      expect.stringContaining('session_info[0].session_name must be a non-empty string'),
      expect.stringContaining('session_info[0].state must be Active or Disconnected'),
    ]));
  });

  // Confirms roles are required and restricted to the supported values.
  test('requires non-empty roles from the supported role set', async ({ request }) => {
    // An empty role list is not allowed.
    await expectInvalidPayload(request, { ...VALID_PAYLOAD, roles: [] }, 'roles must be a non-empty array');
    // Reject a role outside the supported allow-list.
    await expectInvalidPayload(
      request,
      { ...VALID_PAYLOAD, roles: ['administrator'] },
      'roles[0] must be workstation, server, or domain_controller',
    );
  });

  // Confirms malformed JSON receives a structured HTTP 400 error response.
  test('returns a JSON validation error for malformed JSON', async ({ request }) => {
    // Send broken JSON as raw bytes so the client does not encode it as valid JSON.
    const response = await request.post(baseUrl, {
      data: Buffer.from('{"agent_id":'),
      headers: { 'content-type': 'application/json' },
    });

    // The parser error should use the same JSON error format as validation errors.
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.status).toBe('error');
    expect(body.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('request body must contain valid JSON'),
    ]));
  });
});

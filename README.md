# IstroSec homework

## Running tests on a clean machine

Install Node.js (including npm), clone the repository, and run these commands
from the repository root:

```sh
npm ci
npx playwright install chromium
npx playwright test
```

`npm ci` installs the dependencies recorded in `package-lock.json`. Playwright
needs Chromium installed separately. The final command runs all tests from the
command line. Tasks 2 and 4 use public demo APIs, so those tests also need an
internet connection.

## Task 1 - Customer management UI

Run the UI test with:

```sh
npx playwright test tests/task-1/task-1.spec.ts
```

The test logs into the Marmelab demo and checks one customer lifecycle:
creating a customer, finding them with the search filter, editing their name,
checking the updated record, deleting it, and confirming it no longer appears.
The test uses the demo account configured in `test-data/users.ts`.

## Task 2 - Posts API

Run the API tests with:

```sh
npx playwright test tests/task-2/task-2.spec.ts
```

The tests cover:
- Listing posts and checking the response fields.
- Filtering posts by `userId` and retrieving an individual post by ID.
- Checking that invalid or missing post IDs return `404`.
- Creating a post, partially updating a post while keeping its other fields,
  and deleting a post.

## Task 3 - Agent healthcheck validation

Run the healthcheck validation tests with:

```sh
npx playwright test tests/task-3/task-3.spec.ts
```

The tests start and stop a local mock server automatically. To run the
TypeScript mock server separately, use `npm run mock-server`; it accepts
`POST /healthcheck` at `http://127.0.0.1:3000`.

### Coverage and rationale

The tests start and stop an isolated local mock server automatically.
To run the TypeScript mock server separately, use `npm run mock-server`; 
it accepts `POST /healthcheck` on `http://127.0.0.1:3000`.

### Validation coverage and rationale

- **Areas I thought were important:**
  - I tried to make sure that all checks that the mock server does are tested
  - Agent and computer identifiers - help identify which machine sent the healthcheck.
  - Operating-system details, adapter addresses, user session details  - the product may use them to understand machine's state.
  - Extra or missing fields - the server should not accept injected unexpected information.

- **Things I left out:**
  - Load and performance testing 
    - in production, real healthcheck server could be recieving big number of requests. 
    - Making sure it can handle the load would be important
    - But this isn't relevant for a local mock server

## Task 4 - Authentication and authorization

Run the UI and API tests with:

```sh
npx playwright test tests/task-4/task-4.spec.ts
```

The UI tests use the SauceDemo site and check that:
- valid login opens the protected page (inventory page)
- invalid and locked accounts are rejected
- unauthenticated visitors are redirected from the inventory
- after logout, access to protected page blocked again

The API tests use the public DummyJSON demo account and check that:
- valid login returns access and refresh tokens
- refresh token can obtain replacement tokens
- valid bearer token can retrieve the authenticated user's data
- missing or malformed token is rejected
- invalid login credentials do not return tokens
- access token with a one-minute lifetime is rejected after expiration


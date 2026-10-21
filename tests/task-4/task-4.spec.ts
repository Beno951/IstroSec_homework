import { test, expect } from '../../fixtures/test-options';
import { SAUCEDEMO_URL } from '../../pages/saucedemo/saucedemo.locators';

const API_BASE_URL = 'https://dummyjson.com';
const API_USERNAME = 'emilys';
const API_PASSWORD = 'emilyspass';

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

/*
 * UI test cases cover the full authentication behaviour:
 *    - valid user reaches protected inventory page
 *    - invalid and locked accounts remain on the login page
 *    - protected pages require an active session
 */
test.describe('SauceDemo UI authentication', () => {
  test('logs in and opens the protected inventory page', async ({ pm, page }) => {
    await pm.SauceDemoLoginPage.goto();
    await pm.SauceDemoLoginPage.login('standard_user', 'secret_sauce');

    await expect(page).toHaveURL(/inventory\.html$/);
    await expect(pm.SauceDemoInventoryPage.productsHeading).toBeVisible();
    await expect(pm.SauceDemoInventoryPage.inventoryItems).not.toHaveCount(0);
  });

  test('shows an error and stays on login with invalid credentials', async ({ pm, page }) => {
    await pm.SauceDemoLoginPage.goto();
    await pm.SauceDemoLoginPage.login('invalid_user', 'wrong_password');

    await expect(pm.SauceDemoLoginPage.errorMessage).toContainText(
      'Username and password do not match any user in this service',
    );
    await expect(page).toHaveURL(SAUCEDEMO_URL);
  });

  test('rejects a locked-out account', async ({ pm, page }) => {
    await pm.SauceDemoLoginPage.goto();
    await pm.SauceDemoLoginPage.login('locked_out_user', 'secret_sauce');

    await expect(pm.SauceDemoLoginPage.errorMessage).toContainText(
      'Sorry, this user has been locked out.',
    );
    await expect(page).toHaveURL(SAUCEDEMO_URL);
  });

  test('redirects unauthenticated users from the protected inventory URL', async ({ pm, page }) => {
    // navigates to page that requires authentication
    await pm.SauceDemoInventoryPage.goto();

    // redirected to login page
    await expect(page).toHaveURL(SAUCEDEMO_URL);
    await expect(page.getByRole('textbox', { name: 'Username' })).toBeVisible();
  });

  test('ends the session on logout and blocks the inventory URL afterward', async ({ pm, page }) => {
    // inventory page available after login
    await pm.SauceDemoLoginPage.goto();
    await pm.SauceDemoLoginPage.login('standard_user', 'secret_sauce');
    await expect(pm.SauceDemoInventoryPage.productsHeading).toBeVisible();

    // redirected from inventory page after logout
    await pm.SauceDemoInventoryPage.logout();
    await expect(page).toHaveURL(SAUCEDEMO_URL);
    await expect(page.getByRole('textbox', { name: 'Username' })).toBeVisible();

    // inventory page blocked without session (navigates to login instead)
    await pm.SauceDemoInventoryPage.goto();
    await expect(page).toHaveURL(SAUCEDEMO_URL);
    await expect(page.getByRole('textbox', { name: 'Username' })).toBeVisible();
  });
});

/*
 * API tests check:
 *    - login returns tokens
 *    - refreshing a valid token returns new tokens
 *    - valid token allow access to user data
 *    - invalid/missing/expired tokens are rejected
 *    - revocation is not tested because the demo offers limited control
 */
test.describe('DummyJSON API authentication and authorization', () => {

  // tests /login
  test('returns a non-empty access token for valid credentials', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/auth/login`, {
      data: { username: API_USERNAME, password: API_PASSWORD },
    });

    expect(response.status()).toBe(200);
    const login = await response.json();
    expect(login.accessToken).toEqual(expect.any(String));
    expect(login.accessToken.length).toBeGreaterThan(0);
  });

  // tests /refresh
  test('uses a returned refresh token to obtain replacement tokens', async ({ request }) => {
    // logs in and gets the refresh token
    const loginResponse = await request.post(`${API_BASE_URL}/auth/login`, {
      data: { username: API_USERNAME, password: API_PASSWORD },
    });
    expect(loginResponse.status()).toBe(200);
    const login = await loginResponse.json();
    expect(login.refreshToken).toEqual(expect.any(String));
    expect(login.refreshToken.length).toBeGreaterThan(0);

    // sends the refresh token to get new tokens
    const refreshResponse = await request.post(`${API_BASE_URL}/auth/refresh`, {
      data: { refreshToken: login.refreshToken },
    });
    expect(refreshResponse.status()).toBe(200);
    const refreshedTokens = (await refreshResponse.json()) as AuthTokens;

    // checks the tokens are non-empty
    expect(refreshedTokens.accessToken).toEqual(expect.any(String));
    expect(refreshedTokens.accessToken.length).toBeGreaterThan(0);
    expect(refreshedTokens.refreshToken).toEqual(expect.any(String));
    expect(refreshedTokens.refreshToken.length).toBeGreaterThan(0);

    // verifies the new access token works for a protected endpoint
    const meResponse = await request.get(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${refreshedTokens.accessToken}` },
    });
    expect(meResponse.status()).toBe(200);
    expect(await meResponse.json()).toEqual(
      expect.objectContaining({ username: API_USERNAME }),
    );
  });

  // tests /auth/me - verifies that the token allows access to the correct user data
  test('returns the authenticated user for a valid bearer token', async ({ request }) => {
    const loginResponse = await request.post(`${API_BASE_URL}/auth/login`, {
      data: { username: API_USERNAME, password: API_PASSWORD },
    });
    expect(loginResponse.status()).toBe(200);
    const login = await loginResponse.json();

    const response = await request.get(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${login.accessToken}` },
    });

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        id: login.id,
        username: API_USERNAME,
        firstName: login.firstName,
        lastName: login.lastName,
      }),
    );
  });

  // tests /auth/me without a token - expects 401
  test('rejects /auth/me when no bearer token is supplied', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/auth/me`);

    expect(response.status()).toBe(401);
  });


  // EXTRA: Additional tests for invalid credentials, malformed tokens, and expired tokens

  // tests /auth/login with invalid credentials - expects 400
  test('rejects invalid credentials without issuing tokens', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/auth/login`, {
      data: { username: API_USERNAME, password: 'incorrect-password' },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();

    // checks that no tokens are returned and an error message is present
    expect(body.accessToken).toBeUndefined();
    expect(body.refreshToken).toBeUndefined();
    expect(body.message).toEqual(expect.any(String));
  });

  // tests /auth/me with a malformed bearer token - expects 401
  test('rejects a malformed bearer token for a protected endpoint', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: 'Bearer invalid-token' },
    });

    expect(response.status()).toBe(401);
  });

  // tests /auth/me with an expired token - expects 401
  test('rejects an access token after its requested one-minute expiry', async ({ request }) => {
    test.setTimeout(90_000);

    const loginResponse = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        username: API_USERNAME,
        password: API_PASSWORD,
        expiresInMins: 1,
      },
    });
    expect(loginResponse.status()).toBe(200);
    const login = (await loginResponse.json()) as AuthTokens;
    expect(login.accessToken.length).toBeGreaterThan(0);

    // DummyJSON requires a positive lifetime; wait past the one-minute expiry.
    await new Promise((resolve) => setTimeout(resolve, 61_000));

    const response = await request.get(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${login.accessToken}` },
    });

    expect(response.status()).toBe(401);
  });

});

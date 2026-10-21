import type { Page } from '@playwright/test';

export const SAUCEDEMO_URL = 'https://www.saucedemo.com/';

export const sauceDemoLoginLocators = (page: Page) => ({
  username: page.getByRole('textbox', { name: 'Username' }),
  password: page.getByRole('textbox', { name: 'Password' }),
  loginButton: page.getByRole('button', { name: 'Login' }),
  errorMessage: page.locator('[data-test="error"]'),
});

export const sauceDemoInventoryLocators = (page: Page) => ({
  productsHeading: page.getByText('Products', { exact: true }),
  inventoryItems: page.locator('.inventory_item'),
  cartLink: page.getByRole('link', { name: /shopping cart/i }),
  menuButton: page.getByRole('button', { name: 'Open Menu' }),
  logoutButton: page.getByRole('button', { name: 'Logout' }),
});

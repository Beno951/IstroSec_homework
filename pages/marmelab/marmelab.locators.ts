import type { Page } from '@playwright/test';

export const MARMELAB_BASE_URL = 'https://marmelab.com/react-admin-demo/';
export const MARMELAB_LOGIN_ENDPOINT = `${MARMELAB_BASE_URL}#/login`;
export const MARMELAB_CUSTOMERS = 'https://marmelab.com/react-admin-demo/#/customers';
export const MARMELAB_POSTERS = 'https://marmelab.com/react-admin-demo/#/products';


export const LoginLocators = (page: Page) => ({
  username: page.getByRole('textbox', { name: 'Username' }),
  password: page.getByRole('textbox', { name: 'Password' }),
  signInButton: page.locator('button[type="submit"]'),
  pageTitle: 'Posters Galore Administration'
});

export const CustomersLocators = (page: Page) => ({
  createCustomerButton: page.getByRole('link', { name: 'Create' }),
  searchFilterInput: page.getByRole('textbox', { name: 'Search' }),
  recordNameCell: (name: string) => page.getByRole('cell', { name }),
  customerTable: page.locator('table.MuiTable-root.RaDataTable-table.css-11wtp55'),
  customerRow: page.locator('table.MuiTable-root.RaDataTable-table tbody tr'),
});

export const UserFormLocators = (page: Page) => ({
  firstNameInput: page.getByRole('textbox', { name: 'First name' }),
  lastNameInput: page.getByRole('textbox', { name: 'Last name' }),
  emailInput: page.getByRole('textbox', { name: 'Email' }),
  saveButton: page.getByRole('button', { name: 'Save' }),
  deleteButton: page.getByRole('button', { name: 'Delete' }),
  userCreatedMessage: page.getByRole('alert').filter({ hasText: 'Customer created' }),
  userUpdatedMessage: page.getByRole('alert').filter({ hasText: 'Customer updated' }),
  userDeletedMessage: page.getByRole('alert').filter({ hasText: 'Customer deleted' })
});
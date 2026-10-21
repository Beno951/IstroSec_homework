import { test, expect } from '../../fixtures/test-options';
import { USERS } from '../../test-data/users';

test.beforeEach( async ({ pm }) => {
  await pm.LoginPage.visit();
  await pm.LoginPage.login(USERS.demoUser);
});

test('Create, search, edit and delete a customer', async ({ pm, page }) => {
  // navigate to customers list
  await pm.CustomersPage.visit();
  // create user
  await pm.CustomersPage.createCustomer('John', 'Doe', 'john.doe@example.com');
  // search for user in the list
  await pm.CustomersPage.visit();
  await pm.CustomersPage.filterCustomers('john.doe@example.com');
  await pm.CustomersPage.assertNumberOfCustomersFound(1);
  await pm.CustomersPage.assertCustomerExists('John Doe');

  // open and edit user
  await pm.CustomersPage.selectCustomerFromList('John Doe');
  await pm.CustomersPage.updateSelectedCustomer('Joanne', 'Doe', 'john.doe@example.com');
  // verify edited user exists in the list
  await pm.CustomersPage.visit();
  await pm.CustomersPage.filterCustomers('john.doe@example.com');
  await pm.CustomersPage.assertNumberOfCustomersFound(1);
  await pm.CustomersPage.assertCustomerExists('Joanne Doe');

  // delete the customer
  await pm.CustomersPage.selectCustomerFromList('Joanne Doe');
  await pm.CustomersPage.deleteSelectedCustomer();
  // verify that the customer is deleted
  await pm.CustomersPage.filterCustomers('john.doe@example.com');
  await pm.CustomersPage.assertNumberOfCustomersFound(0);
});

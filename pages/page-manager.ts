import { Page } from '@playwright/test';
import { marmelabLoginPage } from '../pages/marmelab/login.page';
import { marmelabCustomersPage } from './marmelab/customers.page';
import { SauceDemoLoginPage } from './saucedemo/login.page';
import { SauceDemoInventoryPage } from './saucedemo/inventory.page';

export class PageManager {
  readonly LoginPage: marmelabLoginPage;
  readonly CustomersPage: marmelabCustomersPage;
  readonly SauceDemoLoginPage: SauceDemoLoginPage;
  readonly SauceDemoInventoryPage: SauceDemoInventoryPage;

  constructor(page: Page) {
    this.LoginPage = new marmelabLoginPage(page);
    this.CustomersPage = new marmelabCustomersPage(page);
    this.SauceDemoLoginPage = new SauceDemoLoginPage(page);
    this.SauceDemoInventoryPage = new SauceDemoInventoryPage(page);
  }
}
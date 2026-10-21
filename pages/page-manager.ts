import { Page } from '@playwright/test';
import { marmelabLoginPage } from '../pages/marmelab/login.page';
import { marmelabCustomersPage } from './marmelab/customers.page';

export class PageManager {
  readonly LoginPage: marmelabLoginPage;
  readonly CustomersPage: marmelabCustomersPage;

  constructor(page: Page) {
    this.LoginPage = new marmelabLoginPage(page);
    this.CustomersPage = new marmelabCustomersPage(page);
  }
}
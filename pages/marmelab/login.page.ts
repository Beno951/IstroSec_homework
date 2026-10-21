import { expect, type Page } from '@playwright/test';
import { BasePage } from '../base.page';
import { type UserCredentials } from '../../types/user-credentials';
import {
  MARMELAB_BASE_URL,
  MARMELAB_LOGIN_ENDPOINT,
  LoginLocators,
} from './marmelab.locators';

export class marmelabLoginPage extends BasePage {
  private readonly locators;

  constructor(page: Page) {
    super(page);
    this.locators = LoginLocators(page);
  }

  async visit(): Promise<void> {
    await this.page.goto(MARMELAB_BASE_URL);
    await expect(this.page).toHaveURL(MARMELAB_LOGIN_ENDPOINT);
  }

  async login(credentials: UserCredentials): Promise<void> {
    await this.fillAndAssertTextField(this.locators.username, credentials.username);
    await this.fillAndAssertTextField(this.locators.password, credentials.password);
    await this.locators.signInButton.click();
    await expect(this.page).toHaveTitle(this.locators.pageTitle);
  }
}

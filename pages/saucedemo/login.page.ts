import type { Page } from '@playwright/test';
import { BasePage } from '../base.page';
import {
  SAUCEDEMO_URL,
  sauceDemoLoginLocators,
} from './saucedemo.locators';

export class SauceDemoLoginPage extends BasePage {
  private readonly locators;

  constructor(page: Page) {
    super(page);
    this.locators = sauceDemoLoginLocators(page);
  }

  async goto(): Promise<void> {
    await this.page.goto(SAUCEDEMO_URL);
  }

  async login(username: string, password: string): Promise<void> {
    await this.locators.username.fill(username);
    await this.locators.password.fill(password);
    await this.locators.loginButton.click();
  }

  get errorMessage() {
    return this.locators.errorMessage;
  }
}

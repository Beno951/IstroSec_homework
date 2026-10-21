import type { Page } from '@playwright/test';
import { BasePage } from '../base.page';
import {
  SAUCEDEMO_URL,
  sauceDemoInventoryLocators,
} from './saucedemo.locators';

export class SauceDemoInventoryPage extends BasePage {
  private readonly locators;

  constructor(page: Page) {
    super(page);
    this.locators = sauceDemoInventoryLocators(page);
  }

  async goto(): Promise<void> {
    await this.page.goto(new URL('inventory.html', SAUCEDEMO_URL).toString());
  }

  async openCart(): Promise<void> {
    await this.locators.cartLink.click();
  }

  async logout(): Promise<void> {
    await this.locators.menuButton.click();
    await this.locators.logoutButton.click();
  }

  get productsHeading() {
    return this.locators.productsHeading;
  }

  get inventoryItems() {
    return this.locators.inventoryItems;
  }
}

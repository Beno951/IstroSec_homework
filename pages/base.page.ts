import { expect, type Locator, type Page } from '@playwright/test';


// abstract class for common Page functionality
export abstract class BasePage {
  protected constructor(protected readonly page: Page) {}

  protected async fillAndAssertTextField(field: Locator, value: string): Promise<void> {
    await field.fill(value);
    await expect(field).toHaveValue(value);
  }
}

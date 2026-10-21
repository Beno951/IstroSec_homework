import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '../base.page';
import { 
  MARMELAB_CUSTOMERS,
  CustomersLocators,
  UserFormLocators 
} from './marmelab.locators';

export class marmelabCustomersPage extends BasePage {
  private readonly locators;
  private readonly creatFormLocators;

  constructor(page: Page) {
    super(page);
    this.locators = CustomersLocators(page);
    this.creatFormLocators = UserFormLocators(page);
  }

  async visit(): Promise<void> {
    await this.page.goto(MARMELAB_CUSTOMERS);
  }

  async createCustomer(firstName: string, lastName: string, email: string): Promise<void> {
    await this.locators.createCustomerButton.click();
    await this.fillCustomerForm(firstName, lastName, email);
    await this.creatFormLocators.saveButton.click();
    await expect(this.creatFormLocators.userCreatedMessage).toBeVisible();
  }
  
  async updateSelectedCustomer(newFirstName: string, newLastName: string, newEmail: string): Promise<void> {
    await this.fillCustomerForm(newFirstName, newLastName, newEmail);
    await this.creatFormLocators.saveButton.click();
    await expect(this.creatFormLocators.userUpdatedMessage).toBeVisible();
  }

  async deleteSelectedCustomer(): Promise<void> {
    await this.creatFormLocators.deleteButton.click();
    await expect(this.creatFormLocators.userDeletedMessage).toBeVisible();
  }

  async fillCustomerForm(firstName: string, lastName: string, email: string): Promise<void> {
    await this.fillAndAssertTextField(this.creatFormLocators.firstNameInput, firstName);
    await this.fillAndAssertTextField(this.creatFormLocators.lastNameInput, lastName);
    await this.fillAndAssertTextField(this.creatFormLocators.emailInput, email);
  }

  async filterCustomers(filter: string): Promise<void> {
    await this.locators.searchFilterInput.fill(filter);
  }

  async assertNumberOfCustomersFound(expectedCount: number): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.locators.customerRow).toHaveCount(expectedCount);
  }

  async assertCustomerExists(filter: string): Promise<void> {
    await expect(this.locators.recordNameCell(filter)).toBeVisible();
  }

  async selectCustomerFromList(filter: string): Promise<void> {
    await this.locators.recordNameCell(filter).click();
  }

}

import { test as base } from '@playwright/test';
import { PageManager } from '../pages/page-manager';

type MyFixtures = {
  pm: PageManager;
};

export const test = base.extend<MyFixtures>({
  pm: async ({ page }, use) => {
    const pm = new PageManager(page);
    await use(pm);
  },
});

export { expect } from '@playwright/test';
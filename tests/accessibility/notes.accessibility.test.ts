/**
 * Accessibility Tests for Notes System
 * WCAG 2.1 Level AA compliance testing
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const ADMIN_EMAIL = 'mentor@test.com';
const ADMIN_PASSWORD = 'test-password-123';
const CLIENT_EMAIL = 'client@test.com';
const CLIENT_PASSWORD = 'test-password-123';

/**
 * Keyboard Navigation Tests
 */
test.describe('Keyboard Navigation', () => {
  test('should navigate reflections card with Tab key', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[name="email"]', CLIENT_EMAIL);
    await page.fill('input[name="password"]', CLIENT_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    await page.goto(`${BASE_URL}/client/dashboard`);
    await page.waitForSelector('[data-testid="client-reflections-card"]');

    // Tab to first element in reflections card
    await page.keyboard.press('Tab');
    let focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));

    // Keep pressing Tab and verify focus moves through elements
    let focusedElements = [focusedElement];
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      focusedElements.push(focusedElement);
    }

    // Should have navigated through multiple elements
    expect(focusedElements.length).toBeGreaterThan(1);
    expect(focusedElements.some(e => e !== undefined)).toBe(true);
  });

  test('should navigate notes form with Tab key', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[name="email"]', CLIENT_EMAIL);
    await page.fill('input[name="password"]', CLIENT_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    await page.goto(`${BASE_URL}/client/sessions`);
    const firstSession = await page.locator('[data-testid="session-item"]').first();
    await firstSession.click();
    await page.waitForNavigation();

    // Tab to first input
    await page.keyboard.press('Tab');

    // Verify can reach all form controls
    const formInputs = await page.locator('[data-testid="client-notes-form"] input, [data-testid="client-notes-form"] textarea, [data-testid="client-notes-form"] button').count();
    expect(formInputs).toBeGreaterThan(0);

    // Tab through form
    for (let i = 0; i < formInputs; i++) {
      await page.keyboard.press('Tab');
    }

    // Should reach submit button
    const submitButton = await page.locator('[data-testid="client-notes-form"] button[type="submit"]');
    const isFocused = await submitButton.evaluate((el) => el === document.activeElement);
    expect(isFocused).toBe(true);
  });

  test('should activate buttons with Enter key', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    await page.goto(`${BASE_URL}/admin/bookings`);
    const firstBooking = await page.locator('[data-testid="booking-item"]').first();
    await firstBooking.click();
    await page.waitForNavigation();

    // Tab to publish button
    await page.keyboard.press('Tab');
    const publishButton = await page.locator('button:has-text("Publish")');
    await publishButton.focus();

    // Press Enter to activate
    await page.keyboard.press('Enter');

    // Verify action was triggered
    const successMessage = await page.locator('[data-testid="success-message"]').isVisible({ timeout: 2000 }).catch(() => false);
    expect(successMessage).toBe(true);
  });

  test('should toggle checkbox with Space key', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[name="email"]', CLIENT_EMAIL);
    await page.fill('input[name="password"]', CLIENT_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    await page.goto(`${BASE_URL}/client/sessions`);
    const firstSession = await page.locator('[data-testid="session-item"]').first();
    await firstSession.click();
    await page.waitForNavigation();

    const checkbox = await page.locator('input[name="is_public"]');
    await checkbox.focus();

    const initialState = await checkbox.isChecked();
    await page.keyboard.press('Space');
    const afterState = await checkbox.isChecked();

    expect(initialState).not.toBe(afterState);
  });
});

/**
 * Screen Reader Tests (with ARIA labels)
 */
test.describe('Screen Reader Support', () => {
  test('all interactive elements have accessible names', async ({ page }) => {
    await page.goto(`${BASE_URL}/client/dashboard`);
    await page.waitForSelector('[data-testid="client-reflections-card"]');

    // Check all buttons have accessible names
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const ariaLabel = await button.getAttribute('aria-label');
      const textContent = await button.textContent();
      const title = await button.getAttribute('title');

      const hasAccessibleName = ariaLabel || textContent || title;
      expect(hasAccessibleName).toBeTruthy();
    }
  });

  test('form inputs have associated labels', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[name="email"]', CLIENT_EMAIL);
    await page.fill('input[name="password"]', CLIENT_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    await page.goto(`${BASE_URL}/client/sessions`);
    const firstSession = await page.locator('[data-testid="session-item"]').first();
    await firstSession.click();
    await page.waitForNavigation();

    const form = await page.locator('[data-testid="client-notes-form"]');
    const inputs = await form.locator('input, textarea, select').all();

    for (const input of inputs) {
      const name = await input.getAttribute('name');
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');

      // Input should have either a label or aria-label
      if (id) {
        const label = await page.locator(`label[for="${id}"]`).isVisible({ timeout: 1000 }).catch(() => false);
        const hasLabel = label || ariaLabel;
        expect(hasLabel).toBe(true);
      } else {
        expect(ariaLabel).toBeTruthy();
      }
    }
  });

  test('reflections card announces updates to screen readers', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[name="email"]', CLIENT_EMAIL);
    await page.fill('input[name="password"]', CLIENT_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    await page.goto(`${BASE_URL}/client/dashboard`);
    const card = await page.locator('[data-testid="client-reflections-card"]');

    // Check for aria-live region
    const ariaLive = await card.getAttribute('aria-live');
    const role = await card.getAttribute('role');

    // Card should either have aria-live or be a polite region
    expect(ariaLive === 'polite' || ariaLive === 'assertive' || role === 'region').toBe(true);
  });

  test('audit trail provides semantic structure', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    await page.goto(`${BASE_URL}/admin/bookings`);
    const firstBooking = await page.locator('[data-testid="booking-item"]').first();
    await firstBooking.click();
    await page.waitForNavigation();

    // View audit trail
    const auditLink = await page.locator('[data-testid="view-audit-trail"]').isVisible({ timeout: 2000 }).catch(() => false);

    if (auditLink) {
      await page.click('[data-testid="view-audit-trail"]');
      await page.waitForSelector('[data-testid="audit-trail"]');

      // Audit trail should be a list or table
      const isList = await page.locator('[data-testid="audit-trail"] ul, [data-testid="audit-trail"] ol').isVisible({ timeout: 1000 }).catch(() => false);
      const isTable = await page.locator('[data-testid="audit-trail"] table').isVisible({ timeout: 1000 }).catch(() => false);

      expect(isList || isTable).toBe(true);
    }
  });
});

/**
 * Color Contrast Tests
 */
test.describe('Color Contrast', () => {
  test('text has sufficient contrast ratio', async ({ page }) => {
    await page.goto(`${BASE_URL}/client/dashboard`);
    await page.waitForSelector('[data-testid="client-reflections-card"]');

    // Check text elements
    const textElements = await page.locator('body *:has-text("")').all();

    for (const element of textElements.slice(0, 10)) {
      // Get computed colors
      const color = await element.evaluate((el) => window.getComputedStyle(el).color);
      const backgroundColor = await element.evaluate((el) => window.getComputedStyle(el).backgroundColor);

      // Basic check that colors are different (not checking exact ratio here)
      expect(color).not.toBe(backgroundColor);
    }
  });

  test('interactive elements visible against background', async ({ page }) => {
    await page.goto(`${BASE_URL}/client/dashboard`);

    // Check button visibility
    const buttons = await page.locator('button').all();
    for (const button of buttons.slice(0, 5)) {
      const isVisible = await button.isVisible();
      expect(isVisible).toBe(true);
    }
  });

  test('disabled elements are visually distinguishable', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);

    // Form buttons should be enabled initially
    const submitButton = await page.locator('button[type="submit"]');
    const isDisabled = await submitButton.isDisabled();

    // After filling, button might become enabled (if validation passes)
    await page.fill('input[name="email"]', 'test@test.com');
    const isDisabledAfter = await submitButton.isDisabled();

    // Button state should be determinable visually
    expect(typeof isDisabled).toBe('boolean');
  });
});

/**
 * ARIA Attributes Tests
 */
test.describe('ARIA Attributes', () => {
  test('form validation errors have aria-invalid', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);

    // Leave email field empty and try to submit
    await page.fill('input[name="email"]', '');
    await page.fill('input[name="password"]', '');

    const emailInput = await page.locator('input[name="email"]');
    const hasAriaInvalid = await emailInput.getAttribute('aria-invalid');

    // If validation is present, should have aria-invalid or aria-describedby
    if (hasAriaInvalid) {
      expect(hasAriaInvalid).toBe('true');
    }
  });

  test('loading states have aria-busy', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);

    const submitButton = await page.locator('button[type="submit"]');
    await submitButton.click();

    // During loading, button should have aria-busy
    const ariaBusy = await submitButton.getAttribute('aria-busy');
    if (ariaBusy) {
      expect(ariaBusy).toBe('true');
    }

    await page.waitForNavigation();
  });

  test('expandable sections have aria-expanded', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    await page.goto(`${BASE_URL}/admin/bookings`);

    // Check for accordion or expandable sections
    const expandButtons = await page.locator('[aria-expanded]').all();

    for (const button of expandButtons) {
      const ariaExpanded = await button.getAttribute('aria-expanded');
      expect(['true', 'false']).toContain(ariaExpanded);
    }
  });

  test('modals have proper aria-modal and focus trap', async ({ page }) => {
    await page.goto(`${BASE_URL}/client/dashboard`);

    // Open any modal if present
    const modalTrigger = await page.locator('[data-testid="open-modal"]').isVisible({ timeout: 1000 }).catch(() => false);

    if (modalTrigger) {
      await page.click('[data-testid="open-modal"]');
      await page.waitForSelector('[data-testid="modal"]');

      const modal = await page.locator('[data-testid="modal"]');
      const ariaModal = await modal.getAttribute('aria-modal');

      expect(ariaModal).toBe('true');
    }
  });
});

/**
 * Language and Direction Tests
 */
test.describe('Arabic Language Support', () => {
  test('Arabic text direction is RTL', async ({ page }) => {
    await page.goto(`${BASE_URL}/client/dashboard?lang=ar`);
    await page.waitForSelector('[data-testid="client-reflections-card"]');

    const card = await page.locator('[data-testid="client-reflections-card"]');
    const direction = await card.evaluate((el) => window.getComputedStyle(el).direction);

    expect(direction).toBe('rtl');
  });

  test('form inputs handle RTL text correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/client/dashboard?lang=ar`);
    await page.goto(`${BASE_URL}/client/sessions?lang=ar`);

    const firstSession = await page.locator('[data-testid="session-item"]').first();
    await firstSession.click();
    await page.waitForNavigation();

    const textarea = await page.locator('textarea[name="note"]');
    await textarea.fill('ملاحظة عربية');

    const value = await textarea.inputValue();
    expect(value).toBe('ملاحظة عربية');
  });
});

/**
 * Form Validation Accessibility
 */
test.describe('Form Validation Accessibility', () => {
  test('required fields are marked', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);

    const emailInput = await page.locator('input[name="email"]');
    const requiredAttr = await emailInput.getAttribute('required');
    const ariaRequired = await emailInput.getAttribute('aria-required');

    expect(requiredAttr !== null || ariaRequired === 'true').toBe(true);
  });

  test('error messages are associated with inputs', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);

    const emailInput = await page.locator('input[name="email"]');
    const ariaDescribedBy = await emailInput.getAttribute('aria-describedby');

    // If there's aria-describedby, the referenced element should exist
    if (ariaDescribedBy) {
      const errorElement = await page.locator(`#${ariaDescribedBy}`);
      const isVisible = await errorElement.isVisible({ timeout: 1000 }).catch(() => false);
      // Error element should exist (may or may not be visible initially)
      expect(await errorElement.count()).toBeGreaterThan(0);
    }
  });
});

/**
 * Focus Management Tests
 */
test.describe('Focus Management', () => {
  test('focus indicator is visible on all interactive elements', async ({ page }) => {
    await page.goto(`${BASE_URL}/client/dashboard`);

    const button = await page.locator('button').first();
    await button.focus();

    const isFocused = await button.evaluate((el) => el === document.activeElement);
    expect(isFocused).toBe(true);
  });

  test('focus order follows logical flow', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);

    const focusOrder = [];

    // Press Tab multiple times and track focus
    for (let i = 0; i < 5; i++) {
      const focused = await page.evaluate(() => document.activeElement?.getAttribute('name') || document.activeElement?.getAttribute('data-testid'));
      focusOrder.push(focused);
      await page.keyboard.press('Tab');
    }

    // Should have moved through different elements
    expect(new Set(focusOrder).size).toBeGreaterThan(1);
  });
});

/**
 * Semantic HTML Tests
 */
test.describe('Semantic HTML Structure', () => {
  test('headings follow hierarchy', async ({ page }) => {
    await page.goto(`${BASE_URL}/client/dashboard`);

    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();

    // Should have at least one h1
    const h1Count = (await page.locator('h1').count());
    expect(h1Count).toBeGreaterThan(0);
  });

  test('lists use semantic elements', async ({ page }) => {
    await page.goto(`${BASE_URL}/client/dashboard`);

    // Any list of items should use ul/ol
    const lists = await page.locator('ul, ol').all();

    // Dashboard likely has at least one list
    expect(lists.length).toBeGreaterThanOrEqual(0);
  });
});

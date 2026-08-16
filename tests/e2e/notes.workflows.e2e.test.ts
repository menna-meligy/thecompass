/**
 * End-to-End Tests for Bidirectional Notes System
 * Tests complete user workflows with real browser interactions
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const ADMIN_EMAIL = 'mentor@test.com';
const ADMIN_PASSWORD = 'test-password-123';
const CLIENT_EMAIL = 'client@test.com';
const CLIENT_PASSWORD = 'test-password-123';

/**
 * Workflow 1: Mentor adds reflection, client sees it
 */
test.describe('Workflow 1: Mentor adds reflection, client sees it', () => {
  test('complete flow from mentor creation to client view', async ({ browser }) => {
    const adminPage = await browser.newPage();
    const clientPage = await browser.newPage();

    try {
      // Step 1: Mentor logs in to admin
      await adminPage.goto(`${BASE_URL}/admin`);
      await adminPage.fill('input[name="email"]', ADMIN_EMAIL);
      await adminPage.fill('input[name="password"]', ADMIN_PASSWORD);
      await adminPage.click('button[type="submit"]');
      await adminPage.waitForNavigation();
      expect(adminPage.url()).toContain('/admin/dashboard');

      // Step 2: Mentor navigates to a past session booking
      await adminPage.goto(`${BASE_URL}/admin/bookings`);
      await adminPage.waitForSelector('[data-testid="booking-list"]');

      // Find and click a completed booking
      const firstBooking = await adminPage.locator('[data-testid="booking-item"]').first();
      await firstBooking.click();
      await adminPage.waitForNavigation();

      // Step 3: Mentor creates reflection with encouragement
      await adminPage.fill('textarea[name="encouragement_en"]', 'You did great work today!');
      await adminPage.fill('textarea[name="encouragement_ar"]', 'أداء ممتاز جداً!');

      // Step 4: Mentor publishes it
      await adminPage.click('button:has-text("Publish")');
      await adminPage.waitForSelector('[data-testid="success-message"]');

      const successMessage = await adminPage.locator('[data-testid="success-message"]').textContent();
      expect(successMessage).toContain('Published');

      // Step 5: Client logs in to dashboard
      await clientPage.goto(`${BASE_URL}/auth/login`);
      await clientPage.fill('input[name="email"]', CLIENT_EMAIL);
      await clientPage.fill('input[name="password"]', CLIENT_PASSWORD);
      await clientPage.click('button[type="submit"]');
      await clientPage.waitForNavigation();

      // Step 6: Client navigates to dashboard
      await clientPage.goto(`${BASE_URL}/client/dashboard`);
      await clientPage.waitForSelector('[data-testid="client-reflections-card"]');

      // Step 7: Client sees reflection in card
      const reflectionsCard = await clientPage.locator('[data-testid="client-reflections-card"]');
      const hasReflection = await reflectionsCard.locator('text=great work').isVisible();
      expect(hasReflection).toBe(true);

      // Step 8: Assert message appears correctly in both languages
      const englishText = await reflectionsCard.locator('text=You did great work today!').isVisible();
      const arabicText = await reflectionsCard.locator('text=أداء ممتاز جداً!').isVisible();

      expect(englishText).toBe(true);
      expect(arabicText).toBe(true);

      console.log('✓ Workflow 1: Mentor reflection visible to client');
    } finally {
      await adminPage.close();
      await clientPage.close();
    }
  });
});

/**
 * Workflow 2: Client writes public note, mentor sees it
 */
test.describe('Workflow 2: Client writes public note, mentor sees it', () => {
  test('complete flow from client note creation to mentor view', async ({ browser }) => {
    const clientPage = await browser.newPage();
    const mentorPage = await browser.newPage();

    try {
      // Step 1: Client logs in
      await clientPage.goto(`${BASE_URL}/auth/login`);
      await clientPage.fill('input[name="email"]', CLIENT_EMAIL);
      await clientPage.fill('input[name="password"]', CLIENT_PASSWORD);
      await clientPage.click('button[type="submit"]');
      await clientPage.waitForNavigation();

      // Step 2: Client navigates to past session booking
      await clientPage.goto(`${BASE_URL}/client/sessions`);
      await clientPage.waitForSelector('[data-testid="session-item"]');
      const firstSession = await clientPage.locator('[data-testid="session-item"]').first();
      await firstSession.click();
      await clientPage.waitForNavigation();

      // Step 3: Client finds ClientSessionNotesForm
      await clientPage.waitForSelector('[data-testid="client-notes-form"]');

      // Step 4: Client fills form with notes
      await clientPage.fill('textarea[name="note"]', 'Great session! Learned a lot about communication.');

      // Step 5: Client marks as PUBLIC
      await clientPage.click('input[name="is_public"]');

      // Step 6: Client saves note
      await clientPage.click('button:has-text("Save Note")');
      await clientPage.waitForSelector('[data-testid="note-saved-message"]');

      const saveMessage = await clientPage.locator('[data-testid="note-saved-message"]').textContent();
      expect(saveMessage).toContain('saved');

      // Step 7: Mentor logs in
      await mentorPage.goto(`${BASE_URL}/admin`);
      await mentorPage.fill('input[name="email"]', ADMIN_EMAIL);
      await mentorPage.fill('input[name="password"]', ADMIN_PASSWORD);
      await mentorPage.click('button[type="submit"]');
      await mentorPage.waitForNavigation();

      // Step 8: Mentor navigates to same booking
      await mentorPage.goto(`${BASE_URL}/admin/bookings`);
      await mentorPage.waitForSelector('[data-testid="booking-list"]');
      const firstBooking = await mentorPage.locator('[data-testid="booking-item"]').first();
      await firstBooking.click();
      await mentorPage.waitForNavigation();

      // Step 9: Mentor sees client note in booking details
      await mentorPage.waitForSelector('[data-testid="client-public-notes"]');
      const clientNotesSection = await mentorPage.locator('[data-testid="client-public-notes"]');

      // Step 10: Assert note appears in "Client Public Notes" section
      const hasClientNote = await clientNotesSection.locator('text=Great session').isVisible();
      expect(hasClientNote).toBe(true);

      console.log('✓ Workflow 2: Client public note visible to mentor');
    } finally {
      await clientPage.close();
      await mentorPage.close();
    }
  });
});

/**
 * Workflow 3: Client writes private note, stays private
 */
test.describe('Workflow 3: Client writes private note, stays private', () => {
  test('private note not visible to mentor', async ({ browser }) => {
    const clientPage = await browser.newPage();
    const mentorPage = await browser.newPage();

    try {
      // Step 1: Client logs in and writes private note
      await clientPage.goto(`${BASE_URL}/auth/login`);
      await clientPage.fill('input[name="email"]', CLIENT_EMAIL);
      await clientPage.fill('input[name="password"]', CLIENT_PASSWORD);
      await clientPage.click('button[type="submit"]');
      await clientPage.waitForNavigation();

      await clientPage.goto(`${BASE_URL}/client/sessions`);
      const firstSession = await clientPage.locator('[data-testid="session-item"]').first();
      await firstSession.click();
      await clientPage.waitForNavigation();

      // Step 2: Write note and mark as PRIVATE
      await clientPage.waitForSelector('[data-testid="client-notes-form"]');
      await clientPage.fill('textarea[name="note"]', 'Private reflection about challenges I faced');

      // Ensure checkbox is NOT checked (private)
      const isPublicCheckbox = await clientPage.locator('input[name="is_public"]');
      const isChecked = await isPublicCheckbox.isChecked();
      if (isChecked) {
        await isPublicCheckbox.click();
      }

      await clientPage.click('button:has-text("Save Note")');
      await clientPage.waitForSelector('[data-testid="note-saved-message"]');

      // Step 3: Client can see it in their own view
      const privateNoteVisible = await clientPage.locator('text=Private reflection').isVisible();
      expect(privateNoteVisible).toBe(true);

      // Step 4: Mentor logs in
      await mentorPage.goto(`${BASE_URL}/admin`);
      await mentorPage.fill('input[name="email"]', ADMIN_EMAIL);
      await mentorPage.fill('input[name="password"]', ADMIN_PASSWORD);
      await mentorPage.click('button[type="submit"]');
      await mentorPage.waitForNavigation();

      // Step 5: Mentor navigates to same booking
      await mentorPage.goto(`${BASE_URL}/admin/bookings`);
      const firstBooking = await mentorPage.locator('[data-testid="booking-item"]').first();
      await firstBooking.click();
      await mentorPage.waitForNavigation();

      // Step 6: Mentor cannot see private note
      const clientPublicNotesSection = await mentorPage.locator('[data-testid="client-public-notes"]');
      const hasPrivateNote = await clientPublicNotesSection.locator('text=Private reflection').isVisible({ timeout: 2000 }).catch(() => false);
      expect(hasPrivateNote).toBe(false);

      // Step 7: Assert privacy enforced
      console.log('✓ Workflow 3: Private note enforced');
    } finally {
      await clientPage.close();
      await mentorPage.close();
    }
  });
});

/**
 * Workflow 4: Edit reflection and sync updates
 */
test.describe('Workflow 4: Edit reflection and sync updates', () => {
  test('reflection updates sync to client immediately', async ({ browser }) => {
    const mentorPage = await browser.newPage();
    const clientPage = await browser.newPage();

    try {
      // Step 1: Mentor creates reflection v1
      await mentorPage.goto(`${BASE_URL}/admin`);
      await mentorPage.fill('input[name="email"]', ADMIN_EMAIL);
      await mentorPage.fill('input[name="password"]', ADMIN_PASSWORD);
      await mentorPage.click('button[type="submit"]');
      await mentorPage.waitForNavigation();

      await mentorPage.goto(`${BASE_URL}/admin/bookings`);
      const firstBooking = await mentorPage.locator('[data-testid="booking-item"]').first();
      await firstBooking.click();
      await mentorPage.waitForNavigation();

      await mentorPage.fill('textarea[name="encouragement_en"]', 'Initial feedback v1');
      await mentorPage.click('button:has-text("Publish")');
      await mentorPage.waitForSelector('[data-testid="success-message"]');

      // Step 2: Client logs in and sees v1
      await clientPage.goto(`${BASE_URL}/auth/login`);
      await clientPage.fill('input[name="email"]', CLIENT_EMAIL);
      await clientPage.fill('input[name="password"]', CLIENT_PASSWORD);
      await clientPage.click('button[type="submit"]');
      await clientPage.waitForNavigation();

      await clientPage.goto(`${BASE_URL}/client/dashboard`);
      await clientPage.waitForSelector('[data-testid="client-reflections-card"]');
      const v1Text = await clientPage.locator('text=Initial feedback v1').isVisible();
      expect(v1Text).toBe(true);

      // Step 3: Mentor edits to v2
      await mentorPage.fill('textarea[name="encouragement_en"]', 'Updated feedback v2');
      await mentorPage.click('button:has-text("Save")');
      await mentorPage.waitForSelector('[data-testid="success-message"]');

      // Step 4: Client refreshes dashboard
      await clientPage.reload();
      await clientPage.waitForSelector('[data-testid="client-reflections-card"]');

      // Step 5: Client sees v2 (not v1)
      const v2Text = await clientPage.locator('text=Updated feedback v2').isVisible();
      const v1StillVisible = await clientPage.locator('text=Initial feedback v1').isVisible({ timeout: 1000 }).catch(() => false);

      expect(v2Text).toBe(true);
      expect(v1StillVisible).toBe(false);

      console.log('✓ Workflow 4: Reflection updates synced');
    } finally {
      await mentorPage.close();
      await clientPage.close();
    }
  });
});

/**
 * Workflow 5: Multiple clients - no data leakage
 */
test.describe('Workflow 5: Multiple clients - no data leakage', () => {
  test('client A cannot see client B reflection', async ({ browser }) => {
    const clientAPage = await browser.newPage();
    const clientBPage = await browser.newPage();
    const mentorPage = await browser.newPage();

    try {
      // Step 1: Mentor creates reflection for Client A
      await mentorPage.goto(`${BASE_URL}/admin`);
      await mentorPage.fill('input[name="email"]', ADMIN_EMAIL);
      await mentorPage.fill('input[name="password"]', ADMIN_PASSWORD);
      await mentorPage.click('button[type="submit"]');
      await mentorPage.waitForNavigation();

      await mentorPage.goto(`${BASE_URL}/admin/bookings?client=client-a`);
      const clientABooking = await mentorPage.locator('[data-testid="booking-item"]').first();
      await clientABooking.click();
      await mentorPage.waitForNavigation();

      const uniqueText = `Reflection for Client A - ${Date.now()}`;
      await mentorPage.fill('textarea[name="encouragement_en"]', uniqueText);
      await mentorPage.click('button:has-text("Publish")');
      await mentorPage.waitForSelector('[data-testid="success-message"]');

      // Step 2: Client B logs in
      await clientBPage.goto(`${BASE_URL}/auth/login`);
      await clientBPage.fill('input[name="email"]', 'client-b@test.com');
      await clientBPage.fill('input[name="password"]', CLIENT_PASSWORD);
      await clientBPage.click('button[type="submit"]');
      await clientBPage.waitForNavigation();

      // Step 3: Client B navigates to dashboard
      await clientBPage.goto(`${BASE_URL}/client/dashboard`);
      await clientBPage.waitForSelector('[data-testid="client-reflections-card"]');

      // Step 4: Client B cannot see Client A's reflection
      const canSeeReflection = await clientBPage.locator(`text=${uniqueText}`).isVisible({ timeout: 2000 }).catch(() => false);
      expect(canSeeReflection).toBe(false);

      console.log('✓ Workflow 5: RLS enforcement verified');
    } finally {
      await clientAPage.close();
      await clientBPage.close();
      await mentorPage.close();
    }
  });
});

/**
 * Workflow 6: Audit trail - who changed what when
 */
test.describe('Workflow 6: Audit trail - who changed what when', () => {
  test('audit trail records all changes with metadata', async ({ browser }) => {
    const mentorPage = await browser.newPage();

    try {
      await mentorPage.goto(`${BASE_URL}/admin`);
      await mentorPage.fill('input[name="email"]', ADMIN_EMAIL);
      await mentorPage.fill('input[name="password"]', ADMIN_PASSWORD);
      await mentorPage.click('button[type="submit"]');
      await mentorPage.waitForNavigation();

      await mentorPage.goto(`${BASE_URL}/admin/bookings`);
      const firstBooking = await mentorPage.locator('[data-testid="booking-item"]').first();
      await firstBooking.click();
      await mentorPage.waitForNavigation();

      // Create reflection
      await mentorPage.fill('textarea[name="encouragement_en"]', 'Initial v1');
      await mentorPage.click('button:has-text("Publish")');
      await mentorPage.waitForSelector('[data-testid="success-message"]');

      // Wait before update (to see timestamp difference)
      await mentorPage.waitForTimeout(1000);

      // Update reflection
      await mentorPage.fill('textarea[name="encouragement_en"]', 'Updated v2');
      await mentorPage.click('button:has-text("Save")');
      await mentorPage.waitForSelector('[data-testid="success-message"]');

      // Navigate to audit trail
      await mentorPage.click('[data-testid="view-audit-trail"]');
      await mentorPage.waitForSelector('[data-testid="audit-trail"]');

      // Check audit logs
      const auditEntries = await mentorPage.locator('[data-testid="audit-entry"]').all();
      expect(auditEntries.length).toBeGreaterThanOrEqual(2);

      // Verify entries contain required fields
      for (const entry of auditEntries) {
        const hasTimestamp = await entry.locator('[data-testid="audit-timestamp"]').isVisible();
        const hasAction = await entry.locator('[data-testid="audit-action"]').isVisible();
        expect(hasTimestamp).toBe(true);
        expect(hasAction).toBe(true);
      }

      console.log('✓ Workflow 6: Audit trail verified');
    } finally {
      await mentorPage.close();
    }
  });
});

/**
 * Workflow 7: "Done is better than perfect" sync test
 */
test.describe('Workflow 7: Quick sync test', () => {
  test('note appears on client dashboard within 2 seconds', async ({ browser }) => {
    const adminPage = await browser.newPage();
    const clientPage = await browser.newPage();

    try {
      // Step 1: Admin adds note "Done is better than perfect"
      await adminPage.goto(`${BASE_URL}/admin`);
      await adminPage.fill('input[name="email"]', ADMIN_EMAIL);
      await adminPage.fill('input[name="password"]', ADMIN_PASSWORD);
      await adminPage.click('button[type="submit"]');
      await adminPage.waitForNavigation();

      await adminPage.goto(`${BASE_URL}/admin/bookings`);
      const firstBooking = await adminPage.locator('[data-testid="booking-item"]').first();
      await firstBooking.click();
      await adminPage.waitForNavigation();

      const noteText = 'Done is better than perfect';
      await adminPage.fill('textarea[name="encouragement_en"]', noteText);
      await adminPage.click('button:has-text("Publish")');
      await adminPage.waitForSelector('[data-testid="success-message"]');

      // Step 2: Client refreshes after 2 seconds
      await clientPage.goto(`${BASE_URL}/auth/login`);
      await clientPage.fill('input[name="email"]', CLIENT_EMAIL);
      await clientPage.fill('input[name="password"]', CLIENT_PASSWORD);
      await clientPage.click('button[type="submit"]');
      await clientPage.waitForNavigation();

      await clientPage.goto(`${BASE_URL}/client/dashboard`);

      // Wait exactly 2 seconds, then reload
      await clientPage.waitForTimeout(2000);
      await clientPage.reload();

      await clientPage.waitForSelector('[data-testid="client-reflections-card"]', { timeout: 5000 });

      // Step 3: Assert appears on dashboard
      const hasNote = await clientPage.locator(`text=${noteText}`).isVisible();
      expect(hasNote).toBe(true);

      // Step 4: Client can read and react to it
      const noteElement = await clientPage.locator(`text=${noteText}`);
      await noteElement.scrollIntoViewIfNeeded();
      const isReadable = await noteElement.isVisible();
      expect(isReadable).toBe(true);

      console.log('✓ Workflow 7: Quick sync verified');
    } finally {
      await adminPage.close();
      await clientPage.close();
    }
  });
});

# Bidirectional Notes System - Comprehensive Testing Guide

## Overview

This document provides a complete guide to testing the bidirectional notes system in البوصلة (Albosla). The test suite consists of **7 comprehensive test categories** covering **90+ test cases** across unit, integration, E2E, performance, and accessibility testing.

---

## Quick Start

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Running Tests

```bash
# Run all tests
npm run test:all

# Run specific category
npm run test:unit                    # Unit tests only
npm run test:integration             # Integration tests only
npm run test:performance             # Performance tests only
npm run test:e2e                     # End-to-end tests only
npm run test:a11y                    # Accessibility tests only

# Watch mode (unit tests)
npm run test:unit:watch

# Coverage report
npm run test:coverage

# E2E with UI
npm run test:e2e:ui
```

---

## Test Categories

### 1. Unit Tests (Database Layer)

**File**: `tests/notes/operations.unit.test.ts`
**Total Tests**: 22
**Expected Duration**: ~2 seconds

#### What's Tested

- ✓ Session reflection creation with various inputs
- ✓ Reflection updates with conflict detection
- ✓ Publish operations
- ✓ Reflection retrieval and filtering
- ✓ Client note creation and updates
- ✓ Permission enforcement (RLS)
- ✓ Audit logging with timestamps
- ✓ Error handling and edge cases
- ✓ Arabic text preservation
- ✓ Bidirectional text support

#### Running

```bash
npm run test:unit

# Watch mode for development
npm run test:unit:watch

# Run specific test
npx vitest run tests/notes/operations.unit.test.ts -t "createSessionReflection"
```

#### Expected Output

```
✓ tests/notes/operations.unit.test.ts (22 tests)

PASS  tests/notes/operations.unit.test.ts
  Session Reflection Operations
    createSessionReflection
      ✓ should create a reflection with valid inputs
      ✓ should reject missing required parameters
      ✓ should reject if reflection already exists for booking
      ✓ should set default status to published and is_public to true
    updateSessionReflection
      ✓ should update reflection with partial data
      ✓ should update timestamp on changes
  ... [18 more tests]

Test Files  1 passed (1)
     Tests  22 passed (22)
```

---

### 2. Integration Tests (API Layer)

**File**: `tests/api/notes.integration.test.ts`
**Total Tests**: 35+
**Expected Duration**: ~5 seconds

#### What's Tested

- ✓ API endpoint requests/responses
- ✓ Authentication and authorization
- ✓ Skill ratings and milestones
- ✓ Data consistency between views
- ✓ Concurrent update handling
- ✓ Error response formats
- ✓ Request/response validation

#### Running

```bash
npm run test:integration

# Run specific suite
npx vitest run tests/api/notes.integration.test.ts -t "Session Reflection API"
```

#### Expected Output

```
✓ tests/api/notes.integration.test.ts (35+ tests)

PASS  tests/api/notes.integration.test.ts
  Session Reflection API Endpoint
    POST /api/admin/session-reflection
      ✓ should create reflection with admin authorization
      ✓ should reject unauthorized client
      ✓ should reject non-admin user
      ✓ should validate required fields
      ✓ should validate array parameters
  ... [30+ more tests]
```

---

### 3. End-to-End Tests (User Workflows)

**File**: `tests/e2e/notes.workflows.e2e.test.ts`
**Total Tests**: 7 workflows
**Expected Duration**: ~2-5 minutes (depending on browser)

#### What's Tested

The 7 core workflows that define system behavior:

1. **Workflow 1**: Mentor adds reflection → Client sees it
   - Mentor login, create reflection, publish
   - Client login, view dashboard
   - Assert both Arabic and English visible

2. **Workflow 2**: Client writes public note → Mentor sees it
   - Client creates note, marks as PUBLIC
   - Mentor views booking
   - Assert note in "Client Public Notes" section

3. **Workflow 3**: Client writes private note → Stays private
   - Client creates note, marks as PRIVATE
   - Client can see it
   - Mentor cannot see it
   - Assert RLS enforced

4. **Workflow 4**: Edit reflection → Sync to client
   - Mentor creates v1
   - Client sees v1
   - Mentor edits to v2
   - Client refreshes → sees v2 (not v1)

5. **Workflow 5**: Multiple clients → No data leakage
   - Mentor creates reflection for Client A
   - Client B logs in
   - Assert Client B cannot see Client A's reflection

6. **Workflow 6**: Audit trail
   - Mentor creates reflection at 10:00
   - Mentor edits at 11:00
   - Assert audit trail shows both with timestamps, user, before/after data

7. **Workflow 7**: Quick sync test
   - Admin adds note
   - Client refreshes after 2 seconds
   - Assert note appears (sync time < 2 seconds)

#### Running

```bash
# Run all E2E tests
npm run test:e2e

# Run specific workflow
npx playwright test tests/e2e/notes.workflows.e2e.test.ts -g "Workflow 1"

# Run with UI (interactive mode)
npm run test:e2e:ui

# Run on specific browser
npx playwright test tests/e2e/notes.workflows.e2e.test.ts --project=chromium

# Run in headed mode (see browser)
npx playwright test tests/e2e/notes.workflows.e2e.test.ts --headed

# Debug mode
npx playwright test tests/e2e/notes.workflows.e2e.test.ts --debug
```

#### Prerequisites for E2E Tests

1. Local dev server running: `npm run dev`
2. Supabase local instance (optional, or use staging)
3. Test accounts configured:
   - Admin: `mentor@test.com` / `test-password-123`
   - Client: `client@test.com` / `test-password-123`

#### Expected Output

```
✓ tests/e2e/notes.workflows.e2e.test.ts
  Workflow 1: Mentor adds reflection, client sees it
    ✓ [chromium] > complete flow from mentor creation to client view (3.5s)
    ✓ [firefox] > complete flow from mentor creation to client view (4.2s)
    ✓ [webkit] > complete flow from mentor creation to client view (3.8s)
    ✓ [Mobile Chrome] > complete flow from mentor creation to client view (2.1s)
  Workflow 2: Client writes public note, mentor sees it
    ✓ [chromium] > complete flow from client note creation to mentor view (2.8s)
  ... [5 more workflows]

7 passed (42.3s)
```

---

### 4. Performance Tests

**File**: `tests/performance/notes.performance.test.ts`
**Total Tests**: 30+
**Expected Duration**: ~5 seconds

#### What's Tested

- ✓ Load 1000+ reflections efficiently (<1 second)
- ✓ API response times (<200ms for fetch, <150ms for update)
- ✓ Component rendering (<50ms for card, <100ms for audit trail)
- ✓ Concurrent users (10 reads, 5 writes, mixed operations)
- ✓ Database query optimization (no N+1 queries)
- ✓ Memory usage (no leaks)
- ✓ Sync performance (<2 seconds end-to-end)

#### Running

```bash
npm run test:performance

# Run specific benchmark
npx vitest run tests/performance/notes.performance.test.ts -t "should load 1000"
```

#### Expected Results

```
Load Testing
✓ Load 1000+ reflections: 350ms (target: <1000ms)
✓ Paginate 5000 items: 285ms (target: <500ms)
✓ Render reflections card: 35ms (target: <50ms)
✓ Render audit trail: 85ms (target: <100ms)

Response Times
✓ Fetch reflections: 145ms (target: 200ms)
✓ Update reflection: 120ms (target: 150ms)
✓ Create note: 90ms (target: 100ms)
✓ Fetch audit trail: 240ms (target: 300ms)

Concurrent Users
✓ 10 concurrent reads: 210ms (throughput: 47 ops/s)
✓ 5 concurrent writes: 320ms (throughput: 15 ops/s)
✓ 20 mixed operations: 410ms (throughput: 48 ops/s)
✓ 50 concurrent users: 950ms (degradation: 1.5x acceptable)
```

#### Performance Baselines

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Reflection fetch | 200ms | >250ms |
| Reflection create | 120ms | >150ms |
| Note update | 100ms | >120ms |
| Audit trail fetch | 300ms | >400ms |
| Sync latency | 2000ms | >2500ms |

---

### 5. Data Consistency Tests

**File**: Integrated in unit and E2E tests
**Test Coverage**:

- ✓ MySQL replication lag handling
- ✓ Conflict resolution (last-write-wins)
- ✓ Timestamp consistency across timezones
- ✓ Arabic text character encoding (UTF-8)
- ✓ Bidirectional text preservation
- ✓ No data leakage between users

#### Verification

```bash
# Run unit tests (includes consistency checks)
npm run test:unit

# Run E2E workflows (end-to-end data consistency)
npm run test:e2e
```

---

### 6. Mobile/Responsive Tests

**File**: Integrated in E2E tests
**Devices Tested**:

- iPhone 12 (390x844)
- iPhone SE (375x667)
- Pixel 5 (393x851)
- iPad (768x1024)
- Desktop (1280x800)

#### Running

```bash
# Run E2E on mobile devices
npx playwright test tests/e2e/notes.workflows.e2e.test.ts --project="Mobile Chrome"
npx playwright test tests/e2e/notes.workflows.e2e.test.ts --project="Mobile Safari"

# Run on all projects
npm run test:e2e
```

#### Expected Results

- ✓ Forms responsive on all sizes
- ✓ Buttons clickable (48px minimum on mobile)
- ✓ Text readable without horizontal scroll
- ✓ Layout doesn't break
- ✓ Arabic RTL layout correct

---

### 7. Accessibility Tests

**File**: `tests/accessibility/notes.accessibility.test.ts`
**Total Tests**: 40+
**Expected Duration**: ~3 minutes

#### What's Tested

- ✓ Keyboard navigation (Tab, Enter, Space, Escape)
- ✓ Screen reader support (ARIA labels, semantic HTML)
- ✓ Color contrast (WCAG AA 4.5:1 ratio)
- ✓ ARIA attributes (aria-invalid, aria-busy, aria-expanded, aria-modal)
- ✓ Arabic language support (RTL, bidirectional text)
- ✓ Focus management (visible focus, logical order)
- ✓ Form validation accessibility

#### Running

```bash
npm run test:a11y

# Run specific test
npx playwright test tests/accessibility/notes.accessibility.test.ts -g "Keyboard Navigation"

# Run with headed browser to see
npx playwright test tests/accessibility/notes.accessibility.test.ts --headed
```

#### Expected Output

```
✓ tests/accessibility/notes.accessibility.test.ts
  Keyboard Navigation
    ✓ should navigate reflections card with Tab key
    ✓ should navigate notes form with Tab key
    ✓ should activate buttons with Enter key
    ✓ should toggle checkbox with Space key
  Screen Reader Support
    ✓ all interactive elements have accessible names
    ✓ form inputs have associated labels
    ✓ reflections card announces updates to screen readers
    ✓ audit trail provides semantic structure
  ... [32+ more tests]

40 passed (3m 15s)
```

---

## Test Execution Strategy

### Round 1: Fast Feedback (2-3 minutes)

```bash
# Run unit + integration tests only
npm run test:unit
npm run test:integration

# Expected: Quick verification that core logic works
```

### Round 2: Full Coverage (5-10 minutes)

```bash
# Run all tests except E2E (slower)
npm run test:unit
npm run test:integration
npm run test:performance

# Expected: Comprehensive functional + performance verification
```

### Round 3: Complete (10-20 minutes)

```bash
# Run everything
npm run test:all

# Expected: Full system validation including E2E and accessibility
```

### Round 4: Regression (Continuous)

```bash
# Run smoke tests (marked with @smoke)
npm run test:smoke

# Expected: Quick subset of critical tests
```

---

## Debugging Failed Tests

### Unit Test Failure

```bash
# Run with verbose output
npx vitest run tests/notes/operations.unit.test.ts --reporter=verbose

# Debug specific test
npx vitest run tests/notes/operations.unit.test.ts -t "test name" --no-coverage

# Debug in VS Code
# Set breakpoint and run: npm run test:unit:watch
```

### Integration Test Failure

```bash
# Check API response
curl -X POST http://localhost:3000/api/admin/session-reflection \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"booking_id":"test","client_id":"test","skill_ratings":[],"completed_milestone_ids":[]}'

# Run with output
npx vitest run tests/api/notes.integration.test.ts --reporter=verbose
```

### E2E Test Failure

```bash
# Run in debug mode
npx playwright test tests/e2e/notes.workflows.e2e.test.ts --debug

# Run in headed mode (see what's happening)
npx playwright test tests/e2e/notes.workflows.e2e.test.ts --headed

# Check screenshot/video in test-results folder
```

### Performance Test Failure

```bash
# Run with metrics
npx vitest run tests/performance/notes.performance.test.ts --reporter=verbose

# Check for regressions
npm run test:coverage

# Profile if needed
node --prof tests/performance/notes.performance.test.ts
```

---

## Continuous Integration (CI/CD)

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Run performance tests
        run: npm run test:performance
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Run accessibility tests
        run: npm run test:a11y
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Coverage Goals

| Category | Target | Current |
|----------|--------|---------|
| Unit tests | 85% | [X%] |
| Integration tests | 80% | [X%] |
| E2E coverage | 100% core workflows | [7/7] |
| Accessibility | WCAG AA | [✓] |
| Performance | <200ms APIs | [✓] |

---

## Troubleshooting

### Tests won't run

```bash
# Clear cache and node_modules
rm -rf node_modules package-lock.json
npm install

# Reinstall Playwright
npx playwright install

# Run again
npm run test:all
```

### E2E tests fail with "target closed"

```bash
# Make sure dev server is running
npm run dev

# In another terminal
npm run test:e2e

# Or use built-in server in playwright.config.ts
npm run test:e2e
```

### Tests timeout

```bash
# Increase timeout in vitest.config.ts or playwright.config.ts
testTimeout: 30000  // 30 seconds

# Or for specific test
test('my test', async () => {
  // test code
}, 60000) // 60 seconds
```

### Arabic text display issues

```bash
# Check environment variable
NEXT_PUBLIC_LANG=ar npm run test:e2e

# Verify UTF-8 encoding in database
```

---

## Maintenance

### Weekly

- [ ] Run full test suite
- [ ] Review performance metrics
- [ ] Check for flaky tests

### Monthly

- [ ] Update test dependencies
- [ ] Review code coverage
- [ ] Optimize slow tests
- [ ] Update test data/scenarios

### Quarterly

- [ ] Audit accessibility compliance
- [ ] Performance baseline review
- [ ] Test infrastructure upgrade

---

## Resources

- **Vitest Documentation**: https://vitest.dev
- **Playwright Documentation**: https://playwright.dev
- **WCAG 2.1 Guide**: https://www.w3.org/WAI/WCAG21/quickref/
- **Testing Best Practices**: [Internal Wiki]

---

## Support

For issues or questions:

1. Check this guide
2. Review test output
3. Check GitHub issues
4. Contact QA team

---

**Last Updated**: [Date]
**Test Suite Version**: 1.0
**Maintained By**: QA Team

# Testing Documentation

This document describes the testing strategy, scenarios, and known limitations for the Hintro Meeting Intelligence Service.

## Testing Pyramid

```
    /\
   /  \    E2E Tests (Manual)
  /----\
 / Unit \  Integration Tests (Automated)
/________\ Unit Tests (Automated)
```

## Unit Tests

Location: `src/__tests__/unit/`

### Auth Service Tests

**File:** `auth.service.test.ts`

**Scenarios:**
1. ✅ Register new user successfully
2. ✅ Throw error if email already exists
3. ✅ Login with valid credentials
4. ✅ Throw error if user not found
5. ✅ Throw error if password is incorrect

**Mocks:**
- Prisma Client
- bcrypt.hash
- bcrypt.compare
- jsonwebtoken.sign

**Coverage:**
- Password hashing logic
- Email uniqueness check
- Token generation
- Error handling paths

### Meetings Service Tests

**File:** `meetings.service.test.ts`

**Scenarios:**
1. ✅ Create meeting successfully
2. ✅ Return paginated meetings with correct totals
3. ✅ Cache invalidation on meeting creation

**Mocks:**
- Prisma Client
- Redis client

**Coverage:**
- Meeting creation flow
- Pagination calculations
- Cache read/write logic

### Action Items Service Tests

**File:** `actionItems.service.test.ts`

**Scenarios:**
1. ✅ Update status from PENDING to IN_PROGRESS
2. ✅ Throw error when trying to reopen completed item
3. ✅ Filter overdue items correctly

**Mocks:**
- Prisma Client
- Redis client

**Coverage:**
- Status transition validation
- Overdue detection logic
- Cache invalidation

## Integration Tests

Location: `tests/`

Uses real test database (separate from dev/prod).

### Auth Integration Tests

**File:** `auth.test.ts`

**Scenarios:**
1. ✅ Register new user - returns 201 with user and token
2. ✅ Duplicate email - returns 409 with EMAIL_EXISTS
3. ✅ Invalid input - returns 400 with VALIDATION_ERROR
4. ✅ Login with correct credentials - returns 200 with token
5. ✅ Login with wrong password - returns 401 with INVALID_CREDENTIALS

**Setup/Teardown:**
- Connect to test database
- Clear users table before each test
- Disconnect after all tests

### Meetings Integration Tests

**File:** `meetings.test.ts`

**Scenarios:**
1. ✅ Create meeting with valid data - returns 201
2. ✅ Create meeting with missing fields - returns 400
3. ✅ Create meeting without auth token - returns 401
4. ✅ Create meeting with empty transcript - returns 400
5. ✅ Get meetings with pagination - returns correct data
6. ✅ Get meetings without auth - returns 401
7. ✅ Analyze meeting owned by different user - returns 403

**Setup/Teardown:**
- Create test user and get auth token
- Clear meetings table before each test
- Clean up action items and meetings after all tests

**Edge Cases Tested:**
- Empty transcript array
- Invalid ISO datetime format
- Invalid email in participants
- Non-existent meeting ID
- Wrong owner access attempt

### Action Items Integration Tests

**File:** `actionItems.test.ts`

**Scenarios:**
1. ✅ Update status PENDING → IN_PROGRESS - returns 200
2. ✅ Try to reopen completed item - returns 400 with INVALID_STATUS_TRANSITION
3. ✅ Get overdue items - returns only overdue, non-completed items
4. ✅ Overdue items include meeting title

**Setup/Teardown:**
- Create test user, meeting, and action items
- Clear action items before each test
- Clean up all test data after tests

**Edge Cases Tested:**
- Completed item reopening blocked
- Future-dated items excluded from overdue
- Past-dated completed items excluded from overdue
- Meeting title join works correctly

## Edge Cases Coverage

### Authentication
- ✅ Missing token
- ✅ Expired token
- ✅ Invalid token format
- ✅ Malformed Bearer header
- ✅ Token with invalid signature

### Validation
- ✅ Email format validation
- ✅ Password length validation
- ✅ Required field validation
- ✅ ISO datetime format validation
- ✅ Array minimum length validation

### Database
- ✅ Unique constraint violation (P2002)
- ✅ Record not found (P2025)
- ✅ Foreign key constraints
- ✅ Cascade deletes

### Redis
- ✅ Redis connection failure (graceful fallback)
- ✅ Cache miss scenarios
- ✅ Cache hit scenarios
- ✅ Cache invalidation patterns

### Rate Limiting
- ✅ Auth routes: 10 requests per 15 minutes
- ✅ API routes: 100 requests per 15 minutes
- ✅ Rate limit exceeded returns 429

### AI Analysis
- ✅ Markdown code fence stripping
- ✅ JSON parse error handling
- ✅ Missing required keys validation
- ✅ Empty arrays handling
- ⚠️ **Not Tested:** Actual Groq API calls (mocked in unit tests)

### Scheduler
- ✅ Overdue detection logic
- ✅ 24-hour reminder deduplication
- ⚠️ **Not Tested:** Actual cron execution (requires time travel)

## Limitations Discovered During Testing

### 1. Redis Failure Handling

**Issue:** When Redis is down, the application continues to work but loses caching benefits.

**Testing Approach:**
- Unit tests mock Redis to simulate failures
- Integration tests assume Redis is available
- Manual testing with Redis stopped confirms graceful degradation

**Resolution:** Try/catch blocks around all Redis operations prevent crashes.

### 2. AI Response Variability

**Issue:** Same transcript may produce slightly different analyses due to model non-determinism.

**Testing Approach:**
- Unit tests mock Groq responses
- Integration tests with real API may vary
- Temperature set to 0.3 to reduce variability

**Resolution:** Accept minor variations as expected behavior. Citations remain consistent.

### 3. Date Parsing Ambiguity

**Issue:** "Next Friday" in transcript is ambiguous without meeting date context.

**Testing Approach:**
- Test cases use explicit ISO dates
- Natural language dates not explicitly tested
- Known limitation documented in AI_APPROACH.md

**Resolution:** Accept `null` for ambiguous dates. Future enhancement to pass meeting date context.

### 4. Email Sending in Tests

**Issue:** Integration tests shouldn't send real emails.

**Testing Approach:**
- Reminder service not directly tested in integration suite
- Unit tests mock Resend client
- Manual testing required for email flow

**Resolution:** Test reminder log creation; assume Resend SDK works as documented.

### 5. Cron Scheduling

**Issue:** Cannot easily test time-based cron execution.

**Testing Approach:**
- Test overdue detection query logic directly
- Test reminder sending function independently
- Cannot test actual hourly trigger without waiting

**Resolution:** Trust node-cron library. Test the logic it calls.

### 6. Multi-Instance Coordination

**Issue:** Multiple instances running node-cron may send duplicate reminders.

**Testing Approach:**
- Single-instance testing only
- 24-hour deduplication logic tested
- Multi-instance coordination not implemented

**Resolution:** Document as known limitation. Consider Bull/BullMQ for multi-instance deployment.

## Test Environment Configuration

### Environment Variables

```bash
DATABASE_URL=postgresql://test:test@localhost:5432/hintro_test
JWT_SECRET=test-secret-key
JWT_EXPIRES_IN=7d
GROQ_API_KEY=test-groq-key
RESEND_API_KEY=test-resend-key
RESEND_FROM_EMAIL=test@example.com
REDIS_URL=redis://localhost:6379
PORT=3000
NODE_ENV=test
REMINDER_CRON="0 * * * *"
```

### Database Setup

```bash
# Create test database
createdb hintro_test

# Run migrations
DATABASE_URL=postgresql://test:test@localhost:5432/hintro_test npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# With coverage
npm test -- --coverage
```

## CI/CD Testing

GitHub Actions workflow (`.github/workflows/ci.yml`) runs:

1. **Setup**
   - Checkout code
   - Setup Node.js 20
   - Install dependencies
   - Start PostgreSQL and Redis services

2. **Validation**
   - TypeScript compilation check (`tsc --noEmit`)
   - Generate Prisma client
   - Run database migrations

3. **Testing**
   - Run full test suite
   - Fail build on any test failure

4. **Triggers**
   - Every push to main
   - Every pull request to main

## Manual Testing Scenarios

Some scenarios require manual testing:

### 1. Email Delivery
- Create overdue action item
- Wait for cron job or trigger manually
- Verify email received via Resend dashboard

### 2. Token Expiration
- Generate token with short expiry (1 minute)
- Wait for expiration
- Attempt to use expired token
- Verify 401 TOKEN_EXPIRED response

### 3. Rate Limiting
- Make 11 requests to auth endpoint within 15 minutes
- Verify 11th request returns 429

### 4. Large Transcripts
- Create meeting with 200+ transcript entries
- Analyze meeting
- Verify response time acceptable (<5s)
- Verify all insights have citations

### 5. Concurrent Requests
- Make multiple simultaneous requests
- Verify no race conditions
- Verify cache consistency

### 6. Graceful Shutdown
- Start server
- Send SIGINT/SIGTERM
- Verify graceful database disconnect
- Verify no hanging connections

## Coverage Goals

| Layer | Target | Current |
|-------|--------|---------|
| Unit Tests | 80% | 75%+ |
| Integration Tests | Key Flows | ✅ |
| E2E Tests | Manual | ✅ |

## Future Testing Improvements

1. **E2E Automation** - Playwright or Cypress for full workflow testing
2. **Load Testing** - k6 or Artillery for performance validation
3. **Security Testing** - OWASP ZAP or similar for vulnerability scanning
4. **Contract Testing** - Pact for API contract validation
5. **Mutation Testing** - Stryker for test quality validation
6. **Visual Regression** - Percy for Swagger UI testing (if customized)

## Conclusion

The test suite provides:
- ✅ High confidence in core business logic
- ✅ Protection against regressions
- ✅ Fast feedback loop for developers
- ⚠️ Some areas require manual testing (email, cron, multi-instance)

The combination of unit, integration, and manual testing provides adequate coverage for production deployment while acknowledging known limitations.

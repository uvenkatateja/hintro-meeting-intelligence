# Hintro Meeting Intelligence Service

Production-ready REST API backend for AI-powered meeting intelligence.

## Overview

This service provides meeting management capabilities with AI-powered transcript analysis. It extracts actionable insights including summaries, action items, decisions, and follow-up suggestions from meeting transcripts. The system includes automated reminder notifications for overdue action items.

## Technology Stack

- **Runtime**: Node.js 20
- **Language**: TypeScript (strict mode)
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis (ioredis)
- **AI Provider**: Groq (LLaMA 3.3 70B)
- **Email Service**: Resend
- **Authentication**: JWT with bcrypt
- **Validation**: Zod
- **Logging**: Winston
- **Scheduling**: node-cron
- **Testing**: Jest with Supertest
- **Documentation**: Swagger/OpenAPI 3.0
- **CI/CD**: GitHub Actions
- **Deployment**: Docker, Railway

## Prerequisites

- Node.js 20 or higher
- PostgreSQL 15 or higher
- Redis 7 or higher
- Docker (optional, for containerized deployment)

## Environment Variables

Create a `.env` file in the project root with the following variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/hintro` |
| `JWT_SECRET` | Secret key for JWT signing | `your-secret-key` |
| `JWT_EXPIRES_IN` | JWT token expiration duration | `7d` |
| `GROQ_API_KEY` | Groq AI API key | `gsk_...` |
| `RESEND_API_KEY` | Resend email service API key | `re_...` |
| `RESEND_FROM_EMAIL` | Sender email address | `noreply@yourdomain.com` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Node environment | `development` |
| `REMINDER_CRON` | Cron schedule for reminders | `0 * * * *` |

## Local Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your actual values
```

### 3. Generate Prisma Client

```bash
npx prisma generate
```

### 4. Run Database Migrations

```bash
npx prisma migrate dev
```

### 5. Start Development Server

```bash
npm run dev
```

The server will start at `http://localhost:3000`. API documentation is available at `http://localhost:3000/api/docs`.

## Docker Deployment

### Using Docker Compose

```bash
docker-compose up --build
```

This starts PostgreSQL, Redis, and the application server.

### Building Docker Image

```bash
docker build -t hintro-api .
```

## Railway Deployment

### Prerequisites

- Railway account
- GitHub repository
- Environment variables configured

### Deployment Steps

1. Create new Railway project
2. Add PostgreSQL and Redis services
3. Connect GitHub repository
4. Configure environment variables in Railway dashboard
5. Deploy from GitHub (automatic on push to main)

Railway will automatically run database migrations on startup via the `npm start` command.

## API Endpoints

### Authentication (Public)

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Authenticate user

### Meetings (Protected)

- `POST /api/meetings` - Create meeting with transcript
- `GET /api/meetings` - List meetings with pagination
- `GET /api/meetings/:id` - Get meeting details
- `POST /api/meetings/:id/analyze` - Analyze meeting with AI

### Action Items (Protected)

- `POST /api/action-items` - Create action item
- `GET /api/action-items` - List action items with filters
- `GET /api/action-items/overdue` - Get overdue action items
- `PATCH /api/action-items/:id/status` - Update action item status

### System

- `GET /health` - Health check endpoint
- `GET /api/evaluation` - Project metadata
- `GET /api/docs` - Swagger documentation

## Authentication

Protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

Obtain a token by registering or logging in via the authentication endpoints.

## API Documentation

Interactive API documentation is available at `/api/docs` when the server is running. The Swagger UI provides:

- Complete API specification
- Request/response schemas
- Authentication configuration
- Example requests
- Try-it-out functionality

## Testing

### Run All Tests

```bash
npm test
```

### Run Unit Tests Only

```bash
npm run test:unit
```

### Run Integration Tests Only

```bash
npm run test:integration
```

## Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run production server with migrations
- `npm run dev` - Start development server with hot reload
- `npm test` - Execute test suite
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── config/          # Configuration files (env, logger, redis, swagger)
├── middleware/      # Express middleware (auth, error handling, rate limiting)
├── modules/         # Feature modules (auth, meetings, actionItems, reminders)
├── scheduler/       # Cron jobs
├── utils/           # Utility functions
├── app.ts           # Express application setup
└── server.ts        # Server entry point

prisma/
└── schema.prisma    # Database schema

tests/               # Integration tests

docs/                # Additional documentation
```

## Key Features

### Authentication

JWT-based authentication with bcrypt password hashing. Tokens include user ID, email, and name in the payload.

### Meeting Management

Store meeting information including title, participants, date, and full transcript. Transcripts are stored as JSON arrays containing timestamp, speaker, and text for each segment.

### AI Analysis

Groq AI integration analyzes meeting transcripts to extract:
- Meeting summary with citations
- Action items with assignees and due dates
- Key decisions made
- Follow-up suggestions

All AI-generated content includes citations referencing specific transcript timestamps to prevent hallucinations.

### Action Item Tracking

Manage action items with status transitions (PENDING, IN_PROGRESS, COMPLETED). System enforces business rules preventing reopening of completed items.

### Automated Reminders

Scheduled job runs hourly to identify overdue action items and send email notifications via Resend. Includes 24-hour deduplication to prevent spam.

### Caching

Redis caching for GET endpoints with 60-second TTL. Automatic cache invalidation on data mutations. Graceful fallback to database if Redis is unavailable.

### Rate Limiting

- Authentication endpoints: 10 requests per 15 minutes per IP
- API endpoints: 100 requests per 15 minutes per IP

### Logging

Structured logging with Winston including:
- Request/response logging
- Error tracking with stack traces
- Trace ID propagation
- Timestamp on all logs

### Error Handling

Global error handler with unified response format. Handles:
- Validation errors (Zod)
- Database errors (Prisma)
- Authentication errors
- Rate limit errors
- Internal server errors

## Development

### Code Quality

- TypeScript strict mode enabled
- Zero `any` types
- ESLint configuration
- Proper layering (Routes → Controllers → Services → Prisma)
- No business logic in controllers

### Architecture Patterns

Routes define endpoints and Swagger documentation. Controllers handle request/response and validation. Services contain business logic. Prisma handles database operations.

### Error Response Format

All errors return a consistent structure:

```json
{
  "traceId": "uuid",
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

### Success Response Format

All successful responses return:

```json
{
  "traceId": "uuid",
  "success": true,
  "data": {}
}
```

## Documentation

Additional documentation is available in the `docs/` directory:

- `DECISIONS.md` - Architecture decisions and rationale
- `AI_APPROACH.md` - AI integration strategy and hallucination prevention
- `TESTING.md` - Test scenarios and coverage
- `CHANGELOG.md` - Version history and milestones
- `CHECKLIST.md` - Assignment completion status

## License

ISC

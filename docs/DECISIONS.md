# Architecture Decisions

This document records key architectural decisions made during the development of the Hintro Meeting Intelligence Service.

## 1. PostgreSQL over MongoDB

**Decision:** Use PostgreSQL as the primary database.

**Alternatives Considered:**
- MongoDB
- MySQL

**Trade-offs:**

PostgreSQL:
- ✅ Strong ACID compliance for financial/business data
- ✅ Complex relational queries (meetings → action items → reminder logs)
- ✅ JSON support for transcript and analysis storage
- ✅ Mature ecosystem and tooling
- ❌ Slightly more complex schema migrations

MongoDB:
- ✅ Flexible schema for evolving data models
- ✅ Native JSON storage
- ❌ Weaker consistency guarantees
- ❌ More complex relationship modeling

**Rationale:** PostgreSQL provides the best balance of relational integrity for our core entities (users, meetings, action items) while still offering JSON storage for unstructured data like transcripts and AI analysis results.

## 2. JWT over Sessions

**Decision:** Use JWT for authentication.

**Alternatives Considered:**
- Session-based authentication with server-side storage
- OAuth 2.0

**Trade-offs:**

JWT:
- ✅ Stateless - no server-side session storage needed
- ✅ Horizontal scalability - any server can validate tokens
- ✅ Mobile-friendly
- ❌ Cannot invalidate tokens before expiration
- ❌ Larger request payloads

Sessions:
- ✅ Can invalidate immediately
- ✅ Smaller request size
- ❌ Requires session store (Redis/DB)
- ❌ Harder to scale horizontally

**Rationale:** JWT's stateless nature simplifies deployment and scaling. Token expiration can be kept short (7 days default) to mitigate the invalidation limitation.

## 3. Groq over OpenAI

**Decision:** Use Groq's LLaMA model for AI analysis.

**Alternatives Considered:**
- OpenAI GPT-4
- Anthropic Claude
- Local LLaMA deployment

**Trade-offs:**

Groq:
- ✅ Extremely fast inference (sub-second responses)
- ✅ Cost-effective pricing
- ✅ Good model quality (LLaMA 3.3 70B)
- ❌ Less brand recognition than OpenAI

OpenAI:
- ✅ Industry standard
- ✅ Excellent documentation
- ❌ Higher cost per token
- ❌ Slower response times

**Rationale:** Groq provides production-grade performance at a fraction of the cost while maintaining high quality. The speed advantage significantly improves user experience for meeting analysis.

## 4. Resend over SendGrid

**Decision:** Use Resend for email delivery.

**Alternatives Considered:**
- SendGrid
- AWS SES
- Postmark

**Trade-offs:**

Resend:
- ✅ Modern developer experience
- ✅ Excellent TypeScript SDK
- ✅ Simple pricing
- ✅ Fast setup
- ❌ Newer service (less proven at massive scale)

SendGrid:
- ✅ Mature and proven
- ✅ Advanced features (templates, analytics)
- ❌ More complex API
- ❌ Pricing can be unpredictable

**Rationale:** Resend's developer experience and modern SDK align perfectly with our TypeScript-first approach. For our use case (reminder emails), we don't need the advanced features of SendGrid.

## 5. node-cron over External Queue

**Decision:** Use node-cron for scheduling reminder jobs.

**Alternatives Considered:**
- Bull/BullMQ with Redis
- AWS EventBridge
- Separate worker service

**Trade-offs:**

node-cron:
- ✅ Simple setup - no additional infrastructure
- ✅ Built into the application
- ✅ Sufficient for hourly job frequency
- ❌ No job persistence across restarts
- ❌ Doesn't scale to multiple instances without coordination

Bull/BullMQ:
- ✅ Job persistence
- ✅ Distributed job processing
- ✅ Retry logic built-in
- ❌ Requires Redis
- ❌ More complex setup

**Rationale:** For hourly reminder checks, the simplicity of node-cron outweighs the benefits of a full job queue. If a job is missed during a restart, the next hourly run will catch it. This keeps infrastructure simple while meeting requirements.

## 6. Prisma over Raw SQL

**Decision:** Use Prisma ORM for database access.

**Alternatives Considered:**
- Raw SQL with pg library
- TypeORM
- Knex.js

**Trade-offs:**

Prisma:
- ✅ Type-safe database queries
- ✅ Excellent TypeScript support
- ✅ Auto-generated types from schema
- ✅ Modern migration system
- ❌ Learning curve for team

Raw SQL:
- ✅ Maximum control and performance
- ✅ No abstraction overhead
- ❌ No type safety
- ❌ Manual type definitions
- ❌ More boilerplate

**Rationale:** Prisma's type safety eliminates entire classes of bugs at compile time. The auto-generated types from the schema ensure the database and application code stay in sync.

## 7. ioredis for Caching

**Decision:** Use ioredis for Redis caching.

**Alternatives Considered:**
- In-memory caching (Map/LRU)
- Redis with node-redis

**Trade-offs:**

ioredis:
- ✅ Shared cache across instances
- ✅ Persistence between restarts
- ✅ Mature and performant
- ✅ TypeScript support
- ❌ Requires external Redis service

In-memory:
- ✅ No external dependencies
- ✅ Lowest latency
- ❌ Lost on restart
- ❌ Not shared across instances
- ❌ Limited by server memory

**Rationale:** Redis provides a balance of performance and scalability. The shared cache nature allows horizontal scaling while the 60-second TTL keeps data fresh without overwhelming the database.

## 8. Modular by Feature over Layered

**Decision:** Organize code by feature (auth, meetings, actionItems) rather than by layer (controllers, services, models).

**Alternatives Considered:**
- Traditional layered architecture (all controllers together, all services together)
- Domain-driven design with bounded contexts

**Trade-offs:**

Feature-based:
- ✅ High cohesion - related code is co-located
- ✅ Easy to locate functionality
- ✅ Clear module boundaries
- ✅ Facilitates team ownership
- ❌ Some code duplication across features

Layered:
- ✅ Clear separation of concerns
- ✅ Easy to apply cross-cutting changes
- ❌ Related code is scattered
- ❌ Harder to understand full feature flow

**Rationale:** Feature-based organization makes it easier for developers to work on complete features without jumping between distant files. Each module is a self-contained unit with its own routes, controller, service, and schemas.

## Future Considerations

### Potential Improvements:
1. **Bull/BullMQ** - If we need distributed job processing or higher job frequencies
2. **WebSockets** - For real-time meeting collaboration features
3. **Elasticsearch** - For advanced meeting transcript search
4. **Microservices** - If specific features need independent scaling
5. **GraphQL** - If frontend needs more flexible querying

These decisions can be revisited as requirements evolve and scale demands change.

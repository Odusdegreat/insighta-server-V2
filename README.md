# Insighta Labs+ Platform (Stage 4B)

This repository contains the backend for the Insighta Labs demographic intelligence project. In Stage 3, the Profile Intelligence Service was upgraded into a fully secure, multi-interface platform supporting both web browsers and CLI tools.

**Database:** MongoDB with Mongoose ODM (migrated from PostgreSQL/TypeORM)

Stage 4B implements system optimization and large-scale data ingestion to handle increased load (1M+ records, thousands of queries/minute).

## Key Features & Stage 3 Updates

### 1. Unified Authentication (OAuth + PKCE)
- **GitHub OAuth**: Users authenticate securely via their GitHub accounts.
- **PKCE Support**: Implemented the Proof Key for Code Exchange (PKCE) flow to ensure secure OAuth handshakes, preventing interception attacks.
- **Multi-Client Support**: The authentication flow seamlessly handles both:
  - **CLI Tools**: Returns tokens for local storage.
  - **Web Portal**: Automatically manages sessions via secure, `HttpOnly`, `SameSite=Lax` cookies to prevent XSS attacks.

### 2. Session Management & Security
- **JWT Rotation**: Access tokens (3-minute expiry) and refresh tokens (5-minute expiry).
- **Server-Side Revocation**: Refresh tokens are hashed and stored in the database, allowing immediate invalidation on logout or token rotation.
- **CSRF Protection**: Web sessions receive a CSRF token to protect state-changing requests.
- **Rate Limiting**: Protects endpoints against brute-force and DDoS attacks (10 requests/min for Auth, 60 requests/min globally).

### 3. Role-Based Access Control (RBAC)
- **Analyst Role**: Read-only access. Can search, filter, paginate, and export profiles.
- **Admin Role**: Full access. Can create new profiles and delete all profiles, in addition to analyst capabilities.
- Enforced strictly via a custom NestJS `@Roles()` guard across all protected endpoints.

### 4. API Standardization
- **API Versioning**: All profile endpoints strictly require the `X-API-Version: 1` header, enforced by an `ApiVersionGuard`.
- **HATEOAS Pagination**: Responses now include a standard `links` object (`self`, `next`, `prev`) dynamically generating query URLs for easier frontend and CLI pagination.
- **CSV Export**: A dedicated endpoint (`/api/profiles/export`) allows analysts and admins to download filtered profile segments as structured CSV data.
- **CSV Upload**: Admin-only endpoint (`POST /api/profiles/upload`) for bulk profile ingestion with streaming, validation, and detailed feedback.

---

## Stage 2 Features (Retained)

### Natural Language Parsing Approach
The `/api/profiles/search?q=...` endpoint uses rule-based parsing (no AI/LLM) to convert plain English strings into database filters. 

### How the Logic Works
The parsing works by looking for specific keywords and regex patterns in the user query and mapping them to `ProfileFilters` properties (`gender`, `min_age`, `max_age`, `age_group`, `country_id`). 

1. **Gender:**
   - **male**: Looks for "male", "men", "boy", "boys" `-> gender=male`
   - **female**: Looks for "female", "women", "girl", "girls" `-> gender=female`
2. **Age & Age Groups:**
   - **"young"**: Maps to ages 16-24 (`min_age=16`, `max_age=24`).
   - **"teenager(s)"**, **"adult(s)"**, **"senior(s)"**, **"child(ren)"**: Maps to `age_group`.
   - **"above X"**, **"under X"**, **"between X and Y"**: Parses direct numerical ranges.
3. **Country / Origin:**
   - Detects patterns like `from [Country Name]` or `in [Country Name]` and maps them to standard ISO-2 Codes.

---

## Stage 4B – System Optimization & Data Ingestion

Stage 4B focuses on performance optimization and scalable data ingestion for a system under pressure (1M+ records, high query volume).

### 1. Query Performance Optimization

**MongoDB Indexes** added for common query patterns:
- `{ gender: 1, age: 1 }` - Gender + age filtering
- `{ country_id: 1, age: 1 }` - Country + age filtering  
- `{ age_group: 1, gender: 1 }` - Age group + gender filtering
- `{ gender: 1, country_id: 1 }` - Gender + country filtering
- `{ age: 1 }` - Age-based queries
- `{ name: 1 }` (unique) - Idempotency check for ingestion

**In-Memory Cache** (`CacheService`):
- 5-minute TTL cache for query results
- Reduces redundant database calls for repeated queries
- Justification: Read-heavy workload with repeated queries; single-instance deployment

### 2. Query Normalization

**QueryNormalizerService** ensures semantically identical queries produce the same cache key:
- "Nigerian females between ages 20 and 45" and "Women aged 20–45 living in Nigeria" → same cache key
- Normalizes: lowercase genders, uppercase country codes, sorted keys, consistent numeric representation
- Deterministic, no AI/LLMs used

### 3. CSV Data Ingestion

**Endpoint:** `POST /api/profiles/upload` (admin only)

**Features:**
- Streaming processing with `csv-parser` (no full file in memory)
- Chunked inserts (1000 rows/chunk) for efficiency
- Concurrent upload support without blocking reads
- Partial failure handling: successful rows remain inserted

**Validation & Skipping:**
- Missing required fields → skipped
- Invalid age (negative, >150) → skipped  
- Invalid gender (not male/female/unknown) → skipped
- Duplicate name (idempotency) → skipped
- Malformed rows → skipped

**Response Format:**
```json
{
  "status": "success",
  "total_rows": 50000,
  "inserted": 48231,
  "skipped": 1769,
  "reasons": {
    "duplicate_name": 1203,
    "invalid_age": 312,
    "missing_fields": 254
  }
}
```

**Justification:** Streaming prevents memory overload with 500K-row files; chunked inserts reduce database pressure; partial failure handling ensures system resilience.

---

## Command Line Interface (CLI)

This platform includes a globally installable CLI tool that integrates directly with this backend API.
You can find the CLI source code and instructions in the `../insighta-cli` directory.

To install it:
```bash
cd ../insighta-cli
npm install
npm link
insighta --help
```

---

## Local Development Setup

1. Rename `.env.example` to `.env` (or create a `.env` file) and fill in the values:
   ```env
   MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/database
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   JWT_SECRET=your_super_secret_jwt_key
   BACKEND_URL=http://localhost:3000
   WEB_PORTAL_URL=http://localhost:3001
   NODE_ENV=development
   PORT=5000
   ```
2. Run `npm install`
3. Run `npm run start:dev`
4. Visit `http://localhost:5000/api/docs` to view the comprehensive, interactive Swagger documentation.

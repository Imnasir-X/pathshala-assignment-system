# Pathshala — Assignment & Submission Management System

A role-based assignment and submission management app (school/college) built as a recruitment project. ASP.NET Core Web API + PostgreSQL backend, Next.js/React/TypeScript frontend, JWT auth, and unit tests covering core business rules.

**Product name in the UI:** Pathshala (পাঠশালা).

## Features

### Role-Based Access (Admin, Teacher, Student)

- **Admin**: Manage users, classes/courses, subjects, and teacher-subject assignments. Read access to all assignments and submissions.
- **Teacher**: Create/update/delete assignments (draft or published) for their assigned class+subject. View and grade submissions with marks and feedback.
- **Student**: View published assignments for their class. Submit answers, update submissions before the deadline, and view grades and feedback.

### Business Rules Enforced

1. **Draft visibility**: Draft assignments are invisible to students.
2. **Class scoping**: Students can only see and submit to assignments for their own class.
3. **Deadline enforcement**: Submissions after the deadline are rejected.
4. **Submission ownership**: Students can only update their own submissions, and only before the deadline.
5. **Marks bounds**: Grading marks cannot exceed the assignment's max marks or be negative.
6. **Teacher ownership**: Teachers can only grade/view submissions for assignments they own.
7. **Backend-enforced authorization**: Every protected endpoint has `[Authorize(Roles=...)]` plus service-layer ownership checks.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | ASP.NET Core 9 Web API, C#, EF Core 9, PostgreSQL (Npgsql) |
| Auth | JWT Bearer tokens, BCrypt password hashing |
| Validation | FluentValidation |
| Logging | Serilog (console + rolling file) |
| API Docs | Swashbuckle (Swagger UI with JWT support) |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Forms | react-hook-form + zod |
| Tests | xUnit, Moq, EF Core In-Memory |

## Project Structure

```
assignment-system/
├── backend/
│   ├── AssignmentSystem.Api/          # ASP.NET Core Web API
│   │   ├── Controllers/               # Auth, Users, Classes, Subjects, Assignments, Submissions
│   │   ├── Services/                  # Business logic with rule enforcement
│   │   ├── Models/                    # EF Core entities
│   │   ├── Data/                      # AppDbContext, SeedData, Migrations
│   │   ├── DTOs/                      # Request/response DTOs
│   │   ├── Middleware/                # Global exception handler (RFC 7807)
│   │   ├── Exceptions/                # Typed domain exceptions
│   │   └── Program.cs                 # DI, auth, Swagger, migration config
│   └── AssignmentSystem.Tests/        # xUnit tests (28 tests, all passing)
├── frontend/                          # Next.js app
│   └── src/
│       ├── app/                       # Pages: login, admin/*, teacher/*, student/*
│       ├── lib/                       # API client, auth, types
│       └── middleware.ts              # Route protection by role
├── database/
│   └── setup.sql                      # Database creation script
├── .env.example
├── .gitignore
└── README.md
```

## Setup

### Prerequisites

- .NET 9 SDK
- Node.js 18+ (tested with Node 22)
- PostgreSQL 14+ (tested with PostgreSQL 17)

### 1. Database Setup

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE assignment_system;"

# Or use the provided script
psql -U postgres -f database/setup.sql
```

### 2. Backend Setup

```bash
cd backend/AssignmentSystem.Api

# Set your connection string and JWT secret (use environment variables or user-secrets)
# On Windows PowerShell:
$env:ConnectionStrings__DefaultConnection = "Host=localhost;Port=5432;Database=assignment_system;Username=postgres;Password=YOUR_PASSWORD"
$env:Jwt__Secret = "YourSuperSecretKeyMustBeAtLeast32CharsLong!!"
$env:ASPNETCORE_ENVIRONMENT = "Development"

# Apply migration and seed data (happens automatically on startup)
dotnet run
```

The API will be available at `http://localhost:5000` (or `https://localhost:5001`).
Swagger UI is available at `/swagger`.

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local  # Edit if your API URL differs
npm run dev
```

The frontend will be available at `http://localhost:3000`.

### 4. Run Tests

```bash
# From the repository root (where AssignmentSystem.sln lives)
dotnet test
```

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@edu.bd | Passw0rd! |
| Teacher | abdur.rahman@edu.bd | Passw0rd! |
| Student | sadia.islam@edu.bd | Passw0rd! |

These are seeded automatically on first run (in Development environment). Passwords are hashed with BCrypt in the database.

## API Endpoints

| Method & Route | Role | Description |
|---|---|---|
| `POST /api/auth/login` | Any | Authenticate and receive JWT |
| `GET/POST/PUT/DELETE /api/users` | Admin | User management |
| `GET/POST/PUT/DELETE /api/classes` | Admin | Class/course management |
| `GET/POST/PUT/DELETE /api/subjects` | Admin | Subject management |
| `GET /api/teacher-assignments` | Admin, Teacher | List teacher–subject–class links (teachers see only their own) |
| `POST/DELETE /api/teacher-assignments` | Admin | Assign / unassign teachers to subject+class |
| `GET /api/assignments` | All | Scoped by role (teacher sees own, student sees published+own class, admin sees all) |
| `POST /api/assignments` | Teacher | Create assignment (draft or published) |
| `PUT/DELETE /api/assignments/{id}` | Teacher (owner) | Update/delete own assignment |
| `GET /api/assignments/{id}/submissions` | Teacher (owner)/Admin | View submissions for assignment |
| `POST /api/submissions/{assignmentId}` | Student | Submit (enforces deadline + class scoping) |
| `PUT /api/submissions/{id}` | Student (owner) | Update before deadline |
| `PUT /api/submissions/{id}/grade` | Teacher (owner)/Admin | Grade with marks + feedback |
| `PUT /api/submissions/{id}/status` | Teacher (owner)/Admin | Change submission status (Submitted, Late, Graded, ReturnedForRevision) |
| `GET /api/submissions/mine` | Student | View own submissions |

## Test Coverage

28 unit tests covering all business rules:

- **Draft visibility**: Student list excludes drafts
- **Class scoping**: Student cannot submit to other class assignments
- **Deadline enforcement**: Submission after deadline throws `DeadlinePassedException`
- **Submission ownership**: Wrong student update throws `ForbiddenException`; Past deadline update throws `DeadlinePassedException`
- **Marks bounds**: Marks > maxMarks and negative marks throw `InvalidMarksException`
- **Teacher ownership**: Wrong teacher grading throws `ForbiddenException`
- **Duplicate submission**: One submission per student per assignment
- **Assignment CRUD**: Create, update, delete with ownership checks
- **Submission status**: Teacher can change submission status (e.g., Return for Revision)
- **Role scoping**: Teacher sees only own assignments; Student sees only published for own class; Admin sees all

## Assumptions

1. **Late submissions**: Not allowed. The deadline is a hard cutoff — submissions after the deadline are rejected. This simplifies the model and matches the most common real-world requirement.
2. **Re-grading**: Teachers can re-grade a submission (update marks/feedback after initial grading). This supports the workflow where a student requests a re-evaluation.
3. **One class per student**: Each student is enrolled in exactly one class. This is modeled via `StudentClassEnrollment` but the UI assumes a single class.
4. **One submission per student per assignment**: A unique constraint on `(AssignmentId, StudentId)` prevents multiple submissions. Updating the existing submission is the only way to revise.
5. **Admin grading**: Admins can grade any submission (bypassing teacher ownership) for operational flexibility, documented here explicitly.
6. **Token storage**: JWT is stored in `localStorage` for simplicity. This is a known XSS risk — for production, httpOnly cookies are preferred. This trade-off is documented for reviewers.

## Known Limitations

1. **Token storage**: Uses `localStorage` instead of httpOnly cookies. Acceptable for a demo project; would migrate to cookies for production.
2. **No frontend tests**: Backend has comprehensive unit tests; frontend testing (e.g., Playwright/Jest) is not included.
3. **No pagination UI**: Backend supports pagination, but the frontend loads up to 50 items per page without pagination controls.
4. **No file upload**: Submissions are text-only. File attachments would require additional storage and security considerations.
5. **No real-time updates**: No WebSocket/SSE for live submission notifications.
6. **PostgreSQL password**: The connection string requires the actual PostgreSQL password to be set via environment variable. The `.env.example` shows the placeholder.

## Quality Checklist

- [x] Backend builds and runs from README instructions
- [x] Frontend builds and runs from README instructions
- [x] Database created from EF Core migrations + automatic seed
- [x] Working demo credentials for Admin, Teacher, Student
- [x] `.env.example` present; no real secrets in repo
- [x] Every protected endpoint enforces role + ownership, verified by tests
- [x] `dotnet test` passes cleanly (28 tests, 0 failures)
- [x] Swagger UI with JWT authentication
- [x] Loading/error/empty states on every screen
- [x] Client-side form validation mirroring backend rules
- [x] Responsive layout (mobile + desktop)
- [x] No TODOs, placeholder text, or commented-out code
- [x] Assumptions documented

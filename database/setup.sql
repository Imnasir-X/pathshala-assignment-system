# Database setup script for PostgreSQL
# Run this before starting the backend

# Create the database (run as postgres user)
psql -U postgres -c "CREATE DATABASE assignment_system;"

# The EF Core migration will handle table creation automatically.
# Run from the backend/AssignmentSystem.Api directory:
#   dotnet ef database update
# Or just start the app — it auto-migrates on startup in Development.

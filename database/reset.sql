-- Database reset script for Assignment Management System
-- Run this in pgAdmin or psql to drop and recreate the database with fresh seed data
--
-- Usage:
--   psql -U postgres -f database/reset.sql
--
-- After running this script, start the backend with 'dotnet run'
-- and it will auto-migrate and seed the database with correct demo data.

-- Drop the existing database (this will delete all data!)
DROP DATABASE IF EXISTS assignment_system;

-- Create a fresh database
CREATE DATABASE assignment_system;

-- Done! Now run 'dotnet run' in the backend directory.
-- EF Core will auto-migrate and seed the data.

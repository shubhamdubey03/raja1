-- AMB-DMP-2026 Database Setup
-- Run: psql -U postgres -d amb_dmp_db -f setup_extensions.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Verify
SELECT extname, extversion FROM pg_extension WHERE extname IN ('uuid-ossp', 'pg_trgm');

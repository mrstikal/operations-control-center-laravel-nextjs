#!/bin/bash
# Docker initialization script pro OCC PostgreSQL

# Set PostgreSQL to use UTF-8
psql -U occ_user -d operations_control_center << 'EOF'
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Basic setup already done by postgres image
-- Database and user created via environment variables
EOF


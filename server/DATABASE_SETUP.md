# Database Setup Instructions

## Prerequisites
- Docker Desktop installed and running
- PostgreSQL connection configured in `.env` file

## Step 1: Start PostgreSQL Database

```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Verify it's running
docker ps | grep ghostaudit-postgres
```

## Step 2: Push Prisma Schema to Database

```bash
# From the server directory
npm run prisma:push
```

This will:
- Create all 4 tables: `RunBatch`, `AgentRun`, `AnomalyRecord`, `User`
- Set up all relationships and indexes
- Verify the `agent_concurrency` field exists in `RunBatch`

## Step 3: Test the Schema

```bash
# Run the schema test
npm run test:schema
```

This test will:
1. Verify database connection
2. Insert a test `RunBatch` with `agent_concurrency=2`
3. Verify all 4 tables exist
4. Confirm the `agent_concurrency` field works correctly
5. Clean up test data

## Step 4: Open Prisma Studio (Optional)

```bash
# Open Prisma Studio to view/edit data
npm run prisma:studio
```

Prisma Studio will open at `http://localhost:5555` where you can:
- View all tables
- Insert test data manually
- Verify the `agent_concurrency` field in `RunBatch`

## Database Schema Overview

### RunBatch
- Tracks each batch of 50 persona runs
- Key fields: `agent_concurrency`, `total_waves`, `current_wave`
- Status: QUEUED → RUNNING → COMPLETE/FAILED

### AgentRun
- Individual persona run within a batch
- Stores persona data, TinyFish run ID, results
- Links to parent `RunBatch`

### AnomalyRecord
- Detected anomalies from agent runs
- Tracks affected personas and evidence
- Links to parent `RunBatch`

### User
- API authentication
- Each user has unique `api_key`

## Troubleshooting

### Database connection error
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check logs
docker logs ghostaudit-postgres

# Restart container
docker-compose restart postgres
```

### Schema out of sync
```bash
# Regenerate Prisma Client
npm run prisma:generate

# Push schema again
npm run prisma:push
```

### Reset database (WARNING: Deletes all data)
```bash
# Stop and remove containers
docker-compose down -v

# Start fresh
docker-compose up -d postgres
npm run prisma:push
```

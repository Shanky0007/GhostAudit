# Handoff Instructions - Step 2.1 (Postgres Schema)

## Current Status
The Prisma schema is complete and ready to test. All code is written, just needs a database connection.

## What's Been Done
✅ Prisma schema created with 4 tables (RunBatch, AgentRun, AnomalyRecord, User)
✅ Database client with singleton pattern (`server/src/db/client.ts`)
✅ Test script ready (`server/src/db/test-schema.ts`)
✅ All npm scripts configured in `server/package.json`

## What You Need to Do

### 1. Set Up Cloud Database (5 minutes)
We're using **Neon** (free, no Docker needed):

1. Go to https://neon.tech
2. Sign up (GitHub login works)
3. Click "Create Project"
4. Copy the connection string (looks like: `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb`)
5. Open `.env` file in the root directory
6. Replace the `DATABASE_URL` line with your Neon connection string:
   ```
   DATABASE_URL=postgresql://your-neon-connection-string-here
   ```

### 2. Install Dependencies
```bash
npm install
```

### 3. Push Schema to Database
```bash
npm run prisma:push --workspace=server
```

Expected output: "Your database is now in sync with your Prisma schema."

### 4. Test with Prisma Studio
```bash
npm run prisma:studio --workspace=server
```

This opens http://localhost:5555

**In Prisma Studio:**
- Verify all 4 tables exist: `RunBatch`, `AgentRun`, `AnomalyRecord`, `User`
- Click on `RunBatch` table
- Click "Add record" button
- **Important:** Verify the `agent_concurrency` field exists in the form
- Fill in required fields:
  - `target_url`: "https://example.com"
  - `agent_concurrency`: 2
  - `total_waves`: 25
  - `persona_count`: 50
- Click "Save 1 change"
- Record should appear in the table

### 5. Verify No Errors
```bash
npm run prisma:push --workspace=server
```

Should show: "Database is already in sync, no schema change or pending migration was found."

### 6. Run Automated Test (Optional)
```bash
npm run test:schema --workspace=server
```

This will:
- Connect to database
- Insert a test RunBatch
- Verify `agent_concurrency` field works
- Clean up test data

## Files to Review
- `server/prisma/schema.prisma` - Database schema
- `server/src/db/client.ts` - Prisma client singleton
- `server/src/db/test-schema.ts` - Automated test script
- `server/DATABASE_SETUP.md` - Detailed setup guide

## Troubleshooting

**"Can't reach database server"**
- Check your `DATABASE_URL` in `.env` is correct
- Verify Neon project is active (check neon.tech dashboard)

**"Environment variable not found: DATABASE_URL"**
- Make sure `.env` file exists in root directory
- Run commands with `npm run` (not `npx` directly) - scripts use dotenv-cli

**Prisma Studio won't open**
- Check if port 5555 is already in use
- Try closing and reopening

## Next Steps
Once you confirm:
- ✅ All 4 tables exist in Prisma Studio
- ✅ `agent_concurrency` field is visible in RunBatch
- ✅ `npm run prisma:push` shows no errors

You're ready for **Step 2.2** (Wave Dispatcher implementation).

## Questions?
Check `server/DATABASE_SETUP.md` for more detailed instructions.

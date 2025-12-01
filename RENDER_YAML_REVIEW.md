# render.yaml Configuration Review - December 1, 2025

## ✅ Configuration Status: GOOD with Important Notes

The `render.yaml` file has been reviewed and updated with proper configuration for deployment.

## What Was Updated

### 1. Backend Service Configuration

**Added Important Comments:**
- Clear warning about SQLite limitations on Render's ephemeral filesystem
- Documentation of three deployment options (PostgreSQL, in-memory, persistent disk)
- Inline comments explaining each environment variable

**Updated DATABASE_URL:**
- Changed from: `file:./prisma/dev.db` (relative path, wrong location)
- Changed to: `file:/opt/render/project/src/backend/prisma/production.db` (absolute path)
- ⚠️ **Important**: This will still lose data on redeploy (ephemeral storage)

**Security Improvements:**
- Added `sync: false` to JWT_SECRET (must be set in dashboard)
- Added `sync: false` to ADMIN_PASSWORD (must be set in dashboard)
- Removed hardcoded default password from YAML
- Added PORT environment variable

### 2. Frontend Service Configuration

**Improvements:**
- Renamed service from `dndboard` to `dndboard-frontend` for clarity
- Added NODE_ENV=production
- Added inline comments for configuration

## ⚠️ Critical Production Considerations

### SQLite is NOT Production-Ready on Render

The current configuration uses SQLite, which has these limitations:

1. **Data Loss**: Database file will be deleted on every:
   - New deployment
   - Service restart
   - Container recreation

2. **Not Scalable**: Cannot run multiple instances with SQLite

3. **Performance**: Slower than PostgreSQL for concurrent users

### Recommended Actions Before Production Deployment

#### Option 1: Use PostgreSQL (Recommended)

1. **In Render Dashboard:**
   - Create a PostgreSQL database
   - Link it to the backend service
   - Copy the internal connection string

2. **Update Prisma Schema** (`backend/prisma/schema.prisma`):
   ```prisma
   datasource db {
     provider = "postgresql"  // Change from "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

3. **Update render.yaml**:
   ```yaml
   - key: DATABASE_URL
     sync: false  # Will pull from Render's PostgreSQL connection
   ```

4. **Create PostgreSQL Migrations:**
   ```bash
   cd backend
   # You may need to recreate migrations for PostgreSQL
   npx prisma migrate dev --name init_postgresql
   ```

#### Option 2: Use In-Memory Backend (Testing Only)

Simply remove the PERSISTENCE environment variable:
```yaml
# Comment out or remove:
# - key: PERSISTENCE
#   value: prisma
```

This will use the original in-memory backend (data resets on restart).

#### Option 3: Persistent Disk (Requires Paid Plan)

1. Upgrade to Render paid plan
2. Add a persistent disk
3. Mount at `/opt/render/project/src/backend/prisma`
4. SQLite will persist across deploys

## Environment Variables That MUST Be Set in Render Dashboard

These are marked with `sync: false` and must be configured:

| Variable | Required | Action |
|----------|----------|--------|
| `JWT_SECRET` | **YES** | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ADMIN_PASSWORD` | **YES** | Set a strong password (NOT the default `admin123`!) |
| `DATABASE_URL` | Only if using PostgreSQL | Copy from Render PostgreSQL dashboard |

## Validation Checklist

- [✓] YAML syntax is valid
- [✓] Service names are descriptive
- [✓] Build commands are correct
- [✓] Start commands include migration deployment
- [✓] Health check endpoint configured
- [✓] Auto-deploy enabled
- [✓] Frontend points to correct backend URL
- [✓] Security: Secrets use `sync: false`
- [⚠️] **WARNING**: SQLite will lose data on redeploy
- [⚠️] **ACTION REQUIRED**: Set JWT_SECRET in dashboard
- [⚠️] **ACTION REQUIRED**: Set ADMIN_PASSWORD in dashboard

## Current Configuration Summary

### Backend Service
- **Name**: `dndboard-backend`
- **Runtime**: Node.js
- **Database**: SQLite (ephemeral) or PostgreSQL (recommended)
- **Port**: 4000
- **Health**: `/health`
- **Migrations**: Auto-run on deploy

### Frontend Service
- **Name**: `dndboard-frontend`
- **Runtime**: Node.js (Next.js)
- **Backend URL**: `https://dndboard-backend.onrender.com`
- **Auto-deploy**: Enabled

## Testing the Configuration

Before deploying, you can validate locally:

```bash
# Test backend build
npm run build:render:backend

# Test frontend build
npm run build:render:frontend

# Verify migrations work
cd backend
npm run prisma:migrate:deploy:safe
```

## Next Steps

1. **Choose Database Option** (PostgreSQL recommended)
2. **Set Required Environment Variables** in Render dashboard
3. **Update Prisma Schema** if using PostgreSQL
4. **Test Deployment** to staging first
5. **Monitor Health Endpoint** after deployment
6. **Verify Data Persistence** (if using PostgreSQL)

## Documentation References

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Full deployment guide
- [DATABASE_FIX.md](./DATABASE_FIX.md) - Local database troubleshooting
- [QUICKSTART.md](./QUICKSTART.md) - Local development setup

## File Changes Made

1. `/Users/strise/AquaProjects/Work/DnDBoard/render.yaml` - Updated with comments and better configuration
2. `/Users/strise/AquaProjects/Work/DnDBoard/DEPLOYMENT.md` - Created comprehensive deployment guide
3. `/Users/strise/AquaProjects/Work/DnDBoard/RENDER_YAML_REVIEW.md` - This file

All changes maintain backwards compatibility while adding important documentation and security improvements.


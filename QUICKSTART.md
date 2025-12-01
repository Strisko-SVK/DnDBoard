# Quick Start Guide - DnD Quest Board

## First Time Setup

### 1. Install Dependencies
```bash
cd /Users/strise/AquaProjects/Work/DnDBoard
npm install
```

### 2. Build Shared Package
```bash
npm -w shared run build
```

### 3. Configure Backend (Optional - for Prisma)

If you're using the Prisma backend, update the DATABASE_URL in `backend/.env`:

```env
# Update this to your actual path
DATABASE_URL=file:/Users/YOUR_USERNAME/path/to/DnDBoard/backend/prisma/dev.db
```

The current configuration uses an absolute path. You can find the correct path by running:
```bash
cd backend && pwd
# Then append /prisma/dev.db to the output
```

## Running the Application

### Option 1: In-Memory Backend (Default)
```bash
npm run dev
```

### Option 2: Prisma Backend (Persistent Database)
```bash
npm run dev:prisma
```

### Option 3: Backend Only
```bash
# In-memory
npm run backend:dev

# Prisma
npm run backend:dev:prisma
```

### Option 4: Frontend Only
```bash
npm run frontend:dev
```

## Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:4000
- **Health Check:** http://localhost:4000/health

## Default Login Credentials

| Email | Password |
|-------|----------|
| `admin@example.com` | `admin123` |

**⚠️ WARNING:** Change these in production!

## Available Scripts (from root)

| Script | Description |
|--------|-------------|
| `npm run dev` | Run all services (in-memory backend) |
| `npm run dev:prisma` | Run all services (Prisma backend) |
| `npm run backend:dev` | Backend only (in-memory) |
| `npm run backend:dev:prisma` | Backend only (Prisma) |
| `npm run frontend:dev` | Frontend only |
| `npm run build` | Build all packages for production |
| `npm run smoke` | Run smoke tests against in-memory backend |
| `npm run smoke:prisma` | Run smoke tests against Prisma backend |

## Troubleshooting

### Database Connection Error
If you see "Error code 14: Unable to open the database file":
1. Check that `DATABASE_URL` in `backend/.env` uses an absolute path
2. Verify the database file exists: `ls backend/prisma/dev.db`
3. See [DATABASE_FIX.md](./DATABASE_FIX.md) for detailed troubleshooting

### Port Already in Use
If port 4000 or 3000 is already in use:
1. Kill existing processes: `pkill -f "ts-node-dev"` or `pkill -f "next dev"`
2. Or change the port in `backend/.env` (PORT=4001) and `frontend/.env.local`

### Module Not Found
If you see module resolution errors:
1. Make sure shared package is built: `npm -w shared run build`
2. Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`

## Next Steps

1. **Login:** Navigate to http://localhost:3000/login
2. **Create a Board:** Use the default admin account
3. **Add Quests:** Create quest cards for your campaign
4. **Invite Players:** Share board access with your party
5. **Accept Quests:** Players can browse and accept quests
6. **Track Progress:** View accepted quests in the Inventory

## Development Workflow

1. Make changes to code
2. Services auto-reload via ts-node-dev and Next.js
3. Test in browser
4. Run smoke tests: `npm run smoke:prisma`
5. Commit changes

## Database Management (Prisma)

### View Database Contents
```bash
cd backend
sqlite3 prisma/dev.db
.tables
SELECT * FROM User;
.quit
```

### Reset Database
```bash
cd backend
rm prisma/dev.db
npm run prisma:migrate
```

### Create New Migration
```bash
cd backend
# Edit prisma/schema.prisma
npm run prisma:migrate
```

## Additional Resources

- [Full Specification](./specs/specV1.md) - Complete product spec
- [Implementation Guide](./IMPLEMENTATION_COMPLETE.md) - Feature overview
- [Theme Guide](./THEME_GUIDE.md) - UI/UX theming details
- [Database Fix](./DATABASE_FIX.md) - Database troubleshooting


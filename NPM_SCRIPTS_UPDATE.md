# NPM Scripts Update - December 1, 2025

## Problem

User tried to run `npm run dev:prisma` from the root directory but got an error:
```
npm error Missing script: "dev:prisma"
```

The script existed in `backend/package.json` but not in the root `package.json`.

## Solution

Added new convenience scripts to the root `package.json` to run Prisma backend from the root directory:

### Scripts Added

```json
{
  "dev:prisma": "npm -w shared run build && concurrently -n SHARED,BACKEND,FRONTEND -c blue,green,magenta \"npm -w shared run dev\" \"npm -w backend run dev:prisma\" \"npm -w frontend run dev\"",
  "backend:dev": "npm -w backend run dev",
  "backend:dev:prisma": "npm -w backend run dev:prisma",
  "frontend:dev": "npm -w frontend run dev"
}
```

### Usage

From the root directory (`/Users/strise/AquaProjects/Work/DnDBoard`):

**Full application with Prisma backend:**
```bash
npm run dev:prisma
```

**Full application with in-memory backend:**
```bash
npm run dev
```

**Backend only (in-memory):**
```bash
npm run backend:dev
```

**Backend only (Prisma):**
```bash
npm run backend:dev:prisma
```

**Frontend only:**
```bash
npm run frontend:dev
```

## Documentation Updates

### 1. Updated README.md
- Added section on running with Prisma backend
- Added database configuration instructions
- Added backend-only script examples
- Added note about DATABASE_URL absolute path requirement
- Added reference to DATABASE_FIX.md

### 2. Created QUICKSTART.md
- Complete first-time setup guide
- All available scripts documented
- Troubleshooting section
- Database management commands
- Development workflow

### 3. Created DATABASE_FIX.md
Previously created to document the database connection issue and fix.

## Verification

All scripts work correctly:
- ✅ `npm run dev:prisma` - Starts all services with Prisma backend
- ✅ Backend responds on http://localhost:4000
- ✅ Frontend responds on http://localhost:3000
- ✅ Database connection working with absolute path

## Files Modified

1. `/Users/strise/AquaProjects/Work/DnDBoard/package.json` - Added new scripts
2. `/Users/strise/AquaProjects/Work/DnDBoard/README.md` - Updated documentation
3. `/Users/strise/AquaProjects/Work/DnDBoard/QUICKSTART.md` - Created new guide
4. `/Users/strise/AquaProjects/Work/DnDBoard/DATABASE_FIX.md` - Previously created

## Notes

The workspace setup uses npm workspaces with the `-w` flag to run scripts in specific packages:
- `-w shared` - Runs scripts in the shared package
- `-w backend` - Runs scripts in the backend package
- `-w frontend` - Runs scripts in the frontend package

The `concurrently` package is used to run multiple services simultaneously with colored output for easy debugging.


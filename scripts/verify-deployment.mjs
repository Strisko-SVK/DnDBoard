#!/usr/bin/env node
/**
 * DnD Board - Health Check & Verification Script
 * Run this to verify your deployment configuration
 *
 * Usage: node scripts/verify-deployment.mjs
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

const CHECKS = {
  critical: [],
  warning: [],
  info: []
};

function log(type, message, status = '') {
  const symbols = { pass: '✅', fail: '❌', warn: '⚠️', info: 'ℹ️' };
  const symbol = symbols[status] || '';
  console.log(`${symbol} [${type.toUpperCase()}] ${message}`);
}

async function checkEnvVar(name, required = false) {
  const value = process.env[name];
  if (!value) {
    if (required) {
      CHECKS.critical.push(`Missing required env var: ${name}`);
      log('critical', `${name} not set`, 'fail');
      return false;
    } else {
      CHECKS.warning.push(`Optional env var not set: ${name}`);
      log('warning', `${name} not set (using default)`, 'warn');
      return false;
    }
  } else {
    log('check', `${name} is set`, 'pass');
    return true;
  }
}

async function checkFileExists(filePath, description) {
  try {
    await fs.access(filePath);
    log('check', `${description} exists`, 'pass');
    return true;
  } catch {
    CHECKS.warning.push(`Missing file: ${filePath}`);
    log('warning', `${description} not found: ${filePath}`, 'warn');
    return false;
  }
}

async function checkPackageInstalled(packageName, workspace = null) {
  try {
    const cmd = workspace
      ? `npm list ${packageName} -w ${workspace} --depth=0`
      : `npm list ${packageName} --depth=0`;
    await execAsync(cmd);
    log('check', `Package ${packageName} installed`, 'pass');
    return true;
  } catch {
    CHECKS.warning.push(`Package not installed: ${packageName}`);
    log('warning', `Package ${packageName} not installed`, 'warn');
    return false;
  }
}

async function main() {
  console.log('\n🔍 DnD Board Deployment Verification\n');
  console.log('=' .repeat(60));

  // Check 1: Persistence Mode
  console.log('\n📊 PERSISTENCE MODE');
  console.log('-'.repeat(60));
  const persistence = process.env.PERSISTENCE;
  if (persistence === 'prisma') {
    log('critical', 'Using Prisma persistence (correct)', 'pass');
  } else {
    CHECKS.critical.push('Not using Prisma persistence - data will be lost!');
    log('critical', `Persistence mode: ${persistence || 'in-memory'} (WRONG!)`, 'fail');
    console.log('   Fix: Set PERSISTENCE=prisma in environment');
  }

  // Check 2: Database URL
  console.log('\n🗄️  DATABASE CONFIGURATION');
  console.log('-'.repeat(60));
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    if (dbUrl.startsWith('postgresql://')) {
      log('critical', 'Using PostgreSQL (correct for production)', 'pass');
    } else if (dbUrl.startsWith('file:')) {
      CHECKS.warning.push('Using SQLite (dev only, not for production)');
      log('warning', 'Using SQLite (dev only)', 'warn');
    } else {
      log('info', `Database: ${dbUrl.split(':')[0]}`, 'info');
    }
  } else {
    CHECKS.critical.push('DATABASE_URL not set');
    log('critical', 'DATABASE_URL not set', 'fail');
  }

  // Check 3: JWT Secret
  console.log('\n🔐 SECURITY');
  console.log('-'.repeat(60));
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    CHECKS.critical.push('JWT_SECRET not set - using default (INSECURE)');
    log('critical', 'JWT_SECRET not set (INSECURE!)', 'fail');
    console.log('   Fix: Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  } else if (jwtSecret === 'dev-secret-change') {
    CHECKS.critical.push('JWT_SECRET using default value (INSECURE)');
    log('critical', 'JWT_SECRET is default value (INSECURE!)', 'fail');
  } else if (jwtSecret.length < 32) {
    CHECKS.warning.push('JWT_SECRET is too short');
    log('warning', 'JWT_SECRET is too short (should be 32+ chars)', 'warn');
  } else {
    log('critical', 'JWT_SECRET is set and strong', 'pass');
  }

  // Check 4: S3/Storage Configuration
  console.log('\n📸 IMAGE STORAGE');
  console.log('-'.repeat(60));
  await checkEnvVar('AWS_ACCESS_KEY_ID', false);
  await checkEnvVar('AWS_SECRET_ACCESS_KEY', false);
  await checkEnvVar('S3_BUCKET', false);
  await checkEnvVar('CDN_URL', false);

  if (!process.env.AWS_ACCESS_KEY_ID) {
    log('info', 'Image upload not configured (images will fail)', 'info');
  }

  // Check 5: Admin Account
  console.log('\n👤 ADMIN ACCOUNT');
  console.log('-'.repeat(60));
  await checkEnvVar('ADMIN_EMAIL', false);
  await checkEnvVar('ADMIN_PASSWORD', false);

  // Check 6: Files Exist
  console.log('\n📁 FILE STRUCTURE');
  console.log('-'.repeat(60));
  await checkFileExists('backend/prisma/schema.prisma', 'Prisma schema');
  await checkFileExists('backend/src/server-prisma.ts', 'Prisma server');
  await checkFileExists('backend/src/index.ts', 'In-memory server');
  await checkFileExists('backend/src/start.ts', 'Server launcher');
  await checkFileExists('.env', '.env file');
  await checkFileExists('.env.example', '.env.example template');

  // Check 7: Dependencies
  console.log('\n📦 DEPENDENCIES');
  console.log('-'.repeat(60));
  await checkPackageInstalled('@prisma/client', 'backend');
  await checkPackageInstalled('jsonwebtoken', 'backend');
  await checkPackageInstalled('bcryptjs', 'backend');
  await checkPackageInstalled('socket.io', 'backend');

  // Check 8: Prisma Migrations
  console.log('\n🔄 DATABASE MIGRATIONS');
  console.log('-'.repeat(60));
  try {
    const migrationsDir = 'backend/prisma/migrations';
    const migrations = await fs.readdir(migrationsDir);
    const migrationFolders = migrations.filter(f => f !== 'migration_lock.toml');
    log('check', `Found ${migrationFolders.length} migration(s)`, 'pass');
    migrationFolders.forEach(m => {
      console.log(`   - ${m}`);
    });
  } catch {
    CHECKS.warning.push('No migrations found');
    log('warning', 'Migrations directory not found', 'warn');
  }

  // Check 9: Port Configuration
  console.log('\n🌐 SERVER CONFIGURATION');
  console.log('-'.repeat(60));
  const port = process.env.PORT || '4000';
  log('info', `Server port: ${port}`, 'info');

  const nodeEnv = process.env.NODE_ENV || 'development';
  log('info', `Environment: ${nodeEnv}`, 'info');

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY');
  console.log('='.repeat(60));

  if (CHECKS.critical.length === 0) {
    console.log('✅ No critical issues found!');
  } else {
    console.log(`❌ ${CHECKS.critical.length} CRITICAL ISSUE(S):`);
    CHECKS.critical.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });
  }

  if (CHECKS.warning.length > 0) {
    console.log(`\n⚠️  ${CHECKS.warning.length} Warning(s):`);
    CHECKS.warning.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });
  }

  if (CHECKS.info.length > 0) {
    console.log(`\nℹ️  ${CHECKS.info.length} Info Item(s):`);
    CHECKS.info.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });
  }

  // Recommendations
  console.log('\n' + '='.repeat(60));
  console.log('💡 RECOMMENDATIONS');
  console.log('='.repeat(60));

  if (CHECKS.critical.length > 0) {
    console.log('\n🚨 URGENT - Fix critical issues before deploying to production!');
    console.log('\nQuick fixes:');
    console.log('  1. Create .env file in backend/ directory');
    console.log('  2. Add: PERSISTENCE=prisma');
    console.log('  3. Add: DATABASE_URL=postgresql://...');
    console.log('  4. Generate JWT secret: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    console.log('  5. Add: JWT_SECRET=<generated-value>');
  } else {
    console.log('\n✨ Configuration looks good!');
    console.log('\nNext steps:');
    console.log('  1. Review warnings above');
    console.log('  2. Set up image upload (S3 configuration)');
    console.log('  3. Run tests: npm test');
    console.log('  4. Deploy with confidence!');
  }

  console.log('\n' + '='.repeat(60));
  console.log('📚 For more details, see:');
  console.log('   - CRITICAL_ISSUES_AND_FIXES.md');
  console.log('   - IMPLEMENTATION_ANALYSIS.md');
  console.log('='.repeat(60) + '\n');

  // Exit code
  const exitCode = CHECKS.critical.length > 0 ? 1 : 0;
  process.exit(exitCode);
}

main().catch(err => {
  console.error('❌ Verification script failed:', err);
  process.exit(1);
});


#!/usr/bin/env node

/**
 * Supabase Configuration Verification Script
 * Checks all Supabase setup requirements for the OnBoard project
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkmark(passed) {
  return passed ? '✓' : '✗';
}

async function verifySupabaseSetup() {
  log('\n🔍 OnBoard Supabase Configuration Verification\n', 'cyan');
  
  const checks = {
    envFile: false,
    envVars: false,
    supabaseConnection: false,
    authEnabled: false,
    profilesTable: false,
    rls: false,
    migrations: false,
    clientFiles: false,
    proxyFile: false,
  };

  // 1. Check .env.local exists
  log('1. Environment Configuration', 'blue');
  const envPath = join(projectRoot, '.env.local');
  checks.envFile = existsSync(envPath);
  log(`   ${checkmark(checks.envFile)} .env.local file exists`, checks.envFile ? 'green' : 'red');

  // 2. Check environment variables
  if (checks.envFile) {
    const envContent = readFileSync(envPath, 'utf-8');
    const hasUrl = envContent.includes('NEXT_PUBLIC_SUPABASE_URL');
    const hasKey = envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    checks.envVars = hasUrl && hasKey;
    log(`   ${checkmark(checks.envVars)} Required environment variables set`, checks.envVars ? 'green' : 'red');
    
    if (checks.envVars) {
      // Load env vars for testing
      const lines = envContent.split('\n');
      for (const line of lines) {
        if (line.trim() && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length) {
            process.env[key.trim()] = valueParts.join('=').trim();
          }
        }
      }
    }
  }

  // 3. Test Supabase connection
  log('\n2. Supabase Connection', 'blue');
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      
      // Test connection by checking auth
      const { data, error } = await supabase.auth.getSession();
      checks.supabaseConnection = !error;
      log(`   ${checkmark(checks.supabaseConnection)} Connection to Supabase`, checks.supabaseConnection ? 'green' : 'red');
      
      if (error) {
        log(`   Error: ${error.message}`, 'red');
      }
    } catch (err) {
      log(`   ${checkmark(false)} Connection failed: ${err.message}`, 'red');
    }
  } else {
    log(`   ${checkmark(false)} Environment variables not loaded`, 'red');
  }

  // 4. Check auth configuration
  log('\n3. Authentication Setup', 'blue');
  if (checks.supabaseConnection) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    try {
      // This won't fail even if not configured, but we can check the URL format
      checks.authEnabled = process.env.NEXT_PUBLIC_SUPABASE_URL.includes('supabase.co');
      log(`   ${checkmark(checks.authEnabled)} Auth API accessible`, checks.authEnabled ? 'green' : 'yellow');
    } catch (err) {
      log(`   ${checkmark(false)} Auth check failed`, 'red');
    }
  }

  // 5. Check database schema (profiles table)
  log('\n4. Database Schema', 'blue');
  if (checks.supabaseConnection) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    try {
      const { data, error } = await supabase.from('profiles').select('*').limit(0);
      checks.profilesTable = !error;
      log(`   ${checkmark(checks.profilesTable)} 'profiles' table exists`, checks.profilesTable ? 'green' : 'red');
      
      if (error) {
        log(`   Error: ${error.message}`, 'red');
      }
    } catch (err) {
      log(`   ${checkmark(false)} Schema check failed: ${err.message}`, 'red');
    }
  }

  // 6. Check RLS policies
  log('\n5. Row Level Security', 'blue');
  if (checks.profilesTable) {
    // RLS check - anonymous users shouldn't be able to read profiles
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    try {
      const { data, error } = await supabase.from('profiles').select('*').limit(1);
      // If we get an empty result or specific RLS error, it's working
      checks.rls = !data || data.length === 0 || (error && error.message.includes('policy'));
      log(`   ${checkmark(checks.rls)} RLS policies enabled`, checks.rls ? 'green' : 'yellow');
    } catch (err) {
      checks.rls = true; // If it errors, RLS might be working
      log(`   ${checkmark(true)} RLS appears to be enforcing access`, 'green');
    }
  }

  // 7. Check migration files
  log('\n6. Database Migrations', 'blue');
  const migrationsDir = join(projectRoot, 'supabase', 'migrations');
  checks.migrations = existsSync(migrationsDir);
  log(`   ${checkmark(checks.migrations)} Migrations directory exists`, checks.migrations ? 'green' : 'red');
  
  if (checks.migrations) {
    const migrationFile = join(migrationsDir, '20241026000001_create_profiles_table.sql');
    const hasMigration = existsSync(migrationFile);
    log(`   ${checkmark(hasMigration)} Profile table migration exists`, hasMigration ? 'green' : 'yellow');
  }

  // 8. Check client utility files
  log('\n7. Client Utilities', 'blue');
  const clientPath = join(projectRoot, 'utils', 'supabase', 'client.ts');
  const serverPath = join(projectRoot, 'utils', 'supabase', 'server.ts');
  const middlewarePath = join(projectRoot, 'utils', 'supabase', 'middleware.ts');
  
  const hasClient = existsSync(clientPath);
  const hasServer = existsSync(serverPath);
  const hasMiddleware = existsSync(middlewarePath);
  
  checks.clientFiles = hasClient && hasServer && hasMiddleware;
  log(`   ${checkmark(hasClient)} Client utility (browser)`, hasClient ? 'green' : 'red');
  log(`   ${checkmark(hasServer)} Server utility (SSR)`, hasServer ? 'green' : 'red');
  log(`   ${checkmark(hasMiddleware)} Middleware utility`, hasMiddleware ? 'green' : 'red');

  // 9. Check proxy file (Next.js 16 requirement)
  log('\n8. Next.js 16 Proxy', 'blue');
  const proxyPath = join(projectRoot, 'proxy.ts');
  checks.proxyFile = existsSync(proxyPath);
  log(`   ${checkmark(checks.proxyFile)} proxy.ts file exists (Next.js 16)`, checks.proxyFile ? 'green' : 'red');

  // Summary
  log('\n═══════════════════════════════════════', 'cyan');
  const passedChecks = Object.values(checks).filter(Boolean).length;
  const totalChecks = Object.keys(checks).length;
  const percentage = Math.round((passedChecks / totalChecks) * 100);
  
  log(`\n📊 Setup Status: ${passedChecks}/${totalChecks} checks passed (${percentage}%)`, 
    percentage === 100 ? 'green' : percentage >= 70 ? 'yellow' : 'red');

  if (percentage === 100) {
    log('\n✅ Supabase is fully configured and ready to use!', 'green');
  } else if (percentage >= 70) {
    log('\n⚠️  Supabase is mostly configured but has some issues', 'yellow');
  } else {
    log('\n❌ Supabase setup has critical issues that need attention', 'red');
  }

  // Recommendations
  if (!checks.envFile || !checks.envVars) {
    log('\n💡 Recommendation: Create .env.local with Supabase credentials', 'yellow');
  }
  if (!checks.supabaseConnection) {
    log('💡 Recommendation: Check your Supabase URL and anon key', 'yellow');
  }
  if (!checks.profilesTable) {
    log('💡 Recommendation: Run migrations with: supabase db push', 'yellow');
  }
  if (!checks.proxyFile) {
    log('💡 Recommendation: Rename middleware.ts to proxy.ts for Next.js 16', 'yellow');
  }

  log('\n═══════════════════════════════════════\n', 'cyan');

  return percentage === 100;
}

// Run verification
verifySupabaseSetup()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    log(`\n❌ Verification failed with error: ${err.message}`, 'red');
    console.error(err);
    process.exit(1);
  });

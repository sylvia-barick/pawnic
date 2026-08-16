const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');

console.log('🔍 Checking environment variables configuration...');

if (!fs.existsSync(envPath)) {
  console.warn('⚠️  Warning: No .env file found at project root.');
  console.info('👉 Hint: Copy .env.example to .env and configure your keys to run locally.');
  process.exit(0);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split(/\r?\n/).forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
      value = value.substring(1, value.length - 1);
    }
    envVars[key] = value.trim();
  }
});

const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_STELLAR_VAULT_PUBLIC_KEY',
  'STELLAR_VAULT_SECRET_KEY'
];

let hasErrors = false;

requiredVars.forEach((key) => {
  const value = envVars[key];
  if (!value) {
    console.error(`❌ Missing variable: ${key}`);
    hasErrors = true;
  } else {
    if (key === 'NEXT_PUBLIC_SUPABASE_URL' && !value.startsWith('http')) {
      console.error(`❌ Invalid format for ${key}: Must be a URL starting with http:// or https://`);
      hasErrors = true;
    } else if (key === 'NEXT_PUBLIC_STELLAR_VAULT_PUBLIC_KEY') {
      if (value.length !== 56 || !value.startsWith('G')) {
        console.error(`❌ Invalid Stellar Public Key in ${key}. Must be 56 characters and start with 'G'`);
        hasErrors = true;
      }
    } else if (key === 'STELLAR_VAULT_SECRET_KEY') {
      if (value.length !== 56 || !value.startsWith('S')) {
        console.error(`❌ Invalid Stellar Secret Key in ${key}. Must be 56 characters and start with 'S'`);
        hasErrors = true;
      }
    } else {
      console.log(`✅ ${key} is set.`);
    }
  }
});

if (hasErrors) {
  console.log('\n❌ Environment check failed. Fix the issues listed above.');
  process.exit(1);
} else {
  console.log('\n🚀 All environment variables look correct! Ready to run.');
  process.exit(0);
}

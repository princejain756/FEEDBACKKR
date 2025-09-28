require('dotenv').config();
const { execSync } = require('child_process');

const envVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY', 
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_JWT_SECRET',
  'POSTGRES_URL',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_HOST',
  'POSTGRES_DATABASE',
  'REACT_APP_SUPABASE_URL',
  'REACT_APP_SUPABASE_ANON_KEY'
];

console.log('🔧 Setting up Vercel environment variables...');

envVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value) {
    try {
      console.log(`📝 Adding ${envVar}...`);
      execSync(`echo "${value}" | vercel env add ${envVar} production`, { 
        stdio: 'pipe',
        timeout: 10000 
      });
      console.log(`✅ ${envVar} added successfully`);
    } catch (error) {
      console.log(`⚠️  ${envVar} might already exist or there was an issue`);
    }
  } else {
    console.log(`❌ ${envVar} not found in .env file`);
  }
});

console.log('\n🎉 Environment variable setup complete!');
console.log('🚀 You can now deploy with: vercel --prod');

#!/bin/bash

# Script to set up Vercel environment variables for Supabase integration
echo "🔧 Setting up Vercel environment variables..."

# Load environment variables from .env file
if [ -f .env ]; then
    source .env
else
    echo "❌ .env file not found. Please make sure it exists."
    exit 1
fi

echo "📝 Adding environment variables to Vercel..."

# Set Supabase environment variables
echo "$SUPABASE_URL" | vercel env add SUPABASE_URL production
echo "$SUPABASE_ANON_KEY" | vercel env add SUPABASE_ANON_KEY production
echo "$SUPABASE_SERVICE_ROLE_KEY" | vercel env add SUPABASE_SERVICE_ROLE_KEY production
echo "$SUPABASE_JWT_SECRET" | vercel env add SUPABASE_JWT_SECRET production

# Set PostgreSQL environment variables (for direct DB access if needed)
echo "$POSTGRES_URL" | vercel env add POSTGRES_URL production
echo "$POSTGRES_USER" | vercel env add POSTGRES_USER production
echo "$POSTGRES_PASSWORD" | vercel env add POSTGRES_PASSWORD production
echo "$POSTGRES_HOST" | vercel env add POSTGRES_HOST production
echo "$POSTGRES_DATABASE" | vercel env add POSTGRES_DATABASE production

# Set React environment variables
echo "$REACT_APP_SUPABASE_URL" | vercel env add REACT_APP_SUPABASE_URL production
echo "$REACT_APP_SUPABASE_ANON_KEY" | vercel env add REACT_APP_SUPABASE_ANON_KEY production

echo "✅ Environment variables set up successfully!"
echo "🚀 You can now deploy with: vercel --prod"

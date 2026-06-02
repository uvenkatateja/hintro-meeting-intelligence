#!/bin/bash

# Hintro Setup Script
echo "🚀 Setting up Hintro Meeting Intelligence Service..."

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "❌ Node.js 20 or higher is required. Current version: $(node -v)"
  exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Check if .env exists
if [ ! -f .env ]; then
  echo "📝 Creating .env file from .env.example..."
  cp .env.example .env
  echo "⚠️  Please update .env with your actual values!"
else
  echo "✅ .env file already exists"
fi

# Run database migrations
echo "🗄️  Running database migrations..."
if npx prisma migrate deploy 2>/dev/null; then
  echo "✅ Database migrations completed"
else
  echo "⚠️  Could not run migrations. Make sure DATABASE_URL is set correctly in .env"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your actual credentials"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Visit http://localhost:3000/api/docs for API documentation"
echo ""

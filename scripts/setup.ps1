# Hintro Setup Script for Windows PowerShell

Write-Host "🚀 Setting up Hintro Meeting Intelligence Service..." -ForegroundColor Green

# Check Node version
$nodeVersion = node -v
$versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
if ($versionNumber -lt 20) {
    Write-Host "❌ Node.js 20 or higher is required. Current version: $nodeVersion" -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

# Generate Prisma Client
Write-Host "🔧 Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate

# Check if .env exists
if (-not (Test-Path .env)) {
    Write-Host "📝 Creating .env file from .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "⚠️  Please update .env with your actual values!" -ForegroundColor Yellow
} else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
}

# Run database migrations
Write-Host "🗄️  Running database migrations..." -ForegroundColor Yellow
try {
    npx prisma migrate deploy 2>$null
    Write-Host "✅ Database migrations completed" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not run migrations. Make sure DATABASE_URL is set correctly in .env" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Update .env with your actual credentials"
Write-Host "2. Run 'npm run dev' to start the development server"
Write-Host "3. Visit http://localhost:3000/api/docs for API documentation"
Write-Host ""

# Build and Test Guide

This guide explains how to build and test the NestJS application.

## 📦 Building the Project

### 1. Build the Application
```bash
npm run build
```
This command:
- Compiles TypeScript to JavaScript
- Outputs to the `dist/` directory
- Generates source maps for debugging
- Copies assets (like templates) to the dist folder

### 2. Verify Build Output
After building, check that the `dist/` directory contains:
- Compiled JavaScript files (`.js`)
- TypeScript declaration files (`.d.ts`)
- Source maps (`.js.map`)
- Main entry point: `dist/main.js`

```bash
# Check if dist/main.js exists
ls -la dist/main.js

# Or on Windows
dir dist\main.js
```

## 🚀 Testing the Build

### Option 1: Run Production Build Locally
```bash
# First, ensure you have built the project
npm run build

# Then run the production build
npm run start:prod
```

This will:
- Start the server using the compiled JavaScript from `dist/`
- Use Node.js directly (no TypeScript compilation)
- Show database configuration logs
- Display the port the server is running on

### Option 2: Test Build Without Starting Server
You can verify the build compiles without errors:
```bash
# Build and check for errors
npm run build

# If successful, you'll see output like:
# "Nest application successfully built"
```

## 🧪 Running Tests

### Unit Tests
```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:cov
```

### E2E Tests
```bash
# Run end-to-end tests
npm run test:e2e
```

## ✅ Complete Build Test Workflow

Here's a complete workflow to test your build:

```bash
# 1. Clean previous build (optional)
rm -rf dist

# 2. Install dependencies (if needed)
npm install

# 3. Build the project
npm run build

# 4. Verify build succeeded
if [ -f "dist/main.js" ]; then
  echo "✅ Build successful!"
else
  echo "❌ Build failed - dist/main.js not found"
  exit 1
fi

# 5. Test the production build
npm run start:prod
```

## 🔍 Troubleshooting Build Issues

### Common Issues:

1. **TypeScript Errors**
   ```bash
   # Check for TypeScript errors
   npx tsc --noEmit
   ```

2. **Missing Dependencies**
   ```bash
   # Reinstall dependencies
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Build Output Not Found**
   - Check `tsconfig.json` for correct `outDir`
   - Verify `nest-cli.json` configuration
   - Ensure no build errors occurred

4. **Environment Variables**
   - Make sure `.env` file exists with required variables
   - Check database configuration in `database.config.ts`

## 📝 Quick Test Commands

```bash
# Build only
npm run build

# Build + Run Production
npm run build && npm run start:prod

# Build + Lint
npm run build && npm run lint

# Full test suite
npm run build && npm test && npm run start:prod
```

## 🎯 Production Deployment Checklist

Before deploying to production:

- [ ] Build completes without errors: `npm run build`
- [ ] Production build starts successfully: `npm run start:prod`
- [ ] Database connection works (check logs)
- [ ] Environment variables are set correctly
- [ ] All tests pass: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] Port is accessible (check console output)

## 📊 Expected Output

When you run `npm run start:prod`, you should see:

```
========================================
📊 DATABASE CONFIGURATION
========================================
Environment: PRODUCTION
NODE_ENV: production
Database: your_database_name
Host: your_host
Port: 5432
Dialect: postgres
Username: your_username
Password: ***
Logging: false
========================================
========================================
🚀 APPLICATION STARTED
========================================
Server running on port: 3000
Environment: production
URL: http://localhost:3000
========================================
```



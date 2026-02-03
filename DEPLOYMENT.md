# SSReports Deployment Guide

## Overview
SSReports is a comprehensive reporting platform for SalesSync data, deployed on Cloudflare Workers with D1 database.

## Architecture
- **Frontend**: React + Vite + Tailwind CSS (deployed to Cloudflare Pages)
- **Backend**: Cloudflare Workers with Hono framework
- **Database**: Cloudflare D1 (SQLite-compatible)
- **Domain**: ss.vantax.co.za

## Prerequisites
- Cloudflare account with API access
- Node.js 18+
- Wrangler CLI

## Deployment Steps

### 1. Setup Cloudflare Authentication
```bash
export CLOUDFLARE_API_TOKEN="your-api-token"
# Or use Global API Key
export CLOUDFLARE_EMAIL="reshigan@vantax.co.za"
export CLOUDFLARE_API_KEY="21fff817fa4a851d0ddc3975c7f8c1a31fbc4"
```

### 2. Create D1 Database
```bash
cd backend
npx wrangler d1 create ssreports-db
# Note the database_id from output and update wrangler.toml
```

### 3. Apply Database Schema
```bash
npx wrangler d1 execute ssreports-db --file=./schema.sql
```

### 4. Seed Database with Data
```bash
# First sync data from MySQL
python3 sync-data.py

# Generate seed SQL
node seed-data.js

# Apply seed data
npx wrangler d1 execute ssreports-db --file=./seed.sql
```

### 5. Deploy Backend Worker
```bash
cd backend
npm run deploy
```

### 6. Build and Deploy Frontend
```bash
cd frontend
npm run build
npx wrangler pages deploy dist --project-name=ssreports
```

### 7. Configure Custom Domain
In Cloudflare Dashboard:
1. Go to Workers & Pages > ssreports
2. Custom Domains > Add Custom Domain
3. Enter: ss.vantax.co.za
4. Cloudflare will automatically configure DNS

## Environment Variables

### Backend (wrangler.toml)
- `JWT_SECRET`: Secret key for JWT tokens
- `MYSQL_*`: MySQL connection details (for data sync)

### Frontend (.env)
- `VITE_API_URL`: Backend API URL (https://ss.vantax.co.za/api)

## Default Login
- Email: admin@ssreports.com
- Password: admin123

## Features
- KPI Dashboard with charts and insights
- Interactive map with store locations
- Checkins list with filtering
- User management
- Excel and PDF export
- Date range filtering

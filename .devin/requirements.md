# SSReports - SalesSync Reporting Platform Requirements

## Overview
Build a comprehensive reporting platform for SalesSync data with KPIs, maps, store points, user management, and exportable reports. Deploy on Cloudflare Workers with D1 database at ss.vantax.co.za.

## Data Source
- MySQL Database: Connection string stored in DATABASE_URI environment variable
- Tables: checkins (15,003), visit_responses (15,003), shops (1,337), users (32), brands, categories, products, goals

## Key Features

### 1. KPI Dashboard
- Total checkins count
- Conversion rate (from visit_responses)
- Agent performance metrics
- Daily/weekly/monthly trends
- Status breakdown (Pending vs Approved)

### 2. Maps with Store Points
- Interactive map showing all shops
- Checkin locations with clustering
- Store photos display
- Filter by date range, agent, status

### 3. Data Analysis & Insights
- Checkins by time (hour, day, month)
- Agent performance comparison
- Geographic distribution
- Conversion analysis
- Betting behavior insights
- Peak activity times

### 4. User Management
- Create/edit/delete users
- Role-based access (Admin, Manager, Agent)
- Authentication system
- D1 database for user storage

### 5. Reports & Exports
- Excel export functionality
- PDF export functionality
- Date range filtering
- Customizable report parameters

### 6. Technical Requirements
- Cloudflare Workers backend
- D1 database for caching and users
- React frontend with Tailwind CSS
- Charts using recharts
- Maps using Leaflet
- Deploy to ss.vantax.co.za

## Deployment
- Domain: ss.vantax.co.za
- Cloudflare account credentials stored securely (not in repo)

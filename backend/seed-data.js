#!/usr/bin/env node
/**
 * Seed script to import JSON data into D1 database
 * Run after creating the D1 database and applying schema
 */

const fs = require('fs');
const path = require('path');

async function seedData() {
  console.log('Reading exported data files...');
  
  const dataDir = path.join(__dirname, 'data');
  
  const shops = JSON.parse(fs.readFileSync(path.join(dataDir, 'shops.json'), 'utf8'));
  const checkins = JSON.parse(fs.readFileSync(path.join(dataDir, 'checkins.json'), 'utf8'));
  const visitResponses = JSON.parse(fs.readFileSync(path.join(dataDir, 'visit_responses.json'), 'utf8'));
  const agentPerformance = JSON.parse(fs.readFileSync(path.join(dataDir, 'agent_performance.json'), 'utf8'));
  const checkinsByHour = JSON.parse(fs.readFileSync(path.join(dataDir, 'checkins_by_hour.json'), 'utf8'));
  const checkinsByDay = JSON.parse(fs.readFileSync(path.join(dataDir, 'checkins_by_day.json'), 'utf8'));
  
  console.log(`Loaded: ${shops.length} shops, ${checkins.length} checkins, ${visitResponses.length} responses`);
  
  // Generate SQL insert statements
  let sql = '';
  
  // Shops
  console.log('Generating shops SQL...');
  for (const shop of shops) {
    const name = (shop.name || '').replace(/'/g, "''");
    const address = (shop.address || '').replace(/'/g, "''");
    sql += `INSERT OR REPLACE INTO shops (id, name, address, latitude, longitude) VALUES (${shop.id}, '${name}', '${address}', ${shop.latitude || 0}, ${shop.longitude || 0});\n`;
  }
  
  // Checkins (batch in chunks)
  console.log('Generating checkins SQL...');
  for (const checkin of checkins) {
    const notes = (checkin.notes || '').replace(/'/g, "''");
    const photoPath = (checkin.photo_path || '').replace(/'/g, "''");
    sql += `INSERT OR REPLACE INTO checkins (id, agent_id, shop_id, timestamp, latitude, longitude, photo_path, notes, status, brand_id, category_id, product_id) VALUES (${checkin.id}, ${checkin.agent_id || 'NULL'}, ${checkin.shop_id || 'NULL'}, '${checkin.timestamp}', ${checkin.latitude || 0}, ${checkin.longitude || 0}, '${photoPath}', '${notes}', '${checkin.status || 'PENDING'}', ${checkin.brand_id || 'NULL'}, ${checkin.category_id || 'NULL'}, ${checkin.product_id || 'NULL'});\n`;
  }
  
  // Visit responses
  console.log('Generating visit_responses SQL...');
  for (const response of visitResponses) {
    const responses = (response.responses || '').replace(/'/g, "''");
    sql += `INSERT OR REPLACE INTO visit_responses (id, checkin_id, visit_type, responses, converted, already_betting, created_at) VALUES (${response.id}, ${response.checkin_id}, '${response.visit_type || ''}', '${responses}', ${response.converted || 0}, ${response.already_betting || 0}, '${response.created_at}');\n`;
  }
  
  // Agent performance
  console.log('Generating agent_performance SQL...');
  for (const agent of agentPerformance) {
    const name = (agent.agent_name || '').replace(/'/g, "''");
    sql += `INSERT OR REPLACE INTO agent_performance (agent_id, agent_name, checkin_count, conversions, conversion_rate) VALUES (${agent.agent_id}, '${name}', ${agent.checkin_count || 0}, ${agent.conversions || 0}, ${agent.conversion_rate || 0});\n`;
  }
  
  // Checkins by hour
  console.log('Generating checkins_by_hour SQL...');
  for (const hourData of checkinsByHour) {
    sql += `INSERT OR REPLACE INTO checkins_by_hour (hour, count) VALUES (${hourData.hour}, ${hourData.count});\n`;
  }
  
  // Checkins by day
  console.log('Generating checkins_by_day SQL...');
  for (const dayData of checkinsByDay) {
    sql += `INSERT OR REPLACE INTO checkins_by_day (day_num, day_name, count) VALUES (${dayData.day_num}, '${dayData.day_name}', ${dayData.count});\n`;
  }
  
  // Add default admin user (password: admin123 -> SHA256 hash)
  sql += `INSERT OR REPLACE INTO users (id, email, password_hash, name, role, created_at) VALUES (1, 'admin@ssreports.com', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', 'Admin', 'admin', '${new Date().toISOString()}');\n`;
  
  // Write to file
  const outputPath = path.join(__dirname, 'seed.sql');
  fs.writeFileSync(outputPath, sql);
  console.log(`\nGenerated seed.sql with ${sql.split('\n').length} statements`);
  console.log(`Run: wrangler d1 execute ssreports-db --file=./seed.sql`);
}

seedData().catch(console.error);

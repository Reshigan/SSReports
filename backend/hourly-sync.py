#!/usr/bin/env python3
"""
Hourly data sync script to sync MySQL data to Cloudflare D1.
This script should be run via cron job every hour.

Cron example (run every hour):
0 * * * * cd /path/to/SSReports/backend && python3 hourly-sync.py >> /var/log/ssreports-sync.log 2>&1

Required environment variables:
- DATABASE_URI: MySQL connection string
- CLOUDFLARE_API_KEY: Cloudflare Global API key
- CLOUDFLARE_EMAIL: Cloudflare account email
- CLOUDFLARE_ACCOUNT_ID: Cloudflare account ID
- D1_DATABASE_ID: D1 database ID
- SYNC_API_KEY: API key for internal photo upload endpoint
- WORKER_API_URL: Base URL of the SSReports Worker API (e.g. https://ssreports-api.reshigan-085.workers.dev)
"""

import json
import os
import sys
import base64
import requests
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
import pandas as pd

# Configuration - all values must be set via environment variables
DATABASE_URI = os.environ.get("DATABASE_URI")
CLOUDFLARE_API_KEY = os.environ.get("CLOUDFLARE_API_KEY")
CLOUDFLARE_EMAIL = os.environ.get("CLOUDFLARE_EMAIL")
CLOUDFLARE_ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
D1_DATABASE_ID = os.environ.get("D1_DATABASE_ID")
SYNC_API_KEY = os.environ.get("SYNC_API_KEY")
WORKER_API_URL = os.environ.get("WORKER_API_URL") or "https://ssreports-api.reshigan-085.workers.dev"
try:
    PHOTO_SYNC_HOURS = int(os.environ.get("PHOTO_SYNC_HOURS", "2"))
except ValueError:
    PHOTO_SYNC_HOURS = 2  # Default to 2 hours if invalid value provided

# Validate required environment variables
required_vars = ["DATABASE_URI", "CLOUDFLARE_API_KEY", "CLOUDFLARE_EMAIL", "CLOUDFLARE_ACCOUNT_ID", "D1_DATABASE_ID"]
missing_vars = [var for var in required_vars if not os.environ.get(var)]
if missing_vars:
    raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")

def log(message):
    """Print timestamped log message"""
    print(f"[{datetime.now().isoformat()}] {message}")

def execute_d1_query(sql, params=None):
    """Execute a query on Cloudflare D1"""
    url = f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/d1/database/{D1_DATABASE_ID}/query"
    headers = {
        "X-Auth-Email": CLOUDFLARE_EMAIL,
        "X-Auth-Key": CLOUDFLARE_API_KEY,
        "Content-Type": "application/json"
    }
    data = {"sql": sql}
    if params:
        data["params"] = params
    
    response = requests.post(url, headers=headers, json=data)
    return response.json()

def execute_d1_batch(statements):
    """Execute batch of SQL statements on Cloudflare D1"""
    url = f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/d1/database/{D1_DATABASE_ID}/query"
    headers = {
        "X-Auth-Email": CLOUDFLARE_EMAIL,
        "X-Auth-Key": CLOUDFLARE_API_KEY,
        "Content-Type": "application/json"
    }
    
    # D1 API accepts multiple SQL statements
    results = []
    for stmt in statements:
        data = {"sql": stmt}
        response = requests.post(url, headers=headers, json=data)
        results.append(response.json())
    return results

def sync_new_checkins(engine, since_hours=2):
    """Sync checkins from the last N hours"""
    since_time = datetime.now() - timedelta(hours=since_hours)
    since_str = since_time.strftime('%Y-%m-%d %H:%M:%S')
    
    log(f"Syncing checkins since {since_str}...")
    
    with engine.connect() as conn:
        # Get new checkins
        checkins = pd.read_sql(text(f"""
            SELECT id, agent_id, shop_id, timestamp, latitude, longitude, 
                   photo_path, notes, status, brand_id, category_id, product_id
            FROM checkins
            WHERE timestamp >= '{since_str}'
        """), conn)
        
        if len(checkins) == 0:
            log("No new checkins to sync")
            return 0
        
        checkins['timestamp'] = checkins['timestamp'].astype(str)
        
        # Insert or replace checkins
        count = 0
        for _, row in checkins.iterrows():
            sql = """
                INSERT OR REPLACE INTO checkins 
                (id, agent_id, shop_id, timestamp, latitude, longitude, photo_path, notes, status, brand_id, category_id, product_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            params = [
                row['id'], row['agent_id'], row['shop_id'], row['timestamp'],
                row['latitude'], row['longitude'], row['photo_path'], row['notes'],
                row['status'], row['brand_id'], row['category_id'], row['product_id']
            ]
            # Convert NaN to None
            params = [None if pd.isna(p) else p for p in params]
            
            result = execute_d1_query(sql, params)
            if result.get('success'):
                count += 1
            else:
                log(f"Error syncing checkin {row['id']}: {result}")
        
        log(f"Synced {count} checkins")
        return count

def sync_new_visit_responses(engine, since_hours=2):
    """Sync visit responses from the last N hours"""
    since_time = datetime.now() - timedelta(hours=since_hours)
    since_str = since_time.strftime('%Y-%m-%d %H:%M:%S')
    
    log(f"Syncing visit responses since {since_str}...")
    
    with engine.connect() as conn:
        responses = pd.read_sql(text(f"""
            SELECT id, checkin_id, visit_type, responses, created_at
            FROM visit_responses
            WHERE created_at >= '{since_str}'
        """), conn)
        
        if len(responses) == 0:
            log("No new visit responses to sync")
            return 0
        
        responses['created_at'] = responses['created_at'].astype(str)
        
        count = 0
        for _, row in responses.iterrows():
            # Parse conversion status
            try:
                data = json.loads(row['responses'])
                converted = 1 if data.get('conversion', {}).get('converted') == 'yes' else 0
                betting = 1 if data.get('bettingInfo', {}).get('isBettingSomewhere') == 'yes' else 0
            except:
                converted = 0
                betting = 0
            
            sql = """
                INSERT OR REPLACE INTO visit_responses 
                (id, checkin_id, visit_type, responses, converted, already_betting, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """
            params = [
                row['id'], row['checkin_id'], row['visit_type'], row['responses'],
                converted, betting, row['created_at']
            ]
            params = [None if pd.isna(p) else p for p in params]
            
            result = execute_d1_query(sql, params)
            if result.get('success'):
                count += 1
            else:
                log(f"Error syncing response {row['id']}: {result}")
        
        log(f"Synced {count} visit responses")
        return count

def sync_new_shops(engine, since_hours=24):
    """Sync any new shops (check less frequently)"""
    log("Checking for new shops...")
    
    with engine.connect() as conn:
        # Get all shops from MySQL
        shops = pd.read_sql(text("SELECT id, name, address, latitude, longitude FROM shops"), conn)
        
        # Get existing shop IDs from D1
        result = execute_d1_query("SELECT id FROM shops")
        existing_ids = set()
        if result.get('success') and result.get('result'):
            for r in result['result']:
                if r.get('results'):
                    existing_ids = {row['id'] for row in r['results']}
        
        # Find new shops
        new_shops = shops[~shops['id'].isin(existing_ids)]
        
        if len(new_shops) == 0:
            log("No new shops to sync")
            return 0
        
        count = 0
        for _, row in new_shops.iterrows():
            sql = """
                INSERT OR REPLACE INTO shops (id, name, address, latitude, longitude)
                VALUES (?, ?, ?, ?, ?)
            """
            params = [row['id'], row['name'], row['address'], row['latitude'], row['longitude']]
            params = [None if pd.isna(p) else p for p in params]
            
            result = execute_d1_query(sql, params)
            if result.get('success'):
                count += 1
        
        log(f"Synced {count} new shops")
        return count

def sync_photos(engine, since_hours=2):
    """Sync photos from MySQL to R2 via Worker upload endpoint"""
    if not SYNC_API_KEY:
        log("SYNC_API_KEY not set, skipping photo sync")
        return 0
    
    since_time = datetime.now() - timedelta(hours=since_hours)
    since_str = since_time.strftime('%Y-%m-%d %H:%M:%S')
    
    log(f"Syncing photos since {since_str}...")
    
    with engine.connect() as conn:
        # Deep debug: examine photo data format in MySQL
        debug_df = pd.read_sql(text("""
            SELECT id, 
                   LENGTH(photo_base64) as b64_len,
                   SUBSTRING(photo_base64, 1, 200) as b64_start,
                   SUBSTRING(photo_base64, LENGTH(photo_base64) - 50, 51) as b64_end,
                   LENGTH(additional_photos_base64) as addl_len,
                   SUBSTRING(additional_photos_base64, 1, 200) as addl_start,
                   photo_path
            FROM checkins
            WHERE photo_base64 IS NOT NULL AND photo_base64 != ''
            ORDER BY id DESC
            LIMIT 5
        """), conn)
        for _, dr in debug_df.iterrows():
            log(f"  DEBUG checkin {dr['id']}: b64_len={dr['b64_len']}, b64_start={str(dr['b64_start'])[:200]}")
            log(f"  DEBUG checkin {dr['id']}: b64_end={dr['b64_end']}")
            log(f"  DEBUG checkin {dr['id']}: addl_len={dr['addl_len']}, addl_start={str(dr['addl_start'])[:200]}")
            log(f"  DEBUG checkin {dr['id']}: photo_path={dr['photo_path']}")
        
        # Also check if there are distinct b64 values or all the same
        distinct_check = pd.read_sql(text("""
            SELECT COUNT(DISTINCT photo_base64) as distinct_count,
                   COUNT(*) as total_count,
                   MIN(LENGTH(photo_base64)) as min_len,
                   MAX(LENGTH(photo_base64)) as max_len,
                   COUNT(DISTINCT additional_photos_base64) as addl_distinct,
                   SUM(CASE WHEN additional_photos_base64 IS NOT NULL AND additional_photos_base64 != '' THEN 1 ELSE 0 END) as addl_non_empty
            FROM checkins
            WHERE photo_base64 IS NOT NULL AND photo_base64 != ''
        """), conn)
        for _, dc in distinct_check.iterrows():
            log(f"  DEBUG SUMMARY: {dc['total_count']} checkins with photos, {dc['distinct_count']} distinct b64 values, min_len={dc['min_len']}, max_len={dc['max_len']}")
            log(f"  DEBUG SUMMARY addl: {dc['addl_distinct']} distinct additional_photos values, {dc['addl_non_empty']} non-empty")
        
        # Check if there are any tables related to photos/files
        tables_df = pd.read_sql(text("SHOW TABLES"), conn)
        photo_tables = [t for t in tables_df.iloc[:, 0].values if 'photo' in str(t).lower() or 'file' in str(t).lower() or 'image' in str(t).lower() or 'media' in str(t).lower()]
        log(f"  DEBUG photo/file/media tables: {photo_tables}")
        log(f"  DEBUG all tables: {list(tables_df.iloc[:, 0].values)}")
        
        # Get checkins with photos from the last N hours
        checkins = pd.read_sql(text(f"""
            SELECT id, photo_base64
            FROM checkins
            WHERE timestamp >= '{since_str}'
              AND photo_base64 IS NOT NULL AND photo_base64 != ''
        """), conn)
        
        if len(checkins) == 0:
            log("No new photos to sync")
            return 0
        
        log(f"Found {len(checkins)} checkins with photos to sync")
        
        # Debug: log sizes of first 3 photos to diagnose black photo issue
        for debug_idx in range(min(3, len(checkins))):
            debug_row = checkins.iloc[debug_idx]
            debug_b64 = str(debug_row['photo_base64']) if not pd.isna(debug_row['photo_base64']) else ''
            log(f"  DEBUG photo checkin {debug_row['id']}: base64 length={len(debug_b64)}, starts_with={debug_b64[:80]}...")
        
        uploaded = 0
        errors = 0
        
        # Upload photos in batches of 5 to avoid request size limits
        batch_size = 5
        for i in range(0, len(checkins), batch_size):
            batch = checkins.iloc[i:i+batch_size]
            photos = []
            for _, row in batch.iterrows():
                photo_b64 = row['photo_base64']
                if pd.isna(photo_b64) or not photo_b64:
                    continue
                # Strip whitespace/newlines from base64 data
                clean_b64 = str(photo_b64).replace('\n', '').replace('\r', '').replace(' ', '')
                photos.append({
                    'checkin_id': int(row['id']),
                    'photo_base64': clean_b64
                })
            
            if not photos:
                continue
            
            try:
                resp = requests.post(
                    f"{WORKER_API_URL}/api/internal/upload-photos-batch",
                    headers={
                        'Content-Type': 'application/json',
                        'X-Sync-API-Key': SYNC_API_KEY
                    },
                    json={'photos': photos},
                    timeout=120
                )
                
                if resp.status_code == 200:
                    result = resp.json()
                    for r in result.get('results', []):
                        if r.get('success'):
                            uploaded += 1
                        else:
                            errors += 1
                            log(f"  Error uploading photo for checkin {r.get('checkin_id')}: {r.get('error')}")
                else:
                    errors += len(photos)
                    log(f"  Batch upload failed with status {resp.status_code}: {resp.text[:200]}")
            except Exception as e:
                errors += len(photos)
                log(f"  Batch upload error: {e}")
        
        log(f"Photo sync complete: {uploaded} uploaded, {errors} errors")
        return uploaded

def update_aggregates(engine):
    """Update aggregated tables"""
    log("Updating aggregated tables...")
    
    with engine.connect() as conn:
        # Update agent performance
        agent_perf = pd.read_sql(text("""
            SELECT c.agent_id, u.name as agent_name, COUNT(*) as checkin_count
            FROM checkins c
            LEFT JOIN users u ON c.agent_id = u.id
            GROUP BY c.agent_id, u.name
            ORDER BY checkin_count DESC
        """), conn)
        
        conversions_df = pd.read_sql(text("""
            SELECT c.agent_id, COUNT(*) as conversions
            FROM checkins c
            JOIN visit_responses vr ON c.id = vr.checkin_id
            WHERE vr.responses LIKE '%"converted": "yes"%' OR vr.responses LIKE '%"converted":"yes"%'
            GROUP BY c.agent_id
        """), conn)
        
        agent_perf = agent_perf.merge(conversions_df, on='agent_id', how='left')
        agent_perf['conversions'] = agent_perf['conversions'].fillna(0).astype(int)
        agent_perf['conversion_rate'] = (agent_perf['conversions'] / agent_perf['checkin_count'] * 100).round(2)
        
        # Clear and repopulate agent_performance
        execute_d1_query("DELETE FROM agent_performance")
        
        for _, row in agent_perf.iterrows():
            sql = """
                INSERT INTO agent_performance (agent_id, agent_name, checkin_count, conversions, conversion_rate)
                VALUES (?, ?, ?, ?, ?)
            """
            params = [row['agent_id'], row['agent_name'], row['checkin_count'], row['conversions'], row['conversion_rate']]
            params = [None if pd.isna(p) else p for p in params]
            execute_d1_query(sql, params)
        
        # Update hourly stats
        hourly = pd.read_sql(text("""
            SELECT HOUR(timestamp) as hour, COUNT(*) as count
            FROM checkins
            GROUP BY HOUR(timestamp)
            ORDER BY hour
        """), conn)
        
        execute_d1_query("DELETE FROM checkins_by_hour")
        for _, row in hourly.iterrows():
            execute_d1_query(
                "INSERT INTO checkins_by_hour (hour, count) VALUES (?, ?)",
                [int(row['hour']), int(row['count'])]
            )
        
        # Update daily stats
        daily = pd.read_sql(text("""
            SELECT DAYOFWEEK(timestamp) as day_num, DAYNAME(timestamp) as day_name, COUNT(*) as count
            FROM checkins
            GROUP BY DAYOFWEEK(timestamp), DAYNAME(timestamp)
            ORDER BY day_num
        """), conn)
        
        execute_d1_query("DELETE FROM checkins_by_day")
        for _, row in daily.iterrows():
            execute_d1_query(
                "INSERT INTO checkins_by_day (day_num, day_name, count) VALUES (?, ?, ?)",
                [int(row['day_num']), row['day_name'], int(row['count'])]
            )
        
        log("Aggregates updated")

def main():
    log("=" * 50)
    log("Starting hourly sync")
    
    try:
        engine = create_engine(DATABASE_URI)
        
        # Sync new data
        checkins_count = sync_new_checkins(engine, since_hours=2)
        responses_count = sync_new_visit_responses(engine, since_hours=2)
        shops_count = sync_new_shops(engine, since_hours=24)
        
        # Sync photos to R2
        photos_count = sync_photos(engine, since_hours=PHOTO_SYNC_HOURS)
        
        # Update aggregates if there were changes
        if checkins_count > 0 or responses_count > 0:
            update_aggregates(engine)
        
        log(f"Sync complete: {checkins_count} checkins, {responses_count} responses, {shops_count} shops, {photos_count} photos")
        log("=" * 50)
        
    except Exception as e:
        log(f"ERROR: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()

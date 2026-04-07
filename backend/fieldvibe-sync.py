#!/usr/bin/env python3
"""
FieldVibe data sync script to pull data from FieldVibe D1 and push to SSReports D1.
This script should be run via cron job periodically.

Cron example (run every 2 hours):
0 */2 * * * cd /path/to/SSReports/backend && python3 fieldvibe-sync.py >> /var/log/fieldvibe-sync.log 2>&1

Required environment variables:
- CLOUDFLARE_API_KEY: Cloudflare Global API key
- CLOUDFLARE_EMAIL: Cloudflare account email
- CLOUDFLARE_ACCOUNT_ID: Cloudflare account ID
- SSREPORTS_D1_DATABASE_ID: SSReports D1 database ID
- FIELDVIBE_D1_DATABASE_ID: FieldVibe D1 database ID
"""

import json
import os
import sys
import hashlib
import requests
from datetime import datetime, timedelta

# Configuration
CLOUDFLARE_API_KEY = os.environ.get("CLOUDFLARE_API_KEY")
CLOUDFLARE_EMAIL = os.environ.get("CLOUDFLARE_EMAIL")
CLOUDFLARE_ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
SSREPORTS_D1_ID = os.environ.get("SSREPORTS_D1_DATABASE_ID", "8312a7c3-1334-46a9-b980-7dd8ce6392ca")
FIELDVIBE_D1_ID = os.environ.get("FIELDVIBE_D1_DATABASE_ID", "1521287d-96be-42b7-b77c-e8c5f67629a6")

# ID offset for FieldVibe records to avoid collision with SalesSync integer IDs
FV_ID_OFFSET = 200000

required_vars = ["CLOUDFLARE_API_KEY", "CLOUDFLARE_EMAIL", "CLOUDFLARE_ACCOUNT_ID"]
missing_vars = [var for var in required_vars if not os.environ.get(var)]
if missing_vars:
    raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")


def log(message):
    print(f"[{datetime.now().isoformat()}] {message}")


def fv_uuid_to_int(uuid_str):
    """Convert a FieldVibe UUID to a stable integer ID using hash."""
    hash_val = int(hashlib.md5(uuid_str.encode()).hexdigest()[:8], 16)
    return FV_ID_OFFSET + (hash_val % 10000000)


def query_d1(database_id, sql, params=None):
    """Execute a query on a Cloudflare D1 database"""
    url = f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/d1/database/{database_id}/query"
    headers = {
        "X-Auth-Email": CLOUDFLARE_EMAIL,
        "X-Auth-Key": CLOUDFLARE_API_KEY,
        "Content-Type": "application/json"
    }
    data = {"sql": sql}
    if params:
        data["params"] = params

    response = requests.post(url, headers=headers, json=data, timeout=60)
    result = response.json()

    if not result.get("success"):
        log(f"D1 query error: {result.get('errors', [])}")
        return []

    results_list = result.get("result", [])
    if results_list and len(results_list) > 0:
        return results_list[0].get("results", [])
    return []


def query_fieldvibe(sql, params=None):
    return query_d1(FIELDVIBE_D1_ID, sql, params)


def query_ssreports(sql, params=None):
    return query_d1(SSREPORTS_D1_ID, sql, params)


def execute_ssreports(sql, params=None):
    url = f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/d1/database/{SSREPORTS_D1_ID}/query"
    headers = {
        "X-Auth-Email": CLOUDFLARE_EMAIL,
        "X-Auth-Key": CLOUDFLARE_API_KEY,
        "Content-Type": "application/json"
    }
    data = {"sql": sql}
    if params:
        data["params"] = params

    response = requests.post(url, headers=headers, json=data, timeout=60)
    return response.json()


def ensure_schema():
    """Add data_source columns if they don't exist yet"""
    alter_statements = [
        "ALTER TABLE shops ADD COLUMN data_source TEXT DEFAULT 'salessync'",
        "ALTER TABLE shops ADD COLUMN fv_id TEXT",
        "ALTER TABLE checkins ADD COLUMN data_source TEXT DEFAULT 'salessync'",
        "ALTER TABLE checkins ADD COLUMN fv_id TEXT",
        "ALTER TABLE checkins ADD COLUMN individual_name TEXT",
        "ALTER TABLE checkins ADD COLUMN individual_surname TEXT",
        "ALTER TABLE checkins ADD COLUMN individual_phone TEXT",
        "ALTER TABLE visit_responses ADD COLUMN data_source TEXT DEFAULT 'salessync'",
        "ALTER TABLE visit_responses ADD COLUMN fv_id TEXT",
        "ALTER TABLE agent_performance ADD COLUMN data_source TEXT DEFAULT 'salessync'",
        "ALTER TABLE agent_performance ADD COLUMN fv_agent_id TEXT",
        "CREATE TABLE IF NOT EXISTS sync_metadata (source TEXT PRIMARY KEY, last_sync_at TEXT, records_synced INTEGER DEFAULT 0, status TEXT DEFAULT 'idle')",
        "CREATE INDEX IF NOT EXISTS idx_checkins_source ON checkins(data_source)",
        "CREATE INDEX IF NOT EXISTS idx_visit_responses_source ON visit_responses(data_source)",
        "CREATE INDEX IF NOT EXISTS idx_shops_source ON shops(data_source)",
        "CREATE INDEX IF NOT EXISTS idx_agent_performance_source ON agent_performance(data_source)",
    ]
    for sql in alter_statements:
        try:
            execute_ssreports(sql)
        except Exception:
            pass


def get_last_sync_time():
    results = query_ssreports(
        "SELECT last_sync_at FROM sync_metadata WHERE source = 'fieldvibe'"
    )
    if results and results[0].get("last_sync_at"):
        return results[0]["last_sync_at"]
    return None


def update_sync_metadata(records_synced):
    execute_ssreports(
        "INSERT OR REPLACE INTO sync_metadata (source, last_sync_at, records_synced, status) VALUES (?, ?, ?, ?)",
        ["fieldvibe", datetime.now().isoformat(), records_synced, "completed"]
    )


def sync_customers_as_shops():
    log("Syncing FieldVibe customers as shops...")
    customers = query_fieldvibe(
        "SELECT id, name, address, latitude, longitude FROM customers WHERE status = 'active'"
    )
    if not customers:
        log("No customers to sync")
        return 0

    count = 0
    for cust in customers:
        int_id = fv_uuid_to_int(cust["id"])
        result = execute_ssreports(
            "INSERT OR REPLACE INTO shops (id, name, address, latitude, longitude, data_source, fv_id) VALUES (?, ?, ?, ?, ?, 'fieldvibe', ?)",
            [int_id, cust.get("name"), cust.get("address"),
             cust.get("latitude"), cust.get("longitude"), cust["id"]]
        )
        if result.get("success"):
            count += 1

    log(f"Synced {count} FieldVibe customers as shops")
    return count


def sync_visits_as_checkins(since=None):
    log("Syncing FieldVibe visits as checkins...")
    total_count = 0
    offset = 0
    batch_size = 5000

    while True:
        if since:
            visits = query_fieldvibe(
                f"SELECT * FROM visits WHERE created_at >= ? ORDER BY created_at ASC LIMIT {batch_size} OFFSET {offset}",
                [since]
            )
        else:
            visits = query_fieldvibe(
                f"SELECT * FROM visits ORDER BY created_at ASC LIMIT {batch_size} OFFSET {offset}"
            )

        if not visits:
            break

        for visit in visits:
            int_id = fv_uuid_to_int(visit["id"])
            agent_fv_id = visit.get("agent_id")
            agent_int_id = fv_uuid_to_int(agent_fv_id) if agent_fv_id else None
            customer_fv_id = visit.get("customer_id")
            shop_int_id = fv_uuid_to_int(customer_fv_id) if customer_fv_id else None
            timestamp = visit.get("check_in_time") or visit.get("visit_date")
            fv_status = (visit.get("status") or "pending").upper()
            if fv_status == "COMPLETED":
                fv_status = "APPROVED"

            execute_ssreports(
                "INSERT INTO checkins (id, agent_id, shop_id, timestamp, latitude, longitude, photo_path, notes, status, brand_id, category_id, product_id, data_source, fv_id, individual_name, individual_surname, individual_phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'fieldvibe', ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET agent_id=excluded.agent_id, shop_id=excluded.shop_id, timestamp=excluded.timestamp, latitude=excluded.latitude, longitude=excluded.longitude, photo_path=excluded.photo_path, notes=excluded.notes, status=excluded.status, brand_id=excluded.brand_id, category_id=excluded.category_id, product_id=excluded.product_id, data_source=excluded.data_source, fv_id=excluded.fv_id, individual_name=excluded.individual_name, individual_surname=excluded.individual_surname, individual_phone=excluded.individual_phone",
                [int_id, agent_int_id, shop_int_id, timestamp,
                 visit.get("latitude"), visit.get("longitude"),
                 visit.get("photo_url"), visit.get("notes"), fv_status,
                 None, None, None,
                 visit["id"],
                 visit.get("individual_name"), visit.get("individual_surname"),
                 visit.get("individual_phone")]
            )
            total_count += 1

        log(f"  Progress: {total_count} visits processed")
        if len(visits) < batch_size:
            break
        offset += batch_size

    log(f"Synced {total_count} FieldVibe visits as checkins")
    return total_count


def sync_visit_responses(since=None):
    log("Syncing FieldVibe visit responses...")
    total_count = 0
    offset = 0
    batch_size = 5000

    while True:
        if since:
            responses = query_fieldvibe(
                f"SELECT * FROM visit_responses WHERE created_at >= ? ORDER BY created_at ASC LIMIT {batch_size} OFFSET {offset}",
                [since]
            )
        else:
            responses = query_fieldvibe(
                f"SELECT * FROM visit_responses ORDER BY created_at ASC LIMIT {batch_size} OFFSET {offset}"
            )

        if not responses:
            break

        for resp in responses:
            int_id = fv_uuid_to_int(resp["id"])
            visit_fv_id = resp.get("visit_id")
            checkin_int_id = fv_uuid_to_int(visit_fv_id) if visit_fv_id else None

            converted = 0
            already_betting = 0
            try:
                data = json.loads(resp.get("responses") or "{}")
                if data.get("conversion", {}).get("converted") == "yes":
                    converted = 1
                if data.get("bettingInfo", {}).get("isBettingSomewhere") == "yes":
                    already_betting = 1
            except (json.JSONDecodeError, TypeError, AttributeError):
                pass

            execute_ssreports(
                "INSERT OR REPLACE INTO visit_responses (id, checkin_id, visit_type, responses, converted, already_betting, created_at, data_source, fv_id) VALUES (?, ?, ?, ?, ?, ?, ?, 'fieldvibe', ?)",
                [int_id, checkin_int_id, resp.get("visit_type"), resp.get("responses"),
                 converted, already_betting, resp.get("created_at"), resp["id"]]
            )
            total_count += 1

        log(f"  Progress: {total_count} visit responses processed")
        if len(responses) < batch_size:
            break
        offset += batch_size

    log(f"Synced {total_count} FieldVibe visit responses")
    return total_count


def sync_visit_photos():
    """Sync photos from FieldVibe visit_photos table into SSReports checkins.photo_base64.
    Also extracts image fields from visit_responses.responses (questionnaire photos)."""
    log("Syncing FieldVibe visit photos...")
    total_count = 0
    offset = 0
    batch_size = 50  # Small batches since photos are large base64 strings

    # 1) Pull from visit_photos table (checkin photos)
    while True:
        photos = query_fieldvibe(
            f"SELECT vp.visit_id, vp.r2_url FROM visit_photos vp "
            f"WHERE vp.r2_url IS NOT NULL AND vp.r2_url != '' "
            f"ORDER BY vp.created_at ASC LIMIT {batch_size} OFFSET {offset}"
        )
        if not photos:
            break

        for photo in photos:
            visit_id = photo.get("visit_id")
            r2_url = photo.get("r2_url")
            if not visit_id or not r2_url:
                continue

            checkin_int_id = fv_uuid_to_int(visit_id)
            # r2_url contains the base64 data directly
            execute_ssreports(
                "UPDATE checkins SET photo_base64 = ? WHERE id = ? AND (photo_base64 IS NULL OR photo_base64 = '')",
                [r2_url, checkin_int_id]
            )
            total_count += 1

        log(f"  Visit photos progress: {total_count} photos processed")
        if len(photos) < batch_size:
            break
        offset += batch_size

    # 2) Extract questionnaire image fields from visit_responses
    log("Extracting questionnaire photos from visit_responses...")
    quest_offset = 0
    quest_count = 0
    image_keys = ["outsidePhoto", "boardPhoto", "competitorPhotos"]

    while True:
        responses = query_fieldvibe(
            f"SELECT vr.visit_id, vr.responses FROM visit_responses vr "
            f"WHERE vr.responses LIKE '%data:image%' "
            f"ORDER BY vr.created_at ASC LIMIT {batch_size} OFFSET {quest_offset}"
        )
        if not responses:
            break

        for resp in responses:
            visit_id = resp.get("visit_id")
            if not visit_id:
                continue
            try:
                data = json.loads(resp.get("responses") or "{}")
            except (json.JSONDecodeError, TypeError):
                continue

            checkin_int_id = fv_uuid_to_int(visit_id)

            # Collect all image fields into additional_photos_base64 JSON array
            quest_images = {}
            for key in image_keys:
                val = data.get(key)
                if val and isinstance(val, str) and val.startswith("data:image"):
                    quest_images[key] = val

            if quest_images:
                # If no primary photo yet, use the first questionnaire image as primary
                first_image = next(iter(quest_images.values()))
                execute_ssreports(
                    "UPDATE checkins SET photo_base64 = COALESCE(NULLIF(photo_base64, ''), ?) WHERE id = ?",
                    [first_image, checkin_int_id]
                )
                # Store all questionnaire images as additional photos
                execute_ssreports(
                    "UPDATE checkins SET additional_photos_base64 = ? WHERE id = ?",
                    [json.dumps(quest_images), checkin_int_id]
                )
                quest_count += 1

        log(f"  Questionnaire photos progress: {quest_count} records with images")
        if len(responses) < batch_size:
            break
        quest_offset += batch_size

    total_count += quest_count
    log(f"Synced {total_count} FieldVibe photos total")
    return total_count


def sync_agent_performance():
    log("Calculating FieldVibe agent performance...")
    agents = query_fieldvibe(
        "SELECT id, first_name, last_name FROM users WHERE role IN ('agent', 'field_agent')"
    )
    if not agents:
        log("No agents to sync")
        return 0

    execute_ssreports("DELETE FROM agent_performance WHERE data_source = 'fieldvibe'")

    count = 0
    for agent in agents:
        agent_int_id = fv_uuid_to_int(agent["id"])
        agent_name = f"{agent.get('first_name', '')} {agent.get('last_name', '')}".strip()

        checkin_results = query_fieldvibe(
            "SELECT COUNT(*) as cnt FROM visits WHERE agent_id = ?",
            [agent["id"]]
        )
        checkin_count = checkin_results[0]["cnt"] if checkin_results else 0
        if checkin_count == 0:
            continue

        conversion_results = query_fieldvibe(
            "SELECT COUNT(*) as cnt FROM visit_responses vr INNER JOIN visits v ON vr.visit_id = v.id WHERE v.agent_id = ? AND (vr.responses LIKE '%\"converted\": \"yes\"%' OR vr.responses LIKE '%\"converted\":\"yes\"%')",
            [agent["id"]]
        )
        conversions = conversion_results[0]["cnt"] if conversion_results else 0
        conversion_rate = round((conversions / checkin_count * 100), 2) if checkin_count > 0 else 0

        result = execute_ssreports(
            "INSERT OR REPLACE INTO agent_performance (agent_id, agent_name, checkin_count, conversions, conversion_rate, data_source, fv_agent_id) VALUES (?, ?, ?, ?, ?, 'fieldvibe', ?)",
            [agent_int_id, agent_name, checkin_count, conversions, conversion_rate, agent["id"]]
        )
        if result.get("success"):
            count += 1

    log(f"Synced {count} FieldVibe agent performance records")
    return count


def main():
    log("=" * 60)
    log("Starting FieldVibe -> SSReports sync")

    try:
        ensure_schema()

        last_sync = get_last_sync_time()
        if not last_sync:
            log("No previous sync found, performing full sync...")
            since = None
        else:
            log(f"Incremental sync since {last_sync}...")
            since = last_sync

        shops = sync_customers_as_shops()
        checkins = sync_visits_as_checkins(since=since)
        responses = sync_visit_responses(since=since)
        photos = sync_visit_photos()
        agents = sync_agent_performance()

        total = shops + checkins + responses + photos + agents
        update_sync_metadata(total)

        log(f"Sync complete: {total} total records synced")
        log("=" * 60)

    except Exception as e:
        log(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

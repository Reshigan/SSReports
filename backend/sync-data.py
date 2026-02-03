#!/usr/bin/env python3
"""
Data sync script to export MySQL data to JSON files for D1 import.
This script connects to the MySQL database and exports all necessary data.
"""

import json
import os
import pymysql
from sqlalchemy import create_engine, text
import pandas as pd
from datetime import datetime
import math

# Load DATABASE_URI from environment variable
DATABASE_URI = os.environ.get("DATABASE_URI")
if not DATABASE_URI:
    raise ValueError("DATABASE_URI environment variable is required")

def clean_value(val):
    """Clean NaN and None values for JSON serialization"""
    if val is None:
        return None
    if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
        return None
    return val

def clean_dict(d):
    """Clean all values in a dictionary"""
    return {k: clean_value(v) for k, v in d.items()}

def export_data():
    engine = create_engine(DATABASE_URI)
    
    with engine.connect() as conn:
        print("Exporting shops...")
        shops = pd.read_sql(text("SELECT id, name, address, latitude, longitude FROM shops"), conn)
        shops_data = [clean_dict(r) for r in shops.to_dict(orient='records')]
        with open('data/shops.json', 'w') as f:
            json.dump(shops_data, f)
        print(f"  Exported {len(shops_data)} shops")
        
        print("Exporting checkins...")
        checkins = pd.read_sql(text("""
            SELECT id, agent_id, shop_id, timestamp, latitude, longitude, 
                   photo_path, photo_base64, additional_photos_base64,
                   notes, status, brand_id, category_id, product_id
            FROM checkins
        """), conn)
        checkins['timestamp'] = checkins['timestamp'].astype(str)
        checkins_data = [clean_dict(r) for r in checkins.to_dict(orient='records')]
        with open('data/checkins.json', 'w') as f:
            json.dump(checkins_data, f)
        print(f"  Exported {len(checkins_data)} checkins")
        
        print("Exporting visit_responses...")
        responses = pd.read_sql(text("""
            SELECT id, checkin_id, visit_type, responses, created_at
            FROM visit_responses
        """), conn)
        responses['created_at'] = responses['created_at'].astype(str)
        
        converted_list = []
        betting_list = []
        for _, row in responses.iterrows():
            try:
                data = json.loads(row['responses'])
                converted = 1 if data.get('conversion', {}).get('converted') == 'yes' else 0
                betting = 1 if data.get('bettingInfo', {}).get('isBettingSomewhere') == 'yes' else 0
            except:
                converted = 0
                betting = 0
            converted_list.append(converted)
            betting_list.append(betting)
        
        responses['converted'] = converted_list
        responses['already_betting'] = betting_list
        responses_data = [clean_dict(r) for r in responses.to_dict(orient='records')]
        with open('data/visit_responses.json', 'w') as f:
            json.dump(responses_data, f)
        print(f"  Exported {len(responses_data)} visit responses")
        
        print("Calculating agent performance...")
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
        agent_perf_data = agent_perf.to_dict(orient='records')
        with open('data/agent_performance.json', 'w') as f:
            json.dump(agent_perf_data, f)
        print(f"  Exported {len(agent_perf_data)} agent records")
        
        print("Calculating checkins by hour...")
        hourly = pd.read_sql(text("""
            SELECT HOUR(timestamp) as hour, COUNT(*) as count
            FROM checkins
            GROUP BY HOUR(timestamp)
            ORDER BY hour
        """), conn)
        hourly_data = hourly.to_dict(orient='records')
        with open('data/checkins_by_hour.json', 'w') as f:
            json.dump(hourly_data, f)
        print(f"  Exported {len(hourly_data)} hourly records")
        
        print("Calculating checkins by day...")
        daily = pd.read_sql(text("""
            SELECT DAYOFWEEK(timestamp) as day_num, DAYNAME(timestamp) as day_name, COUNT(*) as count
            FROM checkins
            GROUP BY DAYOFWEEK(timestamp), DAYNAME(timestamp)
            ORDER BY day_num
        """), conn)
        daily_data = daily.to_dict(orient='records')
        with open('data/checkins_by_day.json', 'w') as f:
            json.dump(daily_data, f)
        print(f"  Exported {len(daily_data)} daily records")
        
        print("Calculating geographic hotspots...")
        geo = pd.read_sql(text("""
            SELECT latitude, longitude, COUNT(*) as count
            FROM checkins
            WHERE latitude != 0 AND longitude != 0
            GROUP BY latitude, longitude
            ORDER BY count DESC
            LIMIT 100
        """), conn)
        geo_data = geo.to_dict(orient='records')
        with open('data/geographic_hotspots.json', 'w') as f:
            json.dump(geo_data, f)
        print(f"  Exported {len(geo_data)} hotspot records")
        
        print("\nData export complete!")

if __name__ == "__main__":
    import os
    os.makedirs('data', exist_ok=True)
    export_data()

#!/usr/bin/env python3
"""
Script to upload photos from MySQL to Cloudflare R2 using wrangler CLI.
This extracts base64 photos from the MySQL database and uploads them to R2.
Photos are optimized (resized and compressed) before upload.
"""

import os
import io
import json
import base64
import subprocess
import tempfile
from sqlalchemy import create_engine, text
import pandas as pd
from PIL import Image

# Photo optimization settings
MAX_WIDTH = 800  # Max width in pixels
MAX_HEIGHT = 800  # Max height in pixels
JPEG_QUALITY = 75  # JPEG compression quality (1-100)

# Load environment variables
DATABASE_URI = os.environ.get("DATABASE_URI")
R2_BUCKET_NAME = os.environ.get("R2_BUCKET_NAME", "ssreports-photos")

if not DATABASE_URI:
    raise ValueError("DATABASE_URI environment variable is required")

def optimize_photo(photo_bytes: bytes) -> bytes:
    """Resize and compress photo for optimal storage and loading"""
    try:
        img = Image.open(io.BytesIO(photo_bytes))
        
        # Convert to RGB if necessary (handles RGBA, P mode, etc.)
        if img.mode in ('RGBA', 'P', 'LA'):
            img = img.convert('RGB')
        
        # Calculate new dimensions maintaining aspect ratio
        width, height = img.size
        if width > MAX_WIDTH or height > MAX_HEIGHT:
            ratio = min(MAX_WIDTH / width, MAX_HEIGHT / height)
            new_width = int(width * ratio)
            new_height = int(height * ratio)
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Save with compression
        output = io.BytesIO()
        img.save(output, format='JPEG', quality=JPEG_QUALITY, optimize=True)
        return output.getvalue()
    except Exception as e:
        print(f"  Warning: Could not optimize photo: {e}")
        return photo_bytes  # Return original if optimization fails

def upload_to_r2(checkin_id: int, photo_bytes: bytes, optimize: bool = True) -> bool:
    """Upload photo to R2 using wrangler CLI"""
    try:
        # Optimize photo before upload
        if optimize:
            photo_bytes = optimize_photo(photo_bytes)
        
        # Write bytes to temp file
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as f:
            f.write(photo_bytes)
            temp_path = f.name
        
        # Upload using wrangler with --remote flag
        key = f"checkins/{checkin_id}.jpg"
        result = subprocess.run(
            ['npx', 'wrangler', 'r2', 'object', 'put', f'{R2_BUCKET_NAME}/{key}', '--file', temp_path, '--remote'],
            capture_output=True,
            text=True,
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
        
        # Clean up temp file
        os.unlink(temp_path)
        
        return result.returncode == 0
    except Exception as e:
        print(f"Error uploading: {e}")
        return False

def upload_photos():
    engine = create_engine(DATABASE_URI)
    
    with engine.connect() as conn:
        print("Fetching checkins with photos...")
        checkins = pd.read_sql(text("""
            SELECT id, photo_base64
            FROM checkins
            WHERE photo_base64 IS NOT NULL AND photo_base64 != ''
        """), conn)
        
        print(f"Found {len(checkins)} checkins with photos")
        
        uploaded = 0
        skipped = 0
        errors = 0
        
        for idx, row in checkins.iterrows():
            checkin_id = row['id']
            photo_base64 = row['photo_base64']
            
            if not photo_base64:
                skipped += 1
                continue
            
            try:
                # Strip data URI prefix if present (e.g., "data:image/jpeg;base64,")
                if photo_base64.startswith('data:'):
                    photo_base64 = photo_base64.split(',', 1)[1]
                
                # Decode base64 to bytes
                photo_bytes = base64.b64decode(photo_base64)
                
                # Upload to R2
                if upload_to_r2(checkin_id, photo_bytes):
                    uploaded += 1
                    if uploaded % 10 == 0:
                        print(f"  Uploaded {uploaded} photos...")
                else:
                    errors += 1
                    
            except Exception as e:
                errors += 1
                if errors <= 5:
                    print(f"  Error uploading photo for checkin {checkin_id}: {e}")
        
        print(f"\nUpload complete!")
        print(f"  Uploaded: {uploaded}")
        print(f"  Skipped: {skipped}")
        print(f"  Errors: {errors}")

if __name__ == "__main__":
    upload_photos()

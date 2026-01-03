"""
MineGlance Release Publisher
============================
This script publishes software releases to the Supabase database
AND uploads ZIP files to Supabase Storage automatically.

Instructions:
1. Install dependencies: pip install psycopg2-binary python-dotenv boto3
2. Create a .env file in this folder (see .env.example)
3. Run: python publish_releases.py

Last Updated: 2026-01-03
"""

import psycopg2
from datetime import datetime
from dotenv import load_dotenv
import os
import boto3
from botocore.config import Config

# Load environment variables from .env file
load_dotenv()

# ============================================
# CONFIGURATION - Load from .env file
# ============================================
DB_USER = os.getenv("user")
DB_PASSWORD = os.getenv("password")
DB_HOST = os.getenv("host")
DB_PORT = os.getenv("port", 6543)
DB_NAME = os.getenv("dbname", "postgres")

# S3 Storage config
S3_ENDPOINT = os.getenv("s3_endpoint")
S3_REGION = os.getenv("s3_region", "us-west-2")
S3_KEY_ID = os.getenv("s3_key_id")
S3_SECRET = os.getenv("s3_secret")
S3_BUCKET = os.getenv("s3_bucket", "software")

# Supabase storage bucket URL base
STORAGE_URL = "https://zbytbrcumxgfeqvhmzsf.supabase.co/storage/v1/object/public/software"

# ============================================
# PENDING RELEASES TO PUBLISH
# Claude Code updates this section after version changes
# ============================================
PENDING_RELEASES = [
    {
        "version": "1.0.5",
        "platform": "Chrome Extension",
        "release_notes": "Complete dark mode overhaul matching website theme. Dark backgrounds (#0a0a0a) with green accent color (#38a169). Updated popup and settings pages with glass morphism effects and glow styling. Compact wallet cards with resizable wallet list.",
        "zip_filename": "mineglance-extension-v1.0.5.zip",
        "is_latest": True
    },
    {
        "version": "1.0.4",
        "platform": "iOS App",
        "release_notes": "Dark mode theme matching extension. Updated splash screen, headers, and tab bar with dark backgrounds. Green notification accent color. Build 14.",
        "zip_filename": "mineglance-ios-v1.0.4.ipa",  # Or TestFlight link
        "is_latest": True
    }
]

# ============================================
# DO NOT EDIT BELOW THIS LINE
# ============================================

def get_s3_client():
    """Create S3 client for Supabase Storage"""
    return boto3.client(
        's3',
        endpoint_url=S3_ENDPOINT,
        region_name=S3_REGION,
        aws_access_key_id=S3_KEY_ID,
        aws_secret_access_key=S3_SECRET,
        config=Config(signature_version='s3v4')
    )

def upload_to_storage(filename):
    """Upload a file to Supabase Storage via S3 API"""
    filepath = os.path.join(os.path.dirname(__file__), filename)

    if not os.path.exists(filepath):
        print(f"  [SKIP] File not found: {filename}")
        return False

    try:
        s3 = get_s3_client()

        # Determine content type
        content_type = 'application/zip'
        if filename.endswith('.ipa'):
            content_type = 'application/octet-stream'

        print(f"  Uploading {filename}...")
        s3.upload_file(
            filepath,
            S3_BUCKET,
            filename,
            ExtraArgs={'ContentType': content_type}
        )
        print(f"  [OK] Uploaded to storage: {filename}")
        return True
    except Exception as e:
        print(f"  [ERROR] Failed to upload {filename}: {e}")
        return False

def get_connection():
    """Create database connection using Supabase pooler"""
    return psycopg2.connect(
        host=DB_HOST,
        port=int(DB_PORT),
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        sslmode='require'
    )

def publish_release(conn, release):
    """Publish a single release to the database"""
    cursor = conn.cursor()

    platform = release["platform"]
    version = release["version"]

    # Check if this version already exists
    cursor.execute(
        "SELECT id FROM software_releases WHERE platform = %s AND version = %s",
        (platform, version)
    )
    existing = cursor.fetchone()

    if existing:
        print(f"  [SKIP] {platform} v{version} already exists in database")
        return False

    # If this is latest, unmark previous latest
    if release.get("is_latest"):
        cursor.execute(
            "UPDATE software_releases SET is_latest = false WHERE platform = %s",
            (platform,)
        )

    # Build download URL
    download_url = f"{STORAGE_URL}/{release['zip_filename']}"

    # Insert new release
    cursor.execute("""
        INSERT INTO software_releases
        (version, platform, release_notes, download_url, is_latest, released_at)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id
    """, (
        version,
        platform,
        release["release_notes"],
        download_url,
        release.get("is_latest", False),
        datetime.now().isoformat()
    ))

    release_id = cursor.fetchone()[0]
    conn.commit()

    print(f"  [OK] {platform} v{version} published to database (ID: {release_id})")
    return True

def main():
    print("=" * 50)
    print("MineGlance Release Publisher")
    print("=" * 50)

    if not DB_PASSWORD or not DB_USER:
        print("\nERROR: Missing database credentials!")
        print("Create a .env file in this folder with:")
        print("  user=postgres.zbytbrcumxgfeqvhmzsf")
        print("  password=YOUR-PASSWORD-HERE")
        print("  host=aws-0-us-west-1.pooler.supabase.com")
        print("  port=6543")
        print("  dbname=postgres")
        return

    if not PENDING_RELEASES:
        print("\nNo pending releases to publish.")
        return

    # Check S3 credentials
    has_s3 = S3_KEY_ID and S3_SECRET and S3_ENDPOINT
    if not has_s3:
        print("\nWARNING: S3 credentials not configured - files will not be uploaded automatically")
        print("Add to .env: s3_endpoint, s3_key_id, s3_secret, s3_bucket")

    print(f"\nConnecting to database...")

    try:
        conn = get_connection()
        print("Connected successfully!\n")

        print(f"Publishing {len(PENDING_RELEASES)} release(s):\n")

        published = 0
        uploaded = 0

        for release in PENDING_RELEASES:
            print(f"\n- {release['platform']} v{release['version']}")

            # Upload file first (if S3 configured)
            if has_s3:
                if upload_to_storage(release['zip_filename']):
                    uploaded += 1

            # Publish to database
            if publish_release(conn, release):
                published += 1

        conn.close()

        print(f"\n{'=' * 50}")
        print(f"Results:")
        print(f"  - Database: {published} release(s) published")
        if has_s3:
            print(f"  - Storage: {uploaded} file(s) uploaded")
        print(f"{'=' * 50}")

        if not has_s3 and published > 0:
            print("\nREMINDER: Upload these ZIP files manually to Supabase Storage:")
            print("https://supabase.com/dashboard/project/zbytbrcumxgfeqvhmzsf/storage/files/buckets/software")
            print("\nFiles to upload from this folder:")
            for release in PENDING_RELEASES:
                print(f"  - {release['zip_filename']}")

    except Exception as e:
        print(f"\nERROR: {e}")
        raise

if __name__ == "__main__":
    main()

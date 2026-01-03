"""
MineGlance Release Publisher
============================
This script publishes software releases to the Supabase database
AND uploads ZIP files to Supabase Storage automatically.

Instructions:
1. Install dependencies: pip install python-dotenv boto3 requests
2. Create a .env file in this folder (see .env.example)
3. Run: python publish_releases.py

Last Updated: 2026-01-03
"""

import os
import subprocess
import json
import shutil
import requests
import boto3
from botocore.config import Config
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# ============================================
# CONFIGURATION - Load from .env file
# ============================================

# Supabase REST API config
SUPABASE_URL = os.getenv("supabase_url", "https://zbytbrcumxgfeqvhmzsf.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("supabase_service_key")

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
        "platform": "extension",  # Valid: extension, mobile_ios, mobile_android, website
        "release_notes": "Complete dark mode overhaul matching website theme. Dark backgrounds (#0a0a0a) with green accent color (#38a169). Updated popup and settings pages with glass morphism effects and glow styling. Compact wallet cards with resizable wallet list.",
        "zip_filename": "mineglance-extension-v1.0.5.zip",
        "is_latest": True
    },
    {
        "version": "1.0.3",
        "platform": "mobile_ios",  # Valid: extension, mobile_ios, mobile_android, website
        "release_notes": "Pro Plus features, QR wallet sync, wallet reordering, pool data fixes. Build 13.",
        "zip_filename": "mineglance-ios-v1.0.3.ipa",
        # eas_url not needed - script auto-fetches latest from EAS for mobile platforms
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

def get_extension_version():
    """Read version from extension manifest.json"""
    manifest_path = os.path.join(os.path.dirname(__file__), '..', 'extension', 'manifest.json')
    try:
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
            return manifest.get('version', 'unknown')
    except Exception as e:
        print(f"  [WARN] Could not read manifest: {e}")
        return None

def create_extension_zip(filename=None):
    """Create ZIP of extension folder"""
    extension_dir = os.path.join(os.path.dirname(__file__), '..', 'extension')

    if not os.path.exists(extension_dir):
        print(f"  [ERROR] Extension folder not found: {extension_dir}")
        return None

    version = get_extension_version()
    if not filename:
        filename = f"mineglance-extension-v{version}.zip"

    output_path = os.path.join(os.path.dirname(__file__), filename)

    # Remove .zip extension for shutil.make_archive
    archive_base = output_path.rsplit('.zip', 1)[0]

    try:
        print(f"  Creating ZIP from extension folder...")
        shutil.make_archive(archive_base, 'zip', extension_dir)
        print(f"  [OK] Created: {filename}")
        return filename
    except Exception as e:
        print(f"  [ERROR] Failed to create ZIP: {e}")
        return None

def get_latest_eas_build(platform):
    """Get the latest EAS build URL for a platform (ios or android)"""
    try:
        # Run from mobile directory where eas.json is located
        mobile_dir = os.path.join(os.path.dirname(__file__), '..', 'mobile')

        result = subprocess.run(
            ['npx', 'eas', 'build:list', '--platform', platform, '--limit', '1', '--json', '--non-interactive'],
            capture_output=True,
            text=True,
            cwd=mobile_dir,
            shell=True  # Required on Windows
        )

        if result.returncode != 0:
            print(f"  [WARN] EAS command failed: {result.stderr}")
            return None

        builds = json.loads(result.stdout)
        if builds and len(builds) > 0:
            build = builds[0]
            artifact_url = build.get('artifacts', {}).get('buildUrl')
            version = build.get('appVersion', 'unknown')
            build_number = build.get('appBuildVersion', '')
            print(f"  [EAS] Found build: v{version} ({build_number})")
            return artifact_url

        return None
    except Exception as e:
        print(f"  [WARN] Could not get EAS build: {e}")
        return None

def download_from_eas(eas_url, filename, platform=None):
    """Download IPA/APK from Expo EAS"""
    filepath = os.path.join(os.path.dirname(__file__), filename)

    # If no URL provided but platform specified, try to get latest from EAS
    if not eas_url and platform:
        print(f"  Checking EAS for latest {platform} build...")
        eas_url = get_latest_eas_build(platform)
        if not eas_url:
            print(f"  [SKIP] No EAS build URL available")
            return False

    if os.path.exists(filepath):
        print(f"  [SKIP] File already exists: {filename}")
        return True

    if not eas_url:
        print(f"  [SKIP] No download URL provided")
        return False

    try:
        print(f"  Downloading from EAS: {eas_url}")
        response = requests.get(eas_url, stream=True)
        response.raise_for_status()

        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        print(f"  [OK] Downloaded: {filename}")
        return True
    except Exception as e:
        print(f"  [ERROR] Failed to download from EAS: {e}")
        return False

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

def check_existing_release(platform, version):
    """Check if release already exists using Supabase REST API"""
    url = f"{SUPABASE_URL}/rest/v1/software_releases"
    params = {
        "platform": f"eq.{platform}",
        "version": f"eq.{version}",
        "select": "id"
    }
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"
    }

    response = requests.get(url, params=params, headers=headers)
    if response.status_code == 200:
        data = response.json()
        return len(data) > 0
    return False

def unset_latest_for_platform(platform):
    """Unset is_latest flag for all releases of this platform"""
    url = f"{SUPABASE_URL}/rest/v1/software_releases"
    params = {
        "platform": f"eq.{platform}"
    }
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    data = {"is_latest": False}

    response = requests.patch(url, params=params, headers=headers, json=data)
    return response.status_code in [200, 204]

def publish_release(release):
    """Publish a single release to the database using Supabase REST API"""
    platform = release["platform"]
    version = release["version"]

    # Check if this version already exists
    if check_existing_release(platform, version):
        print(f"  [SKIP] {platform} v{version} already exists in database")
        return False

    # If this is latest, unmark previous latest
    if release.get("is_latest"):
        unset_latest_for_platform(platform)

    # Build download URL
    download_url = f"{STORAGE_URL}/{release['zip_filename']}"

    # Insert new release
    url = f"{SUPABASE_URL}/rest/v1/software_releases"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    data = {
        "version": version,
        "platform": platform,
        "release_notes": release["release_notes"],
        "download_url": download_url,
        "is_latest": release.get("is_latest", False),
        "released_at": datetime.now().isoformat()
    }

    response = requests.post(url, headers=headers, json=data)

    if response.status_code in [200, 201]:
        result = response.json()
        release_id = result[0]["id"] if result else "?"
        print(f"  [OK] {platform} v{version} published to database (ID: {release_id})")
        return True
    else:
        print(f"  [ERROR] Failed to publish {platform} v{version}: {response.status_code}")
        print(f"         {response.text}")
        return False

def main():
    print("=" * 50)
    print("MineGlance Release Publisher")
    print("=" * 50)

    if not SUPABASE_SERVICE_KEY:
        print("\nERROR: Missing Supabase service key!")
        print("Add to your .env file:")
        print("  supabase_url=https://zbytbrcumxgfeqvhmzsf.supabase.co")
        print("  supabase_service_key=YOUR-SERVICE-ROLE-KEY")
        print("\nGet your service role key from:")
        print("  Supabase Dashboard > Project Settings > API > service_role key")
        return

    if not PENDING_RELEASES:
        print("\nNo pending releases to publish.")
        return

    # Check S3 credentials
    has_s3 = S3_KEY_ID and S3_SECRET and S3_ENDPOINT
    if not has_s3:
        print("\nWARNING: S3 credentials not configured - files will not be uploaded automatically")
        print("Add to .env: s3_endpoint, s3_key_id, s3_secret, s3_bucket")

    print(f"\nConnecting to Supabase REST API...")
    print(f"URL: {SUPABASE_URL}")

    print(f"\nPublishing {len(PENDING_RELEASES)} release(s):\n")

    published = 0
    uploaded = 0

    for release in PENDING_RELEASES:
        print(f"\n- {release['platform']} v{release['version']}")

        # Auto-create extension ZIP
        if release['platform'] == 'extension':
            create_extension_zip(release['zip_filename'])

        # Download from EAS if URL provided or auto-fetch for mobile
        eas_platform = 'ios' if release['platform'] == 'mobile_ios' else 'android' if release['platform'] == 'mobile_android' else None
        if release.get('eas_url') or eas_platform:
            download_from_eas(release.get('eas_url'), release['zip_filename'], eas_platform)

        # Upload file first (if S3 configured)
        if has_s3:
            if upload_to_storage(release['zip_filename']):
                uploaded += 1

        # Publish to database
        if publish_release(release):
            published += 1

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

if __name__ == "__main__":
    main()

"""
MineGlance Release Publisher
============================
This script builds, uploads, and publishes software releases automatically.

For iOS/Android:
  - Triggers EAS build if no matching build exists
  - Waits up to 60 minutes for build to complete
  - Downloads IPA/APK from EAS
  - Uploads to Supabase Storage
  - Publishes to software_releases table
  - Cleans up local files

For Extension:
  - Creates ZIP from extension/ folder
  - Uploads to Supabase Storage
  - Publishes to software_releases table

Instructions:
1. Install dependencies: pip install python-dotenv boto3 requests
2. Create a .env file in this folder (see .env.example)
3. Update PENDING_RELEASES with the new version info
4. Run: python publish_releases.py

Last Updated: 2026-01-03
"""

import os
import subprocess
import json
import shutil
import time
import requests
import boto3
from botocore.config import Config
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Node.js path for Windows (add to PATH for subprocess)
NODEJS_PATH = r"C:\Program Files\nodejs"

def get_env_with_nodejs():
    """Get environment dict with Node.js in PATH for subprocess calls"""
    env = os.environ.copy()
    if os.name == 'nt':  # Windows
        env['PATH'] = NODEJS_PATH + os.pathsep + env.get('PATH', '')
    return env

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

# Retry settings for EAS builds
EAS_RETRY_WAIT = 30   # 30 seconds between checks
EAS_MAX_RETRIES = 120 # 60 minutes total (iOS builds take ~15-20 min)

# ============================================
# PENDING RELEASES TO PUBLISH
# Claude Code updates this section after version changes
# ============================================
# Add releases here when ready to publish
# The script will:
#   - Auto-create ZIP from extension/ folder for extension platform
#   - Auto-trigger EAS build and wait for completion (mobile_ios/android)
#   - Auto-download IPA/APK from EAS after build completes
#   - Upload to Supabase Storage
#   - Publish to software_releases table
#   - Clean up local files after successful upload
#
# Example:
# {
#     "version": "1.0.6",
#     "platform": "extension",  # Valid: extension, mobile_ios, mobile_android
#     "release_notes": "Description of changes...",
#     "zip_filename": "mineglance-extension-v1.0.6.zip",
#     "is_latest": True
# }

PENDING_RELEASES = [
    {
        "version": "1.0.6",
        "platform": "extension",
        "release_notes": "Add Lite Mode (light theme) in settings. Compact profit summary. Fixed wallet list to not cover Minable Coins section.",
        "zip_filename": "mineglance-extension-v1.0.6.zip",
        "is_latest": True
    },
    {
        "version": "1.0.6",
        "platform": "mobile_ios",
        "release_notes": "Add Lite Mode (light theme) option in Display settings. Dark mode remains the default. Build 17.",
        "zip_filename": "mineglance-ios-v1.0.6.ipa",
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

def trigger_eas_build(platform):
    """Trigger a new EAS build for iOS or Android"""
    mobile_dir = os.path.join(os.path.dirname(__file__), '..', 'mobile')

    print(f"  [EAS] Starting {platform} build...")
    print(f"  [EAS] This will take 15-20 minutes. Please wait...")

    try:
        # Run the EAS build command (use string for Windows shell=True)
        cmd = f'npx eas build --platform {platform} --profile production --non-interactive'
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=mobile_dir,
            shell=True,  # Required on Windows
            env=get_env_with_nodejs()
        )

        if result.returncode != 0:
            print(f"  [ERROR] EAS build command failed!")
            print(f"  STDOUT: {result.stdout[:500] if result.stdout else 'None'}")
            print(f"  STDERR: {result.stderr[:500] if result.stderr else 'None'}")
            return False

        print(f"  [EAS] Build submitted successfully!")
        print(f"  [EAS] Waiting for build to complete...")
        return True

    except Exception as e:
        print(f"  [ERROR] Failed to trigger EAS build: {e}")
        return False

def submit_to_app_store(platform):
    """Submit the latest build to App Store Connect (TestFlight) or Google Play"""
    mobile_dir = os.path.join(os.path.dirname(__file__), '..', 'mobile')

    store_name = "TestFlight" if platform == "ios" else "Google Play"
    print(f"  [EAS] Submitting to {store_name}...")

    try:
        # Use string command for Windows shell=True compatibility
        cmd = f'npx eas submit --platform {platform} --latest --non-interactive'
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=mobile_dir,
            shell=True,  # Required on Windows
            env=get_env_with_nodejs()
        )

        if result.returncode != 0:
            print(f"  [WARN] Submit command returned non-zero, checking output...")
            # Sometimes submit succeeds but returns non-zero, check output
            if "Submitted" in result.stdout or "submitted" in result.stdout.lower():
                print(f"  [OK] Submitted to {store_name}!")
                return True
            print(f"  STDOUT: {result.stdout[:500] if result.stdout else 'None'}")
            print(f"  STDERR: {result.stderr[:500] if result.stderr else 'None'}")
            return False

        print(f"  [OK] Submitted to {store_name}!")
        return True

    except Exception as e:
        print(f"  [ERROR] Failed to submit to {store_name}: {e}")
        return False

def get_latest_eas_build(platform, expected_version=None):
    """Get the latest EAS build URL for a platform (ios or android)"""
    try:
        # Run from mobile directory where eas.json is located
        mobile_dir = os.path.join(os.path.dirname(__file__), '..', 'mobile')

        # Use string command for Windows shell=True compatibility
        cmd = f'npx eas build:list --platform {platform} --limit 1 --json --non-interactive'
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=mobile_dir,
            shell=True,  # Required on Windows
            env=get_env_with_nodejs()
        )

        if result.returncode != 0:
            print(f"  [WARN] EAS command failed: {result.stderr.strip()}")
            return None, None, None

        builds = json.loads(result.stdout)
        if builds and len(builds) > 0:
            build = builds[0]
            artifact_url = build.get('artifacts', {}).get('buildUrl')
            version = build.get('appVersion', 'unknown')
            build_number = build.get('appBuildVersion', '')
            status = build.get('status', 'unknown')

            print(f"  [EAS] Latest build: v{version} (build {build_number}) - {status}")

            # Check if build is finished
            if status != 'FINISHED':
                print(f"  [WAIT] Build not finished yet (status: {status})")
                return None, version, build_number

            # Check if version matches expected
            if expected_version and version != expected_version:
                print(f"  [WAIT] Expected v{expected_version}, found v{version}")
                return None, version, build_number

            return artifact_url, version, build_number

        return None, None, None
    except json.JSONDecodeError as e:
        print(f"  [WARN] Could not parse EAS response: {e}")
        return None, None, None
    except Exception as e:
        print(f"  [WARN] Could not get EAS build: {e}")
        return None, None, None

def build_and_download_from_eas(filename, platform, expected_version):
    """Trigger EAS build, wait for completion, and download IPA/APK"""
    filepath = os.path.join(os.path.dirname(__file__), filename)

    if os.path.exists(filepath):
        print(f"  [SKIP] File already exists: {filename}")
        return True

    # Step 1: Check if matching build already exists
    print(f"  Checking for existing EAS build...")
    eas_url, found_version, build_number = get_latest_eas_build(platform, expected_version)

    if not eas_url:
        # Step 2: No matching build - trigger a new one
        print(f"  [EAS] No matching build found. Starting new build...")
        if not trigger_eas_build(platform):
            print(f"  [ERROR] Failed to start EAS build")
            return False

        # Give EAS a moment to register the build
        print(f"  [WAIT] Waiting 30 seconds for build to register...")
        time.sleep(30)

    # Step 3: Wait for build to complete
    for attempt in range(EAS_MAX_RETRIES):
        elapsed_sec = attempt * EAS_RETRY_WAIT
        elapsed_str = f"{elapsed_sec // 60}m {elapsed_sec % 60}s" if elapsed_sec >= 60 else f"{elapsed_sec}s"
        print(f"  Checking EAS for {platform} v{expected_version}... ({elapsed_str} elapsed)")

        eas_url, found_version, build_number = get_latest_eas_build(platform, expected_version)

        if eas_url:
            # Found the right build, download it
            try:
                print(f"  Downloading from EAS...")
                response = requests.get(eas_url, stream=True)
                response.raise_for_status()

                total_size = int(response.headers.get('content-length', 0))
                downloaded = 0

                with open(filepath, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                        downloaded += len(chunk)
                        if total_size > 0:
                            pct = int(downloaded * 100 / total_size)
                            print(f"\r  Downloading: {pct}%", end='', flush=True)

                print(f"\n  [OK] Downloaded: {filename}")
                return True
            except Exception as e:
                print(f"  [ERROR] Failed to download: {e}")
                return False

        if attempt < EAS_MAX_RETRIES - 1:
            print(f"  [WAIT] Build not ready. Waiting {EAS_RETRY_WAIT} seconds...")
            time.sleep(EAS_RETRY_WAIT)

    print(f"  [ERROR] Build not available after {EAS_MAX_RETRIES * EAS_RETRY_WAIT // 60} minutes")
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

def cleanup_local_file(filename):
    """Delete local file after successful upload"""
    filepath = os.path.join(os.path.dirname(__file__), filename)
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
            print(f"  [CLEANUP] Deleted local file: {filename}")
            return True
    except Exception as e:
        print(f"  [WARN] Could not delete {filename}: {e}")
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
        print("\nERROR: S3 credentials not configured!")
        print("Add to .env: s3_endpoint, s3_key_id, s3_secret, s3_bucket")
        return

    print(f"\nConnecting to Supabase REST API...")
    print(f"URL: {SUPABASE_URL}")

    print(f"\nPublishing {len(PENDING_RELEASES)} release(s):\n")

    published = 0
    uploaded = 0
    cleaned = 0
    submitted = 0

    for release in PENDING_RELEASES:
        print(f"\n{'=' * 40}")
        print(f"Processing: {release['platform']} v{release['version']}")
        print(f"{'=' * 40}")

        filename = release['zip_filename']
        file_ready = False
        eas_platform = None
        already_in_db = check_existing_release(release['platform'], release['version'])

        # For mobile builds, check if we should just submit to TestFlight
        if release['platform'] in ['mobile_ios', 'mobile_android']:
            eas_platform = 'ios' if release['platform'] == 'mobile_ios' else 'android'

            # If already in DB, just try to submit to app store
            if already_in_db:
                print(f"  [INFO] Already in database, checking for TestFlight submission...")
                eas_url, found_version, _ = get_latest_eas_build(eas_platform, release['version'])
                if eas_url:
                    print(f"  [INFO] Found matching build on EAS, submitting to app store...")
                    if submit_to_app_store(eas_platform):
                        submitted += 1
                else:
                    print(f"  [SKIP] No matching build found on EAS")
                continue

        # Step 1: Get the file (create ZIP or download IPA)
        if release['platform'] == 'extension':
            if create_extension_zip(filename):
                file_ready = True
        elif eas_platform:
            if build_and_download_from_eas(filename, eas_platform, release['version']):
                file_ready = True
        else:
            # Check if file exists locally
            filepath = os.path.join(os.path.dirname(__file__), filename)
            if os.path.exists(filepath):
                file_ready = True
            else:
                print(f"  [ERROR] File not found: {filename}")

        if not file_ready:
            print(f"  [SKIP] Could not get file, skipping release")
            continue

        # Step 2: Upload to storage
        if upload_to_storage(filename):
            uploaded += 1

            # Step 3: Publish to database (only after successful upload)
            if publish_release(release):
                published += 1

                # Step 4: Submit to TestFlight/Google Play (for mobile builds)
                if eas_platform:
                    if submit_to_app_store(eas_platform):
                        submitted += 1

                # Step 5: Cleanup local file after success
                if cleanup_local_file(filename):
                    cleaned += 1
        else:
            print(f"  [ERROR] Upload failed, not publishing to database")

    print(f"\n{'=' * 50}")
    print(f"Results:")
    print(f"  - Files uploaded: {uploaded}")
    print(f"  - Releases published: {published}")
    print(f"  - App store submissions: {submitted}")
    print(f"  - Local files cleaned: {cleaned}")
    print(f"{'=' * 50}")

if __name__ == "__main__":
    main()

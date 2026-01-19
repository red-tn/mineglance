"""
MineGlance Release Publisher
============================
This script builds, uploads, and publishes software releases automatically.

For Extension:
  - Creates ZIP from extension/ folder
  - Uploads to Supabase Storage
  - Publishes to software_releases table

For Desktop (Windows):
  - Finds exe from Tauri build output (desktop/src-tauri/target/release/bundle/nsis/)
  - Uploads to Supabase Storage
  - Publishes to software_releases table
  - NOTE: Run 'npm run tauri build' in desktop folder before running this script

Website Sync:
  - Checks for uncommitted changes
  - Checks for unpushed commits
  - Automatically commits and pushes website updates

Instructions:
1. Install dependencies: pip install python-dotenv boto3 requests
2. Create a .env file in this folder (see .env.example)
3. Update PENDING_RELEASES with the new version info
4. Run: python publish_releases.py

Last Updated: 2026-01-19
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
# Add releases here when ready to publish
# The script will:
#   - Auto-create ZIP from extension/ folder for extension platform
#   - Auto-find exe from desktop build output for desktop_windows platform
#   - Upload to Supabase Storage
#   - Publish to software_releases table
#   - Clean up local files after successful upload
#
# Example:
# {
#     "version": "1.0.6",
#     "platform": "extension",  # Valid: extension, desktop_windows, desktop_macos
#     "release_notes": "Description of changes...",
#     "zip_filename": "mineglance-extension-v1.0.6.zip",
#     "is_latest": True
# }

PENDING_RELEASES = [
    # Desktop App v1.3.7
    {
        "version": "1.3.7",
        "platform": "desktop_windows",
        "release_notes": """v1.3.7 - Uninstall Cleanup Fix

- Fixed uninstall not removing device from dashboard
- Improved NSIS uninstall hook reliability
- Local data properly cleaned on uninstall
- Fresh instance ID on reinstall""",
        "zip_filename": "mineglance-desktop-1.3.7-windows.exe",
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

def get_desktop_version():
    """Read version from tauri.conf.json"""
    tauri_conf_path = os.path.join(os.path.dirname(__file__), '..', 'desktop', 'src-tauri', 'tauri.conf.json')
    try:
        with open(tauri_conf_path, 'r') as f:
            config = json.load(f)
            return config.get('version', 'unknown')
    except Exception as e:
        print(f"  [WARN] Could not read tauri.conf.json: {e}")
        return None

def find_latest_desktop_exe():
    """Find the latest built desktop exe in the Tauri bundle folder"""
    tauri_bundle_dir = os.path.join(os.path.dirname(__file__), '..', 'desktop', 'src-tauri', 'target', 'release', 'bundle', 'nsis')

    if not os.path.exists(tauri_bundle_dir):
        return None, None

    try:
        exe_files = [f for f in os.listdir(tauri_bundle_dir) if f.endswith('.exe') and 'MineGlance' in f]
        if not exe_files:
            return None, None

        # Sort by modification time, newest first
        exe_files.sort(key=lambda f: os.path.getmtime(os.path.join(tauri_bundle_dir, f)), reverse=True)
        latest_exe = exe_files[0]

        # Extract version from filename (e.g., "MineGlance_1.3.7_x64-setup.exe")
        import re
        match = re.search(r'MineGlance_(\d+\.\d+\.\d+)_', latest_exe)
        if match:
            version = match.group(1)
            return version, os.path.join(tauri_bundle_dir, latest_exe)

        return None, os.path.join(tauri_bundle_dir, latest_exe)
    except Exception as e:
        print(f"  [WARN] Could not scan bundle directory: {e}")
        return None, None

def auto_detect_desktop_release():
    """Auto-detect desktop release from built files"""
    version = get_desktop_version()
    if not version:
        print("  [ERROR] Could not read version from tauri.conf.json")
        return None

    # Check if exe exists for this version
    tauri_bundle_dir = os.path.join(os.path.dirname(__file__), '..', 'desktop', 'src-tauri', 'target', 'release', 'bundle', 'nsis')
    exe_pattern = f"MineGlance_{version}_x64-setup.exe"
    source_exe = os.path.join(tauri_bundle_dir, exe_pattern)

    if not os.path.exists(source_exe):
        print(f"  [ERROR] No built exe found for v{version}")
        print(f"  Expected: {source_exe}")
        print(f"  Run 'npm run tauri build' in desktop folder first")
        return None

    return {
        "version": version,
        "platform": "desktop_windows",
        "release_notes": f"v{version} - Desktop Release",
        "zip_filename": f"mineglance-desktop-{version}-windows.exe",
        "is_latest": True
    }

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

def build_desktop_app():
    """Build the desktop app using npm run tauri build"""
    desktop_dir = os.path.join(os.path.dirname(__file__), '..', 'desktop')

    if not os.path.exists(desktop_dir):
        print(f"  [ERROR] Desktop directory not found: {desktop_dir}")
        return False

    print(f"  [BUILD] Running 'npm run tauri build' in desktop folder...")
    print(f"  [BUILD] This may take a few minutes...")

    try:
        result = subprocess.run(
            'npm run tauri build',
            cwd=desktop_dir,
            shell=True,
            capture_output=False,  # Show output in real-time
            timeout=600  # 10 minute timeout
        )

        if result.returncode == 0:
            print(f"  [OK] Desktop build completed successfully!")
            return True
        else:
            print(f"  [ERROR] Desktop build failed with exit code {result.returncode}")
            return False
    except subprocess.TimeoutExpired:
        print(f"  [ERROR] Desktop build timed out after 10 minutes")
        return False
    except Exception as e:
        print(f"  [ERROR] Desktop build failed: {e}")
        return False

def get_desktop_exe(filename, version):
    """Find and copy the desktop exe from Tauri build output, building if needed"""
    # Tauri builds the exe in this location
    tauri_bundle_dir = os.path.join(os.path.dirname(__file__), '..', 'desktop', 'src-tauri', 'target', 'release', 'bundle', 'nsis')

    # Look for the exe file - Tauri names it like "MineGlance_1.2.9_x64-setup.exe"
    exe_pattern = f"MineGlance_{version}_x64-setup.exe"
    source_exe = os.path.join(tauri_bundle_dir, exe_pattern)

    # Check if exe exists, if not, build it
    if not os.path.exists(source_exe):
        print(f"  [INFO] Exe not found for v{version}, building...")
        if not build_desktop_app():
            return None

    # Re-check after build
    if not os.path.exists(source_exe):
        # Try to find any exe in the folder
        if not os.path.exists(tauri_bundle_dir):
            print(f"  [ERROR] Tauri bundle directory not found after build")
            return None
        print(f"  [WARN] Expected exe not found: {exe_pattern}")
        print(f"  Looking for other exe files in {tauri_bundle_dir}...")
        try:
            exe_files = [f for f in os.listdir(tauri_bundle_dir) if f.endswith('.exe')]
            if exe_files:
                print(f"  Found: {exe_files}")
                # Use the first one if it matches the version pattern
                for exe in exe_files:
                    if version in exe:
                        source_exe = os.path.join(tauri_bundle_dir, exe)
                        print(f"  Using: {exe}")
                        break
                else:
                    print(f"  [ERROR] No exe found matching version {version}")
                    return None
            else:
                print(f"  [ERROR] No exe files found in bundle directory")
                return None
        except Exception as e:
            print(f"  [ERROR] Could not list bundle directory: {e}")
            return None

    # Copy to roadmap folder with the target filename
    output_path = os.path.join(os.path.dirname(__file__), filename)

    try:
        print(f"  Copying desktop exe to {filename}...")
        shutil.copy2(source_exe, output_path)

        # Show file size
        size_mb = os.path.getsize(output_path) / (1024 * 1024)
        print(f"  [OK] Copied: {filename} ({size_mb:.1f} MB)")
        return filename
    except Exception as e:
        print(f"  [ERROR] Failed to copy exe: {e}")
        return None

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
        if filename.endswith('.exe'):
            content_type = 'application/x-msdownload'

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

def check_git_status():
    """Check if there are uncommitted changes in the repo"""
    repo_dir = os.path.join(os.path.dirname(__file__), '..')
    try:
        result = subprocess.run(
            ['git', 'status', '--porcelain'],
            cwd=repo_dir,
            capture_output=True,
            text=True
        )
        # Returns list of changed files, empty if clean
        return result.stdout.strip().split('\n') if result.stdout.strip() else []
    except Exception as e:
        print(f"  [WARN] Could not check git status: {e}")
        return []

def check_unpushed_commits():
    """Check if there are commits that haven't been pushed"""
    repo_dir = os.path.join(os.path.dirname(__file__), '..')
    try:
        # First fetch to make sure we have latest remote state (with timeout)
        try:
            subprocess.run(['git', 'fetch'], cwd=repo_dir, capture_output=True, timeout=10)
        except subprocess.TimeoutExpired:
            print("  [WARN] Git fetch timed out, skipping remote check")

        # Check for unpushed commits
        result = subprocess.run(
            ['git', 'log', 'origin/main..HEAD', '--oneline'],
            cwd=repo_dir,
            capture_output=True,
            text=True,
            timeout=10
        )
        commits = result.stdout.strip().split('\n') if result.stdout.strip() else []
        return commits
    except Exception as e:
        print(f"  [WARN] Could not check unpushed commits: {e}")
        return []

def sync_website_to_git():
    """Check for changes and push website updates to git"""
    print("\n" + "=" * 50)
    print("Checking Git Status...")
    print("=" * 50)

    repo_dir = os.path.join(os.path.dirname(__file__), '..')

    # Check for uncommitted changes
    changes = check_git_status()
    unpushed = check_unpushed_commits()

    if not changes and not unpushed:
        print("  [OK] No changes to push - repo is up to date")
        return True

    # Show what's changed
    if changes:
        print(f"\n  Found {len(changes)} uncommitted change(s):")
        for change in changes[:10]:  # Show first 10
            print(f"    {change}")
        if len(changes) > 10:
            print(f"    ... and {len(changes) - 10} more")

    if unpushed:
        print(f"\n  Found {len(unpushed)} unpushed commit(s):")
        for commit in unpushed[:5]:
            print(f"    {commit}")
        if len(unpushed) > 5:
            print(f"    ... and {len(unpushed) - 5} more")

    # If there are uncommitted changes, commit them
    if changes:
        print("\n  [GIT] Staging and committing changes...")
        try:
            # Stage only tracked files (avoid untracked junk folders)
            subprocess.run(['git', 'add', '-u'], cwd=repo_dir, capture_output=True, check=True, timeout=10)
            # Also add .gitignore if modified
            subprocess.run(['git', 'add', '.gitignore'], cwd=repo_dir, capture_output=True, timeout=10)

            # Create commit message
            commit_msg = f"""Website updates - auto-commit

Changes include dashboard, admin, and extension updates.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"""

            result = subprocess.run(
                ['git', 'commit', '-m', commit_msg],
                cwd=repo_dir,
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode == 0:
                print("  [OK] Changes committed")
            else:
                print(f"  [WARN] Commit may have failed: {result.stderr}")
        except Exception as e:
            print(f"  [ERROR] Failed to commit: {e}")
            return False

    # Push to remote
    print("  [GIT] Pushing to origin/main...")
    try:
        result = subprocess.run(
            ['git', 'push'],
            cwd=repo_dir,
            capture_output=True,
            text=True,
            timeout=120  # 2 minute timeout for push
        )

        if result.returncode == 0:
            print("  [OK] Pushed to remote successfully!")
            return True
        else:
            print(f"  [ERROR] Push failed: {result.stderr}")
            return False
    except subprocess.TimeoutExpired:
        print("  [ERROR] Git push timed out after 2 minutes")
        return False
    except Exception as e:
        print(f"  [ERROR] Failed to push: {e}")
        return False

def main():
    global PENDING_RELEASES

    print("=" * 50)
    print("MineGlance Release Publisher")
    print("=" * 50)

    # Step 0: Sync website changes to git first
    sync_website_to_git()

    if not SUPABASE_SERVICE_KEY:
        print("\nERROR: Missing Supabase service key!")
        print("Add to your .env file:")
        print("  supabase_url=https://zbytbrcumxgfeqvhmzsf.supabase.co")
        print("  supabase_service_key=YOUR-SERVICE-ROLE-KEY")
        print("\nGet your service role key from:")
        print("  Supabase Dashboard > Project Settings > API > service_role key")
        return

    # Auto-detect releases if none specified
    if not PENDING_RELEASES:
        print("\n" + "=" * 50)
        print("Auto-detecting releases from build output...")
        print("=" * 50)

        # Try to auto-detect desktop release
        desktop_release = auto_detect_desktop_release()
        if desktop_release:
            print(f"  [FOUND] Desktop v{desktop_release['version']}")
            PENDING_RELEASES = [desktop_release]
        else:
            print("\nNo releases found. Build the app first:")
            print("  cd desktop && npm run tauri build")
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

    for release in PENDING_RELEASES:
        print(f"\n{'=' * 40}")
        print(f"Processing: {release['platform']} v{release['version']}")
        print(f"{'=' * 40}")

        filename = release['zip_filename']
        file_ready = False

        # Step 1: Get the file (create ZIP or find EXE)
        if release['platform'] == 'extension':
            if create_extension_zip(filename):
                file_ready = True
        elif release['platform'] == 'desktop_windows':
            if get_desktop_exe(filename, release['version']):
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

                # Step 4: Cleanup local file after success
                if cleanup_local_file(filename):
                    cleaned += 1
        else:
            print(f"  [ERROR] Upload failed, not publishing to database")

    print(f"\n{'=' * 50}")
    print(f"Results:")
    print(f"  - Files uploaded: {uploaded}")
    print(f"  - Releases published: {published}")
    print(f"  - Local files cleaned: {cleaned}")
    print(f"{'=' * 50}")

if __name__ == "__main__":
    main()

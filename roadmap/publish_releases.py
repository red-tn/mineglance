"""
MineGlance Release Publisher
============================
This script builds, uploads, and publishes software releases automatically.

For iOS/Android:
  - Triggers GitHub Actions workflow (builds on free macOS runner)
  - Waits for workflow to complete and submit to TestFlight
  - Publishes to software_releases table

For Extension:
  - Creates ZIP from extension/ folder
  - Uploads to Supabase Storage
  - Publishes to software_releases table

Website Sync:
  - Checks for uncommitted changes
  - Checks for unpushed commits
  - Automatically commits and pushes website updates

Instructions:
1. Install dependencies: pip install python-dotenv boto3 requests
2. Create a .env file in this folder (see .env.example)
3. Update PENDING_RELEASES with the new version info
4. Run: python publish_releases.py

Last Updated: 2026-01-05
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

def trigger_github_workflow(version, release_notes):
    """Trigger GitHub Actions workflow for iOS build"""
    if not GITHUB_TOKEN:
        print("  [ERROR] GitHub token not configured!")
        print("  Add github_token to your .env file")
        return None

    url = f"https://api.github.com/repos/{GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}/actions/workflows/{GITHUB_WORKFLOW_FILE}/dispatches"
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "X-GitHub-Api-Version": "2022-11-28"
    }
    data = {
        "ref": "main",
        "inputs": {
            "version": version,
            "release_notes": release_notes
        }
    }

    print(f"  [GitHub] Triggering iOS build workflow...")
    response = requests.post(url, headers=headers, json=data)

    if response.status_code == 204:
        print(f"  [OK] Workflow triggered successfully!")
        # Get the workflow run ID (need to poll for it)
        time.sleep(3)  # Wait for GitHub to create the run
        return get_latest_workflow_run()
    else:
        print(f"  [ERROR] Failed to trigger workflow: {response.status_code}")
        print(f"         {response.text}")
        return None

def get_latest_workflow_run():
    """Get the most recent workflow run ID"""
    url = f"https://api.github.com/repos/{GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}/actions/workflows/{GITHUB_WORKFLOW_FILE}/runs"
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "X-GitHub-Api-Version": "2022-11-28"
    }
    params = {"per_page": 1}

    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200:
        runs = response.json().get("workflow_runs", [])
        if runs:
            return runs[0]["id"]
    return None

def get_workflow_run_status(run_id):
    """Get the status of a workflow run"""
    url = f"https://api.github.com/repos/{GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}/actions/runs/{run_id}"
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "X-GitHub-Api-Version": "2022-11-28"
    }

    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        return data.get("status"), data.get("conclusion")
    return None, None

def wait_for_workflow_completion(run_id):
    """Wait for a GitHub Actions workflow to complete"""
    print(f"  [GitHub] Waiting for workflow to complete (run #{run_id})...")
    print(f"  [GitHub] This typically takes 20-30 minutes for iOS builds...")

    for attempt in range(BUILD_MAX_RETRIES):
        elapsed_sec = attempt * BUILD_RETRY_WAIT
        elapsed_str = f"{elapsed_sec // 60}m {elapsed_sec % 60}s" if elapsed_sec >= 60 else f"{elapsed_sec}s"

        status, conclusion = get_workflow_run_status(run_id)

        if status == "completed":
            if conclusion == "success":
                print(f"  [OK] Workflow completed successfully! ({elapsed_str})")
                return True
            else:
                print(f"  [ERROR] Workflow failed with conclusion: {conclusion}")
                return False

        print(f"  [WAIT] Status: {status} ({elapsed_str} elapsed)")
        time.sleep(BUILD_RETRY_WAIT)

    print(f"  [ERROR] Workflow did not complete within {BUILD_MAX_RETRIES * BUILD_RETRY_WAIT // 60} minutes")
    return False

def build_ios_with_github_actions(version, release_notes):
    """Build iOS app using GitHub Actions and wait for completion"""
    print(f"  [GitHub] Starting iOS build via GitHub Actions...")

    # Trigger the workflow
    run_id = trigger_github_workflow(version, release_notes)
    if not run_id:
        return False

    # Wait for completion
    return wait_for_workflow_completion(run_id)

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

# GitHub Actions config (deprecated - using local Mac builds now)
GITHUB_TOKEN = os.getenv("github_token")
GITHUB_REPO_OWNER = os.getenv("github_repo_owner", "red-tn")
GITHUB_REPO_NAME = os.getenv("github_repo_name", "mineglance")
GITHUB_WORKFLOW_FILE = "ios-build.yml"

# Local Mac build config
# Set USE_LOCAL_MAC_BUILD=true in .env to use local Mac for iOS builds
USE_LOCAL_MAC_BUILD = os.getenv("use_local_mac_build", "false").lower() == "true"
MAC_BUILD_SCRIPT = "build-ios-mac.sh"

# Retry settings for builds
BUILD_RETRY_WAIT = 30   # 30 seconds between checks
BUILD_MAX_RETRIES = 80  # 40 minutes total (GitHub Actions iOS builds take ~20-30 min)

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
    # Extension v1.1.8 already published
    # {
    #     "version": "1.1.8",
    #     "platform": "extension",
    #     "release_notes": "Version sync with mobile app. No functional changes from 1.1.3.",
    #     "zip_filename": "mineglance-extension-v1.1.8.zip",
    #     "is_latest": True
    # },
    {
        "version": "1.1.8",
        "platform": "mobile_ios",
        "release_notes": "Pro/Free restrictions audit: Fixed all PRO+ references to PRO (single tier). Wallet locking confirmed working for free users. Fixed upgrade buttons with $59/year pricing. Removed duplicate Account section in settings.",
        "zip_filename": "mineglance-ios-v1.1.8.ipa",
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

def get_ios_build_number():
    """Read iOS build number from app.json"""
    app_json_path = os.path.join(os.path.dirname(__file__), '..', 'mobile', 'app.json')
    try:
        with open(app_json_path, 'r') as f:
            config = json.load(f)
            return int(config.get('expo', {}).get('ios', {}).get('buildNumber', '1'))
    except Exception as e:
        print(f"  [WARN] Could not read app.json: {e}")
        return None

def increment_ios_build_number():
    """Increment iOS build number in app.json and commit"""
    app_json_path = os.path.join(os.path.dirname(__file__), '..', 'mobile', 'app.json')
    try:
        with open(app_json_path, 'r') as f:
            config = json.load(f)

        current_build = int(config.get('expo', {}).get('ios', {}).get('buildNumber', '1'))
        new_build = current_build + 1

        config['expo']['ios']['buildNumber'] = str(new_build)

        with open(app_json_path, 'w') as f:
            json.dump(config, f, indent=2)
            f.write('\n')

        print(f"  [OK] Incremented iOS build number: {current_build} -> {new_build}")

        # Git commit and push
        repo_dir = os.path.join(os.path.dirname(__file__), '..')
        subprocess.run(['git', 'add', 'mobile/app.json'], cwd=repo_dir, capture_output=True, timeout=10)
        subprocess.run(['git', 'commit', '-m', f'Bump iOS build number to {new_build}'], cwd=repo_dir, capture_output=True, timeout=10)
        subprocess.run(['git', 'push'], cwd=repo_dir, capture_output=True, timeout=60)
        print(f"  [OK] Committed and pushed build number change")

        return new_build
    except Exception as e:
        print(f"  [ERROR] Could not increment build number: {e}")
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

    # Build download URL (iOS/Android don't have direct downloads - they're on app stores)
    if platform == 'mobile_ios':
        download_url = "https://testflight.apple.com/join/YOUR_LINK"  # TestFlight
    elif platform == 'mobile_android':
        download_url = "https://play.google.com/store/apps/details?id=com.mineglance.app"
    else:
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

🤖 Generated with [Claude Code](https://claude.com/claude-code)

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

        # For iOS builds, use local Mac build (no EAS/GitHub Actions)
        if release['platform'] == 'mobile_ios':
            if already_in_db:
                print(f"  [SKIP] iOS v{release['version']} already in database")
                continue

            # Increment build number before building
            print(f"  [iOS] Incrementing build number...")
            new_build = increment_ios_build_number()
            if not new_build:
                print(f"  [ERROR] Failed to increment build number, skipping iOS release")
                continue

            print(f"")
            print(f"  ╔══════════════════════════════════════════════════════════╗")
            print(f"  ║  iOS BUILD READY - Run on Mac                            ║")
            print(f"  ╠══════════════════════════════════════════════════════════╣")
            print(f"  ║  Version: {release['version']} (build {new_build})                            ║")
            print(f"  ║                                                          ║")
            print(f"  ║  On your Mac, run:                                       ║")
            print(f"  ║    cd ~/mineglance/mobile                                ║")
            print(f"  ║    git pull                                              ║")
            print(f"  ║    ./build-ios-mac.sh                                    ║")
            print(f"  ║                                                          ║")
            print(f"  ║  Build takes ~10-15 minutes, then uploads to TestFlight  ║")
            print(f"  ╚══════════════════════════════════════════════════════════╝")
            print(f"")

            # Publish to database (iOS doesn't have a download URL - it's on TestFlight)
            release['zip_filename'] = f"mineglance-ios-v{release['version']}-build{new_build}.ipa"
            if publish_release(release):
                published += 1
                print(f"  [OK] iOS v{release['version']} published to database")
            continue

        # For Android builds, still use EAS (for now)
        if release['platform'] == 'mobile_android':
            eas_platform = 'android'
            if already_in_db:
                print(f"  [INFO] Already in database, checking for Play Store submission...")
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
        elif release['platform'] == 'mobile_android':
            if build_and_download_from_eas(filename, 'android', release['version']):
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

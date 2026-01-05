#!/bin/bash
# ============================================
# MineGlance iOS Build Script (macOS)
# ============================================
# Builds locally and submits to TestFlight
# NO EAS NEEDED - Completely free, unlimited builds
#
# FIRST TIME SETUP:
# 1. Install Xcode from App Store
# 2. Run: xcode-select --install
# 3. Run: sudo gem install cocoapods
# 4. Create App-Specific Password:
#    - Go to appleid.apple.com > Security > App-Specific Passwords
#    - Generate one for "MineGlance Build"
# 5. Set environment variables (add to ~/.zshrc):
#    export APPLE_ID="your@email.com"
#    export APPLE_APP_PASSWORD="xxxx-xxxx-xxxx-xxxx"
#
# USAGE:
#   cd mobile
#   chmod +x build-ios-mac.sh
#   ./build-ios-mac.sh
# ============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

cd "$(dirname "$0")"  # cd to mobile folder

echo ""
echo "=========================================="
echo "  MineGlance iOS Build Script"
echo "=========================================="
echo ""

# Check prerequisites
if ! command -v xcodebuild &> /dev/null; then
    echo -e "${RED}ERROR: Xcode not installed!${NC}"
    echo "Install from App Store, then run: xcode-select --install"
    exit 1
fi

if ! command -v pod &> /dev/null; then
    echo -e "${RED}ERROR: CocoaPods not installed!${NC}"
    echo "Run: sudo gem install cocoapods"
    exit 1
fi

# App Store Connect API Key configuration
API_KEY_ID="U93Q4A3Q3M"
API_KEY_ISSUER="44c8d35a-fab9-44f9-b6d9-c047f068afca"
API_KEY_PATH="$HOME/AuthKey_U93Q4A3Q3M.p8"

# Check for API key
if [ ! -f "$API_KEY_PATH" ]; then
    echo -e "${YELLOW}WARNING: API key not found at $API_KEY_PATH${NC}"
    echo "Download from App Store Connect and place at: $API_KEY_PATH"
    echo ""
    read -p "Continue without auto-upload? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    SKIP_UPLOAD=true
fi

# Read version from app.json
VERSION=$(node -p "require('./app.json').expo.version")
BUILD_NUMBER=$(node -p "require('./app.json').expo.ios.buildNumber")

echo -e "Version: ${GREEN}$VERSION${NC} (build ${GREEN}$BUILD_NUMBER${NC})"
echo ""

# Create build directory
mkdir -p build

# Step 1: Install dependencies
echo -e "${YELLOW}[1/6]${NC} Installing npm dependencies..."
npm install --silent

# Step 2: Generate native iOS project
echo ""
echo -e "${YELLOW}[2/6]${NC} Generating native iOS project (expo prebuild)..."
yes | npx expo prebuild --platform ios --clean

# Step 3: Install CocoaPods
echo ""
echo -e "${YELLOW}[3/6]${NC} Installing CocoaPods..."
cd ios
pod install --silent
cd ..

# Step 4: Build archive
echo ""
echo -e "${YELLOW}[4/6]${NC} Building iOS archive (this takes 5-10 minutes)..."
ARCHIVE_PATH="./build/MineGlance.xcarchive"

# Build with or without API key authentication
if [ "$SKIP_UPLOAD" = true ]; then
  # No API key - build without auth (will need manual signing setup in Xcode)
  xcodebuild -workspace ios/MineGlance.xcworkspace \
    -scheme MineGlance \
    -configuration Release \
    -archivePath "$ARCHIVE_PATH" \
    -destination "generic/platform=iOS" \
    DEVELOPMENT_TEAM=6GBT58TX68 \
    CODE_SIGN_STYLE=Automatic \
    -allowProvisioningUpdates \
    -quiet \
    archive
else
  # With API key - full automatic signing
  xcodebuild -workspace ios/MineGlance.xcworkspace \
    -scheme MineGlance \
    -configuration Release \
    -archivePath "$ARCHIVE_PATH" \
    -destination "generic/platform=iOS" \
    DEVELOPMENT_TEAM=6GBT58TX68 \
    CODE_SIGN_STYLE=Automatic \
    -authenticationKeyPath "$API_KEY_PATH" \
    -authenticationKeyID "$API_KEY_ID" \
    -authenticationKeyIssuerID "$API_KEY_ISSUER" \
    -allowProvisioningUpdates \
    -quiet \
    archive
fi

echo -e "${GREEN}Archive created!${NC}"

# Step 5: Export IPA
echo ""
echo -e "${YELLOW}[5/6]${NC} Exporting IPA..."

# Create export options plist
cat > ./build/ExportOptions.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store-connect</string>
    <key>teamID</key>
    <string>6GBT58TX68</string>
    <key>uploadSymbols</key>
    <true/>
    <key>signingStyle</key>
    <string>automatic</string>
</dict>
</plist>
EOF

# Export with or without API key authentication
if [ "$SKIP_UPLOAD" = true ]; then
  xcodebuild -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportPath "./build" \
    -exportOptionsPlist ./build/ExportOptions.plist \
    -allowProvisioningUpdates \
    -quiet
else
  xcodebuild -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportPath "./build" \
    -exportOptionsPlist ./build/ExportOptions.plist \
    -authenticationKeyPath "$API_KEY_PATH" \
    -authenticationKeyID "$API_KEY_ID" \
    -authenticationKeyIssuerID "$API_KEY_ISSUER" \
    -allowProvisioningUpdates \
    -quiet
fi

echo -e "${GREEN}IPA exported!${NC}"

# Find the IPA file
IPA_PATH=$(find ./build -name "*.ipa" -type f | head -1)

if [ -z "$IPA_PATH" ]; then
  echo -e "${RED}ERROR: No IPA file found!${NC}"
  exit 1
fi

echo "IPA: $IPA_PATH"

# Step 6: Upload to TestFlight
echo ""
if [ "$SKIP_UPLOAD" = true ]; then
    echo -e "${YELLOW}[6/6]${NC} Skipping upload (no credentials)"
    echo ""
    echo "To upload manually, run:"
    echo "  xcrun altool --upload-app -f \"$IPA_PATH\" --type ios"
else
    echo -e "${YELLOW}[6/6]${NC} Uploading to TestFlight..."

    xcrun altool --upload-app \
      -f "$IPA_PATH" \
      --type ios \
      --apiKey "$API_KEY_ID" \
      --apiIssuer "$API_KEY_ISSUER"

    echo -e "${GREEN}Uploaded to TestFlight!${NC}"
fi

# Cleanup
echo ""
echo "Cleaning up..."
rm -rf ios/
rm -rf ./build/*.xcarchive
rm -f ./build/ExportOptions.plist

echo ""
echo "=========================================="
echo -e "  ${GREEN}SUCCESS!${NC}"
echo "  MineGlance v$VERSION (build $BUILD_NUMBER)"
if [ "$SKIP_UPLOAD" != true ]; then
    echo "  Submitted to TestFlight!"
    echo "  Check App Store Connect for processing status."
fi
echo "=========================================="
echo ""

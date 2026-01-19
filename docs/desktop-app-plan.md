# MineGlance Desktop App Plan

## Overview

Native desktop applications for **Windows** (primary) and **macOS** with full feature parity to the browser extension, integrated into the existing MineGlance ecosystem.

**Start with:** Windows (accept SmartScreen warning)
**macOS:** Apple Developer account ready for signing

---

## Technology: Tauri + React + TypeScript

| Aspect | Choice | Reason |
|--------|--------|--------|
| Framework | Tauri 2.0 | 5-10MB bundle, Rust backend, built-in updater |
| Frontend | React + TypeScript | Match extension/website codebase |
| Styling | Tailwind CSS | Same theme as extension |
| State | Zustand | Same as mobile app |
| Build | Vite | Fast builds |

---

## Project Structure

```
desktop/
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── main.rs              # Entry point, window management
│   │   ├── commands.rs          # IPC commands for frontend
│   │   ├── updater.rs           # Auto-update logic
│   │   ├── tray.rs              # System tray functionality
│   │   └── notifications.rs     # Native notifications
│   ├── tauri.conf.json          # App config, window settings
│   ├── Cargo.toml               # Rust dependencies
│   └── icons/                   # App icons (all sizes)
├── src/                         # React frontend
│   ├── App.tsx                  # Main app with router
│   ├── main.tsx                 # Entry point
│   ├── pages/
│   │   ├── Dashboard.tsx        # Stats overview (like extension popup)
│   │   ├── Wallets.tsx          # Wallet management
│   │   ├── Settings.tsx         # App settings
│   │   ├── Profile.tsx          # User profile & 2FA
│   │   ├── Alerts.tsx           # Notification settings
│   │   └── Login.tsx            # Auth flow with 2FA
│   ├── components/
│   │   ├── Sidebar.tsx          # Navigation sidebar
│   │   ├── WalletCard.tsx       # Wallet display card
│   │   ├── StatsCard.tsx        # Stat display card
│   │   ├── UpdateBanner.tsx     # Update available notification
│   │   └── TrayPopup.tsx        # Mini view for system tray
│   ├── stores/
│   │   ├── authStore.ts         # Auth state (Zustand)
│   │   ├── walletStore.ts       # Wallet state
│   │   └── settingsStore.ts     # Settings state
│   ├── services/
│   │   ├── api.ts               # API client for mineglance.com
│   │   ├── pools/               # Pool API parsers (copy from extension)
│   │   │   ├── index.ts
│   │   │   ├── 2miners.ts
│   │   │   ├── nanopool.ts
│   │   │   └── ... (all pool parsers)
│   │   └── updater.ts           # Update check logic
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useWallets.ts
│   │   └── useUpdater.ts
│   ├── constants/
│   │   ├── pools.ts             # Pool configurations
│   │   ├── coins.ts             # Coin list
│   │   └── theme.ts             # Theme colors
│   └── styles/
│       ├── globals.css          # Tailwind + custom styles
│       └── theme.css            # Dark/light theme variables
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

---

## Features (Full Parity with Extension)

### Core Features (All Users)
- [x] Mining dashboard with stats overview
- [x] Multi-wallet support (free: 2 wallets)
- [x] Real-time hashrate, workers, balance
- [x] Profit calculation with electricity costs
- [x] Mining rig power tracking
- [x] 12+ pool support (2Miners, Nanopool, F2Pool, etc.)
- [x] 23+ coin support
- [x] Dark/Light theme toggle
- [x] Auto-refresh intervals (15m, 30m, 1h, 3h)

### Pro Features
- [x] Unlimited wallets
- [x] Cloud sync across devices
- [x] Desktop notifications (worker offline, profit drop)
- [x] Email alerts integration
- [x] Better coin suggestions
- [x] Priority support

### Desktop-Specific Features
- [x] System tray icon with quick stats popup
- [x] Start on boot option
- [x] Native OS notifications
- [x] Keyboard shortcuts
- [x] Auto-updater with in-app notification
- [x] Minimize to tray option
- [x] Window size/position persistence

### Authentication
- [x] Email/password login
- [x] Two-factor authentication (TOTP)
- [x] Backup codes support
- [x] Session persistence
- [x] Auto-logout on token expiry

---

## Database Schema Updates

### New Platforms in software_releases
```sql
-- Add desktop platforms (run in Supabase SQL Editor)
-- Existing CHECK constraint may need updating

-- Option 1: If CHECK constraint exists, drop and recreate
ALTER TABLE software_releases DROP CONSTRAINT IF EXISTS software_releases_platform_check;
ALTER TABLE software_releases ADD CONSTRAINT software_releases_platform_check
  CHECK (platform IN ('extension', 'mobile_ios', 'mobile_android', 'desktop_windows', 'desktop_macos'));

-- Option 2: Just insert (if no constraint)
-- INSERT will work if column accepts any text
```

### Track Desktop Installs in user_instances
```sql
-- user_instances table already supports platform field
-- Add desktop platforms to any CHECK constraint if exists

-- Desktop installs will have:
-- platform: 'desktop_windows' or 'desktop_macos'
-- device_name: 'Windows Desktop' or 'macOS Desktop'
-- browser: null (not applicable)
-- version: '1.0.0' (app version)
```

---

## Auto-Update System

### Update Check Flow
```
1. App starts → Check /api/software/latest?platform=desktop_windows
2. Compare versions (semantic versioning)
3. If newer version available:
   a. Show in-app banner: "Update v1.1.0 available"
   b. User clicks "Update Now"
   c. Tauri updater downloads from downloadUrl
   d. Progress bar shown
   e. App restarts with new version
4. Track update in user_instances table
```

### Tauri Updater Config (tauri.conf.json)
```json
{
  "tauri": {
    "updater": {
      "active": true,
      "dialog": false,
      "endpoints": [
        "https://www.mineglance.com/api/desktop/update?platform={{target}}&version={{current_version}}"
      ],
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    }
  }
}
```

### New API Endpoint: /api/desktop/update
```typescript
// Returns Tauri-compatible update manifest
{
  "version": "1.1.0",
  "notes": "Bug fixes and improvements",
  "pub_date": "2026-01-20T00:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "...",
      "url": "https://storage.../mineglance-1.1.0-setup.exe"
    },
    "darwin-x86_64": {
      "signature": "...",
      "url": "https://storage.../mineglance-1.1.0.dmg"
    },
    "darwin-aarch64": {
      "signature": "...",
      "url": "https://storage.../mineglance-1.1.0-arm.dmg"
    }
  }
}
```

---

## Website Updates Required

### 1. Homepage (app/page.tsx)
- Add "Desktop App" section below extension download
- Show Windows/macOS download buttons
- Link to /desktop download page

### 2. New Page: /desktop (app/desktop/page.tsx)
- Dedicated desktop app landing page
- Feature highlights
- System requirements
- Download buttons for Windows/macOS
- Installation instructions (SmartScreen warning for Windows)
- Screenshots/mockups

### 3. Header.tsx
- Add "Desktop App" to navigation
- Or add to "Product" dropdown if exists

### 4. Footer.tsx
- Add Desktop App links in Product column

### 5. Pricing.tsx
- Update feature list: "Browser Extension + Desktop App"
- Show desktop app as included benefit

### 6. ExtensionDownloadModal.tsx
- Rename to DownloadModal.tsx or create separate DesktopDownloadModal.tsx
- Support both extension and desktop downloads
- Or keep separate modals

### 7. Support Page (app/support/page.tsx)
Add sections:
- Desktop App Installation (Windows)
- Desktop App Installation (macOS)
- SmartScreen Warning (Windows)
- Desktop App Troubleshooting
- Desktop vs Extension comparison

### 8. Terms of Service (app/terms/page.tsx)
Add:
- Desktop application license terms
- Auto-update consent
- Data collection on desktop
- Uninstall instructions

### 9. Privacy Policy (app/privacy/page.tsx)
Add:
- Desktop app data collection
- Local storage on desktop
- Update check telemetry
- Crash reporting (if implemented)

---

## Admin Dashboard Updates

### 1. Installs Page (app/admin/installs/page.tsx)
- Add "Desktop Windows" and "Desktop macOS" to platform filter
- Add desktop icon (🖥️) for platform display
- Show desktop app version in table
- Update platform stats cards to include desktop

### 2. Software Page (app/admin/software/page.tsx)
- Add "Desktop Windows" and "Desktop macOS" to platform dropdown
- Show latest desktop versions in summary
- Support .exe and .dmg file uploads

### 3. Stats/Dashboard (app/admin/page.tsx)
- Add desktop install counts to overview
- Include desktop in daily installs chart

### 4. Users Page (app/admin/users/page.tsx)
- Show desktop version alongside ext version
- Or show "Platforms" column with icons

### 5. Health Page (app/admin/health/page.tsx)
- Add desktop update endpoint health check

---

## User Dashboard Updates

### 1. Overview Page (app/dashboard/page.tsx)
- Add "Download Desktop App" card below extension
- Show installed desktop version if detected
- Update available banner for desktop

### 2. Devices Page (app/dashboard/devices/page.tsx)
- Show desktop app installations
- Platform icon: 🖥️ Windows or 🍎 macOS
- Allow device removal
- Show version and last seen

### 3. Profile Page (app/dashboard/profile/page.tsx)
- No changes needed (2FA works across all platforms)

### 4. Subscription Page (app/dashboard/subscription/page.tsx)
- Update features list to include desktop app

---

## Purchasing Integration

### Desktop App Purchase Flow
Same as extension - users purchase Pro on website:
1. User downloads free desktop app
2. Signs in with email
3. Free tier: 2 wallets, basic features
4. Clicks "Upgrade to Pro" in app
5. Opens browser to mineglance.com/pricing
6. Completes Stripe checkout
7. Returns to app, Pro features unlocked

### In-App Upgrade Button
```typescript
// Opens system browser to pricing page
import { open } from '@tauri-apps/api/shell';
await open('https://www.mineglance.com/pricing?source=desktop');
```

### License Activation
- Same /api/auth/login endpoint as extension
- Returns plan: 'free' | 'pro'
- Pro features unlock based on plan

---

## Audit Logging

### Track in admin_audit_log
```sql
-- Desktop-specific actions to log:
'desktop_install'      -- New desktop installation
'desktop_update'       -- App updated to new version
'desktop_login'        -- User logged in via desktop
'desktop_logout'       -- User logged out
'desktop_uninstall'    -- App uninstalled (if detectable)
```

### Desktop API Calls Include
```typescript
// All API requests include:
{
  deviceType: 'desktop',
  platform: 'windows' | 'macos',
  version: '1.0.0',
  instanceId: 'unique-install-id'
}
```

---

## publish_releases.py Updates

### Add Desktop Platform Support
```python
PENDING_RELEASES = [
    # Windows Desktop v1.0.0
    {
        "version": "1.0.0",
        "platform": "desktop_windows",
        "release_notes": """v1.0.0 - Initial Release

NEW FEATURES:
- Full mining dashboard with stats
- Multi-wallet support
- Real-time hashrate and profit tracking
- System tray with quick stats
- Native notifications
- Auto-update support
- Dark/Light theme

SUPPORTED:
- Windows 10/11 (64-bit)
- All mining pools from extension
- 2FA authentication""",
        "zip_filename": "mineglance-1.0.0-setup.exe",
        "is_latest": True
    },
    # macOS Desktop v1.0.0
    {
        "version": "1.0.0",
        "platform": "desktop_macos",
        "release_notes": """v1.0.0 - Initial Release

(Same notes as Windows)""",
        "zip_filename": "mineglance-1.0.0.dmg",
        "is_latest": True
    }
]
```

### Build Script Integration
```python
def build_desktop_app(platform):
    """Build desktop app for specified platform"""
    if platform == 'desktop_windows':
        # Run Tauri build for Windows
        subprocess.run(['npm', 'run', 'tauri', 'build', '--',
                       '--target', 'x86_64-pc-windows-msvc'],
                       cwd='desktop', env=get_env_with_nodejs())
        return 'desktop/src-tauri/target/release/bundle/nsis/mineglance_1.0.0_x64-setup.exe'

    elif platform == 'desktop_macos':
        # Run Tauri build for macOS (Intel + Apple Silicon)
        subprocess.run(['npm', 'run', 'tauri', 'build', '--',
                       '--target', 'universal-apple-darwin'],
                       cwd='desktop', env=get_env_with_nodejs())
        return 'desktop/src-tauri/target/release/bundle/dmg/mineglance_1.0.0_universal.dmg'
```

---

## Code Signing

### Windows (No Certificate - SmartScreen Warning)
- Users see "Windows protected your PC" on first run
- Click "More info" → "Run anyway"
- Add instructions on download page
- Consider SignPath.io ($50/mo) or SSL.com ($70/yr) later

### macOS (Apple Developer Account Ready)
```bash
# Sign the app
codesign --deep --force --verify --verbose \
  --sign "Developer ID Application: Your Name (TEAM_ID)" \
  "MineGlance.app"

# Notarize with Apple
xcrun notarytool submit MineGlance.dmg \
  --apple-id "your@email.com" \
  --team-id "TEAM_ID" \
  --password "app-specific-password"

# Staple notarization ticket
xcrun stapler staple MineGlance.dmg
```

---

## Build & Distribution

### Windows Build Output
```
desktop/src-tauri/target/release/bundle/
├── nsis/
│   └── mineglance_1.0.0_x64-setup.exe  (NSIS installer, ~8MB)
└── msi/
    └── mineglance_1.0.0_x64.msi        (MSI installer, ~8MB)
```

### macOS Build Output
```
desktop/src-tauri/target/release/bundle/
├── dmg/
│   └── mineglance_1.0.0_universal.dmg  (DMG with app, ~12MB)
└── macos/
    └── MineGlance.app                   (App bundle)
```

### Upload to Supabase Storage
```python
# Same bucket as extension: 'software'
# Files:
# - mineglance-1.0.0-setup.exe (Windows)
# - mineglance-1.0.0.dmg (macOS Intel+ARM universal)
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Set up Tauri project in `desktop/` folder
- [ ] Port extension theme/styles (Tailwind)
- [ ] Implement basic dashboard layout
- [ ] Add authentication (login, register, 2FA)
- [ ] Connect to existing APIs

### Phase 2: Core Features (Week 3-4)
- [ ] Wallet management (add, edit, delete)
- [ ] Pool API parsers (copy from extension/background)
- [ ] Settings page (electricity, refresh, theme)
- [ ] Profile page with cloud sync
- [ ] Pro/Free feature gating

### Phase 3: Desktop Features (Week 5-6)
- [ ] System tray with mini popup
- [ ] Native notifications
- [ ] Start on boot
- [ ] Auto-updater implementation
- [ ] Window state persistence

### Phase 4: Integration (Week 7-8)
- [ ] Update website with desktop download page
- [ ] Update admin dashboard (installs, software)
- [ ] Update user dashboard (devices, downloads)
- [ ] Update support/terms/privacy pages
- [ ] Update publish_releases.py

### Phase 5: Polish & Release (Week 9-10)
- [ ] Windows NSIS installer
- [ ] macOS DMG + signing + notarization
- [ ] SmartScreen bypass instructions
- [ ] Beta testing
- [ ] Public release
- [ ] Marketing/announcement

---

## API Endpoints Summary

### Existing (No Changes Needed)
- `POST /api/auth/login` - Login with 2FA support
- `POST /api/auth/register` - New user registration
- `GET /api/dashboard/profile` - User profile
- `GET /api/wallets/sync` - Get wallets
- `POST /api/wallets/sync` - Save wallets
- `GET /api/dashboard/settings` - Get settings
- `PUT /api/dashboard/settings` - Save settings

### New Endpoints Required
- `GET /api/software/latest?platform=desktop_windows` - Latest desktop version
- `GET /api/desktop/update` - Tauri updater manifest
- `POST /api/desktop/install` - Track new installation
- `POST /api/desktop/heartbeat` - Update last_seen

### Modified Endpoints
- `GET /api/admin/installs` - Add desktop platform filter
- `GET /api/admin/stats` - Include desktop install counts

---

## TL;DR Summary

1. **Tech:** Tauri + React + TypeScript (same as extension frontend)
2. **Start:** Windows first, accept SmartScreen warning
3. **Features:** Full extension parity + system tray + auto-update
4. **Auth:** Same login system with 2FA
5. **Pro:** Same upgrade flow via website
6. **Updates:** Check `software_releases` table, Tauri built-in updater
7. **Tracking:** Same `user_instances` table with `platform: 'desktop_windows'`
8. **Admin:** Add desktop to installs page, software page, stats
9. **User Dashboard:** Add desktop to devices page, show download card
10. **Website:** New /desktop page, update support/terms/privacy
11. **Publish:** Update `publish_releases.py` for desktop builds
12. **Timeline:** ~10 weeks for full implementation

---

## Files to Create/Modify

### New Files
```
desktop/                          # Entire new Tauri project
app/desktop/page.tsx              # Desktop download page
app/api/desktop/update/route.ts   # Tauri updater endpoint
app/api/desktop/install/route.ts  # Track installations
components/DesktopDownloadModal.tsx
```

### Modified Files
```
# Website
app/page.tsx                      # Add desktop section
components/Header.tsx             # Add nav link
components/Footer.tsx             # Add footer link
components/Pricing.tsx            # Update features
app/support/page.tsx              # Add desktop docs
app/terms/page.tsx                # Add desktop terms
app/privacy/page.tsx              # Add desktop privacy

# Admin Dashboard
app/admin/installs/page.tsx       # Add desktop filter
app/admin/software/page.tsx       # Add desktop platform
app/admin/page.tsx                # Add desktop stats
app/api/admin/installs/route.ts   # Support desktop platform
app/api/admin/stats/route.ts      # Include desktop counts

# User Dashboard
app/dashboard/page.tsx            # Add desktop download card
app/dashboard/devices/page.tsx    # Show desktop devices

# Publish Script
roadmap/publish_releases.py       # Add desktop build/upload
```

---

## Next Steps

1. Create `desktop/` Tauri project
2. Set up React + TypeScript + Tailwind
3. Port auth flow from extension
4. Build Windows installer
5. Test SmartScreen experience
6. Deploy v1.0.0 to staging

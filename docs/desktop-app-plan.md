# MineGlance Desktop App Plan

## Overview

Native desktop applications for Windows and macOS with the same features as the browser extension, plus auto-update functionality.

---

## Technology Choice: **Tauri**

### Why Tauri over Electron?

| Feature | Tauri | Electron |
|---------|-------|----------|
| Bundle Size | ~5-10 MB | ~150+ MB |
| Memory Usage | ~30 MB | ~100+ MB |
| Security | Rust backend, sandboxed | Node.js, less secure |
| Auto-Updater | Built-in | Requires electron-updater |
| Native Feel | Better OS integration | Chromium wrapper |
| Build Speed | Fast | Slower |

**Recommendation:** Tauri for smaller, faster, more secure desktop apps.

---

## Architecture

```
desktop/
├── src-tauri/           # Rust backend
│   ├── src/
│   │   ├── main.rs      # Entry point
│   │   ├── commands.rs  # IPC commands
│   │   └── updater.rs   # Auto-update logic
│   ├── tauri.conf.json  # Tauri config
│   └── Cargo.toml       # Rust dependencies
├── src/                 # Frontend (React/TypeScript)
│   ├── App.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Wallets.tsx
│   │   ├── Settings.tsx
│   │   └── Profile.tsx
│   ├── components/
│   ├── stores/          # Zustand state
│   ├── services/        # Pool APIs
│   └── styles/          # Tailwind CSS
├── package.json
└── vite.config.ts
```

---

## Features (Matching Extension)

### Core Features
- [ ] Mining dashboard with stats overview
- [ ] Multi-wallet support with pool/coin selection
- [ ] Real-time hashrate, workers, balance display
- [ ] Profit calculation with electricity costs
- [ ] Mining rig power consumption tracking

### User Features
- [ ] User authentication (email/password)
- [ ] Two-factor authentication (2FA)
- [ ] Profile management
- [ ] Cloud sync of wallets/settings

### Pro Features
- [ ] Unlimited wallets
- [ ] Desktop notifications (worker offline, profit drop)
- [ ] Email alerts integration
- [ ] Better coin suggestions

### Desktop-Specific
- [ ] System tray icon with quick stats
- [ ] Start on boot option
- [ ] Native notifications
- [ ] Keyboard shortcuts
- [ ] Dark/Light theme (matching extension)

---

## Auto-Update System

### How It Works

1. **App checks for updates on startup:**
```typescript
// Check /api/software/latest?platform=desktop_windows (or desktop_macos)
const response = await fetch('https://www.mineglance.com/api/software/latest?platform=desktop_windows');
const { version, downloadUrl } = await response.json();

if (isNewerVersion(version, currentVersion)) {
  showUpdateNotification(version, downloadUrl);
}
```

2. **User clicks "Update Now":**
- Tauri's built-in updater downloads the new version
- Shows progress bar
- Installs and restarts app

3. **Silent background updates (optional):**
- Downloads update in background
- Prompts user to restart when ready

### Database Schema Addition

```sql
-- Add desktop platforms to software_releases
-- Valid platforms: extension, mobile_ios, mobile_android, desktop_windows, desktop_macos

-- Example releases:
INSERT INTO software_releases (platform, version, download_url, release_notes, is_latest)
VALUES
  ('desktop_windows', '1.0.0', 'https://.../.../mineglance-1.0.0-setup.exe', 'Initial release', true),
  ('desktop_macos', '1.0.0', 'https://.../.../mineglance-1.0.0.dmg', 'Initial release', true);
```

### Update Flow UI

```
┌─────────────────────────────────────────────┐
│  🔔 Update Available                    [X] │
├─────────────────────────────────────────────┤
│                                             │
│  MineGlance v1.1.0 is available!           │
│  You have v1.0.0 installed.                │
│                                             │
│  What's New:                               │
│  • New feature A                           │
│  • Bug fix B                               │
│  • Improvement C                           │
│                                             │
│  [Update Now]  [Remind Me Later]           │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Build & Distribution

### Windows
- **Installer:** NSIS or WiX (MSI)
- **Output:** `mineglance-1.0.0-setup.exe`
- **Code Signing:** Required for Windows SmartScreen
- **Distribution:** Direct download from website

### macOS
- **Installer:** DMG with app bundle
- **Output:** `mineglance-1.0.0.dmg`
- **Code Signing:** Apple Developer certificate required
- **Notarization:** Required for Gatekeeper
- **Distribution:** Direct download (App Store later?)

### Build Commands
```bash
# Development
npm run tauri dev

# Build for current platform
npm run tauri build

# Build for specific platform (CI/CD)
npm run tauri build -- --target x86_64-pc-windows-msvc
npm run tauri build -- --target x86_64-apple-darwin
npm run tauri build -- --target aarch64-apple-darwin  # Apple Silicon
```

---

## Publish Script Integration

Update `roadmap/publish_releases.py` to support desktop platforms:

```python
PENDING_RELEASES = [
    {
        "version": "1.0.0",
        "platform": "desktop_windows",
        "release_notes": "Initial release...",
        "zip_filename": "mineglance-1.0.0-setup.exe",
        "is_latest": True
    },
    {
        "version": "1.0.0",
        "platform": "desktop_macos",
        "release_notes": "Initial release...",
        "zip_filename": "mineglance-1.0.0.dmg",
        "is_latest": True
    }
]
```

---

## UI Design

### Match Extension Theme
- Same dark theme colors (`#0d1117`, `#161b22`, etc.)
- Same accent color (primary purple/blue)
- Same card styles, borders, shadows
- Same fonts and typography
- Responsive layout for window resizing

### Window Sizes
- **Default:** 1200x800
- **Minimum:** 800x600
- **System Tray:** Mini popup (300x400) for quick stats

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Set up Tauri project with React + TypeScript + Vite
- [ ] Port extension theme/styles to desktop
- [ ] Implement basic dashboard layout
- [ ] Add authentication (login, register, 2FA)

### Phase 2: Core Features (Week 3-4)
- [ ] Wallet management (add, edit, delete, reorder)
- [ ] Pool API integration (copy from extension)
- [ ] Settings page (electricity, refresh interval, theme)
- [ ] Profile page with cloud sync

### Phase 3: Desktop Features (Week 5-6)
- [ ] System tray integration
- [ ] Native notifications
- [ ] Start on boot
- [ ] Keyboard shortcuts
- [ ] Auto-updater implementation

### Phase 4: Polish & Release (Week 7-8)
- [ ] Windows installer (NSIS)
- [ ] macOS DMG + notarization
- [ ] Code signing for both platforms
- [ ] Update publish script
- [ ] Beta testing
- [ ] Public release

---

## Requirements

### Development
- Node.js 18+
- Rust 1.70+
- Tauri CLI (`cargo install tauri-cli`)

### Windows Build
- Visual Studio Build Tools 2019+
- Windows 10 SDK

### macOS Build
- Xcode Command Line Tools
- Apple Developer Account (for signing)

---

## Cost Considerations

| Item | Cost |
|------|------|
| Apple Developer Account | $99/year |
| Windows Code Signing Cert | $200-500/year |
| Tauri | Free (MIT) |
| GitHub Actions (CI/CD) | Free tier usually sufficient |

---

## Questions to Decide

1. **Start with which platform first?** Windows or macOS?
2. **System tray mini-view?** Quick stats popup or full window only?
3. **Auto-start on boot?** Enabled by default or user opt-in?
4. **Update frequency?** Check on every app start or daily?
5. **Offline mode?** Cache last known stats when offline?

---

## Next Steps

1. Create `desktop/` folder with Tauri project
2. Port extension UI components to React
3. Implement authentication flow
4. Add pool API parsers (copy from extension)
5. Test auto-updater with staging releases
6. Set up CI/CD for builds

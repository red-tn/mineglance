# 2FA Implementation Plan: User Dashboard & Extension

## Overview

Add TOTP-based two-factor authentication for Pro subscribers on the user dashboard and extension.

---

## Part 1: User Dashboard 2FA

### Database Changes

```sql
-- Add 2FA columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS totp_secret TEXT,
ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT false;
```

### API Routes to Create

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/dashboard/auth/2fa/setup` | GET | Generate TOTP secret + QR code |
| `/api/dashboard/auth/2fa/verify` | POST | Verify code & enable 2FA |
| `/api/dashboard/auth/2fa/disable` | POST | Disable 2FA (requires code) |

### Files to Modify

| File | Changes |
|------|---------|
| `app/api/dashboard/auth/login/route.ts` | Add 2FA check after password verification |
| `app/api/dashboard/auth/verify/route.ts` | Include `totpEnabled` in response |
| `app/dashboard/auth-context.tsx` | Add `totpEnabled` to User interface |
| `app/dashboard/login/page.tsx` | Add 2FA code input step (like admin login) |
| `app/dashboard/settings/page.tsx` | Add 2FA enable/disable section |

### Login Flow with 2FA

```
1. User enters license key + email + password
2. Server validates credentials
3. If totp_enabled:
   - Return { requires2FA: true }
   - Frontend shows code input
   - User enters authenticator code
   - Server validates code + returns session token
4. If not enabled: Return session token directly
```

---

## Part 2: Extension 2FA

### Approach: Dashboard-Linked Authentication

The extension doesn't have a good UI for 2FA code entry. Instead:

1. **2FA only applies to sensitive operations**, not regular polling
2. **Extension syncs 2FA status** from the user's dashboard account
3. **For initial activation with 2FA enabled**: Extension opens browser tab to verify

### Extension Changes

| File | Changes |
|------|---------|
| `extension/js/background.js` | Check if user has 2FA enabled when activating |
| `extension/js/license.js` | Handle 2FA-required response, open verification page |
| `extension/popup/settings.html` | Show 2FA status indicator |

### Extension Activation Flow with 2FA

```
1. User enters license key in extension
2. Extension calls /api/activate-license
3. If user has 2FA enabled:
   - API returns { requires2FA: true, verificationUrl: "..." }
   - Extension opens browser tab: /verify-extension?token=xxx
   - User enters 2FA code on website
   - Website validates code, marks extension as verified
   - Extension polls for verification status
   - Once verified, extension activates
4. If 2FA not enabled: Normal activation
```

### New Pages/Routes for Extension Verification

| Route | Purpose |
|-------|---------|
| `/verify-extension` | Page where user enters 2FA code for extension |
| `/api/extension/verify-2fa` | Validate 2FA code for extension activation |
| `/api/extension/check-verification` | Extension polls this to check if verified |

---

## Part 3: Email Templates

### New Templates to Create

| Slug | Name | Purpose | Variables |
|------|------|---------|-----------|
| `2fa-enabled` | 2FA Enabled | Sent when user enables 2FA | `{{email}}`, `{{fullName}}` |
| `2fa-disabled` | 2FA Disabled | Sent when user disables 2FA | `{{email}}`, `{{fullName}}` |
| `2fa-extension-verified` | Extension Verified | Sent when extension verified via 2FA | `{{email}}`, `{{deviceName}}`, `{{browser}}` |

### SQL to Add Templates

```sql
INSERT INTO email_templates (slug, name, subject, html_content, description, variables, is_active)
VALUES
(
  '2fa-enabled',
  '2FA Enabled Confirmation',
  'Two-Factor Authentication Enabled - MineGlance',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #6366f1;">Two-Factor Authentication Enabled</h2>
    <p>Hi {{fullName}},</p>
    <p>Two-factor authentication has been successfully enabled on your MineGlance account.</p>
    <p>From now on, you''ll need to enter a code from your authenticator app when signing in.</p>
    <p style="background: #fef3c7; padding: 15px; border-radius: 8px; color: #92400e;">
      <strong>Important:</strong> If you did not enable 2FA, please contact us immediately at support@mineglance.com
    </p>
    <p>Stay secure,<br>The MineGlance Team</p>
  </div>',
  'Sent when a user enables 2FA on their account',
  '["email", "fullName"]',
  true
),
(
  '2fa-disabled',
  '2FA Disabled Notification',
  'Two-Factor Authentication Disabled - MineGlance',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #6366f1;">Two-Factor Authentication Disabled</h2>
    <p>Hi {{fullName}},</p>
    <p>Two-factor authentication has been disabled on your MineGlance account.</p>
    <p>Your account is now protected by password only. We recommend re-enabling 2FA for maximum security.</p>
    <p style="background: #fee2e2; padding: 15px; border-radius: 8px; color: #991b1b;">
      <strong>Warning:</strong> If you did not disable 2FA, your account may be compromised. Please change your password immediately and contact support@mineglance.com
    </p>
    <p>Stay secure,<br>The MineGlance Team</p>
  </div>',
  'Sent when a user disables 2FA on their account',
  '["email", "fullName"]',
  true
),
(
  '2fa-extension-verified',
  'Extension Verified via 2FA',
  'New Extension Verified - MineGlance',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #6366f1;">Extension Verified</h2>
    <p>Hi {{fullName}},</p>
    <p>A new browser extension was just verified using two-factor authentication:</p>
    <ul style="background: #f3f4f6; padding: 15px 30px; border-radius: 8px;">
      <li><strong>Browser:</strong> {{browser}}</li>
      <li><strong>Device:</strong> {{deviceName}}</li>
    </ul>
    <p style="background: #fef3c7; padding: 15px; border-radius: 8px; color: #92400e;">
      If you did not verify this extension, please revoke it in your dashboard and change your password immediately.
    </p>
    <p>Stay secure,<br>The MineGlance Team</p>
  </div>',
  'Sent when a user verifies a new extension installation via 2FA',
  '["email", "fullName", "browser", "deviceName"]',
  true
);
```

---

## Implementation Order

### Phase 1: User Dashboard (Priority)
1. Add database columns (user runs SQL)
2. Create 2FA API routes (setup, verify, disable)
3. Update dashboard login API
4. Update dashboard login page UI
5. Add 2FA section to dashboard settings
6. Add email templates
7. Send confirmation emails on enable/disable

### Phase 2: Extension (Can be done later)
1. Create extension verification page
2. Create extension 2FA verification API
3. Update extension activation flow
4. Update extension UI to show 2FA status
5. Send email on extension verification

---

## Security Considerations

1. **Time Window**: Allow 1 period (30 sec) tolerance for TOTP codes
2. **Rate Limiting**: Max 5 2FA attempts per 15 minutes
3. **Session Security**: 2FA verification should not create partial sessions
4. **Backup Codes**: Consider adding backup codes in future iteration
5. **Remember Device**: Consider "trust this device" option for extension

---

## Questions Before Proceeding

1. **Extension 2FA**: Do you want full extension 2FA now, or just dashboard first?
2. **Backup Codes**: Should we add recovery/backup codes for account recovery?
3. **Remember Device**: Should there be a "trust this browser" option?

---

## Estimated Scope

| Component | Files | Complexity |
|-----------|-------|------------|
| Dashboard 2FA APIs | 3 new routes | Medium |
| Dashboard Login Changes | 2 files | Low |
| Dashboard Settings UI | 1 file | Medium |
| Email Templates | SQL + testing | Low |
| Extension 2FA | 4-5 files + new page | High |

**Recommendation**: Start with Phase 1 (Dashboard) first, then Extension in Phase 2.

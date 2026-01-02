import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import { useWalletStore } from '@/stores/walletStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';
import { resetPoolDataState } from '@/hooks/usePoolData';
import { QRPayload } from '@/types';

const API_BASE = 'https://www.mineglance.com/api';

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [userPlan, setUserPlan] = useState<string | null>(null);
  const scanLockRef = useRef(false); // Immediate lock to prevent multiple scans

  const { setWallets } = useWalletStore();
  const { importSettings } = useSettingsStore();
  const { setLicenseKey, setPlan } = useAuthStore();

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  const handleBarCodeScanned = async ({ data, type }: { data: string; type: string }) => {
    // Immediate synchronous lock - prevents race conditions from multiple barcode events
    if (scanLockRef.current) {
      return;
    }
    scanLockRef.current = true;

    console.log('=== BARCODE SCANNED ===');
    console.log('Type:', type);
    console.log('Data:', data.substring(0, 100) + '...');

    setScanned(true);
    setProcessing(true);

    try {
      // The QR code contains a base64-encoded JSON payload
      // Send it directly to the server for verification
      const response = await fetch(`${API_BASE}/dashboard/qr`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qrData: data, // Send raw QR data (base64 string)
        }),
      });

      const result = await response.json();
      console.log('QR verification response:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to verify QR code');
      }

      // Server returns: { success, wallets, settings, licenseKey }
      // We also need to check the plan - fetch it separately
      const planResponse = await fetch(`${API_BASE}/activate-license?key=${result.licenseKey}`);
      const planData = await planResponse.json();
      const userPlanType = planData.plan || 'pro';

      // Check if user has Pro Plus (bundle) plan
      if (userPlanType !== 'bundle') {
        // Not Pro Plus - show upgrade prompt
        setUserPlan(userPlanType);
        setShowUpgrade(true);
        setProcessing(false);
        return;
      }

      // Pro Plus user - import the data
      // Convert short wallet format to full format
      const wallets = (result.wallets || []).map((w: any, i: number) => ({
        id: `wallet_${Date.now()}_${i}`,
        name: w.n || `Wallet ${i + 1}`,
        pool: w.p,
        coin: w.c,
        address: w.a,
        power: w.pw || 200,
        enabled: true,
      }));

      if (wallets.length > 0) {
        setWallets(wallets);
        // Reset pool data state so new wallets get fetched fresh
        resetPoolDataState();
      }

      // Calculate total power consumption from all wallets
      const totalPower = wallets.reduce((sum: number, w: any) => sum + (w.power || 200), 0);

      // Convert short settings format to full format
      // Include power consumption calculated from wallet powers
      importSettings({
        electricityRate: result.settings?.elec || 0.12,
        currency: result.settings?.curr || 'USD',
        refreshInterval: result.settings?.ref || 30,
        powerConsumption: totalPower,
      });

      // Save license key and plan
      await setLicenseKey(result.licenseKey);
      await setPlan(userPlanType);

      Alert.alert(
        'Success!',
        `Synced ${wallets.length} wallet(s) from your extension.`,
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)'),
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to process QR code',
        [
          {
            text: 'Try Again',
            onPress: () => {
              setScanned(false);
              setProcessing(false);
              scanLockRef.current = false; // Reset lock to allow retry
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => router.back(),
          },
        ],
        { cancelable: false }
      );
    } finally {
      setProcessing(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionCard}>
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to scan QR codes from your MineGlance extension.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Show upgrade prompt for non-Pro Plus users
  if (showUpgrade) {
    const handleUpgrade = () => {
      Linking.openURL('https://www.mineglance.com/#pricing');
    };

    return (
      <View style={styles.upgradeContainer}>
        <View style={styles.upgradeCard}>
          <View style={styles.upgradeBadge}>
            <Text style={styles.upgradeBadgeText}>PRO PLUS</Text>
          </View>

          <Text style={styles.upgradeTitle}>Mobile App Access</Text>

          <Text style={styles.upgradeSubtitle}>
            You're currently on the{' '}
            <Text style={styles.planHighlight}>
              {userPlan === 'pro' ? 'Pro' : 'Free'}
            </Text>{' '}
            plan
          </Text>

          <Text style={styles.upgradeText}>
            The MineGlance mobile app is available exclusively for Pro Plus members. Upgrade to unlock:
          </Text>

          <View style={styles.featureList}>
            <Text style={styles.featureItem}>Mobile app with push notifications</Text>
            <Text style={styles.featureItem}>Sync wallets from Chrome extension</Text>
            <Text style={styles.featureItem}>Email alerts for worker issues</Text>
            <Text style={styles.featureItem}>Web dashboard access</Text>
            <Text style={styles.featureItem}>Priority support</Text>
          </View>

          {userPlan === 'pro' && (
            <View style={styles.discountBanner}>
              <Text style={styles.discountText}>
                Upgrade for just $27 (10% off!)
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
            <Text style={styles.upgradeButtonText}>
              {userPlan === 'pro' ? 'Upgrade to Pro Plus' : 'Get Pro Plus - $59'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onCameraReady={() => console.log('=== CAMERA READY ===')}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Overlay - positioned absolutely over camera */}
      <View style={styles.overlay} pointerEvents="none">
        {/* Top */}
        <View style={styles.overlaySection} />

        {/* Middle with scanner frame */}
        <View style={styles.middleRow}>
          <View style={styles.overlaySection} />
          <View style={styles.scannerFrame}>
            {/* Corner markers */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <View style={styles.overlaySection} />
        </View>

        {/* Bottom */}
        <View style={styles.overlaySection}>
          <View style={styles.instructions}>
            <Text style={styles.instructionText}>
              {processing
                ? 'Processing...'
                : 'Point camera at QR code from extension settings'}
            </Text>
          </View>
        </View>
      </View>

      {/* Cancel button */}
      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const SCANNER_SIZE = 300;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  message: {
    color: '#fff',
    fontSize: fontSize.md,
    textAlign: 'center',
    padding: spacing.xl,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlaySection: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  middleRow: {
    flexDirection: 'row',
    height: SCANNER_SIZE,
  },
  scannerFrame: {
    width: SCANNER_SIZE,
    height: SCANNER_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: colors.accent,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  instructions: {
    paddingTop: spacing.xl,
    alignItems: 'center',
  },
  instructionText: {
    color: '#fff',
    fontSize: fontSize.md,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  permissionCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  permissionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: '#fff',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: fontSize.md,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: spacing.sm,
  },
  cancelButtonText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: fontSize.md,
  },
  // Upgrade screen styles
  upgradeContainer: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  upgradeCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  upgradeBadge: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  upgradeBadgeText: {
    color: '#000',
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  upgradeTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  upgradeSubtitle: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  planHighlight: {
    color: colors.primary,
    fontWeight: '600',
  },
  upgradeText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  featureList: {
    alignSelf: 'stretch',
    marginBottom: spacing.lg,
  },
  featureItem: {
    fontSize: fontSize.sm,
    color: colors.text,
    paddingVertical: spacing.xs,
    paddingLeft: spacing.md,
  },
  discountBanner: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  discountText: {
    color: '#92400e',
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  upgradeButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    width: '100%',
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '600',
    textAlign: 'center',
  },
});

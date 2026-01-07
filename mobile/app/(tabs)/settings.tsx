import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';

const WEBSITE_URL = 'https://www.mineglance.com';
const API_BASE = 'https://www.mineglance.com/api';
const APP_VERSION = Constants.expoConfig?.version || '1.0.0';
const BUILD_NUMBER = Constants.expoConfig?.ios?.buildNumber || '1';
import { getColors, spacing, borderRadius, fontSize } from '@/constants/theme';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';

interface Device {
  id: string;
  installId: string;
  deviceName: string;
  deviceType: string;
  browser?: string;
  version?: string;
  lastSeen: string;
}

export default function SettingsScreen() {
  const router = useRouter();
  const settings = useSettingsStore();
  const { licenseKey, plan, authToken, clearAuth, isPro } = useAuthStore();
  const [showLicenseKey, setShowLicenseKey] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);

  // Dynamic colors based on theme
  const colors = getColors(settings.liteMode);
  const styles = useMemo(() => createStyles(colors), [settings.liteMode]);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    if (!authToken) {
      setIsLoadingDevices(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/dashboard/devices`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setDevices(data.devices || []);
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
    setIsLoadingDevices(false);
  };

  const handleRemoveDevice = async (instanceId: string) => {
    Alert.alert(
      'Remove Device',
      'Are you sure you want to remove this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_BASE}/dashboard/devices?instanceId=${instanceId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
              });

              if (response.ok) {
                setDevices(devices.filter(d => d.installId !== instanceId));
              }
            } catch (error) {
              console.error('Failed to remove device:', error);
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getDeviceIcon = (deviceType: string): any => {
    switch (deviceType) {
      case 'extension':
        return 'desktop-outline';
      case 'mobile_ios':
        return 'phone-portrait-outline';
      case 'mobile_android':
        return 'phone-portrait-outline';
      default:
        return 'hardware-chip-outline';
    }
  };

  const handleDeactivate = () => {
    Alert.alert(
      'Deactivate License',
      'This will remove your Pro license from this device. You can reactivate it anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: () => clearAuth(),
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <View style={styles.card}>
          {plan && plan !== 'free' ? (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Plan</Text>
                <View style={[styles.proBadge, { backgroundColor: '#4ade80' }]}>
                  <Text style={[styles.proBadgeText, { color: '#14532d' }]}>PRO</Text>
                </View>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>License Key</Text>
                <View style={styles.licenseRow}>
                  <Text style={styles.licenseText}>
                    {showLicenseKey
                      ? licenseKey
                      : licenseKey?.replace(/./g, '•').slice(0, 16) + '...'}
                  </Text>
                  <TouchableOpacity onPress={() => setShowLicenseKey(!showLicenseKey)}>
                    <Text style={styles.toggleText}>
                      {showLicenseKey ? 'Hide' : 'Show'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={styles.deactivateButton} onPress={handleDeactivate}>
                <Text style={styles.deactivateText}>Deactivate License</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.freeText}>Free Plan</Text>
              <Text style={styles.freeDescription}>
                Upgrade to Pro for unlimited wallets, email alerts, and mobile app access.
              </Text>
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={() => Linking.openURL(`${WEBSITE_URL}/#pricing`)}
              >
                <Text style={styles.upgradeButtonText}>Upgrade to Pro - $59/year</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Connected Devices Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connected Devices</Text>

        <View style={styles.card}>
          {isLoadingDevices ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
          ) : devices.length === 0 ? (
            <Text style={styles.noDevicesText}>No devices connected</Text>
          ) : (
            devices.map((device, index) => (
              <View
                key={device.id}
                style={[
                  styles.deviceRow,
                  index === devices.length - 1 && { borderBottomWidth: 0 }
                ]}
              >
                <View style={styles.deviceIcon}>
                  <Ionicons
                    name={getDeviceIcon(device.deviceType)}
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>{device.deviceName}</Text>
                  <Text style={styles.deviceMeta}>
                    {device.deviceType === 'extension' ? 'Chrome Extension' :
                     device.deviceType === 'mobile_ios' ? 'iOS App' :
                     device.deviceType === 'mobile_android' ? 'Android App' : device.deviceType}
                    {device.version ? ` v${device.version}` : ''}
                  </Text>
                  <Text style={styles.deviceLastSeen}>
                    Last seen: {formatDate(device.lastSeen)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.removeDeviceButton}
                  onPress={() => handleRemoveDevice(device.installId)}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Sign Out Section */}
      <View style={styles.section}>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={() => {
              Alert.alert(
                'Sign Out',
                'Are you sure you want to sign out? Your wallets will be removed from this device.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: () => {
                      clearAuth();
                      router.replace('/onboarding');
                    },
                  },
                ]
              );
            }}
          >
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Refresh Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Auto Refresh</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Refresh Interval</Text>
            <Text style={styles.value}>
              {settings.refreshInterval >= 60
                ? `${settings.refreshInterval / 60}h`
                : `${settings.refreshInterval}m`}
            </Text>
          </View>

          <View style={styles.intervalButtons}>
            {[15, 30, 60, 180].map((interval) => (
              <TouchableOpacity
                key={interval}
                style={[
                  styles.intervalButton,
                  settings.refreshInterval === interval && styles.intervalButtonActive,
                ]}
                onPress={() => settings.setRefreshInterval(interval)}
              >
                <Text
                  style={[
                    styles.intervalButtonText,
                    settings.refreshInterval === interval && styles.intervalButtonTextActive,
                  ]}
                >
                  {interval >= 60 ? `${interval / 60}h` : `${interval}m`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Electricity Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Electricity Costs</Text>

        <View style={styles.card}>
          <View style={styles.inputRow}>
            <Text style={styles.label}>Rate ($/kWh)</Text>
            <TextInput
              style={styles.input}
              value={String(settings.electricityRate)}
              onChangeText={(text) => {
                const rate = parseFloat(text) || 0;
                settings.setElectricityRate(rate);
              }}
              keyboardType="decimal-pad"
              placeholder="0.12"
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.label}>Power (Watts)</Text>
            <TextInput
              style={styles.input}
              value={String(settings.powerConsumption)}
              onChangeText={(text) => {
                const watts = parseInt(text) || 0;
                settings.setPowerConsumption(watts);
              }}
              keyboardType="number-pad"
              placeholder="0"
            />
          </View>
          <Text style={styles.helpText}>
            Used to calculate net profit after electricity costs
          </Text>
        </View>
      </View>

      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>

        <View style={styles.card}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>Enable Notifications</Text>
            <Switch
              value={settings.notifications.enabled}
              onValueChange={(value) =>
                settings.setNotifications({ enabled: value })
              }
              trackColor={{ false: colors.border, true: colors.accentLight }}
              thumbColor={settings.notifications.enabled ? colors.accent : '#f4f3f4'}
            />
          </View>

          {settings.notifications.enabled && (
            <>
              <View style={styles.switchRow}>
                <Text style={styles.label}>Worker Offline</Text>
                <Switch
                  value={settings.notifications.workerOffline}
                  onValueChange={(value) =>
                    settings.setNotifications({ workerOffline: value })
                  }
                  trackColor={{ false: colors.border, true: colors.accentLight }}
                  thumbColor={settings.notifications.workerOffline ? colors.accent : '#f4f3f4'}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.label}>Profit Drop Alert</Text>
                <Switch
                  value={settings.notifications.profitDrop}
                  onValueChange={(value) =>
                    settings.setNotifications({ profitDrop: value })
                  }
                  trackColor={{ false: colors.border, true: colors.accentLight }}
                  thumbColor={settings.notifications.profitDrop ? colors.accent : '#f4f3f4'}
                />
              </View>
            </>
          )}
        </View>
      </View>

      {/* Display Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Display</Text>

        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.label}>Lite Mode (Light Theme)</Text>
              <Text style={styles.helpTextSmall}>Dark mode is the default</Text>
            </View>
            <Switch
              value={settings.liteMode}
              onValueChange={(value) => settings.setLiteMode(value)}
              trackColor={{ false: colors.border, true: colors.accentLight }}
              thumbColor={settings.liteMode ? colors.accent : '#f4f3f4'}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.label}>Show Discovery Coins</Text>
            <Switch
              value={settings.showDiscoveryCoins}
              onValueChange={(value) => settings.setShowDiscoveryCoins(value)}
              trackColor={{ false: colors.border, true: colors.accentLight }}
              thumbColor={settings.showDiscoveryCoins ? colors.accent : '#f4f3f4'}
            />
          </View>
        </View>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Version</Text>
            <Text style={styles.value}>v{APP_VERSION} ({BUILD_NUMBER})</Text>
          </View>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => Linking.openURL(`${WEBSITE_URL}/dashboard`)}
          >
            <Text style={styles.linkText}>Open Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => Linking.openURL(`${WEBSITE_URL}/support`)}
          >
            <Text style={styles.linkText}>Support & FAQ</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => Linking.openURL(`${WEBSITE_URL}/privacy`)}
          >
            <Text style={styles.linkText}>Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.linkRow, { borderBottomWidth: 0 }]}
            onPress={() => Linking.openURL(`${WEBSITE_URL}/terms`)}
          >
            <Text style={styles.linkText}>Terms of Service</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

// Dynamic styles factory
const createStyles = (colors: ReturnType<typeof getColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  value: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  proBadge: {
    backgroundColor: colors.proBadgeStart,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  proBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: '#000',
  },
  licenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  licenseText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: 'monospace',
    marginRight: spacing.sm,
  },
  toggleText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  deactivateButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  deactivateText: {
    fontSize: fontSize.sm,
    color: colors.danger,
  },
  freeText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  freeDescription: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  signOutButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  signOutButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.danger,
  },
  intervalButtons: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  intervalButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    marginHorizontal: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  intervalButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  intervalButtonText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: '500',
  },
  intervalButtonTextActive: {
    color: '#fff',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  input: {
    fontSize: fontSize.md,
    color: colors.text,
    textAlign: 'right',
    minWidth: 80,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
  },
  helpText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  helpTextSmall: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  linkRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  linkText: {
    fontSize: fontSize.md,
    color: colors.primary,
  },
  noDevicesText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  deviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  deviceMeta: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  deviceLastSeen: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  removeDeviceButton: {
    padding: spacing.sm,
  },
});

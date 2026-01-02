import { useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';

const WEBSITE_URL = 'https://www.mineglance.com';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';

export default function SettingsScreen() {
  const router = useRouter();
  const settings = useSettingsStore();
  const { licenseKey, plan, clearAuth, isPro } = useAuthStore();
  const [showLicenseKey, setShowLicenseKey] = useState(false);

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
                  <Text style={[styles.proBadgeText, { color: '#14532d' }]}>
                    {plan === 'bundle' ? 'PRO+' : 'PRO'}
                  </Text>
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

              {/* Show upgrade option for PRO users (not bundle) */}
              {plan === 'pro' && (
                <TouchableOpacity
                  style={[styles.upgradeButton, { marginTop: spacing.md }]}
                  onPress={() => Linking.openURL(`${WEBSITE_URL}/#pricing`)}
                >
                  <Text style={styles.upgradeButtonText}>Upgrade to Pro+</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.deactivateButton} onPress={handleDeactivate}>
                <Text style={styles.deactivateText}>Deactivate License</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.freeText}>Free Plan</Text>
              <Text style={styles.freeDescription}>
                Upgrade to Pro+ for unlimited wallets, email alerts, and mobile app access.
              </Text>
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={() => Linking.openURL(`${WEBSITE_URL}/#pricing`)}
              >
                <Text style={styles.upgradeButtonText}>Upgrade to Pro+</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Sync Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sync</Text>

        <View style={styles.card}>
          <TouchableOpacity
            style={styles.syncButton}
            onPress={() => router.push('/scan')}
          >
            <Text style={styles.syncButtonText}>Scan QR Code</Text>
            <Text style={styles.syncDescription}>
              Sync wallets and settings from extension
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Refresh Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Auto Refresh</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Refresh Interval</Text>
            <Text style={styles.value}>{settings.refreshInterval} min</Text>
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
            <Text style={styles.value}>1.0.0</Text>
          </View>
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

const styles = StyleSheet.create({
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
  syncButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  syncButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  syncDescription: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
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
});

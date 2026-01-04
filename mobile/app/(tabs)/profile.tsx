import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { getColors, spacing, borderRadius, fontSize } from '@/constants/theme';

const API_BASE = 'https://www.mineglance.com/api';

interface Device {
  id: string;
  installId: string;
  deviceName: string;
  deviceType: string;
  browser?: string;
  version?: string;
  lastSeen: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const liteMode = useSettingsStore(state => state.liteMode);
  const colors = getColors(liteMode);

  const { email, plan, authToken, clearAuth, isPro } = useAuthStore();
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    if (!authToken) return;

    setIsLoadingDevices(true);
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

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await clearAuth();
            router.replace('/onboarding');
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getDeviceIcon = (deviceType: string) => {
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

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* User Info Card */}
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <View style={styles.userHeader}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="person" size={32} color={colors.primary} />
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.email, { color: colors.text }]}>{email}</Text>
            <View style={[styles.planBadge, { backgroundColor: isPro() ? colors.primary : colors.border }]}>
              <Text style={styles.planBadgeText}>
                {isPro() ? 'PRO' : 'FREE'}
              </Text>
            </View>
          </View>
        </View>

        {!isPro() && (
          <TouchableOpacity
            style={[styles.upgradeButton, { backgroundColor: colors.primary }]}
            onPress={() => Linking.openURL('https://mineglance.com/#pricing')}
          >
            <Text style={styles.upgradeButtonText}>Upgrade to Pro - $59</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Subscription Card */}
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Subscription</Text>

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Plan</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {isPro() ? 'Pro (Lifetime)' : 'Free'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Wallets</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {isPro() ? 'Unlimited' : '1 wallet'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Cloud Sync</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {isPro() ? 'Enabled' : 'Limited'}
          </Text>
        </View>
      </View>

      {/* Connected Devices */}
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Connected Devices</Text>

        {isLoadingDevices ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
        ) : devices.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No devices connected
          </Text>
        ) : (
          devices.map((device) => (
            <View key={device.id} style={[styles.deviceRow, { borderBottomColor: colors.border }]}>
              <View style={styles.deviceInfo}>
                <Ionicons
                  name={getDeviceIcon(device.deviceType) as any}
                  size={20}
                  color={colors.textMuted}
                  style={{ marginRight: 12 }}
                />
                <View>
                  <Text style={[styles.deviceName, { color: colors.text }]}>
                    {device.deviceName}
                  </Text>
                  <Text style={[styles.deviceMeta, { color: colors.textMuted }]}>
                    Last seen: {formatDate(device.lastSeen)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveDevice(device.installId)}
                style={styles.removeButton}
              >
                <Ionicons name="close-circle-outline" size={24} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Sign Out */}
      <TouchableOpacity
        style={[styles.signOutButton, { borderColor: colors.danger }]}
        onPress={handleSignOut}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        <Text style={[styles.signOutText, { color: colors.danger }]}>Sign Out</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  email: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: 4,
  },
  planBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  planBadgeText: {
    color: '#fff',
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  upgradeButton: {
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    fontSize: fontSize.md,
  },
  infoValue: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: spacing.lg,
    fontSize: fontSize.sm,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceName: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  deviceMeta: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  removeButton: {
    padding: spacing.xs,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  signOutText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
});

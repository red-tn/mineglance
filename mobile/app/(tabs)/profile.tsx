import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Linking, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { getColors, spacing, borderRadius, fontSize } from '@/constants/theme';

const API_BASE = 'https://www.mineglance.com/api';

interface Profile {
  email: string;
  fullName: string | null;
  phone: string | null;
  plan: string;
  createdAt: string;
  blogDisplayName: string | null;
}

export default function ProfileScreen() {
  const router = useRouter();
  const liteMode = useSettingsStore(state => state.liteMode);
  const colors = getColors(liteMode);

  const { email, plan, authToken, clearAuth, isPro, activateLicense } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // License activation state
  const [licenseKey, setLicenseKey] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activationError, setActivationError] = useState('');

  // Profile editing state
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    blogDisplayName: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    if (!authToken) {
      setIsLoadingProfile(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/dashboard/profile`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        setFormData({
          fullName: data.profile.fullName || '',
          phone: data.profile.phone || '',
          blogDisplayName: data.profile.blogDisplayName || ''
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
    setIsLoadingProfile(false);
  };

  const handleSaveProfile = async () => {
    if (!authToken) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const response = await fetch(`${API_BASE}/dashboard/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSaveSuccess(true);
        loadProfile();
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const data = await response.json();
        Alert.alert('Error', data.error || 'Failed to save profile');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile');
    }
    setIsSaving(false);
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

  const handleActivateLicense = async () => {
    if (!licenseKey.trim()) {
      setActivationError('Please enter a license key');
      return;
    }

    setIsActivating(true);
    setActivationError('');

    const result = await activateLicense(licenseKey.trim());

    if (result.success) {
      Alert.alert(
        'License Activated!',
        'You now have Pro access on all your devices.',
        [{ text: 'OK' }]
      );
      setLicenseKey('');
    } else {
      setActivationError(result.error || 'Failed to activate license');
    }

    setIsActivating(false);
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
            <Text style={[styles.email, { color: colors.text }]}>{profile?.fullName || email}</Text>
            <Text style={[styles.emailSmall, { color: colors.textMuted }]}>{email}</Text>
            <View style={[styles.planBadge, { backgroundColor: isPro() ? colors.primary : colors.border }]}>
              <Text style={styles.planBadgeText}>
                {plan === 'bundle' ? 'PRO+' : isPro() ? 'PRO' : 'FREE'}
              </Text>
            </View>
          </View>
        </View>

        {!isPro() && (
          <TouchableOpacity
            style={[styles.upgradeButton, { backgroundColor: colors.primary }]}
            onPress={() => Linking.openURL('https://mineglance.com/#pricing')}
          >
            <Text style={styles.upgradeButtonText}>Upgrade to Pro - $59/year</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Profile Edit Card */}
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Profile Information</Text>

        {isLoadingProfile ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Full Name</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder="Enter your name"
                placeholderTextColor={colors.textMuted}
                value={formData.fullName}
                onChangeText={(text) => setFormData(prev => ({ ...prev, fullName: text }))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Phone Number</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder="+1 (555) 123-4567"
                placeholderTextColor={colors.textMuted}
                value={formData.phone}
                onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Blog Display Name</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder="CryptoMiner42"
                placeholderTextColor={colors.textMuted}
                value={formData.blogDisplayName}
                onChangeText={(text) => setFormData(prev => ({ ...prev, blogDisplayName: text.replace(/[^a-zA-Z0-9_]/g, '') }))}
                autoCapitalize="none"
                maxLength={30}
              />
              <Text style={[styles.inputHint, { color: colors.textMuted }]}>
                Letters, numbers and underscores only
              </Text>
            </View>

            {saveSuccess && (
              <View style={[styles.successBanner, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
                <Text style={[styles.successText, { color: colors.primary }]}>Profile saved successfully!</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }, isSaving && styles.buttonDisabled]}
              onPress={handleSaveProfile}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* License Activation Card - Only for free users */}
      {!isPro() && (
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Activate License</Text>
          <Text style={[styles.licenseInfo, { color: colors.textMuted }]}>
            Already have a Pro license key? Enter it below to unlock Pro features on all your devices.
          </Text>

          <TextInput
            style={[styles.licenseInput, {
              backgroundColor: colors.background,
              borderColor: activationError ? colors.danger : colors.border,
              color: colors.text
            }]}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            placeholderTextColor={colors.textMuted}
            value={licenseKey}
            onChangeText={(text) => {
              setLicenseKey(text.toUpperCase());
              setActivationError('');
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!isActivating}
          />

          {activationError ? (
            <Text style={[styles.errorText, { color: colors.danger }]}>{activationError}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.activateButton, { backgroundColor: colors.primary }, isActivating && styles.buttonDisabled]}
            onPress={handleActivateLicense}
            disabled={isActivating}
          >
            {isActivating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.activateButtonText}>Activate License</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => Linking.openURL('https://www.mineglance.com/support#license-key')}>
            <Text style={[styles.helpLink, { color: colors.primary }]}>Lost your license key?</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Subscription Card */}
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Subscription</Text>

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Plan</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {plan === 'bundle' ? 'Pro Plus' : isPro() ? 'Pro (Annual)' : 'Free'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Wallets</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {isPro() ? 'Unlimited' : '2 wallets'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Cloud Sync</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {isPro() ? 'Enabled' : 'Limited'}
          </Text>
        </View>

        {profile?.createdAt && (
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Member Since</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {new Date(profile.createdAt).toLocaleDateString()}
            </Text>
          </View>
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
    marginBottom: 2,
  },
  emailSmall: {
    fontSize: fontSize.sm,
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
  licenseInfo: {
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  licenseInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    marginBottom: spacing.sm,
    textAlign: 'center',
    letterSpacing: 2,
  },
  errorText: {
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  activateButton: {
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  activateButtonText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  helpLink: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
  },
  inputHint: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  saveButton: {
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  successBanner: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  successText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});

import { View, Text, StyleSheet, TouchableOpacity, Image, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';

export default function OnboardingScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Logo placeholder - replace with actual logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>MG</Text>
          </View>
        </View>

        <Text style={styles.title}>Welcome to MineGlance</Text>
        <Text style={styles.subtitle}>
          Monitor your mining rigs from anywhere
        </Text>

        <View style={styles.features}>
          <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureIconText}>📊</Text>
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Real-time Stats</Text>
              <Text style={styles.featureDescription}>
                Track hashrate, workers, and earnings
              </Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureIconText}>🔔</Text>
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Instant Alerts</Text>
              <Text style={styles.featureDescription}>
                Get notified when workers go offline
              </Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureIconText}>🔄</Text>
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Sync with Extension</Text>
              <Text style={styles.featureDescription}>
                Scan QR code to import your wallets
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => router.push('/scan')}
        >
          <Text style={styles.scanButtonText}>Scan QR Code</Text>
        </TouchableOpacity>

        <Text style={styles.instructions}>
          Open MineGlance extension settings on your computer{'\n'}
          and click "Generate QR Code" to sync
        </Text>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Don't have Pro Plus?</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={() => Linking.openURL('https://www.mineglance.com/#pricing')}
        >
          <Text style={styles.upgradeButtonText}>Get Pro Plus</Text>
        </TouchableOpacity>

        <Text style={styles.upgradeNote}>
          Pro Plus includes mobile app access
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  logoContainer: {
    marginBottom: spacing.xl,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
  },
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: '700',
    color: '#fff',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  features: {
    width: '100%',
    marginTop: spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  featureIconText: {
    fontSize: 24,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.7)',
  },
  footer: {
    padding: spacing.xl,
    paddingBottom: spacing.xl + 20,
    alignItems: 'center',
  },
  scanButton: {
    width: '100%',
    backgroundColor: '#fff',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  scanButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.primary,
  },
  instructions: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dividerText: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.6)',
    paddingHorizontal: spacing.md,
  },
  upgradeButton: {
    width: '100%',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#fbbf24',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  upgradeButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#fbbf24',
  },
  upgradeNote: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
});

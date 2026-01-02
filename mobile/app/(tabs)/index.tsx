import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import { useWalletStore } from '@/stores/walletStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';
import { usePoolData } from '@/hooks/usePoolData';
import { usePrices } from '@/hooks/usePrices';
import { formatHashrate, formatCurrency } from '@/utils/format';
import { calculateDailyProfit } from '@/utils/profit';

export default function DashboardScreen() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const {
    wallets,
    walletData,
    isLoading,
    getTotalHashrate,
    getOnlineWorkerCount,
    getEnabledWallets,
  } = useWalletStore();
  const { electricityRate, powerConsumption } = useSettingsStore();
  const { fetchAllWallets } = usePoolData();
  const { getPrice, calculateUsdValue, fetchPrices } = usePrices();

  const { isActivated, plan, onboardingCompleted, isLoading: authLoading } = useAuthStore();
  const enabledWallets = getEnabledWallets();
  const workerCount = getOnlineWorkerCount();
  const totalHashrate = getTotalHashrate();

  // Calculate total 24h earnings in USD
  const total24hEarnings = enabledWallets.reduce((total, wallet) => {
    const data = walletData[wallet.id];
    if (data?.earnings24h) {
      return total + calculateUsdValue(wallet.coin, data.earnings24h);
    }
    return total;
  }, 0);

  // Calculate net profit
  const profitCalc = calculateDailyProfit(total24hEarnings, powerConsumption, electricityRate);

  // Wait for layout and auth to be ready before navigating
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Only redirect to onboarding if:
    // 1. Layout is ready
    // 2. Auth has finished loading
    // 3. Onboarding was never completed
    // 4. No wallets exist
    if (isReady && !authLoading && !onboardingCompleted && wallets.length === 0) {
      router.replace('/onboarding');
    }
  }, [isReady, authLoading, onboardingCompleted, wallets.length]);

  const onRefresh = useCallback(async () => {
    await Promise.all([fetchAllWallets(), fetchPrices()]);
  }, [fetchAllWallets, fetchPrices]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      {/* Pro Badge */}
      {plan && plan !== 'free' && (
        <View style={styles.proBadge}>
          <Text style={styles.proBadgeText}>
            {plan === 'bundle' ? 'PRO PLUS' : 'PRO'}
          </Text>
        </View>
      )}

      {/* Stats Overview */}
      <View style={styles.statsGrid}>
        <View style={styles.statCardWrapper}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Hashrate</Text>
            <Text style={styles.statValue}>{formatHashrate(totalHashrate)}</Text>
          </View>
        </View>

        <View style={styles.statCardWrapper}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Workers</Text>
            <Text style={styles.statValue}>
              <Text style={{ color: workerCount.online > 0 ? colors.online : colors.offline }}>
                {workerCount.online}
              </Text>
              <Text style={styles.statMuted}>/{workerCount.total}</Text>
            </Text>
          </View>
        </View>

        <View style={styles.statCardWrapper}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>24h Earnings</Text>
            <Text style={styles.statValue}>{formatCurrency(total24hEarnings)}</Text>
          </View>
        </View>

        <View style={styles.statCardWrapper}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Net Profit</Text>
            <Text style={[
              styles.statValue,
              { color: profitCalc.netProfit >= 0 ? colors.accent : colors.danger }
            ]}>
              {formatCurrency(profitCalc.netProfit)}
            </Text>
          </View>
        </View>
      </View>

      {/* Wallets Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Wallets</Text>
          <TouchableOpacity onPress={() => router.push('/scan')}>
            <Text style={styles.sectionAction}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {enabledWallets.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No wallets configured</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/scan')}
            >
              <Text style={styles.emptyButtonText}>Scan QR Code</Text>
            </TouchableOpacity>
          </View>
        ) : (
          enabledWallets.slice(0, 3).map((wallet) => {
            const data = walletData[wallet.id];
            const hasError = !!data?.error;
            const onlineWorkers = data?.workers?.filter(w => w.online).length || 0;
            const totalWorkers = data?.workers?.length || 0;

            return (
              <TouchableOpacity
                key={wallet.id}
                style={[styles.walletCard, hasError && styles.walletCardError]}
                onPress={() => router.push(`/wallet/${wallet.id}`)}
              >
                <View style={styles.walletHeader}>
                  <Text style={styles.walletName}>{wallet.name || wallet.coin}</Text>
                  <Text style={styles.walletPool}>{wallet.pool}</Text>
                </View>

                {hasError ? (
                  <Text style={styles.errorText} numberOfLines={1}>
                    {data.error}
                  </Text>
                ) : (
                  <View style={styles.walletStats}>
                    <Text style={styles.walletHashrate}>
                      {data ? formatHashrate(data.hashrate) : '--'}
                    </Text>
                    <View style={styles.walletStatus}>
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor: onlineWorkers > 0
                              ? colors.online
                              : colors.offline,
                          },
                        ]}
                      />
                      <Text style={styles.walletWorkers}>
                        {data ? `${onlineWorkers}/${totalWorkers}` : '--'}
                      </Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}

        {enabledWallets.length > 3 && (
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => router.push('/(tabs)/wallets')}
          >
            <Text style={styles.viewAllText}>
              View all {enabledWallets.length} wallets
            </Text>
          </TouchableOpacity>
        )}
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
  },
  proBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.proBadgeStart,
    marginBottom: spacing.md,
  },
  proBadgeText: {
    color: '#000',
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
    marginBottom: spacing.lg,
  },
  statCardWrapper: {
    width: '50%',
    padding: spacing.xs,
  },
  statCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  statMuted: {
    color: colors.textMuted,
    fontWeight: '400',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  sectionAction: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  walletCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  walletCardError: {
    borderColor: colors.danger,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  walletName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  walletPool: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  walletStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletHashrate: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.primary,
  },
  walletStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  walletWorkers: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.danger,
  },
  emptyState: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  viewAllButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
});

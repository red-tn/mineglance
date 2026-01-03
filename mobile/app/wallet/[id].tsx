import { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import { useWalletStore } from '@/stores/walletStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { usePoolData } from '@/hooks/usePoolData';
import { usePrices } from '@/hooks/usePrices';
import { formatHashrate, formatCurrency, formatCoinAmount, formatRelativeTime } from '@/utils/format';
import { calculateDailyProfit } from '@/utils/profit';
import { getPoolWebUrl } from '@/constants/pools';

export default function WalletDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { wallets, walletData, isLoading } = useWalletStore();
  const { electricityRate, powerConsumption } = useSettingsStore();
  const { fetchWallet } = usePoolData();
  const { calculateUsdValue, getPrice } = usePrices();

  const wallet = wallets.find((w) => w.id === id);
  const data = wallet ? walletData[wallet.id] : null;

  const onRefresh = useCallback(async () => {
    if (id) {
      await fetchWallet(id);
    }
  }, [id, fetchWallet]);

  if (!wallet) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Wallet not found</Text>
      </View>
    );
  }

  // Calculate values
  const coinPrice = getPrice(wallet.coin);
  const earnings24hCoin = data?.earnings24h || 0;
  const earnings24hUsd = calculateUsdValue(wallet.coin, earnings24hCoin);
  const balanceUsd = calculateUsdValue(wallet.coin, data?.balance || 0);
  const profit = calculateDailyProfit(earnings24hUsd, powerConsumption, electricityRate);

  const onlineWorkers = data?.workers?.filter((w) => w.online).length || 0;
  const totalWorkers = data?.workers?.length || 0;
  const hasError = !!data?.error;

  const openPoolUrl = () => {
    const url = getPoolWebUrl(wallet.pool, wallet.coin, wallet.address);
    if (url) {
      Linking.openURL(url);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: wallet.name || `${wallet.coin.toUpperCase()} Wallet` }} />

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
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <Text style={styles.coinSymbol}>{wallet.coin.toUpperCase()}</Text>
            <Text style={styles.poolName}>{wallet.pool}</Text>
          </View>
          <Text style={styles.hashrate}>
            {data && !hasError ? formatHashrate(data.hashrate) : '--'}
          </Text>
          <Text style={styles.hashrateLabel}>Current Hashrate</Text>

          {hasError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{data?.error}</Text>
            </View>
          )}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCardWrapper}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                <Text style={{ color: onlineWorkers > 0 ? colors.online : colors.offline }}>
                  {onlineWorkers}
                </Text>
                /{totalWorkers}
              </Text>
              <Text style={styles.statLabel}>Workers Online</Text>
            </View>
          </View>

          <View style={styles.statCardWrapper}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {formatCoinAmount(data?.balance || 0, 6)}
              </Text>
              <Text style={styles.statLabel}>
                Unpaid ({formatCurrency(balanceUsd)})
              </Text>
            </View>
          </View>

          <View style={styles.statCardWrapper}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {formatCurrency(earnings24hUsd)}
              </Text>
              <Text style={styles.statLabel}>24h Earnings</Text>
            </View>
          </View>

          <View style={styles.statCardWrapper}>
            <View style={styles.statCard}>
              <Text style={[
                styles.statValue,
                { color: profit.netProfit >= 0 ? colors.accent : colors.danger }
              ]}>
                {formatCurrency(profit.netProfit)}
              </Text>
              <Text style={styles.statLabel}>Net Profit</Text>
            </View>
          </View>
        </View>

        {/* Workers Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workers</Text>

          {data?.workers && data.workers.length > 0 ? (
            data.workers.map((worker, index) => (
              <View key={index} style={styles.workerCard}>
                <View style={styles.workerMain}>
                  <View style={styles.workerInfo}>
                    <View
                      style={[
                        styles.workerStatus,
                        { backgroundColor: worker.online ? colors.online : colors.offline },
                      ]}
                    />
                    <Text style={styles.workerName}>{worker.name}</Text>
                  </View>
                  <Text style={styles.workerHashrate}>
                    {formatHashrate(worker.hashrate)}
                  </Text>
                </View>
                {(worker.shares !== undefined || worker.lastSeen) && (
                  <View style={styles.workerMeta}>
                    {worker.shares !== undefined && (
                      <Text style={styles.workerMetaText}>
                        Shares: {worker.shares.toLocaleString()}
                      </Text>
                    )}
                    {worker.lastSeen && (
                      <Text style={styles.workerMetaText}>
                        Last seen: {formatRelativeTime(worker.lastSeen)}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyWorkers}>
              <Text style={styles.emptyText}>
                {hasError ? 'Could not load workers' : 'No worker data available'}
              </Text>
              <Text style={styles.emptyHint}>Pull down to refresh</Text>
            </View>
          )}
        </View>

        {/* Profit Calculator */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profit Calculator</Text>

          <View style={styles.calculatorCard}>
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>
                Coin Price ({wallet.coin.toUpperCase()})
              </Text>
              <Text style={styles.calcValue}>{formatCurrency(coinPrice)}</Text>
            </View>
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>24h Earnings</Text>
              <Text style={styles.calcValue}>{formatCurrency(earnings24hUsd)}</Text>
            </View>
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>
                Electricity ({powerConsumption}W @ ${electricityRate}/kWh)
              </Text>
              <Text style={[styles.calcValue, { color: colors.danger }]}>
                -{formatCurrency(profit.electricityCost)}
              </Text>
            </View>
            <View style={[styles.calcRow, styles.calcTotal]}>
              <Text style={styles.calcTotalLabel}>Net Profit</Text>
              <Text
                style={[
                  styles.calcTotalValue,
                  { color: profit.netProfit >= 0 ? colors.accent : colors.danger },
                ]}
              >
                {formatCurrency(profit.netProfit)}
              </Text>
            </View>
          </View>
        </View>

        {/* Pool Link */}
        <TouchableOpacity style={styles.poolLink} onPress={openPoolUrl}>
          <Text style={styles.poolLinkText}>View on Pool Website</Text>
        </TouchableOpacity>

        {/* Address */}
        <View style={styles.addressSection}>
          <Text style={styles.addressLabel}>Wallet Address</Text>
          <Text style={styles.addressText} selectable>
            {wallet.address}
          </Text>
        </View>
      </ScrollView>
    </>
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
  errorText: {
    color: colors.danger,
    fontSize: fontSize.md,
    textAlign: 'center',
    padding: spacing.xl,
  },
  headerCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  coinSymbol: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: '#fff',
  },
  poolName: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
  },
  hashrate: {
    fontSize: fontSize['3xl'],
    fontWeight: '700',
    color: '#fff',
  },
  hashrateLabel: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: spacing.xs,
  },
  errorBanner: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  errorBannerText: {
    color: '#fff',
    fontSize: fontSize.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
    marginBottom: spacing.md,
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
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  workerCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  workerMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  workerStatus: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  workerName: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  workerHashrate: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
  },
  workerMeta: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  workerMetaText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  emptyWorkers: {
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
    marginBottom: spacing.xs,
  },
  emptyHint: {
    fontSize: fontSize.sm,
    color: colors.textLight,
  },
  calculatorCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  calcLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    flex: 1,
  },
  calcValue: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
  },
  calcTotal: {
    borderBottomWidth: 0,
    paddingTop: spacing.md,
  },
  calcTotalLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  calcTotalValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  poolLink: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  poolLinkText: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.primary,
  },
  addressSection: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addressLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  addressText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontFamily: 'monospace',
  },
});

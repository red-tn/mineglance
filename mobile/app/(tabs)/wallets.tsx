import { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getColors, spacing, borderRadius, fontSize } from '@/constants/theme';
import { useWalletStore } from '@/stores/walletStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';
import { usePoolData } from '@/hooks/usePoolData';
import { usePrices } from '@/hooks/usePrices';

const WEBSITE_URL = 'https://www.mineglance.com';

export default function WalletsScreen() {
  const router = useRouter();
  const { wallets, walletData, isLoading, reorderWallets } = useWalletStore();
  const { liteMode } = useSettingsStore();
  const { isPro } = useAuthStore();
  const { fetchAllWallets } = usePoolData();
  const { fetchPrices } = usePrices();
  const [isReordering, setIsReordering] = useState(false);

  // Dynamic colors based on theme
  const colors = getColors(liteMode);
  const styles = useMemo(() => createStyles(colors), [liteMode]);

  const sortedWallets = [...wallets].sort((a, b) => (a.order || 0) - (b.order || 0));

  const moveWallet = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sortedWallets.length) return;

    const newWallets = [...sortedWallets];
    [newWallets[index], newWallets[newIndex]] = [newWallets[newIndex], newWallets[index]];
    reorderWallets(newWallets);
  };

  const onRefresh = useCallback(async () => {
    await Promise.all([fetchAllWallets(), fetchPrices()]);
  }, [fetchAllWallets, fetchPrices]);

  const formatHashrate = (hashrate: number): string => {
    if (hashrate >= 1e12) return `${(hashrate / 1e12).toFixed(2)} TH/s`;
    if (hashrate >= 1e9) return `${(hashrate / 1e9).toFixed(2)} GH/s`;
    if (hashrate >= 1e6) return `${(hashrate / 1e6).toFixed(2)} MH/s`;
    if (hashrate >= 1e3) return `${(hashrate / 1e3).toFixed(2)} KH/s`;
    return `${hashrate.toFixed(2)} H/s`;
  };

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
      {/* Header with Reorder button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {wallets.length} Wallet{wallets.length !== 1 ? 's' : ''}
        </Text>
        <View style={styles.headerButtons}>
          {wallets.length > 1 && (
            <TouchableOpacity
              style={[styles.reorderButton, isReordering && styles.reorderButtonActive]}
              onPress={() => setIsReordering(!isReordering)}
            >
              <Text style={[styles.reorderButtonText, isReordering && styles.reorderButtonTextActive]}>
                {isReordering ? 'Done' : 'Reorder'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Wallet List */}
      {sortedWallets.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Wallets Yet</Text>
          <Text style={styles.emptyText}>
            Add wallets in the MineGlance extension - they sync automatically to this app.
          </Text>
        </View>
      ) : (
        sortedWallets.map((wallet, index) => {
          const data = walletData[wallet.id];
          const isLocked = !isPro() && index > 0;

          return (
            <View key={wallet.id} style={styles.walletRow}>
              {/* Reorder buttons */}
              {isReordering && (
                <View style={styles.reorderControls}>
                  <TouchableOpacity
                    style={[styles.moveButton, index === 0 && styles.moveButtonDisabled]}
                    onPress={() => moveWallet(index, 'up')}
                    disabled={index === 0}
                  >
                    <Text style={styles.moveButtonText}>▲</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.moveButton, index === sortedWallets.length - 1 && styles.moveButtonDisabled]}
                    onPress={() => moveWallet(index, 'down')}
                    disabled={index === sortedWallets.length - 1}
                  >
                    <Text style={styles.moveButtonText}>▼</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={[styles.walletCard, isLocked && styles.walletCardLocked]}
                onPress={() => !isLocked && !isReordering && router.push(`/wallet/${wallet.id}`)}
                disabled={isLocked || isReordering}
              >
                {isLocked && (
                  <View style={styles.lockedOverlay}>
                    <Text style={styles.lockedText}>PRO+</Text>
                  </View>
                )}

                <View style={styles.walletMain}>
                  <View style={styles.walletInfo}>
                    <Text style={[styles.walletName, isLocked && styles.textLocked]}>
                      {wallet.name || `${wallet.coin} Wallet`}
                    </Text>
                    <Text style={[styles.walletMeta, isLocked && styles.textLocked]}>
                      {wallet.coin} • {wallet.pool}
                    </Text>
                    <Text
                      style={[styles.walletAddress, isLocked && styles.textLocked]}
                      numberOfLines={1}
                    >
                      {wallet.address.slice(0, 12)}...{wallet.address.slice(-8)}
                    </Text>
                  </View>

                  <View style={styles.walletStats}>
                    <View style={styles.statRow}>
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor: wallet.enabled
                              ? data?.workers?.some((w) => w.online)
                                ? colors.online
                                : colors.offline
                              : colors.textLight,
                          },
                        ]}
                      />
                      <Text style={[styles.statText, isLocked && styles.textLocked]}>
                        {data
                          ? `${data.workers.filter((w) => w.online).length}/${data.workers.length}`
                          : '--'}
                      </Text>
                    </View>
                    <Text style={[styles.hashrateText, isLocked && styles.textLocked]}>
                      {data ? formatHashrate(data.hashrate) : '--'}
                    </Text>
                  </View>
                </View>

                {!wallet.enabled && (
                  <View style={styles.disabledBadge}>
                    <Text style={styles.disabledText}>Disabled</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          );
        })
      )}

      {/* Upgrade prompt for free users */}
      {!isPro() && wallets.length > 1 && (
        <View style={styles.upgradeCard}>
          <Text style={styles.upgradeTitle}>Unlock All Wallets</Text>
          <Text style={styles.upgradeText}>
            Free users can only view one wallet. Upgrade to Pro+ to monitor unlimited wallets.
          </Text>
          <TouchableOpacity style={styles.upgradeButton}>
            <Text style={styles.upgradeButtonText}>Upgrade to Pro+</Text>
          </TouchableOpacity>
        </View>
      )}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reorderButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reorderButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  reorderButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textMuted,
  },
  reorderButtonTextActive: {
    color: '#fff',
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  reorderControls: {
    marginRight: spacing.sm,
    alignItems: 'center',
  },
  moveButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  moveButtonDisabled: {
    opacity: 0.3,
  },
  moveButtonText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  walletCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  walletCardLocked: {
    opacity: 0.6,
  },
  lockedOverlay: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.proBadgeStart,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    zIndex: 1,
  },
  lockedText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: '#000',
  },
  walletMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  walletInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  walletName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  walletMeta: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: 4,
  },
  walletAddress: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    fontFamily: 'monospace',
  },
  walletStats: {
    alignItems: 'flex-end',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  statText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  hashrateText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
  },
  textLocked: {
    color: colors.textLight,
  },
  disabledBadge: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  disabledText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
  emptyState: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  upgradeCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  upgradeTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: '#fff',
    marginBottom: spacing.xs,
  },
  upgradeText: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  upgradeButton: {
    backgroundColor: colors.proBadgeStart,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#000',
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});

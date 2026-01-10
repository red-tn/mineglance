import { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Modal,
  TextInput,
  Alert,
  Pressable,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { getColors, spacing, borderRadius, fontSize } from '@/constants/theme';
import { useWalletStore } from '@/stores/walletStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';
import { usePoolData } from '@/hooks/usePoolData';
import { usePrices } from '@/hooks/usePrices';
import { formatHashrate } from '@/utils/format';
import { POOLS, getCoinsForPool } from '@/constants/pools';
import { Wallet } from '@/types';

const WEBSITE_URL = 'https://www.mineglance.com';

// Generate a unique ID for new wallets
const generateId = () => `wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export default function WalletsScreen() {
  const router = useRouter();
  const { wallets, walletData, isLoading, reorderWallets, addWallet, updateWallet, removeWallet } = useWalletStore();
  const { liteMode } = useSettingsStore();
  const { isPro } = useAuthStore();
  const { fetchAllWallets } = usePoolData();
  const { fetchPrices } = usePrices();
  const [isReordering, setIsReordering] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);

  // Form state
  const [formPool, setFormPool] = useState('2miners');
  const [formCoin, setFormCoin] = useState('etc');
  const [formAddress, setFormAddress] = useState('');
  const [formName, setFormName] = useState('');
  const [formPower, setFormPower] = useState('200');

  // Dynamic colors based on theme
  const colors = getColors(liteMode);
  const styles = useMemo(() => createStyles(colors), [liteMode]);

  const sortedWallets = [...wallets].sort((a, b) => (a.order || 0) - (b.order || 0));

  // Get available coins for selected pool
  const availableCoins = getCoinsForPool(formPool);

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

  const resetForm = () => {
    setFormPool('2miners');
    setFormCoin('etc');
    setFormAddress('');
    setFormName('');
    setFormPower('200');
    setEditingWallet(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (wallet: Wallet) => {
    setEditingWallet(wallet);
    setFormPool(wallet.pool);
    setFormCoin(wallet.coin);
    setFormAddress(wallet.address);
    setFormName(wallet.name || '');
    setFormPower(String(wallet.power || 200));
    setShowAddModal(true);
    setSelectedWalletId(null);
  };

  const handlePoolChange = (poolId: string) => {
    setFormPool(poolId);
    const coins = getCoinsForPool(poolId);
    if (coins.length > 0 && !coins.includes(formCoin.toLowerCase())) {
      setFormCoin(coins[0]);
    }
  };

  const handleSaveWallet = async () => {
    if (!formAddress.trim()) {
      Alert.alert('Error', 'Please enter a wallet address');
      return;
    }

    const walletData: Wallet = {
      id: editingWallet?.id || generateId(),
      pool: formPool,
      coin: formCoin.toLowerCase(),
      address: formAddress.trim(),
      name: formName.trim(),
      power: parseInt(formPower) || 200,
      enabled: editingWallet?.enabled ?? true,
      order: editingWallet?.order ?? wallets.length,
    };

    try {
      if (editingWallet) {
        await updateWallet(editingWallet.id, walletData);
      } else {
        await addWallet(walletData);
      }
      setShowAddModal(false);
      resetForm();
      // Refresh data after adding/editing
      setTimeout(() => fetchAllWallets(), 500);
    } catch (error) {
      console.error('Failed to save wallet:', error);
      Alert.alert('Error', 'Failed to save wallet');
    }
  };

  const handleDeleteWallet = (wallet: Wallet) => {
    Alert.alert(
      'Delete Wallet',
      `Are you sure you want to delete "${wallet.name || wallet.coin} wallet"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeWallet(wallet.id);
              setSelectedWalletId(null);
            } catch (error) {
              console.error('Failed to delete wallet:', error);
              Alert.alert('Error', 'Failed to delete wallet');
            }
          },
        },
      ]
    );
  };

  const toggleWalletEnabled = async (wallet: Wallet) => {
    try {
      await updateWallet(wallet.id, { enabled: !wallet.enabled });
      setSelectedWalletId(null);
    } catch (error) {
      console.error('Failed to toggle wallet:', error);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
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
        {/* Header with Add and Reorder buttons */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {wallets.length} Wallet{wallets.length !== 1 ? 's' : ''}
          </Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={openAddModal}
            >
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
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
              Tap "+ Add" above to add your first wallet, or sync from the MineGlance extension.
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={openAddModal}>
              <Text style={styles.emptyButtonText}>Add Wallet</Text>
            </TouchableOpacity>
          </View>
        ) : (
          sortedWallets.map((wallet, index) => {
            const data = walletData[wallet.id];
            const isLocked = !isPro() && index > 0;
            const isSelected = selectedWalletId === wallet.id;
            const onlineWorkers = data?.workers?.filter((w) => w.online).length || 0;
            const totalWorkers = data?.workers?.length || 0;

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

                <Pressable
                  style={[styles.walletCard, isLocked && styles.walletCardLocked, isSelected && styles.walletCardSelected]}
                  onPress={() => {
                    if (isReordering) return;
                    if (isLocked) return;
                    if (isSelected) {
                      router.push(`/wallet/${wallet.id}`);
                    } else {
                      setSelectedWalletId(wallet.id);
                    }
                  }}
                  onLongPress={() => !isLocked && !isReordering && setSelectedWalletId(isSelected ? null : wallet.id)}
                  disabled={isReordering}
                >
                  {isLocked && (
                    <View style={styles.lockedOverlay}>
                      <Text style={styles.lockedText}>PRO</Text>
                    </View>
                  )}

                  <View style={styles.walletMain}>
                    <View style={styles.walletInfo}>
                      <Text style={[styles.walletName, isLocked && styles.textLocked]}>
                        {wallet.name || `${wallet.coin.toUpperCase()} Wallet`}
                      </Text>
                      <Text style={[styles.walletMeta, isLocked && styles.textLocked]}>
                        {wallet.coin.toUpperCase()} • {POOLS[wallet.pool]?.name || wallet.pool}
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
                                ? onlineWorkers > 0
                                  ? colors.online
                                  : colors.offline
                                : colors.textLight,
                            },
                          ]}
                        />
                        <Text style={[styles.statText, isLocked && styles.textLocked]}>
                          {data ? `${onlineWorkers}/${totalWorkers}` : '--'}
                        </Text>
                      </View>
                      <Text style={[styles.hashrateText, isLocked && styles.textLocked]}>
                        {data ? formatHashrate(data.hashrate) : '--'}
                      </Text>
                      {data?.error && (
                        <Text style={styles.errorBadge} numberOfLines={1}>
                          {data.error.length > 20 ? data.error.slice(0, 20) + '...' : data.error}
                        </Text>
                      )}
                    </View>
                  </View>

                  {!wallet.enabled && (
                    <View style={styles.disabledBadge}>
                      <Text style={styles.disabledText}>Disabled</Text>
                    </View>
                  )}

                  {/* Action buttons when selected */}
                  {isSelected && !isLocked && (
                    <View style={styles.actionBar}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.actionEdit]}
                        onPress={() => openEditModal(wallet)}
                      >
                        <Text style={styles.actionButtonText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.actionToggle]}
                        onPress={() => toggleWalletEnabled(wallet)}
                      >
                        <Text style={styles.actionButtonText}>
                          {wallet.enabled ? 'Disable' : 'Enable'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.actionDelete]}
                        onPress={() => handleDeleteWallet(wallet)}
                      >
                        <Text style={styles.actionButtonText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </Pressable>
              </View>
            );
          })
        )}

        {/* Upgrade prompt for free users */}
        {!isPro() && wallets.length > 1 && (
          <View style={styles.upgradeCard}>
            <Text style={styles.upgradeTitle}>Unlock All Wallets</Text>
            <Text style={styles.upgradeText}>
              Free users can only view one wallet. Upgrade to Pro to monitor unlimited wallets.
            </Text>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => Linking.openURL(`${WEBSITE_URL}/#pricing`)}
            >
              <Text style={styles.upgradeButtonText}>Upgrade to Pro - $59/year</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Wallet Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingWallet ? 'Edit Wallet' : 'Add Wallet'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Pool Picker */}
              <Text style={styles.inputLabel}>Mining Pool</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formPool}
                  onValueChange={handlePoolChange}
                  style={styles.picker}
                  dropdownIconColor={colors.text}
                  itemStyle={styles.pickerItem}
                  mode="dropdown"
                >
                  {Object.entries(POOLS).map(([id, config]) => (
                    <Picker.Item
                      key={id}
                      label={config.name}
                      value={id}
                      color={Platform.OS === 'ios' ? colors.text : undefined}
                      style={Platform.OS === 'android' ? { color: colors.text } : undefined}
                    />
                  ))}
                </Picker>
              </View>

              {/* Coin Picker */}
              <Text style={styles.inputLabel}>Coin</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formCoin}
                  onValueChange={setFormCoin}
                  style={styles.picker}
                  dropdownIconColor={colors.text}
                  itemStyle={styles.pickerItem}
                  mode="dropdown"
                >
                  {availableCoins.map((coin) => (
                    <Picker.Item
                      key={coin}
                      label={coin.toUpperCase()}
                      value={coin}
                      color={Platform.OS === 'ios' ? colors.text : undefined}
                      style={Platform.OS === 'android' ? { color: colors.text } : undefined}
                    />
                  ))}
                </Picker>
              </View>

              {/* Wallet Address */}
              <Text style={styles.inputLabel}>Wallet Address</Text>
              <TextInput
                style={styles.input}
                value={formAddress}
                onChangeText={setFormAddress}
                placeholder="Enter your wallet address"
                placeholderTextColor={colors.textLight}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {/* Wallet Name (optional) */}
              <Text style={styles.inputLabel}>Name (optional)</Text>
              <TextInput
                style={styles.input}
                value={formName}
                onChangeText={setFormName}
                placeholder="e.g., Main Rig, Office, etc."
                placeholderTextColor={colors.textLight}
              />

              {/* Power Consumption */}
              <Text style={styles.inputLabel}>Power Consumption (Watts)</Text>
              <TextInput
                style={styles.input}
                value={formPower}
                onChangeText={setFormPower}
                placeholder="200"
                placeholderTextColor={colors.textLight}
                keyboardType="numeric"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveWallet}
              >
                <Text style={styles.saveButtonText}>
                  {editingWallet ? 'Save Changes' : 'Add Wallet'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Dynamic styles factory
const createStyles = (colors: ReturnType<typeof getColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
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
  addButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
  },
  addButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#fff',
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
  walletCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
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
  errorBadge: {
    fontSize: fontSize.xs,
    color: colors.danger,
    marginTop: 2,
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
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  actionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  actionEdit: {
    backgroundColor: colors.primary,
  },
  actionToggle: {
    backgroundColor: colors.textMuted,
  },
  actionDelete: {
    backgroundColor: colors.danger,
  },
  actionButtonText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: '#fff',
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
    marginBottom: spacing.md,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  emptyButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#fff',
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  modalClose: {
    fontSize: fontSize.xl,
    color: colors.textMuted,
    padding: spacing.xs,
  },
  modalBody: {
    padding: spacing.md,
    maxHeight: 400,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  pickerContainer: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    minHeight: Platform.OS === 'ios' ? 150 : 50,
  },
  picker: {
    color: colors.text,
    backgroundColor: 'transparent',
    height: Platform.OS === 'ios' ? 150 : 50,
  },
  pickerItem: {
    color: colors.text,
    fontSize: fontSize.md,
    height: Platform.OS === 'ios' ? 150 : 50,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.textMuted,
  },
  saveButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#fff',
  },
});

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Animated,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { StockItemCard } from '../components/StockItemCard';
import { StatCard } from '../components/StatCard';
import { useStockStore } from '../store/useStockStore';
import { StockItem } from '../database/database';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../constants/theme';
import { MainTabParamList } from '../navigation/TabNavigator';

type Props = NativeStackScreenProps<MainTabParamList, 'Dashboard'>;

export const DashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const { items, settings, loadItems, deleteItem } = useStockStore();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const fabScale = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  };

  const filteredItems = search.trim()
    ? items.filter(
        i =>
          i.name.toLowerCase().includes(search.toLowerCase()) ||
          (i.category || '').toLowerCase().includes(search.toLowerCase())
      )
    : items;

  const totalValue = items.reduce(
    (acc, item) =>
      item.price !== null ? acc + item.quantity * item.price : acc,
    0
  );
  const lowStockCount = items.filter(i => i.quantity > 0 && i.quantity <= 5).length;
  const outOfStockCount = items.filter(i => i.quantity === 0).length;

  const handleFabPress = () => {
    Animated.sequence([
      Animated.spring(fabScale, { toValue: 0.9, useNativeDriver: true }),
      Animated.spring(fabScale, { toValue: 1, useNativeDriver: true }),
    ]).start();
    (navigation as any).navigate('AddItem', { item: undefined });
  };

  const handleDeduct = (item: StockItem) => {
    (navigation as any).navigate('DeductItem', { item });
  };

  const handleEdit = (item: StockItem) => {
    (navigation as any).navigate('AddItem', { item });
  };

  const ListHeader = () => (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.shopName}>{settings?.shop_name || 'StockFlow'}</Text>
          <Text style={styles.headerSub}>
            {items.length} {t('common.items')} in inventory
          </Text>
        </View>
        <View style={styles.headerLogo}>
          <Text style={styles.headerEmoji}>📦</Text>
        </View>
      </View>

      {/* Stat cards */}
      <View style={styles.statsRow}>
        <StatCard
          label={t('dashboard.totalItems')}
          value={items.length}
          color={Colors.primary}
          icon="📦"
        />
        <StatCard
          label={t('dashboard.lowStock')}
          value={lowStockCount}
          color={Colors.warning}
          icon="⚠️"
          style={{ marginHorizontal: Spacing.xs }}
        />
        <StatCard
          label="Out"
          value={outOfStockCount}
          color={Colors.danger}
          icon="🔴"
        />
      </View>

      {totalValue > 0 && (
        <View style={styles.valueCard}>
          <Text style={styles.valueLabel}>{t('dashboard.totalValue')}</Text>
          <Text style={styles.valueAmount}>
            Rs. {totalValue.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
          </Text>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('dashboard.searchPlaceholder')}
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          selectionColor={Colors.primary}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionLabel}>
        {search ? `${filteredItems.length} results` : t('dashboard.inventory')}
      </Text>
    </View>
  );

  const ListEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>🗃️</Text>
      <Text style={styles.emptyTitle}>
        {search ? t('dashboard.noSearchResults') : t('dashboard.noItems')}
      </Text>
      {!search && (
        <Text style={styles.emptySubtitle}>{t('dashboard.noItemsSubtitle')}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bgDark} />

      <FlatList
        data={filteredItems}
        keyExtractor={item => String(item.id)}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        renderItem={({ item }) => (
          <StockItemCard
            item={item}
            onPress={handleEdit}
            onDeduct={handleDeduct}
            onEdit={handleEdit}
            onDelete={async item => {
              await deleteItem(item.id);
            }}
          />
        )}
      />

      {/* FAB */}
      <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity
          style={styles.fabButton}
          onPress={handleFabPress}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={28} color={Colors.textOnAccent} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgDark },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  shopName: {
    fontSize: FontSize.xxl,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  headerLogo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '44',
  },
  headerEmoji: { fontSize: 24 },

  // Stats
  statsRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  valueCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    borderLeftColor: Colors.success,
  },
  valueLabel: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueAmount: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.success,
  },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 46,
  },
  searchIcon: { marginRight: Spacing.sm },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: FontSize.md,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
    fontWeight: '600',
  },

  // Empty
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  emptyEmoji: { fontSize: 56, marginBottom: Spacing.md },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  // FAB
  fab: {
    position: 'absolute',
    right: Spacing.xl,
    bottom: Spacing.xxxl,
    ...Shadow.lg,
  },
  fabButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

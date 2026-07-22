import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StockItem } from '../database/database';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../constants/theme';

interface StockItemCardProps {
  item: StockItem;
  onPress: (item: StockItem) => void;
  onDeduct: (item: StockItem) => void;
  onEdit: (item: StockItem) => void;
  onDelete: (item: StockItem) => void;
}

const LOW_STOCK_THRESHOLD = 5;

export const StockItemCard: React.FC<StockItemCardProps> = ({
  item,
  onPress,
  onDeduct,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();
  const isOutOfStock = item.quantity === 0;
  const isLowStock = item.quantity > 0 && item.quantity <= LOW_STOCK_THRESHOLD;

  const stockColor = isOutOfStock
    ? Colors.danger
    : isLowStock
    ? Colors.warning
    : Colors.success;

  const stockLabel = isOutOfStock
    ? t('dashboard.outOfStock')
    : isLowStock
    ? t('dashboard.lowStockAlert')
    : `${item.quantity} ${item.unit || 'pcs'}`;

  const handleDelete = () => {
    Alert.alert(
      t('common.delete'),
      `Delete "${item.name}"?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => onDelete(item) },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item)}
      activeOpacity={0.85}
    >
      {/* Left: Category indicator */}
      <View style={[styles.categoryBar, { backgroundColor: stockColor }]} />

      {/* Middle: Item info */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <View style={[styles.stockBadge, { backgroundColor: stockColor + '22' }]}>
            <Text style={[styles.stockText, { color: stockColor }]}>{stockLabel}</Text>
          </View>
        </View>
        <View style={styles.bottomRow}>
          <Text style={styles.category}>{item.category || 'General'}</Text>
          {item.price !== null && item.price !== undefined ? (
            <Text style={styles.price}>
              Rs. {(item.quantity * item.price).toLocaleString('en-PK', { minimumFractionDigits: 0 })}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Right: Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.deductBtn]}
          onPress={() => onDeduct(item)}
          disabled={isOutOfStock}
        >
          <Ionicons name="remove" size={16} color={isOutOfStock ? Colors.textMuted : Colors.white} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(item)}>
          <Ionicons name="create-outline" size={16} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={16} color={Colors.danger} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  categoryBar: {
    width: 4,
  },
  content: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  name: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  stockBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  stockText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  category: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  price: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bgCardLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deductBtn: {
    backgroundColor: Colors.primaryDark,
  },
});

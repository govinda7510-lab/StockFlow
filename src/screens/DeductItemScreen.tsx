import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useStockStore } from '../store/useStockStore';
import { StockItem } from '../database/database';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../constants/theme';
import { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'DeductItem'>;

export const DeductItemScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { deductItem } = useStockStore();
  const item = route.params.item as StockItem;

  const [amount, setAmount] = useState('1');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const parsedAmount = parseFloat(amount) || 0;
  const remaining = Math.max(0, item.quantity - parsedAmount);
  const willBeEmpty = remaining === 0 && parsedAmount > 0;
  const exceedsStock = parsedAmount > item.quantity;

  const validate = (): boolean => {
    if (!amount.trim() || amount.trim() === '0') {
      setError(t('deduct.amountRequired'));
      return false;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError(t('deduct.amountInvalid'));
      return false;
    }
    if (parsedAmount > item.quantity) {
      setError(t('deduct.exceedsStock'));
      return false;
    }
    setError('');
    return true;
  };

  const handleDeduct = async () => {
    if (!validate()) return;

    if (willBeEmpty) {
      Alert.alert(
        t('common.warning'),
        t('deduct.outOfStockWarning'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('deduct.confirmDeduct'), style: 'destructive', onPress: doDeduct },
        ]
      );
      return;
    }

    await doDeduct();
  };

  const doDeduct = async () => {
    setLoading(true);
    try {
      const result = await deductItem(item.id, parsedAmount, note);
      if (result.success) {
        Alert.alert(t('common.success'), t('deduct.deducted'), [
          { text: t('common.ok'), onPress: () => navigation.goBack() },
        ]);
      }
    } catch (e) {
      Alert.alert(t('common.error'), String(e));
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [1, 5, 10, 25].filter(n => n <= item.quantity);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bgDark} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('deduct.title')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Item info */}
          <View style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <View>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemCategory}>{item.category || 'General'}</Text>
              </View>
              <View style={styles.stockPill}>
                <Text style={styles.stockPillText}>{t('deduct.currentStock')}</Text>
                <Text style={styles.stockQty}>
                  {item.quantity} {item.unit || 'pcs'}
                </Text>
              </View>
            </View>
          </View>

          {/* Quick amounts */}
          {quickAmounts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Quick Select</Text>
              <View style={styles.quickRow}>
                {quickAmounts.map(n => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.quickBtn, amount === String(n) && styles.quickBtnActive]}
                    onPress={() => {
                      setAmount(String(n));
                      setError('');
                    }}
                  >
                    <Text style={[styles.quickBtnText, amount === String(n) && styles.quickBtnTextActive]}>
                      −{n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Amount input */}
          <View style={styles.formCard}>
            <Input
              label={t('deduct.deductAmount')}
              placeholder={t('deduct.deductAmountPlaceholder')}
              value={amount}
              onChangeText={v => {
                setAmount(v);
                setError('');
              }}
              error={error}
              keyboardType="numeric"
              returnKeyType="next"
              required
            />

            <Input
              label={t('deduct.note')}
              placeholder={t('deduct.notePlaceholder')}
              value={note}
              onChangeText={setNote}
              returnKeyType="done"
            />
          </View>

          {/* Preview */}
          {parsedAmount > 0 && !exceedsStock && (
            <View style={[styles.previewCard, willBeEmpty && styles.previewWarning]}>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Current</Text>
                <Text style={styles.previewValue}>{item.quantity} {item.unit}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Deducting</Text>
                <Text style={[styles.previewValue, { color: Colors.danger }]}>
                  −{parsedAmount} {item.unit}
                </Text>
              </View>
              <View style={[styles.previewRow, styles.previewTotal]}>
                <Text style={styles.previewLabelBold}>{t('deduct.remainingStock')}</Text>
                <Text style={[styles.previewValueBold, { color: willBeEmpty ? Colors.danger : Colors.success }]}>
                  {remaining} {item.unit}
                </Text>
              </View>
              {willBeEmpty && (
                <Text style={styles.warningText}>⚠️ {t('deduct.outOfStockWarning')}</Text>
              )}
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title={t('deduct.confirmDeduct')}
              onPress={handleDeduct}
              loading={loading}
              fullWidth
              size="lg"
              variant={willBeEmpty ? 'danger' : 'primary'}
              icon={<Ionicons name="remove-circle" size={20} color={Colors.white} />}
            />
            <Button
              title={t('common.cancel')}
              onPress={() => navigation.goBack()}
              variant="ghost"
              fullWidth
              size="lg"
              style={{ marginTop: Spacing.sm }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgDark },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 56 : Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  scroll: { padding: Spacing.lg, paddingBottom: 40 },

  // Item card
  itemCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  itemCategory: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  stockPill: { alignItems: 'flex-end' },
  stockPillText: { fontSize: FontSize.xs, color: Colors.textMuted, textTransform: 'uppercase' },
  stockQty: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.primary },

  // Quick amounts
  section: { marginBottom: Spacing.lg },
  sectionLabel: { fontSize: FontSize.xs, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm },
  quickRow: { flexDirection: 'row', gap: Spacing.sm },
  quickBtn: {
    flex: 1,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickBtnActive: { backgroundColor: Colors.primary + '22', borderColor: Colors.primary },
  quickBtnText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textSecondary },
  quickBtnTextActive: { color: Colors.primary },

  // Form
  formCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    ...Shadow.sm,
  },

  // Preview
  previewCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.success + '44',
    marginBottom: Spacing.lg,
  },
  previewWarning: { borderColor: Colors.danger + '44' },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  previewTotal: { borderTopWidth: 1, borderColor: Colors.border, paddingTop: Spacing.sm, marginTop: Spacing.xs },
  previewLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  previewValue: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary },
  previewLabelBold: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  previewValueBold: { fontSize: FontSize.lg, fontWeight: '800' },
  warningText: { fontSize: FontSize.sm, color: Colors.warning, marginTop: Spacing.sm },

  // Actions
  actions: { marginBottom: Spacing.xxxl },
});

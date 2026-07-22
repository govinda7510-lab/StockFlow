import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { PickerSelect } from '../components/PickerSelect';
import { useStockStore } from '../store/useStockStore';
import { StockItem } from '../database/database';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../constants/theme';
import { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'AddItem'>;

const CATEGORIES = [
  { label: 'General', value: 'General' },
  { label: 'Food & Grocery', value: 'food' },
  { label: 'Electronics', value: 'electronics' },
  { label: 'Clothing', value: 'clothing' },
  { label: 'Hardware', value: 'hardware' },
  { label: 'Medicine', value: 'medicine' },
  { label: 'Stationery', value: 'stationery' },
  { label: 'Other', value: 'other' },
];

const UNITS = [
  { label: 'Pieces (pcs)', value: 'pcs' },
  { label: 'Kilograms (kg)', value: 'kg' },
  { label: 'Grams (g)', value: 'g' },
  { label: 'Litres (ltr)', value: 'ltr' },
  { label: 'Millilitres (ml)', value: 'ml' },
  { label: 'Metres (m)', value: 'm' },
  { label: 'Box', value: 'box' },
  { label: 'Pack', value: 'pack' },
  { label: 'Dozen', value: 'dozen' },
];

export const AddItemScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { addItem, updateItem } = useStockStore();
  const editingItem = route.params?.item as StockItem | undefined;
  const isEditing = !!editingItem;

  const [name, setName] = useState(editingItem?.name || '');
  const [quantity, setQuantity] = useState(editingItem ? String(editingItem.quantity) : '');
  const [price, setPrice] = useState(editingItem?.price != null ? String(editingItem.price) : '');
  const [unit, setUnit] = useState(editingItem?.unit || 'pcs');
  const [category, setCategory] = useState(editingItem?.category || 'General');
  const [notes, setNotes] = useState(editingItem?.notes || '');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = t('addItem.nameRequired');
    if (!quantity.trim()) {
      newErrors.quantity = t('addItem.quantityRequired');
    } else if (isNaN(Number(quantity)) || Number(quantity) < 0) {
      newErrors.quantity = t('addItem.quantityInvalid');
    }
    if (price.trim() && (isNaN(Number(price)) || Number(price) < 0)) {
      newErrors.price = t('addItem.priceInvalid');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const parsedPrice = price.trim() ? Number(price) : null;
      const parsedQty = Number(quantity);

      if (isEditing && editingItem) {
        await updateItem(editingItem.id, name.trim(), parsedQty, parsedPrice, unit, category, notes || null);
        Alert.alert(t('common.success'), t('addItem.itemUpdated'));
      } else {
        await addItem(name.trim(), parsedQty, parsedPrice, unit, category, notes || null);
        Alert.alert(t('common.success'), t('addItem.itemSaved'));
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert(t('common.error'), String(e));
    } finally {
      setLoading(false);
    }
  };

  const clearError = (field: string) => {
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }));
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bgDark} />

      {/* Custom header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? t('addItem.editTitle') : t('addItem.title')}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formCard}>
            <Input
              label={t('addItem.itemName')}
              placeholder={t('addItem.itemNamePlaceholder')}
              value={name}
              onChangeText={v => { setName(v); clearError('name'); }}
              error={errors.name}
              required
              autoCapitalize="words"
              returnKeyType="next"
            />

            <View style={styles.row}>
              <View style={styles.flex}>
                <Input
                  label={t('addItem.quantity')}
                  placeholder={t('addItem.quantityPlaceholder')}
                  value={quantity}
                  onChangeText={v => { setQuantity(v); clearError('quantity'); }}
                  error={errors.quantity}
                  required
                  keyboardType="numeric"
                  returnKeyType="next"
                />
              </View>
              <View style={[styles.flex, { marginLeft: Spacing.md }]}>
                <PickerSelect
                  label={t('addItem.unit')}
                  value={unit}
                  options={UNITS}
                  onValueChange={setUnit}
                />
              </View>
            </View>

            <Input
              label={t('addItem.price')}
              placeholder={t('addItem.pricePlaceholder')}
              value={price}
              onChangeText={v => { setPrice(v); clearError('price'); }}
              error={errors.price}
              keyboardType="numeric"
              returnKeyType="next"
              hint="Leave empty if not tracking price"
            />

            <PickerSelect
              label={t('addItem.category')}
              value={category}
              options={CATEGORIES}
              onValueChange={setCategory}
            />

            <Input
              label={t('addItem.notes')}
              placeholder={t('addItem.notesPlaceholder')}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              returnKeyType="done"
            />
          </View>

          <View style={styles.actions}>
            <Button
              title={isEditing ? t('addItem.updateItem') : t('addItem.saveItem')}
              onPress={handleSave}
              loading={loading}
              fullWidth
              size="lg"
              icon={<Ionicons name={isEditing ? 'checkmark' : 'add'} size={20} color={Colors.textOnAccent} />}
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
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    ...Shadow.sm,
  },
  row: {
    flexDirection: 'row',
  },
  actions: {
    marginBottom: Spacing.xxxl,
  },
});

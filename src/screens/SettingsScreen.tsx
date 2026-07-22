import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Switch,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useStockStore } from '../store/useStockStore';
import { SUPPORTED_LANGUAGES } from '../localization/i18n';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../constants/theme';

export const SettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { settings, saveSettings, setLanguage, clearAllData } = useStockStore();

  const [shopName, setShopName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setShopName(settings.shop_name || '');
      setContactNumber(settings.contact_number || '');
    }
  }, [settings]);

  const handleSave = async () => {
    if (!shopName.trim()) {
      Alert.alert(t('common.error'), t('onboarding.shopNameRequired'));
      return;
    }
    setSaving(true);
    try {
      await saveSettings(shopName.trim(), contactNumber.trim());
      Alert.alert(t('common.success'), t('settings.settingsSaved'));
    } catch (e) {
      Alert.alert(t('common.error'), String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleLanguageChange = async (lang: string) => {
    try {
      await setLanguage(lang);
    } catch (e) {
      Alert.alert(t('common.error'), String(e));
    }
  };

  const handleClearData = () => {
    Alert.alert(
      t('settings.clearData'),
      t('settings.clearDataConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.clearData'),
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            Alert.alert(t('common.success'), t('settings.clearDataSuccess'));
          },
        },
      ]
    );
  };

  const currentLang = settings?.language || 'en';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bgDark} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        </View>

        {/* Shop Information */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            <Text>🏪  </Text>{t('settings.shopInfo')}
          </Text>
          <View style={styles.card}>
            <Input
              label={t('settings.shopName')}
              value={shopName}
              onChangeText={setShopName}
              placeholder="Al-Noor Traders"
              returnKeyType="next"
              leftIcon={<Ionicons name="storefront-outline" size={18} color={Colors.textMuted} />}
            />
            <Input
              label={t('settings.contactNumber')}
              value={contactNumber}
              onChangeText={setContactNumber}
              placeholder="0300-1234567"
              keyboardType="phone-pad"
              returnKeyType="done"
              leftIcon={<Ionicons name="call-outline" size={18} color={Colors.textMuted} />}
              containerStyle={{ marginBottom: 0 }}
            />
          </View>
          <Button
            title={t('common.save')}
            onPress={handleSave}
            loading={saving}
            style={{ marginTop: Spacing.md }}
            icon={<Ionicons name="checkmark" size={18} color={Colors.textOnAccent} />}
          />
        </View>

        {/* Language */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            <Text>🌍  </Text>{t('settings.language')}
          </Text>
          <View style={styles.card}>
            {SUPPORTED_LANGUAGES.map(lang => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.langRow,
                  currentLang === lang.code && styles.langRowActive,
                ]}
                onPress={() => handleLanguageChange(lang.code)}
              >
                <View>
                  <Text style={styles.langLabel}>{lang.nativeLabel}</Text>
                  <Text style={styles.langSublabel}>{lang.label}</Text>
                </View>
                <View style={styles.langRight}>
                  {lang.rtl && (
                    <View style={styles.rtlBadge}>
                      <Text style={styles.rtlBadgeText}>RTL</Text>
                    </View>
                  )}
                  {currentLang === lang.code && (
                    <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            <Text>ℹ️  </Text>About
          </Text>
          <View style={styles.card}>
            <View style={styles.aboutRow}>
              <View style={styles.aboutLogo}>
                <Text style={styles.aboutEmoji}>📦</Text>
              </View>
              <View style={styles.aboutContent}>
                <Text style={styles.aboutName}>StockFlow</Text>
                <Text style={styles.aboutVersion}>{t('settings.appVersion')}: 1.0.0</Text>
              </View>
            </View>
            <Text style={styles.aboutText}>{t('settings.aboutText')}</Text>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: Colors.danger }]}>
            <Text>⚠️  </Text>{t('settings.dangerZone')}
          </Text>
          <View style={[styles.card, styles.dangerCard]}>
            <View style={styles.dangerRow}>
              <View style={styles.flex}>
                <Text style={styles.dangerTitle}>{t('settings.clearData')}</Text>
                <Text style={styles.dangerDesc}>{t('settings.clearDataDesc')}</Text>
              </View>
              <Button
                title={t('settings.clearData')}
                onPress={handleClearData}
                variant="danger"
                size="sm"
              />
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgDark },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 40 },
  flex: { flex: 1 },

  header: { paddingTop: Spacing.xl, paddingBottom: Spacing.lg },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -0.5 },

  section: { marginBottom: Spacing.xl },
  sectionLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },

  // Language
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  langRowActive: { borderLeftWidth: 3, borderLeftColor: Colors.primary, paddingLeft: Spacing.sm },
  langLabel: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  langSublabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  langRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rtlBadge: {
    backgroundColor: Colors.info + '22',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  rtlBadgeText: { fontSize: FontSize.xs, color: Colors.info, fontWeight: '700' },

  // About
  aboutRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  aboutLogo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.bgCardLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  aboutEmoji: { fontSize: 26 },
  aboutContent: { flex: 1 },
  aboutName: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary },
  aboutVersion: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  aboutText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },

  // Danger
  dangerCard: { borderColor: Colors.danger + '33' },
  dangerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dangerTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.danger },
  dangerDesc: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
});

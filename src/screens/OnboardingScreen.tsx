import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useStockStore } from '../store/useStockStore';
import { Colors, Spacing, Radius, FontSize } from '../constants/theme';
import { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const { width, height } = Dimensions.get('window');

export const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const { saveSettings, completeOnboarding } = useStockStore();
  const [shopName, setShopName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [errors, setErrors] = useState<{ shopName?: string; contact?: string }>({});
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!shopName.trim()) newErrors.shopName = t('onboarding.shopNameRequired');
    if (!contactNumber.trim()) newErrors.contact = t('onboarding.contactRequired');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGetStarted = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await saveSettings(shopName.trim(), contactNumber.trim());
      await completeOnboarding();
      navigation.replace('MainTabs');
    } catch (e) {
      console.error('Onboarding error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bgDark} />

      {/* Gradient background */}
      <View style={styles.bgTop}>
        <View style={styles.orb1} />
        <View style={styles.orb2} />
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
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>

            {/* Logo section */}
            <View style={styles.heroSection}>
              <View style={styles.logoContainer}>
                <Text style={styles.logoEmoji}>📦</Text>
              </View>
              <Text style={styles.appName}>StockFlow</Text>
              <Text style={styles.tagline}>{t('onboarding.welcome')}</Text>
              <Text style={styles.subtitle}>{t('onboarding.subtitle')}</Text>
            </View>

            {/* Features */}
            <View style={styles.features}>
              {[
                { icon: '⚡', text: 'Lightning-fast stock entry' },
                { icon: '📊', text: 'PDF reports instantly' },
                { icon: '🔄', text: 'Backup to Google Drive' },
              ].map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <Text style={styles.featureIcon}>{f.icon}</Text>
                  <Text style={styles.featureText}>{f.text}</Text>
                </View>
              ))}
            </View>

            {/* Form card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Set Up Your Shop</Text>
              <Text style={styles.cardSubtitle}>
                This info appears on all your reports
              </Text>

              <Input
                label={t('onboarding.shopName')}
                placeholder={t('onboarding.shopNamePlaceholder')}
                value={shopName}
                onChangeText={text => {
                  setShopName(text);
                  if (errors.shopName) setErrors(e => ({ ...e, shopName: undefined }));
                }}
                error={errors.shopName}
                required
                autoCapitalize="words"
                returnKeyType="next"
                leftIcon={<Ionicons name="storefront-outline" size={18} color={Colors.textMuted} />}
              />

              <Input
                label={t('onboarding.contactNumber')}
                placeholder={t('onboarding.contactPlaceholder')}
                value={contactNumber}
                onChangeText={text => {
                  setContactNumber(text);
                  if (errors.contact) setErrors(e => ({ ...e, contact: undefined }));
                }}
                error={errors.contact}
                required
                keyboardType="phone-pad"
                returnKeyType="done"
                onSubmitEditing={handleGetStarted}
                leftIcon={<Ionicons name="call-outline" size={18} color={Colors.textMuted} />}
              />

              <Button
                title={t('onboarding.getStarted')}
                onPress={handleGetStarted}
                loading={loading}
                fullWidth
                size="lg"
                icon={<Ionicons name="arrow-forward" size={20} color={Colors.textOnAccent} />}
              />
            </View>

            <Text style={styles.privacyNote}>
              🔒 Your data stays on your device. No account required.
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgDark },
  flex: { flex: 1 },
  bgTop: { ...StyleSheet.absoluteFillObject },
  orb1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors.primary + '18',
  },
  orb2: {
    position: 'absolute',
    bottom: 100,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.info + '12',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.huge,
    paddingBottom: Spacing.xxxl,
  },
  content: { flex: 1 },
  heroSection: { alignItems: 'center', marginBottom: Spacing.xxl },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '44',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  logoEmoji: { fontSize: 40 },
  appName: {
    fontSize: FontSize.xxxl,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: -0.5,
    marginBottom: Spacing.xs,
  },
  tagline: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  features: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  featureIcon: { fontSize: 18, marginRight: Spacing.md },
  featureText: { fontSize: FontSize.md, color: Colors.textSecondary },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  cardSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.xl,
  },
  privacyNote: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});

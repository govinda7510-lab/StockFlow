import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { useStockStore } from '../store/useStockStore';
import { generatePDF } from '../services/pdfService';
import { exportJSON, exportCSV } from '../services/exportService';
import { signInWithGoogle, uploadToDrive } from '../services/googleDriveService';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../constants/theme';

interface ActionCardProps {
  title: string;
  description: string;
  icon: string;
  color: string;
  onPress: () => void;
  loading?: boolean;
}

const ActionCard: React.FC<ActionCardProps> = ({
  title,
  description,
  icon,
  color,
  onPress,
  loading = false,
}) => (
  <TouchableOpacity
    style={[styles.actionCard, { borderLeftColor: color }]}
    onPress={onPress}
    disabled={loading}
    activeOpacity={0.8}
  >
    <View style={[styles.actionIcon, { backgroundColor: color + '22' }]}>
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Text style={styles.actionEmoji}>{icon}</Text>
      )}
    </View>
    <View style={styles.actionContent}>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionDesc}>{description}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
  </TouchableOpacity>
);

export const ExportScreen: React.FC = () => {
  const { t } = useTranslation();
  const { items, settings } = useStockStore();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [jsonLoading, setJsonLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [driveLoading, setDriveLoading] = useState(false);

  const handleExportPDF = async () => {
    if (items.length === 0) {
      Alert.alert(t('common.warning'), 'No items to export.');
      return;
    }
    setPdfLoading(true);
    try {
      await generatePDF(items, settings);
      Alert.alert(t('common.success'), t('export.pdfSuccess'));
    } catch (e) {
      Alert.alert(t('common.error'), String(e));
    } finally {
      setPdfLoading(false);
    }
  };

  const handleExportJSON = async () => {
    setJsonLoading(true);
    try {
      await exportJSON(items, settings);
      Alert.alert(t('common.success'), t('export.exportSuccess'));
    } catch (e) {
      Alert.alert(t('common.error'), String(e));
    } finally {
      setJsonLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setCsvLoading(true);
    try {
      await exportCSV(items, settings);
      Alert.alert(t('common.success'), t('export.exportSuccess'));
    } catch (e) {
      Alert.alert(t('common.error'), String(e));
    } finally {
      setCsvLoading(false);
    }
  };

  const handleDriveBackup = async () => {
    setDriveLoading(true);
    try {
      const tokens = await signInWithGoogle();
      if (!tokens) {
        Alert.alert(t('common.error'), t('export.driveError'));
        return;
      }
      await uploadToDrive(items, settings, tokens);
      Alert.alert(t('common.success'), t('export.driveSuccess'));
    } catch (e) {
      Alert.alert(t('common.error'), `${t('export.driveError')}: ${e}`);
    } finally {
      setDriveLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bgDark} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('export.title')}</Text>
          <Text style={styles.headerSub}>
            {items.length} {t('common.items')} ready to export
          </Text>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryEmoji}>🏪</Text>
            <View>
              <Text style={styles.summaryShop}>{settings?.shop_name || 'Your Shop'}</Text>
              <Text style={styles.summaryContact}>{settings?.contact_number || 'No contact'}</Text>
            </View>
          </View>
        </View>

        {/* PDF Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>📄 Reports</Text>
          <ActionCard
            title={t('export.exportPDF')}
            description={t('export.exportPDFDesc')}
            icon="📄"
            color={Colors.danger}
            onPress={handleExportPDF}
            loading={pdfLoading}
          />
        </View>

        {/* Data Export */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>💾 Data Export</Text>
          <ActionCard
            title={t('export.exportJSON')}
            description={t('export.exportJSONDesc')}
            icon="📋"
            color={Colors.primary}
            onPress={handleExportJSON}
            loading={jsonLoading}
          />
          <ActionCard
            title={t('export.exportCSV')}
            description={t('export.exportCSVDesc')}
            icon="📊"
            color={Colors.success}
            onPress={handleExportCSV}
            loading={csvLoading}
          />
        </View>

        {/* Cloud */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>☁️ Cloud Backup</Text>
          <ActionCard
            title={t('export.backupDrive')}
            description={t('export.backupDriveDesc')}
            icon="🔄"
            color={Colors.info}
            onPress={handleDriveBackup}
            loading={driveLoading}
          />
          <View style={styles.driveNote}>
            <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.driveNoteText}>
              Requires a Google account. Saves to a "StockFlow Backups" folder in your Drive.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgDark },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 40 },

  header: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  headerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 4,
  },

  summaryCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryEmoji: { fontSize: 28, marginRight: Spacing.md },
  summaryShop: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  summaryContact: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },

  section: { marginBottom: Spacing.xl },
  sectionLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },

  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    ...Shadow.sm,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  actionEmoji: { fontSize: 22 },
  actionContent: { flex: 1 },
  actionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  actionDesc: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },

  driveNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  driveNoteText: { flex: 1, fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 18 },
});

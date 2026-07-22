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
import { useStockStore } from '../store/useStockStore';
import { pickAndParseFile, ParsedBackup } from '../services/importService';
import { signInWithGoogle, listDriveBackups, downloadFromDrive, DriveFile } from '../services/googleDriveService';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../constants/theme';

type ImportMode = 'replace' | 'merge';

export const ImportScreen: React.FC = () => {
  const { t } = useTranslation();
  const { restoreItems } = useStockStore();
  const [deviceLoading, setDeviceLoading] = useState(false);
  const [driveLoading, setDriveLoading] = useState(false);
  const [previewData, setPreviewData] = useState<ParsedBackup | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('replace');
  const [confirming, setConfirming] = useState(false);

  // ─── Import from device ────────────────────────────────────────────────────

  const handleImportDevice = async () => {
    setDeviceLoading(true);
    try {
      const result = await pickAndParseFile();

      if (!result.success || !result.data) {
        let msg = 'Could not read the file.';
        switch (result.error) {
          case 'NO_FILE': return; // User cancelled
          case 'INVALID_FORMAT': msg = t('import.parseError'); break;
          case 'INVALID_SCHEMA': msg = result.errorMessage || t('import.invalidFileMessage'); break;
          case 'EMPTY_FILE': msg = 'The file is empty.'; break;
          case 'READ_ERROR': msg = 'Could not read file. Check permissions.'; break;
        }
        Alert.alert(t('import.invalidFile'), msg);
        return;
      }

      setPreviewData(result.data);
    } catch (e) {
      Alert.alert(t('common.error'), String(e));
    } finally {
      setDeviceLoading(false);
    }
  };

  // ─── Import from Google Drive ─────────────────────────────────────────────

  const handleImportDrive = async () => {
    setDriveLoading(true);
    try {
      const tokens = await signInWithGoogle();
      if (!tokens) {
        Alert.alert(t('common.error'), 'Google Sign-In failed.');
        return;
      }

      const files = await listDriveBackups(tokens.accessToken);

      if (files.length === 0) {
        Alert.alert('No Backups Found', 'No StockFlow backups found in your Google Drive.');
        return;
      }

      // Show file picker
      Alert.alert(
        'Choose Backup',
        'Select a backup file to restore:',
        [
          ...files.slice(0, 5).map(file => ({
            text: file.name,
            onPress: async () => {
              try {
                const data = await downloadFromDrive(file.id, tokens.accessToken);
                if (data) setPreviewData(data);
              } catch (e) {
                Alert.alert(t('common.error'), String(e));
              }
            },
          })),
          { text: t('common.cancel'), style: 'cancel' },
        ]
      );
    } catch (e) {
      Alert.alert(t('common.error'), String(e));
    } finally {
      setDriveLoading(false);
    }
  };

  // ─── Confirm & restore ────────────────────────────────────────────────────

  const handleConfirmRestore = async () => {
    if (!previewData) return;

    Alert.alert(
      t('import.confirmRestore'),
      t('import.confirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('import.confirmRestore'),
          style: 'destructive',
          onPress: doRestore,
        },
      ]
    );
  };

  const doRestore = async () => {
    if (!previewData) return;
    setConfirming(true);
    try {
      await restoreItems(previewData.items, importMode === 'replace');
      Alert.alert(t('common.success'), t('import.restoreSuccess'), [
        { text: t('common.ok'), onPress: () => setPreviewData(null) },
      ]);
    } catch (e) {
      Alert.alert(t('common.error'), t('import.restoreError'));
    } finally {
      setConfirming(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bgDark} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('import.title')}</Text>
          <Text style={styles.headerSub}>Restore from a backup file</Text>
        </View>

        {/* Warning */}
        <View style={styles.warningCard}>
          <Ionicons name="warning-outline" size={18} color={Colors.warning} />
          <Text style={styles.warningText}>{t('import.restoreWarning')}</Text>
        </View>

        {/* Import sources */}
        {!previewData && (
          <View>
            <Text style={styles.sectionLabel}>📂 Choose Source</Text>

            <TouchableOpacity
              style={styles.sourceCard}
              onPress={handleImportDevice}
              disabled={deviceLoading}
              activeOpacity={0.8}
            >
              <View style={[styles.sourceIcon, { backgroundColor: Colors.primary + '22' }]}>
                {deviceLoading ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Text style={styles.sourceEmoji}>📱</Text>
                )}
              </View>
              <View style={styles.sourceContent}>
                <Text style={styles.sourceTitle}>{t('import.importDevice')}</Text>
                <Text style={styles.sourceDesc}>{t('import.importDeviceDesc')}</Text>
                <Text style={styles.sourceFormats}>Supports: .json, .csv</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sourceCard}
              onPress={handleImportDrive}
              disabled={driveLoading}
              activeOpacity={0.8}
            >
              <View style={[styles.sourceIcon, { backgroundColor: Colors.info + '22' }]}>
                {driveLoading ? (
                  <ActivityIndicator size="small" color={Colors.info} />
                ) : (
                  <Text style={styles.sourceEmoji}>☁️</Text>
                )}
              </View>
              <View style={styles.sourceContent}>
                <Text style={styles.sourceTitle}>{t('import.importDrive')}</Text>
                <Text style={styles.sourceDesc}>{t('import.importDriveDesc')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Preview panel */}
        {previewData && (
          <View style={styles.previewPanel}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>✅ Backup Ready</Text>
              <TouchableOpacity onPress={() => setPreviewData(null)}>
                <Ionicons name="close-circle" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.previewStat}>
              <Text style={styles.previewStatValue}>{previewData.items.length}</Text>
              <Text style={styles.previewStatLabel}>{t('import.itemsFound')}</Text>
            </View>

            {previewData.settings?.shop_name && (
              <Text style={styles.previewShop}>
                🏪 {previewData.settings.shop_name}
              </Text>
            )}

            {/* Mode selector */}
            <Text style={styles.modeLabel}>Import Mode</Text>
            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeBtn, importMode === 'replace' && styles.modeBtnActive]}
                onPress={() => setImportMode('replace')}
              >
                <Text style={[styles.modeBtnText, importMode === 'replace' && styles.modeBtnTextActive]}>
                  Replace All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, importMode === 'merge' && styles.modeBtnActive]}
                onPress={() => setImportMode('merge')}
              >
                <Text style={[styles.modeBtnText, importMode === 'merge' && styles.modeBtnTextActive]}>
                  Merge
                </Text>
              </TouchableOpacity>
            </View>

            {importMode === 'replace' && (
              <Text style={styles.modeNote}>⚠️ All current items will be deleted before importing.</Text>
            )}
            {importMode === 'merge' && (
              <Text style={styles.modeNote}>ℹ️ Imported items will be added to existing inventory.</Text>
            )}

            <TouchableOpacity
              style={styles.restoreBtn}
              onPress={handleConfirmRestore}
              disabled={confirming}
              activeOpacity={0.85}
            >
              {confirming ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="cloud-download" size={20} color={Colors.white} />
                  <Text style={styles.restoreBtnText}>Restore Now</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgDark },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 40 },
  header: { paddingTop: Spacing.xl, paddingBottom: Spacing.lg },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -0.5 },
  headerSub: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 4 },

  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '18',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.warning + '44',
    gap: Spacing.sm,
  },
  warningText: { flex: 1, fontSize: FontSize.sm, color: Colors.warning },

  sectionLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },

  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  sourceIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  sourceEmoji: { fontSize: 22 },
  sourceContent: { flex: 1 },
  sourceTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  sourceDesc: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  sourceFormats: { fontSize: FontSize.xs, color: Colors.primary, marginTop: 4, fontWeight: '600' },

  previewPanel: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.success + '44',
    ...Shadow.md,
  },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  previewTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.success },
  previewStat: { alignItems: 'center', paddingVertical: Spacing.lg },
  previewStatValue: { fontSize: 48, fontWeight: '900', color: Colors.primary },
  previewStatLabel: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: Spacing.xs },
  previewShop: { textAlign: 'center', fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.lg },
  modeLabel: { fontSize: FontSize.xs, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm },
  modeRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  modeBtn: {
    flex: 1,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgCardLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modeBtnActive: { backgroundColor: Colors.primary + '22', borderColor: Colors.primary },
  modeBtnText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  modeBtnTextActive: { color: Colors.primary },
  modeNote: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: Spacing.lg },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success,
    borderRadius: Radius.md,
    height: 52,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  restoreBtnText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.white },
});

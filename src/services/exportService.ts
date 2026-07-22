import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';
import { StockItem, Settings } from '../database/database';
import { format } from 'date-fns';

export interface ExportData {
  version: string;
  exportedAt: string;
  settings: Partial<Settings>;
  items: Omit<StockItem, 'id' | 'created_at' | 'updated_at'>[];
}

const getFileName = (ext: 'json' | 'csv'): string => {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
  return `StockFlow_Backup_${timestamp}.${ext}`;
};

// ─── JSON Export ─────────────────────────────────────────────────────────────

export const exportJSON = async (
  items: StockItem[],
  settings: Settings | null
): Promise<void> => {
  const data: ExportData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    settings: {
      shop_name: settings?.shop_name || '',
      contact_number: settings?.contact_number || '',
    },
    items: items.map(({ id, created_at, updated_at, ...rest }) => rest),
  };

  const jsonString = JSON.stringify(data, null, 2);
  const fileName = getFileName('json');
  const uri = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(uri, jsonString, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: 'Share StockFlow Backup',
    });
  } else {
    // Fallback: try saving to media library on Android
    if (Platform.OS === 'android') {
      await saveToDownloads(uri, fileName);
    }
  }
};

// ─── CSV Export ──────────────────────────────────────────────────────────────

export const exportCSV = async (
  items: StockItem[],
  settings: Settings | null
): Promise<void> => {
  const shopName = settings?.shop_name || 'StockFlow';
  const contact = settings?.contact_number || '';
  const exportedAt = format(new Date(), 'dd/MM/yyyy HH:mm');

  const header = `StockFlow Inventory Report\n"Shop: ${shopName}","Contact: ${contact}","Generated: ${exportedAt}"\n\n`;
  const columnHeaders = `"#","Item Name","Category","Quantity","Unit","Unit Price","Total Value","Status"\n`;

  const rows = items
    .map(
      (item, i) =>
        `"${i + 1}","${escapeCsv(item.name)}","${escapeCsv(item.category || 'General')}","${item.quantity}","${item.unit || 'pcs'}","${item.price !== null ? item.price : ''}","${item.price !== null ? item.quantity * item.price : ''}","${item.quantity === 0 ? 'Out of Stock' : item.quantity <= 5 ? 'Low Stock' : 'In Stock'}"`
    )
    .join('\n');

  const csvContent = header + columnHeaders + rows;
  const fileName = getFileName('csv');
  const uri = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(uri, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Share StockFlow CSV',
    });
  } else if (Platform.OS === 'android') {
    await saveToDownloads(uri, fileName);
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const escapeCsv = (str: string): string => {
  return String(str).replace(/"/g, '""');
};

const saveToDownloads = async (uri: string, fileName: string): Promise<void> => {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Storage permission denied');
  }
  const asset = await MediaLibrary.createAssetAsync(uri);
  await MediaLibrary.createAlbumAsync('StockFlow', asset, false);
};

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { StockItem } from '../database/database';

export interface ParsedBackup {
  version: string;
  exportedAt: string;
  settings?: {
    shop_name?: string;
    contact_number?: string;
  };
  items: Array<Omit<StockItem, 'id' | 'created_at' | 'updated_at'>>;
}

export type ImportError =
  | 'NO_FILE'
  | 'READ_ERROR'
  | 'INVALID_FORMAT'
  | 'INVALID_SCHEMA'
  | 'EMPTY_FILE';

export interface ImportResult {
  success: boolean;
  data?: ParsedBackup;
  error?: ImportError;
  errorMessage?: string;
}

// ─── Pick file from device ────────────────────────────────────────────────────

export const pickAndParseFile = async (): Promise<ImportResult> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/csv', 'text/comma-separated-values', '*/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { success: false, error: 'NO_FILE' };
    }

    const file = result.assets[0];
    const uri = file.uri;
    const name = file.name?.toLowerCase() || '';

    // Read content
    let content: string;
    try {
      content = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } catch {
      return { success: false, error: 'READ_ERROR', errorMessage: 'Could not read file contents.' };
    }

    if (!content || content.trim().length === 0) {
      return { success: false, error: 'EMPTY_FILE' };
    }

    // Detect format
    if (name.endsWith('.json') || isLikelyJSON(content)) {
      return parseJSON(content);
    } else if (name.endsWith('.csv') || name.endsWith('.txt')) {
      return parseCSV(content);
    } else {
      // Try JSON first, then CSV
      const jsonResult = parseJSON(content);
      if (jsonResult.success) return jsonResult;
      return parseCSV(content);
    }
  } catch (e) {
    return {
      success: false,
      error: 'INVALID_FORMAT',
      errorMessage: `Unexpected error: ${e}`,
    };
  }
};

// ─── JSON Parser ─────────────────────────────────────────────────────────────

const parseJSON = (content: string): ImportResult => {
  try {
    const parsed = JSON.parse(content);

    // Validate top-level schema
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'INVALID_SCHEMA' };
    }

    // Support both full backup format and simple array format
    let items: unknown[];

    if (Array.isArray(parsed)) {
      // Simple array of items
      items = parsed;
    } else if (parsed.items && Array.isArray(parsed.items)) {
      // Full backup format
      items = parsed.items;
    } else {
      return { success: false, error: 'INVALID_SCHEMA', errorMessage: 'JSON must contain an "items" array.' };
    }

    const validatedItems = validateAndNormalizeItems(items);
    if (!validatedItems) {
      return { success: false, error: 'INVALID_SCHEMA', errorMessage: 'Items array contains invalid data.' };
    }

    return {
      success: true,
      data: {
        version: parsed.version || '1.0.0',
        exportedAt: parsed.exportedAt || new Date().toISOString(),
        settings: parsed.settings,
        items: validatedItems,
      },
    };
  } catch (e) {
    return { success: false, error: 'INVALID_FORMAT', errorMessage: 'File is not valid JSON.' };
  }
};

// ─── CSV Parser ──────────────────────────────────────────────────────────────

const parseCSV = (content: string): ImportResult => {
  try {
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);

    // Find the header row (look for "Item Name" or similar)
    let headerIndex = -1;
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const lower = lines[i].toLowerCase();
      if (lower.includes('item name') || lower.includes('name') && lower.includes('quantity')) {
        headerIndex = i;
        break;
      }
    }

    if (headerIndex === -1) {
      return { success: false, error: 'INVALID_SCHEMA', errorMessage: 'Could not find item headers in CSV.' };
    }

    const headers = parseCSVRow(lines[headerIndex]).map(h =>
      h.toLowerCase().trim().replace(/[^a-z0-9]/g, '_')
    );

    const nameIdx = headers.findIndex(h => h.includes('name'));
    const qtyIdx = headers.findIndex(h => h.includes('quantity') || h === 'qty');
    const priceIdx = headers.findIndex(h => h.includes('price') && h.includes('unit'));
    const categoryIdx = headers.findIndex(h => h.includes('category'));
    const unitIdx = headers.findIndex(h => h === 'unit');

    if (nameIdx === -1 || qtyIdx === -1) {
      return { success: false, error: 'INVALID_SCHEMA', errorMessage: 'CSV must have Name and Quantity columns.' };
    }

    const items: Array<Omit<StockItem, 'id' | 'created_at' | 'updated_at'>> = [];

    for (let i = headerIndex + 1; i < lines.length; i++) {
      const cols = parseCSVRow(lines[i]);
      if (cols.length < 2) continue;

      const name = cols[nameIdx]?.trim();
      if (!name) continue;

      const quantity = parseFloat(cols[qtyIdx] || '0') || 0;
      const price = priceIdx >= 0 ? (parseFloat(cols[priceIdx] || '') || null) : null;
      const category = categoryIdx >= 0 ? (cols[categoryIdx]?.trim() || 'General') : 'General';
      const unit = unitIdx >= 0 ? (cols[unitIdx]?.trim() || 'pcs') : 'pcs';

      items.push({ name, quantity, price, unit, category, notes: null });
    }

    if (items.length === 0) {
      return { success: false, error: 'EMPTY_FILE', errorMessage: 'No valid items found in CSV.' };
    }

    return {
      success: true,
      data: {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        items,
      },
    };
  } catch (e) {
    return { success: false, error: 'INVALID_FORMAT', errorMessage: 'Failed to parse CSV file.' };
  }
};

// ─── Validation Helpers ───────────────────────────────────────────────────────

const validateAndNormalizeItems = (
  raw: unknown[]
): Array<Omit<StockItem, 'id' | 'created_at' | 'updated_at'>> | null => {
  if (!Array.isArray(raw)) return null;
  const result: Array<Omit<StockItem, 'id' | 'created_at' | 'updated_at'>> = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;

    const name = typeof obj.name === 'string' ? obj.name.trim() : '';
    if (!name) continue;

    const quantity = Number(obj.quantity ?? 0);
    const price =
      obj.price !== null && obj.price !== undefined && obj.price !== ''
        ? Number(obj.price)
        : null;

    result.push({
      name,
      quantity: isNaN(quantity) ? 0 : quantity,
      price: price !== null && isNaN(price) ? null : price,
      unit: typeof obj.unit === 'string' ? obj.unit : 'pcs',
      category: typeof obj.category === 'string' ? obj.category : 'General',
      notes: typeof obj.notes === 'string' ? obj.notes : null,
    });
  }

  return result;
};

const isLikelyJSON = (content: string): boolean => {
  const trimmed = content.trimStart();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
};

const parseCSVRow = (row: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

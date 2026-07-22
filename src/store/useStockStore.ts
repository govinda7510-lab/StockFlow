import { create } from 'zustand';
import {
  StockItem,
  Settings,
  getAllItems,
  getSettings,
  addItem as dbAddItem,
  updateItem as dbUpdateItem,
  deleteItem as dbDeleteItem,
  deductItem as dbDeductItem,
  saveSettings as dbSaveSettings,
  completeOnboarding as dbCompleteOnboarding,
  setLanguage as dbSetLanguage,
  clearAllItems,
  bulkInsertItems,
} from '../database/database';
import { changeLanguage } from '../localization/i18n';

interface StockState {
  // Data
  items: StockItem[];
  settings: Settings | null;
  isLoading: boolean;
  error: string | null;

  // Actions — Items
  loadItems: () => Promise<void>;
  addItem: (
    name: string,
    quantity: number,
    price: number | null,
    unit?: string,
    category?: string,
    notes?: string | null
  ) => Promise<number>;
  updateItem: (
    id: number,
    name: string,
    quantity: number,
    price: number | null,
    unit?: string,
    category?: string,
    notes?: string | null
  ) => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
  deductItem: (
    id: number,
    amount: number,
    note?: string
  ) => Promise<{ success: boolean; newQty: number }>;

  // Actions — Settings
  loadSettings: () => Promise<void>;
  saveSettings: (shopName: string, contactNumber: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  setLanguage: (lang: string) => Promise<void>;

  // Actions — Data Management
  clearAllData: () => Promise<void>;
  restoreItems: (
    items: Array<Omit<StockItem, 'id' | 'created_at' | 'updated_at'>>,
    replace: boolean
  ) => Promise<void>;

  // Helpers
  getItemById: (id: number) => StockItem | undefined;
  clearError: () => void;
}

export const useStockStore = create<StockState>((set, get) => ({
  items: [],
  settings: null,
  isLoading: false,
  error: null,

  loadItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const items = await getAllItems();
      set({ items, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  addItem: async (name, quantity, price, unit, category, notes) => {
    try {
      const id = await dbAddItem(name, quantity, price, unit, category, notes);
      await get().loadItems();
      return id;
    } catch (e) {
      set({ error: String(e) });
      return -1;
    }
  },

  updateItem: async (id, name, quantity, price, unit, category, notes) => {
    try {
      await dbUpdateItem(id, name, quantity, price, unit, category, notes);
      await get().loadItems();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  deleteItem: async (id: number) => {
    try {
      await dbDeleteItem(id);
      set(state => ({ items: state.items.filter(i => i.id !== id) }));
    } catch (e) {
      set({ error: String(e) });
    }
  },

  deductItem: async (id: number, amount: number, note = '') => {
    try {
      const result = await dbDeductItem(id, amount, note);
      if (result.success) {
        set(state => ({
          items: state.items.map(item =>
            item.id === id ? { ...item, quantity: result.newQty } : item
          ),
        }));
      }
      return result;
    } catch (e) {
      set({ error: String(e) });
      return { success: false, newQty: 0 };
    }
  },

  loadSettings: async () => {
    try {
      const settings = await getSettings();
      set({ settings });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  saveSettings: async (shopName: string, contactNumber: string) => {
    try {
      await dbSaveSettings(shopName, contactNumber);
      await get().loadSettings();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  completeOnboarding: async () => {
    try {
      await dbCompleteOnboarding();
      await get().loadSettings();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  setLanguage: async (lang: string) => {
    try {
      await dbSetLanguage(lang);
      await changeLanguage(lang);
      await get().loadSettings();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  clearAllData: async () => {
    try {
      await clearAllItems();
      set({ items: [] });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  restoreItems: async (items, replace) => {
    try {
      if (replace) {
        await clearAllItems();
      }
      await bulkInsertItems(items);
      await get().loadItems();
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  getItemById: (id: number) => {
    return get().items.find(item => item.id === id);
  },

  clearError: () => set({ error: null }),
}));

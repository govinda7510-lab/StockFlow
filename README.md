# 📦 StockFlow

**Fast, frictionless stock & warehouse management for small businesses.**

Built with React Native + Expo · TypeScript · SQLite · i18n

---

## ✨ Features

| Feature | Description |
|---|---|
| **Onboarding** | First-launch setup for shop name & contact — appears on all reports |
| **Dashboard** | Live inventory list with search, stats, and total value |
| **Add/Edit Item** | Name, quantity, optional price, unit, category, notes |
| **Quick Deduct** | One-tap stock reduction with live remaining preview |
| **PDF Export** | Branded PDF report with summary table, share to any app |
| **JSON/CSV Export** | Full database export for backup or spreadsheet use |
| **Google Drive Backup** | OAuth-authenticated upload to "StockFlow Backups" folder |
| **File Import** | Restore from JSON or CSV with merge/replace mode |
| **Multi-language** | English & Urdu (RTL) — easily add more |
| **GitHub Actions** | Auto-build APK on every push to `main` |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli eas-cli`
- Expo account at [expo.dev](https://expo.dev)

### 1. Install dependencies
```bash
cd StockFlow
npm install
```

### 2. Start development server
```bash
npx expo start
```
Scan the QR code with the **Expo Go** app on your phone.

---

## 🔧 Configuration

### `app.json`
Update the `extra.eas.projectId` with your own EAS project ID:
```bash
eas init   # run this once to link to your Expo account
```

### Google Drive (Optional)
To enable Google Drive backup/import:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → **Enable "Google Drive API"**
3. Create **OAuth 2.0 credentials** (Android + iOS + Web)
4. Open `src/services/googleDriveService.ts` and replace:
```typescript
const GOOGLE_CLIENT_ID_ANDROID = 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_IOS = 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_WEB = 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com';
```

---

## 📲 Build APK

### Local build
```bash
npm run build:android
# or
eas build --platform android --profile preview
```

### GitHub Actions (Automatic)
Every push to `main` automatically builds an APK.

**Setup (one-time):**
1. Go to your GitHub repo → **Settings → Secrets → Actions**
2. Add secret: `EXPO_TOKEN` = your Expo access token
   - Get it at: `expo.dev` → Account → Access Tokens → **Create Token**
3. Push to `main` — the workflow runs and produces a downloadable APK under the **Actions** tab → latest run → **Artifacts**

---

## 🌍 Adding More Languages

1. Create `src/localization/translations/<lang>.json` (copy `en.json`)
2. Import it in `src/localization/i18n.ts`:
```typescript
import ar from './translations/ar.json';
const resources = {
  en: { translation: en },
  ur: { translation: ur },
  ar: { translation: ar },  // ← add this
};
```
3. Add to `SUPPORTED_LANGUAGES` array with `rtl: true/false`

---

## 🗂️ Project Structure

```
StockFlow/
├── .github/workflows/build.yml   # GitHub Actions APK build
├── src/
│   ├── components/               # Button, Input, StockItemCard, StatCard, PickerSelect
│   ├── constants/theme.ts        # Design tokens (colors, spacing, radius, shadows)
│   ├── database/database.ts      # SQLite schema + all queries
│   ├── localization/             # i18next setup + EN/UR translations
│   ├── navigation/               # RootNavigator + TabNavigator
│   ├── screens/                  # All 6 screens
│   ├── services/                 # PDF, Export, Import, Google Drive
│   └── store/useStockStore.ts    # Zustand global state
├── App.tsx                       # Entry point
├── app.json                      # Expo config + permissions
├── eas.json                      # EAS build profiles
└── package.json
```

---

## 📁 Backup File Format

StockFlow JSON backups follow this schema:
```json
{
  "version": "1.0.0",
  "exportedAt": "2026-01-01T00:00:00.000Z",
  "settings": {
    "shop_name": "Al-Noor Traders",
    "contact_number": "0300-1234567"
  },
  "items": [
    {
      "name": "Basmati Rice 5kg",
      "quantity": 50,
      "price": 850,
      "unit": "pcs",
      "category": "Food & Grocery",
      "notes": null
    }
  ]
}
```

---

## 🛡️ Permissions

| Permission | Platform | Purpose |
|---|---|---|
| `READ_EXTERNAL_STORAGE` | Android | Read imported backup files |
| `WRITE_EXTERNAL_STORAGE` | Android | Save exported files |
| `INTERNET` | Android/iOS | Google Drive API |
| `NSPhotoLibraryUsageDescription` | iOS | Save exports |

---

## 📄 License

MIT © StockFlow
"# StockFlow" 

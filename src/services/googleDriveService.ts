import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { StockItem, Settings } from '../database/database';
import { format } from 'date-fns';
import { ParsedBackup } from './importService';

WebBrowser.maybeCompleteAuthSession();

// ─── CONFIG — Replace with your Google Cloud OAuth client ID ─────────────────
// Steps:
//  1. Go to console.cloud.google.com
//  2. Create a project → Enable "Google Drive API"
//  3. Create OAuth credentials (Android + iOS)
//  4. Paste your client IDs below
const GOOGLE_CLIENT_ID_ANDROID = 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_IOS = 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_WEB = 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com';

const DRIVE_FOLDER_NAME = 'StockFlow Backups';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

// ─── Auth ─────────────────────────────────────────────────────────────────────

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

interface GoogleTokens {
  accessToken: string;
  refreshToken?: string;
}

export const signInWithGoogle = async (): Promise<GoogleTokens | null> => {
  const redirectUri = AuthSession.makeRedirectUri();

  const request = new AuthSession.AuthRequest({
    clientId: GOOGLE_CLIENT_ID_WEB,
    scopes: ['https://www.googleapis.com/auth/drive.file', 'openid', 'email'],
    redirectUri,
    responseType: AuthSession.ResponseType.Token,
    extraParams: { access_type: 'offline' },
  });

  const result = await request.promptAsync(discovery);

  if (result.type === 'success' && result.params.access_token) {
    return { accessToken: result.params.access_token };
  }

  return null;
};

// ─── Upload to Drive ─────────────────────────────────────────────────────────

export const uploadToDrive = async (
  items: StockItem[],
  settings: Settings | null,
  tokens: GoogleTokens
): Promise<string> => {
  const { accessToken } = tokens;

  // 1. Ensure folder exists
  const folderId = await getOrCreateFolder(accessToken);

  // 2. Build JSON content
  const exportData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    settings: {
      shop_name: settings?.shop_name || '',
      contact_number: settings?.contact_number || '',
    },
    items: items.map(({ id, created_at, updated_at, ...rest }) => rest),
  };

  const content = JSON.stringify(exportData, null, 2);
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
  const fileName = `StockFlow_Backup_${timestamp}.json`;

  // 3. Write to temp file
  const tempUri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(tempUri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  // 4. Upload via multipart
  const metadata = JSON.stringify({
    name: fileName,
    mimeType: 'application/json',
    parents: [folderId],
  });

  const uploadResult = await FileSystem.uploadAsync(
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart`,
    tempUri,
    {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType: 'application/json',
      parameters: {},
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (uploadResult.status !== 200 && uploadResult.status !== 201) {
    throw new Error(`Drive upload failed: ${uploadResult.status}`);
  }

  return fileName;
};

// ─── List backup files from Drive ────────────────────────────────────────────

export interface DriveFile {
  id: string;
  name: string;
  createdTime: string;
  size?: string;
}

export const listDriveBackups = async (accessToken: string): Promise<DriveFile[]> => {
  const query = encodeURIComponent(
    `name contains 'StockFlow_Backup' and mimeType = 'application/json' and trashed = false`
  );

  const res = await fetch(
    `${DRIVE_API}/files?q=${query}&fields=files(id,name,createdTime,size)&orderBy=createdTime desc`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) throw new Error('Failed to list Drive files');
  const json = await res.json();
  return json.files || [];
};

// ─── Download from Drive ─────────────────────────────────────────────────────

export const downloadFromDrive = async (
  fileId: string,
  accessToken: string
): Promise<ParsedBackup | null> => {
  const tempUri = `${FileSystem.cacheDirectory}drive_import_${Date.now()}.json`;

  const result = await FileSystem.downloadAsync(
    `${DRIVE_API}/files/${fileId}?alt=media`,
    tempUri,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (result.status !== 200) {
    throw new Error('Failed to download file from Drive');
  }

  const content = await FileSystem.readAsStringAsync(tempUri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  try {
    const parsed = JSON.parse(content);
    if (!parsed.items || !Array.isArray(parsed.items)) {
      throw new Error('Invalid backup format');
    }
    return parsed as ParsedBackup;
  } catch {
    throw new Error('The downloaded file is not a valid StockFlow backup');
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getOrCreateFolder = async (accessToken: string): Promise<string> => {
  // Search for existing folder
  const query = encodeURIComponent(
    `name = '${DRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );

  const searchRes = await fetch(
    `${DRIVE_API}/files?q=${query}&fields=files(id,name)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // Create folder
  const createRes = await fetch(`${DRIVE_API}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) throw new Error('Failed to create Google Drive folder');
  const folder = await createRes.json();
  return folder.id;
};

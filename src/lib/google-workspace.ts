import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  type User,
  type Auth,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import driveInfo from './drive-info.json';
import { FIELDS, type Data, type Entity, type RecordRow } from './model';

export const SPREADSHEET_ID = driveInfo.spreadsheetId;
export const FOLDER_ID = driveInfo.folderId;
export const SPREADSHEET_URL = driveInfo.spreadsheetUrl;
export const FOLDER_URL = driveInfo.folderUrl;

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

// Tab names in the Google Spreadsheet
export const SHEET_TABS: Record<Entity, string> = {
  influencers: 'Profiles',
  agreements: 'Agreements',
  content: 'Content',
};

// Initialize Firebase App & Auth
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth: Auth = getAuth(app);

const provider = new GoogleAuthProvider();
GOOGLE_SCOPES.forEach((scope) => provider.addScope(scope));

// In-memory token cache (never stored in localStorage/sessionStorage per security guidelines)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else if (!isSigningIn) {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not retrieve access token from Google sign-in.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const googleSignOut = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setAccessToken = (token: string | null): void => {
  cachedAccessToken = token;
};

/* -------------------------------------------------------------
   GOOGLE SHEETS API INTEGRATION (Direct REST v4)
------------------------------------------------------------- */

/**
 * Ensures required tabs (Profiles, Agreements, Content) exist with headers.
 */
export async function ensureSpreadsheetTabs(token: string): Promise<void> {
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets(properties(sheetId,title))`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!metaRes.ok) {
    const errText = await metaRes.text();
    throw new Error(`Google Sheets metadata error (${metaRes.status}): ${errText}`);
  }

  const metaData = await metaRes.json();
  const existingTitles = new Set(
    (metaData.sheets || []).map((s: any) => s.properties?.title)
  );

  const missingTabs: string[] = [];
  for (const tab of Object.values(SHEET_TABS)) {
    if (!existingTitles.has(tab)) {
      missingTabs.push(tab);
    }
  }

  if (missingTabs.length > 0) {
    const addSheetRequests = missingTabs.map((title) => ({
      addSheet: { properties: { title } },
    }));

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests: addSheetRequests }),
      }
    );

    // Initialize headers for newly added tabs
    for (const [entityKey, tabName] of Object.entries(SHEET_TABS) as [Entity, string][]) {
      if (missingTabs.includes(tabName)) {
        const fields = FIELDS[entityKey];
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
            tabName
          )}!A1:Z1?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              range: `${tabName}!A1:Z1`,
              majorDimension: 'ROWS',
              values: [fields],
            }),
          }
        );
      }
    }
  }
}

/**
 * Reads all rows from Google Sheets for influencers, agreements, and content.
 */
export async function readAllFromGoogleSheets(token: string): Promise<Data> {
  await ensureSpreadsheetTabs(token);

  const entities: Entity[] = ['influencers', 'agreements', 'content'];
  const result: Data = { influencers: [], agreements: [], content: [] };

  for (const entity of entities) {
    const tab = SHEET_TABS[entity];
    const fields = FIELDS[entity];

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
        tab
      )}!A1:Z?majorDimension=ROWS`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      console.warn(`Could not read tab ${tab}: ${await res.text()}`);
      continue;
    }

    const data = await res.json();
    const rows: any[][] = data.values || [];
    if (rows.length < 2) continue; // Only header or empty

    const headers: string[] = rows[0].map((h: string) => String(h).trim().toLowerCase());
    const dataRows = rows.slice(1);

    const parsedRows: RecordRow[] = dataRows
      .filter((r) => r.length > 0 && r[0]) // ID must exist
      .map((rowVals) => {
        const rowObj: RecordRow = { id: String(rowVals[0]) };
        headers.forEach((header, idx) => {
          if (!header) return;
          const val = rowVals[idx];
          if (val === undefined || val === null || val === '') {
            rowObj[header] = '';
          } else if (
            [
              'followers',
              'stories',
              'reels',
              'posts',
              'fee',
              'reach',
              'views',
              'likes',
              'comments',
              'shares',
              'saves',
              'followers_gained',
              'clicks',
              'leads',
              'orders',
              'revenue',
              'engagement_rate',
              'audience_local_pct',
            ].includes(header)
          ) {
            rowObj[header] = Number(val) || 0;
          } else {
            rowObj[header] = String(val);
          }
        });
        // Ensure all required fields exist
        fields.forEach((f) => {
          if (rowObj[f] === undefined) {
            rowObj[f] = '';
          }
        });
        return rowObj;
      });

    result[entity] = parsedRows;
  }

  return result;
}

/**
 * Upserts a single row to Google Sheets.
 */
export async function upsertRowToGoogleSheet(
  token: string,
  entity: Entity,
  row: RecordRow
): Promise<RecordRow> {
  await ensureSpreadsheetTabs(token);

  const tab = SHEET_TABS[entity];
  const fields = FIELDS[entity];

  // Fetch current column A to check if row exists
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
      tab
    )}!A:A`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const sheetData = await res.json();
  const existingIds = (sheetData.values || []).map((r: any[]) => String(r[0] || '').trim());

  const rowValues = fields.map((f) => {
    const val = row[f];
    return val === undefined || val === null ? '' : val;
  });

  const existingIndex = existingIds.indexOf(String(row.id).trim());

  if (existingIndex > 0) {
    // Row exists (1-based sheet row index = existingIndex + 1)
    const rowNum = existingIndex + 1;
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
        tab
      )}!A${rowNum}:Z${rowNum}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: `${tab}!A${rowNum}:Z${rowNum}`,
          majorDimension: 'ROWS',
          values: [rowValues],
        }),
      }
    );
  } else {
    // Append new row
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
        tab
      )}!A1:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: `${tab}!A1`,
          majorDimension: 'ROWS',
          values: [rowValues],
        }),
      }
    );
  }

  return row;
}

/**
 * Bulk writes entire Data object to Google Sheets tabs.
 */
export async function bulkSyncDataToGoogleSheets(token: string, data: Data): Promise<void> {
  await ensureSpreadsheetTabs(token);

  const entities: Entity[] = ['influencers', 'agreements', 'content'];

  for (const entity of entities) {
    const tab = SHEET_TABS[entity];
    const fields = FIELDS[entity];
    const records = data[entity] || [];

    const rows = [
      fields,
      ...records.map((r) =>
        fields.map((f) => (r[f] === undefined || r[f] === null ? '' : r[f]))
      ),
    ];

    // Clear existing values
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
        tab
      )}!A1:Z1000:clear`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    // Update with complete fresh rows
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
        tab
      )}!A1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: `${tab}!A1`,
          majorDimension: 'ROWS',
          values: rows,
        }),
      }
    );
  }
}

/* -------------------------------------------------------------
   GOOGLE DRIVE API INTEGRATION (Direct REST v3)
------------------------------------------------------------- */

/**
 * Uploads a file (PDF or Excel report) to the designated Google Drive Reports folder.
 */
export async function uploadFileToGoogleDriveFolder(
  token: string,
  params: {
    fileName: string;
    mimeType: string;
    content: Blob | ArrayBuffer;
    description?: string;
  }
): Promise<{ ok: boolean; fileId: string; webViewLink?: string; name: string }> {
  const metadata = {
    name: params.fileName,
    mimeType: params.mimeType,
    parents: [FOLDER_ID],
    description: params.description || 'Campaign Report generated by Dlbeen Influencers System',
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const blobContent =
    params.content instanceof Blob ? params.content : new Blob([params.content], { type: params.mimeType });

  const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json; charset=UTF-8' });

  const multipartBody = new Blob(
    [
      delimiter,
      'Content-Type: application/json; charset=UTF-8\r\n\r\n',
      metadataBlob,
      delimiter,
      `Content-Type: ${params.mimeType}\r\n`,
      'Content-Transfer-Encoding: binary\r\n\r\n',
      blobContent,
      closeDelimiter,
    ],
    { type: `multipart/related; boundary=${boundary}` }
  );

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Drive upload error (${res.status}): ${errText}`);
  }

  const uploaded = await res.json();
  return {
    ok: true,
    fileId: uploaded.id,
    webViewLink: uploaded.webViewLink,
    name: uploaded.name,
  };
}

/**
 * Lists files inside the designated Google Drive Reports folder.
 */
export async function listGoogleDriveFolderFiles(
  token: string
): Promise<Array<{ id: string; name: string; mimeType: string; webViewLink?: string; createdTime?: string; size?: string }>> {
  const q = encodeURIComponent(`'${FOLDER_ID}' in parents and trashed = false`);
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,webViewLink,createdTime,size)&orderBy=createdTime desc&pageSize=30`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    throw new Error(`Google Drive list error: ${await res.text()}`);
  }

  const data = await res.json();
  return data.files || [];
}

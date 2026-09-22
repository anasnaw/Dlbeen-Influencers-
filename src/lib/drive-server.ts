import fs from 'fs';
import path from 'path';
import { requestDrive, validEndpoint } from './drive-transport';
import { FIELDS, type Entity, validateRow, type Data, type RecordRow } from './model';

const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'connection.json');
const RECORDS_FILE = path.join(DATA_DIR, 'records.json');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getConnection(): { endpoint: string; secret: string; updated_at: string } | null {
  try {
    ensureDir();
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      if (data && data.endpoint && data.secret) {
        return data;
      }
    }
  } catch (e) {
    console.error('Error reading connection config', e);
  }
  return null;
}

export function saveConnection(endpoint: string, secret: string) {
  ensureDir();
  const config = {
    endpoint,
    secret,
    updated_at: new Date().toISOString()
  };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  return config;
}

export function getLocalRecords(): Data {
  try {
    ensureDir();
    if (fs.existsSync(RECORDS_FILE)) {
      return JSON.parse(fs.readFileSync(RECORDS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading local records', e);
  }
  return { influencers: [], agreements: [], content: [] };
}

export function saveLocalRecords(data: Data) {
  ensureDir();
  fs.writeFileSync(RECORDS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export function upsertLocalRecord(entity: Entity, row: RecordRow) {
  const data = getLocalRecords();
  const list = data[entity] || [];
  const index = list.findIndex(r => r.id === row.id);
  const updatedRow = { ...row, updated_at: new Date().toISOString() };
  if (index >= 0) {
    list[index] = updatedRow;
  } else {
    list.push(updatedRow);
  }
  data[entity] = list;
  saveLocalRecords(data);
  return updatedRow;
}

export { validEndpoint };

export async function driveCall(payload: Record<string, unknown>, connection?: { endpoint: string; secret: string }) {
  const config = connection || getConnection();
  if (!config) {
    throw new Error('Google Drive saving is not connected yet. Complete the connection in Settings, or use the Google Sheet directly.');
  }
  return requestDrive(payload, config);
}

export function validatePayload(payload: any) {
  if (!payload || !payload.entity || !Object.hasOwn(FIELDS, payload.entity)) {
    throw new Error('Unknown record type.');
  }
  const entity = payload.entity as Entity;
  const allowed = FIELDS[entity] as readonly string[];
  const row = Object.fromEntries(Object.entries(payload.row || {}).filter(([key]) => allowed.includes(key)));
  for (const v of Object.values(row)) {
    if (typeof v === 'string' && v.length > 15000) {
      throw new Error('A field is too long.');
    }
  }
  validateRow(entity, row as any);
  return { entity, row: row as RecordRow, expectedUpdatedAt: typeof payload.expectedUpdatedAt === 'string' ? payload.expectedUpdatedAt : '' };
}

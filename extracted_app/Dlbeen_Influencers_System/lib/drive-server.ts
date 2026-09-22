import {requestDrive} from './drive-transport';
import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {FIELDS,type Entity,validateRow} from './model';
const db=()=>{const binding=(env as unknown as {DB:D1Database}).DB;if(!binding)throw new Error('Connection settings are temporarily unavailable.');return binding;};
export async function guard(req?:Request){const user=await getChatGPTUser();if(!user)throw new Error('Please open the private system while signed in to ChatGPT.');if(req&&req.method!=='GET'){const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)throw new Error('This request did not come from your system.');}return user;}
export async function getConnection(){return await db().prepare('SELECT endpoint,secret,updated_at FROM drive_connection WHERE id = ?').bind('main').first<{endpoint:string;secret:string;updated_at:string}>();}
export async function saveConnection(endpoint:string,secret:string){await db().prepare('INSERT INTO drive_connection (id,endpoint,secret,updated_at) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET endpoint=excluded.endpoint,secret=excluded.secret,updated_at=excluded.updated_at').bind('main',endpoint,secret,new Date().toISOString()).run();}
export {validEndpoint} from './drive-transport';
export async function driveCall(payload:Record<string,unknown>,connection?:{endpoint:string;secret:string}){const config=connection||await getConnection();if(!config)throw new Error('Google Drive saving is not connected yet. Complete the connection in Settings, or use the Google Sheet directly.');return requestDrive(payload,config);}
export function jsonError(error:unknown,status=400){return Response.json({error:error instanceof Error?error.message:'Unable to complete request.'},{status});}
export function validatePayload(payload:any){if(!Object.hasOwn(FIELDS,payload.entity))throw new Error('Unknown record type.');const entity=payload.entity as Entity;const allowed=FIELDS[entity] as readonly string[];const row=Object.fromEntries(Object.entries(payload.row||{}).filter(([key])=>allowed.includes(key)));for(const v of Object.values(row))if(typeof v==='string'&&v.length>15000)throw new Error('A field is too long.');validateRow(entity,row as any);return {entity,row,expectedUpdatedAt:typeof payload.expectedUpdatedAt==='string'?payload.expectedUpdatedAt:''};}

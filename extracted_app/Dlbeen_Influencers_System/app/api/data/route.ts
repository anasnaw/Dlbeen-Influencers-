import {guard,driveCall,jsonError,validatePayload} from '@/lib/drive-server';
export async function GET(){try{await guard();const result=await driveCall({action:'list'});return Response.json(result,{headers:{'Cache-Control':'no-store'}});}catch(e){return jsonError(e,503);}}
export async function POST(req:Request){try{await guard(req);if(Number(req.headers.get('content-length'))>100000)throw new Error('Record is too large.');const payload=validatePayload(await req.json());return Response.json(await driveCall({action:'upsert',...payload}));}catch(e){return jsonError(e);}}

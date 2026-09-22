import {guard,driveCall,jsonError} from '@/lib/drive-server';
export async function POST(req:Request){try{await guard(req);const {filters,format,notes}=await req.json() as any;if(!['pdf','xlsx'].includes(format))throw new Error('Select PDF or Excel.');return Response.json(await driveCall({action:'report',filters,format,notes:String(notes||'').slice(0,5000)}));}catch(e){return jsonError(e);}}

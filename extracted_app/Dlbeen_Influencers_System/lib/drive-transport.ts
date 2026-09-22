// Keep connection keys, endpoint paths and response bodies out of diagnostics.
export function validEndpoint(endpoint:unknown):endpoint is string {
  return typeof endpoint==='string'&&/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint);
}
export async function requestDrive(payload:Record<string,unknown>,config:{endpoint:string;secret:string},fetcher:typeof fetch=fetch) {
  if(!validEndpoint(config.endpoint))throw new Error('Use the Google Web app URL ending in /exec from Deploy → Manage deployments.');
  const reference=crypto.randomUUID().slice(0,8);
  const action=['ping','list','upsert','upload','image','report'].includes(String(payload.action))?String(payload.action):'unknown';
  function fail(code:string,message:string,status?:number,host?:string):never {
    console.error(JSON.stringify({event:'drive_connection_failure',reference,code,action,status,host}));
    throw new Error(`${message} [${code}${status?' / HTTP '+status:''}; reference ${reference}]`);
  }
  let res:Response;
  try {
    res=await fetcher(config.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,key:config.secret}),redirect:'follow',signal:AbortSignal.timeout(60000)});
  } catch(error) {
    const timedOut=error instanceof Error&&['TimeoutError','AbortError'].includes(error.name);
    return fail(timedOut?'GOOGLE_TIMEOUT':'GOOGLE_NETWORK',timedOut?'The Google connection timed out.':'The server could not reach the Google connection.');
  }
  let host='';try{host=new URL(res.url).hostname;}catch{}
  const status=res.status;
  if(host==='accounts.google.com')return fail('GOOGLE_SIGN_IN','Google redirected the server to sign-in. Check that the web app executes as Me and allows Anyone, then deploy the updated version.',status,host);
  if(!res.ok){
    if(status===401||status===403)return fail('GOOGLE_ACCESS','Google refused access. Check the web app access settings and its authorization. If these are correct, the response may be a Google access restriction.',status,host);
    if(status===404||status===410)return fail('GOOGLE_DEPLOYMENT','The Google web app could not be found. Copy its current Web app URL from Manage deployments.',status,host);
    if(status===429)return fail('GOOGLE_LIMIT','The Google connection is rate-limited. Wait before testing again.',status,host);
    if(status>=500)return fail('GOOGLE_UPSTREAM','The Google connection returned a server or gateway error. This does not confirm a problem with your key or deployment settings.',status,host);
    return fail('GOOGLE_HTTP','The Google connection returned an unexpected HTTP response.',status,host);
  }
  let body:string;try{body=await res.text();}catch{return fail('GOOGLE_RESPONSE','The Google connection response could not be read.',status,host);}
  let data:any;try{data=JSON.parse(body);}catch{
    if(/Script function not found|doPost.*not.*found/i.test(body))return fail('GOOGLE_SCRIPT','The deployed script is missing doPost. Save the complete prepared Code.gs and deploy a New version.',status,host);
    if(/accounts\.google\.com\/ServiceLogin|id="identifierId"/i.test(body))return fail('GOOGLE_SIGN_IN','Google returned a sign-in page. The web app must allow Anyone and execute as Me.',status,host);
    return fail('GOOGLE_NOT_JSON','Google returned a page instead of the connection response. Check the Apps Script Executions screen for a failed doPost, and confirm the latest code is deployed.',status,host);
  }
  if(!data||typeof data!=='object'||typeof data.ok!=='boolean')return fail('GOOGLE_RESPONSE','The web app did not return the expected Dlbeen connection response.',status,host);
  if(!data.ok){
    const detail=typeof data.error==='string'?data.error.split(config.secret).join('[redacted]').slice(0,500):'The Google script reported an error.';
    return fail('GOOGLE_SCRIPT_ERROR',detail,status,host);
  }
  return data;
}

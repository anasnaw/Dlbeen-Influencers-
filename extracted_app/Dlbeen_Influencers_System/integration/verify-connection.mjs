import fs from 'node:fs/promises';
import ts from 'typescript';
import assert from 'node:assert/strict';
await fs.mkdir('.sites-runtime/qa',{recursive:true});
const source=await fs.readFile('lib/drive-transport.ts','utf8');
await fs.writeFile('.sites-runtime/qa/transport.mjs',ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
const {requestDrive,validEndpoint}=await import('../.sites-runtime/qa/transport.mjs');
const config={endpoint:'https://script.google.com/macros/s/TEST_DEPLOYMENT/exec',secret:'test-private-key-do-not-log'};
assert.ok(validEndpoint(config.endpoint));assert.equal(validEndpoint('https://example.com/exec'),false);assert.equal(validEndpoint(config.endpoint.replace('/exec','/dev')),false);
const logs=[];const original=console.error;console.error=x=>logs.push(String(x));
try {
 let sent;
 const good=await requestDrive({action:'ping',key:'wrong'},config,async(url,options)=>{sent={url,options};return Response.json({ok:true,system:'Dlbeen Influencers System'});});
 assert.equal(good.ok,true);assert.equal(sent.options.redirect,'follow');assert.equal(JSON.parse(sent.options.body).key,config.secret);
 for(const [status,code] of [[403,'GOOGLE_ACCESS'],[404,'GOOGLE_DEPLOYMENT'],[429,'GOOGLE_LIMIT'],[502,'GOOGLE_UPSTREAM'],[405,'GOOGLE_HTTP']]){
  await assert.rejects(()=>requestDrive({action:'ping'},config,async()=>new Response(config.secret,{status})),e=>e.message.includes(code)&&e.message.includes('HTTP '+status)&&!e.message.includes(config.secret));
 }
 await assert.rejects(()=>requestDrive({action:'ping'},config,async()=>{throw new Error('network '+config.secret)}),/GOOGLE_NETWORK/);
 await assert.rejects(()=>requestDrive({action:'ping'},config,async()=>new Response('<html>Script function not found: doPost</html>')),/GOOGLE_SCRIPT/);
 await assert.rejects(()=>requestDrive({action:'ping'},config,async()=>new Response('<html>unrecognized page</html>')),/GOOGLE_NOT_JSON/);
 await assert.rejects(()=>requestDrive({action:'ping'},config,async()=>{const r=new Response('<html>sign in</html>');Object.defineProperty(r,'url',{value:'https://accounts.google.com/ServiceLogin'});return r}),/GOOGLE_SIGN_IN/);
 await assert.rejects(()=>requestDrive({action:'ping'},config,async()=>Response.json({ok:false,error:'Invalid key '+config.secret})),e=>e.message.includes('GOOGLE_SCRIPT_ERROR')&&!e.message.includes(config.secret));
 await assert.rejects(()=>requestDrive({action:'ping'},config,async()=>Response.json({wrong:'shape'})),/GOOGLE_RESPONSE/);
 assert.ok(logs.every(line=>!line.includes(config.secret)&&!line.includes('TEST_DEPLOYMENT')));
} finally {console.error=original;}
console.log('PASS: successful JSON, request body, redirects, access/deployment/server/rate-limit errors, script errors, network failure, and secret-safe diagnostics.');

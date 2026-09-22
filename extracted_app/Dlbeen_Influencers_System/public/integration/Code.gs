const BRANDS = ['DS Labs', 'Dlbeen Care', 'Fidia', 'Potafast', 'Miradent', 'Amani', 'Other'];
const FORMATS = ['Story', 'Reel', 'Post'];
const PLATFORMS = ['Instagram', 'TikTok', 'Facebook', 'YouTube', 'Snapchat'];
const EMPTY = { influencers: [], agreements: [], content: [] };
const FIELDS = {
    influencers: ['id', 'name', 'handle', 'platform', 'profile_url', 'photo_url', 'phone', 'email', 'city', 'language', 'niche', 'followers', 'engagement_rate', 'audience_local_pct', 'owner', 'status', 'notes', 'updated_at'],
    agreements: ['id', 'influencer_id', 'month', 'brand', 'campaign', 'goal', 'stories', 'reels', 'posts', 'fee', 'currency', 'payment_status', 'due_date', 'renewal', 'contract_url', 'usage_rights', 'exclusivity', 'notes', 'updated_at'],
    content: ['id', 'agreement_id', 'title', 'format', 'status', 'due_date', 'published_at', 'post_url', 'reach', 'views', 'likes', 'comments', 'shares', 'saves', 'followers_gained', 'clicks', 'leads', 'orders', 'revenue', 'metric_date', 'evidence_url', 'notes', 'updated_at']
};
const n = (v) => Number(v) || 0;
const fmt = (v) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(v);
function monthLabel(m) { return new Date(m + '-02T12:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }); }
function currentMonth() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Baghdad', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7); }
function progress(a, content) { const done = content.filter(c => c.agreement_id === a.id && c.status === 'Published'); const rows = FORMATS.map((f, i) => ({ format: f, agreed: n(a[['stories', 'reels', 'posts'][i]]), done: done.filter(c => c.format === f).length })); const agreed = rows.reduce((s, r) => s + r.agreed, 0); const credited = rows.reduce((s, r) => s + Math.min(r.agreed, r.done), 0); return { rows, agreed, done: done.length, credited, remaining: rows.reduce((s, r) => s + Math.max(0, r.agreed - r.done), 0), percent: agreed ? Math.round(credited / agreed * 100) : 0 }; }
function summarize(data, filters) {
    const agreements = data.agreements.filter(a => (filters.month === 'all' || a.month === filters.month) && (filters.brand === 'all' || a.brand === filters.brand) && (filters.influencer === 'all' || a.influencer_id === filters.influencer) && a.currency === filters.currency);
    const ids = new Set(agreements.map(a => a.id));
    const content = data.content.filter(c => ids.has(String(c.agreement_id)));
    const published = content.filter(c => c.status === 'Published');
    const add = (key) => published.reduce((s, c) => s + n(c[key]), 0);
    const fee = agreements.reduce((s, a) => s + n(a.fee), 0);
    const engagements = add('likes') + add('comments') + add('shares') + add('saves');
    const reach = add('reach');
    const followers = add('followers_gained');
    const views = add('views');
    const remaining = agreements.reduce((s, a) => s + progress(a, content).remaining, 0);
    const agreed = agreements.reduce((s, a) => s + progress(a, content).agreed, 0);
    const credited = agreements.reduce((s, a) => s + progress(a, content).credited, 0);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Baghdad' }).format(new Date());
    const overdue = agreements.filter(a => a.due_date && String(a.due_date) < today && progress(a, content).remaining > 0);
    const covered = published.filter(c => c.reach !== '' && c.reach !== null && ['likes', 'comments', 'shares', 'saves'].every(k => c[k] !== '' && c[k] !== null));
    const measuredReach = covered.reduce((s, c) => s + n(c.reach), 0);
    const measuredEngagements = covered.reduce((s, c) => s + ['likes', 'comments', 'shares', 'saves'].reduce((t, k) => t + n(c[k]), 0), 0);
    return { agreements, content, published, fee, engagements, reach, followers, views, remaining, agreed, credited, overdue, add, coverage: covered.length, er: measuredReach ? measuredEngagements / measuredReach * 100 : null, cpe: engagements ? fee / engagements : null, cpf: followers ? fee / followers : null, roas: fee ? add('revenue') / fee : null, percent: agreed ? Math.round(credited / agreed * 100) : 0 };
}
function demoData(month) {
    const influencers = [['sample-a', 'Dara • sample', '@dara.sample', 'Erbil', 'Beauty & skincare', 128000, 3.8], ['sample-b', 'Lana • sample', '@lana.sample', 'Sulaymaniyah', 'Lifestyle', 86500, 4.6], ['sample-c', 'Roj • sample', '@roj.sample', 'Baghdad', 'Health & wellness', 215000, 2.9], ['sample-d', 'Nalin • sample', '@nalin.sample', 'Duhok', 'Hair care', 64200, 5.2]].map(x => ({ id: String(x[0]), name: String(x[1]), handle: String(x[2]), city: String(x[3]), niche: String(x[4]), followers: Number(x[5]), engagement_rate: Number(x[6]), platform: 'Instagram', status: 'Active', language: 'Kurdish / Arabic', owner: 'Anas', audience_local_pct: 78, notes: 'Fictional example for exploring the system.' }));
    const agreements = influencers.map((i, j) => ({ id: 'sample-contract-' + j, influencer_id: i.id, month, brand: BRANDS[j], campaign: ['September routine', 'Everyday care', 'Brand awareness', 'Product education'][j], goal: 'Awareness', stories: 4, reels: 2, posts: 0, fee: [750000, 500000, 950000, 400000][j], currency: 'IQD', payment_status: j === 0 ? 'Paid' : 'Pending', due_date: month + '-28', renewal: ['Yes', 'Maybe', 'Yes', 'No'][j], usage_rights: 'Organic reposting, 90 days', notes: '' }));
    const content = [];
    agreements.forEach((a, j) => { for (let k = 0; k < [5, 3, 6, 2][j]; k++)
        content.push({ id: 'sample-content-' + j + '-' + k, agreement_id: a.id, title: k < 2 ? 'Routine reel ' + (k + 1) : 'Product story ' + (k - 1), format: k < 2 ? 'Reel' : 'Story', status: 'Published', published_at: month + '-' + String(5 + k * 2).padStart(2, '0'), reach: 4200 + j * 1350 + k * 500, views: 6800 + j * 1900 + k * 800, likes: 210 + j * 70, comments: 16 + j * 4, shares: 24 + j * 8, saves: 48 + j * 10, followers_gained: 18 + j * 5, clicks: 60 + j * 7, leads: 8 + j, orders: 2 + j, revenue: 85000 * (j + 1), metric_date: month + '-20', notes: 'Example metrics only.' }); });
    return { influencers, agreements, content };
}
function validateRow(entity, row, data) {
    if (typeof row.id !== 'string' || !row.id || row.id.length > 100)
        throw new Error('Invalid record ID.');
    const required = entity === 'influencers' ? ['name', 'platform'] : entity === 'agreements' ? ['influencer_id', 'month', 'brand', 'currency', 'due_date'] : ['agreement_id', 'title', 'format', 'status'];
    for (const k of required)
        if (row[k] === null || row[k] === undefined || String(row[k]).trim() === '')
            throw new Error(k.replaceAll('_', ' ') + ' is required.');
    const counts = ['followers', 'stories', 'reels', 'posts', 'reach', 'views', 'likes', 'comments', 'shares', 'saves', 'followers_gained', 'clicks', 'leads', 'orders'];
    for (const k of [...counts, 'fee', 'revenue', 'engagement_rate', 'audience_local_pct'])
        if (row[k] !== undefined && row[k] !== '' && row[k] !== null) {
            const v = Number(row[k]);
            if (!Number.isFinite(v) || v < 0 || (counts.includes(k) && !Number.isInteger(v)))
                throw new Error(k.replaceAll('_', ' ') + ' must be a valid non-negative ' + (counts.includes(k) ? 'whole number.' : 'number.'));
            if (['engagement_rate', 'audience_local_pct'].includes(k) && v > 100)
                throw new Error(k.replaceAll('_', ' ') + ' cannot exceed 100%.');
        }
    for (const k of ['profile_url', 'post_url', 'contract_url', 'evidence_url'])
        if (row[k] && !/^https?:\/\//i.test(String(row[k])))
            throw new Error(k.replaceAll('_', ' ') + ' must start with https:// or http://.');
    if (entity === 'agreements') {
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(row.month)))
            throw new Error('Use a valid agreement month.');
        if (n(row.stories) + n(row.reels) + n(row.posts) < 1)
            throw new Error('Agree at least one story, reel or post.');
        if (!['IQD', 'USD'].includes(String(row.currency)))
            throw new Error('Choose IQD or USD.');
        if (data && !data.influencers.some(i => i.id === row.influencer_id))
            throw new Error('Choose an existing influencer.');
    }
    if (entity === 'content') {
        if (!FORMATS.includes(String(row.format)))
            throw new Error('Choose a valid format.');
        if (row.status === 'Published' && (!row.published_at || !row.post_url))
            throw new Error('Published content needs a publication date and live link or archived story evidence URL.');
        if (data && !data.agreements.some(a => a.id === row.agreement_id))
            throw new Error('Choose an existing agreement.');
    }
}

/* Dlbeen Influencers System — bound Google Apps Script. */
const DB_ID = '1grmRqJxJlSNv8fo01giN8X7NurMiAOhmSiRQlj_6AOc';
const ROOT_FOLDER_ID = '1_04G_8U1nk5LWgpRDN-821PJi20VzkfV';
const TAB = {influencers:'Influencers',agreements:'Agreements',content:'Content'};
const LIMIT = {influencers:204,agreements:304,content:1504};
function onOpen(){SpreadsheetApp.getUi().createMenu('Dlbeen').addItem('Initialize connection','initializeSystem').addItem('Show connection key','showConnectionKey').addToUi();}
function initializeSystem(){const active=SpreadsheetApp.getActiveSpreadsheet();if(!active||active.getId()!==DB_ID)throw new Error('Install this script in the prepared Dlbeen spreadsheet.');const props=PropertiesService.getScriptProperties();if(!props.getProperty('API_KEY'))props.setProperty('API_KEY',Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,''));const root=DriveApp.getFolderById(ROOT_FOLDER_ID);['Photos','Reports'].forEach(name=>{const key=name.toUpperCase()+'_FOLDER';if(!props.getProperty(key)){const found=root.getFoldersByName(name);props.setProperty(key,(found.hasNext()?found.next():root.createFolder(name)).getId());}});if(!active.getSheetByName('Activity')){const sheet=active.insertSheet('Activity');sheet.appendRow(['Timestamp','Action','Entity','Record ID']);sheet.getRange('A1:D1').setBackground('#084ed3').setFontColor('#ffffff').setFontWeight('bold');sheet.setFrozenRows(1);sheet.setColumnWidths(1,4,180);}active.setSpreadsheetTimeZone('Asia/Baghdad');showConnectionKey();}
function showConnectionKey(){const key=PropertiesService.getScriptProperties().getProperty('API_KEY');if(!key)throw new Error('Run initializeSystem first.');const safe=key.replace(/[^a-f0-9]/g,'');SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput('<div style="font:15px Arial;padding:16px;line-height:1.5"><h2>Dlbeen connection key</h2><p>Copy this key into Settings in your private Dlbeen system. Keep it private; it authorizes access to this database.</p><textarea readonly style="width:100%;height:80px;font:14px monospace">'+safe+'</textarea></div>').setWidth(520).setHeight(260),'Connection key');}
function doGet(){return json_({ok:true,system:'Dlbeen Influencers System',message:'Authenticated POST requests only. No records are exposed here.'});}
function doPost(e){try{if(!e||!e.postData||e.postData.contents.length>3000000)throw new Error('Invalid request.');const p=JSON.parse(e.postData.contents);const expected=PropertiesService.getScriptProperties().getProperty('API_KEY');if(!expected||typeof p.key!=='string'||!equal_(expected,p.key))throw new Error('Invalid connection key.');if(p.action==='ping')return json_({ok:true,system:'Dlbeen Influencers System',spreadsheetId:DB_ID});if(p.action==='list')return json_({ok:true,data:load_()});if(p.action==='upsert')return json_(upsert_(p));if(p.action==='upload')return json_(upload_(p));if(p.action==='image')return json_(image_(p));if(p.action==='report')return json_(report_(p));throw new Error('Unknown action.');}catch(error){return json_({ok:false,error:String(error.message||error)});}}
function equal_(a,b){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
function book_(){return SpreadsheetApp.openById(DB_ID);}
function normalize_(value,key){if(value instanceof Date)return Utilities.formatDate(value,'Asia/Baghdad',key==='month'?'yyyy-MM':'yyyy-MM-dd');return value==null?'':value;}
function load_(){const book=book_();const data={};Object.keys(TAB).forEach(entity=>{const sheet=book.getSheetByName(TAB[entity]);if(!sheet)throw new Error('Missing database sheet: '+TAB[entity]);const size=Math.max(0,Math.min(sheet.getLastRow(),LIMIT[entity])-4);const rows=size?sheet.getRange(5,1,size,FIELDS[entity].length).getValues():[];data[entity]=rows.filter(row=>row[0]!==''&&row[0]!=null).map(row=>Object.fromEntries(FIELDS[entity].map((k,j)=>[k,normalize_(row[j],k)])));});return data;}
function safeCell_(v){return typeof v==='string'&&/^[=+@-]/.test(v)?"'"+v:v==null?'':v;}
function upsert_(p){if(!Object.prototype.hasOwnProperty.call(TAB,p.entity)||!p.row)throw new Error('Invalid record type.');const lock=LockService.getScriptLock();if(!lock.tryLock(25000))throw new Error('Another save is in progress. Please try again.');try{const data=load_();const row=Object.fromEntries(FIELDS[p.entity].map(k=>[k,p.row[k]??'']));validateRow(p.entity,row,data);const statuses={influencers:['Active','Prospect','Paused','Archived'],content:['Planned','Draft','In review','Revision needed','Approved','Published']};if(statuses[p.entity]&&!statuses[p.entity].includes(row.status))throw new Error('Invalid status.');if(p.entity==='agreements'&&!['Yes','No','Maybe'].includes(row.renewal))throw new Error('Choose Yes, No or Maybe.');if(p.entity==='agreements'&&!BRANDS.includes(row.brand))throw new Error('Choose a valid brand.');const existing=data[p.entity].find(r=>r.id===row.id);if(existing&&String(existing.updated_at||'')!==String(p.expectedUpdatedAt||''))throw new Error('This record changed since you opened it. Refresh and try again.');if(p.entity==='content'&&row.post_url&&data.content.some(c=>c.id!==row.id&&c.agreement_id===row.agreement_id&&c.post_url===row.post_url))throw new Error('This content URL already exists in the agreement. Use a unique link or evidence file per story frame.');const sheet=book_().getSheetByName(TAB[p.entity]);const ids=sheet.getRange(5,1,LIMIT[p.entity]-4,1).getValues().map(v=>String(v[0]));const index=ids.indexOf(row.id);const target=index>=0?index:ids.indexOf('');if(target<0)throw new Error('Prepared database capacity reached. Extend data and report formula ranges before adding more records.');row.updated_at=new Date().toISOString();const range=sheet.getRange(target+5,1,1,FIELDS[p.entity].length);range.setValues([FIELDS[p.entity].map(k=>safeCell_(row[k]))]);SpreadsheetApp.flush();const audit=book_().getSheetByName('Activity');if(audit)audit.appendRow([new Date().toISOString(),existing?'Update':'Create',p.entity,row.id]);return {ok:true,row};}finally{lock.releaseLock();}}
function photoFolder_(){const id=PropertiesService.getScriptProperties().getProperty('PHOTOS_FOLDER');if(!id)throw new Error('Initialize the connection first.');return DriveApp.getFolderById(id);}
function upload_(p){if(!['image/jpeg','image/png','image/webp'].includes(p.mime)||typeof p.base64!=='string')throw new Error('Use JPG, PNG or WebP.');const bytes=Utilities.base64Decode(p.base64);if(bytes.length>2*1024*1024)throw new Error('Photo exceeds 2 MB.');const file=photoFolder_().createFile(Utilities.newBlob(bytes,p.mime,String(p.name||'profile').replace(/[\\/]/g,'-')));return {ok:true,id:file.getId()};}
function image_(p){if(!/^[a-zA-Z0-9_-]+$/.test(String(p.id)))throw new Error('Invalid photo ID.');const f=DriveApp.getFileById(p.id);const parents=f.getParents();let allowed=false;const folder=photoFolder_().getId();while(parents.hasNext())if(parents.next().getId()===folder)allowed=true;if(!allowed||!['image/jpeg','image/png','image/webp'].includes(f.getMimeType())||f.getSize()>2*1024*1024)throw new Error('Photo unavailable.');return {ok:true,mime:f.getMimeType(),base64:Utilities.base64Encode(f.getBlob().getBytes())};}
function report_(p){if(!['pdf','xlsx'].includes(p.format))throw new Error('Unsupported report format.');const f=p.filters;if(!f||!['IQD','USD'].includes(f.currency)||!(f.month==='all'||/^\d{4}-(0[1-9]|1[0-2])$/.test(f.month)))throw new Error('Invalid report filters.');const data=load_();const s=summarize(data,f);const title='Dlbeen Influencers Report — '+f.month+' — '+f.currency;const temp=SpreadsheetApp.create(title);try{const summary=temp.getSheets()[0];summary.setName('Summary');const rows=[['Dlbeen Influencers System',''],['Report period',f.month],['Brand',f.brand],['Currency',f.currency],['Influencer',f.influencer==='all'?'All influencers':(data.influencers.find(i=>i.id===f.influencer)?.name||'Selected influencer')],['Agreements',s.agreements.length],['Agreed content',s.agreed],['Credited delivery',s.credited],['Remaining',s.remaining],['Committed fees',s.fee],['Reported reach (sum)',s.reach],['Views',s.views],['Likes',s.add('likes')],['Comments',s.add('comments')],['Shares',s.add('shares')],['Saves',s.add('saves')],['Attributed followers',s.followers],['Clicks',s.add('clicks')],['Leads',s.add('leads')],['Orders',s.add('orders')],['Attributed revenue',s.add('revenue')],['Engagement rate (%)',s.er===null?'Unreported':s.er],['Cost per engagement',s.cpe===null?'Unavailable':s.cpe],['Cost per follower',s.cpf===null?'Unavailable':s.cpf],['Revenue / committed fees',s.roas===null?'Unavailable':s.roas],['Complete ER metric records',s.coverage+' / '+s.published.length],['Manager notes',String(p.notes||'')],['Measurement basis','Agreement month; Published content only. Reach is summed, not deduplicated. ER uses fully measured items. Followers, orders and revenue are manually attributed. Fees include unpaid commitments. Missing metrics are unreported.']];writeReportSheet_(summary,rows,2);summary.setColumnWidth(1,240);summary.setColumnWidth(2,600);summary.getRange(rows.length-1,1,2,2).setWrap(true);summary.setRowHeight(rows.length-1,90);summary.setRowHeight(rows.length,90);
const byId=id=>data.influencers.find(i=>i.id===id)?.name||'Unknown';const agreements=[['Influencer','Brand','Month','Stories done / agreed','Reels done / agreed','Posts done / agreed','Remaining','Fee','Currency','Payment','Renewal']].concat(s.agreements.map(a=>{const pr=progress(a,data.content);return [byId(a.influencer_id),a.brand,a.month,...pr.rows.map(x=>x.done+' / '+x.agreed),pr.remaining,a.fee,a.currency,a.payment_status,a.renewal]}));writeReportSheet_(temp.insertSheet('Agreement results'),agreements,11);const content=[['Creator','Brand','Content','Format','Status','Reach','Views','Likes','Comments','Shares','Saves','Followers gained']].concat(s.content.map(c=>{const a=data.agreements.find(a=>a.id===c.agreement_id);return [byId(a?.influencer_id),a?.brand||'',c.title,c.format,c.status,...['reach','views','likes','comments','shares','saves','followers_gained'].map(k=>c[k]??'')]}));writeReportSheet_(temp.insertSheet('Content results'),content,12);SpreadsheetApp.flush();const url='https://docs.google.com/spreadsheets/d/'+temp.getId()+'/export?format='+p.format+(p.format==='pdf'?'&portrait=false&size=A4&fitw=true&sheetnames=true&printtitle=false&pagenumbers=true&gridlines=false&fzr=true':'');const response=UrlFetchApp.fetch(url,{headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},muteHttpExceptions:true});if(response.getResponseCode()!==200)throw new Error('Google export failed; retry in a moment.');const folder=PropertiesService.getScriptProperties().getProperty('REPORTS_FOLDER');if(!folder)throw new Error('Initialize the connection first.');const file=DriveApp.getFolderById(folder).createFile(response.getBlob().setName(title+'.'+p.format));return {ok:true,id:file.getId(),url:file.getUrl()};}finally{DriveApp.getFileById(temp.getId()).setTrashed(true);}}
function writeReportSheet_(sheet,rows,columns){sheet.getRange(1,1,rows.length,columns).setValues(rows.map(row=>row.map(safeCell_)));sheet.getRange(1,1,1,columns).setBackground('#084ed3').setFontColor('#ffffff').setFontWeight('bold');sheet.getDataRange().setFontFamily('Arial').setFontSize(11).setVerticalAlignment('middle');sheet.setColumnWidths(1,columns,145);sheet.setColumnWidth(1,220);sheet.setFrozenRows(1);sheet.setHiddenGridlines(true);sheet.getDataRange().setWrap(true);}

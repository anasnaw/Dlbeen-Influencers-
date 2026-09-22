export const BRANDS = ['DS Labs','Dlbeen Care','Fidia','Potafast','Miradent','Amani','Other'];
export const FORMATS = ['Story','Reel','Post'];
export const PLATFORMS = ['Instagram','TikTok','Facebook','YouTube','Snapchat'];
export type RecordRow = {id:string; [key:string]: string | number | null};
export type Data = {influencers:RecordRow[]; agreements:RecordRow[]; content:RecordRow[]};
export const EMPTY:Data={influencers:[],agreements:[],content:[]};
export const FIELDS = {
 influencers:['id','name','handle','platform','profile_url','photo_url','phone','email','city','language','niche','followers','engagement_rate','audience_local_pct','owner','status','notes','updated_at'],
 agreements:['id','influencer_id','month','brand','campaign','goal','stories','reels','posts','fee','currency','payment_status','due_date','renewal','contract_url','usage_rights','exclusivity','notes','updated_at'],
 content:['id','agreement_id','title','format','status','due_date','published_at','post_url','reach','views','likes','comments','shares','saves','followers_gained','clicks','leads','orders','revenue','metric_date','evidence_url','notes','updated_at']
} as const;
export type Entity = keyof typeof FIELDS;
export const n=(v:unknown)=>Number(v)||0;
export const fmt=(v:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(v);
export function monthLabel(m:string){return new Date(m+'-02T12:00:00').toLocaleDateString('en-GB',{month:'long',year:'numeric'});}
export function currentMonth(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Baghdad',year:'numeric',month:'2-digit'}).format(new Date()).slice(0,7);}
export function progress(a:RecordRow, content:RecordRow[]){const done=content.filter(c=>c.agreement_id===a.id&&c.status==='Published');const rows=FORMATS.map((f,i)=>({format:f,agreed:n(a[['stories','reels','posts'][i]]),done:done.filter(c=>c.format===f).length}));const agreed=rows.reduce((s,r)=>s+r.agreed,0);const credited=rows.reduce((s,r)=>s+Math.min(r.agreed,r.done),0);return {rows,agreed,done:done.length,credited,remaining:rows.reduce((s,r)=>s+Math.max(0,r.agreed-r.done),0),percent:agreed?Math.round(credited/agreed*100):0};}
export type Filters={month:string;brand:string;influencer:string;currency:string};
export function summarize(data:Data, filters:Filters){
 const agreements=data.agreements.filter(a=>(filters.month==='all'||a.month===filters.month)&&(filters.brand==='all'||a.brand===filters.brand)&&(filters.influencer==='all'||a.influencer_id===filters.influencer)&&a.currency===filters.currency);
 const ids=new Set(agreements.map(a=>a.id));const content=data.content.filter(c=>ids.has(String(c.agreement_id)));const published=content.filter(c=>c.status==='Published');
 const add=(key:string)=>published.reduce((s,c)=>s+n(c[key]),0);const fee=agreements.reduce((s,a)=>s+n(a.fee),0);const engagements=add('likes')+add('comments')+add('shares')+add('saves');const reach=add('reach');const followers=add('followers_gained');const views=add('views');const remaining=agreements.reduce((s,a)=>s+progress(a,content).remaining,0);const agreed=agreements.reduce((s,a)=>s+progress(a,content).agreed,0);const credited=agreements.reduce((s,a)=>s+progress(a,content).credited,0);
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Baghdad'}).format(new Date());const overdue=agreements.filter(a=>a.due_date&&String(a.due_date)<today&&progress(a,content).remaining>0);
 const covered=published.filter(c=>c.reach!==''&&c.reach!==null&&['likes','comments','shares','saves'].every(k=>c[k]!==''&&c[k]!==null));const measuredReach=covered.reduce((s,c)=>s+n(c.reach),0);const measuredEngagements=covered.reduce((s,c)=>s+['likes','comments','shares','saves'].reduce((t,k)=>t+n(c[k]),0),0);
 return {agreements,content,published,fee,engagements,reach,followers,views,remaining,agreed,credited,overdue,add,coverage:covered.length,er:measuredReach?measuredEngagements/measuredReach*100:null,cpe:engagements?fee/engagements:null,cpf:followers?fee/followers:null,roas:fee?add('revenue')/fee:null,percent:agreed?Math.round(credited/agreed*100):0};
}
export function demoData(month:string):Data{
 const influencers=[['sample-a','Dara • sample','@dara.sample','Erbil','Beauty & skincare',128000,3.8],['sample-b','Lana • sample','@lana.sample','Sulaymaniyah','Lifestyle',86500,4.6],['sample-c','Roj • sample','@roj.sample','Baghdad','Health & wellness',215000,2.9],['sample-d','Nalin • sample','@nalin.sample','Duhok','Hair care',64200,5.2]].map(x=>({id:String(x[0]),name:String(x[1]),handle:String(x[2]),city:String(x[3]),niche:String(x[4]),followers:Number(x[5]),engagement_rate:Number(x[6]),platform:'Instagram',status:'Active',language:'Kurdish / Arabic',owner:'Anas',audience_local_pct:78,notes:'Fictional example for exploring the system.'}));
 const agreements=influencers.map((i,j)=>({id:'sample-contract-'+j,influencer_id:i.id,month,brand:BRANDS[j],campaign:['September routine','Everyday care','Brand awareness','Product education'][j],goal:'Awareness',stories:4,reels:2,posts:0,fee:[750000,500000,950000,400000][j],currency:'IQD',payment_status:j===0?'Paid':'Pending',due_date:month+'-28',renewal:['Yes','Maybe','Yes','No'][j],usage_rights:'Organic reposting, 90 days',notes:''}));
 const content:RecordRow[]=[];agreements.forEach((a,j)=>{for(let k=0;k<[5,3,6,2][j];k++)content.push({id:'sample-content-'+j+'-'+k,agreement_id:a.id,title:k<2?'Routine reel '+(k+1):'Product story '+(k-1),format:k<2?'Reel':'Story',status:'Published',published_at:month+'-'+String(5+k*2).padStart(2,'0'),reach:4200+j*1350+k*500,views:6800+j*1900+k*800,likes:210+j*70,comments:16+j*4,shares:24+j*8,saves:48+j*10,followers_gained:18+j*5,clicks:60+j*7,leads:8+j,orders:2+j,revenue:85000*(j+1),metric_date:month+'-20',notes:'Example metrics only.'});});return {influencers,agreements,content};
}
export function validateRow(entity:Entity,row:RecordRow,data?:Data){
 if(typeof row.id!=='string'||!row.id||row.id.length>100)throw new Error('Invalid record ID.');
 const required=entity==='influencers'?['name','platform']:entity==='agreements'?['influencer_id','month','brand','currency','due_date']:['agreement_id','title','format','status'];
 for(const k of required)if(row[k]===null||row[k]===undefined||String(row[k]).trim()==='')throw new Error(k.replaceAll('_',' ')+' is required.');
 const counts=['followers','stories','reels','posts','reach','views','likes','comments','shares','saves','followers_gained','clicks','leads','orders'];
 for(const k of [...counts,'fee','revenue','engagement_rate','audience_local_pct'])if(row[k]!==undefined&&row[k]!==''&&row[k]!==null){const v=Number(row[k]);if(!Number.isFinite(v)||v<0||(counts.includes(k)&&!Number.isInteger(v)))throw new Error(k.replaceAll('_',' ')+' must be a valid non-negative '+(counts.includes(k)?'whole number.':'number.'));if(['engagement_rate','audience_local_pct'].includes(k)&&v>100)throw new Error(k.replaceAll('_',' ')+' cannot exceed 100%.');}
 for(const k of ['profile_url','post_url','contract_url','evidence_url'])if(row[k]&&!/^https?:\/\//i.test(String(row[k])))throw new Error(k.replaceAll('_',' ')+' must start with https:// or http://.');
 if(entity==='agreements'){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(row.month)))throw new Error('Use a valid agreement month.');if(n(row.stories)+n(row.reels)+n(row.posts)<1)throw new Error('Agree at least one story, reel or post.');if(!['IQD','USD'].includes(String(row.currency)))throw new Error('Choose IQD or USD.');if(data&&!data.influencers.some(i=>i.id===row.influencer_id))throw new Error('Choose an existing influencer.');}
 if(entity==='content'){if(!FORMATS.includes(String(row.format)))throw new Error('Choose a valid format.');if(row.status==='Published'&&(!row.published_at||!row.post_url))throw new Error('Published content needs a publication date and live link or archived story evidence URL.');if(data&&!data.agreements.some(a=>a.id===row.agreement_id))throw new Error('Choose an existing agreement.');}
}

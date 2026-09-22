import fs from 'node:fs/promises';
import ts from 'typescript';
const source=await fs.readFile('lib/model.ts','utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext}}).outputText.replace(/^export /gm,'');
const info=JSON.parse(await fs.readFile('lib/drive-info.json','utf8'));
const backend=(await fs.readFile('integration/backend-template.gs','utf8')).replace('__SPREADSHEET_ID__',info.spreadsheetId);
await fs.mkdir('public/integration',{recursive:true});await fs.writeFile('public/integration/Code.gs',compiled+'\n'+backend);

import {openDB} from 'idb';
import {importUoBudget,type ImportResult} from './uoBudget';
export type Draft={id:string;fileName:string;bytes:ArrayBuffer;result:ImportResult;uoName:string;status:'review'|'ready';updatedAt:string};
const DB='utvecklingsanalys-imports',STORE='drafts';
async function db(){return openDB(DB,1,{upgrade(d){d.createObjectStore(STORE,{keyPath:'id'});}});}
export async function listDrafts():Promise<Draft[]>{return (await (await db()).getAll(STORE)).sort((a:Draft,b:Draft)=>b.updatedAt.localeCompare(a.updatedAt));}
export async function storeDraft(draft:Draft){await (await db()).put(STORE,draft);}
export async function deleteDraft(id:string){await (await db()).delete(STORE,id);}
export function canApprove(d:Draft){return !!d.uoName.trim()&&!d.result.issues.some(i=>i.severity==='error')&&d.result.facts.length>0;}
export async function readDraft(file:File):Promise<Draft>{
 if(!/\.xlsx$/i.test(file.name))throw new Error('Välj en Excel-fil i XLSX-format.');
 if(file.size>15*1024*1024)throw new Error('Filen är större än gränsen 15 MB.');
 const bytes=await file.arrayBuffer();const result=await importUoBudget(bytes);
 const draft:Draft={id:crypto.randomUUID(),fileName:file.name,bytes,result,uoName:result.uo,status:'review',updatedAt:new Date().toISOString()};
 await storeDraft(draft);return draft;
}

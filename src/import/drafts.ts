import {readConfiguration,commitConfiguration,revisions} from '../config/store';
import {openDB} from 'idb';
import {importUoBudget,type Mapping,type ImportResult} from './uoBudget';
export type Draft={id:string;fileName:string;bytes:ArrayBuffer;result:ImportResult;uoName:string;status:'review'|'ready';updatedAt:string;mapping?:Mapping};
const DB='utvecklingsanalys-imports',STORE='drafts';
async function db(){return openDB(DB,1,{upgrade(d){d.createObjectStore(STORE,{keyPath:'id'});}});}
export async function listDrafts():Promise<Draft[]>{return (await (await db()).getAll(STORE)).sort((a:Draft,b:Draft)=>b.updatedAt.localeCompare(a.updatedAt));}
export async function storeDraft(draft:Draft){await (await db()).put(STORE,draft);}
export async function deleteDraft(id:string){await (await db()).delete(STORE,id);}
export function canApprove(d:Draft){return !!d.uoName.trim()&&!d.result.issues.some(i=>i.severity==='error')&&d.result.facts.length>0;}
export async function applyMapping(draft:Draft,mapping:Mapping):Promise<Draft>{const result=await importUoBudget(draft.bytes,mapping);const next={...draft,mapping,result,uoName:result.uo||draft.uoName,status:'review' as const,updatedAt:new Date().toISOString()};await storeDraft(next);return next;}
export async function readDraft(file:File):Promise<Draft>{
 if(!/\.xlsx$/i.test(file.name))throw new Error('Välj en Excel-fil i XLSX-format.');
 if(file.size>15*1024*1024)throw new Error('Filen är större än gränsen 15 MB.');
 const bytes=await file.arrayBuffer();const result=await importUoBudget(bytes);
 const draft:Draft={id:crypto.randomUUID(),fileName:file.name,bytes,result,uoName:result.uo,status:'review',updatedAt:new Date().toISOString()};
 await storeDraft(draft);return draft;
}

const PROFILE_DB='utvecklingsanalys-mappings';
async function mappingDb(){return openDB(PROFILE_DB,1,{upgrade(d){d.createObjectStore('profiles');}});}
export async function saveMapping(name:string,mapping:Mapping):Promise<void>{if(!name.trim())throw new Error('Profilnamn saknas');const config=await readConfiguration();if(config){const history=await revisions();await commitConfiguration({...config,sections:{...config.sections,mappings:{...config.sections.mappings,[name.trim()]:mapping}}},'Update mapping '+name.trim(),history.at(-1)?.id);return;}await (await mappingDb()).put('profiles',mapping,name.trim());}
export async function listMappings():Promise<{name:string;mapping:Mapping}[]>{const config=await readConfiguration();if(config?.sections.mappings)return Object.entries(config.sections.mappings).map(([name,mapping])=>({name,mapping}));const d=await mappingDb();const names=await d.getAllKeys('profiles');return Promise.all(names.map(async name=>({name:String(name),mapping:await d.get('profiles',name) as Mapping})));}

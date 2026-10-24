import {openDB} from 'idb';
import type {ImportResult} from './uoBudget';

/** Persisted committed budget-source metadata for cross-database recovery. */
export type Draft={id:string;fileName:string;bytes:ArrayBuffer;result:ImportResult;uoName:string;status:'review'|'ready';updatedAt:string};
const DB='utvecklingsanalys-imports',STORE='drafts';
async function db(){return openDB(DB,1,{upgrade(d){d.createObjectStore(STORE,{keyPath:'id'});}});}
export async function listDrafts():Promise<Draft[]>{return (await (await db()).getAll(STORE)).sort((a:Draft,b:Draft)=>b.updatedAt.localeCompare(a.updatedAt));}
export async function storeDraft(draft:Draft){await (await db()).put(STORE,draft);}
export async function deleteDraft(id:string){await (await db()).delete(STORE,id);}

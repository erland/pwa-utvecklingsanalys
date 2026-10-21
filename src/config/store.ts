import {openDB} from 'idb';
import type {Allocations} from '../allocations/model';
import type {Mapping} from '../import/uoBudget';
import {buildPackage,mergedPackage,parsePackage,type ConfigPackage} from './packages';
const DB='utvecklingsanalys-configuration';
export type ConfigRevision={id:string;createdAt:string;reason:string;data:ConfigPackage};
async function database(){return openDB(DB,1,{upgrade(db){db.createObjectStore('current');db.createObjectStore('history',{keyPath:'id'});}})}
export async function readConfiguration():Promise<ConfigPackage|null>{return (await (await database()).get('current','active') as ConfigPackage|undefined)??null}
export async function initializeConfiguration(legacyAllocations:Allocations,legacyMappings:Record<string,Mapping>={}):Promise<ConfigPackage>{
 const db=await database();const tx=db.transaction(['current','history'],'readwrite');
 const existing=await tx.objectStore('current').get('active') as ConfigPackage|undefined;
 if(existing){await tx.done;return parsePackage(existing)}
 const initial=buildPackage(legacyAllocations,legacyMappings,'full-configuration');
 const revision:ConfigRevision={id:crypto.randomUUID(),createdAt:new Date().toISOString(),reason:'Initial import of legacy configuration',data:initial};
 await tx.objectStore('current').put(initial,'active');await tx.objectStore('history').put(revision);await tx.done;return initial;
}
/** Current configuration and its immutable revision commit in the same IndexedDB transaction. */
export async function commitConfiguration(next:ConfigPackage,reason:string,expectedRevision?:string):Promise<string>{
 const verified=parsePackage(next);if(!reason.trim())throw new Error('REASON_REQUIRED');
 const db=await database();const tx=db.transaction(['current','history'],'readwrite');
 const current=await tx.objectStore('current').get('active') as ConfigPackage|undefined;
 const revisions=await tx.objectStore('history').getAll() as ConfigRevision[];
 const last=revisions.sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id)).at(-1)?.id;
 if(expectedRevision!==undefined&&expectedRevision!==last){tx.abort();throw new Error('REVISION_CONFLICT')}
 if(current&&JSON.stringify(current.sections)===JSON.stringify(verified.sections)){await tx.done;return last??''}
 const id=crypto.randomUUID();const revision:ConfigRevision={id,createdAt:new Date().toISOString(),reason,data:verified};
 await tx.objectStore('current').put(verified,'active');await tx.objectStore('history').put(revision);await tx.done;return id;
}
export async function revisions():Promise<ConfigRevision[]>{return (await (await database()).getAll('history') as ConfigRevision[]).sort((a,b)=>a.createdAt.localeCompare(b.createdAt))}
export async function restoreRevision(id:string,expectedRevision?:string){const found=(await revisions()).find(r=>r.id===id);if(!found)throw new Error('REVISION_NOT_FOUND');return commitConfiguration(found.data,'Restore revision '+id,expectedRevision)}
export async function importConfiguration(incoming:unknown,policy:'reject'|'replace',expectedRevision?:string){
 const p=parsePackage(incoming);const current=await readConfiguration();const next=current?mergedPackage(current,p,policy):p;
 return commitConfiguration(next,'Import configuration',expectedRevision);
}

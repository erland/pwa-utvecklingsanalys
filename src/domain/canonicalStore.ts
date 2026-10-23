import {openDB} from 'idb';
import {emptyCanonical,validateCanonical,type CanonicalDataset} from './canonical';
import {canonicalFromBudget,replaceCanonicalSource} from './canonicalImport';
import type {ImportResult} from '../import/uoBudget';
const DB='utvecklingsanalys-canonical-v2';
async function db(){return openDB(DB,1,{upgrade(d){d.createObjectStore('datasets')}})}
export async function loadCanonical():Promise<CanonicalDataset>{
 const data=await (await db()).get('datasets','active') as CanonicalDataset|undefined;
 if(!data)return emptyCanonical();
 const errors=validateCanonical(data);if(errors.length)throw new Error(errors.join(','));
 return data;
}
export async function saveCanonical(data:CanonicalDataset):Promise<void>{
 const errors=validateCanonical(data);if(errors.length)throw new Error(errors.join(','));
 await (await db()).put('datasets',data,'active');
}
/** Explicitly committed only after import review; does not touch legacy semantic data. */
export async function commitCanonicalBudget(result:ImportResult,datasetId:string,includeMatrix=false):Promise<void>{
 const next=replaceCanonicalSource(await loadCanonical(),canonicalFromBudget(result,datasetId,includeMatrix),datasetId);
 await saveCanonical(next);
}
export async function removeCanonicalSources(ids:string[]):Promise<void>{
 const original=await loadCanonical();
 await saveCanonical({...original,records:original.records.filter(r=>!r.source||!ids.includes(r.source.datasetId))});
}

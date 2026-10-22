/** Reset only this application's known stores; never clear arbitrary browser-origin storage. */
export type ResetScope='data'|'configuration'|'all';
export const DATA_STORES:Readonly<Record<string,readonly string[]>>={
 'utvecklingsanalys':['projects'],
 'utvecklingsanalys-semantic':['datasets'],
 'utvecklingsanalys-canonical-v2':['datasets'],
 'utvecklingsanalys-planning':['state'],
 'utvecklingsanalys-imports':['drafts'],
 'utvecklingsanalys-information-gaps':['state'],
 'utvecklingsanalys-recovery':['restore'],
 'utvecklingsanalys-source-recovery':['snapshots']
};
export const CONFIG_STORES:Readonly<Record<string,readonly string[]>>={
 'utvecklingsanalys-configuration':['current','history'],
 'utvecklingsanalys-mappings':['profiles'],
 'utvecklingsanalys-allocations':['state']
};
export function storesForReset(scope:ResetScope):Record<string,readonly string[]>{
 return {...(scope==='configuration'?{}:DATA_STORES),...(scope==='data'?{}:CONFIG_STORES)};
}
/** Clears existing stores without upgrading schema; missing databases are not created. */
export async function resetLocalWorkspace(scope:ResetScope):Promise<void>{
 const targets=storesForReset(scope);
 const existing=new Set((await indexedDB.databases()).map(d=>d.name).filter((n):n is string=>Boolean(n)));
 for(const [name,names] of Object.entries(targets)){
  if(!existing.has(name))continue;
  await new Promise<void>((resolve,reject)=>{
   const request=indexedDB.open(name);
   request.onerror=()=>reject(request.error??new Error('RESET_DB_OPEN_FAILED'));
   request.onupgradeneeded=()=>{request.transaction?.abort();reject(new Error('RESET_UNEXPECTED_SCHEMA'))};
   request.onsuccess=()=>{
    const db=request.result;
    const stores=names.filter(n=>db.objectStoreNames.contains(n));
    if(!stores.length){db.close();resolve();return}
    try{
     const tx=db.transaction(stores,'readwrite');
     tx.oncomplete=()=>{db.close();resolve()};
     tx.onerror=()=>{const e=tx.error;db.close();reject(e??new Error('RESET_TRANSACTION_FAILED'))};
     tx.onabort=()=>{const e=tx.error;db.close();reject(e??new Error('RESET_TRANSACTION_ABORTED'))};
     for(const store of stores)tx.objectStore(store).clear();
    }catch(e){db.close();reject(e)}
   };
  });
 }
}

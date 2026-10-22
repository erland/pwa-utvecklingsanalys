import {test,expect} from '@playwright/test';
test('full reset clears app data and configuration without touching unrelated storage',async({page})=>{
 await page.goto('./');
 await page.evaluate(async()=>{
  const put=(name:string,store:string,key:string,value:unknown)=>new Promise<void>((resolve,reject)=>{
   const request=indexedDB.open(name,1);
   request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(store))request.result.createObjectStore(store)};
   request.onerror=()=>reject(request.error);
   request.onsuccess=()=>{const db=request.result,tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value,key);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)};
  });
  await put('utvecklingsanalys-semantic','datasets','active',{marker:'semantic'});
  await put('utvecklingsanalys-configuration','current','active',{marker:'configuration'});
  await put('unrelated-app','state','keep','untouched');
 });
 await page.getByRole('button',{name:'Inställningar'}).click();
 await page.getByLabel('Bekräfta återställning').fill('ÅTERSTÄLL');
 await page.getByRole('button',{name:'Genomför vald återställning'}).click();
 await expect(page.getByRole('heading',{name:'Överblick över verksamhetsutvecklingen'})).toBeVisible();
 const result=await page.evaluate(async()=>{
  const get=(name:string,store:string,key:string)=>new Promise<unknown>((resolve,reject)=>{
   const request=indexedDB.open(name);request.onerror=()=>reject(request.error);
   request.onsuccess=()=>{const db=request.result,tx=db.transaction(store,'readonly'),value=tx.objectStore(store).get(key);value.onsuccess=()=>{db.close();resolve(value.result)};value.onerror=()=>reject(value.error)};
  });
  return {semantic:await get('utvecklingsanalys-semantic','datasets','active'),configuration:await get('utvecklingsanalys-configuration','current','active'),unrelated:await get('unrelated-app','state','keep')};
 });
 expect(result.semantic).toBeUndefined();
 expect(result.configuration).toBeUndefined();
 expect(result.unrelated).toBe('untouched');
});

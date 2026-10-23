import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
test('backup v3 preserves stored workbook bytes and drafts across browser profiles',async({browser})=>{
 const left=await browser.newContext({acceptDownloads:true}),a=await left.newPage();await a.goto('./');await a.getByRole('button',{name:'Inställningar'}).click();
 await expect(a.locator('#project-name')).toBeEnabled();
 await a.evaluate(async()=>{
  const request=indexedDB.open('utvecklingsanalys-imports',1);
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{request.onupgradeneeded=()=>request.result.createObjectStore('drafts',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
  const draft={id:'draft-1',fileName:'original.xlsx',bytes:new Uint8Array([1,2,3,4,5]).buffer,result:{profile:'uo-budget-2027-v1',uo:'UO A',excludedSheets:[],facts:[],issues:[]},uoName:'UO A',status:'review',updatedAt:'2026-10-21'};
  await new Promise<void>((resolve,reject)=>{const t=db.transaction('drafts','readwrite');t.objectStore('drafts').put(draft);t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error)});db.close();
 });
 const downloadPromise=a.waitForEvent('download');await a.getByRole('button',{name:'Ladda ner projektbackup'}).click();const file=await downloadPromise;const bytes=await readFile((await file.path())!);
 const archived=JSON.parse(bytes.toString('utf8'));expect(archived.version).toBe(3);expect(archived.canonical).toMatchObject({schemaVersion:2,records:[]});expect(archived.drafts[0].bytesBase64).toBe('AQIDBAU=');
 await left.close();
 const right=await browser.newContext(),b=await right.newPage();await b.goto('./');await b.getByRole('button',{name:'Inställningar'}).click();
 await b.getByLabel('Välj projektbackup').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:bytes});
 await b.getByRole('button',{name:'Bekräfta återställning'}).click();
 await expect(b.getByRole('status')).toContainText('Projekt återställt');
 const result=await b.evaluate(async()=>{const request=indexedDB.open('utvecklingsanalys-imports');const db=await new Promise<IDBDatabase>((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});const draft=await new Promise<{bytes:ArrayBuffer}>((resolve,reject)=>{const t=db.transaction('drafts');const r=t.objectStore('drafts').get('draft-1');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});db.close();return Array.from(new Uint8Array(draft.bytes))});
 expect(result).toEqual([1,2,3,4,5]);await right.close();
});

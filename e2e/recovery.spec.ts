import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('startup recovers interrupted multi-store restoration from journal',async({page})=>{
 await page.goto('./');
 await page.getByRole('button',{name:'Inställningar'}).click();
 const event=page.waitForEvent('download');
 await page.getByRole('button',{name:'Ladda ner projektbackup'}).click();
 const backup=JSON.parse(await readFile((await (await event).path())!,'utf8'));
 await page.evaluate(async original=>{
  const open=(name:string,store:string)=>new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open(name,1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(store))request.result.createObjectStore(store)};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
  const journal=await open('utvecklingsanalys-recovery','restore');
  await new Promise<void>((resolve,reject)=>{const tx=journal.transaction('restore','readwrite');tx.objectStore('restore').put(original,'pending');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});
  journal.close();
  const db=await open('utvecklingsanalys','projects');
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction('projects','readwrite');tx.objectStore('projects').put({...original.project,name:'Interrupted replacement'},'active');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});
  db.close();
 },backup);
 await page.reload();
 await expect(page.locator('.topbar strong')).toHaveText(backup.project.name);
 await expect.poll(async()=>page.evaluate(async()=>{const request=indexedDB.open('utvecklingsanalys-recovery');const db=await new Promise<IDBDatabase>((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});const pending=await new Promise((resolve,reject)=>{const tx=db.transaction('restore');const r=tx.objectStore('restore').get('pending');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});db.close();return Boolean(pending)})).toBe(false);
});

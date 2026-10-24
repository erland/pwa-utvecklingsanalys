import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('backup v3 restores project and canonical data across browser profiles without legacy drafts',async({browser})=>{
 const left=await browser.newContext({acceptDownloads:true}),a=await left.newPage();
 await a.goto('./');
 await a.getByRole('button',{name:'Inställningar'}).click();
 await expect(a.locator('#project-name')).toBeEnabled();
 const downloadPromise=a.waitForEvent('download');
 await a.getByRole('button',{name:'Ladda ner projektbackup'}).click();
 const file=await downloadPromise;
 const bytes=await readFile((await file.path())!);
 const archived=JSON.parse(bytes.toString('utf8'));
 expect(archived.version).toBe(3);
 expect(archived.canonical).toMatchObject({schemaVersion:2,records:[]});
 expect(archived.drafts).toEqual([]);
 await left.close();

 const right=await browser.newContext(),b=await right.newPage();
 await b.goto('./');
 await b.getByRole('button',{name:'Inställningar'}).click();
 await b.getByLabel('Välj projektbackup').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:bytes});
 await b.getByRole('button',{name:'Bekräfta återställning'}).click();
 await expect(b.getByRole('status')).toContainText('Projekt återställt');
 const restored=await b.evaluate(async()=>{
  const request=indexedDB.open('utvecklingsanalys-imports');
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
  const hasDraftStore=db.objectStoreNames.contains('drafts');
  db.close();
  return hasDraftStore;
 });
 expect(restored).toBe(false);
 await right.close();
});

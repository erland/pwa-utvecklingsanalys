import {test,expect} from '@playwright/test';
test('create allocation, set UO proposal and persist remainder after reload',async({page})=>{
 await page.goto('./');
 await page.evaluate(async()=>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const req=indexedDB.open('utvecklingsanalys-semantic',1);req.onupgradeneeded=()=>req.result.createObjectStore('datasets');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
  const state={schemaVersion:1,entities:[{id:'uo-1',kind:'uo',name:'UO A',aliases:[]},{id:'lo-1',kind:'lo',name:'LO A',parentId:'uo-1',aliases:[]}],measures:[],observations:[],relations:[]};
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction('datasets','readwrite');tx.objectStore('datasets').put(state,'active');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close();
 });
 await page.getByRole('button',{name:'Fördelningar'}).click();
 await page.getByLabel('Fördelningsnamn').fill('Arbetstyp');
 await page.getByLabel('Fördelningskategorier').fill('Utveckling; Förvaltning');
 await page.getByRole('button',{name:'Skapa fördelningstyp'}).click();
 await page.getByLabel('Välj UO').selectOption('uo-1');
 await page.getByLabel('Utveckling procent').fill('60');
 await page.getByLabel('Förvaltning procent').fill('25');
 await expect(page.getByText('Ofördelat: 15 %')).toBeVisible();
 await page.getByRole('button',{name:'Spara fördelning'}).click();
 await expect(page.getByRole('status')).toContainText('Fördelningen sparad');
 await page.reload();await page.getByRole('button',{name:'Fördelningar'}).click();
 await page.getByLabel('Välj fördelningstyp').selectOption({label:'Arbetstyp'});
 await page.getByLabel('Välj UO').selectOption('uo-1');
 await expect(page.getByText('Ofördelat: 15 %')).toBeVisible();
});

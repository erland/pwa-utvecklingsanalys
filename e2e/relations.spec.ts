import {test,expect} from '@playwright/test';
test('relation editor saves a dated link and remains after reload',async({page})=>{
 await page.goto('./');
 await page.evaluate(async()=>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const req=indexedDB.open('utvecklingsanalys-semantic',1);req.onupgradeneeded=()=>req.result.createObjectStore('datasets');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
  const data={schemaVersion:1,entities:[{id:'u1',kind:'uo',name:'UO A',aliases:[]},{id:'p1',kind:'process',name:'Process A',aliases:[]},{id:'d1',kind:'department',name:'Avdelning A',aliases:[]}],measures:[{id:'business_hours',label:'Verksamhetstimmar',unit:'h',aggregation:'sum',description:''}],observations:[{id:'obs',entityId:'p1',measureId:'business_hours',value:125,period:{year:2027},planningVersion:'2027',scenario:'reported',kind:'detail',quality:'reported',source:{datasetId:'source',fileName:'source.xlsx',sheet:'Tabell',cell:'C2'}}],relations:[]};
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction('datasets','readwrite');tx.objectStore('datasets').put(data,'active');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});
  db.close();
 });
 await page.getByRole('button',{name:'Relationer'}).click();
 await page.getByLabel('Från objekt').selectOption('u1');
 await page.getByLabel('Till objekt').selectOption('p1');
 await page.getByRole('button',{name:'Spara relation'}).click();
 await expect(page.getByText('Relationen sparad.')).toBeVisible();
 await expect(page.getByText('Unika processer').locator('..')).toContainText('1');
 await expect(page.getByText('Unika processtimmar').locator('..')).toContainText('125 h');
 await page.reload();
 await page.getByRole('button',{name:'Relationer'}).click();
 await expect(page.getByText('Unika processer').locator('..')).toContainText('1');
 await page.getByLabel('Relationsår').fill('2026');
 await expect(page.getByText('Unika processer').locator('..')).toContainText('0');
});

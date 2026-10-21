import {test,expect} from '@playwright/test';
test('create scenario, compare changed source and persist approval',async({page})=>{
 await page.goto('./');
 await page.evaluate(async()=>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const req=indexedDB.open('utvecklingsanalys-semantic',1);req.onupgradeneeded=()=>req.result.createObjectStore('datasets');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
  const state={schemaVersion:1,entities:[{id:'uo',kind:'uo',name:'UO A',aliases:[]},{id:'lo',kind:'lo',name:'LO A',parentId:'uo',aliases:[]}],measures:[{id:'it_hours',label:'IT-timmar',unit:'h',aggregation:'sum',description:''}],observations:[{id:'obs',entityId:'lo',measureId:'it_hours',value:100,period:{year:2027},planningVersion:'2027',scenario:'reported',kind:'detail',quality:'reported',source:{datasetId:'d',fileName:'a.xlsx',sheet:'Data',cell:'C2'}}],relations:[]};
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction('datasets','readwrite');tx.objectStore('datasets').put(state,'active');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close();
 });
 await page.getByRole('button',{name:'Planering'}).click();
 await page.getByLabel('Scenarionamn').fill('Alternativ A');
 await page.getByRole('button',{name:'Skapa scenarioutkast'}).click();
 await page.getByLabel('Källobservation').selectOption('obs');
 await page.getByLabel('Alternativt värde').fill('140');
 await page.getByLabel('Motivering').fill('Ny prognos');
 await page.getByRole('button',{name:'Spara justering'}).click();
 await expect(page.getByText(/Skillnad: 40/)).toBeVisible();
 await page.getByRole('button',{name:'Godkänn scenario'}).click();
 await expect(page.getByRole('status')).toContainText('Scenariot godkänt');
 await page.reload();await page.getByRole('button',{name:'Planering'}).click();
 await page.getByLabel('Välj scenario').selectOption({label:'Alternativ A (godkänd)'});
 await expect(page.getByText(/Skillnad: 40/)).toBeVisible();
});

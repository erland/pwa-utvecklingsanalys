import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';

async function file(uo:string,code:string,hours:number){
 const wb=new ExcelJS.Workbook(),budget=wb.addWorksheet('UO Tot 2027-30');
 budget.getCell('B1').value='UO: '+uo;
 budget.getCell('D11').value=new Date(2027,0,1);
 budget.getCell('B25').value='LO 1';budget.getCell('C26').value='IT timmar (h)';budget.getCell('D26').value=hours;
 const d=wb.addWorksheet('Timmar per avdelning');
 d.getCell('C4').value='Timmar 2027';d.getCell('A18').value=code+'*';d.getCell('B18').value='IT-avdelningen';d.getCell('C18').value=hours+10;
 return Buffer.from(await wb.xlsx.writeBuffer());
}

test('multiple UO sources support overlapping group scope and reciprocal drilldown without double count',async({page})=>{
 await page.goto('./');await page.evaluate(()=>localStorage.removeItem('utvecklingsanalys:e2e-legacy-navigation'));await page.reload();
 await page.getByRole('button',{name:'Import',exact:true}).click();
 const upload=page.locator('#direct-import-files');
 await upload.setInputFiles([
  {name:'uo-a.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:await file('UO A','500',100)},
  {name:'uo-b.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:await file('UO B','500',60)}
 ]);
 await expect(page.getByRole('status').filter({hasText:'uo-a.xlsx'})).toContainText('importerad');
 await expect(page.getByRole('status').filter({hasText:'uo-b.xlsx'})).toContainText('importerad');
 // Store an overlapping model using the project's own existing configuration package.
 await page.evaluate(async()=>{
  const open=(name:string)=>new Promise<IDBDatabase>((resolve,reject)=>{const req=indexedDB.open(name);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
  const db=await open('utvecklingsanalys-configuration');
  const read=db.transaction('current','readonly').objectStore('current').get('active');
  const config=await new Promise<{sections:{groups:Array<{id:string;name:string;groups:Array<{id:string;name:string;uoIds:string[]}>}>};activeGroupModelId:string}|undefined>((resolve,reject)=>{read.onsuccess=()=>resolve(read.result);read.onerror=()=>reject(read.error)});
  if(!config)throw new Error('Configuration missing after import');
  config.sections.groups=[{id:'testing',name:'Testgrupper',groups:[{id:'first',name:'Första gruppen',uoIds:['uo:UO%20A','uo:UO%20B']},{id:'second',name:'Överlappande grupp',uoIds:['uo:UO%20A']}]}];
  config.activeGroupModelId='testing';
  const tx=db.transaction('current','readwrite');
  tx.objectStore('current').put(config,'active');
  await new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});
  db.close();
 });
 await page.reload();
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const analysis=page.locator('.canonical-analytics');
 await expect(analysis.locator('.canonical-result-head strong')).toContainText('160 h');
 await analysis.getByLabel('organisation',{exact:true}).selectOption('department');
 const demand=page.getByRole('region',{name:'Avdelningsbehov'});
 await expect(demand).toContainText('180 h');
 await demand.getByLabel('UO-urval för avdelningsbehov').selectOption('group:first');
 await expect(demand).toContainText('180 h');
 await demand.getByLabel('UO-urval för avdelningsbehov').selectOption('group:second');
 await expect(demand).toContainText('Inga avdelningstimmar för valt år och timmått.');
 await demand.getByLabel('UO-urval för avdelningsbehov').selectOption('uo:UO%20B');
 await expect(demand).toContainText('70 h');
 await demand.getByRole('button',{name:/500.*IT-avdelningen/}).click();
 await expect(page.getByRole('table',{name:'Fördjupade avdelningstimmar'})).toContainText('UO B');
 await expect(page.getByRole('table',{name:'Fördjupade avdelningstimmar'})).not.toContainText('UO A');
});
import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';

test('DEV-116 analysis remains locked until a real import, and locks again when sources are removed',async({page})=>{
 await page.goto('./');
 const analysis=page.getByRole('navigation',{name:'Huvudmeny'}).getByRole('button',{name:'Analys',exact:true});
 await expect(analysis).toBeDisabled();
 await expect(analysis).toHaveAttribute('title','Importera analysuppgifter för att aktivera Analys');
 await expect(page.getByRole('heading',{name:'Överblick över verksamhetsutvecklingen'})).toBeVisible();
 await page.getByRole('button',{name:'Importera Excel-filer'}).click();
 const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet('UO Tot 2027-30');
 sheet.getCell('B1').value='UO: UO A';
 sheet.getCell('D11').value=2027;
 sheet.getCell('B25').value='LO 1';
 sheet.getCell('C26').value='IT timmar (h)';
 sheet.getCell('D26').value=42;
 await page.locator('#direct-import-files').setInputFiles({name:'dev116.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await wb.xlsx.writeBuffer())});
 await expect(page.getByRole('status').filter({hasText:'Importresultat'})).toContainText('dev116.xlsx');
 await expect(analysis).toBeEnabled();
 await analysis.click();
 await expect(page.getByRole('heading',{name:'Analysera utvecklingsbehoven'})).toBeVisible();
 await page.reload();
 await expect(analysis).toBeEnabled();
 await analysis.click();
 await expect(page.locator('.canonical-result-head strong')).toHaveText('42 h');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.getByRole('button',{name:'Töm importerade data'}).click();
 await page.getByRole('textbox',{name:'Bekräftelsetext'}).fill('TA BORT');
 await page.getByRole('button',{name:'Bekräfta borttagning'}).click();
 await expect(page.getByRole('status').filter({hasText:'källa/källor'})).toBeVisible();
 await expect(analysis).toBeDisabled();
 await page.getByRole('button',{name:'Översikt',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Börja här'})).toBeVisible();
 await page.reload();
 await expect(analysis).toBeDisabled();
});

test('DEV-116 an imported source without canonical observations does not unlock analysis',async({page})=>{
 await page.goto('./');
 // Wait for initial project loading and IndexedDB schema creation before writing the fixture.
 await expect(page.getByLabel('Projektstatus')).toBeVisible();
 const analysis=page.getByRole('navigation',{name:'Huvudmeny'}).getByRole('button',{name:'Analys',exact:true});
 await expect(analysis).toBeDisabled();
 await page.evaluate(async()=>{
  const request=indexedDB.open('utvecklingsanalys',1);
  await new Promise<void>((resolve,reject)=>{request.onsuccess=()=>resolve();request.onerror=()=>reject(request.error)});
  const db=request.result;
  await new Promise<void>((resolve,reject)=>{
   const tx=db.transaction('projects','readwrite');
   tx.objectStore('projects').put({schemaVersion:1,id:'test',name:'Tom källa',datasets:[{id:'empty',name:'empty.xlsx',planningYear:2027,importedAt:'2026-10-29T00:00:00Z',source:'excel'}],updatedAt:'2026-10-29T00:00:00Z'},'active');
   tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
  });
  db.close();
 });
 await page.reload();
 await expect(analysis).toBeDisabled();
});

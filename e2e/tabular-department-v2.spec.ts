import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';
test('approved department hours reach v2 and disappear on source removal',async({page})=>{
 const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet('Avdelningar');
 sheet.getRow(1).values=['Avdelning','År','Antal anställda'];
 sheet.getRow(2).values=['Avdelning X',2027,600];
 sheet.getRow(3).values=['Avdelning Y',2027,400];
 const bytes=Buffer.from(await wb.xlsx.writeBuffer());
 await page.goto('./');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#direct-import-files').setInputFiles({name:'avdelningar.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:bytes});
 await expect(page.getByRole('status')).toContainText('importerad');
 const read=()=>page.evaluate(async()=>{
  const req=indexedDB.open('utvecklingsanalys-canonical-v2');
  return await new Promise<unknown[]>((resolve,reject)=>{
   req.onerror=()=>reject(req.error);
   req.onsuccess=()=>{
    const db=req.result,tx=db.transaction('datasets','readonly'),get=tx.objectStore('datasets').get('active');
    get.onsuccess=()=>{db.close();resolve(get.result.records)};
    get.onerror=()=>reject(get.error);
   };
  });
 });
 const records=await read() as Array<{metric:string;value:number;scope:{axis:string}}>;
 expect(records).toHaveLength(2);
 expect(records.map(x=>x.value).sort()).toEqual([400,600]);
 expect(records.every(x=>x.scope.axis==='department'&&x.metric==='headcount')).toBe(true);
 await page.getByRole('button',{name:'Töm importerade data'}).click();
 await page.getByLabel('Bekräftelsetext').fill('TA BORT');
 await page.getByRole('button',{name:'Bekräfta borttagning'}).click();
 await expect(page.getByText('Inga godkända källor.')).toBeVisible();
 expect(await read()).toHaveLength(0);
});

import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';

async function budget(lo1:number,lo2:number,development:number,maintenance:number){
 const workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet('UO Tot 2027-30');
 sheet.getCell('B1').value='UO: UO A';sheet.getCell('D11').value=2027;
 sheet.getCell('B25').value='LO 1';sheet.getCell('C26').value='IT timmar (h)';sheet.getCell('D26').value=lo1;
 sheet.getCell('B31').value='LO 2';sheet.getCell('C32').value='IT timmar (h)';sheet.getCell('D32').value=lo2;
 sheet.getCell('D4').value='Utv. 27';sheet.getCell('E4').value='Förv. 27';
 sheet.getCell('C5').value='IT timmar (th)';sheet.getCell('D5').value=development/1000;sheet.getCell('E5').value=maintenance/1000;
 return Buffer.from(await workbook.xlsx.writeBuffer());
}
test('DEV-185: reimport invalidates balanced LO approval and requires fresh approval',async({page})=>{
 await page.addInitScript(()=>localStorage.removeItem('utvecklingsanalys:e2e-legacy-navigation'));
 await page.goto('./');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 const file=page.locator('#direct-import-files');
 await file.setInputFiles({name:'dev-185-original.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:await budget(60,40,50,50)});
 await expect(page.getByRole('status').filter({hasText:'dev-185-original.xlsx'})).toContainText('importerad');
 await expect(page.getByRole('region',{name:'Efter import'})).toBeVisible();
 await page.getByRole('button',{name:'Visa källor och hantera import'}).click();
 await page.getByRole('button',{name:'Ersätt',exact:true}).click();
 await file.setInputFiles({name:'dev-185-replaced.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:await budget(50,50,60,40)});
 await expect(page.getByRole('status').filter({hasText:'dev-185-replaced.xlsx'})).toContainText('importerad');
 await expect(page.getByRole('region',{name:'Efter import'})).toBeVisible();
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const analysis=page.locator('.canonical-analytics');
 await analysis.getByRole('checkbox',{name:'Utveckling',exact:true}).check();
 await analysis.getByRole('checkbox',{name:'Förvaltning',exact:true}).uncheck();
 await expect(analysis.locator('.canonical-result-head strong')).toContainText('60 h');
});

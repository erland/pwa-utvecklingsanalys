import {test,expect,type Locator} from '@playwright/test';
async function selectActivity(view:Locator,value:'development'|'maintenance'|'all'){
 const dev=view.getByRole('checkbox',{name:'Utveckling',exact:true});
 const maint=view.getByRole('checkbox',{name:'Förvaltning',exact:true});
 if(value==='all'){await dev.check();await maint.check()}
 else if(value==='development'){await dev.check();await maint.uncheck()}
 else {await maint.check();await dev.uncheck()}
}

import ExcelJS from 'exceljs';

test('import directly offers LO completion and opens analysis after one approval',async({page})=>{
 const wb=new ExcelJS.Workbook(),s=wb.addWorksheet('UO Tot 2027-30');
 s.getCell('B1').value='UO: UO A';
 s.getCell('D11').value=2027;
 s.getCell('B25').value='LO 1';s.getCell('C26').value='IT timmar (h)';s.getCell('D26').value=60;
 s.getCell('B31').value='LO 2';s.getCell('C32').value='IT timmar (h)';s.getCell('D32').value=40;
 s.getCell('D4').value='Utv. 27';s.getCell('E4').value='Förv. 27';
 s.getCell('C5').value='IT timmar (th)';s.getCell('D5').value=0.05;s.getCell('E5').value=0.05;
 const buffer=Buffer.from(await wb.xlsx.writeBuffer());
 await page.goto('./');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#direct-import-files').setInputFiles({name:'guided-budget.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer});
 await expect(page.getByRole('status').filter({hasText:'guided-budget.xlsx'})).toContainText('importerad');
 await expect(page.getByRole('region',{name:'Efter import'})).toBeVisible();
 await expect(page.getByRole('region',{name:'Komplettera efter import'})).toHaveCount(0);
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Analysera utvecklingsbehoven'})).toBeVisible();
 const analysis=page.locator('.canonical-analytics');
 await expect(analysis.locator('.canonical-result-head strong')).toContainText('100 h');
 await selectActivity(analysis,'development');
 await expect(analysis.locator('.canonical-result-head strong')).toContainText('50 h');
});

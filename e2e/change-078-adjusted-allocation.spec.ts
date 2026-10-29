import {test,expect,type Locator} from '@playwright/test';
async function selectActivity(view:Locator,value:'development'|'maintenance'|'all'){
 const dev=view.getByRole('checkbox',{name:'Utveckling',exact:true});
 const maint=view.getByRole('checkbox',{name:'Förvaltning',exact:true});
 if(value==='all'){await dev.check();await maint.check()}
 else if(value==='development'){await dev.check();await maint.uncheck()}
 else {await maint.check();await dev.uncheck()}
}

import ExcelJS from 'exceljs';

test('approved edited LO shares rebalance the UO and survive reload without changing imported totals',async({page})=>{
 const workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet('UO Tot 2027-30');
 sheet.getCell('B1').value='UO: UO A';
 sheet.getCell('D11').value=2027;
 sheet.getCell('B25').value='LO 1';
 sheet.getCell('C26').value='IT timmar (h)';
 sheet.getCell('D26').value=60;
 sheet.getCell('B31').value='LO 2';
 sheet.getCell('C32').value='IT timmar (h)';
 sheet.getCell('D32').value=40;
 sheet.getCell('D4').value='Utv. 27';
 sheet.getCell('E4').value='Förv. 27';
 sheet.getCell('C5').value='IT timmar (th)';
 sheet.getCell('D5').value=0.05;
 sheet.getCell('E5').value=0.05;
 const buffer=Buffer.from(await workbook.xlsx.writeBuffer());
 await page.goto('./');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#direct-import-files').setInputFiles({name:'lo-adjustments.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer});
 await expect(page.getByRole('status').filter({hasText:'lo-adjustments.xlsx'})).toContainText('importerad');
 await page.getByRole('button',{name:'Kompletteringar',exact:true}).click();
 const allocation=page.getByRole('heading',{name:'Aktivitetsfördelning till LO'}).locator('..');
 await allocation.getByRole('button',{name:'Skapa fördelning'}).click();
 await expect(allocation.getByText('Inväntar godkännande')).toBeVisible();
 await allocation.getByLabel(/^Utvecklingsandel /).first().fill('60');
 await expect(allocation.getByLabel(/^Utvecklingsandel /).nth(1)).toHaveValue('35');
 await expect(allocation.getByText('UO-avstämning:',{exact:false})).toContainText('stämmer');
 await expect(allocation.getByRole('button',{name:'Godkänn justerad fördelning'})).toBeDisabled();
 await allocation.getByLabel('godkännandemotivering',{exact:false}).fill('LO 1 prioriterar utveckling');
 await allocation.getByRole('button',{name:'Godkänn justerad fördelning'}).click();
 await expect(allocation.getByText('Godkänd',{exact:true})).toBeVisible();
 await page.reload();
 await page.getByRole('button',{name:'Kompletteringar',exact:true}).click();
 const restored=page.getByRole('heading',{name:'Aktivitetsfördelning till LO'}).locator('..');
 await expect(restored.getByText('Godkänd',{exact:true})).toBeVisible();
 await expect(restored.getByLabel(/^Utvecklingsandel /).first()).toHaveValue('60');
 await expect(restored.getByLabel(/^Utvecklingsandel /).nth(1)).toHaveValue('35');
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const analysis=page.locator('.canonical-analytics');
 await expect(analysis.locator('.canonical-result-head strong')).toContainText('100 h');
 await selectActivity(analysis,'development');
 await expect(analysis.locator('.canonical-result-head strong')).toContainText('50 h');
 await selectActivity(analysis,'maintenance');
 await expect(analysis.locator('.canonical-result-head strong')).toContainText('50 h');
 await selectActivity(analysis,'all');
 await expect(analysis.locator('.canonical-result-head strong')).toContainText('100 h');
});

import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';

test('CHANGE-013 integrated acceptance: XLSX, grouping, combined measures, charts and years',async({page})=>{
 const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet('UO Tot 2027-30');
 sheet.getCell('B1').value='UO: UO A';
 sheet.getCell('D11').value=new Date(2027,0,1);
 sheet.getCell('E11').value=new Date(2027,1,1);
 sheet.getCell('B25').value='LO 1';
 sheet.getCell('C26').value='IT timmar (h)';
 sheet.getCell('D26').value=42;
 sheet.getCell('E26').value=18;
 const buffer=Buffer.from(await wb.xlsx.writeBuffer());
 await page.goto('./');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#direct-import-files').setInputFiles({name:'acceptance.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer});
 await expect(page.getByRole('status')).toContainText('importerad');

 await page.getByRole('button',{name:'Inställningar'}).click();
 await expect(page.getByRole('heading',{name:'UO-grupper'})).toBeVisible();
 await page.getByRole('button',{name:'Ny gruppmodell'}).click();
 await page.getByLabel('Modellnamn').fill('Acceptansmodell');
 await page.getByRole('button',{name:'Lägg till grupp'}).click();
 await page.getByLabel('Gruppnamn').fill('Digital utveckling');
 await page.getByLabel('UO A').check();
 await page.getByRole('button',{name:'Spara gruppmodeller'}).click();
 await expect(page.getByRole('status')).toContainText('Gruppmodeller sparade');

 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const v2=page.locator('.canonical-analytics');
 await page.locator('.canonical-analytics details.organization-year-details > summary').click();
 await expect(v2.locator('.canonical-result-head strong')).toContainText('60 h');
 await v2.getByLabel('UO-gruppmodell').selectOption({label:'Acceptansmodell'});
 await expect(v2.getByRole('table',{name:'Organisation per år'})).toContainText('Digital utveckling');
 await expect(v2.getByRole('region',{name:'Årsvis utveckling för valt organisationsurval'})).toHaveCount(0);
 await expect(v2.getByRole('table',{name:'Organisation per år'})).toContainText('60 h');
 await page.reload();await page.getByRole('button',{name:'Inställningar',exact:true}).click();
 await expect(page.getByLabel('Modellnamn')).toHaveValue('Acceptansmodell');
});

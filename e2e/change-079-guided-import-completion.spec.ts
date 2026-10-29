import {test,expect} from '@playwright/test';
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
 const completion=page.getByRole('region',{name:'Komplettera efter import'});
 await expect(completion.getByText('Fördela utveckling och förvaltning per LO')).toBeVisible();
 await completion.getByLabel(/^Utvecklingsandel /).first().fill('60');
 await expect(completion.getByLabel(/^Utvecklingsandel /).nth(1)).toHaveValue('50');
 await completion.getByRole('button',{name:'Spara LO-fördelning'}).click();
 await expect(completion.getByText('Godkänd fördelning – kan justeras på nytt')).toBeVisible();
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Analysera utvecklingsbehoven'})).toBeVisible();
 const analysis=page.locator('.canonical-analytics');
 await expect(analysis.locator('.canonical-result-head strong')).toContainText('100 h');
 await analysis.getByLabel('aktivitet').selectOption('development');
 await expect(analysis.locator('.canonical-result-head strong')).toContainText('56 h');
});

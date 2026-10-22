import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';
test('separately approve development and maintenance matrix without adding to detail totals',async({page})=>{
 const book=new ExcelJS.Workbook(),s=book.addWorksheet('UO Tot 2027-30');
 s.getCell('B1').value='UO: UO A';s.getCell('D11').value=new Date(2027,0,1);
 s.getCell('B25').value='LO AUL';s.getCell('C26').value='IT timmar (h)';s.getCell('D26').value=42;
 s.getCell('D4').value='Utv. 27';s.getCell('E4').value='Förv. 27';s.getCell('F4').value='Tot 27';
 s.getCell('C5').value='IT timmar (th)';s.getCell('D5').value=2;s.getCell('E5').value=3;s.getCell('F5').value={formula:'SUM(D5:E5)',result:5};
 const bytes=Buffer.from(await book.xlsx.writeBuffer());
 await page.goto('./');await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#import-files').setInputFiles({name:'matrix.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:bytes});
 await expect(page.getByRole('table',{name:'Förhandsgranskning av årsmatris'})).toContainText('2000 h');
 await page.getByLabel('Ta med sektionen vid godkännande').check();
 await page.getByRole('button',{name:'Godkänn import'}).click();
 await expect(page.getByRole('status')).toContainText('Importen godkänd');
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 await expect(page.locator('.result-head strong')).toHaveText('42 h');
 await expect(page.getByRole('table',{name:'Utveckling och förvaltning'})).toContainText('3 000 h');
});

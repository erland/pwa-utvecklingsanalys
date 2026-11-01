import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';

test('DEV-197: unapproved LO has a slider and all-years choice, without redundant detail heading',async({page})=>{
 const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet('UO Tot 2027-30');
 sheet.getCell('B1').value='UO: UO A';sheet.getCell('D11').value=2027;
 sheet.getCell('B25').value='LO 1';sheet.getCell('C26').value='IT timmar (h)';sheet.getCell('D26').value=60;
 sheet.getCell('B31').value='LO 2';sheet.getCell('C32').value='IT timmar (h)';sheet.getCell('D32').value=40;
 sheet.getCell('D4').value='Utv. 27';sheet.getCell('E4').value='Förv. 27';
 sheet.getCell('C5').value='IT timmar (th)';sheet.getCell('D5').value=0.05;sheet.getCell('E5').value=0.05;
 await page.addInitScript(()=>localStorage.removeItem('utvecklingsanalys:e2e-legacy-navigation'));
 await page.goto('./');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#direct-import-files').setInputFiles({name:'dev-197.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await wb.xlsx.writeBuffer())});
 await expect(page.getByRole('status').filter({hasText:'dev-197.xlsx'})).toContainText('importerad');
 // Deliberately do not approve anything on Import.
 await page.getByRole('button',{name:'Fördelningar',exact:true}).click();
 const builtIn=page.getByRole('region',{name:'Inbyggda fördelningstyper'});
 await builtIn.getByRole('button',{name:/Utveckling \/ Förvaltning/}).click();
 await expect(builtIn.getByText('Här visas enbart fullständiga importerade UO-matriser.')).toHaveCount(0);
 await expect(builtIn.getByLabel('Detaljperiod Utveckling / Förvaltning')).toHaveCount(0);
 await builtIn.getByRole('region',{name:'Översikt UO-fördelningar'}).getByRole('button',{name:/UO A/}).click();
 const uo=builtIn.getByRole('region',{name:'LO-detaljer UO A'});
 const lo1=uo.getByRole('region',{name:'LO-fördelning LO 1'});
 await expect(lo1.getByRole('slider',{name:'Reglage utvecklingsandel LO 1'})).toBeVisible();
 await expect(uo.getByRole('region',{name:'LO-fördelning LO 2'})).toBeVisible();
 await lo1.getByLabel('LO-period LO 1').getByRole('button',{name:'Alla'}).click();
 await expect(lo1.getByRole('slider',{name:'Reglage utvecklingsandel LO 1'})).toHaveValue('50');
 await expect(lo1.getByLabel('LO-period LO 1').getByRole('button',{name:'Alla'})).toHaveAttribute('aria-pressed','true');
 await lo1.getByLabel('Utvecklingsandel lo:UO%20A:LO%201').fill('60');
 await lo1.getByLabel('Utvecklingsandel lo:UO%20A:LO%201').press('Tab');
 await expect(lo1.getByRole('button',{name:'Spara LO-fördelning'})).toHaveCount(0);
 await expect(lo1).toContainText('36');
});

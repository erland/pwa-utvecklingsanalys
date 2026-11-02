import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';

async function workbook(uo:string,it:number,business:number){
 const wb=new ExcelJS.Workbook();
 const budget=wb.addWorksheet('UO Tot 2027-30');
 budget.getCell('B1').value='UO: '+uo;
 budget.getCell('D11').value=new Date(2027,0,1);
 budget.getCell('B25').value='LO 1';
 budget.getCell('C26').value='IT timmar (h)';
 budget.getCell('D26').value=it;
 budget.getCell('C27').value='V timmar';
 budget.getCell('D27').value=business;
 const departments=wb.addWorksheet('Timmar per avdelning');
 departments.getCell('C4').value='Timmar 2027';
 departments.getCell('D4').value='Timmar 2028';
 departments.getCell('E4').value='Timmar 2029';
 departments.getCell('A6').value='101*';
 departments.getCell('B6').value='Avdelning Alfa';
 departments.getCell('C6').value=business+10; // deliberately out of sync
 departments.getCell('F6').value='Ej förankrat';
 departments.getCell('A18').value='500*';
 departments.getCell('B18').value='IT-avdelningen';
 departments.getCell('C18').value=it+20; // deliberately out of sync
 departments.getCell('C16').value={formula:'SUM(C6:C15)',result:0}; // stale cached total
 return Buffer.from(await wb.xlsx.writeBuffer());
}

test('UO department demand survives import, discrepancy, reload and reciprocal drilldown',async({page})=>{
 await page.goto('./');
 // The default Playwright configuration enables legacy navigation; test the actual production UI.
 await page.evaluate(()=>localStorage.removeItem('utvecklingsanalys:e2e-legacy-navigation'));
 await page.reload();
 await page.getByRole('button',{name:'Import',exact:true}).click();
 const upload=page.locator('#direct-import-files');
 await upload.setInputFiles({name:'uo-a.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:await workbook('UO A',100,50)});
 await expect(page.getByRole('status').filter({hasText:'uo-a.xlsx'})).toContainText('importerad');
 await expect(page.getByRole('region',{name:'Avstämning av avdelningstimmar'})).toContainText('Avstämning av timmar per avdelning');
 const reconciliation=page.getByRole('region',{name:'Avstämning av avdelningstimmar'});
 await expect(reconciliation).toContainText('+20');
 await expect(reconciliation).toContainText('+10');
 await page.reload();
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const analysis=page.locator('.canonical-analytics');
 await expect(analysis.locator('.canonical-result-head strong')).toContainText('150 h');
 await analysis.getByLabel('organisation',{exact:true}).selectOption('department');
 const demand=page.getByRole('region',{name:'Avdelningsbehov'});
 await expect(demand).toContainText('Avdelning Alfa');
 await expect(demand).toContainText('IT-avdelningen');
 await demand.getByRole('button',{name:/101.*Avdelning Alfa/}).click();
 await expect(page.getByRole('region',{name:'Fördjupning av avdelningsbehov'})).toContainText('UO A');
 await demand.getByLabel('Perspektiv för avdelningsbehov').selectOption('uo');
 await demand.getByRole('button',{name:'UO A',exact:true}).click();
 await expect(page.getByRole('table',{name:'Fördjupade avdelningstimmar'})).toContainText('Avdelning Alfa');
 await expect(page.getByRole('table',{name:'Fördjupade avdelningstimmar'})).toContainText('IT-avdelningen');
});

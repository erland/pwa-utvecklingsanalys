import {test,expect as baseExpect} from '@playwright/test';
const expect=baseExpect.configure({timeout:4000});
import ExcelJS from 'exceljs';

async function file(uo:string,code:string,hours:number){
 const wb=new ExcelJS.Workbook(),budget=wb.addWorksheet('UO Tot 2027-30');
 budget.getCell('B1').value='UO: '+uo;
 budget.getCell('D11').value=new Date(2027,0,1);
 budget.getCell('B25').value='LO 1';budget.getCell('C26').value='IT timmar (h)';budget.getCell('D26').value=hours;
 const d=wb.addWorksheet('Timmar per avdelning');
 d.getCell('C4').value='Timmar 2027';d.getCell('A18').value=code+'*';d.getCell('B18').value='IT-avdelningen';d.getCell('C18').value=hours+10;
 return Buffer.from(await wb.xlsx.writeBuffer());
}

test('multiple UO sources preserve distinct scopes and reciprocal drilldown without double count',async({page})=>{
 page.setDefaultTimeout(4000);
 page.setDefaultNavigationTimeout(4000);

 await page.goto('./');await page.evaluate(()=>localStorage.removeItem('utvecklingsanalys:e2e-legacy-navigation'));await page.reload();
 await page.getByRole('button',{name:'Import',exact:true}).click();
 const upload=page.locator('#direct-import-files');
 await upload.setInputFiles([
  {name:'uo-a.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:await file('UO A','500',100)},
  {name:'uo-b.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:await file('UO B','500',60)}
 ]);
 await expect(page.getByRole('status').filter({hasText:'uo-a.xlsx'})).toContainText('importerad');
 await expect(page.getByRole('status').filter({hasText:'uo-b.xlsx'})).toContainText('importerad');
 await page.reload();
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const analysis=page.locator('.canonical-analytics');
 await expect(analysis.locator('.canonical-result-head strong')).toContainText('160 h');
 await analysis.getByLabel('organisation',{exact:true}).selectOption('department');
 const demand=page.getByRole('region',{name:'Avdelningsbehov'});
 await expect(demand).toContainText('180 h');

 await demand.getByRole('button',{name:'IT-avdelningen'}).click();
 await expect(page.getByRole('table',{name:/Efterfrågande UO/})).toContainText('UO B');
 await expect(page.getByRole('table',{name:/Efterfrågande UO/})).toContainText('UO A');
 // The UO/LO view must obey the existing organization navigator, not sum every UO.
 await analysis.getByLabel('organisation',{exact:true}).selectOption('work');
 const resourceNeed=page.getByRole('region',{name:'Resursbehov per avdelning för UO'});
 await expect(resourceNeed.getByRole('table',{name:'Fördelning av efterfrågade avdelningstimmar'})).toContainText('180 h');
 await page.getByRole('region',{name:'Utforska UO'}).getByRole('region',{name:'UO i analys'}).getByRole('button',{name:'UO B',exact:true}).click();
 await expect(resourceNeed.getByRole('table',{name:'Fördelning av efterfrågade avdelningstimmar'})).toContainText('70 h');
 await expect(resourceNeed.getByRole('table',{name:'Fördelning av efterfrågade avdelningstimmar'})).not.toContainText('180 h');

});
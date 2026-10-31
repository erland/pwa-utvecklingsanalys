import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';

for(const device of [
 {name:'iPhone stående',width:390,height:844},
 {name:'iPad stående',width:820,height:1180},
 {name:'iPad liggande',width:1180,height:820}
]){
 test('DEV-162 navigering och fördelning – '+device.name,async({page})=>{
  await page.setViewportSize({width:device.width,height:device.height});
  await page.addInitScript(()=>localStorage.removeItem('utvecklingsanalys:e2e-legacy-navigation'));
  const wb=new ExcelJS.Workbook(),s=wb.addWorksheet('UO Tot 2027-30');
  s.getCell('B1').value='UO: Test UO';s.getCell('D11').value=2027;
  s.getCell('B25').value='LO A';s.getCell('C26').value='IT timmar (h)';s.getCell('D26').value=50;
  s.getCell('B29').value='LO B';s.getCell('C30').value='IT timmar (h)';s.getCell('D30').value=30;
  await page.goto('./');
  await page.getByRole('button',{name:'Import',exact:true}).click();
  await page.locator('#direct-import-files').setInputFiles({name:'responsive.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await wb.xlsx.writeBuffer())});
  await expect(page.getByRole('status')).toContainText('importerad');
  await page.getByRole('button',{name:'Inställningar',exact:true}).click();
  const definitions=page.getByRole('region',{name:'Valfria fördelningstyper'});
  await definitions.getByRole('button',{name:'Ny fördelningstyp'}).click();
  await definitions.getByLabel('Namn på fördelningstyp').fill('Effekt');
  await definitions.getByRole('button',{name:'Skapa fördelningstyp'}).click();
  await expect(definitions.getByRole('region',{name:'Befintliga fördelningstyper'})).toContainText('Effekt');
  await page.getByRole('button',{name:'Fördelningar',exact:true}).click();
  const rules=page.getByRole('region',{name:'Valfria fördelningar'});
  await expect(rules.getByRole('region',{name:'Översikt fördelningstyper'})).toContainText('Effekt');
  await rules.getByRole('region',{name:'Översikt UO-fördelningar'}).getByRole('button',{name:/Test UO.*LO/}).click();
  await expect(rules.getByRole('region',{name:'Timviktad fördelning Test UO'})).toBeVisible();
  await rules.getByRole('slider',{name:'Massfördelning procent'}).fill('65');
  await rules.getByRole('button',{name:'Fördela alla UO'}).click();
  const confirm=rules.getByRole('group',{name:'Bekräfta massändring'});
  await expect(confirm).toContainText('65 %');
  await confirm.getByRole('button',{name:'Avbryt'}).click();
  await expect(confirm).toHaveCount(0);
  await page.getByRole('button',{name:'Analys',exact:true}).click();
  await expect(page.getByRole('region',{name:'Fördelningsanalys'})).toBeVisible();
  // The application must not force horizontal scrolling of the top-level page.
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
 });
}

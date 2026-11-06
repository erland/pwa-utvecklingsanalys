import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';

async function workbook(kind:'uo'|'project'){
 const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet('UO Tot 2027-30');
 sheet.getCell('B1').value=kind==='uo'?'UO: Infrastruktur':'Projekt: Digitalisering';
 sheet.getCell('D11').value=2027;
 sheet.getCell('B25').value=kind==='uo'?'LO A':'Delprojekt A';
 sheet.getCell('C26').value='IT timmar (h)';
 sheet.getCell('D26').value=kind==='uo'?100:50;
 sheet.getCell('D4').value='Utv. 27';
 sheet.getCell('E4').value='Förv. 27';
 sheet.getCell('C5').value='IT timmar (th)';
 sheet.getCell('D5').value=kind==='uo'?0.1:0.05;
 // E5 deliberately blank: it must mean a provisional 0, not an import error.
 return {name:kind+'.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  buffer:Buffer.from(await wb.xlsx.writeBuffer())};
}

test('blank maintenance gives automatic editable zero for UO/LO and project parts',async({page})=>{
 await page.addInitScript(()=>localStorage.removeItem('utvecklingsanalys:e2e-legacy-navigation'));
 await page.goto('./');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('#direct-import-files').setInputFiles([await workbook('uo'),await workbook('project')]);
 const feedback=page.getByRole('status',{name:'Importresultat'});
 await expect(feedback).toContainText('uo.xlsx');
 await expect(feedback).toContainText('project.xlsx');
 await expect(feedback).not.toContainText('Inte importerad');
 // No mandatory completion from this missing half. Source values stay editable in the optional section.
 await expect(page.getByText(/Ändra automatiskt antagna nollvärden/)).toBeVisible();
 await expect(page.getByText('Inga UO-fördelningar kräver komplettering.')).toBeVisible();
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const analysis=page.locator('.canonical-analytics');
 await analysis.getByRole('combobox',{name:'Planeringstyp',exact:true}).selectOption('project');
 await analysis.getByLabel('period',{exact:true}).selectOption('2027');
 await analysis.getByLabel('Aktivitet för projekt och UO').selectOption('development');
 const panel=page.getByRole('region',{name:'Samlat planeringsbehov'});
 await expect(panel).toContainText('Totalt: 50 h');
 await analysis.getByLabel('Aktivitet för projekt och UO').selectOption('maintenance');
 await expect(panel).toContainText('Totalt: 0 h');
 await analysis.getByRole('combobox',{name:'Planeringstyp',exact:true}).selectOption('uo');
 // UO development/maintenance are reflected in source-based LO allocations.
 await page.getByRole('button',{name:'Fördelningar',exact:true}).click();
 const projects=page.getByRole('region',{name:'Projektfördelningar',exact:true});
 await projects.getByRole('button',{name:/Utveckling \/ Förvaltning – projekt/}).click();
 await projects.getByLabel('Projektfördelning år').selectOption('2027');
 await projects.getByRole('region',{name:'Välj projekt att fördela'}).getByRole('button',{name:/Digitalisering/}).click();
 await expect(projects.locator('[aria-label="Fördelning Delprojekt A it_hours 2027"]')).toContainText('Automatiskt fördelad: 100 % Utveckling');
});

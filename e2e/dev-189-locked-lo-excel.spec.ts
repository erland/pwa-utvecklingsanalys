import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';

async function budget(lockedDevelopment:number,lockedMaintenance:number,uoDevelopment:number,uoMaintenance:number){
 const wb=new ExcelJS.Workbook(),s=wb.addWorksheet('UO Tot 2027-30');
 s.getCell('B1').value='UO: UO A';s.getCell('D11').value=2027;
 for(const [area,row,value] of [['LO 1',25,40],['LO 2',31,30],['LO 3',37,30]] as const){
  s.getCell('B'+row).value=area;
  s.getCell('C'+(row+1)).value='IT timmar (h)';
  s.getCell('D'+(row+1)).value=value;
 }
 s.getCell('D4').value='Utv. 27';s.getCell('E4').value='Förv. 27';
 s.getCell('C5').value='IT timmar (th)';
 s.getCell('D5').value=uoDevelopment/1000;s.getCell('E5').value=uoMaintenance/1000;
 const locks=wb.addWorksheet('LO Aktiviteter 2027-2030');
 ['LO','År','Mått','Utveckling (h)','Förvaltning (h)'].forEach((h,i)=>locks.getCell(1,i+1).value=h);
 ['LO 1',2027,'it_hours',lockedDevelopment,lockedMaintenance].forEach((v,i)=>locks.getCell(2,i+1).value=v);
 return Buffer.from(await wb.xlsx.writeBuffer());
}

test('DEV-189: real Excel import locks LO1, balances editable LOs and invalidates approval on replacement',async({page})=>{
 await page.addInitScript(()=>localStorage.removeItem('utvecklingsanalys:e2e-legacy-navigation'));
 await page.goto('./');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 const upload=page.locator('#direct-import-files');
 await upload.setInputFiles({name:'dev-189-locked.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:await budget(20,20,50,50)});
 await expect(page.getByRole('status').filter({hasText:'dev-189-locked.xlsx'})).toContainText('importerad');
 const completion=page.getByRole('region',{name:'Komplettera efter import'});
 const locked=completion.getByLabel('Utvecklingsandel lo:UO%20A:LO%201');
 const editable2=completion.getByLabel('Utvecklingsandel lo:UO%20A:LO%202');
 const editable3=completion.getByLabel('Utvecklingsandel lo:UO%20A:LO%203');
 await expect(locked).toBeDisabled();
 await expect(completion.getByText('Importerad, låst')).toBeVisible();
 await editable2.fill('60');
 await expect(editable3).toHaveValue('40');
 await expect(completion.getByText(/UO-avstämning: utveckling 50 \/ 50 h, förvaltning 50 \/ 50 h/)).toBeVisible();
 await completion.getByRole('button',{name:'Spara LO-fördelning'}).click();
 await expect(completion.getByText('Godkända fördelningar (1)',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:'Fördelningar',exact:true}).click();
 const builtIn=page.getByRole('region',{name:'Inbyggda fördelningstyper'});
 await builtIn.getByRole('button',{name:/Utveckling \/ Förvaltning/}).click();
 await builtIn.getByRole('region',{name:'Översikt UO-fördelningar'}).getByRole('button',{name:/UO A/}).click();
 const loPanels=builtIn.getByRole('region',{name:'Godkända LO-kompletteringar'});
 await expect(loPanels).toContainText('LO 1');
 await expect(loPanels).toContainText('LO 2');
 await expect(loPanels).toContainText('LO 3');
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 const analysis=page.locator('.canonical-analytics');
 await analysis.getByRole('checkbox',{name:'Utveckling',exact:true}).check();
 await analysis.getByRole('checkbox',{name:'Förvaltning',exact:true}).uncheck();
 await expect(analysis.locator('.canonical-result-head strong')).toContainText('50 h');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.getByRole('button',{name:'Visa källor och hantera import'}).click();
 await page.getByRole('button',{name:'Ersätt',exact:true}).click();
 await upload.setInputFiles({name:'dev-189-replaced.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:await budget(25,15,55,45)});
 await expect(page.getByRole('status').filter({hasText:'dev-189-replaced.xlsx'})).toContainText('importerad');
 await expect(completion.getByText('Godkända fördelningar (1)',{exact:false})).toHaveCount(0);
 await expect(completion.getByRole('button',{name:/Godkänn alla föreslagna fördelningar/})).toBeVisible();
 await expect(completion.getByLabel('Utvecklingsandel lo:UO%20A:LO%201')).toBeDisabled();
 await completion.getByRole('button',{name:/Godkänn alla föreslagna fördelningar/}).click();
 await expect(completion.getByText('Godkända fördelningar (1)',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:'Analys',exact:true}).click();
 // Navigation remounts Analytics and restores the default (all activities) filter.
 const updatedAnalysis=page.locator('.canonical-analytics');
 await updatedAnalysis.getByRole('checkbox',{name:'Utveckling',exact:true}).check();
 await updatedAnalysis.getByRole('checkbox',{name:'Förvaltning',exact:true}).uncheck();
 await expect(updatedAnalysis.locator('.canonical-result-head strong')).toContainText('55 h');
});

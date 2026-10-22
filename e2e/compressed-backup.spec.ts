import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
test('compressed project archive roundtrip and archive size protection',async({page})=>{
 await page.goto('./');await page.getByRole('button',{name:'Inställningar'}).click();
 await expect(page.locator('#project-name')).toBeEnabled();
 const exported=page.waitForEvent('download');
 await page.getByRole('button',{name:'Ladda ner komprimerad backup (GZIP)'}).click();
 const file=await exported;expect(file.suggestedFilename()).toContain('.json.gz');
 const buffer=await readFile((await file.path())!);
 await page.getByLabel('Välj projektbackup').setInputFiles({name:'projekt.json.gz',mimeType:'application/gzip',buffer});
 await expect(page.getByRole('status')).toContainText('Validerad backup');
 await page.getByRole('button',{name:'Bekräfta återställning'}).click();
 await expect(page.getByRole('status')).toContainText('Projekt återställt');
});

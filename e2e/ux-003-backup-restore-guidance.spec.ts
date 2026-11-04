import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('UX-003: restore preview distinguishes current and backup projects, then offers reload',async({page})=>{
 await page.goto('./');
 await page.getByRole('button',{name:'Inställningar',exact:true}).click();
 const name=page.getByLabel('Namn på lokalt projekt');
 await name.fill('Backupens projekt');
 await expect(page.locator('.project-save-feedback')).toContainText('Projektnamnet är sparat.');
 const downloadPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:'Ladda ner projektbackup'}).click();
 const backup=await downloadPromise;
 const bytes=await readFile(await backup.path());
 await name.fill('Nuvarande projekt');
 await expect(page.locator('.project-save-feedback')).toContainText('Projektnamnet är sparat.');

 await page.getByLabel('Välj projektbackup').setInputFiles({name:'sparat-projekt.json',mimeType:'application/json',buffer:bytes});
 const review=page.getByRole('region',{name:'Granska återställning'});
 await expect(review).toContainText('Nuvarande projekt (ersätts): Nuvarande projekt');
 await expect(review).toContainText('Projekt i backupen (återställs): Backupens projekt');
 await expect(review).toContainText('flera lokala databaser');
 await expect(page.getByRole('button',{name:'Bekräfta återställning'})).toBeEnabled();
 await page.getByRole('button',{name:'Bekräfta återställning'}).click();
 await expect(page.getByRole('status')).toContainText('Projekt återställt');
 await expect(page.getByRole('button',{name:'Ladda om appen nu'})).toBeVisible();
 await page.getByRole('button',{name:'Ladda om appen nu'}).click();
 await expect(page.locator('.topbar strong')).toHaveText('Backupens projekt');
});

test('UX-003: invalid backup cannot be restored and does not show a preview',async({page})=>{
 await page.goto('./');
 await page.getByRole('button',{name:'Inställningar',exact:true}).click();
 await page.getByLabel('Välj projektbackup').setInputFiles({
  name:'trasig.json',mimeType:'application/json',buffer:Buffer.from('{"not":"a backup"}')
 });
 await expect(page.getByRole('status')).toContainText('Filen avvisades');
 await expect(page.getByRole('region',{name:'Granska återställning'})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Bekräfta återställning'})).toBeDisabled();
});

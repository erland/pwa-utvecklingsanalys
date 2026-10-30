import {test,expect} from '@playwright/test';
test('DEV-156 overview actions and settings sections are accessible',async({page})=>{
 await page.goto('./');
 await expect(page.getByRole('heading',{name:'Börja här'})).toBeVisible();
 await page.getByRole('button',{name:'Importera Excel-filer'}).click();
 await expect(page.getByRole('heading',{name:'Importera Excelunderlag'})).toBeVisible();
 await page.getByRole('button',{name:'Inställningar',exact:true}).click();
 await expect(page.getByRole('region',{name:'Projektinställningar'})).toBeVisible();
 await expect(page.getByRole('region',{name:'Administrera UO-grupper'})).toBeVisible();
 await expect(page.getByRole('region',{name:'Administrera fördelningstyper'})).toBeVisible();
 const backup=page.getByRole('region',{name:'Backup och återställning'});
 await expect(backup).toBeVisible();
 await expect(backup.getByRole('heading',{name:'Projektbackup och dataexport'})).toBeVisible();
 await expect(backup.getByRole('heading',{name:'Återställ lokal arbetsyta'})).toBeVisible();
});
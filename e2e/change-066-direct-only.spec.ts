import {test,expect} from '@playwright/test';
test('only automatic Excel import and source management are shown',async({page})=>{
 await page.goto('./');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Importera Excelunderlag'})).toBeVisible();
 await expect(page.getByLabel('Välj filer för automatisk import')).toBeVisible();
 await page.getByRole('button',{name:'Visa källor och hantera import'}).click();
 await expect(page.getByRole('heading',{name:'Importerade källor'})).toBeVisible();
 await expect(page.locator('#import-files')).toHaveCount(0);
 await expect(page.getByText('Anpassa tolkningen av Excelmallen')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Godkänn import'})).toHaveCount(0);
});

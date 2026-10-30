import {test,expect} from '@playwright/test';

test('DEV-155 import shows stages and hides source administration until requested',async({page})=>{
 await page.goto('./');
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await expect(page.getByRole('region',{name:'Steg 1 Importera'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'1. Importera filer'})).toBeVisible();
 const sources=page.getByRole('region',{name:'Hantera importerade källor'});
 await expect(sources).toBeVisible();
 await expect(sources.getByRole('heading',{name:'Importerade källor'})).toHaveCount(0);
 await sources.getByRole('button',{name:'Visa källor och hantera import'}).click();
 await expect(sources.getByRole('heading',{name:'Importerade källor'})).toBeVisible();
 await sources.getByRole('button',{name:'Dölj källor'}).click();
 await expect(sources.getByRole('heading',{name:'Importerade källor'})).toHaveCount(0);
});

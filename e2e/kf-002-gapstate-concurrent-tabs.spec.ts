import {expect,test,type Page} from '@playwright/test';

async function openGaps(page:Page){
 await page.goto('./');
 await page.getByRole('button',{name:'Kompletteringar',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Nytt informationskrav'})).toBeVisible();
}
async function createRequirement(page:Page,name:string){
 await page.getByLabel('Kravnamn').fill(name);
 await page.getByRole('button',{name:'Lägg till informationskrav'}).click();
}
test('KF-002: a stale tab cannot overwrite another tab\'s GapState update',async({context})=>{
 const first=await context.newPage(),second=await context.newPage();
 await openGaps(first);
 await openGaps(second);
 await createRequirement(first,'Sparad från första fliken');
 await expect(first.locator('li').filter({hasText:'Sparad från första fliken'})).toBeVisible();
 await createRequirement(second,'Föråldrad andra fliken');
 await expect(second.getByRole('alert').filter({hasText:'STALE_GAP_STATE'})).toContainText('STALE_GAP_STATE');
 await second.reload();
 await second.getByRole('button',{name:'Kompletteringar',exact:true}).click();
 await expect(second.locator('li').filter({hasText:'Sparad från första fliken'})).toBeVisible();
 await expect(second.locator('li').filter({hasText:'Föråldrad andra fliken'})).toHaveCount(0);
});

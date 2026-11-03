import {expect,test,type Page} from '@playwright/test';

async function openGaps(page:Page){
 await page.goto('./');
 await page.getByRole('button',{name:'Kompletteringar',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Nytt informationskrav'})).toBeVisible();
}

async function addRequirement(page:Page,name:string){
 await page.getByLabel('Kravnamn').fill(name);
 await page.getByRole('button',{name:'Lägg till informationskrav'}).click();
 await expect(page.locator('li').filter({hasText:name})).toBeVisible();
}

test('KF-004: scoped gap updates warn active editors but not an unrelated overview',async({context})=>{
 const writer=await context.newPage(),reader=await context.newPage();
 await openGaps(writer);
 await reader.goto('./');
 await expect(reader.getByRole('button',{name:'Kompletteringar',exact:true})).toBeVisible();
 await addRequirement(writer,'Skapat från första fliken');
 await expect(reader.getByRole('alert').filter({hasText:'annan flik'})).toHaveCount(0);
 await expect(writer.getByRole('alert').filter({hasText:'annan flik'})).toHaveCount(0);

 // Opening a view after the notification loads current state without warning.
 await reader.getByRole('button',{name:'Kompletteringar',exact:true}).click();
 await expect(reader.locator('li').filter({hasText:'Skapat från första fliken'})).toBeVisible();
 await addRequirement(writer,'Ny uppdatering');
 await expect(reader.getByRole('alert').filter({hasText:'Kompletteringar eller fördelningar har ändrats i en annan flik'})).toBeVisible();
 await expect(writer.getByRole('alert').filter({hasText:'annan flik'})).toHaveCount(0);
 await reader.getByRole('button',{name:'Ladda om nu'}).click();
 await expect(reader.getByRole('alert').filter({hasText:'annan flik'})).toHaveCount(0);
 await reader.getByRole('button',{name:'Kompletteringar',exact:true}).click();
 await expect(reader.locator('li').filter({hasText:'Ny uppdatering'})).toBeVisible();
});

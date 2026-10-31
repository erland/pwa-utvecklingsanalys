import {test,expect} from '@playwright/test';

test('DEV-151 allocation types show overview and open forms on demand',async({page})=>{
 await page.goto('./');
 await page.getByRole('button',{name:'Inställningar',exact:true}).click();
 const view=page.getByRole('region',{name:'Valfria fördelningstyper'});
 const overview=view.getByRole('region',{name:'Befintliga fördelningstyper'});
 await expect(overview).toBeVisible();
 await expect(view.getByLabel('Namn på fördelningstyp')).toHaveCount(0);
 await overview.getByRole('button',{name:'Ny fördelningstyp'}).click();
 await expect(overview).toHaveCount(0);
 await view.getByLabel('Namn på fördelningstyp').fill('Tillfällig');
 await view.getByRole('button',{name:'Avbryt',exact:true}).click();
 await expect(overview).toBeVisible();
 await expect(overview).not.toContainText('Tillfällig');
 await overview.getByRole('button',{name:'Ny fördelningstyp'}).click();
 await view.getByLabel('Namn på fördelningstyp').fill('Effekt');
 await view.getByRole('button',{name:'Skapa fördelningstyp'}).click();
 await expect(overview).toContainText('Effekt');
 await expect(overview).toContainText('0 regler');
 await overview.getByRole('button',{name:/Effekt.*regler/}).click();
 await expect(view.getByLabel('Namn på fördelningstyp')).toHaveValue('Effekt');
 await view.getByLabel('Namn på fördelningstyp').fill('Osparad');
 await view.getByRole('button',{name:'Avbryt',exact:true}).click();
 await expect(overview).toContainText('Effekt');
 await expect(overview).not.toContainText('Osparad');
});

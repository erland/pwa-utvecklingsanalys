import {expect,test,type Page} from '@playwright/test';

async function openDefinitions(page:Page){
 await page.goto('./');
 await page.getByRole('button',{name:'Inställningar',exact:true}).click();
 const view=page.getByRole('region',{name:'Valfria fördelningstyper'});
 await expect(view.getByRole('button',{name:'Ny fördelningstyp'})).toBeVisible();
 return view;
}

async function createDimension(page:Page,name:string){
 const view=page.getByRole('region',{name:'Valfria fördelningstyper'});
 await view.getByRole('button',{name:'Ny fördelningstyp'}).click();
 await view.getByLabel('Namn på fördelningstyp').fill(name);
 await view.getByRole('button',{name:'Skapa fördelningstyp'}).click();
 return view;
}

test('IP-006: stale optional allocation editor cannot overwrite a newer tab revision',async({context})=>{
 const first=await context.newPage(),second=await context.newPage();
 // Both editors must finish loading the same original configuration revision.
 await openDefinitions(first);
 await openDefinitions(second);

 const firstView=await createDimension(first,'Från första fliken');
 await expect(firstView.getByRole('status')).toContainText('Fördelningen sparades');

 const staleView=await createDimension(second,'Från äldre flik');
 await expect(staleView.getByRole('alert')).toContainText('Fördelningarna har ändrats i en annan flik');
 await expect(staleView.getByRole('status').filter({hasText:'Fördelningen sparades'})).toHaveCount(0);

 // The writer must be able to save again with the revision returned from its first commit.
 await createDimension(first,'Andra sparningen');
 await expect(firstView.getByRole('status')).toContainText('Fördelningen sparades');

 await second.reload();
 await second.getByRole('button',{name:'Inställningar',exact:true}).click();
 const reloaded=second.getByRole('region',{name:'Valfria fördelningstyper'});
 await expect(reloaded.getByText('Från första fliken',{exact:true})).toBeVisible();
 await expect(reloaded.getByText('Andra sparningen',{exact:true})).toBeVisible();
 await expect(reloaded.getByText('Från äldre flik',{exact:true})).toHaveCount(0);
});

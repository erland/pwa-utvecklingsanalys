import {test,expect} from '@playwright/test';
test('normal navigation exposes only the supported import-to-analysis workflow',async({page})=>{
 await page.addInitScript(()=>localStorage.removeItem('utvecklingsanalys:e2e-legacy-navigation'));
 await page.goto('./');
 const nav=page.getByRole('navigation',{name:'Huvudmeny'});
 await expect(nav.getByRole('button')).toHaveCount(4);
 for(const label of ['Översikt','Import','Analys','Inställningar'])await expect(nav.getByRole('button',{name:label,exact:true})).toBeVisible();
 for(const label of ['Konfiguration','Relationer','Planering','Grupper','Fördelningar','Kompletteringar'])await expect(nav.getByRole('button',{name:label,exact:true})).toHaveCount(0);
 await nav.getByRole('button',{name:'Import'}).click();
 await expect(page.getByRole('heading',{name:'Importera Excelunderlag'})).toBeVisible();
 await expect(nav.getByRole('button',{name:'Analys'})).toBeDisabled();
 await expect(page.getByRole('heading',{name:'Importera Excelunderlag'})).toBeVisible();
});

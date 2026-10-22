import {test,expect} from '@playwright/test';
test('keyboard reaches project import, announces error and disables unsafe restore',async({page})=>{
 await page.goto('./');
 await page.getByRole('button',{name:'Inställningar'}).focus();
 await page.keyboard.press('Enter');
 const picker=page.getByLabel('Välj projektbackup');
 await picker.focus();
 await expect(picker).toBeFocused();
 await picker.setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{invalid')});
 await expect(page.getByRole('status')).toContainText('Filen avvisades');
 await expect(page.getByRole('button',{name:'Bekräfta återställning'})).toBeDisabled();
});
test('tab and enter operate planning controls without a mouse',async({page})=>{
 await page.goto('./');
 const nav=page.getByRole('button',{name:'Planering'});
 await nav.focus();await page.keyboard.press('Enter');
 await expect(nav).toHaveAttribute('aria-current','page');
 const field=page.getByRole('spinbutton',{name:'Planeringsår'});
 await field.focus();await page.keyboard.press('ArrowDown');
 await expect(field).toHaveValue('2026');
 await page.getByRole('textbox',{name:'Scenarionamn'}).focus();
 await page.keyboard.type('Tillgänglighetstest');
 await expect(page.getByRole('button',{name:'Skapa scenarioutkast'})).toBeEnabled();
});

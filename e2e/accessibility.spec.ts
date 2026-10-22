import {test,expect} from '@playwright/test';
test('mobile navigation, keyboard operation and labeled backup controls',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('./');
 await expect(page.getByRole('navigation',{name:'Huvudmeny'})).toBeVisible();
 const settings=page.getByRole('button',{name:'Inställningar'});
 await settings.focus();await page.keyboard.press('Enter');
 await expect(page.getByRole('heading',{name:'Inställningar'})).toBeVisible();
 await expect(page.getByLabel('Välj projektbackup')).toHaveCount(1);
 await expect(page.getByRole('button',{name:'Exportera observationer XLSX'})).toBeVisible();
});

test('small screen controls stay inside viewport and keyboard focus visible',async({page})=>{
 await page.setViewportSize({width:320,height:700});await page.goto('./');
 await page.getByRole('button',{name:'Inställningar'}).click();
 const control=page.getByRole('button',{name:'Ladda ner komprimerad backup (GZIP)'});
 await control.focus();await expect(control).toBeFocused();
 const outline=await control.evaluate(el=>getComputedStyle(el).outlineStyle);expect(outline).not.toBe('none');
 const bounds=await control.boundingBox();expect(bounds).not.toBeNull();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(322);
});

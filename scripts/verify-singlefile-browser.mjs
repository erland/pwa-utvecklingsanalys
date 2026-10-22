import {chromium} from '@playwright/test';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(pathToFileURL(resolve('dist-singlefile/index.html')).href);
 await page.getByRole('heading',{name:'Överblick över verksamhetsutvecklingen'}).waitFor();
 await page.getByRole('button',{name:'Inställningar'}).click();
 await page.getByRole('heading',{name:'Inställningar'}).waitFor();
 if(errors.length)throw new Error('Standalone browser runtime error: '+errors.join(' | '));
}finally{await browser.close()}

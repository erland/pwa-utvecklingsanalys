import {readFile,readdir} from 'node:fs/promises';
const items=await readdir('dist-singlefile');
if(items.length!==1||items[0]!=='index.html')throw new Error('Standalone package must contain only index.html: '+items);
const html=await readFile('dist-singlefile/index.html','utf8');
if(!html.includes('<style')||!html.includes('<script'))throw new Error('Inline CSS and JS not found');
if(/<script[^>]+src=|<link[^>]+rel=["']stylesheet|<link[^>]+rel=["']modulepreload/.test(html))throw new Error('External JS/CSS dependency in single HTML');
if(html.length<10000)throw new Error('Standalone HTML suspiciously small');

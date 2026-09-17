import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:5174/');
 await expect(page.locator('#plan')).toBeVisible();
 await expect(page.locator('#drive')).toBeDisabled();
 assert.equal(await page.locator('[data-preset]').count(),0);
 await page.screenshot({path:'studio-blank.png',fullPage:true});
 async function pos(x,y){return page.locator('#plan').evaluate((svg,[x,y])=>{const p=svg.createSVGPoint();p.x=x;p.y=y;const q=p.matrixTransform(svg.getScreenCTM());return{x:q.x,y:q.y};},[x,y]);}
 async function click(x,y){const p=await pos(x,y);await page.mouse.click(p.x,p.y);}
 for(const p of [[-65,-35],[-20,-48],[42,-37],[65,-8],[37,22],[-25,30],[-63,5]])await click(...p);
 await expect(page.locator('#corners')).toHaveText('7');
 await page.locator('#closeTrack').click();await expect(page.locator('#drive')).toBeEnabled();
 await page.locator('button[data-tool="move"]').click();let p=await pos(-20,-48),q=await pos(-15,-54);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(q.x,q.y,{steps:5});await page.mouse.up();
 assert.ok(Math.abs(Number(await page.locator('circle[data-index="1"]').getAttribute('cy'))+54)<.01);
 await page.locator('#historyUndo').click();assert.ok(Math.abs(Number(await page.locator('circle[data-index="1"]').getAttribute('cy'))+48)<.01);
 await page.locator('#historyRedo').click();assert.ok(Math.abs(Number(await page.locator('circle[data-index="1"]').getAttribute('cy'))+54)<.01);
 await page.locator('button[data-tool="insert"]').click();await click(60,12);await expect(page.locator('#corners')).toHaveText('8');
 await page.locator('button[data-tool="delete"]').click();await click(60,12);await expect(page.locator('#corners')).toHaveText('7');
 await page.locator('#trackName').fill('Handmade test circuit');await page.locator('#biome').selectOption('forest');await page.locator('#facilitiesOption').uncheck();await page.locator('#save').click();
 await page.locator('#viewOutline').click();await expect(page.locator('.plan-panel')).toHaveClass(/outline-mode/);assert.equal(await page.locator('#planDrawing circle').count(),0);
 const download=page.waitForEvent('download');await page.locator('#exportSvg').click();assert.equal((await download).suggestedFilename(),'circuit.svg');
 await page.screenshot({path:'studio-outline.png',fullPage:true});
 await page.locator('#view3d').click();await page.waitForTimeout(500);await page.screenshot({path:'studio-desktop.png',fullPage:true});
 await page.locator('#drive').click();await page.keyboard.down('w');await page.waitForTimeout(1500);await page.keyboard.up('w');assert.ok(Number(await page.locator('#speed').textContent())>10);
 await page.locator('#respawn').click();await expect(page.locator('#speed')).toHaveText('0');await page.locator('#drive').click();
 await page.reload();await expect(page.locator('#drive')).toBeDisabled();await page.locator('#circuitsNav').click();await page.locator('.saved-item').click();await expect(page.locator('#corners')).toHaveText('7');await expect(page.locator('#biome')).toHaveValue('forest');await expect(page.locator('#facilitiesOption')).not.toBeChecked();
 await page.locator('#clearTrack').click();await expect(page.locator('#corners')).toHaveText('0');await expect(page.locator('#drive')).toBeDisabled();await page.locator('#historyUndo').click();await expect(page.locator('#corners')).toHaveText('7');
 await page.screenshot({path:'studio-editor.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'studio-mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);console.log('PASS: blank start, drawing, closing, moving, insert/delete, undo/redo, SVG export, 3D, driving, persistence, clearing, and mobile layout.');
} finally {await browser.close();}

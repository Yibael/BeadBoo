import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
const engine=process.env.BROWSER_ENGINE||'chromium';
const browser=await({chromium,webkit}[engine]).launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true}),page=await context.newPage();
try{
 await page.goto(process.env.TEST_URL||'http://localhost:5173');await page.getByRole('button',{name:'使用围巾小猫示例'}).waitFor();
 assert((await page.locator('meta[name=viewport]').getAttribute('content')).includes('user-scalable=no'));
 const cancelled=await page.evaluate(()=>{const start=new Event('gesturestart',{bubbles:true,cancelable:true}),change=new Event('gesturechange',{bubbles:true,cancelable:true});document.dispatchEvent(start);document.dispatchEvent(change);return start.defaultPrevented&&change.defaultPrevented;});assert(cancelled);
 if(engine==='chromium'){
  // Remove meta restrictions to test CSS independently, as Safari can ignore them.
  await page.locator('meta[name=viewport]').evaluate(node=>node.setAttribute('content','width=device-width,initial-scale=1,viewport-fit=cover'));
  const cdp=await context.newCDPSession(page),scale=await page.evaluate(()=>visualViewport.scale);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:140,y:330,id:1},{x:230,y:330,id:2}]});
  for(let n=1;n<=8;n++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:140-n*10,y:330,id:1},{x:230+n*10,y:330,id:2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>visualViewport.scale),scale);
  await page.getByRole('button',{name:'下一步 · 选色卡'}).isVisible();await cdp.detach();
 }
 console.log(`PASS ${engine}: viewport limits and gesture cancellation${engine==='chromium'?', actual page pinch blocked with meta limits removed':''}`);
}finally{await browser.close();}

async (page) => {
  const browser = page.context().browser();
  const portraitContext = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const p = await portraitContext.newPage();
  const errors=[]; p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://127.0.0.1:4173/?v=mobile-fix-1');
  await p.waitForSelector('#loading',{state:'detached'});
  await p.locator('[data-game=maze]').tap();
  await p.waitForTimeout(120);
  const maze = await p.evaluate(() => {
    const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}};
    return {wrap:box('.canvas-wrap'),canvas:box('canvas'),buttons:[...document.querySelectorAll('.dpad .control')].map(b=>{const r=b.getBoundingClientRect();return {width:r.width,height:r.height}}),overflow:document.documentElement.scrollWidth>innerWidth};
  });
  if(maze.overflow || Math.abs(maze.wrap.width/maze.wrap.height-1.5)>.01 || Math.abs(maze.wrap.height-maze.canvas.height)>2 || maze.buttons.some(b=>b.width<72||b.height<72) || maze.buttons.at(-1).height+maze.buttons.at(-1).height>844) throw Error('Maze mobile geometry '+JSON.stringify(maze));
  await p.screenshot({path:'output/playwright/mobile-pass-maze.png'});
  await portraitContext.close();

  const duoContext=await browser.newContext({viewport:{width:932,height:430},isMobile:true,hasTouch:true});
  await duoContext.addInitScript(() => {
    const original=CanvasRenderingContext2D.prototype.drawImage;
    window.duoLatest={}; window.duoJumps={wika:false,michal:false};
    CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
      if(this.canvas===document.querySelector('.duo-shell canvas') && /^duo(Wika|Michal)(Idle|Walk|Jump|Push)$/.test(image.assetKey||'')){
        const id=image.assetKey.startsWith('duoWika')?'wika':'michal', t=this.getTransform();
        window.duoLatest[id]={x:t.a<0?t.e-(args[2]||image.width):t.e,key:image.assetKey};
        if(image.assetKey.endsWith('Jump')) window.duoJumps[id]=true;
      }
      return original.call(this,image,...args);
    };
  });
  const d=await duoContext.newPage(); d.on('pageerror',e=>errors.push(e.message));
  await d.goto('http://127.0.0.1:4173/?v=mobile-fix-1');
  await d.waitForSelector('#loading',{state:'detached'});
  await d.locator('[data-game=duo]').tap();
  await d.locator('#duo-panel-action').tap();
  await d.waitForTimeout(180);
  const controls=await d.evaluate(()=>[...document.querySelectorAll('.duo-touch button')].map(b=>{const r=b.getBoundingClientRect();return {label:b.getAttribute('aria-label'),x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}}));
  if(controls.length!==6 || controls.some(b=>b.width<64||b.height<64||b.x<14||b.right>932-14||b.bottom>430-10)) throw Error('Duo touch targets '+JSON.stringify(controls));
  const cdp=await duoContext.newCDPSession(d);
  const point=async(owner,action,id)=>{const r=await d.locator(`[data-duo-owner=${owner}][data-duo-action=${action}]`).boundingBox();return {x:r.x+r.width/2,y:r.y+r.height/2,id}};
  const touch=async(specs)=>{
    const pts=[]; for(let i=0;i<specs.length;i++) pts.push(await point(specs[i][0],specs[i][1],i+1));
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:pts});
    await d.waitForTimeout(220);
    const state=await d.evaluate(()=>({latest:structuredClone(window.duoLatest),jumps:structuredClone(window.duoJumps)}));
    await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
    await d.waitForTimeout(80);
    return state;
  };
  const start=await d.evaluate(()=>structuredClone(window.duoLatest));
  await d.evaluate(()=>window.duoJumps={wika:false,michal:false});
  const inward=await touch([['wika','right'],['wika','jump'],['michal','left'],['michal','jump']]);
  if(!(inward.latest.wika.x>start.wika.x && inward.latest.michal.x<start.michal.x && inward.jumps.wika && inward.jumps.michal)) throw Error('Inward move+jump failed '+JSON.stringify({start,inward}));
  const middle=await d.evaluate(()=>structuredClone(window.duoLatest));
  await d.evaluate(()=>window.duoJumps={wika:false,michal:false});
  const outward=await touch([['wika','left'],['wika','jump'],['michal','right'],['michal','jump']]);
  if(!(outward.latest.wika.x<middle.wika.x && outward.latest.michal.x>middle.michal.x && outward.jumps.wika && outward.jumps.michal)) throw Error('Outward move+jump failed '+JSON.stringify({middle,outward}));
  await d.screenshot({path:'output/playwright/mobile-pass-duo.png'});
  await duoContext.close();
  if(errors.length) throw Error(errors.join('\n'));
  return {maze,duo:{controls,inward,outward},errors};
}
;

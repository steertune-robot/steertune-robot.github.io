(() => {
 const root=document.querySelector('[data-contact-story]');if(!root)return;
 const svg=root.querySelector('.contact-chart svg'),chart=root.querySelector('.contact-chart');
 const play=root.querySelector('[data-contact-play]'),seek=root.querySelector('[data-contact-seek]'),output=root.querySelector('[data-contact-time]');
 const errorNode=root.querySelector('[data-contact-error]'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const ns='http://www.w3.org/2000/svg',video=root.querySelector('[data-contact-video]');
 const colors={L:'#dce9df',R:'#eee0ca',LR:'#e4deef',None:'#eeeae2'};
 const displayAlpha=.35;
 let plotSamples=[];
 const annotation=root.querySelector('[data-contact-grounding]');
 const scanPlaybackRate=4,annotationSpeedMultiplier=2;
 const annotationPlaybackRate=.75*annotationSpeedMultiplier;
 // Keep the scan at 4×; annotations run at 2× their original speed (20 seconds).
 const annotationLength=30000;
 // These stages illustrate existing Qwen/Gemini/SAM annotations; they do not run inference.
 // Use the measured both-hand contact clip; the reviewed prompt remains at frame 123.
 const pickup={start:106,end:153,seed:123,middle:131};
 const recording=root.querySelector('.contact-recording');
 // Present RGB and its registered mask in one canvas update. Keep the last
 // complete pair visible while a seek or mask decode is pending.
 const maskFrames=new Map(),annotationCanvas=document.createElement('canvas');
 annotationCanvas.width=640;annotationCanvas.height=480;annotationCanvas.className='annotation-frame-transition';
 annotationCanvas.setAttribute('aria-hidden','true');annotation.append(annotationCanvas);
 annotation.querySelector('.annotation-mask-layer').style.visibility='hidden';
 let presentedFrame=null,decodedFrame=null,videoFrameCallback=0;
 const hasVideoFrameCallback=typeof video.requestVideoFrameCallback==='function';
 function watchDecodedFrame(){
  if(!hasVideoFrameCallback||videoFrameCallback)return;
  videoFrameCallback=video.requestVideoFrameCallback((now,metadata)=>{
   videoFrameCallback=0;
   if(data)decodedFrame=Math.round(frameAt(metadata.mediaTime));
   renderAnnotationFrame();watchDecodedFrame();
  });
 }
 watchDecodedFrame();
 function clearAnnotationFrame(){annotationCanvas.style.opacity='0';presentedFrame=null;}
 function holdAnnotationFrame(){
  if(annotationCanvas.style.opacity==='1'||video.readyState<2)return;
  annotationCanvas.getContext('2d').drawImage(video,0,0,640,480);
  annotationCanvas.style.opacity='1';
 }
 function renderAnnotationFrame(){
  if(!data||!annotationStarted||video.seeking||video.readyState<2||annotationVideoFrame===null)return;
  const decoded=hasVideoFrameCallback?decodedFrame:Math.round(frameAt(video.currentTime));
  if(decoded!==annotationVideoFrame)return;
  const showMask=annotationTime>=20200,mask=maskFrames.get(decoded);
  if(showMask&&!mask)return;
  const context=annotationCanvas.getContext('2d');
  context.drawImage(video,0,0,640,480);
  if(showMask)context.drawImage(mask,80,120,480,360);
  annotationCanvas.style.opacity='1';presentedFrame=decoded;
 }
 video.addEventListener('seeked',renderAnnotationFrame);
 let annotationTime=0,annotationStarted=false,annotationPlaying=false,annotationRaf=0,annotationLast=0,annotationVideoFrame=null;
 const clamp=value=>Math.max(0,Math.min(1,value));
 const smooth=value=>{const p=clamp(value);return p*p*(3-2*p);};
 const copyTransitions=new Map();
 // Crossfade only stage copy, not continuously changing timestamps/contact measurements.
 function swapCopy(node,value){
  const pending=copyTransitions.get(node);
  if((pending?pending.value:node.textContent)===value)return;
  if(pending)pending.animation.cancel();
  if(reduced.matches||!node.textContent||!node.getClientRects().length){node.textContent=value;copyTransitions.delete(node);return;}
  const animation=node.animate([{opacity:1},{opacity:0}],{duration:180/annotationPlaybackRate,easing:'ease-in-out',fill:'forwards'});
  const state={value,animation};copyTransitions.set(node,state);
  animation.finished.then(()=>{
   if(copyTransitions.get(node)!==state)return;
   node.textContent=value;animation.cancel();
   state.animation=node.animate([{opacity:0,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],{duration:420/annotationPlaybackRate,easing:'cubic-bezier(.22,1,.36,1)'});
   if(!annotationPlaying||!visible||document.hidden)state.animation.pause();
   return state.animation.finished;
  }).then(()=>{if(copyTransitions.get(node)===state)copyTransitions.delete(node);}).catch(()=>{});
 }
 const sequenceStep=t=>t<3200?'bounds':t<7200?'qwen':t<10500?'instruction':t<12500?'contact':t<16000?'gemini':t<18500?'point':t<21500?'sam':t<30000?'propagate':'complete';
 function annotationFrame(){
  const t=annotationTime;
  if(t>=annotationLength)return pickup.start; // End on the masked start of the selected clip.
  if(t<3200)return Math.round(pickup.start+(pickup.end-pickup.start)*Math.min(1,t/2400));
  if(t<7200)return t<4050?pickup.start:t<4900?pickup.middle:pickup.end;
  if(t<10500)return pickup.end;
  if(t<21500)return pickup.seed;
  if(t<23800)return Math.round(pickup.seed-(pickup.seed-pickup.start)*(t-21500)/2300);
  if(t<25100)return pickup.start; // Hold the selected clip start with its matching mask.
  return Math.round(pickup.start+(pickup.end-pickup.start)*Math.min(1,(t-25100)/3600));
 }

 const flights=[...annotation.querySelectorAll('.annotation-clips img')].map((image,i)=>({image,src:image.getAttribute('src'),target:annotation.querySelector('.qwen-model'),start:3400+i*850,length:1150}));
 flights.push({image:video,src:'assets/contact/grounding/frame-123.jpg?v=29579191bd69',target:annotation.querySelector('.gemini-model'),start:12800,length:1300});
 flights.forEach(flight=>{const ghost=document.createElement('img');ghost.src=flight.src;ghost.alt='';ghost.className='annotation-feed-clip';ghost.setAttribute('aria-hidden','true');annotation.append(ghost);flight.ghost=ghost;});
 const pointGhost=document.createElement('i');pointGhost.className='annotation-prompt-flight';pointGhost.setAttribute('aria-hidden','true');annotation.append(pointGhost);
 function paintFeed(t){
  const base=annotation.getBoundingClientRect();
  flights.forEach(({image,target,start,length,ghost})=>{
   const p=Math.max(0,Math.min(1,(t-start)/length)),rect=image.getBoundingClientRect(),from=image===video?{left:rect.left+rect.width*.48,top:rect.top+rect.height*.48,width:rect.width*.25,height:rect.height*.1875}:rect,to=target.getBoundingClientRect(),ease=p*p*(3-2*p);
   ghost.style.left=`${from.left-base.left}px`;ghost.style.top=`${from.top-base.top}px`;ghost.style.width=`${from.width}px`;
   ghost.style.transform=`translate(${(to.left+to.width/2-from.left-from.width/2)*ease}px,${(to.top+to.height/2-from.top-from.height/2)*ease}px) scale(${1-.65*ease})`;
   ghost.style.opacity=annotationStarted&&p>0&&p<1?String(smooth(p*5)*smooth((1-p)*5)):0;
  });
  const returning=t<18500,p=Math.max(0,Math.min(1,(t-(returning?16200:18800))/1300)),from=annotation.querySelector(returning?'.gemini-model':'.annotation-point').getBoundingClientRect(),to=annotation.querySelector(returning?'.annotation-point':'.sam-model').getBoundingClientRect(),ease=p*p*(3-2*p);
  pointGhost.style.left=`${from.left+from.width/2-base.left}px`;pointGhost.style.top=`${from.top+from.height/2-base.top}px`;
  pointGhost.style.transform=`translate(${(to.left+to.width/2-from.left-from.width/2)*ease}px,${(to.top+to.height/2-from.top-from.height/2)*ease}px)`;
  pointGhost.style.opacity=annotationStarted&&p>0&&p<1?String(smooth(p*5)*smooth((1-p)*5)):0;
 }
 function annotationIsVisible(){return visible;}
 function paintAnnotation(){
  const t=annotationTime,done=t>=annotationLength,step=sequenceStep(t),selected=annotationFrame();
  annotation.dataset.step=annotationStarted?step:'waiting';recording.dataset.step=annotationStarted?step:'scan';
  chart.dataset.step=annotationStarted?step:'scan';chart.classList.toggle('is-annotating',annotationStarted);
  if(annotationStarted&&selected!==annotationVideoFrame&&!video.seeking){
   holdAnnotationFrame();annotationVideoFrame=selected;video.pause();
   // Seek inside the encoded frame, avoiding floating-point boundary rounding.
   video.currentTime=timeAt(selected)+.001;
  }else if(!annotationStarted)annotationVideoFrame=null;
  renderAnnotationFrame();
  annotation.dataset.phase=annotationStarted?(done?'complete':annotationPlaying&&annotationIsVisible()&&!document.hidden?'playing':'paused'):'waiting';
  annotation.dataset.point=String(annotationStarted&&t>=17500);
  annotation.dataset.mask=String(annotationStarted&&t>=20200);
  swapCopy(annotation.querySelector('[data-sam-description]'),done?'Clip start':t>=21500?'Track the mask':'Point → mask');
  swapCopy(annotation.querySelector('[data-propagation-direction]'),t<23800?'← Track to clip start':t<25100?'Mask at clip start':'Track through the clip →');
  paintFeed(t);if(draw)draw();
  paintControls();
 }
 let completionHold=0;
 function annotationTick(now){
  annotationRaf=0;
  if(!annotationPlaying||!annotationIsVisible()||document.hidden){annotationLast=0;paintAnnotation();return;}
  if(annotationLast){
   if(annotationTime>=annotationLength&&!video.seeking&&presentedFrame===pickup.start)completionHold+=now-annotationLast;
   else if(!video.seeking&&presentedFrame===annotationFrame())annotationTime=Math.min(annotationLength,annotationTime+(now-annotationLast)*annotationPlaybackRate);
  }
  annotationLast=now;
  if(annotationTime>=annotationLength&&completionHold>=2000/annotationSpeedMultiplier&&!reduced.matches){
   completionHold=0;frame=0;video.currentTime=0;resetAnnotation();playing=true;sync();return;
  }
  paintAnnotation();
  if(annotationPlaying&&annotationIsVisible())annotationRaf=requestAnimationFrame(annotationTick);else {annotationLast=0;paintAnnotation();}
 }
 function syncAnnotation(){
  if(!data)return;
  const run=annotationPlaying&&annotationIsVisible()&&!document.hidden;
  copyTransitions.forEach(({animation})=>{if(run)animation.play();else animation.pause();});
  if(!run){cancelAnimationFrame(annotationRaf);annotationRaf=0;annotationLast=0;}
  else if(!annotationRaf){annotationLast=0;annotationRaf=requestAnimationFrame(annotationTick);}
  paintAnnotation();
 }
 function resetAnnotation(){completionHold=0;clearAnnotationFrame();annotationStarted=false;annotationPlaying=false;annotationTime=0;syncAnnotation();}
 function startAnnotation(){
  completionHold=0;playing=false;video.pause();annotationStarted=true;annotationTime=reduced.matches?annotationLength:0;annotationPlaying=!reduced.matches;syncAnnotation();
 }
 let data,frame=0,playing=false,visible=false,started=false,raf=0,draw;
 const el=(name,attrs={},parent=svg)=>{const node=document.createElementNS(ns,name);Object.entries(attrs).forEach(([k,v])=>node.setAttribute(k,v));parent.append(node);return node;};
 function text(value,x,y,attrs={}){const node=el('text',{x,y,...attrs});node.textContent=value;return node;}
 // Smooth only the display; raw samples still determine contact and clip boundaries.
 function emaSamples(samples,alpha){
  const state={left:null,right:null};
  return samples.map(source=>{
   const row={...source};
   for(const side of ['left','right']){
    const value=source[side];
    state[side]=value===null?null:state[side]===null?value:alpha*value+(1-alpha)*state[side];
    row[side]=state[side];
   }
   return row;
  });
 }
 function sample(side,f,samples=data.samples){
  const i=samples.findIndex(s=>s.frame>=f);if(i<0)return null;
  const b=samples[i];if(b.frame===f)return b[side];if(i===0)return null;
  const a=samples[i-1];if(a[side]===null||b[side]===null)return null;
  return a[side]+(b[side]-a[side])*(f-a.frame)/(b.frame-a.frame);
 }
 function timeAt(f){const a=Math.floor(f),b=Math.min(data.totalFrames,a+1);return data.samples[a].time+(data.samples[b].time-data.samples[a].time)*(f-a);}
 function frameAt(t){const i=data.samples.findIndex(s=>s.time>=t);if(i<0)return data.totalFrames;if(i===0)return 0;const a=data.samples[i-1],b=data.samples[i];return a.frame+(b.frame-a.frame)*(t-a.time)/(b.time-a.time);}
 function build(){
  if(!data||!chart.clientWidth)return;svg.replaceChildren();
  const w=chart.clientWidth,h=300,left=42,right=w-12,top=64,bottom=238;
  svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
  const title=el('title');title.textContent='Hand–scene distance and contact-based demonstration clips';
  const desc=el('desc');desc.textContent='Left and right hand distances computed from the bread recording’s tracked landmarks and processed scene. A 5 centimetre threshold identifies contact. Left-hand contact opens the oven; both-hand contact accompanies bread placement. The final no-contact interval follows release. Curves use light EMA smoothing with alpha 0.35; contact and clip boundaries use original distances.';
  const axisSeconds=Math.ceil(data.duration),xt=t=>left+t/axisSeconds*(right-left),x=f=>xt(timeAt(f)),y=d=>bottom-d/data.yMax*(bottom-top);
  const defs=el('defs'),clip=el('clipPath',{id:'contact-trace-reveal'},defs),clipRect=el('rect',{x:left,y:top,width:0,height:bottom-top+3},clip);
  el('rect',{x:left,y:y(5),width:right-left,height:bottom-y(5),fill:'#e1ead9',opacity:.5});
  const bands=data.clips.map(c=>el('rect',{x:x(c.start),y:top,width:0,height:bottom-top,fill:colors[c.hand],opacity:.42}));
  for(let d=0;d<=data.yMax;d+=10){el('line',{x1:left,x2:right,y1:y(d),y2:y(d),stroke:'#ddd6c9',style:'stroke-width:var(--plot-stroke-grid)'});text(d, left-10,y(d)+6,{'text-anchor':'end'});}
  text('Hand–scene distance (cm)',left,20);
  const tickStep=w<500?4:2,ticks=[];for(let t=0;t<axisSeconds;t+=tickStep)if(axisSeconds-t>=tickStep*.75)ticks.push(t);ticks.push(axisSeconds);
  for(const t of ticks)text(t,xt(t),bottom+28,{'text-anchor':t===0?'start':t===axisSeconds?'end':'middle'});
  text('Time (s)', (left+right)/2,h-4,{'text-anchor':'middle'});
  el('line',{x1:left,x2:right,y1:y(5),y2:y(5),stroke:'#9e6757','stroke-width':1.5,'stroke-dasharray':'5 5'});
  text('5 cm contact',right-4,y(5)-10,{'text-anchor':'end',style:'fill:#8a5c4d'});
  const lines=el('g',{'clip-path':'url(#contact-trace-reveal)'});
  for(const [side,color] of [['left','#2d6654'],['right','#b38954']]){
   let pen=false,path='';for(const s of plotSamples){if(s[side]===null){pen=false;continue;}path+=`${pen?'L':'M'}${x(s.frame)},${y(s[side])} `;pen=true;}
   el('path',{d:path,fill:'none',stroke:color,style:'stroke-width:var(--plot-stroke-curve)','stroke-linejoin':'round','stroke-linecap':'round'},lines);
  }
  const focus=el('g',{class:'contact-plot-focus'});
  el('rect',{x:x(pickup.start),y:top,width:x(pickup.end)-x(pickup.start),height:bottom-top,fill:'#c8d8c3',opacity:.25},focus);
  const boundaries=el('g',{class:'contact-plot-boundaries'},focus);
  const boundaryParts=[pickup.start,pickup.end].map(f=>({f,line:el('line',{x1:x(f),x2:x(f),y1:bottom,y2:bottom,stroke:'#244c3b','stroke-width':1.5},boundaries),arrow:el('path',{fill:'none',stroke:'#244c3b'},boundaries)}));
  const boundLabel=el('text',{x:(x(pickup.start)+x(pickup.end))/2,y:top-9,'text-anchor':'middle'},boundaries);boundLabel.textContent='Clip: 10.6–15.3 s';
  const contactFocus=el('g',{class:'contact-plot-seed'},focus);
  const contactY=y(sample('right',pickup.seed,plotSamples));
  const seedLine=el('line',{x1:x(pickup.seed),x2:x(pickup.seed),y1:contactY,y2:contactY,stroke:'#7448c7','stroke-width':1.5,'stroke-dasharray':'3 4'},contactFocus);
  el('circle',{cx:x(pickup.seed),cy:contactY,r:9,fill:'#7448c7',opacity:.18},contactFocus);
  el('circle',{cx:x(pickup.seed),cy:contactY,r:4.5,fill:'#7448c7',stroke:'white','stroke-width':1.5},contactFocus);
  const seedLabel=el('text',{x:x(pickup.seed),y:top-9,'text-anchor':'middle',style:'fill:#7448c7'},contactFocus);seedLabel.textContent='12.3 s ↑';
  const cursor=el('line',{x1:left,x2:left,y1:top,y2:bottom,stroke:'#244c3b','stroke-width':1,opacity:.6});
  const dots=['#2d6654','#b38954'].map(fill=>el('circle',{r:4,fill,stroke:'#faf8f4','stroke-width':1.5}));
  draw=()=>{
   const markerTime=reduced.matches?annotationLength:annotationTime;
   boundaryParts.forEach(({f,line,arrow},i)=>{
    const progress=annotationStarted?smooth((markerTime-i*180)/1000):0,tip=bottom-(bottom-top)*progress;
    line.setAttribute('y1',tip);
    arrow.setAttribute('d',`M${x(f)-4},${tip+5} L${x(f)},${tip} L${x(f)+4},${tip+5}`);
    arrow.style.opacity=String(smooth((progress-.7)/.3));
   });
   const seedProgress=annotationStarted?smooth((markerTime-10500)/1100):0;
   seedLine.setAttribute('y1',contactY-(contactY-top)*seedProgress);
   seedLabel.style.opacity=String(smooth((seedProgress-.65)/.35));
   const displayFrame=annotationStarted?annotationFrame():frame;
   clipRect.setAttribute('width',Math.max(0,x(frame)-left));cursor.setAttribute('x1',x(displayFrame));cursor.setAttribute('x2',x(displayFrame));
   bands.forEach((band,i)=>{const c=data.clips[i];band.setAttribute('width',Math.max(0,x(Math.min(frame,c.end))-x(c.start)));});
   ['left','right'].forEach((side,i)=>{const d=sample(side,displayFrame,plotSamples);dots[i].style.display=d===null?'none':'';if(d!==null){dots[i].setAttribute('cx',x(displayFrame));dots[i].setAttribute('cy',y(d));}});
  };paint();
 }
 function paintControls(){
  if(!data)return;
  const selected=annotationStarted?annotationFrame():frame;
  const running=annotationStarted?annotationPlaying:playing;
  seek.value=String(Math.round(selected));output.textContent=`${timeAt(selected).toFixed(1)} / ${data.duration.toFixed(1)} s`;
  window.SteertuningPlayback.set(play,running?'pause':'play',running?'Pause clip processing':annotationStarted&&annotationTime<annotationLength?'Continue clip processing':frame>=data.totalFrames?'Replay clip processing':'Play clip processing');
  seek.setAttribute('aria-valuetext',output.textContent);
 }
 function paint(){if(!data)return;draw?.();paintAnnotation();}
 // The video is the only clock. Buffering, seeks, and playback therefore cannot drift.
 function readTime(){if(!data||annotationStarted)return;frame=Math.min(data.totalFrames,frameAt(video.currentTime));paint();}
 function tick(){raf=0;readTime();if(playing&&visible&&!document.hidden)raf=requestAnimationFrame(tick);}
 function sync(){
  if(!data)return;
  const run=playing&&visible&&!document.hidden;
  if(run){
   if(video.paused)video.play().catch(error=>{if(error.name!=='AbortError'){playing=false;sync();}});
   if(!raf)raf=requestAnimationFrame(tick);
  }else{video.pause();cancelAnimationFrame(raf);raf=0;}
  paint();syncAnnotation();
 }
 function jump(value){playing=false;frame=value;resetAnnotation();video.currentTime=timeAt(frame);sync();if(reduced.matches&&frame>=data.totalFrames)startAnnotation();}
 play.addEventListener('click',()=>{
  if(!data)return;
  if(annotationStarted&&(annotationTime<annotationLength||annotationPlaying)){annotationPlaying=!annotationPlaying;syncAnnotation();return;}
  if(frame>=data.totalFrames){frame=0;video.currentTime=0;resetAnnotation();}
  playing=!playing;sync();
 });
 seek.addEventListener('input',()=>jump(Number(seek.value)));
 video.addEventListener('seeked',readTime);
 video.addEventListener('timeupdate',readTime);
 video.addEventListener('ended',()=>{playing=false;frame=data.totalFrames;sync();startAnnotation();});
 video.addEventListener('error',()=>{playing=false;annotationPlaying=false;sync();errorNode.hidden=false;errorNode.textContent='Recording unavailable. Reload to retry.';});
 document.addEventListener('visibilitychange',sync);
 reduced.addEventListener('change',()=>{if(reduced.matches){clearAnnotationFrame();copyTransitions.forEach((state,node)=>{state.animation.cancel();node.textContent=state.value;});copyTransitions.clear();}if(reduced.matches&&data)jump(data.totalFrames);else sync();});
 const observer=new IntersectionObserver(([entry])=>{
  visible=entry.isIntersecting;
  if(visible&&data&&!started){started=true;if(!reduced.matches)playing=true;}
  sync();
 },{threshold:.15});observer.observe(root.querySelector('.contact-layout'));
 let plotWidth=0;const resize=new ResizeObserver(()=>{if(chart.clientWidth!==plotWidth){plotWidth=chart.clientWidth;build();}});resize.observe(chart);
 fetch('assets/contact/example.json?v=813a70831e80').then(r=>{if(!r.ok)throw Error('Contact example could not load');return r.json();}).then(value=>{
  for(let f=pickup.start;f<=pickup.end;f++){
   const mask=new Image();mask.onload=()=>{
    const layer=document.createElement('canvas');layer.width=mask.naturalWidth;layer.height=mask.naturalHeight;
    const context=layer.getContext('2d',{willReadFrequently:true});context.drawImage(mask,0,0);
    const pixels=context.getImageData(0,0,layer.width,layer.height);
    for(let i=0;i<pixels.data.length;i+=4){const alpha=pixels.data[i]*.65;pixels.data[i]=20;pixels.data[i+1]=170;pixels.data[i+2]=128;pixels.data[i+3]=alpha;}
    context.putImageData(pixels,0,0);maskFrames.set(f,layer);renderAnnotationFrame();
   };mask.src=`assets/contact/grounding/prompt-mask-${f}.png`;
  }
  data=value;if(!data.clips.some(c=>c.start===pickup.start&&c.end===pickup.end&&c.hand==='LR'))throw Error('Annotation must use a measured both-hand clip.');plotSamples=emaSamples(data.samples,displayAlpha);frame=reduced.matches?data.totalFrames:0;seek.max=String(data.totalFrames);video.src=data.video;video.poster=data.poster;video.playbackRate=scanPlaybackRate;video.addEventListener('loadedmetadata',()=>{video.currentTime=timeAt(annotationStarted?annotationFrame():frame);sync();},{once:true});
  play.disabled=false;seek.disabled=false;build();if(reduced.matches)startAnnotation();if(visible&&!started){started=true;if(!reduced.matches){playing=true;sync();}}
 }).catch(error=>{errorNode.hidden=false;errorNode.textContent='Contact data unavailable. Reload to retry.';console.error(error);});
 window.addEventListener('pagehide',event=>{if(videoFrameCallback)video.cancelVideoFrameCallback(videoFrameCallback);videoFrameCallback=0;video.pause();clearAnnotationFrame();copyTransitions.forEach(state=>state.animation.cancel());copyTransitions.clear();cancelAnimationFrame(raf);cancelAnimationFrame(annotationRaf);annotationRaf=0;annotationLast=0;raf=0;if(!event.persisted){observer.disconnect();resize.disconnect();}});window.addEventListener('pageshow',()=>{watchDecodedFrame();sync();});
})();

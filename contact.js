(() => {
 const root=document.querySelector('[data-contact-story]');if(!root)return;
 const video=root.querySelector('[data-contact-video]'),chart=root.querySelector('.contact-chart'),svg=chart.querySelector('svg');
 const play=root.querySelector('[data-contact-play]'),seek=root.querySelector('[data-contact-seek]'),output=root.querySelector('[data-contact-time]');
 const errorNode=root.querySelector('[data-contact-error]'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const ns='http://www.w3.org/2000/svg',colors={L:'#dce9df',R:'#eee0ca',LR:'#e4deef',None:'#eeeae2'};
 let data,plotSamples,frame=0,playing=false,visible=false,started=false,raf=0,draw;
 // The measured boundaries and raw samples stay intact; EMA is display-only.
 function smoothSamples(samples){const state={left:null,right:null};return samples.map(source=>{const row={...source};for(const side of ['left','right']){const value=source[side];state[side]=value===null?null:state[side]===null?value:.35*value+.65*state[side];row[side]=state[side];}return row;});}
 function timeAt(f){const a=Math.floor(f),b=Math.min(data.totalFrames,a+1);return data.samples[a].time+(data.samples[b].time-data.samples[a].time)*(f-a);}
 function frameAt(t){const i=data.samples.findIndex(s=>s.time>=t);if(i<0)return data.totalFrames;if(i===0)return 0;const a=data.samples[i-1],b=data.samples[i];return a.frame+(b.frame-a.frame)*(t-a.time)/(b.time-a.time);}
 function sample(side,f){const i=plotSamples.findIndex(s=>s.frame>=f);if(i<0)return null;const b=plotSamples[i];if(b.frame===f)return b[side];if(i===0)return null;const a=plotSamples[i-1];return a[side]===null||b[side]===null?null:a[side]+(b[side]-a[side])*(f-a.frame)/(b.frame-a.frame);}
 const el=(name,attrs={},parent=svg)=>{const node=document.createElementNS(ns,name);Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,value));parent.append(node);return node;};
 function label(value,x,y,attrs={}){const node=el('text',{x,y,...attrs});node.textContent=value;return node;}
 function build(){
  if(!data||!chart.clientWidth)return;svg.replaceChildren();
  const w=chart.clientWidth,h=300,left=42,right=w-12,top=48,bottom=238;
  svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
  el('title').textContent='Recorded hand–scene distances and measured interaction clips';
  el('desc').textContent='Left and right hand distances from recorded landmarks and scene clouds. Contact uses the original 5 cm threshold. Display curves use EMA alpha 0.35, resetting at missing samples. Shaded intervals retain the measured clip boundaries; gaps of at least 0.6 seconds split clips. Provenance: assets/contact/example.json and privacy-manifest.json.';
  const seconds=Math.ceil(data.duration),xt=t=>left+t/seconds*(right-left),x=f=>xt(timeAt(f)),y=d=>bottom-d/data.yMax*(bottom-top);
  const defs=el('defs'),clip=el('clipPath',{id:'contact-trace-reveal'},defs),reveal=el('rect',{x:left,y:top,width:0,height:bottom-top+3},clip);
  el('rect',{x:left,y:y(5),width:right-left,height:bottom-y(5),fill:'#e1ead9',opacity:.5});
  const bands=data.clips.map(c=>el('rect',{x:x(c.start),y:top,width:0,height:bottom-top,fill:colors[c.hand],opacity:.42}));
  for(let d=0;d<=data.yMax;d+=10){el('line',{x1:left,x2:right,y1:y(d),y2:y(d),stroke:'#ddd6c9',style:'stroke-width:var(--plot-stroke-grid)'});label(d,left-10,y(d)+6,{'text-anchor':'end'});}
  label('Hand–scene distance (cm)',left,20);
  const step=w<500?4:2,ticks=[];for(let t=0;t<seconds;t+=step)if(seconds-t>=step*.75)ticks.push(t);ticks.push(seconds);
  for(const t of ticks)label(t,xt(t),bottom+28,{'text-anchor':t===0?'start':t===seconds?'end':'middle'});
  label('Time (s)',(left+right)/2,h-4,{'text-anchor':'middle'});
  el('line',{x1:left,x2:right,y1:y(5),y2:y(5),stroke:'#9e6757','stroke-width':1.5,'stroke-dasharray':'5 5'});
  label('5 cm contact',right-4,y(5)-10,{'text-anchor':'end',style:'fill:#8a5c4d'});
  const lines=el('g',{'clip-path':'url(#contact-trace-reveal)'});
  for(const [side,color] of [['left','#2d6654'],['right','#b38954']]){let pen=false,path='';for(const s of plotSamples){if(s[side]===null){pen=false;continue;}path+=`${pen?'L':'M'}${x(s.frame)},${y(s[side])} `;pen=true;}el('path',{d:path,fill:'none',stroke:color,style:'stroke-width:var(--plot-stroke-curve)','stroke-linejoin':'round','stroke-linecap':'round'},lines);}
  const cursor=el('line',{y1:top,y2:bottom,stroke:'#244c3b','stroke-width':1,opacity:.6}),dots=['#2d6654','#b38954'].map(fill=>el('circle',{r:4,fill,stroke:'#faf8f4','stroke-width':1.5}));
  draw=()=>{reveal.setAttribute('width',Math.max(0,x(frame)-left));cursor.setAttribute('x1',x(frame));cursor.setAttribute('x2',x(frame));bands.forEach((band,i)=>{const c=data.clips[i];band.setAttribute('width',Math.max(0,x(Math.min(frame,c.end))-x(c.start)));});['left','right'].forEach((side,i)=>{const value=sample(side,frame);dots[i].style.display=value===null?'none':'';if(value!==null){dots[i].setAttribute('cx',x(frame));dots[i].setAttribute('cy',y(value));}});};paint();
 }
 function paint(){if(!data)return;draw?.();seek.value=String(Math.round(frame));output.textContent=`${timeAt(frame).toFixed(1)} / ${data.duration.toFixed(1)} s`;play.textContent=playing?'Pause':frame>=data.totalFrames?'Replay':'Play';play.setAttribute('aria-pressed',String(playing));seek.setAttribute('aria-valuetext',output.textContent);}
 function readTime(){if(!data)return;frame=Math.min(data.totalFrames,frameAt(video.currentTime));paint();}
 function tick(){raf=0;readTime();if(playing&&visible&&!document.hidden)raf=requestAnimationFrame(tick);}
 function sync(){if(!data)return;const run=playing&&visible&&!document.hidden;if(run){if(video.paused)video.play().catch(error=>{if(error.name!=='AbortError'){playing=false;sync();}});if(!raf)raf=requestAnimationFrame(tick);}else{video.pause();cancelAnimationFrame(raf);raf=0;}paint();}
 function jump(value){playing=false;frame=value;video.currentTime=timeAt(frame);sync();}
 play.addEventListener('click',()=>{if(!data)return;if(frame>=data.totalFrames){frame=0;video.currentTime=0;}playing=!playing;sync();});
 seek.addEventListener('input',()=>jump(Number(seek.value)));
 for(const event of ['seeked','timeupdate'])video.addEventListener(event,readTime);
 video.addEventListener('ended',()=>{playing=false;frame=data.totalFrames;sync();});
 video.addEventListener('error',()=>{playing=false;sync();errorNode.hidden=false;errorNode.textContent='Recording unavailable. Reload to retry.';});
 document.addEventListener('visibilitychange',sync);
 reduced.addEventListener('change',()=>{if(reduced.matches&&data)jump(data.totalFrames);else sync();});
 const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible&&data&&!started){started=true;if(!reduced.matches)playing=true;}sync();},{threshold:.15});observer.observe(root.querySelector('.contact-layout'));
 let width=0;const resize=new ResizeObserver(()=>{if(chart.clientWidth!==width){width=chart.clientWidth;build();}});resize.observe(chart);
 fetch('assets/contact/example.json?v=813a70831e80').then(r=>{if(!r.ok)throw Error('Contact example unavailable');return r.json();}).then(value=>{data=value;plotSamples=smoothSamples(data.samples);frame=reduced.matches?data.totalFrames:0;seek.max=String(data.totalFrames);video.src=data.video;video.poster=data.poster;video.playbackRate=1;video.addEventListener('loadedmetadata',()=>{video.currentTime=timeAt(frame);sync();},{once:true});play.disabled=false;seek.disabled=false;build();if(visible&&!started){started=true;playing=!reduced.matches;sync();}}).catch(error=>{errorNode.hidden=false;errorNode.textContent='Contact data unavailable. Reload to retry.';console.error(error);});
 window.addEventListener('pagehide',event=>{video.pause();cancelAnimationFrame(raf);raf=0;if(!event.persisted){observer.disconnect();resize.disconnect();}});window.addEventListener('pageshow',sync);
})();

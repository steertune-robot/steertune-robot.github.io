/* Load genuine Dwild clips only when the dataset gallery approaches the viewport. */
(() => {
 const section=document.querySelector('#collect');
 const cloud=section?.querySelector('[data-dataset-cloud]');
 if(!cloud) return;
 const button=section.querySelector('[data-dataset-toggle]');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let paused=reduced.matches, visible=false, loaded=false;
 const videos=[];
 const rails=[];
 function sizeRails() {
  for(const rail of rails) rail.style.setProperty('--travel',`${Math.max(0,rail.scrollWidth-cloud.clientWidth)}px`);
 }
 const resize=typeof ResizeObserver==='function'?new ResizeObserver(sizeRails):null;
 resize?.observe(cloud);
 if(!resize) window.addEventListener('resize',sizeRails);
 function update() {
  const running=visible&&!paused&&!document.hidden;
  cloud.dataset.paused=String(!running);
  button.textContent=paused?'Play mosaic':'Pause mosaic';
  button.setAttribute('aria-label',button.textContent);
  button.setAttribute('aria-pressed',String(paused));
  for(const video of videos) {
   if(running) video.play().catch(()=>{});
   else video.pause();
  }
 }
 async function load() {
  if(loaded) return;
  loaded=true;
  try {
   const response=await fetch('assets/dataset/manifest.json', {cache:'no-cache'});
   if(!response.ok) throw new Error('Dataset media unavailable');
   const manifest=await response.json();
   const clips=manifest.clips;
   cloud.dataset.count=String(clips.length);
   for(let row=0;row<4;row++) {
    const rail=document.createElement('div');rail.className='dataset-rail';
    rail.style.setProperty('--duration',`${44+row*7}s`);
    rail.style.setProperty('--delay',`${-row*8}s`);
    cloud.append(rail);rails.push(rail);
   }
   for(const [index,clip] of clips.entries()) {
    const tile=document.createElement('div');tile.className='dataset-tile';
    const video=document.createElement('video');video.muted=true;video.loop=true;video.playsInline=true;video.preload='metadata';
    video.poster=`assets/dataset/${clip.poster}`;video.src=`assets/dataset/${clip.video}`;
    video.setAttribute('aria-label',clip.label);video.setAttribute('disablepictureinpicture','');
    tile.append(video);rails[index%4].append(tile);videos.push(video);
   }
   sizeRails();cloud.setAttribute('aria-busy','false');button.hidden=false;update();
  } catch(error) {
   cloud.setAttribute('aria-busy','false');
   cloud.textContent='Training clips could not load. Reload to try again.';
   console.error('Dataset mosaic:',error);
  }
 }
 button.addEventListener('click',()=>{paused=!paused;update();});
 reduced.addEventListener('change',()=>{if(reduced.matches)paused=true;update();});
 document.addEventListener('visibilitychange',update);
 window.addEventListener('pagehide',()=>videos.forEach(video=>video.pause()));
 window.addEventListener('pageshow',update);
 if('IntersectionObserver' in window) {
  const loader=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){load();loader.disconnect();}},{rootMargin:'300px'});loader.observe(section);
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;update();},{threshold:.05});observer.observe(section);
 } else {visible=true;load();}
})();

"use strict";
(() => {
  const root=document.getElementById('prediction-example');
  if(!root)return;
  const inputs=[...root.querySelectorAll('[data-example-input]')];
  const output=root.querySelector('[data-example-output]');
  const videos=[...inputs,output];
  const cards=[...root.querySelectorAll('[data-example-card]')];
  const outputCard=root.querySelector('[data-example-output-card]');
  const cover=root.querySelector('[data-example-cover]');
  const status=root.querySelector('[data-example-status]');
  const future=root.querySelector('[data-example-future]');
  const toggle=root.querySelector('[data-example-toggle]');
  const replay=root.querySelector('[data-example-replay]');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const names=['scene geometry','object mask','hand state'];
  const anchor=4,startTime=3;
  let visible=false,paused=reduced.matches,loaded=false,loadPromise,started=false;
  let phase='ready',index=0,raf=0,last=0,hold=0,version=0,playAttempt=0;
  const canPlay=()=>loaded&&visible&&!paused&&!document.hidden;
  function seek(video,time){
    if(Math.abs(video.currentTime-time)<1e-6&&!video.seeking)return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>done(new Error('Seeking timed out.')),8000);
      const done=error=>{clearTimeout(timeout);video.removeEventListener('seeked',complete);video.removeEventListener('error',failed);error?reject(error):resolve();};
      const complete=()=>done();const failed=()=>done(new Error('The clip could not be decoded.'));
      video.addEventListener('seeked',complete,{once:true});video.addEventListener('error',failed,{once:true});video.currentTime=time;
    });
  }
  function loadVideo(video){
    return new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>done(new Error('The clip could not load.')),15000);
      const done=error=>{clearTimeout(timeout);video.removeEventListener('loadeddata',complete);video.removeEventListener('error',failed);error?reject(error):resolve();};
      const complete=()=>done();const failed=()=>done(new Error('The clip could not load.'));
      video.addEventListener('loadeddata',complete,{once:true});video.addEventListener('error',failed,{once:true});
      video.muted=true;video.src=video.dataset.src;video.load();
    });
  }
  function fail(error){
    phase='error';paused=true;videos.forEach(v=>v.pause());cancelAnimationFrame(raf);raf=0;
    status.textContent='The example could not load. Reload to try again.';
    toggle.disabled=true;replay.disabled=true;console.error('Prediction example:',error);
  }
  async function load(){
    if(loadPromise)return loadPromise;
    loadPromise=(async()=>{
      await Promise.all(videos.map(loadVideo));
      await Promise.all([...inputs.map(v=>seek(v,anchor)),seek(output,0)]);
      loaded=true;toggle.disabled=false;replay.disabled=false;paint();
      if(visible&&!reduced.matches&&!started)await start();
    })().catch(fail);
    return loadPromise;
  }
  function paint(){
    replay.hidden=phase==='ready'||phase==='done';
    toggle.textContent=phase==='done'?'Play again':paused||phase==='ready'?'Play sequence':'Pause sequence';
    for(let i=0;i<cards.length;i++){
      const frozen=phase==='ready'||phase==='output'||phase==='done'||i<index||(i===index&&phase==='hold');
      cards[i].dataset.state=frozen?'frozen':i===index?'active':'waiting';
      cards[i].querySelector('[data-example-card-status]').textContent=frozen?'Fixed':i===index?'Observing…':'Up next';
    }
    outputCard.dataset.state=phase==='output'?'active':phase==='done'?'complete':'waiting';
    cover.hidden=phase==='output'||phase==='done';
    if(phase==='ready')status.textContent='Hold one observation, then play its predicted future.';
    else if(phase==='preparing')status.textContent='Preparing the recorded example…';
    else if(phase==='input'||phase==='freezing')status.textContent=`Hold input ${index+1} of 3: ${names[index]}`;
    else if(phase==='hold')status.textContent=`Input ${index+1} of 3 fixed: ${names[index]}`;
    else if(phase==='output')status.textContent='Playing the saved prediction: inputs stay fixed';
    else if(phase==='done')status.textContent='Prediction complete: replay to see the sequence again';
    if(phase!=='output'&&phase!=='done')future.textContent='Future +0.1–4.3 s';
  }
  function sync(){
    const attempt=++playAttempt;
    cancelAnimationFrame(raf);raf=0;last=0;
    for(const video of videos)if(!(canPlay()&&((phase==='input'&&video===inputs[index])||(phase==='output'&&video===output))))video.pause();
    paint();
    if(!canPlay()||!['input','hold','output'].includes(phase))return;
    const video=phase==='input'?inputs[index]:phase==='output'?output:null;
    video?.play().catch(error=>{if(attempt!==playAttempt||!canPlay()||error.name==='AbortError')return;paused=true;sync();});
    raf=requestAnimationFrame(tick);
  }
  async function start(){
    if(!loaded)return;
    const active=++version;started=true;paused=false;phase='preparing';index=0;hold=0;sync();
    try{
      await Promise.all([...inputs.map(v=>seek(v,startTime)),seek(output,0)]);
      if(active!==version)return;
      phase='input';sync();
    }catch(error){if(active===version)fail(error);}
  }
  async function freeze(){
    const active=version;phase='freezing';inputs[index].pause();sync();
    try{
      await seek(inputs[index],anchor);
      if(active!==version)return;
      phase='hold';hold=0;sync();
    }catch(error){if(active===version)fail(error);}
  }
  function tick(now){
    raf=0;if(!canPlay())return;
    const delta=last?Math.min(now-last,100):0;last=now;
    if(phase==='input'&&inputs[index].currentTime>=anchor-.016){freeze();return;}
    if(phase==='hold'){
      hold+=delta;
      if(hold>=550){index++;phase=index<inputs.length?'input':'output';sync();return;}
    }
    if(phase==='output')future.textContent=`Future +${Math.max(.1,Math.min(4.3,output.currentTime)).toFixed(1)} s`;
    raf=requestAnimationFrame(tick);
  }
  output.addEventListener('ended',()=>{if(phase==='output'){phase='done';future.textContent='Future +4.3 s';sync();}});
  toggle.addEventListener('click',()=>{if(phase==='ready'||phase==='done'){start();return;}paused=!paused;sync();});
  replay.addEventListener('click',()=>start());
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',()=>{if(reduced.matches)paused=true;sync();});
  const observer=new IntersectionObserver(([entry])=>{
    visible=entry.isIntersecting;
    if(visible){load();if(loaded&&!started&&!reduced.matches)start();else sync();}else sync();
  },{threshold:.1});observer.observe(root);
  window.addEventListener('pagehide',event=>{cancelAnimationFrame(raf);raf=0;videos.forEach(v=>v.pause());if(!event.persisted)observer.disconnect();});
  window.addEventListener('pageshow',event=>{if(event.persisted)sync();});
})();

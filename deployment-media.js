/* One active rollout, one presentation clock, and a gallery that advances on end. */
(async () => {
  const root=document.getElementById('deployment-figure');if(!root)return;
  const videos=[...root.querySelectorAll('[data-deploy-video]')],cards=[...root.querySelectorAll('[data-deploy-card]')];
  const track=root.querySelector('[data-deploy-track]'),gallery=root.querySelector('.deploy-videos');
  const selectors=[...root.querySelectorAll('[data-deploy-select]')],play=root.querySelector('[data-deploy-play]'),replay=root.querySelector('[data-deploy-replay]');
  const error=root.querySelector('[data-deploy-error]'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  window.SteertuningPlayback.set(replay,'replay','Replay rollout');
  let tasks,index=0,intended=!reduced.matches,visible=false,pending=false,blocked=false,switching=false,raf=0,callback=0,callbackVideo=null,lastMediaTime=null;
  const current=()=>videos[index];
  const managedPauses=new WeakSet();
  function pauseManaged(video){if(!video.paused){managedPauses.add(video);video.pause();}}
  function stopClock(){cancelAnimationFrame(raf);raf=0;if(callback&&callbackVideo)callbackVideo.cancelVideoFrameCallback(callback);callback=0;callbackVideo=null;}
  function publish(time=(!current().paused&&lastMediaTime!==null?lastMediaTime:current().currentTime)){
    if(!tasks)return;
    const video=current();root.dispatchEvent(new CustomEvent('deploy:time',{detail:{task:tasks[index],time,playing:!video.paused&&!video.ended}}));
    window.SteertuningPlayback.set(play,video.paused?'play':'pause',video.paused?'Play rollout':'Pause rollout');
  }
  function clock(){
    stopClock();const video=current();
    if(video.paused||document.hidden||!visible)return;
    if(video.requestVideoFrameCallback){
      callbackVideo=video;callback=video.requestVideoFrameCallback((now,meta)=>{callback=0;callbackVideo=null;if(video!==current())return;lastMediaTime=meta.mediaTime;publish(meta.mediaTime);clock();});
    }else raf=requestAnimationFrame(()=>{raf=0;publish();clock();});
  }
  function reconcile(){
    if(!tasks)return;const video=current();
    if(!visible||document.hidden||!intended||blocked){
      pauseManaged(video);stopClock();publish();return;
    }
    if(video.paused&&!pending){
      pending=true;video.play().catch(reason=>{if(reason.name!=='AbortError'&&video===current()){blocked=true;intended=false;}}).finally(()=>{pending=false;reconcile();});
    }else if(!video.paused&&!callback&&!raf)clock();
    publish();
  }
  function select(next,{restart=true}={}){
    if(!tasks)return;switching=true;stopClock();videos.forEach(pauseManaged);
    index=(next+videos.length)%videos.length;blocked=false;lastMediaTime=null;
    const video=current();video.defaultPlaybackRate=tasks[index].playbackRate;video.playbackRate=tasks[index].playbackRate;
    if(!video.getAttribute('src')){video.src=video.dataset.src;video.preload='auto';video.load();}
    if(restart)video.currentTime=0;
    track.style.setProperty('--gallery-index',String(index));
    cards.forEach((card,i)=>{card.inert=i!==index;card.setAttribute('aria-hidden',String(i!==index));});
    selectors.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
    root.querySelector('[data-deploy-count]').textContent=`${index+1} / ${videos.length}`;
    error.hidden=true;switching=false;publish(0);reconcile();
  }
  videos.forEach(video=>{
    video.loop=false;video.muted=true;
    for(const event of ['loadedmetadata','timeupdate','seeked','waiting'])video.addEventListener(event,()=>{
      if(video!==current()||switching)return;publish(event==='timeupdate'&&!video.paused&&lastMediaTime!==null?lastMediaTime:video.currentTime);
      if(event==='seeked')lastMediaTime=video.currentTime;
    });
    video.addEventListener('play',()=>{if(video!==current()){video.pause();return;}if(switching)return;intended=true;blocked=false;publish();clock();});
    video.addEventListener('pause',()=>{
      const managed=managedPauses.delete(video);
      if(video!==current()||switching||managed)return;
      // Offscreen/hidden pauses preserve the user's playback intent.
      if(visible&&!document.hidden&&!video.ended)intended=false;
      stopClock();publish();
    });
    video.addEventListener('ended',()=>{
      if(video!==current())return;stopClock();publish();
      if(intended&&!reduced.matches&&visible&&!document.hidden)select(index+1);
      else {intended=false;publish();}
    });
    video.addEventListener('error',()=>{
      if(video!==current())return;blocked=true;intended=false;error.hidden=false;error.replaceChildren('Video unavailable. ');
      const link=document.createElement('a');link.href=video.dataset.src;link.textContent='Open full recording';error.append(link);reconcile();
    });
  });
  play.addEventListener('click',()=>{blocked=false;intended=current().paused;if(current().ended)current().currentTime=0;reconcile();});
  replay.addEventListener('click',()=>{intended=true;select(index);});
  selectors.forEach((button,i)=>{button.addEventListener('click',()=>select(i));button.addEventListener('keydown',event=>{const next=event.key==='ArrowRight'?(i+1)%videos.length:event.key==='ArrowLeft'?(i+videos.length-1)%videos.length:null;if(next===null)return;event.preventDefault();select(next);selectors[next].focus();});});
  root.querySelector('[data-deploy-previous]').addEventListener('click',()=>select(index-1));
  root.querySelector('[data-deploy-next]').addEventListener('click',()=>select(index+1));
  root.addEventListener('deploy:seek',event=>{if(!tasks)return;intended=false;current().pause();current().currentTime=event.detail.time;lastMediaTime=null;publish();});
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;reconcile();},{threshold:.12});observer.observe(gallery);
  document.addEventListener('visibilitychange',reconcile);
  reduced.addEventListener('change',()=>{if(reduced.matches)intended=false;reconcile();});
  window.addEventListener('pagehide',event=>{visible=false;videos.forEach(pauseManaged);stopClock();if(!event.persisted)observer.disconnect();});
  window.addEventListener('pageshow',()=>{const rect=gallery.getBoundingClientRect();visible=rect.bottom>0&&rect.top<innerHeight;reconcile();});
  try{
    const response=await fetch('assets/deployment/timeline.json?v=639ad1caf220');if(!response.ok)throw Error('Timeline unavailable');
    const data=await response.json();tasks=data.tasks;
    if(tasks.length!==videos.length)throw Error('Timeline/video count mismatch');
    tasks.forEach(task=>{if(task.steps[0].startFrame!==0||task.steps.at(-1).endFrame!==task.frameCount||task.steps.some((step,i)=>step.startFrame>=step.endFrame||(i&&step.startFrame!==task.steps[i-1].endFrame)))throw Error('Timeline has a gap');});
    select(0);
  }catch(reason){error.hidden=false;error.textContent='The rollout timeline could not load. Reload to retry.';console.error(reason);}
})();

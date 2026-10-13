/* Recorded input previews and a schematic D3 computation walkthrough.
 * No displayed internal cell is a measured activation. Steering has its own visible section. */
(() => {
  const host=document.querySelector('[data-architecture-graph]'), data=window.STEERTUNING_GRAPHS, d3=window.d3;
  if(!host||!data||!d3)return;
  const figure=document.getElementById('policy-figure');
  const detail=figure.querySelector('[data-graph-detail]'),reset=figure.querySelector('[data-graph-reset]');
  const pause=figure.querySelector('[data-graph-pause]'),status=figure.querySelector('[data-graph-status]');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const scrollHint=document.createElement('p');scrollHint.className='ag-scroll-hint';scrollHint.textContent='Scroll to see the full diagram →';scrollHint.hidden=true;host.after(scrollHint);
  let phone,phoneStages=[],selected=null,svg,paths=[],cells=[],videos=[],visible=false,paused=reduce.matches,elapsed=0,previous=0,raf=0,painted=0;
  const colors=['#335b49','#819a89','#b49977'];
  function text(g,x,y,s,cls='av-label',anchor='middle'){return g.append('text').attr('x',x).attr('y',y).attr('class',cls).attr('text-anchor',anchor).text(s);}
  function pick(g,id){
    g.attr('data-pick',id).attr('role','button').attr('tabindex',0).attr('aria-label',data.info[id]?.title||id).attr('aria-pressed','false')
      .on('click',()=>{selected=selected===id?null:id;select();})
      .on('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selected=selected===id?null:id;select();}if(e.key==='Escape'){selected=null;select();}});
    g.append('title').text(data.info[id]?.body||'');return g;
  }
  function select(){
    const info=selected?data.info[selected]:null;
    detail.replaceChildren();const a=document.createElement('strong'),b=document.createElement('span');
    if(info){a.textContent=info.title;b.textContent=info.body;detail.append(a,b);}reset.disabled=!selected;
    if(!svg)return;
    svg.selectAll('[data-pick]').attr('aria-pressed',function(){return String(this.dataset.pick===selected);});
    svg.selectAll('[data-route]').classed('av-selected-route',function(){return !!selected&&this.dataset.route.split(' ').includes(selected);});
  }
  function line(g,d,ids,phase=0,kind=''){
    const p=g.append('path').attr('d',d).attr('class',`av-wire ${kind}`).attr('data-route',ids);
    const dot=g.append('circle').attr('r',2.2).attr('class',`av-packet ${kind}`);
    paths.push({path:p.node(),dot:dot.node(),phase,length:p.node().getTotalLength()});return p;
  }
  const curve=(a,b)=>`M${a[0]},${a[1]}C${a[0]+(b[0]-a[0])*.5},${a[1]} ${a[0]+(b[0]-a[0])*.5},${b[1]} ${b[0]},${b[1]}`;
  function wire(g,a,b,ids,phase=0,kind=''){return line(g,curve(a,b),ids,phase,kind);}
  function matrix(g,x,y,cols,rows,size,phase=0,tone=0){
    const m=g.append('g').attr('class','av-matrix');
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
      const node=m.append('rect').attr('x',x+c*(size+2)).attr('y',y+r*(size+2)).attr('width',size).attr('height',size).attr('rx',0).attr('fill',colors[tone]).node();
      cells.push({node,phase,seed:r*7+c*3});
    }
    return m;
  }
  function preview(g,x,y,size,poster,src,id){
    const n=pick(g.append('g').attr('class','av-preview'),id);
    n.append('rect').attr('x',x-1).attr('y',y-1).attr('width',size+2).attr('height',size+2).attr('rx',0).attr('class','av-media-border');
    const v=n.append('foreignObject').attr('x',x).attr('y',y).attr('width',size).attr('height',size)
      .append('xhtml:video').attr('muted','').attr('loop','').attr('playsinline','').attr('preload','none').attr('poster',`assets/figures/${poster}`).attr('aria-hidden','true').attr('tabindex','-1').attr('class','av-input-video').node();
    v.muted=true;v.dataset.clip=`assets/figures/${src}`;videos.push(v);return n;
  }
  function model(){
    const g=svg.append('g');
    const rows=[['scene','Point cloud','5,000 × 3','Utonia','Frozen','512','cloud-sampled.png','processing-sampled.webm'],['object','Object mask','255 × 255','ResNet-18','Trainable','1','object-mask.png','processing-mask.mp4'],['hand','Fingertips','2 × 5 × 3','FFN','Trainable','1','proprio.png','proprio.webm'],['language','Language','Instruction','SigLIP','Frozen','1']];
    const enc=226,tok=318;
    text(g,12,21,'Observations','av-stage','start');text(g,enc,21,'Encoders','av-stage');text(g,tok,21,'Tokens','av-stage');
    text(g,495,21,'Conditioning','av-stage');
    rows.forEach(([id,title,dim,encoder,state,count,poster,src],i)=>{
      const cy=71+i*90,size=54;
      if(src)preview(g,12,cy-size/2,size,poster,src,id);
      else{
        const n=pick(g.append('g').attr('class','av-language'),id),x=12,y=cy-size/2;
        n.append('rect').attr('x',x).attr('y',y).attr('width',size).attr('height',size).attr('rx',0).attr('class','av-media-border');
        text(n,x+size/2,y+size*.48,'“','av-quote');
        [0,1,2].forEach(j=>n.append('path').attr('d',`M${x+9},${y+size*.58+j*6}h${size-18-j*5}`).attr('class','av-language-line'));
      }
      const tx=76;
      text(g,tx,cy-9,title,'av-label','start');
      const e=pick(g.append('g').attr('class','av-encoder'),id);
      matrix(e,enc-20,cy-20,5,4,6,0,i===1?2:0);
      text(e,enc,cy+38,encoder,'av-node-title');
      wire(g,[184,cy],[enc-26,cy],`${id} encoders`,0);
      const t=pick(g.append('g').attr('class','av-representation'),'concat');
      matrix(t,tok-(i===0?25:7),cy-15,i===0?6:1,3,i===0?6:8,.75,i===1?2:0);

      wire(g,[enc+30,cy],[tok-32,cy],`${id} concat`,.7);
      wire(g,[tok+35,cy],[400,205],'concat context',1.3);
    });

    wire(g,[400,205],[438,144],'concat pooled',1.6);
    wire(g,[400,205],[438,315],'concat memory',1.6,'av-memory-wire');
    const s=pick(g.append('g'),'pooled');matrix(s,439,117,6,6,7,2);text(s,466,99,'Self-attention','av-node-title');
    wire(g,[496,144],[552,144],'pooled',2.3);matrix(s,553,128,1,4,7,2.5);text(s,557,192,'Mean pool','av-small');
    wire(g,[562,144],[662,207],'pooled denoiser',2.8);
    const f=pick(g.append('g'),'memory');matrix(f,439,299,6,4,7,2,2);text(f,466,283,'Full tokens','av-node-title');
    wire(g,[496,315],[662,287],'memory denoiser',2.8,'av-memory-wire');
    denoiser(g,646,159,246,166,false);
    const n=pick(g.append('g'),'actionNoise');matrix(n,680,65,6,4,7,3,1);text(n,707,49,'Noisy actions xₜ','av-small');
    const t=pick(g.append('g'),'timestep');text(t,852,89,'t','av-timestep');text(t,852,113,'Timestep','av-small');
    line(g,'M707,105C707,135 736,135 736,162','actionNoise denoiser',3);line(g,'M852,115C852,141 814,141 814,162','timestep denoiser',3);
    text(g,769,182,'Diffusion transformer','av-core-title');
    line(g,'M769,325L769,365','denoiser noiseHead noise',4.2);text(g,783,351,'FFN','av-small','start');
    const o=pick(g.append('g'),'noise');matrix(o,739,370,7,4,7,4.5);text(o,769,438,'Predicted noise ε̂','av-node-title');
  }

  function denoiser(g,x,y,w,h,right){
    const core=pick(g.append('g').attr('class','av-denoiser'),'denoiser');
    core.append('path').attr('d',`M${x+15},${y}H${x}V${y+h}H${x+15}M${x+w-15},${y}H${x+w}V${y+h}H${x+w-15}`).attr('class','av-bracket');
    core.append('rect').attr('x',x).attr('y',y).attr('width',w).attr('height',h).attr('class','av-core-hit');
    const ax=x+16,ay=y+48,cx=right?x+w-10:x+16,cy=right?y+116:y+128;
    text(core,ax+8,right?ay-12:ay+22,'AdaLN','av-port','start');core.append('circle').attr('cx',ax).attr('cy',ay).attr('r',4).attr('class','av-port-dot');
    text(core,right?cx-9:cx+8,cy+23,'Cross-attention','av-port',right?'end':'start');core.append('circle').attr('cx',cx).attr('cy',cy).attr('r',4).attr('class','av-port-dot av-gold');
    const mx=x+w*.59,my=y+62;
    wire(core,[ax,ay],[mx-4,my+17],'pooled denoiser',3.3);
    wire(core,[cx,cy],[mx-4,my+17],'memory denoiser',3.3,'av-memory-wire');
    matrix(core,mx,my,6,4,7,3.6);
    line(core,`M${mx+25},${my+39}C${mx+25},${y+h-10} ${x+w/2},${y+h-10} ${x+w/2},${y+h}`,'denoiser noiseHead',3.9);
  }
  // A separate semantic layout for phones: retain the computation, remove dense wiring.
  function phoneModel(){
    const flow=d3.select(host).append('ol').attr('class','ag-phone-flow').attr('aria-label','Policy computation');
    const stage=(title)=>{
      const node=flow.append('li').attr('class','ag-phone-stage');
      node.append('h4').text(title);phoneStages.push(node.node());return node;
    };
    const inputs=stage('Encode observations').append('div').attr('class','ag-phone-inputs');
    const rows=[['Point cloud','Utonia','cloud-sampled.png','processing-sampled.webm'],['Object mask','ResNet-18','object-mask.png','processing-mask.mp4'],['Fingertips','FFN','proprio.png','proprio.webm'],['Language','SigLIP']];
    rows.forEach(([title,encoder,poster,src])=>{
      const item=inputs.append('div').attr('class','ag-phone-input');
      if(src){
        const v=item.append('video').attr('muted','').attr('loop','').attr('playsinline','').attr('preload','none').attr('poster',`assets/figures/${poster}`).attr('aria-hidden','true').attr('tabindex','-1').node();
        v.muted=true;v.dataset.clip=`assets/figures/${src}`;videos.push(v);
      }else item.append('span').attr('class','ag-phone-language').attr('aria-hidden','true').text('“');
      const label=item.append('div');label.append('span').text(title);label.append('span').attr('class','ag-phone-encoder').text(encoder);
    });
    const core=stage('Diffusion transformer');
    core.append('p').attr('class','ag-phone-conditioning').text('Context → AdaLN');
    core.append('p').attr('class','ag-phone-conditioning').text('Tokens → Cross-attention');
    core.append('p').text('Denoise actions using these observations and timestep t.');
    const output=stage('Predict noise');
    output.append('p').text('DDIM uses the predicted noise to update the action prediction.');
  }
  function render(){
    videos.forEach(v=>v.pause());host.replaceChildren();paths=[];cells=[];videos=[];phoneStages=[];svg=null;
    figure.dataset.phone=String(phone);
    scrollHint.hidden=true;host.removeAttribute('tabindex');host.removeAttribute('role');host.removeAttribute('aria-label');
    detail.hidden=phone;reset.hidden=phone;status.hidden=phone;
    const caption=figure.closest('figure').querySelector('figcaption');
    if(caption)caption.textContent=phone?'Simplified computation with recorded inputs.':'Moving tokens illustrate computation; they are not measured activations.';
    if(phone){
      host.dataset.view='phone';host.dataset.compact='true';phoneModel();paint();media();return;
    }
    const w=920,h=465;
    svg=d3.select(host).append('svg').attr('class','ag-svg av-svg av-model').attr('viewBox',`0 0 ${w} ${h}`).attr('role','group').attr('aria-label','Animated policy architecture with recorded inputs and schematic internal representations');
    model();host.dataset.view='model';host.dataset.compact='false';
    figure.querySelector('[data-graph-note]').textContent='Recorded inputs: schematic activations and connections.';
    fitType();select();paint();media();
  }
  function fitType(){
    if(!svg)return;
    const node=svg.node(),width=node.getBoundingClientRect().width;
    if(width>0)host.style.setProperty('--diagram-unit',`${node.viewBox.baseVal.width/width}px`);
    const scrollable=host.scrollWidth>host.clientWidth+1;scrollHint.hidden=!scrollable;
    if(scrollable){host.tabIndex=0;host.setAttribute('role','region');host.setAttribute('aria-label','Policy network diagram; scroll horizontally to explore.');}
    else {host.removeAttribute('tabindex');host.removeAttribute('role');host.removeAttribute('aria-label');}
  }
  function running(){return visible&&!paused&&!document.hidden;}
  function media(){
    const run=running();figure.classList.toggle('av-running',run);
    window.SteertuningPlayback.set(pause,paused?'play':'pause',paused?'Play animation':'Pause animation');
    videos.forEach(v=>{if(run){if(!v.src){v.src=v.dataset.clip;v.load();}v.play().catch(()=>{});}else v.pause();});
    if(run&&!raf){previous=0;raf=requestAnimationFrame(tick);}else if(!run&&raf){cancelAnimationFrame(raf);raf=0;previous=0;}
  }
  function paint(){
    const seconds=elapsed/1000,cycle=seconds%6;
    paths.forEach(({path,dot,phase,length})=>{
      let p=(cycle-phase)/1.25;
      const point=path.getPointAtLength(Math.max(0,Math.min(1,p))*length);
      dot.setAttribute('cx',point.x);dot.setAttribute('cy',point.y);dot.style.opacity=p>=0&&p<=1?'0.9':'0';
    });
    cells.forEach(({node,phase,seed})=>{node.style.opacity=String(.27+.58*(.5+.5*Math.sin(seconds*1.5-phase+seed*.65)));});
    const phase=cycle<1.6?0:cycle<3?1:2;
    phoneStages.forEach((node,index)=>node.dataset.active=String(index===phase&&!paused));
    const next=['01: Encode observations','02: Condition the transformer','03: Predict noise'][phase];
    if(status.textContent!==next)status.textContent=next;
  }
  function tick(now){
    raf=0;if(!running())return;
    if(previous)elapsed+=Math.min(100,now-previous);previous=now;
    if(now-painted>50){paint();painted=now;}
    if(videos.length>1&&videos[0].readyState>=2){const t=videos[0].currentTime;for(const v of videos.slice(1))if(v.readyState>=2&&Math.abs(v.currentTime-t)>.25)v.currentTime=t;}
    raf=requestAnimationFrame(tick);
  }
  reset.addEventListener('click',()=>{selected=null;select();});pause.addEventListener('click',()=>{paused=!paused;media();});
  document.addEventListener('visibilitychange',media);reduce.addEventListener('change',()=>{paused=reduce.matches;media();});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;media();},{threshold:.08}).observe(host);
  new ResizeObserver(()=>{const nextPhone=matchMedia('(max-width:600px)').matches;if(nextPhone!==phone){phone=nextPhone;render();}else fitType();}).observe(figure);
  phone=matchMedia('(max-width:600px)').matches;render();
  document.fonts.ready.then(fitType);
})();

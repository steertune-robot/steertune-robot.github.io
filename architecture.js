/* Recorded input previews and a schematic D3 computation walkthrough.
 * Sampling routes use the generated ELK graph. No displayed internal cell is a measured activation. */
(() => {
  const host=document.querySelector('[data-architecture-graph]'), data=window.STEERTUNING_GRAPHS, d3=window.d3;
  if(!host||!data||!d3)return;
  const figure=document.getElementById('policy-figure'), tabs=[...figure.querySelectorAll('[data-graph-view]')];
  const detail=figure.querySelector('[data-graph-detail]'),reset=figure.querySelector('[data-graph-reset]');
  const pause=figure.querySelector('[data-graph-pause]'),status=figure.querySelector('[data-graph-status]');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  let view='model',compact,selected=null,svg,paths=[],cells=[],videos=[],visible=false,paused=reduce.matches,elapsed=0,previous=0,raf=0,painted=0;
  const colors=['#335b49','#819a89','#b49977'];
  const defaults={model:['Observations → predicted noise','Select a component for details.'],sampling:['Eight DDIM steps with demonstration guidance','']};
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
    a.textContent=info?.title||defaults[view][0];b.textContent=info?.body||defaults[view][1];detail.append(a,b);reset.disabled=!selected;
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
      const node=m.append('rect').attr('x',x+c*(size+2)).attr('y',y+r*(size+2)).attr('width',size).attr('height',size).attr('rx',1).attr('fill',colors[tone]).node();
      cells.push({node,phase,seed:r*7+c*3});
    }
    return m;
  }
  function preview(g,x,y,size,poster,src,id){
    const n=pick(g.append('g').attr('class','av-preview'),id);
    n.append('rect').attr('x',x-1).attr('y',y-1).attr('width',size+2).attr('height',size+2).attr('rx',4).attr('class','av-media-border');
    const v=n.append('foreignObject').attr('x',x).attr('y',y).attr('width',size).attr('height',size)
      .append('xhtml:video').attr('muted','').attr('loop','').attr('playsinline','').attr('preload','none').attr('poster',`assets/figures/${poster}`).attr('aria-hidden','true').attr('tabindex','-1').attr('class','av-input-video').node();
    v.muted=true;v.dataset.clip=`assets/figures/${src}`;videos.push(v);return n;
  }
  function model(){
    const g=svg.append('g');
    const rows=[['scene','Point cloud','5,000 × 3','Utonia','Frozen','512','cloud-sampled.png','processing-sampled.webm'],['object','Object mask','255 × 255','ResNet-18','Trainable','1','object-mask.png','processing-mask.webm'],['hand','Fingertips','2 × 5 × 3','FFN','Trainable','1','proprio.png','proprio.webm'],['language','Task language','Instruction','SigLIP','Frozen','1']];
    const enc=compact?211:252,tok=compact?311:377;
    text(g,compact?8:12,17,'OBSERVATIONS','av-stage','start');text(g,enc,17,'ENCODERS','av-stage');text(g,tok,17,'TOKENS','av-stage');
    if(!compact){text(g,584,17,'CONDITIONING','av-stage');text(g,895,17,'NOISE PREDICTION','av-stage');}
    rows.forEach(([id,title,dim,encoder,state,count,poster,src],i)=>{
      const cy=(compact?61:71)+i*(compact?94:90),size=compact?48:62;
      if(src)preview(g,compact?8:12,cy-size/2,size,poster,src,id);
      else{
        const n=pick(g.append('g').attr('class','av-language'),id),x=compact?8:12,y=cy-size/2;
        n.append('rect').attr('x',x).attr('y',y).attr('width',size).attr('height',size).attr('rx',4).attr('class','av-media-border');
        text(n,x+size/2,y+size*.48,'“','av-quote');
        [0,1,2].forEach(j=>n.append('path').attr('d',`M${x+9},${y+size*.58+j*6}h${size-18-j*5}`).attr('class','av-language-line'));
      }
      const tx=compact?65:86;
      text(g,tx,cy-5,title,'av-input-title','start');text(g,tx,cy+14,dim,'av-small','start');
      const e=pick(g.append('g').attr('class','av-encoder'),id);
      matrix(e,enc-20,cy-20,5,4,6,0,i===1?2:0);
      text(e,enc,cy+38,encoder,'av-node-title');text(e,enc,cy+60,state,'av-small');
      wire(g,[compact?170:196,cy],[enc-26,cy],`${id} encoders`,0);
      const t=pick(g.append('g').attr('class','av-representation'),'concat');
      matrix(t,tok-(i===0?25:7),cy-15,i===0?6:1,3,i===0?6:8,.75,i===1?2:0);
      text(t,tok,cy+38,count,'av-small');
      wire(g,[enc+30,cy],[tok-32,cy],`${id} concat`,.7);
      if(compact)line(g,`M${tok+29},${cy}C355,${cy} 355,424 184,424`,'concat context',1.3);
      else wire(g,[tok+35,cy],[474,205],'concat context',1.3);
    });
    text(g,compact?78:377,compact?465:434,'515 × 1,024','av-dimension');
    if(compact){
      wire(g,[184,424],[76,535],'concat pooled',1.6);
      wire(g,[184,424],[280,566],'concat memory',1.6,'av-memory-wire');
      const s=pick(g.append('g'),'pooled');matrix(s,49,518,6,6,7,2);text(s,77,508,'Self-attention','av-node-title');
      wire(g,[106,545],[150,545],'pooled',2.3);matrix(s,151,530,1,4,7,2.5);text(s,153,580,'Mean pool','av-small');
      const f=pick(g.append('g'),'memory');matrix(f,253,550,6,4,7,2,2);text(f,280,536,'Full tokens','av-node-title');
      line(g,'M160,545C192,545 191,610 34,610L34,763C34,777 59,777 78,777','pooled denoiser',2.8);
      line(g,'M308,566C341,566 341,624 341,639L341,831C341,845 326,845 312,845','memory denoiser',2.8,'av-memory-wire');
      denoiser(g,62,729,260,169,true);
      text(g,62,636,'DIFFUSION TRANSFORMER','av-stage','start');
      const n=pick(g.append('g'),'actionNoise');matrix(n,126,678,6,3,6,3,1);text(n,149,670,'Noisy actions xₜ','av-small');
      const t=pick(g.append('g'),'timestep');text(t,260,703,'t','av-timestep');text(t,280,698,'Timestep','av-small','start');
      line(g,'M149,706C149,715 177,715 177,732','actionNoise denoiser',3);line(g,'M260,707C260,725 242,725 242,732','timestep denoiser',3);
      line(g,'M195,898L195,933','denoiser noiseHead noise',4.2);text(g,228,922,'FFN','av-small','start');
      const o=pick(g.append('g'),'noise');matrix(o,165,939,7,4,7,4.5);text(o,195,1008,'Predicted noise ε̂','av-node-title');
    }else{
      wire(g,[474,205],[538,144],'concat pooled',1.6);
      wire(g,[474,205],[538,315],'concat memory',1.6,'av-memory-wire');
      const s=pick(g.append('g'),'pooled');matrix(s,539,117,6,6,7,2);text(s,566,99,'Self-attention','av-node-title');
      wire(g,[596,144],[644,144],'pooled',2.3);matrix(s,645,128,1,4,7,2.5);text(s,651,192,'Mean pool','av-small');
      wire(g,[654,144],[786,207],'pooled denoiser',2.8);
      const f=pick(g.append('g'),'memory');matrix(f,539,299,6,4,7,2,2);text(f,566,283,'Full tokens','av-node-title');text(f,566,356,'515 × 1,024','av-small');
      wire(g,[596,315],[786,287],'memory denoiser',2.8,'av-memory-wire');
      denoiser(g,770,159,245,166,false);
      const n=pick(g.append('g'),'actionNoise');matrix(n,800,65,6,4,7,3,1);text(n,827,49,'Noisy actions xₜ','av-small');
      const t=pick(g.append('g'),'timestep');text(t,964,89,'t','av-timestep');text(t,964,113,'Timestep','av-small');
      line(g,'M827,105C827,135 860,135 860,162','actionNoise denoiser',3);line(g,'M964,115C964,141 938,141 938,162','timestep denoiser',3);
      text(g,892,182,'Diffusion transformer','av-core-title');
      line(g,'M893,325L893,365','denoiser noiseHead noise',4.2);text(g,907,351,'FFN','av-small','start');
      const o=pick(g.append('g'),'noise');matrix(o,863,370,7,4,7,4.5);text(o,893,438,'Predicted noise ε̂','av-node-title');
    }
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
  function sampling(layout){
    const edges=svg.append('g');
    layout.edges.forEach(e=>{
      const phase=({initialize:0,predict:1,update:2,select:0,guide:2,repeat:3,finish:4,retarget:4.5})[e.id]||0;
      e.sections?.forEach(s=>{const pts=[s.startPoint,...(s.bendPoints||[]),s.endPoint].map(p=>[p.x,p.y]);line(edges,d3.line().curve(d3.curveBumpX)(pts),`${e.sourceNode||e.sources} ${e.targetNode||e.targets}`,phase,e.feedback?'av-memory-wire':'');paths[paths.length-1].edgeId=e.id;});
      if(e.labelPosition){const p=e.labelPosition,t=text(edges,p.x,p.y,e.label,'av-edge-label');if(p.rotate)t.attr('transform',`rotate(${p.rotate},${p.x},${p.y})`);}
    });
    layout.children.forEach(n=>{
      const g=pick(svg.append('g').attr('transform',`translate(${n.x},${n.y})`).attr('class','av-sampling-node'),n.id);
      g.append('rect').attr('width',n.width).attr('height',n.height).attr('rx',4).attr('class','av-sampling-hit');
      g.append('path').attr('d',`M8,${n.height-1}H${n.width-8}`).attr('class','av-node-rule');
      text(g,n.width/2,n.height/2-(n.lines.length>1?12:3),n.title,'av-node-title');
      n.lines.forEach((s,i)=>text(g,n.width/2,n.height/2+20+i*20-(n.lines.length>1?7:0),s==='xT'?'xₜ · t = T':s,'av-small'));
    });
  }
  function render(){
    videos.forEach(v=>v.pause());host.replaceChildren();paths=[];cells=[];videos=[];
    const layout=data.layouts[`sampling-${compact?'compact':'wide'}`],w=view==='model'?(compact?360:1040):layout.width,h=view==='model'?(compact?1036:465):layout.height;
    svg=d3.select(host).append('svg').attr('class',`ag-svg av-svg av-${view}`).attr('viewBox',`0 0 ${w} ${h}`).attr('role','group').attr('aria-label',view==='model'?'Animated policy architecture with recorded inputs and schematic internal representations':'Animated DDIM sampling and demonstration steering');
    if(view==='model')model();else sampling(layout);
    host.dataset.view=view;host.dataset.compact=String(compact);
    figure.querySelector('[data-graph-note]').textContent=view==='model'?'Recorded inputs · schematic activations and connections.':'Schematic flow · final clean blend → retargeting.';
    select();paint();media();
  }
  function running(){return visible&&!paused&&!document.hidden;}
  function media(){
    const run=running();figure.classList.toggle('av-running',run);
    pause.textContent=paused?'Play animation':'Pause animation';pause.setAttribute('aria-label',pause.textContent);pause.setAttribute('aria-pressed',String(paused));
    videos.forEach(v=>{if(run){if(!v.src){v.src=v.dataset.clip;v.load();}v.play().catch(()=>{});}else v.pause();});
    if(run&&!raf){previous=0;raf=requestAnimationFrame(tick);}else if(!run&&raf){cancelAnimationFrame(raf);raf=0;previous=0;}
  }
  function paint(){
    const seconds=elapsed/1000,cycle=seconds%6,samplingTime=seconds%26;
    paths.forEach(({path,dot,phase,length,edgeId})=>{
      let p=(cycle-phase)/1.25;
      if(view==='sampling'){
        const local=samplingTime%3,step=Math.floor(samplingTime/3);
        if(edgeId==='initialize'||edgeId==='select')p=samplingTime/.8;
        else if(edgeId==='finish')p=(samplingTime-24)/.8;
        else if(edgeId==='retarget')p=(samplingTime-24.9)/.8;
        else if(step>=8)p=-1;
        else if(edgeId==='predict')p=(local-.5)/.8;
        else if(edgeId==='update'||edgeId==='guide')p=(local-1.25)/.8;
        else if(edgeId==='repeat')p=step<7?(local-2.1)/.8:-1;
      }
      const point=path.getPointAtLength(Math.max(0,Math.min(1,p))*length);
      dot.setAttribute('cx',point.x);dot.setAttribute('cy',point.y);dot.style.opacity=p>=0&&p<=1?'0.9':'0';
    });
    cells.forEach(({node,phase,seed})=>{node.style.opacity=String(.27+.58*(.5+.5*Math.sin(seconds*1.5-phase+seed*.65)));});
    const phase=cycle<1.6?0:cycle<3?1:2;
    const next=view==='model'?['01 · Encode observations','02 · Condition the transformer','03 · Predict noise'][phase]:samplingTime>=24?'Sampling complete · human actions → robot commands':`Sampling step ${Math.floor(samplingTime/3)+1} / 8 · ${['Predict noise','DDIM update','Blend guidance'][Math.floor(samplingTime)%3]}`;
    if(status.textContent!==next)status.textContent=next;
  }
  function tick(now){
    raf=0;if(!running())return;
    if(previous)elapsed+=Math.min(100,now-previous);previous=now;
    if(now-painted>50){paint();painted=now;}
    if(videos.length>1&&videos[0].readyState>=2){const t=videos[0].currentTime;for(const v of videos.slice(1))if(v.readyState>=2&&Math.abs(v.currentTime-t)>.25)v.currentTime=t;}
    raf=requestAnimationFrame(tick);
  }
  function setView(v){view=v;selected=null;elapsed=0;tabs.forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.graphView===v));b.tabIndex=b.dataset.graphView===v?0:-1;});host.setAttribute('aria-labelledby',`ag-tab-${v}`);render();}
  tabs.forEach((b,i)=>{b.addEventListener('click',()=>setView(b.dataset.graphView));b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const j=e.key==='Home'?0:e.key==='End'?1:1-i;setView(tabs[j].dataset.graphView);tabs[j].focus();});});
  reset.addEventListener('click',()=>{selected=null;select();});pause.addEventListener('click',()=>{paused=!paused;media();});
  document.addEventListener('visibilitychange',media);reduce.addEventListener('change',()=>{paused=reduce.matches;media();});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;media();},{threshold:.08}).observe(host);
  new ResizeObserver(entries=>{const next=entries[0].contentRect.width<740;if(next!==compact){compact=next;render();}}).observe(host);
  compact=host.clientWidth<740;render();
})();

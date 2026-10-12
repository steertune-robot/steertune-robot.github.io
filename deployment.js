/* Diagram driven solely by the active recording's presentation time.
 * Task intervals are visual annotations, not robot controller telemetry. */
(() => {
  "use strict";
  const figure=document.getElementById('deployment-figure'),d3=window.d3;
  if(!figure||!d3)return;
  const flow=figure.querySelector('[data-deploy-flow]'),svgElement=figure.querySelector('[data-deploy-wires]');
  const plan=figure.querySelector('.deploy-plan'),title=figure.querySelector('[data-deploy-detail-title]'),detail=figure.querySelector('[data-deploy-detail]'),status=figure.querySelector('[data-deploy-status]');
  const inspectors=[...figure.querySelectorAll('[data-deploy-inspect]')];
  const mobile=matchMedia('(max-width:700px)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
  let task=null,steps=[],buttons=[],edges=[],nodes=new Map(),current=0,progress=0,selectedPaths=[],resizeFrame=0;
  const svg=d3.select(svgElement),routes=svg.append('g').attr('class','deploy-route-layer'),packets=svg.append('g').attr('class','deploy-packet-layer');
  const dots=packets.selectAll('circle').data([0,1,2]).join('circle').attr('class','deploy-packet').attr('r',2.5).attr('opacity',0);
  const color=skill=>`var(--deploy-${skill==='navigation'?'nav':'manip'})`;
  const activeIds=()=>steps.length?[`plan-${current}`,`skill-${current}`,`execute-${steps[current].skill}`]:[];
  function seekStep(index){
    figure.dispatchEvent(new CustomEvent('deploy:seek',{detail:{time:steps[index].startFrame*task.fpsDenominator/task.fpsNumerator}}));
  }
  function selectTask(next){
    task=next;steps=task.steps;current=0;progress=0;
    figure.querySelector('.deploy-command q').textContent=task.command;
    plan.replaceChildren();
    buttons=steps.map((step,index)=>{
      const button=document.createElement('button');button.type='button';button.className='deploy-step';button.dataset.deployNode=`step-${index}`;button.dataset.deployStep=String(index);
      const number=document.createElement('span');number.className='deploy-step-number';number.textContent=String(index+1).padStart(2,'0');
      const copy=document.createElement('span'),verb=document.createElement('b'),object=document.createElement('small');verb.textContent=step.verb;object.textContent=step.object;copy.append(verb,object);
      const bar=document.createElement('span');bar.className='deploy-step-progress';bar.setAttribute('aria-hidden','true');button.append(number,copy,bar);
      button.setAttribute('aria-label',`${step.title}: jump to ${(step.startFrame*task.fpsDenominator/task.fpsNumerator).toFixed(1)} seconds`);
      button.style.setProperty('--route-color',color(step.skill));button.addEventListener('click',()=>seekStep(index));
      button.addEventListener('keydown',event=>{
        const next=event.key==='ArrowRight'?(index+1)%steps.length:event.key==='ArrowLeft'?(index+steps.length-1)%steps.length:event.key==='Home'?0:event.key==='End'?steps.length-1:null;
        if(next===null)return;event.preventDefault();seekStep(next);buttons[next].focus();
      });plan.append(button);return button;
    });
    nodes=new Map([...figure.querySelectorAll('[data-deploy-node]')].map(node=>[node.dataset.deployNode,node]));
    edges=steps.flatMap((step,index)=>[{id:`plan-${index}`,from:'planner',to:`step-${index}`,step:index,skill:step.skill},{id:`skill-${index}`,from:`step-${index}`,to:step.skill,step:index,skill:step.skill}]);
    for(const skill of ['navigation','manipulation'])edges.push({id:`execute-${skill}`,from:skill,to:'robot',skill});
    drawRoutes();scheduleGeometry();
  }
  function update(time,playing){
    if(!task)return;
    const sourceFrame=Math.min(task.frameCount-1,Math.max(0,Math.floor(time*task.fpsNumerator/task.fpsDenominator+1e-5)));
    const index=steps.findIndex(step=>sourceFrame>=step.startFrame&&sourceFrame<step.endFrame);
    const changed=current!==index;current=Math.max(0,index);const step=steps[current];
    progress=Math.max(0,Math.min(1,(time-step.startFrame*task.fpsDenominator/task.fpsNumerator)/((step.endFrame-step.startFrame)*task.fpsDenominator/task.fpsNumerator)));
    title.textContent=step.title;detail.textContent=step.body;status.textContent=`${current+1} / ${steps.length} · ${playing?'Playing':'Paused'}`;
    figure.dataset.activeSkill=step.skill;figure.dataset.activeStep=String(current);figure.dataset.activeVideo=task.id;
    buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===current)));
    inspectors.forEach(button=>{button.classList.toggle('is-active',button.dataset.deployInspect===step.skill);button.style.setProperty('--route-color',color(button.dataset.deployInspect));button.setAttribute('aria-pressed',String(button.dataset.deployInspect===step.skill));});
    const now=figure.querySelector('[data-deploy-now]');now.textContent=`${step.skill==='navigation'?'Navigation':'Manipulation'} · ${step.title}`;
    if(changed)drawRoutes();else paint();
  }
  function roundedRoute(points, radius = 5) {
    const path = d3.path();
    path.moveTo(...points[0]);
    for (let i = 1; i < points.length - 1; i++) {
      const a = points[i - 1],
        b = points[i],
        c = points[i + 1];
      const before = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const after = Math.hypot(c[0] - b[0], c[1] - b[1]);
      const r = Math.min(radius, before / 2, after / 2);
      if (!before || !after) {
        path.lineTo(...b);
        continue;
      }
      path.lineTo(
        b[0] + ((a[0] - b[0]) * r) / before,
        b[1] + ((a[1] - b[1]) * r) / before,
      );
      path.quadraticCurveTo(
        ...b,
        b[0] + ((c[0] - b[0]) * r) / after,
        b[1] + ((c[1] - b[1]) * r) / after,
      );
    }
    path.lineTo(...points[points.length - 1]);
    return path.toString();
  }
  function geometry(edge, bounds) {
    const source = nodes.get(edge.from)?.getBoundingClientRect();
    const target = nodes.get(edge.to)?.getBoundingClientRect();
    if (!source || !target) return "";
    if (!mobile.matches) {
      const x1 = source.right - bounds.left + 1,
        y1 = source.top - bounds.top + source.height / 2;
      const x2 = target.left - bounds.left - 1,
        y2 = target.top - bounds.top + target.height / 2;
      const bend = Math.max(0, (x2 - x1) * 0.5);
      return `M${x1},${y1}C${x1 + bend},${y1} ${x2 - bend},${y2} ${x2},${y2}`;
    }
    const x1 = source.left - bounds.left + source.width / 2,
      y1 = source.bottom - bounds.top + 1;
    const x2 = target.left - bounds.left + target.width / 2,
      y2 = target.top - bounds.top - 1;
    // The outside rail bypasses the centered column labels between mobile rows.
    const rail = edge.skill === "navigation" ? 4 : bounds.width - 4;
    const inset = Math.min(9, Math.max(2, (y2 - y1) / 4));
    return roundedRoute([
      [x1, y1],
      [x1, y1 + inset],
      [rail, y1 + inset],
      [rail, y2 - inset],
      [x2, y2 - inset],
      [x2, y2],
    ]);
  }
  function drawRoutes() {
    const bounds = flow.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    svg.attr("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
    const visibleEdges = mobile.matches
      ? edges.filter((edge) => activeIds().includes(edge.id))
      : edges;
    const groups = routes
      .selectAll("g.deploy-edge")
      .data(visibleEdges, (edge) => edge.id)
      .join((enter) => {
        const group = enter.append("g").attr("class", "deploy-edge");
        group.append("path").attr("class", "deploy-ribbon");
        group.append("path").attr("class", "deploy-wire");
        return group;
      });
    groups
      .attr("data-deploy-route", (edge) => edge.id)
      .style("--route-color", (edge) => color(edge.skill));
    groups.each(function (edge) {
      d3.select(this)
        .selectAll("path")
        .attr("d", geometry(edge, bounds))
        .classed("is-active", activeIds().includes(edge.id));
    });
    selectedPaths = activeIds().map((id) => {
      const path = routes
        .selectAll("g.deploy-edge")
        .filter((edge) => edge.id === id)
        .select(".deploy-wire")
        .node();
      return path ? { path, length: path.getTotalLength() } : null;
    });
    paint();
  }

  function paint(){
    if(!steps.length)return;
    buttons.forEach((button,index)=>button.querySelector('.deploy-step-progress').style.width=index===current?`${progress*100}%`:'0%');
    dots.style('--route-color',color(steps[current].skill)).each(function(index){
      const route=selectedPaths[index],fraction=progress*3-index,show=!reduced.matches&&route&&fraction>=0&&fraction<1;
      this.setAttribute('opacity',show?'1':'0');
      if(show){const point=route.path.getPointAtLength(fraction*route.length);this.setAttribute('cx',point.x);this.setAttribute('cy',point.y);}
    });
  }
  figure.addEventListener('deploy:time',event=>{
    if(task?.id!==event.detail.task.id)selectTask(event.detail.task);
    update(event.detail.time,event.detail.playing);
  });
  inspectors.forEach(button=>button.addEventListener('click',()=>{if(!task)return;const index=steps.findIndex(step=>step.skill===button.dataset.deployInspect);if(index>=0)seekStep(index);}));
  function scheduleGeometry(){if(resizeFrame)return;resizeFrame=requestAnimationFrame(()=>{resizeFrame=0;if(task)drawRoutes();});}
  const resize=new ResizeObserver(scheduleGeometry);resize.observe(flow);
  mobile.addEventListener('change',scheduleGeometry);reduced.addEventListener('change',paint);document.fonts?.ready.then(scheduleGeometry);
  window.addEventListener('pagehide',event=>{cancelAnimationFrame(resizeFrame);resizeFrame=0;if(!event.persisted)resize.disconnect();});
})();

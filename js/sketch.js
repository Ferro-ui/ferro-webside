(() => {
  const root = document.querySelector('#byggskisse');
  const drawing = root.querySelector('#sketch-drawing');
  const attachment = document.querySelector('#included-sketch');
  const find = selector => root.querySelector(selector);
  const field = name => find('[name="'+name+'"]');
  const fmt = new Intl.NumberFormat('nb-NO', {maximumFractionDigits:2});
  const names = ['Verksted','Lager','Kontor','Produksjon','Butikk','Annet'];
  const colors = ['#7ab0cb','#afc6ac','#dfbd8c','#c4add1','#d8a6a0'];
  const scopeInputs=[...root.querySelectorAll('[name=scope]')];
  const noteFields=['projectNote','envelopeNote','planNote'];
  const roomTypes=['Kontor','Møterom','Garderobe','WC','Teknisk rom','Lager','Pauseplass','Verksted'];
  function normalizeZone(z) {
    const layouts={};
    for(const floor of Object.keys(ferroRooms.titles)) {
      layouts[floor]=z.layouts?.[floor]?ferroRooms.read(z.layouts[floor]):ferroRooms.fromLegacy(z[floor]);
    }
    const percent=(value,min,max,fallback)=>Number.isInteger(value)?Math.max(min,Math.min(max,value)):fallback;
    const deckLength=percent(z.deckLength,10,100,100), depth=percent(z.depth,10,100,50);
    return {name:z.name,share:z.share,stair:ferroStairs.stair(z.stair),layouts,figures:ferroFigures.restore(z.figures),deckLength,depth,deckX:percent(z.deckX,0,100-deckLength,0),deckY:percent(z.deckY,0,100-depth,0),
      loftWidth:percent(z.loftWidth,10,95,50),loftLength:percent(z.loftLength,10,100,100),
      loft:z.loft===true,loftInsulation:['Isolert','Uisolert'].includes(z.loftInsulation)?z.loftInsulation:'Avklares',mezzanine:z.mezzanine===true};
  }
  const zoneList = find('[data-zones]');
  const dimensions = [['length','lengde'],['width','bredde'],['height','hoyde']];
  const state = {
    ...Object.fromEntries(dimensions.map(([prop,name])=>[prop,field(name).valueAsNumber])),
    bays:null,parts:{},figures:[],stories:1,roof:'gable',cold:false,wall:'horizontal',cover:'membrane',
    scope:[],projectNote:'',envelopeNote:'',planNote:'',openings:[],
    zones:[{name:'Lager',share:100}]
  };
  const key = 'ferro.sketch.v2';
  const choices = {roof:['gable','mono','flat'],wall:['horizontal','vertical','sheet','other'],cover:['membrane','trp','sandwich','other']};
  // Optional CMS hook: an in-memory preview sketch replaces the visitor's own saved sketch.
  const preview = window.ferroSketchPreview;
  const stored = () => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
  try {
    const saved = preview ? JSON.parse(JSON.stringify(preview.sketch)) : stored();
    if (saved) {
      state.zoneTree=saved.zoneTree;
      state.parts=ferroMassing.restore(saved.parts);
      if(Number.isInteger(saved.bays) && saved.bays>=1 && saved.bays<=24) state.bays=saved.bays;
      state.figures=ferroFigures.restore(saved.figures);
      if(Number.isFinite(saved.ridgeRise) && saved.ridgeRise>=.1 && saved.ridgeRise<=30) state.ridgeRise=saved.ridgeRise;
      if([1,2,3].includes(saved.stories)) state.stories=saved.stories;
      for (const [prop,name] of dimensions) {
        const input = field(name);
        input.value = saved[prop];
        if (input.validity.valid) state[prop] = input.valueAsNumber;
      }
      for (const [prop,options] of Object.entries(choices)) if (options.includes(saved[prop])) state[prop]=saved[prop];
      // Older sketches marked automatic building-type suggestions with customOpenings:false; only manual openings are kept.
      state.openings=saved.customOpenings===false?[]:ferroOpenings.restore(saved,state);
      state.cold=saved.cold===true;
      if (Array.isArray(saved.scope)) state.scope=scopeInputs.map(input=>input.value).filter(value=>saved.scope.includes(value));
      for (const name of noteFields) if (typeof saved[name]==='string') state[name]=saved[name].slice(0,500);
      if (Array.isArray(saved.zones) && saved.zones.length>=1 && saved.zones.length<=5 &&
          saved.zones.every(z=>z && names.includes(z.name) && Number.isInteger(z.share) && z.share>=5) &&
          saved.zones.reduce((total,z)=>total+z.share,0)===100) state.zones=saved.zones;
    }
  } catch { /* The editor also works without browser storage. */ }
  state.zones=state.zones.map(normalizeZone);
  state.zoneTree=ferroZones.restore(state.zoneTree,state.zones.length);
  let zoneGeometry,figureDraft=null,activeFigure='',figureMessage='';
  let layer='shell', level='ground', selected=0, tilt=.49;
  function persist() { if(preview) return; try {localStorage.setItem(key,JSON.stringify(state));} catch {} }
  let view='volume', angle=-.64, editor='form', projection, drag=null;
  let rows=[], roomPath='', section='all';
  field('stories').value=state.stories;
  for (const [prop,name] of dimensions) field(name).value=state[prop];
  field('tak').value=state.roof;field('ridgeRise').value=state.ridgeRise ?? '';
  for(const [v,label] of Object.entries(ferroOpenings.walls)) field('elevation').add(new Option(label,v));
  field('elevation').onchange=()=>render();
  let openingLayout, drawingModel;
  function editOpenings() {
    const list=find('[data-opening-list]');list.replaceChildren();
    state.openings.forEach((g,index)=>{
      const box=document.createElement('fieldset');box.className='opening-group';
      const legend=document.createElement('legend');legend.textContent=ferroOpenings.types[g.type]+' · '+(index+1);box.append(legend);
      for(const [prop,label] of [['count','Antall'],['width','Bredde (m)'],['height','Høyde (m)'],['wall','Fasade']]) {
        const holder=document.createElement('label');holder.textContent=label;
        const input=document.createElement(prop==='wall'?'select':'input');input.dataset.prop=prop;
        if(prop==='wall'){
          for(const [v,name] of Object.entries(ferroOpenings.walls)) input.add(new Option(name,v));
        } else {
          const count=prop==='count';input.type='number';input.min=count?1:.01;input.max=count?999:200;input.step=count?1:.01;input.required=true;
        }
        input.value=g[prop];
        input.addEventListener(prop==='wall'?'change':'input',()=>{
          if(!input.validity.valid) return;
          g[prop]=prop==='wall'?input.value:input.valueAsNumber;
          field('elevation').value=g.wall;view='facade';update();
        });
        holder.append(input);box.append(holder);
      }
      const remove=document.createElement('button');remove.type='button';remove.textContent='Fjern';
      remove.setAttribute('aria-label','Fjern '+legend.textContent);
      remove.onclick=()=>{state.openings.splice(index,1);editOpenings();update();find('[data-opening-add]').focus();};
      box.append(remove);list.append(box);
    });
  }
  root.querySelectorAll('[data-opening-add]').forEach(button=>button.onclick=()=>{
    if(!validDimensions()) return;
    const g=ferroOpenings.example(button.dataset.openingAdd);g.wall=field('elevation').value;state.openings.push(g);
    editOpenings();view='facade';update();find('[data-opening-list]').lastElementChild.querySelector('input').select();
  });
  editOpenings();
  function zoneLabel(z) {return z.layouts[level].name?.trim() || z.name;}
  function refreshTargets() {
    const target=field('zoneTarget'), prev=target.value;
    target.replaceChildren(...state.zones.flatMap((z,i)=>i===selected?[]:[new Option((i+1)+'. '+zoneLabel(z),i)]));
    if([...target.options].some(o=>o.value===prev)) target.value=prev;
    find('[data-placement]').hidden=state.zones.length<2;
    find('[data-placed]').textContent='';
  }
  function place(source,target,side) {
    if(source===target || !state.zones[target]) return;
    state.zoneTree=ferroZones.place(state.zoneTree,source,target,side);
    selected=source;roomPath='';setEditor('zones');editPlan();
    field('zoneTarget').value=target;
    const words={above:'over',below:'under',left:'til venstre for',right:'til høyre for'};
    find('[data-placed]').textContent=zoneLabel(state.zones[source])+' er plassert '+words[side]+' '+zoneLabel(state.zones[target])+'.';
  }
  root.querySelectorAll('[data-place]').forEach(b=>b.onclick=()=>place(selected,Number(field('zoneTarget').value),b.dataset.place));
  function zoneArea(z) {return fmt.format(state.length*state.width*z.share/100)+' m²';}
  const selectedText=name=>field(name).selectedOptions[0].text;
  function heightDescription(zone){
    const peak=ferroRooms.ridgeRise(state);
    return 'Høyde til taklinjen: '+fmt.format(peak*(1-zone.loftWidth/100))+' m ved sideveggene, '+fmt.format(peak)+' m ved mønet';
  }
  function summary() {
    const lines=[
      'Hovedbygg · '+state.length+' × '+state.width+' m · '+fmt.format(state.length*state.width)+' m²',
      'Vegghøyde '+fmt.format(state.height)+' m · '+selectedText('tak'),
      ...(state.roof==='gable'?['Fra raft til møne · '+fmt.format(ferroRooms.ridgeRise(state))+' m']:[]),
      'Forespørsel: '+(state.scope.join(', ') || 'Avklares'),
      (state.cold?'Uisolert':'Isolert')+' bygg · '+selectedText('wall')+' · '+selectedText('cover'),
      ...state.openings.map(g=>ferroOpenings.types[g.type]+' · '+g.count+' stk. · '+fmt.format(g.width)+' × '+fmt.format(g.height)+' m · '+ferroOpenings.walls[g.wall]),
      ...(openingLayout?.issues || [])
    ];
    const bays=ferroMassing.fields(state);
    lines.push('Skjematiske akser for hovedbygg: '+bays+' felt à ca. '+fmt.format(state.length/bays)+' m. Endelig bæresystem avklares.');
    for(const part of ferroMassing.parts(state)){
      lines.push(ferroMassing.types[part.type]+' · '+ferroOpenings.walls[part.side]+' · '+fmt.format(part.along)+' × '+fmt.format(part.depth)+' m · '+fmt.format(part.area)+' m² · start '+fmt.format(part.start)+' m'+
        (part.type==='wing'?' · flatt tak +'+fmt.format(part.height)+' m':part.type==='balcony'?' · gulv +'+fmt.format(part.floor)+' m':' · på terreng'));
    }
    lines.push('Samlet lukket grunnflate: '+fmt.format(ferroMassing.enclosedArea(state))+' m²');
    for(const [i,z] of state.zones.entries()) {
      const box=zoneGeometry.boxes[i];
      lines.push((i+1)+'. '+(z.layouts.ground.name || z.name)+' · '+zoneArea(z)+' ('+z.share+' %)',
        'Soneplassering · '+fmt.format(box.x)+' m fra fremre gavl · '+fmt.format(box.y)+' m fra langside B');
      for(const floor of ferroRooms.levels(z,state)) {
        const surface=ferroRooms.surface({...state,zoneGeometry},i,floor);
        const area=surface.w*surface.h;
        if(floor==='deck') lines.push('Mesaninplassering · '+fmt.format(surface.x-box.x)+' m fra sonestart · '+fmt.format(surface.y)+' m fra langside B');
        lines.push(ferroRooms.titles[floor]+' · '+fmt.format(area)+' m²'+(floor==='loft'?' gulvflate under skråtak · Isolering: '+z.loftInsulation:''));
        if(floor==='loft') lines.push('Loft under mønet · '+fmt.format(surface.w)+' × '+fmt.format(surface.h)+' m · '+heightDescription(z));
        for(const cell of ferroRooms.cells(z.layouts[floor])) {
          const w=surface.w*cell.w, h=surface.h*cell.h;
          lines.push('  '+(cell.node.name || z.name)+' · '+fmt.format(w)+' × '+fmt.format(h)+' m · '+fmt.format(area*cell.w*cell.h)+' m²');
        }
      }
    }
    for(const floor of Object.keys(ferroRooms.titles)) {
      for(const {shape,box} of ferroFigures.entries({...state,zoneGeometry},floor)) {
        lines.push('Figur · '+ferroRooms.titles[floor]+' · '+shape.name+' · '+fmt.format(ferroFigures.area(shape.points)*box.w*box.h)+' m²');
      }
    }
    for(const [i,name] of noteFields.entries()) if(state[name].trim()) lines.push(['Prosjekt','Vegger og tak','Romplan'][i]+': '+state[name].trim());
    lines.push(...ferroStairs.summary({...state,zoneGeometry}));
    return lines.join('\n');
  }
  function update() {render();persist();}
  scopeInputs.forEach(input=>{
    input.checked=state.scope.includes(input.value);
    input.onchange=()=>{
      state.scope=scopeInputs.filter(b=>b.checked).map(b=>b.value);
      update();
    };
  });
  for(const name of noteFields) {
    field(name).value=state[name];field(name).oninput=e=>{state[name]=e.target.value;persist();};
  }
  for(const [key,label] of Object.entries(ferroOpenings.walls)) field('partSide').add(new Option(label,key));
  field('partSide').value='sideA';
  function loadPart() {
    const s=state.parts[field('partSide').value];
    field('partType').value=s?.type || '';
    if(s) {
      field('partShare').value=Math.round(s.share*100);field('partPosition').value=Math.round(s.position*100);
      field('partDepth').value=s.depth;field('partHeight').value=s.height;
    }
  }
  loadPart();
  field('partSide').onchange=()=>{loadPart();render();};
  field('partType').onchange=e=>{
    const type=e.target.value,side=field('partSide').value;
    if(!type) delete state.parts[side];
    else {
      const previous=state.parts[side];
      state.parts[side]={share:.5,position:0,depth:Math.max(1,Math.round(state.width*.4)),...previous,type,
        height:Math.max(.5,Math.round(state.height*(type==='wing'?.75:.5)*10)/10)};
    }
    loadPart();update();
  };
  for(const [name,key] of [['partShare','share'],['partPosition','position'],['partDepth','depth'],['partHeight','height']]) {
    field(name).oninput=e=>{
      if(e.target.validity.valid) {state.parts[field('partSide').value][key]=e.target.valueAsNumber/(e.target.type==='range'?100:1);update();}
    };
  }
  field('bayCount').value=state.bays ?? '';
  field('bayCount').oninput=e=>{
    if(e.target.validity.valid) {state.bays=e.target.value?e.target.valueAsNumber:null;view='volume';layer='steel';update();}
  };
  let measurements=false,showAxes=false;
  find('[data-plan-axes]').onclick=e=>{showAxes=!showAxes;e.currentTarget.setAttribute('aria-pressed',showAxes);render();};
  find('[data-measurements]').onclick=()=>{measurements=!measurements;render();};
  field('cold').checked=state.cold;
  field('cold').onchange=e=>{state.cold=e.target.checked;update();};
  for(const name of ['wall','cover']) {
    field(name).value=state[name];field(name).onchange=e=>{state[name]=e.target.value;view='volume';layer='shell';update();};
  }
  function buildRoomEditor() {
    const z=state.zones[selected];
    if(!ferroRooms.levels(z,state).includes(level)) level='ground';
    field('roomZone').replaceChildren(...state.zones.map((v,i)=>new Option((i+1)+'. '+zoneLabel(v),i)));
    field('roomZone').value=selected;
    find('[data-loft-options]').hidden=state.roof!=='gable';field('loft').checked=z.loft;
    find('[data-loft-size]').hidden=!z.loft;
    find('[data-loft-insulation]').hidden=!z.loft;field('loftInsulation').value=z.loftInsulation;
    field('mezzanine').checked=z.mezzanine;find('[data-deck-position]').hidden=!z.mezzanine;
    find('[data-depth]').hidden=!z.mezzanine;
    refreshTargets();
    const tree=z.layouts[level], cells=ferroRooms.cells(tree);
    const cell=cells.find(c=>c.path===roomPath) || cells[0];
    roomPath=cell.path;
    field('activeRoom').replaceChildren(...cells.map((c,i)=>new Option((i+1)+'. '+(c.node.name || z.name),c.path)));
    field('activeRoom').value=roomPath;
    field('roomName').value=cell.node.name;field('roomName').placeholder=z.name;
    find('[data-room-boundary]').hidden=!roomPath;
    field('cutPath').replaceChildren();
    for(let depth=roomPath.length;depth>0;depth--) {
      const path=roomPath.slice(0,depth), node=ferroRooms.parent(tree,path);
      field('cutPath').add(new Option('Deling '+depth+' · '+(node.axis==='x'?'lengderetning':'bredderetning'),path));
    }
    if(roomPath) field('cut').value=Math.round(100*ferroRooms.parent(tree,roomPath).ratio);
    const floors=Object.keys(ferroRooms.titles).filter(f=>state.zones.some(zone=>ferroRooms.levels(zone,state).includes(f)));
    if(section!=='all' && !floors.includes(section)) section='all';
    field('cutFloor').replaceChildren(new Option('Alle nivåer','all'),...floors.map(f=>new Option(ferroRooms.titles[f],f)));
    field('cutFloor').value=section;
    find('[data-row]').disabled=cells.length+Number(field('rowCount').value)>48;
    root.querySelectorAll('[data-split]').forEach(b=>b.disabled=cells.length>=48);
  }
  const suggestions=document.createElement('datalist');suggestions.id='ferro-room-types';
  roomTypes.forEach(name=>suggestions.append(new Option(name)));root.append(suggestions);
  function editPlan() {buildRoomEditor();view='plan';update();}
  function activeCell() {return ferroRooms.cells(state.zones[selected].layouts[level]).find(c=>c.path===roomPath);}
  field('stories').onchange=e=>{state.stories=Number(e.target.value);level=['ground','second','third'][state.stories-1];roomPath='';editPlan();};
  field('roomZone').onchange=e=>{selected=Number(e.target.value);roomPath='';editPlan();};
  field('loft').onchange=e=>{state.zones[selected].loft=e.target.checked;level=e.target.checked?'loft':'ground';roomPath='';editPlan();};
  find('[data-add-loft]').onclick=()=>{
    setEditor('zones');toggleTools(true);
    state.zones[selected].loft=true;level='loft';roomPath='';editPlan();
  };
  for(const key of ['loftWidth','loftLength']){
    field(key).oninput=e=>{
      state.zones[selected][key]=e.target.valueAsNumber;
      if(level!=='loft'){level='loft';roomPath='';buildRoomEditor();}
      view='plan';update();
    };
  }
  field('loftInsulation').onchange=e=>{state.zones[selected].loftInsulation=e.target.value;update();};
  field('mezzanine').onchange=e=>{
    state.zones[selected].mezzanine=e.target.checked;level=e.target.checked?'deck':'ground';roomPath='';editPlan();
  };
  for(const [input,prop] of [['deckDepth','depth'],['deckLength','deckLength'],['deckX','deckX'],['deckY','deckY']]) {
    field(input).oninput=e=>{
      const z=state.zones[selected];z[prop]=e.target.valueAsNumber;
      z.deckX=Math.min(z.deckX,100-z.deckLength);z.deckY=Math.min(z.deckY,100-z.depth);
      if(level!=='deck'){level='deck';roomPath='';buildRoomEditor();}
      view='plan';update();
    };
  }
  field('activeRoom').onchange=e=>{roomPath=e.target.value;editPlan();};
  field('roomName').oninput=e=>{
    activeCell().node.name=e.target.value;
    const select=field('activeRoom');
    select.selectedOptions[0].text=(select.selectedIndex+1)+'. '+(e.target.value || state.zones[selected].name);
    field('roomZone').selectedOptions[0].text=(selected+1)+'. '+zoneLabel(state.zones[selected]);
    update();
  };
  field('rowCount').onchange=buildRoomEditor;
  field('cutPath').onchange=e=>{field('cut').value=Math.round(100*ferroRooms.parent(state.zones[selected].layouts[level],e.target.value).ratio);};
  field('cut').oninput=e=>{ferroRooms.parent(state.zones[selected].layouts[level],field('cutPath').value).ratio=Number(e.target.value)/100;update();};
  field('cutFloor').onchange=e=>{section=e.target.value;render();};
  find('[data-merge]').onclick=()=>{
    const z=state.zones[selected], parent=ferroRooms.parent(z.layouts[level],roomPath);
    const other=parent.children[roomPath.endsWith('1')?0:1];roomPath=roomPath.slice(0,-1);
    ferroRooms.replace(z,level,roomPath,other);editPlan();
  };
  root.querySelectorAll('[data-split]').forEach(b=>b.onclick=()=>{
    const node=ferroRooms.split(b.dataset.split,.5,activeCell().node,ferroRooms.leaf('Nytt rom'));
    ferroRooms.replace(state.zones[selected],level,roomPath,node);
    roomPath+='1';editPlan();field('roomName').select();
  });
  find('[data-row]').onclick=()=>{
    const side=field('rowWall').value, count=Number(field('rowCount').value);
    const node=ferroRooms.wallRow(side,count,activeCell().node.name);
    ferroRooms.replace(state.zones[selected],level,roomPath,node);
    roomPath+=(side==='front' || side==='sideB'?'0':'1')+'0';editPlan();
  };
  function changeLevel(value) {
    if(!ferroRooms.levels(state.zones[selected],state).includes(value)) selected=state.zones.findIndex(z=>ferroRooms.levels(z,state).includes(value));
    if(selected<0) {selected=0;value='ground';}
    level=value;roomPath='';view='plan';buildRoomEditor();render();
  }
  root.querySelectorAll('[data-level],[data-room-level]').forEach(b=>b.onclick=()=>changeLevel(b.dataset.level || b.dataset.roomLevel));
  root.querySelectorAll('[data-layer]').forEach(b=>b.onclick=()=>{
    layer=b.dataset.layer;
    render();
  });
  function buildRows() {
    zoneList.replaceChildren();
    const zones=state.zones;
    rows=zones.map((z,i)=>{
      const row=document.createElement('div');
      row.className='sketch-zone';
      row.style.setProperty('--swatch',colors[i]);
      row.innerHTML='<div class="zone-head"><i></i><select></select><output></output><button type="button" class="zone-remove">×</button></div>';
      row.querySelector('i').textContent=i+1;
      const select=row.querySelector('select');
      select.setAttribute('aria-label','Bruk av sone '+(i+1));
      for (const name of names) select.add(new Option(name,name));
      select.value=z.name;
      select.onchange=()=>{
        if(names.includes(select.value)) z.name=select.value;
        if(z.layouts[level].name) z.layouts[level].name=select.value;
        buildRoomEditor();update();
      };
      const remove=row.querySelector('button');
      remove.hidden=zones.length===1;
      remove.setAttribute('aria-label','Fjern sone '+(i+1));
      remove.onclick=()=>{
        zones[i===0?1:i-1].share+=z.share; state.zoneTree=ferroZones.remove(state.zoneTree,i,true);zones.splice(i,1);selected=Math.max(0,selected-(i<=selected?1:0));
        buildRows();update();rows[Math.min(i,zones.length-1)].select.focus();
      };
      let range;
      if (i<zones.length-1) {
        range=document.createElement('input'); range.type='range'; range.min=5;
        range.oninput=()=>{
          const total=z.share+zones[i+1].share;
          z.share=Number(range.value);zones[i+1].share=total-z.share;update();
        };
        row.append(range);
      }
      zoneList.append(row);
      return {range,select,output:row.querySelector('output')};
    });
    find('[data-add]').disabled=zones.length>=5;buildRoomEditor();
  }
  find('[data-add]').onclick=()=>{
    const zones=state.zones;
    const largest=zones.reduce((a,b)=>a.share>=b.share?a:b);
    const share=Math.floor(largest.share/2);
    state.zoneTree=ferroZones.replace(state.zoneTree,zones.indexOf(largest),ferroZones.pair('x',zones.indexOf(largest),zones.length));
    largest.share-=share;zones.push(normalizeZone({name:names.find(name=>!zones.some(z=>z.name===name)),share}));selected=zones.length-1;
    buildRows();update();rows.at(-1).select.focus();
  };
  const figureTools=find('[data-figure-tools]');
  const figureModel=()=>({...state,zoneGeometry});
  const figureEntries=()=>ferroFigures.entries(figureModel(),level);
  const currentFigure=()=>figureEntries().find(entry=>entry.shape.id===activeFigure);
  function draftPoints() {
    return figureDraft.mode==='rectangle'?ferroFigures.rectangle(figureDraft.points):figureDraft.points;
  }
  function figureUI() {
    figureTools.hidden=view!=='plan';
    const surfaces=ferroFigures.surfaces(figureModel(),level);
    const surface=surfaces.find(s=>s.index===undefined || s.index===selected);
    if(figureDraft && (view!=='plan' || figureDraft.list!==surface?.list || figureDraft.level!==level)) {
      figureDraft=null;figureMessage='';
    }
    const entries=figureEntries(),entry=entries.find(e=>e.shape.id===activeFigure);
    if(!entry) activeFigure='';
    const saved=!!entry && !figureDraft;
    find('[data-figure-chooser]').hidden=!entries.length || !!figureDraft;
    const pick=field('figurePick');
    pick.replaceChildren(new Option('Velg figur',''),...entries.map(e=>new Option(e.shape.name,e.shape.id)));
    pick.value=activeFigure;
    find('[data-figure-naming]').hidden=!saved && !figureDraft;
    if(field('figureName')!==document.activeElement) field('figureName').value=figureDraft?.name ?? entry?.shape.name ?? '';
    find('[data-figure-draft]').hidden=!figureDraft;
    find('[data-figure-delete]').hidden=!saved;
    root.querySelectorAll('[data-figure-start]').forEach(b=>b.hidden=!!figureDraft);
    find('[data-figure-undo]').disabled=!figureDraft?.points.length;
    find('[data-figure-save]').disabled=!figureDraft || draftPoints().length<3;
    drawing.classList.toggle('figure-drawing',!!figureDraft);
    drawing.classList.toggle('figure-editing',view==='plan' && (!!figureDraft || saved));
    find('[data-figure-message]').textContent=figureMessage || (figureDraft?
      (figureDraft.mode==='rectangle'?'Trykk på to motsatte hjørner.':'Trykk rundt omrisset og velg Lagre figur.')+
      (surface?.index===undefined?'':' Tegn innenfor valgt sone.')+' Punkt: '+figureDraft.points.length
      :saved?'Dra figuren for å flytte den, eller dra et hjørne for å endre formen.':'');
    return figureDraft?{box:surface.box,points:draftPoints()}:null;
  }
  root.querySelectorAll('[data-figure-start]').forEach(b=>b.onclick=()=>{
    const surface=ferroFigures.surfaces(figureModel(),level).find(s=>s.index===undefined || s.index===selected);
    if(!surface) return;
    figureDraft={list:surface.list,level,mode:b.dataset.figureStart,points:[],name:''};
    figureMessage='';activeFigure='';render();
  });
  field('figureName').oninput=e=>{
    if(figureDraft){figureDraft.name=e.target.value;return;}
    const entry=currentFigure();
    if(entry && e.target.value.trim()){entry.shape.name=e.target.value.trim();update();}
  };
  field('figureName').onblur=()=>{if(!figureDraft && currentFigure()) field('figureName').value=currentFigure().shape.name;};
  field('figurePick').onchange=e=>{activeFigure=e.target.value;figureMessage='';render();};
  find('[data-figure-undo]').onclick=()=>{figureDraft.points.pop();figureMessage='';render();};
  find('[data-figure-cancel]').onclick=()=>{figureDraft=null;figureMessage='';render();};
  find('[data-figure-save]').onclick=()=>{
    const points=draftPoints();
    if(!ferroFigures.valid(points)){figureMessage='Konturen må omslutte et areal uten kryssende kanter.';render();return;}
    if(!figureDraft.name.trim()){figureMessage='Gi figuren et navn.';render();field('figureName').focus();return;}
    activeFigure=crypto.randomUUID();
    figureDraft.list.push({id:activeFigure,name:figureDraft.name.trim(),level,points});
    figureDraft=null;figureMessage='';update();
  };
  find('[data-figure-delete]').onclick=()=>{
    const entry=currentFigure();if(!entry)return;
    entry.list.splice(entry.list.indexOf(entry.shape),1);activeFigure='';figureMessage='';update();
  };
  figureTools.ontoggle=()=>{
    if(!figureTools.open && (figureDraft || activeFigure)){figureDraft=null;activeFigure='';figureMessage='';render();}
  };
  function figurePoint(e,box) {
    const pt=sheetPoint(e);
    return [((pt.x-projection.left)/projection.scale-box.x)/box.w,((pt.y-projection.top)/projection.scale-box.y)/box.h];
  }
  function setEditor(value) {
    editor=value;
    root.querySelectorAll('[data-pane]').forEach(p=>p.hidden=p.dataset.pane!==editor);
    root.querySelectorAll('[data-edit]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.edit===editor));
  }
  for(const [name,options] of [['stairType',ferroStairs.flights],['stairCorner',ferroStairs.corners],['stairMaterial',ferroStairs.materials]])
    for(const value of options) field(name).add(new Option(value,value));
  for(const [name,key] of [['stairType','type'],['stairCorner','corner'],['stairTo','to'],['stairMaterial','material']]) {
    field(name).onchange=e=>{
      state.zones[selected].stair[key]=e.target.value;
      if(ferroStairs.destination(state.zones[selected],state)){view='volume';layer='open';section='all';field('cutFloor').value='all';}
      else {view='plan';level='ground';roomPath='';buildRoomEditor();}
      update();
    };
  }
  function syncStairFields(){
    const z=state.zones[selected],stair=z.stair;
    field('stairType').value=stair.type;field('stairCorner').value=stair.corner;field('stairMaterial').value=stair.material;
    const targets=ferroRooms.levels(z,state).filter(k=>k!=='ground');
    field('stairTo').replaceChildren(new Option('Avklares',''),...targets.map(k=>new Option(ferroRooms.titles[k],k)));
    field('stairTo').value=ferroStairs.destination(z,state);
    find('[data-stair-options]').hidden=!stair.type;
    const disconnected=field('stairTo').value==='loft' && !ferroStairs.landing({...state,zoneGeometry},selected,'loft');
    find('[data-stair-hint]').textContent=disconnected?'Loftet ligger utenfor denne sonen. Plassering av trappen må avklares.':field('stairTo').value?'Trapp og repos viser ønsket plassering. Mål og åpning i dekket avklares.':'Trappen vises på grunnplanet. Velg et målnivå for å vise løpet i 3D. Du kan legge til nivåer under Romplan.';

  }
  const framePreview=document.querySelector('[data-frame-preview]');
  let lastFrame='';
  function renderFramePreview(model) {
    const geometry=JSON.stringify([model.length,model.width,model.height,model.roof,model.ridgeRise,model.bays,model.parts]);
    if(geometry===lastFrame) return;
    lastFrame=geometry;
    drawFerroSketch(framePreview,{...model,layer:'steel',framePreview:true,tilt:.38},'volume',-.64);
  }
  function render() {
    const zones=state.zones;
    zoneGeometry=ferroZones.layout(state.zoneTree,zones,state.length,state.width);
    zoneGeometry.loftRuns=ferroRooms.loftRuns(state);
    const part=ferroMassing.parts(state).find(s=>s.side===field('partSide').value);
    find('[data-part-controls]').hidden=!part;
    if(part) {
      find('[data-part-z]').hidden=part.type==='terrace';
      find('[data-part-height-label]').textContent=part.type==='wing'?'Takhøyde over gulv':'Balkonggulv over hovedgulv';
      find('[data-part-length]').textContent=fmt.format(part.along)+' m';
      find('[data-part-offset]').textContent=fmt.format(part.start)+' m';
      field('partPosition').disabled=part.share===1;
    }
    const bays=ferroMassing.fields(state);
    find('[data-bay-note]').textContent='Prinsippskisse: '+bays+' like felt à ca. '+fmt.format(state.length/bays)+' m. Endelig rammeavstand avklares i tilbudsfasen.';
    find('[data-measurements]').hidden=layer!=='shell';
    find('[data-measurements]').setAttribute('aria-pressed',measurements);
    find('[data-total]').textContent=fmt.format(ferroMassing.enclosedArea(state))+' m²';
    rows.forEach(({range,output,select},i)=>{
      const z=zones[i];output.textContent=zoneArea(z);
      const shown=zoneLabel(z);
      if(select.value!==shown) {
        const custom=select.querySelector('[data-custom]');
        if(custom) custom.remove();
        if(!names.includes(shown)) {const option=new Option(shown,shown);option.dataset.custom='';select.add(option);}
        select.value=shown;
      }
      if (range) {
        range.max=z.share+zones[i+1].share-5; range.value=z.share;
        range.setAttribute('aria-label','Andel til sone '+(i+1)+', '+z.name);
        range.setAttribute('aria-valuetext',z.share+' prosent');
      }
    });
    find('[data-thermal]').textContent=state.cold?'Uisolert bygg':'Isolert bygg';
    openingLayout=ferroOpenings.layout(state);
    const status=find('[data-opening-status]');
    status.hidden=!openingLayout.issues.length;
    status.textContent=openingLayout.issues.join(' ')+(status.hidden?'':' Målene følger forespørselen. Juster antall, mål eller fasade for å vise dem.');
    find('[data-elevation]').hidden=view!=='facade';
    const z=zones[selected], cell=activeCell(), box=zoneGeometry.boxes[selected];
    find('[data-depth] output').textContent=fmt.format(box.h*z.depth/100)+' m ('+z.depth+' %)';
    const zoneWidth=box.w;
    field('deckDepth').value=z.depth;field('deckLength').value=z.deckLength;
    for(const [name,max] of [['deckX',100-z.deckLength],['deckY',100-z.depth]]) {
      field(name).max=max;field(name).value=z[name];field(name).disabled=max===0;
    }
    find('[data-deck-length]').textContent=fmt.format(zoneWidth*z.deckLength/100)+' m';
    find('[data-deck-x]').textContent=fmt.format(zoneWidth*z.deckX/100)+' m';
    find('[data-deck-y]').textContent=fmt.format(box.h*z.deckY/100)+' m';
    const floorBox=ferroRooms.surface({...state,zoneGeometry},selected,level);
    const roomWidth=floorBox.w*cell.w, roomDepth=floorBox.h*cell.h;
    const loft=z.loft && state.roof==='gable'?ferroRooms.surface({...state,zoneGeometry},selected,'loft'):null;
    if(loft){
      field('loftWidth').value=z.loftWidth;field('loftLength').value=z.loftLength;
      find('[data-loft-width]').textContent=fmt.format(loft.h)+' m';
      find('[data-loft-length]').textContent=fmt.format(loft.w)+' m';
    }
    find('[data-room-size]').textContent=fmt.format(roomWidth)+' × '+fmt.format(roomDepth)+' m · '+fmt.format(roomWidth*roomDepth)+' m²';
    find('[data-rise]').hidden=state.roof!=='gable';field('ridgeRise').placeholder=fmt.format(ferroRooms.ridgeRise(state))+' (skisse)';
    find('[data-section-tools]').hidden=view!=='volume' || layer!=='open';
    find('[data-model-tools]').hidden=view!=='volume';find('[data-plan-tools]').hidden=view!=='plan';
    const showRoofSection=view==='plan' && state.roof==='gable';
    find('[data-roof-section]').hidden=!showRoofSection;
    if(showRoofSection) {
      const rise=ferroRooms.ridgeRise(state), scale=Math.min(98/state.width,46/(state.height+rise));
      const left=52-state.width*scale/2, right=104-left, eave=50-state.height*scale, ridge=eave-rise*scale;
      find('[data-roof-walls]').setAttribute('d',`M${left} ${eave}V50H${right}V${eave}Z`);
      find('[data-roof-space]').setAttribute('d',`M${left} ${eave}L52 ${ridge}L${right} ${eave}Z`);
      if(loft){
        const side=left+loft.y*scale, cap=eave-rise*(1-z.loftWidth/100)*scale;
        find('[data-loft-floor]').setAttribute('d',`M${side} ${eave}V${cap}L52 ${ridge}L${104-side} ${cap}V${eave}Z`);
      } else find('[data-loft-floor]').setAttribute('d','');
      find('[data-roof-description]').textContent=z.loft
        ? 'Loft · '+fmt.format(loft.h)+' m bredde · '+heightDescription(z)
        : zoneLabel(z)+' · '+fmt.format(rise)+' m fra raft til møne';
      find('[data-add-loft]').hidden=z.loft;
      find('[data-add-loft]').setAttribute('aria-label','Legg til loftrom i '+zoneLabel(z));
    }
    root.querySelectorAll('[data-layer]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.layer===layer));
    root.querySelectorAll('[data-room-level],[data-level]').forEach(b=>{
      const value=b.dataset.roomLevel || b.dataset.level;b.setAttribute('aria-pressed',value===level);
      b.hidden=!(b.dataset.roomLevel?ferroRooms.levels(z,state).includes(value):zones.some(zone=>ferroRooms.levels(zone,state).includes(value)));
    });
    root.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===view));
    find('[data-rotate]').hidden=view!=='volume';
    find('[data-sheet-title]').textContent={volume:{shell:'Utvendig',open:'Åpen modell',steel:''}[layer],plan:ferroRooms.titles[level],facade:selectedText('elevation')}[view];
    find('[data-measure]').textContent=[state.length,state.width,state.height].map(n=>fmt.format(n)).join(' × ')+' m';
    find('[data-gesture]').textContent={volume:layer==='steel'?find('[data-bay-note]').textContent:'Trykk på et mål for å endre det. Dra modellen for å rotere.',plan:level==='loft'?'Loftrommet er sentrert under mønet. Dra en kant for å endre bredde eller lengde.':level==='deck'?'Dra krysset for å flytte mesaninen. Dra i kanten for å endre størrelsen.':'Dra en hel sone mot en kant av en annen sone for å plassere den der. Dra en skillevegg for å endre størrelsen.',facade:'Åpningene er fordelt skjematisk langs fasaden.'}[view];
    if(editor==='zones') syncStairFields();
    const preview=figureUI();
    drawingModel={...state,figureDraft:preview,activeFigure,measurements,showAxes,zoneGeometry,roomPath,section,layer,level,tilt,selected,placed:openingLayout.placed,elevationWall:field('elevation').value,zones:zones.map((z,i)=>({...z,color:colors[i]}))};
    projection=drawFerroSketch(drawing,drawingModel,view,angle,true);
    renderFramePreview(drawingModel);
    placeHandles();
    drawing.setAttribute('aria-label',find('[data-sheet-title]').textContent+'. '+summary());
  }
  function toggleTools(open,focus=false) {
    const panel=find('#sketch-tools'),button=find('[data-tools-toggle]');
    panel.hidden=!open;
    find('.sketch-workbench').classList.toggle('tools-open',open);
    button.setAttribute('aria-expanded',open);button.setAttribute('aria-label',open?'Lukk verktøy':'Åpne verktøy');
    if(focus) (open?find('[data-close-tools]'):button).focus();
  }
  find('[data-tools-toggle]').onclick=()=>toggleTools(find('#sketch-tools').hidden,true);
  find('[data-close-tools]').onclick=()=>toggleTools(false,true);
  const handleBar=find('[data-model-handles]'),dimBox=find('[data-dimension-editor]');
  let editingDimension=null;
  function closeDimension(focus=false) {
    if(!editingDimension) return;
    const [prop,name]=editingDimension;
    field(name).value=state[prop];editingDimension=null;dimBox.hidden=true;
    if(focus) find('[data-model-dimension='+prop+']').focus();
  }
  function startDimension(prop) {
    closeDimension();editingDimension=dimensions.find(([id])=>id===prop);
    const [,name]=editingDimension;
    for(const [,key] of dimensions) field(key).closest('label').hidden=key!==name;
    dimBox.hidden=false;field(name).focus();field(name).select();
  }
  for(const button of handleBar.children) button.onclick=()=>startDimension(button.dataset.modelDimension);
  function applyDimension(){
    if(!editingDimension) return;
    const [prop,name]=editingDimension,input=field(name);
    if(!input.reportValidity()) return;
    state[prop]=input.valueAsNumber;closeDimension(true);suggestOpenings();update();
  }
  find('[data-apply-dimension]').onclick=applyDimension;
  find('[data-cancel-dimension]').onclick=()=>closeDimension(true);
  dimBox.onkeydown=e=>{
    if(e.key==='Enter'){e.preventDefault();applyDimension();}
    if(e.key==='Escape'){e.stopPropagation();closeDimension(true);}
  };
  root.addEventListener('keydown',e=>{
    if(e.key==='Escape' && !find('#sketch-tools').hidden) toggleTools(false,true);
  });
  document.addEventListener('pointerdown',e=>{
    if(editingDimension && !dimBox.contains(e.target) && !handleBar.contains(e.target)) closeDimension();
  });
  function placeHandles() {
    const positions=projection?.handles;
    handleBar.hidden=!positions;
    if(!positions){closeDimension();return;}
    const w=handleBar.clientWidth,h=handleBar.clientHeight;
    if(!w || !h) return;
    const used=[];
    for(const button of handleBar.children){
      const key=button.dataset.modelDimension,value=fmt.format(state[key])+' m';
      button.querySelector('b').textContent=value;
      button.setAttribute('aria-label','Endre '+button.querySelector('small').textContent.toLowerCase()+', '+value);
      const [u,v]=positions[key],bw=button.offsetWidth,bh=button.offsetHeight;
      const bound=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
      const x=bound(u*w/720,bw/2+3,w-bw/2-3);
      let y=bound(v*h/440,bh/2+3,h-bh/2-3);
      for(const offset of [0,-1,1,-2,2,-3,3]){
        const test=bound(v*h/440+offset*(bh+4),bh/2+3,h-bh/2-3);
        if(used.every(box=>Math.abs(box.x-x)>(box.w+bw)/2+2 || Math.abs(box.y-test)>=bh+2)){y=test;break;}
      }
      used.push({x,y,w:bw});button.style.left=x+'px';button.style.top=y+'px';
    }
  }
  new ResizeObserver(placeHandles).observe(drawing);
  function validDimensions() {
    for (const [,name] of dimensions) {
      if (!field(name).validity.valid) {view='volume';layer='shell';render();startDimension(dimensions.find(d=>d[1]===name)[0]);field(name).reportValidity();return false;}
    }
    const part=state.parts[field('partSide').value];
    const extra=[field('bayCount'),...(part?[field('partDepth')]:[]),...(part && part.type!=='terrace'?[field('partHeight')]:[])].find(el=>!el.validity.valid);
    if(extra){toggleTools(true);setEditor('form');extra.closest('details').open=true;extra.reportValidity();return false;}
    if(state.roof==='gable' && !field('ridgeRise').validity.valid) {toggleTools(true);setEditor('form');field('ridgeRise').reportValidity();return false;}
    const invalid=find('[data-opening-list] input:invalid');
    if(invalid) {toggleTools(true);setEditor('openings');invalid.reportValidity();return false;}
    return true;
  }
  root.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{
    if (!validDimensions()) return;
    setEditor(b.dataset.edit);view={form:'volume',zones:'plan',facade:'volume',openings:'facade'}[editor];render();
  });
  root.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;render();});
  find('[data-tilt]').onclick=()=>{tilt=tilt<.35?.49:tilt<.68?.82:.24;render();};
  drawing.onclick=e=>{
    if(figureDraft && view==='plan') {
      const point=figurePoint(e,drawingModel.figureDraft.box);
      const max=figureDraft.mode==='rectangle'?2:100;
      if(point.some(v=>v<0 || v>1)) figureMessage='Velg et punkt innenfor tegneområdet.';
      else if(figureDraft.points.length>=max) figureMessage='Lagre figuren eller angre siste punkt.';
      else {figureDraft.points.push(point);figureMessage='';}
      render();return;
    }
    if(view!=='plan' || e.target.dataset.zone===undefined) return;
    selected=Number(e.target.dataset.zone);roomPath=e.target.dataset.room || '';setEditor('zones');buildRoomEditor();render();
  };
  find('[data-rotate]').onclick=()=>{angle+=Math.PI/4;render();};
  field('ridgeRise').oninput=e=>{if(e.target.validity.valid){state.ridgeRise=e.target.value?e.target.valueAsNumber:null;update();}};
  field('tak').onchange=e=>{state.roof=e.target.value;buildRoomEditor();update();};
  function sheetPoint(e) {return new DOMPoint(e.clientX,e.clientY).matrixTransform(drawing.getScreenCTM().inverse());}
  drawing.onpointerdown=e=>{
    if (e.button!==0 || drag || figureDraft || view==='facade') return;
    const start=sheetPoint(e);
    if(view==='plan') {
      const target=e.target.closest('[data-figure-id]');
      if(target) {
        activeFigure=target.dataset.figureId;figureMessage='';figureTools.open=true;
        const entry=currentFigure(),vertex=target.dataset.vertex;
        drag={id:e.pointerId,kind:'figure',entry,vertex:vertex===undefined?-1:Number(vertex),
          origin:figurePoint(e,entry.box),points:entry.shape.points.map(p=>p.slice())};
        e.preventDefault();drawing.setPointerCapture(e.pointerId);render();return;
      }
      const handle=e.target.closest('[data-grip]'), z=state.zones[selected];
      if(handle) {
        const kind=handle.dataset.grip;
        drag={kind,start,id:e.pointerId,zone:z,spanX:zoneGeometry.boxes[selected].w,spanY:zoneGeometry.boxes[selected].h,x:z.deckX,y:z.deckY,w:z.deckLength,h:z.depth};
        if(kind==='loftWidth' || kind==='loftLength') {
          drag.initial=z[kind];drag.fullSpan=kind==='loftWidth'?state.width:zoneGeometry.loftRuns[selected].w;
        }
        if(kind==='wall') {
          const path=handle.dataset.wallPath, tree=z.layouts[level];
          const node=ferroRooms.parent(tree,path+'0');
          Object.assign(drag,{node,ratio:node.ratio,span:Number(handle.dataset.span)});
          if(!roomPath.startsWith(path)) roomPath=ferroRooms.cells(tree).find(c=>c.path.startsWith(path)).path;
          buildRoomEditor();
          field('cutPath').value=roomPath.slice(0,path.length+1);
          field('cut').value=Math.round(node.ratio*100);
        }
      } else if(e.target.dataset.divider!==undefined) {
        const divider=Number(e.target.dataset.divider);
        drag={id:e.pointerId,kind:'zone',split:zoneGeometry.dividers[divider],start,shares:state.zones.map(z=>z.share)};
      } else if(e.target.dataset.room!==undefined) {
        drag={id:e.pointerId,kind:'room',x:e.clientX,y:e.clientY,from:e.target.dataset.room,zone:Number(e.target.dataset.zone)};
      } else return;
    } else drag={id:e.pointerId,kind:'orbit',x:e.clientX,y:e.clientY,angle,tilt};
    e.preventDefault();
    drawing.setPointerCapture(e.pointerId);drawing.classList.add('dragging');
  };
  function dockTarget(e) {
    if(drag.from!=='' || ['deck','loft'].includes(level)) return null;
    const pt=sheetPoint(e),x=(pt.x-projection.left)/projection.scale,y=(pt.y-projection.top)/projection.scale;
    const target=zoneGeometry.boxes.findIndex((b,i)=>i!==drag.zone && x>=b.x && x<=b.x+b.w && y>=b.y && y<=b.y+b.h);
    if(target<0) return null;
    const b=zoneGeometry.boxes[target],u=(x-b.x)/b.w,v=(y-b.y)/b.h;
    const distances={above:v,below:1-v,left:u,right:1-u};
    const side=Object.keys(distances).reduce((a,b)=>distances[a]<distances[b]?a:b);
    return {target,side};
  }
  function showDockPreview(dock) {
    drawing.querySelector('[data-dock-preview]')?.remove();
    if(!dock) return;
    const proposed=ferroZones.place(state.zoneTree,drag.zone,dock.target,dock.side);
    const box=ferroZones.layout(proposed,state.zones,state.length,state.width).boxes[drag.zone];
    const rect=document.createElementNS(drawing.namespaceURI,'rect');
    const attrs={x:projection.left+box.x*projection.scale,y:projection.top+box.y*projection.scale,width:box.w*projection.scale,height:box.h*projection.scale,
      fill:'#ffce71','fill-opacity':.62,stroke:'#19384b','stroke-width':3,'stroke-dasharray':'6 3','pointer-events':'none','data-dock-preview':dock.side};
    for(const [k,v] of Object.entries(attrs)) rect.setAttribute(k,v);
    drawing.append(rect);
  }
  drawing.onpointermove=e=>{
    if (!drag || drag.id!==e.pointerId) return;
    if(drag.kind==='figure') {
      const {entry,origin,points,vertex}=drag;
      const now=figurePoint(e,entry.box),clamp=v=>Math.min(1,Math.max(0,v));
      const delta=now.map((v,k)=>Math.max(-Math.min(...points.map(p=>p[k])),Math.min(1-Math.max(...points.map(p=>p[k])),v-origin[k])));
      const next=points.map((p,i)=>vertex<0?[p[0]+delta[0],p[1]+delta[1]]:i===vertex?now.map(clamp):p);
      if(ferroFigures.valid(next)){entry.shape.points=next;render();}
      return;
    }
    if(drag.kind==='room') {
      if(!drag.moved && Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<5) return;
      drag.moved=true;
      const dock=dockTarget(e);
      showDockPreview(dock);
      if(dock) {drawing.querySelector('.room-drop')?.classList.remove('room-drop');return;}
      const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-room]');
      const marked=drawing.querySelector('.room-drop');
      marked?.classList.remove('room-drop');
      if(target && drawing.contains(target)) drawing.querySelector('polygon[data-zone="'+target.dataset.zone+'"][data-room="'+target.dataset.room+'"]')?.classList.add('room-drop');
      return;
    }
    if (drag.kind==='orbit') {angle=drag.angle+(e.clientX-drag.x)*.012;tilt=Math.max(.12,Math.min(.91,drag.tilt+(e.clientY-drag.y)*.004));}
    else if (drag.kind==='zone') {
      const cut=drag.split, vertical=cut.axis==='x', pt=sheetPoint(e);
      const delta=vertical?(pt.x-drag.start.x)/cut.w:(pt.y-drag.start.y)/cut.h;
      const total=[...cut.first,...cut.second].reduce((n,i)=>n+drag.shares[i],0);
      const first=Math.max(cut.first.length*5,Math.min(total-cut.second.length*5,Math.round(total*(cut.ratio+delta/projection.scale))));
      ferroZones.distribute(state.zones,cut.first,first,drag.shares);
      ferroZones.distribute(state.zones,cut.second,total-first,drag.shares);
    } else {
      const pt=sheetPoint(e), dx=(pt.x-drag.start.x)/projection.scale, dy=(pt.y-drag.start.y)/projection.scale;
      const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
      if(drag.kind==='loftWidth' || drag.kind==='loftLength') {
        const wide=drag.kind==='loftWidth',delta=wide?dy:dx;
        drag.zone[drag.kind]=clamp(Math.round(drag.initial+200*delta/drag.fullSpan),10,wide?95:100);
      } else if(drag.kind==='wall') {
        const delta=drag.node.axis==='x'?dx:dy;
        drag.node.ratio=clamp(Math.round((drag.ratio+delta/drag.span)*100),1,99)/100;
        field('cut').value=Math.round(drag.node.ratio*100);
      } else {
        const z=drag.zone, mx=Math.round(dx/drag.spanX*100), my=Math.round(dy/drag.spanY*100);
        if(drag.kind==='move') {
          z.deckX=clamp(drag.x+mx,0,100-drag.w);z.deckY=clamp(drag.y+my,0,100-drag.h);
        } else if(drag.kind==='left') {
          z.deckX=clamp(drag.x+mx,0,drag.x+drag.w-10);z.deckLength=drag.w+drag.x-z.deckX;
        } else if(drag.kind==='top') {
          z.deckY=clamp(drag.y+my,0,drag.y+drag.h-10);z.depth=drag.h+drag.y-z.deckY;
        } else if(drag.kind==='right') z.deckLength=clamp(drag.w+mx,10,100-drag.x);
        else if(drag.kind==='bottom') z.depth=clamp(drag.h+my,10,100-drag.y);
      }
    }
    render();
  };
  drawing.onpointerup=e=>{
    if(drag?.kind!=='room' || drag.id!==e.pointerId) return;
    const dock=drag.moved && dockTarget(e);
    if(dock) {place(drag.zone,dock.target,dock.side);return;}
    const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-room]');
    const target=drag.moved && hit && drawing.contains(hit)?hit.dataset:null;
    selected=drag.zone;roomPath=drag.from;
    if(target && (Number(target.zone)!==selected || target.room!==roomPath)) {
      const source=activeCell().node, sourceName=source.name || state.zones[selected].name;
      selected=Number(target.zone);roomPath=target.room;
      const dest=activeCell().node;source.name=dest.name || state.zones[selected].name;dest.name=sourceName;
    }
    setEditor('zones');buildRoomEditor();update();
  };
  drawing.onlostpointercapture=()=>{drawing.querySelector('[data-dock-preview]')?.remove();drawing.querySelector('.room-drop')?.classList.remove('room-drop');drag=null;drawing.classList.remove('dragging');persist();};
  const downloadButton=find('[data-download]');
  const downloadStatus=find('[data-pdf-status]');
  downloadButton.onclick=async()=>{
    if(downloadButton.disabled || !validDimensions()) return;
    const model=structuredClone(drawingModel);
    const brief=summary(), files=inquiryDrawings.selected(), rotation=angle;
    downloadButton.disabled=true;
    downloadStatus.textContent='Lager PDF …';
    try {
      const blob=await ferroSketchPdf(model,rotation,brief,files,find('.sketch-brand'));
      const url=URL.createObjectURL(blob);
      const link=document.createElement('a');link.href=url;link.download='Ferro-byggskisse-'+model.length+'x'+model.width+'.pdf';
      document.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),60000);
      downloadStatus.textContent='';
    } catch {
      downloadStatus.textContent='Kunne ikke lage PDF-en. Prøv igjen.';
    } finally { downloadButton.disabled=false; }
  };
  find('[data-attach]').onclick=e=>{
    if (!validDimensions()){e.preventDefault();return;}
    attachment.querySelector('[data-sketch-summary]').textContent=summary();
    attachment.hidden=false;document.querySelector('#draft').hidden=true;
  };
  attachment.querySelector('button').onclick=()=>{attachment.hidden=true;document.querySelector('#draft').hidden=true;};
  buildRows();
  const panel=new URLSearchParams(location.search).get('panel');
  if(['stal','bygningsdeler','detaljer','romplan'].includes(panel)) toggleTools(true);
  if(panel==='tegning') measurements=true;
  if(panel==='stal'){layer='steel';field('bayCount').closest('details').open=true;}
  if(panel==='bygningsdeler') field('partSide').closest('details').open=true;
  if(panel==='romplan' || panel==='detaljer') {setEditor('zones');view='plan';}
  render();document.querySelector('[data-sketch-launch]').hidden=root.hidden=false;
})();

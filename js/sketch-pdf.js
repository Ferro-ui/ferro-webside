// Render the same geometry as the editor; the technical perspective uses Ferro's A3 frame.
async function ferroSketchPdf(model,angle,brief,files,brand) {
  const {PDFDocument,StandardFonts,rgb}=await import('./vendor/pdf-lib.min.mjs');
  const pdf=await PDFDocument.create();
  pdf.setTitle('Ferro · Byggskisse · '+model.buildingUse);
  pdf.setAuthor('Ferro Stålentreprenør');
  const regular=await pdf.embedFont(StandardFonts.Helvetica);
  const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink=rgb(.11,.20,.32), muted=rgb(.30,.40,.50);
  const width=842,height=595,margin=34;
  function canvas(w,h) {
    const image=document.createElement('canvas');
    image.width=w;image.height=h;
    return image;
  }
  async function png(surface) {
    const blob=await new Promise((resolve,reject)=>surface.toBlob(value=>value?resolve(value):reject(new Error('PNG export failed')),'image/png'));
    return pdf.embedPng(await blob.arrayBuffer());
  }
  let logo;
  if(brand.complete && brand.naturalWidth) {
    const mark=canvas(243,162);
    mark.getContext('2d').drawImage(brand,0,0,243,162);
    logo=await png(mark);
  }
  const fmt=new Intl.NumberFormat('nb-NO',{maximumFractionDigits:2});
  function perspectiveSheet(picture) {
    const mm=72/25.4, h=297;
    const page=pdf.addPage([420*mm,h*mm]);
    const top=(y)=>(h-y)*mm;
    const rule=(x,y,xx,yy)=>page.drawLine({start:{x:x*mm,y:top(y)},end:{x:xx*mm,y:top(yy)},thickness:.65,color:ink});
    const box=(x,y,w,b,color)=>page.drawRectangle({x:x*mm,y:top(y+b),width:w*mm,height:b*mm,color});
    const text=(x,y,value,size=9,font=regular,color=ink)=>page.drawText(value,{x:x*mm,y:top(y),size,font,color});
    const field=(y,name,value)=>{
      rule(335,y,410,y);text(339,y+5,name,7,regular,muted);text(339,y+13,value,12,bold);
    };
    page.drawRectangle({x:20*mm,y:10*mm,width:390*mm,height:277*mm,borderColor:ink,borderWidth:1.15});
    rule(335,10,335,287);
    text(25,22,'PERSPEKTIV',16,bold);
    const w=309*mm;
    page.drawImage(picture,{x:23*mm,y:top(150)-w*440/720/2,width:w,height:w*440/720});
    if(logo) page.drawImage(logo,{x:352*mm,y:top(48),width:41*mm,height:27*mm});
    else text(343,35,'FERRO',22,bold);
    rule(335,56,410,56);text(339,64,'MERKNADER',9,bold);
    text(339,74,'Ytre mål i mm. Koter i m.');
    text(339,81,'OK ferdig gulv = ±0,000.');
    text(339,88,'Grunnlag: kundens byggskisse.');
    text(339,95,'Mål kontrolleres på stedet.');
    rule(335,109,410,109);text(339,117,'TEGNFORKLARING',9,bold);
    rule(340,128,351,128);text(355,129,'Synlig kant');
    box(340,135,11,3,rgb(.84,.92,.97));text(355,138,'Glassfelt');
    box(335,165,75,16,ink);
    text(339,172,'IDÉSKISSE',12,bold,rgb(1,1,1));
    text(339,178,'Ikke for bygging',9,regular,rgb(1,1,1));
    field(181,'PROSJEKT',model.buildingUse+' · '+fmt.format(ferroMassing.enclosedArea(model))+' m²');
    field(200,'TEGNING','3D-perspektiv');
    field(219,'MÅLESTOKK','Ikke i målestokk');
    field(238,'TEGNET','Ferro');
    box(335.2,262,74.6,24.7,rgb(.90,.93,.96));
    rule(335,262,410,262);text(339,269,'TEGNINGSNR.',8,regular,muted);text(339,281,'F-90.01',23,bold);
  }
  function sheet(title) {
    const page=pdf.addPage([width,height]);
    if(logo) page.drawImage(logo,{x:margin,y:height-54,width:57,height:38});
    else page.drawText('FERRO',{x:margin,y:height-39,size:16,font:bold,color:ink});
    page.drawText(title,{x:margin+80,y:height-39,size:21,font:bold,color:ink});
    const dimensions=model.buildingUse+'   /   Hovedbygg '+[model.length,model.width,model.height].map(n=>fmt.format(n)).join(' × ')+' m';
    page.drawText(dimensions,{x:width-margin-regular.widthOfTextAtSize(dimensions,11),y:height-38,size:11,font:regular,color:muted});
    page.drawLine({start:{x:margin,y:height-66},end:{x:width-margin,y:height-66},thickness:.8,color:muted});
    return page;
  }
  const views=[
    {view:'volume',title:'Tegningsvisning',layer:'drawing'},
    ...[['open','Åpen modell'],['steel','Stålmodell']].map(([layer,title])=>({view:'volume',title,layer})),
    ...Object.entries(ferroRooms.titles).filter(([level])=>model.zones.some(z=>ferroRooms.levels(z,model).includes(level)))
      .map(([level,name])=>({view:'plan',title:'Plan · '+name,level})),
    ...Object.entries(ferroOpenings.walls).map(([elevationWall,name])=>({view:'facade',title:'Fasade · '+name,elevationWall}))
  ];
  const drawing=canvas(1800,1100);
  for(const descriptor of views) {
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 720 440');
    svg.setAttribute('width',drawing.width);svg.setAttribute('height',drawing.height);
    drawFerroSketch(svg,{...model,...descriptor,showAxes:true,section:'all'},descriptor.view,angle);
    const blob=new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    try {
      const image=new Image();image.src=url;await image.decode();
      drawing.getContext('2d').drawImage(image,0,0,drawing.width,drawing.height);
      const picture=await png(drawing);
      if(descriptor.layer==='drawing') {perspectiveSheet(picture);continue;}
      const page=sheet(descriptor.title);
      const w=width-2*margin,h=w*440/720;
      page.drawImage(picture,{x:margin,y:height-78-h,width:w,height:h});
    } finally {URL.revokeObjectURL(url);}
  }
  const attachmentNames=[];
  for(const file of files) {
    let name=file.name;
    for(let i=2;attachmentNames.includes(name);i++) name=i+'-'+file.name;
    await pdf.attach(await file.arrayBuffer(),name,{mimeType:file.type || 'application/octet-stream'});
    attachmentNames.push(name);
  }
  const lines=brief.split(/\r?\n/);
  if(files.length) lines.push('','Vedlagte originaltegninger',...attachmentNames);
  // The standard PDF font handles Norwegian. Rasterize only lines with unsupported characters.
  const size=12,leading=18,available=width-2*margin;
  const measure=canvas(1,1).getContext('2d');
  measure.font=size+'px Arial';
  function textWidth(text) {
    try {return regular.widthOfTextAtSize(text,size);}
    catch {return measure.measureText(text).width;}
  }
  let page=sheet('Prosjektopplysninger'),y=height-95;
  async function row(text) {
    if(y<55) {page=sheet('Prosjektopplysninger');y=height-95;}
    if(text) {
      try {regular.encodeText(text);page.drawText(text,{x:margin,y,size,font:regular,color:ink});}
      catch {
        const strip=canvas(Math.ceil(available*3),leading*3),ctx=strip.getContext('2d');
        ctx.scale(3,3);ctx.font=measure.font;ctx.fillStyle='#1c3452';ctx.fillText(text,0,size);
        page.drawImage(await png(strip),{x:margin,y:y+size-leading,width:available,height:leading});
      }
    }
    y-=leading;
  }
  for(const raw of lines) {
    let remaining=raw.replace(/[\u0000-\u001f]/g,' ');
    while(textWidth(remaining)>available) {
      let end=0,space=0;
      for(const ch of remaining) {
        if(textWidth(remaining.slice(0,end+ch.length))>available) break;
        end+=ch.length;
        if(ch===' ') space=end;
      }
      const cut=space || end || 1;
      await row(remaining.slice(0,cut).trimEnd());remaining=remaining.slice(cut).trimStart();
    }
    await row(remaining);
  }
  const pages=pdf.getPages();
  pages.forEach((page,i)=>{
    if(i===0) return; // The A3 perspective has its own drawing number in the title block.
    page.drawText('Idéskisse · Ikke i målestokk',{x:margin,y:21,size:10,font:regular,color:muted});
    const count=(i+1)+' / '+pages.length;
    page.drawText(count,{x:width-margin-regular.widthOfTextAtSize(count,10),y:21,size:10,font:regular,color:muted});
  });
  return new Blob([await pdf.save()],{type:'application/pdf'});
}

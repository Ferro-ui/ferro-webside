// Selected drawings are shared by the sketch and contact form for this page session.
const inquiryDrawings = (() => {
  const files=[];
  const pickers=[...document.querySelectorAll('[data-drawing-picker]')];
  const extensions=['pdf','dwg','dxf','ifc','png','jpg','jpeg','webp'];
  const limit=15*1024*1024;
  function refresh(message='') {
    document.querySelector('#draft').hidden=true;
    for(const picker of pickers) {
      const list=picker.querySelector('.drawing-list');
      list.replaceChildren();
      files.forEach((file,index)=>{
        const row=document.createElement('div');row.className='drawing-file';
        const label=document.createElement('span');label.textContent=file.name+' · '+Math.max(1,Math.ceil(file.size/1024))+' kB';
        const remove=document.createElement('button');remove.type='button';remove.textContent='Fjern';
        remove.setAttribute('aria-label','Fjern '+file.name);
        remove.onclick=()=>{files.splice(index,1);refresh();picker.querySelector('input').focus();};
        row.append(label,remove);list.append(row);
      });
      picker.querySelector('[role=status]').textContent=message;
    }
  }
  for(const picker of pickers) {
    picker.innerHTML='<label><strong>Legg ved tegninger</strong><input type="file" class="drawing-input" multiple></label><p class="drawing-help">PDF, DWG, DXF, IFC eller bilder (JPG, PNG, WebP). Inntil 15 MiB totalt. Filene følger med som vedlegg i skisse-PDF-en og e-postutkastet. Ved ny innlasting må de velges på nytt.</p><div class="drawing-list"></div><p role="status"></p>';
    const input=picker.querySelector('input');input.accept=extensions.map(ext=>'.'+ext).join(',');
    input.onchange=()=>{
      let size=files.reduce((n,file)=>n+file.size,0);
      const errors=[];
      for(const file of input.files) {
        if(!extensions.includes(file.name.split('.').pop().toLowerCase())) {errors.push(file.name+' har et filformat som ikke støttes.');continue;}
        if(files.some(other=>other.name===file.name && other.size===file.size && other.lastModified===file.lastModified)) continue;
        if(size+file.size>limit) {errors.push(file.name+' overstiger samlet filgrense.');continue;}
        files.push(file);size+=file.size;
      }
      input.value='';refresh(errors.join(' '));
    };
  }
  function base64(blob) {
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=()=>reject(reader.error);
      reader.onload=()=>resolve(reader.result.split(',')[1].replace(/.{1,76}/g,'$&\r\n'));
      reader.readAsDataURL(blob);
    });
  }
  async function email(body,recipient) {
    const attachments=files.slice();
    const boundary='ferro-'+Array.from(crypto.getRandomValues(new Uint32Array(4))).join('-');
    const lines=['X-Unsent: 1','To: '+recipient,'Subject: =?UTF-8?B?UHJvc2pla3Rmb3Jlc3DDuHJzZWwgdGlsIEZlcnJv?=','MIME-Version: 1.0',
      'Content-Type: multipart/mixed; boundary="'+boundary+'"','','--'+boundary,
      'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',
      await base64(new Blob([body.replace(/\r?\n/g,'\r\n')]))];
    for(const file of attachments) {
      const filename=file.name.replace(/[\x00-\x1f\x7f]/g,'_');
      const fallback=filename.replace(/[^A-Za-z0-9._ -]/g,'_');
      const encoded=encodeURIComponent(filename).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16));
      lines.push('--'+boundary,'Content-Type: application/octet-stream','Content-Transfer-Encoding: base64',
        'Content-Disposition: attachment;',
        filename===fallback?' filename="'+fallback+'"':" filename*=UTF-8''"+encoded,'',await base64(file));
    }
    lines.push('--'+boundary+'--','');
    return new Blob([lines.join('\r\n')],{type:'message/rfc822'});
  }
  return {selected:()=>files.slice(),names:()=>files.map(f=>f.name),email};
})();

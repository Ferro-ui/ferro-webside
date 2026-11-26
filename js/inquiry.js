const inquiry = document.querySelector('#inquiry');
const draft = document.querySelector('#draft');
const ferroEmail = () => window.ferroContact?.email || 'vegard@ferrostal.no';
document.querySelectorAll('[data-building]').forEach(link => {
  link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    inquiry.elements.byggtype.value = link.dataset.building;
    inquiry.elements.byggtype.dispatchEvent(new Event('change',{bubbles:true}));
    draft.hidden = true;
  });
});
inquiry.addEventListener('input', event => {
  if (event.target.name) event.target.setCustomValidity('');
  draft.hidden = true;
});
inquiry.addEventListener('submit', event => {
  event.preventDefault();
  for (const field of inquiry.querySelectorAll('[required]')) {
    if (!field.value.trim()) {
      field.setCustomValidity('Fyll ut dette feltet.');
      field.reportValidity();
      return;
    }
  }
  const fields = new FormData(inquiry);
  const contact = [fields.get('navn').trim(), fields.get('firma').trim(), fields.get('epost'), fields.get('telefon').trim()].filter(Boolean);
  const building = fields.get('byggtype');
  const sketch = document.querySelector('#included-sketch');
  const summary = sketch.hidden ? '' : sketch.querySelector('[data-sketch-summary]').textContent;
  const filenames=inquiryDrawings.names();
  const body = [summary, filenames.length && 'Vedlagte tegninger:\n'+filenames.join('\n'), building && 'Byggtype: ' + building, fields.get('sted').trim() && 'Byggested: ' + fields.get('sted').trim(), fields.get('melding').trim(), contact.join('\n')].filter(Boolean).join('\n\n');
  draft.querySelector('textarea').value = body;
  document.querySelector('#compose').href = 'mailto:' + ferroEmail() + '?subject=Prosjektforesp%C3%B8rsel&body=' + encodeURIComponent(body);
  document.querySelector('#compose').hidden=filenames.length>0;
  document.querySelector('#download-email').hidden=!filenames.length;
  draft.querySelector('[data-drawing-error]').textContent='';
  draft.querySelector('[data-draft-instructions]').textContent=filenames.length
    ? 'Last ned utkastet med tegningene, åpne det i e-postprogrammet og send til Ferro. Bruker du nettpost, kan du kopiere teksten og legge ved originalfilene i meldingen til ' + ferroEmail() + '.'
    : 'Åpne utkastet og send det. Du kan også kopiere teksten og sende den til ' + ferroEmail() + '.';
  draft.hidden = false;
  draft.querySelector('h3').focus();
});

document.querySelector('#download-email').onclick=async event=>{
  const button=event.currentTarget;
  button.disabled=true;
  try {
    const email=await inquiryDrawings.email(draft.querySelector('textarea').value,ferroEmail());
    if(draft.hidden) return;
    const url=URL.createObjectURL(email);
    const link=document.createElement('a');link.href=url;link.download='Ferro-foresporsel.eml';link.click();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
  } catch {
    draft.querySelector('[data-drawing-error]').textContent='En fil kunne ikke leses. Velg tegningen på nytt og lag et nytt utkast.';
  } finally {button.disabled=false;}
};

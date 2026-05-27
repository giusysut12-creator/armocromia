let currentImageBase64 = null;
let currentMimeType = null;
let currentResults = null;
let tooltipTimeout = null;
let confettiAnimFrame = null;

const $ = id => document.getElementById(id);

const dropZone        = $('drop-zone');
const fileInput       = $('file-input');
const dropContent     = $('drop-zone-content');
const dropPreview     = $('drop-zone-preview');
const previewImg      = $('preview-img');
const analyzeBtn      = $('analyze-btn');
const uploadSection   = $('upload-section');
const loaderSection   = $('loader-section');
const resultsSection  = $('results-section');
const resetBtn        = $('reset-btn');
const downloadBtn     = $('download-palette-btn');
const toastContainer  = $('toast-container');
const tooltip         = $('color-tooltip');
const tooltipSwatch   = $('tooltip-swatch');
const tooltipName     = $('tooltip-name');
const tooltipHex      = $('tooltip-hex');
const tooltipUso      = $('tooltip-uso');
const confettiCanvas  = $('confetti-canvas');
const changePhotoBtn  = $('change-photo-btn');
const apiModal        = $('api-modal');
const apiKeyInput     = $('api-key-input');
const saveApiKeyBtn   = $('save-api-key');
const toggleKeyVis    = $('toggle-key-visibility');
const openSettingsBtn = $('open-settings');
const toggleSeasonsBtn= $('toggle-seasons');
const seasonsPanel    = $('seasons-panel');
const resultBadge     = $('result-season-badge');
const resultUndertone = $('result-undertone');
const resultDesc      = $('result-description');
const resultCharacs   = $('result-characteristics');
const resultPalette   = $('result-palette');
const resultAvoid     = $('result-avoid');
const resultStyle     = $('result-style');
const resultCelebs    = $('result-celebrities');

function init() {
  if (!hasApiKey()) showApiModal();
  startUploadPulse();
  bindEvents();
}

function bindEvents() {
  dropZone.addEventListener('click', handleDropZoneClick);
  dropZone.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') handleDropZoneClick(); });
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', e => { if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('drag-over'); });
  dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('drag-over'); const f=e.dataTransfer?.files?.[0]; if(f) processFile(f); });
  fileInput.addEventListener('change', e => { const f=e.target.files?.[0]; if(f) processFile(f); e.target.value=''; });
  changePhotoBtn.addEventListener('click', e => { e.stopPropagation(); fileInput.click(); });
  analyzeBtn.addEventListener('click', handleAnalyze);
  resetBtn.addEventListener('click', handleReset);
  downloadBtn.addEventListener('click', handleDownloadPalette);
  saveApiKeyBtn.addEventListener('click', handleSaveApiKey);
  apiKeyInput.addEventListener('keydown', e => { if(e.key==='Enter') handleSaveApiKey(); });
  toggleKeyVis.addEventListener('click', () => { apiKeyInput.type = apiKeyInput.type==='password' ? 'text' : 'password'; });
  openSettingsBtn.addEventListener('click', showApiModal);
  toggleSeasonsBtn.addEventListener('click', () => {
    const open = toggleSeasonsBtn.getAttribute('aria-expanded')==='true';
    toggleSeasonsBtn.setAttribute('aria-expanded', String(!open));
    seasonsPanel.classList.toggle('hidden');
  });
  window.addEventListener('scroll', hideTooltip, { passive: true });
}

function showApiModal() { apiKeyInput.value=getStoredApiKey(); apiModal.classList.remove('hidden'); setTimeout(()=>apiKeyInput.focus(),100); }
function hideApiModal() { apiModal.classList.add('hidden'); }
function handleSaveApiKey() {
  const key = apiKeyInput.value.trim();
  if (!key||key.length<20) { showToast('Inserisci una API key valida (inizia con sk-ant-)','error'); return; }
  saveApiKey(key); hideApiModal(); showToast('API key salvata con successo','success');
}

function handleDropZoneClick() { if (!dropPreview.classList.contains('hidden')) return; fileInput.click(); }

const ALLOWED = ['image/jpeg','image/png','image/webp'];
const MAX_B   = 5*1024*1024;

function processFile(file) {
  if (!ALLOWED.includes(file.type)) { showToast('Formato non supportato. Usa JPG, PNG o WEBP.','error'); return; }
  if (file.size>MAX_B) { showToast('Foto troppo grande (max 5 MB).','error'); return; }
  stopUploadPulse();
  currentMimeType = file.type;
  const reader = new FileReader();
  reader.onload = e => {
    showPreview(e.target.result);
    compressImage(e.target.result, file.type, 1024*1024, b64 => { currentImageBase64=b64; });
  };
  reader.readAsDataURL(file);
}

function showPreview(dataUrl) {
  previewImg.src=dataUrl;
  dropContent.classList.add('hidden');
  dropPreview.classList.remove('hidden');
  analyzeBtn.disabled=false;
}

function compressImage(dataUrl, mime, maxB, cb) {
  const img=new Image();
  img.onload=()=>{
    let {width:w,height:h}=img;
    const approx=dataUrl.length*0.75;
    let q=0.85;
    if (approx>maxB) { const s=Math.sqrt(maxB/approx); w=Math.round(w*s); h=Math.round(h*s); q=0.80; }
    const c=document.createElement('canvas');
    c.width=Math.min(w,1600); c.height=Math.min(h,1600);
    c.getContext('2d').drawImage(img,0,0,c.width,c.height);
    cb(c.toDataURL(mime==='image/png'?'image/jpeg':mime,q).split(',')[1]);
  };
  img.src=dataUrl;
}

function startUploadPulse() { dropZone.classList.add('pulse'); }
function stopUploadPulse()  { dropZone.classList.remove('pulse'); }

async function handleAnalyze() {
  if (!currentImageBase64) { showToast('Carica prima una foto del tuo viso.','info'); return; }
  if (!hasApiKey()) { showApiModal(); return; }
  uploadSection.classList.add('hidden');
  loaderSection.classList.remove('hidden');
  resultsSection.classList.add('hidden');
  try {
    const res = await analyzeColorSeason(currentImageBase64, currentMimeType||'image/jpeg');
    currentResults=res;
    loaderSection.classList.add('hidden');
    renderResults(res);
    launchConfetti();
  } catch(err) {
    loaderSection.classList.add('hidden');
    uploadSection.classList.remove('hidden');
    if (err.message==='API_KEY_MISSING') showApiModal();
    else showToast(err.message||'Errore imprevisto. Riprova.','error');
  }
}

function renderResults(data) {
  resultBadge.textContent     = data.stagione||'—';
  resultUndertone.textContent = `Sottotono ${data.sottotono||''}`;
  resultDesc.textContent      = data.descrizione||'';
  resultCharacs.innerHTML=''; (data.caratteristiche||[]).forEach(c=>{ const t=document.createElement('span'); t.className='char-tag'; t.textContent=c; resultCharacs.appendChild(t); });
  resultPalette.innerHTML=''; (data.palette_consigliata||[]).slice(0,8).forEach(c=>resultPalette.appendChild(mkSwatch(c,'palette')));
  resultAvoid.innerHTML='';   (data.colori_da_evitare||[]).slice(0,4).forEach(c=>resultAvoid.appendChild(mkSwatch(c,'avoid')));
  resultStyle.textContent=data.consigli_stile||'';
  resultCelebs.innerHTML='';  (data.celebrity_riferimento||[]).forEach(n=>{ const ch=document.createElement('div'); ch.className='celebrity-chip'; ch.textContent=n; resultCelebs.appendChild(ch); });
  resultsSection.classList.remove('hidden');
  resultsSection.scrollIntoView({behavior:'smooth',block:'start'});
}

function mkSwatch(c, type) {
  const hex=c.hex||'#CCC', name=c.nome||'Colore', uso=type==='avoid'?(c.motivo||''):(c.uso||'');
  const card=document.createElement('div'); card.className='color-swatch-card';
  const sw=document.createElement('div'); sw.className='swatch-color'; sw.style.background=hex;
  const hint=document.createElement('div'); hint.className='swatch-copy-hint'; hint.textContent='Copia HEX'; sw.appendChild(hint);
  const info=document.createElement('div'); info.className='swatch-info';
  const nm=document.createElement('div'); nm.className='swatch-name'; nm.textContent=name;
  const hx=document.createElement('div'); hx.className='swatch-hex'; hx.textContent=hex.toUpperCase();
  info.appendChild(nm); info.appendChild(hx);
  card.appendChild(sw); card.appendChild(info);
  card.addEventListener('click',()=>copyHex(hex,name));
  card.addEventListener('mouseenter',e=>showTip(e,name,hex,uso));
  card.addEventListener('mousemove',moveTip);
  card.addEventListener('mouseleave',hideTooltip);
  return card;
}

function copyHex(text,label) {
  if (!navigator.clipboard) { showToast(`${label}: ${text}`,'info'); return; }
  navigator.clipboard.writeText(text).then(()=>showToast(`${text} copiato`,'success')).catch(()=>showToast(`${label}: ${text}`,'info'));
}

function showTip(e,name,hex,uso) { clearTimeout(tooltipTimeout); tooltipSwatch.style.background=hex; tooltipName.textContent=name; tooltipHex.textContent=hex.toUpperCase(); tooltipUso.textContent=uso||''; tooltip.classList.remove('hidden'); moveTip(e); }
function moveTip(e) { const r=tooltip.getBoundingClientRect(),tx=e.clientX+14,ty=e.clientY-20; tooltip.style.left=(tx+r.width>window.innerWidth?tx-r.width-28:tx)+'px'; tooltip.style.top=(ty+r.height>window.innerHeight?ty-r.height:ty)+'px'; }
function hideTooltip() { tooltipTimeout=setTimeout(()=>tooltip.classList.add('hidden'),80); }

function launchConfetti() {
  if (confettiAnimFrame) cancelAnimationFrame(confettiAnimFrame);
  const ctx=confettiCanvas.getContext('2d');
  confettiCanvas.width=window.innerWidth; confettiCanvas.height=window.innerHeight;
  const cols=['#00B4C4','#1B6B72','#C9A84C','#F0DFA0','#FDF6EC','#A8DDE2'];
  const ps=Array.from({length:80},()=>({x:Math.random()*confettiCanvas.width,y:-10-Math.random()*100,r:4+Math.random()*6,color:cols[Math.floor(Math.random()*cols.length)],angle:Math.random()*Math.PI*2,vx:(Math.random()-.5)*3,vy:2+Math.random()*3,va:(Math.random()-.5)*.2,rect:Math.random()>.5}));
  let f=0;
  function draw() {
    if(f>=120){ctx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);return;}
    ctx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);
    const op=Math.max(0,1-(f-80)/40);
    ps.forEach(p=>{ p.x+=p.vx;p.y+=p.vy;p.angle+=p.va;p.vy+=.06; ctx.save();ctx.globalAlpha=op;ctx.fillStyle=p.color;ctx.translate(p.x,p.y);ctx.rotate(p.angle); if(!p.rect){ctx.beginPath();ctx.arc(0,0,p.r,0,Math.PI*2);ctx.fill();}else ctx.fillRect(-p.r,-p.r/2,p.r*2,p.r); ctx.restore(); });
    f++; confettiAnimFrame=requestAnimationFrame(draw);
  }
  draw();
}

function handleDownloadPalette() {
  if (!currentResults) return;
  const cv=$('palette-canvas'),ctx=cv.getContext('2d');
  const W=900,H=540; cv.width=W; cv.height=H;
  ctx.fillStyle='#FDF6EC'; ctx.fillRect(0,0,W,H);
  const g=ctx.createLinearGradient(0,0,W,0); g.addColorStop(0,'#1B6B72'); g.addColorStop(1,'#00B4C4');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,90);
  ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.arc(W-50,45,60,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#FFF'; ctx.font='bold 26px Georgia,serif'; ctx.fillText('Harmonia',40,45);
  ctx.font='14px sans-serif'; ctx.fillStyle='rgba(255,255,255,0.8)'; ctx.fillText('La tua palette armocromica',40,68);
  ctx.fillStyle='#1B6B72'; ctx.font='bold 32px Georgia,serif'; ctx.fillText(currentResults.stagione||'',40,140);
  ctx.fillStyle='#8AAEB1'; ctx.font='14px sans-serif'; ctx.fillText(`Sottotono ${currentResults.sottotono||''}`,40,162);
  const pal=(currentResults.palette_consigliata||[]).slice(0,8);
  pal.forEach((c,i)=>{ const x=40+i*98,y=185; rrFill(ctx,x,y,88,72,8,c.hex||'#CCC'); rrFill(ctx,x,y+72,88,28,[0,0,8,8],'#FFF'); ctx.fillStyle='#1A2B2C';ctx.font='9px sans-serif';ctx.fillText((c.nome||'').slice(0,10),x+5,y+85); ctx.fillStyle='#8AAEB1';ctx.font='8px monospace';ctx.fillText((c.hex||'').toUpperCase(),x+5,y+95); });
  ctx.fillStyle='#1B6B72';ctx.font='bold 13px sans-serif';ctx.fillText('Colori da evitare',40,318);
  (currentResults.colori_da_evitare||[]).slice(0,4).forEach((c,i)=>{ const x=40+i*98,y=330; rrFill(ctx,x,y,88,56,8,c.hex||'#CCC'); ctx.fillStyle='#FFF';ctx.font='8px sans-serif';ctx.fillText((c.nome||'').slice(0,11),x+5,y+42); ctx.fillStyle='rgba(255,255,255,0.7)';ctx.font='7px monospace';ctx.fillText((c.hex||'').toUpperCase(),x+5,y+52); });
  ctx.fillStyle='rgba(139,174,177,0.5)';ctx.font='italic 11px sans-serif';ctx.fillText('Harmonia · harmonia-color-tool',W-260,H-14);
  ctx.font='10px sans-serif';ctx.fillText(new Date().toLocaleDateString('it-IT'),40,H-14);
  const a=document.createElement('a'); a.download=`harmonia_${(currentResults.stagione||'palette').replace(/\s+/g,'_').toLowerCase()}.png`; a.href=cv.toDataURL('image/png'); a.click();
  showToast('Palette scaricata!','success');
}

function rrFill(ctx,x,y,w,h,r,color) {
  const ra=Array.isArray(r)?r:[r,r,r,r];
  const [tl,tr,br,bl]=ra;
  ctx.fillStyle=color;
  ctx.beginPath();
  ctx.moveTo(x+tl,y); ctx.lineTo(x+w-tr,y); ctx.quadraticCurveTo(x+w,y,x+w,y+tr);
  ctx.lineTo(x+w,y+h-br); ctx.quadraticCurveTo(x+w,y+h,x+w-br,y+h);
  ctx.lineTo(x+bl,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-bl);
  ctx.lineTo(x,y+tl); ctx.quadraticCurveTo(x,y,x+tl,y);
  ctx.closePath(); ctx.fill();
}

function handleReset() {
  currentImageBase64=null; currentMimeType=null; currentResults=null;
  previewImg.src=''; dropContent.classList.remove('hidden'); dropPreview.classList.add('hidden');
  analyzeBtn.disabled=true;
  resultsSection.classList.add('hidden'); loaderSection.classList.add('hidden'); uploadSection.classList.remove('hidden');
  startUploadPulse();
  uploadSection.scrollIntoView({behavior:'smooth',block:'start'});
}

function showToast(msg,type='info',dur=4000) {
  const icons={error:'✕',success:'✓',info:'ℹ'};
  const t=document.createElement('div'); t.className=`toast ${type}`;
  t.innerHTML=`<span style="font-size:1rem">${icons[type]}</span> ${esc(msg)}`;
  toastContainer.appendChild(t);
  setTimeout(()=>{ t.classList.add('fade-out'); t.addEventListener('animationend',()=>t.remove(),{once:true}); },dur);
}
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

document.addEventListener('DOMContentLoaded', init);

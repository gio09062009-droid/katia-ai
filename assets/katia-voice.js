/* Katia AI · Voz neuronal Daniela (Piper TTS)
   Modelo alojado en Hugging Face; motor WASM servido por el demo público de Piper.
   La voz nativa del navegador se conserva como respaldo.
   Optimizaciones conservadoras: síntesis por fragmentos, cancelación de reproducción
   y protección contra tareas antiguas. La descarga inicial del modelo sigue siendo grande.
*/
(()=>{"use strict";
 const MODEL="https://huggingface.co/rhasspy/piper-voices/resolve/375a0fe/es/es_AR/daniela/high/es_AR-daniela-high.onnx";
 const CONFIG="https://huggingface.co/rhasspy/piper-voices/resolve/375a0fe/es/es_AR/daniela/high/es_AR-daniela-high.onnx.json";
 const PIPER_ORIGIN="https://piper-tts.github.io/";
 const STORAGE_KEY="katia_voice_daniela_enabled_v1";
 const CHUNK_LIMIT=360;
 let engine=null,enginePromise=null,currentAudio=null,currentUrl=null,currentAudioDone=null;
 let enabled=localStorage.getItem(STORAGE_KEY)==="1",speechTask=0;
 const nativeSpeak=window.hablar;
 function setStatus(message){const el=document.getElementById("katiaDanielaStatus");if(el)el.textContent=message;}
 function setButton(){const b=document.getElementById("katiaDanielaToggle");if(b)b.textContent=enabled?"🔊 Daniela activada · Desactivar":"🎀 Activar voz Daniela (114 MB)";}
 function clearAudio(){
  if(currentUrl){URL.revokeObjectURL(currentUrl);currentUrl=null;}
  currentAudio=null;currentAudioDone=null;
 }
 function stop(){
  speechTask++;
  const audio=currentAudio,done=currentAudioDone;
  currentAudioDone=null;
  if(done){done();}else if(audio){try{audio.pause();}catch(e){}}
  clearAudio();
  if(window.speechSynthesis)speechSynthesis.cancel();
 }
 function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=src;s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error("No se pudo cargar el motor Piper: "+src));document.head.appendChild(s);});}
 async function ensureEngine(){
  if(engine)return engine;
  if(enginePromise)return enginePromise;
  enginePromise=(async()=>{
   let base=document.querySelector("base[data-katia-piper]");
   if(!base){base=document.createElement("base");base.href=PIPER_ORIGIN;base.dataset.katiaPiper="1";document.head.prepend(base);}
   try{
    setStatus("⏳ Cargando los componentes de voz...");
    if(!window.ort)await loadScript(PIPER_ORIGIN+"vendor/ort/ort.wasm.min.js");
    if(!window.createPiperPhonemize)await loadScript(PIPER_ORIGIN+"vendor/phonemize/piper_phonemize.js");
    if(!window.Piper)await loadScript(PIPER_ORIGIN+"piper-browser.js");
    setStatus("⏳ Descargando el modelo Daniela (aprox. 114 MB). Puede tardar y consumir datos...");
    engine=await Piper.createEngine(MODEL,CONFIG);
    setStatus("🧠 Preparando el motor de voz...");
    await Piper.getPhonemizer();
    setStatus("✅ Daniela está preparada en esta sesión.");
    return engine;
   }finally{if(base&&base.dataset.katiaPiper==="1")base.remove();}
  })().catch(error=>{enginePromise=null;engine=null;throw error;});
  return enginePromise;
 }
 function splitText(text){
  const normalized=String(text||"").replace(/https?:\/\/\S+/g," ").replace(/\s+/g," ").trim();
  if(!normalized)return [];
  const sentences=normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[normalized];
  const chunks=[];let current="";
  for(const sentence of sentences){
   let part=sentence.trim();
   while(part.length>CHUNK_LIMIT){
    let cut=part.lastIndexOf(" ",CHUNK_LIMIT);
    if(cut<Math.floor(CHUNK_LIMIT*.55))cut=CHUNK_LIMIT;
    const piece=part.slice(0,cut).trim();if(piece)chunks.push(piece);
    part=part.slice(cut).trim();
   }
   if(!part)continue;
   if(current&&(current.length+1+part.length)>CHUNK_LIMIT){chunks.push(current);current=part;}
   else current=current?current+" "+part:part;
  }
  if(current)chunks.push(current);
  return chunks;
 }
 function playBlob(blob,task){
  return new Promise((resolve,reject)=>{
   if(task!==speechTask||!enabled){resolve(false);return;}
   const url=URL.createObjectURL(blob),audio=new Audio(url);
   currentUrl=url;currentAudio=audio;
   let settled=false;
   const finish=(ok,error)=>{
    if(settled)return;settled=true;
    audio.onended=audio.onerror=audio.onpause=null;
    if(currentAudio===audio){currentAudio=null;currentUrl=null;currentAudioDone=null;}
    URL.revokeObjectURL(url);
    if(error)reject(error);else resolve(ok);
   };
   currentAudioDone=()=>finish(false);
   audio.onended=()=>finish(true);
   audio.onerror=()=>finish(false,new Error("No se pudo reproducir el audio Daniela."));
   audio.play().catch(error=>finish(false,error));
  });
 }
 async function speakDaniela(text){
  if(!enabled||!String(text||"").trim())return false;
  const task=++speechTask;
  try{
   const chunks=splitText(text);
   if(!chunks.length)return false;
   if(typeof window.estadoOrb==="function")estadoOrb("thinking","🎀 Preparando la voz de Katia...");
   const e=await ensureEngine();
   if(task!==speechTask||!enabled)return null;
   for(let i=0;i<chunks.length;i++){
    setStatus(chunks.length>1?"🎙️ Generando audio "+(i+1)+" de "+chunks.length+"...":"🎙️ Generando voz...");
    const pcm=await e.speak(chunks[i],{lengthScale:e.cfg?.inference?.length_scale||1});
    if(task!==speechTask||!enabled)return null;
    const blob=Piper.toWav(pcm,e.sampleRate);
    if(typeof window.estadoOrb==="function")estadoOrb("speaking","🔊 Katia está hablando...");
    const played=await playBlob(blob,task);
    if(task!==speechTask||!enabled)return null;
    if(!played)throw new Error("La reproducción se interrumpió.");
   }
   setStatus("✅ Daniela terminó de hablar.");
   if(typeof window.estadoOrb==="function")estadoOrb("","🟢 En línea · Lista para hablar");
   return true;
  }catch(error){
   if(task!==speechTask||!enabled)return null;
   console.warn("Katia Daniela TTS:",error);
   setStatus("⚠️ Daniela no pudo cargarse o reproducirse. Se usará la voz del navegador.");
   if(typeof window.estadoOrb==="function")estadoOrb("","🟢 En línea");
   return false;
  }
 }
 function enable(){
  if(enabled){enabled=false;localStorage.removeItem(STORAGE_KEY);stop();setStatus("Voz del navegador activada. Si Piper ya estaba descargando, esa descarga puede terminar en segundo plano.");setButton();return;}
  enabled=true;localStorage.setItem(STORAGE_KEY,"1");setButton();
  setStatus("Preparando Daniela. La primera carga necesita aproximadamente 114 MB; no cierres esta página.");
  ensureEngine().catch(error=>{console.warn("Katia Daniela init:",error);enabled=false;localStorage.removeItem(STORAGE_KEY);setButton();setStatus("⚠️ No se pudo preparar Daniela. Sigue disponible la voz del navegador.");});
 }
 function injectUi(){
  const container=document.getElementById("voiceSelectContainer");
  if(!container||document.getElementById("katiaDanielaBox"))return;
  const box=document.createElement("div");box.id="katiaDanielaBox";
  box.style.cssText="margin-top:12px;padding:12px;border:1px solid #d9b9ff;border-radius:12px;background:#a855f70b";
  const p=document.createElement("p");p.className="provider-info";p.textContent="Voz neuronal argentina Daniela · Piper TTS. El modelo pesa aproximadamente 114 MB. Se descarga al activarla y la síntesis se procesa en fragmentos para reducir los picos de memoria.";
  const b=document.createElement("button");b.id="katiaDanielaToggle";b.type="button";b.className="action";b.style.cssText="width:100%;padding:12px;border:0;border-radius:10px;color:white;background:linear-gradient(135deg,#9333ea,#6b21a8);margin-top:8px";b.addEventListener("click",enable);
  const status=document.createElement("p");status.id="katiaDanielaStatus";status.className="provider-info";status.setAttribute("role","status");status.style.marginTop="9px";
  box.append(p,b,status);container.appendChild(box);setButton();
  if(enabled)setStatus("Daniela está seleccionada. Se preparará cuando Katia hable.");
 }
 if(typeof nativeSpeak==="function"){
  window.hablar=function(texto){
   if(enabled){speakDaniela(texto).then(ok=>{if(ok===false)nativeSpeak(texto);});return;}
   return nativeSpeak(texto);
  };
 }
 const originalShow=window.mostrarSelectorVoces;
 if(typeof originalShow==="function")window.mostrarSelectorVoces=function(){originalShow();injectUi();};
 document.addEventListener("DOMContentLoaded",injectUi,{once:true});
 window.katiaDanielaVoice={enable,stop,refreshUI:injectUi,isEnabled:()=>enabled};
})();
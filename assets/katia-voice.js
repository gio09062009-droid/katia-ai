/* Katia AI · Voz neuronal Daniela (Piper TTS)
   Modelo alojado en Hugging Face; motor WASM servido por el demo público de Piper.
   La voz nativa del navegador se conserva como respaldo.
*/
(()=>{"use strict";
 const MODEL="https://huggingface.co/rhasspy/piper-voices/resolve/375a0fe/es/es_AR/daniela/high/es_AR-daniela-high.onnx";
 const CONFIG="https://huggingface.co/rhasspy/piper-voices/resolve/375a0fe/es/es_AR/daniela/high/es_AR-daniela-high.onnx.json";
 const PIPER_ORIGIN="https://piper-tts.github.io/";
 const STORAGE_KEY="katia_voice_daniela_enabled_v1";
 let engine=null,enginePromise=null,currentAudio=null,currentUrl=null;
 let enabled=localStorage.getItem(STORAGE_KEY)==="1";
 const nativeSpeak=window.hablar;
 function setStatus(message){const el=document.getElementById("katiaDanielaStatus");if(el)el.textContent=message;}
 function setButton(){const b=document.getElementById("katiaDanielaToggle");if(b)b.textContent=enabled?"🔊 Daniela activada · Desactivar":"🎀 Activar voz Daniela (114 MB)";}
 function stop(){if(currentAudio){currentAudio.pause();currentAudio=null;}if(currentUrl){URL.revokeObjectURL(currentUrl);currentUrl=null;}if(window.speechSynthesis)speechSynthesis.cancel();}
 function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=src;s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error("No se pudo cargar el motor Piper: "+src));document.head.appendChild(s);});}
 async function ensureEngine(){
  if(engine)return engine;
  if(enginePromise)return enginePromise;
  enginePromise=(async()=>{
   let base=document.querySelector("base[data-katia-piper]");
   if(!base){base=document.createElement("base");base.href=PIPER_ORIGIN;base.dataset.katiaPiper="1";document.head.prepend(base);}
   try{
    if(!window.ort)await loadScript(PIPER_ORIGIN+"vendor/ort/ort.wasm.min.js");
    if(!window.createPiperPhonemize)await loadScript(PIPER_ORIGIN+"vendor/phonemize/piper_phonemize.js");
    if(!window.Piper)await loadScript(PIPER_ORIGIN+"piper-browser.js");
    setStatus("⏳ Descargando el modelo Daniela (114 MB). La primera carga puede tardar...");
    engine=await Piper.createEngine(MODEL,CONFIG);
    setStatus("🧠 Preparando el motor de voz...");
    await Piper.getPhonemizer();
    setStatus("✅ Voz Daniela lista en este dispositivo.");
    return engine;
   }finally{if(base&&base.dataset.katiaPiper==="1")base.remove();}
  })().catch(error=>{enginePromise=null;throw error;});
  return enginePromise;
 }
 async function speakDaniela(text){
  if(!enabled||!String(text||"").trim())return false;
  try{
   stop();
   if(typeof window.estadoOrb==="function")estadoOrb("thinking","🎀 Preparando la voz de Katia...");
   const e=await ensureEngine();
   const clean=String(text).replace(/https?:\/\/\S+/g,"").trim().slice(0,4500);
   const pcm=await e.speak(clean,{lengthScale:e.cfg?.inference?.length_scale||1});
   const blob=Piper.toWav(pcm,e.sampleRate);
   currentUrl=URL.createObjectURL(blob);
   currentAudio=new Audio(currentUrl);
   currentAudio.onended=()=>{if(currentUrl){URL.revokeObjectURL(currentUrl);currentUrl=null;}currentAudio=null;if(typeof window.estadoOrb==="function")estadoOrb("","🟢 En línea · Lista para hablar");};
   currentAudio.onerror=()=>{setStatus("⚠️ No se pudo reproducir Daniela. Se usará la voz del navegador.");};
   if(typeof window.estadoOrb==="function")estadoOrb("speaking","🔊 Katia está hablando...");
   await currentAudio.play();
   return true;
  }catch(error){
   console.warn("Katia Daniela TTS:",error);
   setStatus("⚠️ Daniela no pudo cargarse o reproducirse. Se mantiene la voz del navegador.");
   if(typeof window.estadoOrb==="function")estadoOrb("","🟢 En línea");
   return false;
  }
 }
 function enable(){
  if(enabled){enabled=false;localStorage.removeItem(STORAGE_KEY);stop();setStatus("Voz del navegador activada.");setButton();return;}
  enabled=true;localStorage.setItem(STORAGE_KEY,"1");setButton();
  setStatus("Preparando Daniela. Se descargará el modelo de voz de 114 MB una sola vez si el navegador lo conserva en caché.");
  ensureEngine().catch(()=>{enabled=false;localStorage.removeItem(STORAGE_KEY);setButton();});
 }
 function injectUi(){
  const container=document.getElementById("voiceSelectContainer");
  if(!container||document.getElementById("katiaDanielaBox"))return;
  const box=document.createElement("div");box.id="katiaDanielaBox";
  box.style.cssText="margin-top:12px;padding:12px;border:1px solid #d9b9ff;border-radius:12px;background:#a855f70b";
  const p=document.createElement("p");p.className="provider-info";p.textContent="Voz neuronal argentina Daniela · Piper TTS. El modelo pesa 114 MB y se descarga solo cuando la activás. El audio se genera en tu navegador.";
  const b=document.createElement("button");b.id="katiaDanielaToggle";b.type="button";b.className="action";b.style.cssText="width:100%;padding:12px;border:0;border-radius:10px;color:white;background:linear-gradient(135deg,#9333ea,#6b21a8);margin-top:8px";b.addEventListener("click",enable);
  const status=document.createElement("p");status.id="katiaDanielaStatus";status.className="provider-info";status.setAttribute("role","status");status.style.marginTop="9px";
  box.append(p,b,status);container.appendChild(box);setButton();
  if(enabled)setStatus("Daniela está seleccionada. Se preparará cuando Katia hable.");
 }
 if(typeof nativeSpeak==="function"){
  window.hablar=function(texto){
   if(enabled){speakDaniela(texto).then(ok=>{if(!ok)nativeSpeak(texto);});return;}
   return nativeSpeak(texto);
  };
 }
 const originalShow=window.mostrarSelectorVoces;
 if(typeof originalShow==="function")window.mostrarSelectorVoces=function(){originalShow();injectUi();};
 document.addEventListener("DOMContentLoaded",injectUi,{once:true});
 window.katiaDanielaVoice={enable,stop,isEnabled:()=>enabled};
})();
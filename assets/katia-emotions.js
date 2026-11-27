/* Katia: selector estable de expresiones con carga única y respaldo */
(()=>{
 const sprite='/katia-ai/assets/katia-emotions.webp?v=6';
 const avatar='/katia-ai/assets/katia-avatar.webp?v=6';
 const posiciones={feliz:[0,0],sonrojada:[1,0],enojada:[2,0],triste:[3,0],sorprendida:[0,1],juguetona:[1,1],pensando:[2,1],cansada:[3,1]};
 const patrones={
  cansada:/(cansad[oa]s?|agotad[oa]s?|tengo\s+sueño|mucho\s+sueño|quiero\s+dormir|me\s+voy\s+a\s+dormir|a\s+dormir|descans(ar|á|o)|sin\s+energía)/i,
  enojada:/(enojad[oa]|molest[oa]|furios[oa]|qué\s+pesad[oa]|que\s+pesad[oa]|idiota|tont[oa]|inútil|estúpid[oa]|callate|cállate|me\s+da\s+rabia|me\s+enfada)/i,
  triste:/(triste|llor(ar|ando|é)|extrañ(o|a|ar)|me\s+siento\s+mal|estoy\s+mal|decepcionad[oa]|qué\s+pena|que\s+pena|me\s+entristece|no\s+estoy\s+bien)/i,
  sonrojada:/(qué\s+lind[oa]|que\s+lind[oa]|lind[oa]|bonit[oa]|hermos[oa]|guap[oa]|me\s+gustas|te\s+quiero|te\s+adoro|me\s+encantás|me\s+encantas|sonroj|atrevid[oa]|vergüenza)/i,
  sorprendida:/(en\s+serio|no\s+puede\s+ser|increíble|increible|sorprend|wow|no\s+lo\s+esperaba|¿de\s+verdad|de\s+verdad|no\s+me\s+lo\s+creo)/i,
  juguetona:/(jaja+|jeje+|🤣|😂|😏|😉|broma|bromita|travies[oa]|chiste|te\s+estoy\s+cargando|era\s+chiste|picardía)/i,
  pensando:/(pensá|pensar|analiz|reflexion|explicame|explicá|cómo\s+funciona|por\s+qué|porque|déjame\s+pensar|dejame\s+pensar|vamos\s+a\s+ver|veamos|\?)/i
 };
 let spritePromise=null;
 let ultimaEmocion='feliz';
 function obtenerSprite(){
  if(!spritePromise){
   spritePromise=new Promise(resolve=>{
    const probe=new Image();
    probe.onload=()=>resolve(probe.naturalWidth>=4&&probe.naturalHeight>=2);
    probe.onerror=()=>resolve(false);
    probe.src=sprite;
   });
  }
  return spritePromise;
 }
 async function cambiar(emocion){
  const wrap=document.querySelector('.katia-avatar-wrap');
  if(!wrap)return false;
  const e=posiciones[emocion]?emocion:'feliz';
  ultimaEmocion=e;
  const [col,fila]=posiciones[e];
  const img=wrap.querySelector('#katiaAvatar')||wrap.querySelector('.katia-avatar');
  wrap.dataset.emotion=e;
  wrap.setAttribute('aria-label','Katia: '+e);
  if(img){
   img.alt='Katia, expresión '+e;
   img.style.setProperty('display','block','important');
   if(!img.dataset.katiaMainLoaded){
    img.onload=()=>{img.dataset.katiaMainLoaded='1';};
    img.onerror=()=>{console.warn('Katia: no se pudo cargar el avatar principal.');};
    img.src=avatar;
   }
  }
  const disponible=await obtenerSprite();
  if(ultimaEmocion!==e)return true;
  if(disponible){
   wrap.style.backgroundImage='url("'+sprite+'")';
   wrap.style.backgroundRepeat='no-repeat';
   wrap.style.backgroundSize='400% 200%';
   wrap.style.backgroundPosition=(col*100/3)+'% '+(fila*100)+'%';
   if(img)img.style.setProperty('display','none','important');
  }else{
   wrap.style.backgroundImage='none';
   if(img)img.style.setProperty('display','block','important');
   console.warn('Katia: sprite no disponible; se mantiene el avatar principal.');
  }
  return true;
 }
 window.cambiarExpresionKatia=cambiar;
 window.detectarEmocionKatia=(texto,tipo)=>{
  if(tipo!=='user')return null;
  const t=String(texto??'').replace(/\s+/g,' ').trim();
  if(!t)return null;
  for(const e of ['cansada','enojada','triste','sonrojada','sorprendida','juguetona','pensando'])if(patrones[e].test(t))return e;
  return null;
 };
 const init=()=>cambiar('feliz');
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();

/* Carga de la presentación cinematográfica de Katia */
(()=>{
 const script=document.createElement('script');
 script.src='/katia-ai/assets/katia-intro.js?v=1';
 script.async=true;
 document.head.appendChild(script);
})();
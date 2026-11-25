/* Katia: ocho expresiones mediante el fondo del sprite 4x2 */
(()=>{
 const sprite='assets/katia-emotions.webp?v=4';
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
 function cambiar(emocion){
  const wrap=document.querySelector('.katia-avatar-wrap');
  if(!wrap)return false;
  const e=posiciones[emocion]?emocion:'feliz';
  const [col,fila]=posiciones[e];
  wrap.style.backgroundImage='url("'+sprite+'")';
  wrap.style.backgroundRepeat='no-repeat';
  wrap.style.backgroundSize='400% 200%';
  wrap.style.backgroundPosition=(col*100/3)+'% '+(fila*100)+'%';
  wrap.style.backgroundColor='transparent';
  wrap.style.overflow='hidden';
  const img=wrap.querySelector('#katiaAvatar')||wrap.querySelector('.katia-avatar');
  if(img){img.style.display='none';img.alt='Katia, expresión '+e;}
  wrap.dataset.emotion=e;
  wrap.setAttribute('aria-label','Katia: '+e);
  return true;
 }
 window.cambiarExpresionKatia=cambiar;
 window.detectarEmocionKatia=(texto,tipo)=>{
  const t=String(texto??'').replace(/\s+/g,' ').trim();
  if(!t)return null;
  for(const e of ['cansada','enojada','triste','sonrojada','sorprendida','juguetona','pensando'])if(patrones[e].test(t))return e;
  return tipo==='katia'?'feliz':null;
 };
 const init=()=>cambiar('feliz');
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
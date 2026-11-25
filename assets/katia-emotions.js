/* Katia: ocho expresiones usando recorte directo del sprite */
(()=>{
 const sprite="assets/katia-emotions.webp?v=3";
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
  const wrap=document.querySelector(".katia-avatar-wrap");
  if(!wrap)return false;
  const e=posiciones[emocion]?emocion:"feliz";
  const [col,fila]=posiciones[e];
  const img=wrap.querySelector("#katiaAvatar")||wrap.querySelector(".katia-avatar");
  if(!img)return false;
  wrap.style.position="relative";
  wrap.style.overflow="hidden";
  wrap.style.backgroundImage="none";
  img.src=sprite;
  img.alt="Katia, expresión "+e;
  img.style.cssText=[
   "position:absolute","left:0","top:0","display:block",
   "width:400%","height:200%","max-width:none","max-height:none",
   "object-fit:fill","object-position:left top","border:0","border-radius:0",
   "box-shadow:none","margin:0","padding:0",
   "transform:translate("+(-col*25)+"%,"+(-fila*50)+"%)",
   "transition:transform .18s ease"
  ].join(";");
  wrap.dataset.emotion=e;
  wrap.setAttribute("aria-label","Katia: "+e);
  return true;
 }
 window.cambiarExpresionKatia=cambiar;
 window.detectarEmocionKatia=(texto,tipo)=>{
  const t=String(texto??"").replace(/\s+/g," ").trim();
  if(!t)return null;
  for(const e of ["cansada","enojada","triste","sonrojada","sorprendida","juguetona","pensando"])if(patrones[e].test(t))return e;
  return tipo==="katia"?"feliz":null;
 };
 const init=()=>cambiar("feliz");
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();
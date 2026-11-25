/* Motor emocional de Katia: usa la hoja de ocho retratos */
(()=>{
 const posiciones={
  feliz:"0% 0%", sonrojada:"33.333% 0%", enojada:"66.667% 0%", triste:"100% 0%",
  sorprendida:"0% 100%", juguetona:"33.333% 100%", pensando:"66.667% 100%", cansada:"100% 100%"
 };
 window.cambiarExpresionKatia=(emocion)=>{
  const wrap=document.querySelector(".katia-avatar-wrap");
  if(!wrap)return;
  const e=posiciones[emocion]?emocion:"feliz";
  wrap.style.backgroundPosition=posiciones[e];
  wrap.dataset.emotion=e;
 };
 window.detectarEmocionKatia=(texto,tipo)=>{
  const t=String(texto||"").toLocaleLowerCase("es");
  if(/\b(cansad[oa]|tengo sueño|me voy a dormir|a dormir|descans(ar|á)|agotad[oa])\b/.test(t))return "cansada";
  if(/\b(qué pesada|que pesada|enojad[oa]|molest[oa]|furios[oa]|idiota|tonta|inútil|estúpida|callate|cállate|qué tonta|que tonta)\b/.test(t))return "enojada";
  if(/\b(triste|llor(ar|ando)|extrañ(o|ar)|me siento mal|decepcionad[oa]|estoy mal|qué pena|que pena)\b/.test(t))return "triste";
  if(/\b(qué linda|que linda|bonita|hermosa|linda|guapa|me gustas|te quiero|sonroj|atrevid[oa]|vergüenza)\b/.test(t))return "sonrojada";
  if(/\b(en serio|no puede ser|increíble|increible|sorprend|wow|no lo esperaba|me sorprende)\b/.test(t))return "sorprendida";
  if(/\b(jaja+|jeje+|😂|😏|broma|bromita|travies[oa]|chiste)\b/.test(t))return "juguetona";
  if(tipo==="user" && (/[?¿]/.test(t)||/\b(pensá|pensar|explicame|cómo funciona|por qué|porque)\b/.test(t)))return "pensando";
  if(tipo==="katia" && /\b(analicemos|vamos a pensar|veamos|déjame pensar|dejame pensar)\b/.test(t))return "pensando";
  return tipo==="user"?"feliz":null;
 };
 window.cambiarExpresionKatia("feliz");
})();
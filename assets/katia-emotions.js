/* Katia AI — motor inicial de expresiones */
(()=>{
 const posiciones={
  feliz:"0% 0%", sonrojada:"33.333% 0%", enojada:"66.667% 0%", triste:"100% 0%",
  sorprendida:"0% 100%", juguetona:"33.333% 100%", pensando:"66.667% 100%", cansada:"100% 100%"
 };
 const avatar=()=>document.querySelector(".katia-avatar-wrap");
 window.cambiarExpresionKatia=(emocion)=>{
  const wrap=avatar(); if(!wrap)return;
  const estado=posiciones[emocion]?emocion:"feliz";
  wrap.style.backgroundPosition=posiciones[estado];
  wrap.dataset.emotion=estado;
  const img=document.getElementById("katiaAvatar");
  if(img)img.alt="Katia, expresión "+estado;
 };
 function detectarEmocion(texto,esRespuesta=false){
  const t=String(texto||"").toLocaleLowerCase("es");
  if(/\b(cansad[oa]|tengo sueño|a dormir|descans(ar|á)|agotad[oa])\b/.test(t))return "cansada";
  if(/\b(enojad[oa]|molest[oa]|furios[oa]|idiota|tonta|inútil|estúpida|callate|cállate)\b/.test(t))return "enojada";
  if(/\b(triste|llor(ar|ando)|extrañ(o|ar)|me siento mal|decepcionad[oa])\b/.test(t))return "triste";
  if(/\b(atrevid[oa]|linda|bonita|hermosa|sonroj|qué vergüenza|que vergüenza)\b/.test(t))return "sonrojada";
  if(/\b(¿qué\?|en serio|no puede ser|increíble|sorprend|wow|¿cómo\?)\b/.test(t))return "sorprendida";
  if(/\b(jaja+|jeje+|😂|😏|broma|bromita|travies[oa])\b/.test(t))return "juguetona";
  if(!esRespuesta&&(/[?¿]/.test(t)||/\b(pensá|pensar|explicame|cómo funciona)\b/.test(t)))return "pensando";
  if(esRespuesta&&/\b(creo que|vamos a analizar|veamos|primero|depende)\b/.test(t))return "pensando";
  return "feliz";
 }
 const agregar=window.agregarMensaje;
 if(typeof agregar==="function"){
  window.agregarMensaje=function(tipo,texto,...args){
   window.cambiarExpresionKatia(detectarEmocion(texto,tipo==="katia"));
   return agregar.call(this,tipo,texto,...args);
  };
 }
 const estado=window.estadoOrb;
 if(typeof estado==="function"){
  window.estadoOrb=function(nombre,texto){
   if(nombre==="thinking")window.cambiarExpresionKatia("pensando");
   else if(nombre==="speaking")window.cambiarExpresionKatia("feliz");
   return estado.call(this,nombre,texto);
  };
 }
 document.addEventListener("DOMContentLoaded",()=>window.cambiarExpresionKatia("feliz"));
})();

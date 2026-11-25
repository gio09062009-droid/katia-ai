(function(){
"use strict";
const KEY="katia_chat_sessions_v1", PREF="katia_preferences_v1";
const defaults={theme:"light",color:"lavender",fontSize:14,tone:"cercano",detail:"adaptativo",language:"es",suggestions:true};
const palettes={lavender:["#9b5de5","#7e22ce"],blue:["#3b82f6","#1d4ed8"],mint:["#10b981","#047857"],rose:["#ec4899","#be185d"],amber:["#d97706","#92400e"]};
let prefs={...defaults,...read(PREF,{})}, sessions=read(KEY,[]), activeId=null, originalAdd=null;
function read(k,f){try{const x=JSON.parse(localStorage.getItem(k)||"null");return x??f}catch(e){return f}}
function write(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){console.warn("Katia: no se pudo guardar",e)}}
function id(){return "chat_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,7)}
function currentMessages(){return Array.isArray(historial)?historial:[]}
function titleFor(messages){const first=messages.find(x=>x&&x.role==="user"&&x.content);return first?String(first.content).slice(0,48):"Nueva conversación"}
function saveCurrent(){
 const msgs=currentMessages();if(!msgs.length)return;
 let item=sessions.find(x=>x.id===activeId);
 if(!item){item={id:activeId||id(),title:titleFor(msgs),messages:[],updatedAt:new Date().toISOString()};activeId=item.id;sessions.unshift(item)}
 item.messages=msgs.slice(-80);item.title=titleFor(msgs);item.updatedAt=new Date().toISOString();
 sessions=sessions.filter(x=>x&&Array.isArray(x.messages)).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt)).slice(0,60);
 write(KEY,sessions);renderHistory();
}
function renderHistory(filter=""){
 const root=document.getElementById("katiaHistoryList");if(!root)return;root.replaceChildren();
 const filtered=sessions.filter(x=>(x.title||"").toLowerCase().includes(filter.toLowerCase()));
 if(!filtered.length){const p=document.createElement("p");p.className="small-note";p.textContent="Todavía no hay conversaciones guardadas.";root.append(p);return}
 filtered.forEach(item=>{
  const row=document.createElement("div");row.className="katia-history-item";
  const b=document.createElement("button");b.textContent=item.title||"Conversación";b.classList.toggle("active",item.id===activeId);b.title=item.title||"Conversación";b.onclick=()=>loadChat(item.id);
  const del=document.createElement("button");del.className="katia-history-delete";del.textContent="×";del.title="Eliminar conversación";del.onclick=()=>{if(!confirm("¿Eliminar esta conversación?"))return;sessions=sessions.filter(x=>x.id!==item.id);write(KEY,sessions);if(activeId===item.id){activeId=null;startNew(false)}renderHistory(document.getElementById("katiaHistorySearch")?.value||"")};
  row.append(b,del);root.append(row);
 });
}
function setLegacyHistory(messages){historial=messages;guardar(STORAGE.history,messages)}
function loadChat(chatId){
 saveCurrent();const item=sessions.find(x=>x.id===chatId);if(!item)return;activeId=item.id;setLegacyHistory(item.messages.slice());if(typeof window.restaurarHistorial==="function")window.restaurarHistorial();renderHistory();closeSidebar();renderSuggestions();
}
function startNew(save=true){
 if(save)saveCurrent();activeId=null;setLegacyHistory([]);
 if(typeof window.restaurarHistorial==="function")window.restaurarHistorial();
 renderHistory();closeSidebar();renderSuggestions();
}
function openSidebar(){document.getElementById("katiaSidebar")?.classList.add("open");document.getElementById("katiaSidebarBackdrop")?.classList.add("open");document.body.classList.add("katia-sidebar-visible")}
function closeSidebar(){document.getElementById("katiaSidebar")?.classList.remove("open");document.getElementById("katiaSidebarBackdrop")?.classList.remove("open");document.body.classList.remove("katia-sidebar-visible")}
function applyPrefs(){
 const palette=palettes[prefs.color]||palettes.lavender;
 document.documentElement.style.setProperty("--katia-accent",palette[0]);document.documentElement.style.setProperty("--katia-accent-2",palette[1]);
 document.documentElement.style.setProperty("--katia-font-size",Math.max(12,Math.min(20,Number(prefs.fontSize)||14))+"px");
 document.body.classList.toggle("katia-dark",prefs.theme==="dark");
 document.documentElement.dataset.katiaTheme=prefs.theme;
 const dark=document.querySelector(".katia-theme-toggle");if(dark)dark.textContent=prefs.theme==="dark"?"☀️":"🌙";
}
function savePrefs(){prefs.theme=document.getElementById("kpTheme").value;prefs.color=document.getElementById("kpColor").value;prefs.fontSize=Number(document.getElementById("kpFont").value);prefs.tone=document.getElementById("kpTone").value;prefs.detail=document.getElementById("kpDetail").value;prefs.language=document.getElementById("kpLanguage").value;prefs.suggestions=document.getElementById("kpSuggestions").checked;write(PREF,prefs);applyPrefs();injectPromptPrefs();renderSuggestions();const status=document.getElementById("kpSaved");if(status)status.textContent="✅ Preferencias guardadas en este dispositivo."}
function injectPromptPrefs(){
 if(typeof window.construirPayloadChat!=="function"||window.__katiaPrefsWrapped)return;
 const original=window.construirPayloadChat;window.construirPayloadChat=function(){const payload=original();payload.context=(payload.context||"")+"\n\nPREFERENCIAS DEL USUARIO:\n- Tono: "+prefs.tone+".\n- Nivel de detalle: "+prefs.detail+".\n- Idioma: "+prefs.language+".\nRespondé respetando estas preferencias sin sacrificar claridad ni precisión.";return payload};window.__katiaPrefsWrapped=true;
}
function settingsMarkup(){
 return `
  <div class="katia-settings-group">
   <h3>🎨 Apariencia</h3>
   <label for="kpTheme">Tema</label>
   <select id="kpTheme"><option value="light">Claro</option><option value="dark">Oscuro</option></select>
   <label for="kpColor">Color principal</label>
   <select id="kpColor"><option value="lavender">Lavanda</option><option value="blue">Azul</option><option value="mint">Menta</option><option value="rose">Rosa</option><option value="amber">Ámbar</option></select>
   <label for="kpFont">Tamaño de letra: <span id="kpFontValue"></span></label>
   <input id="kpFont" type="range" min="12" max="20" value="14">
  </div>
  <div class="katia-settings-group">
   <h3>💜 Cómo responde Katia</h3>
   <label for="kpTone">Personalidad y tono</label>
   <select id="kpTone"><option value="cercano">Cercano y amigable</option><option value="profesional">Profesional</option><option value="tranquilo">Tranquilo y paciente</option><option value="entusiasta">Entusiasta y dinámico</option></select>
   <label for="kpDetail">Nivel de explicación</label>
   <select id="kpDetail"><option value="adaptativo">Adaptativo según la pregunta</option><option value="breve">Breve y directo</option><option value="paso a paso">Paso a paso y con ejemplos</option><option value="profundo">Detallado y profundo</option></select>
   <label for="kpLanguage">Idioma</label>
   <select id="kpLanguage"><option value="es">Español</option><option value="es-PY">Español paraguayo</option><option value="en">English</option><option value="gn">Guaraní (cuando sea posible)</option></select>
   <label><input id="kpSuggestions" type="checkbox" style="width:auto"> Mostrar sugerencias inteligentes</label>
  </div>
  <div class="katia-settings-group">
   <h3>🎀 Voz de Katia</h3>
   <p class="small-note">Elegí una voz instalada en tu dispositivo o activá la voz neuronal Daniela. La primera descarga de Daniela requiere conexión y aproximadamente 114 MB.</p>
   <div id="voiceSelectContainer"><p class="small-note">Cargando voces disponibles...</p></div>
  </div>
  <div class="katia-settings-group">
   <h3>🧠 Inteligencia de Katia</h3>
   <label for="providerSelect">Proveedor de IA</label>
   <select id="providerSelect">
    <option value="auto">Automático (Groq + Gemini)</option>
    <option value="groq">Groq</option>
    <option value="gemini">Gemini</option>
   </select>
   <button class="tool-btn" type="button" onclick="guardarProveedor()">Guardar proveedor</button>
   <p class="small-note">Automático usa el sistema de selección y respaldo del Worker.</p>
   <label for="brainV2Select">Cerebro de Katia</label>
   <select id="brainV2Select">
    <option value="off">Katia 3.1 (V1) — original</option>
    <option value="on">Brain V2 — experimental</option>
   </select>
   <button class="tool-btn" type="button" onclick="guardarBrainV2()">Guardar cerebro</button>
   <button class="tool-btn" type="button" onclick="verSystemPromptUsado()">🔍 Ver último system preparado</button>
  </div>
  <div class="katia-settings-group">
   <h3>👤 Tu perfil</h3>
   <label for="userNameInput">¿Cómo querés que te llame Katia?</label>
   <input id="userNameInput" placeholder="Tu nombre">
   <button class="tool-btn" type="button" onclick="guardarNombre()">Guardar nombre</button>
  </div>
  <div class="katia-settings-actions">
   <button type="button" onclick="window.katiaResetPrefs()">Restablecer preferencias visuales</button>
   <button class="save" type="button" onclick="window.katiaSavePrefs()">Guardar preferencias</button>
  </div>
  <div class="katia-settings-group">
   <button class="tool-btn" type="button" onclick="exportarDatos()">📥 Exportar mis datos</button>
  </div>
  <p id="kpSaved" class="small-note" role="status"></p>
 `;
}
function openSettings(){
 const content=document.getElementById("panelContent");
 const title=document.getElementById("panelTitle");
 if(!content){console.warn("Katia: no se encontró #panelContent");return;}
 if(title)title.textContent="🎨 Personalización de Katia";
 content.innerHTML=settingsMarkup();
 const setValue=(id,value)=>{const el=document.getElementById(id);if(el)el.value=value};
 setValue("kpTheme",prefs.theme);setValue("kpColor",prefs.color);setValue("kpFont",prefs.fontSize);setValue("kpTone",prefs.tone);setValue("kpDetail",prefs.detail);setValue("kpLanguage",prefs.language);
 const suggestions=document.getElementById("kpSuggestions");if(suggestions)suggestions.checked=!!prefs.suggestions;
 const range=document.getElementById("kpFont"),value=document.getElementById("kpFontValue");
 if(range&&value){range.oninput=()=>value.textContent=range.value+" px";value.textContent=range.value+" px";}
 const nameInput=document.getElementById("userNameInput");if(nameInput&&typeof nombreUsuario==="function")nameInput.value=nombreUsuario();
 const provider=document.getElementById("providerSelect");if(provider&&typeof obtenerProveedor==="function")provider.value=obtenerProveedor();
 const brain=document.getElementById("brainV2Select");if(brain&&typeof brainV2Activo==="function")brain.value=brainV2Activo()?"on":"off";
 if(typeof window.mostrarSelectorVoces==="function")window.mostrarSelectorVoces();
 if(window.katiaDanielaVoice&&typeof window.katiaDanielaVoice.refreshUI==="function")window.katiaDanielaVoice.refreshUI();
}
function resetPrefs(){prefs={...defaults};write(PREF,prefs);applyPrefs();openSettings();injectPromptPrefs()}
function suggestionSet(){
 const msgs=currentMessages(),last=[...msgs].reverse().find(x=>x.role==="assistant")?.content||"",user=[...msgs].reverse().find(x=>x.role==="user")?.content||"";
 const t=(last+" "+user).toLowerCase();
 if(/código|program|javascript|python|godot|error/.test(t))return ["Dame un ejemplo sencillo","Explicámelo paso a paso","Ayudame a corregirlo"];
 if(/historia|paraguay|colegio|tarea|matem|química|biología/.test(t))return ["Haceme un resumen","Dame un ejemplo","Preparame una práctica"];
 if(/imagen|diseñ|color|logo|avatar/.test(t))return ["Dame otra idea","Mejorá el diseño","Mostrame una alternativa"];
 if(/gracias|listo|perfecto/.test(t))return ["¿Qué sigue?","Dame una idea nueva","Repasemos lo aprendido"];
 return ["Profundizá un poco más","Dame un ejemplo práctico","¿Qué puedo hacer después?"];
}
function renderSuggestions(){
 const root=document.getElementById("katiaSuggestions");if(!root)return;root.replaceChildren();if(!prefs.suggestions)return;
 const label=document.createElement("span");label.className="katia-suggestions-label";label.textContent="✨ Sugerencias para continuar";root.append(label);
 suggestionSet().forEach(value=>{const b=document.createElement("button");b.className="katia-suggestion";b.textContent=value;b.onclick=()=>{const input=document.getElementById("userInput");if(input){input.value=value;input.focus();if(typeof window.enviarMensaje==="function")window.enviarMensaje()}};root.append(b)});
}
function mount(){
 const header=document.querySelector("header"),chat=document.querySelector(".chat-panel"),messages=document.getElementById("messages");
 if(!header||!chat||!messages)return;
 const toggle=document.createElement("button");toggle.className="katia-sidebar-toggle";toggle.textContent="☰ Historial";toggle.onclick=openSidebar;header.querySelector(".header-actions")?.prepend(toggle);
 const backdrop=document.createElement("div");backdrop.id="katiaSidebarBackdrop";backdrop.className="katia-sidebar-backdrop";backdrop.onclick=closeSidebar;document.body.append(backdrop);
 const side=document.createElement("aside");side.id="katiaSidebar";side.className="katia-sidebar";side.innerHTML='<div class="katia-sidebar-head"><h2>💜 Tus conversaciones</h2><button class="office-close" id="katiaCloseSidebar">✕</button></div><button class="ks-primary" id="katiaNewChat">＋ Nuevo chat</button><input id="katiaHistorySearch" placeholder="Buscar conversaciones..."><div id="katiaHistoryList" class="katia-history-list"></div><div class="katia-sidebar-foot">Las conversaciones se guardan en este dispositivo. Podés eliminarlas cuando quieras.</div>';document.body.append(side);
 document.getElementById("katiaCloseSidebar").onclick=closeSidebar;document.getElementById("katiaNewChat").onclick=()=>startNew(true);document.getElementById("katiaHistorySearch").oninput=e=>renderHistory(e.target.value);
 const composer=chat.querySelector(".composer");const suggestions=document.createElement("div");suggestions.id="katiaSuggestions";suggestions.className="katia-suggestions";composer?.before(suggestions);
 const originalSettings=window.abrirConfiguracion;
 window.katiaOpenSettings=openSettings;
 if(typeof originalSettings==="function"){
  window.abrirConfiguracion=function(){
   const overlay=document.getElementById("overlay");if(overlay)overlay.classList.add("open");
   openSettings();
  };
 }
 const oldAdd=window.agregarMensaje;if(typeof oldAdd==="function"){window.agregarMensaje=function(...args){const result=oldAdd.apply(this,args);if(args[2]!==false){saveCurrent();if(args[0]==="katia")renderSuggestions()}return result}}
 window.limpiarChat=function(){if(!confirm("¿Querés borrar esta conversación?"))return;const previousId=activeId;historial=[];guardar(STORAGE.history,historial);if(previousId)sessions=sessions.filter(x=>x.id!==previousId);activeId=null;ultimoMensaje="";if(typeof window.restaurarHistorial==="function")window.restaurarHistorial();write(KEY,sessions);renderHistory();renderSuggestions()}
 const saved=sessions.find(x=>Array.isArray(x.messages)&&x.messages.length);if(currentMessages().length){const same=saved&&JSON.stringify(saved.messages)===JSON.stringify(currentMessages());activeId=same?saved.id:id();saveCurrent()}else if(saved){activeId=saved.id;setLegacyHistory(saved.messages);if(typeof window.restaurarHistorial==="function")window.restaurarHistorial()}
 const inlineConfig=document.getElementById("configInline");if(inlineConfig)inlineConfig.innerHTML='<p class="small-note">Personalizá el aspecto y la forma de responder de Katia desde el panel de configuración.</p><button class="tool-btn" style="width:100%" onclick="abrirPanel(&quot;settings&quot;)">🎨 Abrir personalización</button>';applyPrefs();injectPromptPrefs();renderHistory();renderSuggestions();
}
window.katiaSavePrefs=savePrefs;window.katiaResetPrefs=resetPrefs;
document.addEventListener("DOMContentLoaded",mount);
})();
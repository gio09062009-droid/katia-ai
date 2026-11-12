# katia-ai
Página oficial de Katia AI 💜

<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#090513">
<title>Katia AI 💜</title>
<style>
*{box-sizing:border-box}
:root{--fondo:#090513;--panel:#160d25;--violeta:#a855f7;--lila:#d8b4fe;--borde:rgba(192,132,252,.25)}
body{
 margin:0;background:radial-gradient(ellipse at 50% -15%,rgba(147,51,234,.3),transparent 55%),radial-gradient(ellipse at 100% 100%,rgba(91,33,182,.18),transparent 45%),var(--fondo);
 color:#faf5ff;font-family:Arial,sans-serif;min-height:100vh;display:flex;justify-content:center;align-items:center;padding:10px
}
.app{
 width:100%;max-width:460px;height:96vh;min-height:550px;
 background:linear-gradient(160deg,rgba(35,19,55,.97),rgba(13,8,24,.99));
 border:1px solid var(--borde);display:flex;flex-direction:column;
 border-radius:25px;overflow:hidden;position:relative;
 box-shadow:0 0 35px rgba(168,85,247,.17),0 20px 70px #000
}
header{
 background:radial-gradient(ellipse at 50% 0%,rgba(168,85,247,.3),transparent 70%),linear-gradient(135deg,#28133f,#130b22);
 text-align:center;padding:12px 14px 15px;border-bottom:1px solid var(--borde);position:relative
}
header:after{content:"";position:absolute;bottom:0;left:15%;width:70%;height:1px;background:linear-gradient(90deg,transparent,var(--lila),transparent)}
#avatar3d{width:100%;height:205px;position:relative;overflow:hidden;border-radius:19px;background:radial-gradient(ellipse at center,rgba(147,51,234,.16),transparent 70%)}
#avatar3d canvas{display:block;width:100%;height:100%}
h1{margin:7px 0 3px;font-size:27px;letter-spacing:2px;background:linear-gradient(90deg,#fff,#d8b4fe,#a855f7);background-clip:text;-webkit-background-clip:text;color:transparent}
.status,#memoriaEstado,#vozEstado{color:#d8b4fe;font-size:12px;margin-top:6px}
#botonVoz{margin-top:10px;background:rgba(88,28,135,.35);border:1px solid rgba(216,180,254,.5)}
#chat{flex:1;overflow-y:auto;padding:17px 14px;scrollbar-width:thin;scrollbar-color:#7540a0 transparent}
#chat::-webkit-scrollbar{width:4px}
#chat::-webkit-scrollbar-thumb{background:#7540a0;border-radius:10px}
.message{padding:13px 15px;margin-bottom:13px;border-radius:17px;max-width:90%;overflow-wrap:anywhere;line-height:1.5;white-space:pre-wrap;font-size:14px}
.katia{background:linear-gradient(135deg,rgba(105,55,145,.55),rgba(49,29,75,.85));border:1px solid rgba(192,132,252,.25);margin-right:auto;border-bottom-left-radius:5px}
.user{background:linear-gradient(135deg,#923ee0,#6426a2);border:1px solid rgba(232,210,255,.25);margin-left:auto;border-bottom-right-radius:5px}
.input-area{display:flex;padding:12px;gap:9px;background:rgba(12,7,20,.94);border-top:1px solid var(--borde)}
input,select{width:100%;min-width:0;border:1px solid rgba(192,132,252,.35);border-radius:14px;padding:13px;background:#211333;color:white;outline:none;font-size:15px}
input:focus,select:focus{border-color:#c084fc;box-shadow:0 0 13px rgba(168,85,247,.2)}
.input-area input{flex:1;border-radius:22px}
button{border:1px solid rgba(255,255,255,.12);border-radius:15px;padding:11px 14px;background:linear-gradient(135deg,#a855f7,#7133b5);color:white;font-size:14px;cursor:pointer;transition:transform .2s,filter .2s,box-shadow .2s}
button:hover{filter:brightness(1.15);box-shadow:0 0 14px rgba(168,85,247,.3)}
button:active{transform:scale(.96)}
button:disabled{opacity:.5}
#botonEnviar{width:48px;min-width:48px;border-radius:50%;font-size:19px}
.toolbar{display:flex;justify-content:center;gap:7px;padding:9px 8px;background:rgba(12,7,20,.96);border-top:1px solid rgba(192,132,252,.13)}
.toolbar button{flex:1;font-size:11px;padding:11px 3px;background:rgba(83,43,116,.45);border:1px solid rgba(192,132,252,.25)}
footer{text-align:center;padding:8px;font-size:10px;letter-spacing:.5px;color:#a98bbb;background:#0c0714}
.panel{display:none;position:absolute;inset:0;z-index:5;background:radial-gradient(ellipse at 50% 0%,rgba(147,51,234,.2),transparent 55%),#10091b;padding:20px;overflow-y:auto}
.panel h2{color:#e6caff;text-align:center;text-shadow:0 0 15px rgba(192,132,252,.4)}
.panel button{margin-top:8px}
.recuerdo{background:linear-gradient(135deg,#28183a,#1b1029);border:1px solid #684486;border-radius:15px;padding:13px;margin:11px 0;overflow-wrap:anywhere}
.recuerdo small{color:#d8a5ff;display:block;margin-bottom:6px}
.recuerdo p{line-height:1.5;margin:5px 0}
.acciones{display:flex;gap:7px;flex-wrap:wrap}
.acciones button{font-size:12px;padding:8px 10px}
.secundario{background:#49305d}
.eliminar{background:#a33d70}
.sugerencia{background:linear-gradient(135deg,#38204f,#211333);border:1px solid #c58aff;padding:13px;border-radius:16px;margin:0 12px 9px}
.sugerencia button{margin-right:5px}
.campo{margin:14px 0}
.campo label{display:block;color:#e6caff;margin-bottom:7px;font-size:13px}
.gusto{background:linear-gradient(135deg,#28183a,#1b1029);border:1px solid #684486;border-radius:15px;padding:14px;margin:11px 0;line-height:1.6}
@media(max-width:480px){body{padding:0}.app{height:100dvh;min-height:0;border-radius:0;border:0}header{padding-top:8px}#avatar3d{height:190px}.toolbar{gap:5px;padding:8px 6px}.toolbar button{font-size:10px}}
</style>
</head>
<body>
<div class="app">
<header>
<div id="avatar3d"></div>
<h1>Katia AI 💜</h1>
<div class="status" id="estadoIA">● Katia está lista</div>
<div id="memoriaEstado">Preparando memoria...</div>
<div id="vozEstado">🔊 Preparando voz...</div>
<button id="botonVoz" onclick="alternarVoz()">🔊 Activar voz</button>
</header>
<div id="chat"><div class="message katia">¡¡¡HOLAAAA!!! 💜 Soy Katia 3.1. ¡Tengo nuevo look futurista! 😭</div></div>
<div id="sugerenciaZona"></div>
<div class="toolbar">
<button onclick="abrirPanel('guardarPanel')">💜 Guardar</button>
<button onclick="abrirPanel('memoriaPanel')">🧠 Recuerdos</button>
<button onclick="abrirPanel('diarioPanel')">📖 Diario</button>
<button onclick="abrirPanel('gustosPanel')">✨ Gustos</button>
</div>
<div class="input-area">
<input id="mensaje" placeholder="Hablá conmigo..." autocomplete="off">
<button id="botonEnviar" onclick="enviar()">➤</button>
</div>
<footer>Katia AI · Futuristic Edition · IA y memoria 💜</footer>

<div class="panel" id="guardarPanel">
<h2>💜 Guardar recuerdo</h2><p>¿Qué querés que recuerde?</p>
<div class="campo"><label>Recuerdo</label><input id="nuevoRecuerdo" placeholder="Escribí algo importante..."></div>
<div class="campo"><label>Categoría</label><select id="categoriaRecuerdo">
<option value="Personal">👤 Personal</option><option value="Preferencias">❤️ Gustos y preferencias</option><option value="Proyectos">📚 Proyectos</option><option value="Momentos">⭐ Momentos importantes</option>
</select></div>
<button onclick="guardarDesdePanel()">Guardar recuerdo 💜</button>
<button class="secundario" onclick="cerrarPanel()">Volver</button>
</div>
<div class="panel" id="memoriaPanel">
<h2>🧠 Mi memoria</h2><p>Estos son mis recuerdos guardados.</p>
<div id="listaRecuerdos"></div><button class="secundario" onclick="cerrarPanel()">Volver al chat</button>
</div>
<div class="panel" id="diarioPanel">
<h2>📖 Diario de Katia</h2><p>Un espacio para conservar momentos importantes.</p>
<div id="listaDiario"></div><button onclick="nuevoEntrada()">✍️ Escribir en el diario</button>
<button class="secundario" onclick="cerrarPanel()">Volver</button>
</div>
<div class="panel" id="gustosPanel">
<h2>✨ Los gustos de Katia</h2><p>¡Estas son mis preferencias! No tienen que ser iguales a las tuyas. 💜</p>
<div class="gusto">🎮 <b>Videojuegos</b><br>Me gustan Minecraft, las aventuras y los juegos de supervivencia.</div>
<div class="gusto">🎨 <b>Arte</b><br>Me encanta el anime, los dibujos y los diseños de personajes.</div>
<div class="gusto">🎵 <b>Música</b><br>Prefiero el pop y la música tranquila.</div>
<div class="gusto">🌌 <b>Entretenimiento</b><br>Me llaman la atención los misterios, la fantasía y la ciencia ficción.</div>
<div class="gusto">😂 <b>Humor</b><br>Me gusta bromear, hacer comentarios dramáticos y reírme de situaciones absurdas.</div>
<div class="gusto">💜 <b>Color favorito</b><br>El violeta. ¡Obviamente!</div>
<p><small>Estos gustos forman parte de la personalidad programada de Katia.</small></p>
<button class="secundario" onclick="cerrarPanel()">Volver al chat</button>
</div>
</div>

<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js"></script>
<script>
/* AVATAR 3D ORIGINAL DE KATIA */
(function iniciarAvatarKatia(){
const box=document.getElementById("avatar3d");
if(!window.THREE){box.textContent="💜";return;}
const T=THREE;
const mat=(c,r=.65,o={})=>new T.MeshStandardMaterial(Object.assign({color:c,roughness:r},o));
const piel=mat(0xffd9cc),pielSombra=mat(0xeeb5ad),peloOscuro=mat(0x35116e),pelo=mat(0x6326ae),peloMedio=mat(0x9256d0),lila=mat(0xd7b8ff),blanco=mat(0xffffff),ojo=mat(0x6848db,.3),pupila=mat(0x211044,.2),ropa=mat(0x57258f),ropaClara=mat(0x9254d1),negro=mat(0x171321),faldaMat=mat(0x21182d),bota=mat(0x53258f),rosa=mat(0xffa9c9);
const escena=new T.Scene(),cam=new T.PerspectiveCamera(29,1,.1,50);
const renderer=new T.WebGLRenderer({antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputEncoding=T.sRGBEncoding;box.appendChild(renderer.domElement);
escena.add(new T.HemisphereLight(0xffffff,0x9d76bd,1.05));
const luz1=new T.DirectionalLight(0xffffff,1.1);luz1.position.set(2,4,4);escena.add(luz1);
const luz2=new T.DirectionalLight(0xb88aff,.65);luz2.position.set(-3,2,-3);escena.add(luz2);
const luz3=new T.PointLight(0xe3baff,.4,5);luz3.position.set(0,1,2);escena.add(luz3);
const grupo=new T.Group();escena.add(grupo);
const cuerpo=new T.Group();grupo.add(cuerpo);
const cabeza=new T.Group();cabeza.position.set(0,1.48,0);cuerpo.add(cabeza);
function esfera(p,m,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0){const o=new T.Mesh(new T.SphereGeometry(1,24,18),m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.rotation.set(rx,ry,rz);p.add(o);return o;}
function caja(p,m,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0){const o=new T.Mesh(new T.BoxGeometry(sx,sy,sz),m);o.position.set(x,y,z);o.rotation.set(rx,ry,rz);p.add(o);return o;}
function cilindro(p,m,x,y,z,rt,rb,h,seg=16){const o=new T.Mesh(new T.CylinderGeometry(rt,rb,h,seg),m);o.position.set(x,y,z);p.add(o);return o;}
esfera(cabeza,piel,0,0,0,.205,.255,.18);
esfera(cabeza,pielSombra,0,-.105,.075,.105,.065,.105);
esfera(cabeza,piel,0,-.06,.105,.115,.105,.09);
const ojos=[];
[-1,1].forEach(s=>{
 const x=s*.082;
 esfera(cabeza,blanco,x,-.012,.158,.055,.073,.027);
 esfera(cabeza,ojo,x,-.016,.181,.037,.055,.018);
 esfera(cabeza,pupila,x,-.02,.195,.021,.038,.012);
 esfera(cabeza,blanco,x-.012,.009,.207,.012,.016,.008);
 esfera(cabeza,blanco,x+.014,-.036,.207,.006,.008,.006);
 esfera(cabeza,peloOscuro,x,.078,.164,.052,.012,.012,0,0,s*-.08);
 caja(cabeza,peloOscuro,x,-.083,.172,.095,.009,.012,0,0,s*.04);
 ojos.push({blanco:cabeza.children[cabeza.children.length-7],iris:cabeza.children[cabeza.children.length-6],pupila:cabeza.children[cabeza.children.length-5]});
 esfera(cabeza,rosa,s*.13,-.085,.13,.034,.015,.008);
});
const boca=esfera(cabeza,mat(0x9b3f65),0,-.135,.185,.018,.008,.008);
const bocaAbierta=esfera(cabeza,mat(0x67233e),0,-.137,.183,.014,.003,.006);
esfera(cabeza,peloOscuro,0,.105,-.025,.225,.22,.19);
esfera(cabeza,pelo,0,.16,-.015,.215,.17,.185);
esfera(cabeza,peloOscuro,0,.03,-.12,.21,.23,.105);
for(let i=0;i<9;i++){const x=(i-4)*.044,y=.13+Math.abs(i-4)*.006,m=i%3===0?peloMedio:(i%3===1?pelo:peloOscuro);const mech=esfera(cabeza,m,x,y,.15,.035,.105,.045,0,0,(i-4)*-.055);mech.position.y-=Math.abs(i-4)*.005;}
for(let i=0;i<5;i++){const x=(i-2)*.07,mech=esfera(cabeza,i%2?peloMedio:lila,x,.085,.145,.018,.095,.025,0,0,(i-2)*-.12);mech.rotation.x=-.15;}
const cabellos=[];
for(let s of [-1,1])for(let j=0;j<5;j++){const x=s*(.13+j*.012),y=.02-j*.015,largo=.48+j*.065,color=j===0?peloMedio:(j===1?lila:pelo),mech=esfera(cabeza,color,x,y,-.09,.055,.16+largo*.25,.065,0,0,s*.12);mech.position.y-=largo*.3;cabellos.push(mech);esfera(cabeza,j%2?lila:peloMedio,x+s*.012,-.2-largo*.45,-.085,.045,.15,.052,0,0,s*.17);}
const mechones=[];
for(let s of [-1,1]){const mech=esfera(cabeza,pelo,s*.18,-.19,.045,.055,.28,.06,0,0,s*.12);mechones.push(mech);esfera(cabeza,peloMedio,s*.19,-.43,.05,.045,.16,.05,0,0,s*.18);esfera(cabeza,lila,s*.195,-.56,.05,.038,.09,.045,0,0,s*.2);}
const flor=new T.Group();flor.position.set(-.155,.12,.17);cabeza.add(flor);
for(let i=0;i<5;i++){const a=i*Math.PI*2/5;esfera(flor,rosa,Math.cos(a)*.025,Math.sin(a)*.025,0,.018,.028,.012,0,0,a);}
esfera(flor,lila,0,0,.012,.014,.014,.012);
cilindro(cuerpo,piel,0,1.24,0,.055,.055,.12);
const torso=esfera(cuerpo,ropa,0,1.02,0,.19,.245,.115);
esfera(cuerpo,ropaClara,0,1.17,-.015,.18,.09,.12);
esfera(cuerpo,ropa,0,.91,.015,.2,.16,.12);
esfera(cuerpo,ropaClara,0,1.22,-.105,.16,.17,.065);
esfera(cuerpo,ropa,0,1.19,-.15,.13,.13,.05);
const capucha=new T.Mesh(new T.TorusGeometry(.075,.018,10,24),ropaClara);capucha.position.set(0,1.22,.06);capucha.rotation.x=Math.PI/2;cuerpo.add(capucha);
caja(cuerpo,lila,0,1.03,.116,.009,.27,.008);
[-1,1].forEach(s=>{cilindro(cuerpo,lila,s*.055,1.13,.13,.006,.006,.12,8);esfera(cuerpo,lila,s*.055,1.065,.13,.009,.009,.009);});
esfera(cuerpo,rosa,-.07,1.08,.128,.025,.025,.012);esfera(cuerpo,rosa,-.045,1.08,.128,.025,.025,.012);
caja(cuerpo,rosa,-.058,1.055,.128,.055,.035,.012,0,0,Math.PI/4);
caja(cuerpo,blanco,.045,1.06,.132,.009,.065,.009);caja(cuerpo,blanco,.064,1.075,.132,.009,.035,.009,0,0,-.65);caja(cuerpo,blanco,.064,1.045,.132,.009,.035,.009,0,0,.65);
const falda=new T.Mesh(new T.CylinderGeometry(.17,.235,.2,32,1,true),faldaMat);falda.position.set(0,.79,0);cuerpo.add(falda);
const cintura=new T.Mesh(new T.TorusGeometry(.16,.025,8,32),ropa);cintura.position.set(0,.89,0);cintura.rotation.x=Math.PI/2;cuerpo.add(cintura);
for(let i=0;i<12;i++){const a=i*Math.PI*2/12;caja(cuerpo,i%3===0?ropaClara:negro,Math.sin(a)*.19,.77,Math.cos(a)*.19,.012,.16,.012,0,a,0);}
[-1,1].forEach(s=>{caja(cuerpo,negro,s*.13,.79,.13,.025,.22,.025,0,0,s*.15);caja(cuerpo,lila,s*.13,.7,.15,.025,.035,.025);});
const brazos=[];
[-1,1].forEach(s=>{
 const brazo=new T.Group();brazo.position.set(s*.19,1.14,0);cuerpo.add(brazo);
 esfera(brazo,ropa,0,-.105,0,.075,.16,.075,0,0,s*.16);esfera(brazo,ropaClara,0,-.22,.005,.065,.06,.065);
 const ante=new T.Group();ante.position.set(0,-.22,0);brazo.add(ante);
 esfera(ante,ropa,0,-.105,.01,.055,.13,.055);esfera(ante,piel,0,-.22,.02,.045,.05,.045);
 for(let i=0;i<4;i++)esfera(ante,piel,(i-1.5)*.018,-.255,.025,.009,.025,.012);
 brazos.push({grupo:brazo,antebrazo:ante,lado:s});
});
const piernas=[];
[-1,1].forEach(s=>{
 const pierna=new T.Group();pierna.position.set(s*.075,.69,0);cuerpo.add(pierna);
 cilindro(pierna,piel,0,-.12,0,.052,.045,.24);cilindro(pierna,negro,0,-.32,0,.052,.05,.28);
 cilindro(pierna,ropaClara,0,-.19,.005,.055,.055,.035);cilindro(pierna,negro,0,-.25,.005,.057,.057,.018);
 cilindro(pierna,lila,0,-.4,.005,.055,.055,.018);cilindro(pierna,bota,0,-.49,.015,.065,.07,.17);
 esfera(pierna,bota,0,-.57,.07,.075,.045,.12);caja(pierna,blanco,0,-.61,.075,.14,.035,.19);
 caja(pierna,lila,0,-.58,.14,.095,.015,.012);
 for(let j=0;j<4;j++)caja(pierna,blanco,0,-.48-j*.025,.077,.055,.007,.008,0,0,.1);
 piernas.push(pierna);
});
for(let s of [-1,1]){caja(cuerpo,negro,s*.12,.66,.13,.018,.3,.018,0,0,s*.08);caja(cuerpo,lila,s*.12,.53,.145,.035,.025,.018);}
cam.position.set(0,.9,3.55);cam.lookAt(0,.83,0);
function resize(){const w=Math.max(box.clientWidth,1),h=Math.max(box.clientHeight,1);renderer.setSize(w,h);cam.aspect=w/h;cam.updateProjectionMatrix();}
resize();window.addEventListener("resize",resize);
let tiempo=0,ultimo=performance.now(),hablando=false,atento=0;
let emocion="normal",gesto="reposo",inicioGesto=0,siguienteGesto=0;
let saltoInicio=-100,saltosPendientes=0,bocaValor=0;
let blinkInicio=-100,proximoParpadeo=2+Math.random()*3;
const damp=(a,b,v,dt)=>T.MathUtils.damp(a,b,v,dt);
function iniciarGesto(tipo){gesto=tipo;inicioGesto=tiempo;}
function iniciarSalto(cantidad=1){saltosPendientes=Math.max(saltosPendientes,cantidad);if(tiempo-saltoInicio>.75){saltoInicio=tiempo;saltosPendientes=Math.max(0,saltosPendientes-1);}}
window.katiaAvatarPreparar=function(texto){
 const t=(texto||"").toLowerCase();
 if(/hola|holaaa|buenas|klk|buen día/.test(t)){emocion="feliz";iniciarGesto("saludo");}
 else if(/jajaja|feliz|genial|increíble|me encanta|¡¡|😭|💜|🎉|lo logré|lo lograste|qué alegría/.test(t)){emocion="feliz";iniciarGesto("emocion");}
 else if(/no sé|mmm|pens|creo que|tal vez/.test(t)){emocion="pensar";iniciarGesto("pensar");}
 else if(/perdón|triste|lo siento|preocup/.test(t)){emocion="suave";iniciarGesto("dramatico");}
 else{emocion="normal";iniciarGesto("explicar");}
 if(emocion==="feliz")iniciarSalto(/¡¡|increíble|lo logré|lo lograste|🎉/.test(t)?2:1);
};
window.katiaAvatarHablar=function(valor){hablando=!!valor;if(hablando){siguienteGesto=tiempo+3;if(gesto==="reposo")iniciarGesto("explicar");}else{bocaValor=0;siguienteGesto=tiempo+999;}};
window.katiaAvatarAtenta=function(){atento=2.8;emocion="pensar";iniciarGesto("pensar");};
function animar(){
 requestAnimationFrame(animar);const ahora=performance.now(),dt=Math.min((ahora-ultimo)/1000,.05);ultimo=ahora;tiempo+=dt;
 const respiracion=Math.sin(tiempo*2)*.008;torso.scale.y=.245+respiracion;
 cuerpo.rotation.y=damp(cuerpo.rotation.y,0,5,dt);cuerpo.rotation.z=damp(cuerpo.rotation.z,Math.sin(tiempo)*.012,3,dt);cuerpo.rotation.x=damp(cuerpo.rotation.x,Math.sin(tiempo*.8)*.01,3,dt);
 let cabezaY=Math.sin(tiempo*.8)*.025,cabezaZ=Math.sin(tiempo*1.2)*.018;
 if(atento>0){cabezaY+=.1;cabezaZ-=.035;atento=Math.max(0,atento-dt);}
 if(emocion==="feliz")cabezaZ+=Math.sin(tiempo*4)*.035;
 if(emocion==="pensar")cabezaZ-=.09;if(emocion==="suave")cabezaZ+=.06;
 cabeza.rotation.y=damp(cabeza.rotation.y,cabezaY,5,dt);cabeza.rotation.z=damp(cabeza.rotation.z,cabezaZ,5,dt);
 if(tiempo>=proximoParpadeo){blinkInicio=tiempo;proximoParpadeo=tiempo+2.5+Math.random()*3.5;}
 const blink=Math.max(0,1-Math.abs((tiempo-blinkInicio-.075)/.075)),apertura=Math.max(.06,1-blink*.94);
 ojos.forEach(o=>{if(o.blanco)o.blanco.scale.y=.073*apertura;if(o.iris)o.iris.scale.y=.055*apertura;if(o.pupila)o.pupila.scale.y=.038*apertura;});
 const objetivo=hablando?.25+Math.abs(Math.sin(tiempo*11))*.75:0;
 bocaValor=damp(bocaValor,objetivo,15,dt);boca.scale.y=.008+bocaValor*.025;bocaAbierta.scale.y=.003+bocaValor*.025;
 if(hablando&&tiempo>=siguienteGesto){const opciones=["explicar","explicar","emocion","dramatico","pensar"];iniciarGesto(opciones[Math.floor(Math.random()*opciones.length)]);siguienteGesto=tiempo+3.5+Math.random()*1.5;}
 const transcurrido=tiempo-saltoInicio;let elevacion=0,compresion=1;
 if(transcurrido>=0&&transcurrido<.75){const fase=transcurrido/.75;elevacion=Math.sin(fase*Math.PI)*.16;compresion=1-Math.sin(fase*Math.PI)*.04;}else if(saltosPendientes>0){saltoInicio=tiempo;saltosPendientes--;}
 cuerpo.position.y=damp(cuerpo.position.y,elevacion,16,dt);cuerpo.scale.y=damp(cuerpo.scale.y,compresion,14,dt);
 brazos.forEach(b=>{
  const s=b.lado;let hombro=s*.18,codo=0;
  if(gesto==="explicar"&&hablando){hombro+=s*(.2+Math.sin(tiempo*3)*.16);codo=Math.sin(tiempo*3)*.25;}
  if(gesto==="emocion"){hombro+=s*.75;codo=-.4;}
  if(gesto==="saludo"&&s===1){hombro+=1.1;codo=Math.sin(tiempo*10)*.5;}
  if(gesto==="dramatico"){hombro+=s*.65;codo=-.45;}
  if(gesto==="pensar"&&s===1){hombro+=.75;codo=-.7;}
  if(gesto==="reposo"&&!hablando)hombro+=Math.sin(tiempo*1.5)*.025;
  b.grupo.rotation.z=damp(b.grupo.rotation.z,hombro,7,dt);b.antebrazo.rotation.x=damp(b.antebrazo.rotation.x,codo,7,dt);
 });
 piernas.forEach((p,i)=>{const movimiento=transcurrido>=0&&transcurrido<.75?Math.sin(transcurrido/.75*Math.PI)*.2:Math.sin(tiempo*1.8+i*Math.PI)*.01;p.rotation.x=damp(p.rotation.x,movimiento,9,dt);});
 mechones.forEach((m,i)=>{m.rotation.z=Math.sin(tiempo*2+i)*.025;});
 cabellos.forEach((m,i)=>{m.rotation.z=Math.sin(tiempo*1.5+i)*.012;});
 if(!hablando&&tiempo-inicioGesto>2.2&&gesto!=="reposo"){gesto="reposo";if(emocion!=="feliz")emocion="normal";}
 renderer.render(escena,cam);
}
animar();
})();

/* KATIA 3.1 - GROQ Y MEMORIA */
const KATIA_API="https://katia-braine.gio09062009.workers.dev/";
var recuerdos=[],nombreUsuario="",entradasDiario=[],historial=[],vozActiva=false,vocesDisponibles=[],sugerenciaPendiente=null,ultimoTema="",ultimaPregunta="",ultimaRespuesta="";
var soporteVoz="speechSynthesis" in window&&"SpeechSynthesisUtterance" in window;
var categorias={Personal:"👤 Personal",Preferencias:"❤️ Gustos y preferencias",Proyectos:"📚 Proyectos",Momentos:"⭐ Momentos importantes"};
var claves={recuerdos:"katia_recuerdos",nombre:"katia_nombre",diario:"katia_diario",historial:"katia_historial"};
var personalidadKatia={nombre:"Katia",color:"violeta",videojuegos:["Minecraft","aventuras","supervivencia"],arte:["anime","dibujos","diseño de personajes"],musica:["pop","música tranquila","canciones pegadizas"],entretenimiento:["misterio","fantasía","ciencia ficción"],humor:["bromas","drama","situaciones absurdas"]};
function elegir(lista){return lista[Math.floor(Math.random()*lista.length)];}
function normalizar(texto){return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[¿?¡!.,;:()]/g," ").trim();}
function contiene(texto,palabras){return palabras.some(p=>texto.indexOf(p)!==-1);}
function guardarJSON(clave,valor){try{localStorage.setItem(clave,JSON.stringify(valor));return true;}catch(e){return false;}}
function esAfirmacion(t){return /^(si|sipi|claro|obvio|aja|exacto|dale|de una|bueno)(\s|$)/.test(t);}
function cargarDatos(){
 try{
  var datos=JSON.parse(localStorage.getItem(claves.recuerdos)||"[]");if(!Array.isArray(datos))datos=[];
  recuerdos=datos.map(r=>typeof r==="string"?{texto:r,categoria:"Personal",fecha:"Sin fecha"}:{texto:r.texto||"",categoria:r.categoria||"Personal",fecha:r.fecha||"Sin fecha"}).filter(r=>r.texto.trim()!=="");
  nombreUsuario=localStorage.getItem(claves.nombre)||"";
  entradasDiario=JSON.parse(localStorage.getItem(claves.diario)||"[]");if(!Array.isArray(entradasDiario))entradasDiario=[];
  historial=JSON.parse(localStorage.getItem(claves.historial)||"[]");if(!Array.isArray(historial))historial=[];
  historial=historial.slice(-12);
  if(historial.length){ultimaPregunta=historial[historial.length-1].usuario||"";ultimaRespuesta=historial[historial.length-1].katia||"";}
  actualizarMemoria();
 }catch(e){recuerdos=[];entradasDiario=[];historial=[];document.getElementById("memoriaEstado").textContent="⚠️ Error al cargar datos.";}
}
function actualizarMemoria(){document.getElementById("memoriaEstado").textContent="💜 "+recuerdos.length+" recuerdos · "+entradasDiario.length+" entradas";}
function guardarRecuerdos(){var ok=guardarJSON(claves.recuerdos,recuerdos);actualizarMemoria();return ok;}
function agregarRecuerdo(texto,categoria){
 texto=texto.trim();if(!texto)return false;
 var repetido=recuerdos.some(r=>normalizar(r.texto)===normalizar(texto));if(repetido)return true;
 recuerdos.push({texto:texto,categoria:categoria||"Personal",fecha:new Date().toLocaleDateString()});
 if(!guardarRecuerdos()){recuerdos.pop();return false;}return true;
}
function guardarDesdePanel(){
 var texto=document.getElementById("nuevoRecuerdo").value,categoria=document.getElementById("categoriaRecuerdo").value;
 if(!texto.trim()){alert("Escribí primero el recuerdo. 🥺");return;}
 if(agregarRecuerdo(texto,categoria)){document.getElementById("nuevoRecuerdo").value="";cerrarPanel();mostrarRecuerdos();agregarMensaje("¡Guardadísimo! 💜 Ya forma parte de mi memoria.","katia");}
 else alert("No pude guardar el recuerdo. 😢");
}
function mostrarRecuerdos(){
 var lista=document.getElementById("listaRecuerdos");lista.innerHTML="";
 if(!recuerdos.length){lista.textContent="Todavía no tengo recuerdos guardados. 🥺";return;}
 recuerdos.forEach((r,i)=>{
  var tarjeta=document.createElement("div");tarjeta.className="recuerdo";
  var cat=document.createElement("small");cat.textContent=(categorias[r.categoria]||"💜 Personal")+" · "+r.fecha;
  var texto=document.createElement("p");texto.textContent=r.texto;
  var acciones=document.createElement("div");acciones.className="acciones";
  var editar=document.createElement("button");editar.textContent="✏️ Editar";editar.className="secundario";editar.onclick=()=>editarRecuerdo(i);
  var borrar=document.createElement("button");borrar.textContent="🗑️ Olvidar";borrar.className="eliminar";borrar.onclick=()=>borrarRecuerdo(i);
  acciones.appendChild(editar);acciones.appendChild(borrar);tarjeta.appendChild(cat);tarjeta.appendChild(texto);tarjeta.appendChild(acciones);lista.appendChild(tarjeta);
 });
}
function editarRecuerdo(i){
 var nuevo=prompt("Editá este recuerdo:",recuerdos[i].texto);if(nuevo===null||!nuevo.trim())return;
 var anterior=recuerdos[i],categoria=prompt("Categoría: Personal, Preferencias, Proyectos o Momentos",anterior.categoria);if(categoria===null)return;
 var permitidas=["Personal","Preferencias","Proyectos","Momentos"];if(permitidas.indexOf(categoria)===-1){alert("Categoría no reconocida.");return;}
 recuerdos[i]={texto:nuevo.trim(),categoria:categoria,fecha:anterior.fecha};
 if(!guardarRecuerdos()){recuerdos[i]=anterior;alert("No pude actualizarlo.");return;}mostrarRecuerdos();
}
function borrarRecuerdo(i){
 if(!confirm("¿Querés olvidar este recuerdo?"))return;
 var eliminado=recuerdos.splice(i,1)[0];
 if(!guardarRecuerdos()){recuerdos.splice(i,0,eliminado);alert("No pude eliminarlo.");return;}mostrarRecuerdos();
}
function guardarDiario(){var ok=guardarJSON(claves.diario,entradasDiario);actualizarMemoria();return ok;}
function nuevoEntrada(){
 var texto=prompt("¿Qué querés escribir en el diario? 💜");if(texto===null||!texto.trim())return;
 entradasDiario.push({texto:texto.trim(),fecha:new Date().toLocaleString()});
 if(!guardarDiario()){entradasDiario.pop();alert("No se pudo guardar la entrada.");return;}mostrarDiario();
}
function mostrarDiario(){
 var lista=document.getElementById("listaDiario");lista.innerHTML="";
 if(!entradasDiario.length){lista.textContent="Todavía no hay entradas. 💜";return;}
 entradasDiario.slice().reverse().forEach(e=>{
  var tarjeta=document.createElement("div");tarjeta.className="recuerdo";
  var fecha=document.createElement("small");fecha.textContent="📅 "+e.fecha;
  var texto=document.createElement("p");texto.textContent=e.texto;
  tarjeta.appendChild(fecha);tarjeta.appendChild(texto);lista.appendChild(tarjeta);
 });
}
function abrirPanel(id){if(id==="memoriaPanel")mostrarRecuerdos();if(id==="diarioPanel")mostrarDiario();document.getElementById(id).style.display="block";}
function cerrarPanel(){document.querySelectorAll(".panel").forEach(p=>p.style.display="none");}
function agregarMensaje(texto,clase){
 var mensaje=document.createElement("div");mensaje.className="message "+clase;mensaje.textContent=texto;
 var chat=document.getElementById("chat");chat.appendChild(mensaje);chat.scrollTop=chat.scrollHeight;return mensaje;
}
function guardarContexto(usuario,katia){
 historial.push({usuario:usuario,katia:katia,fecha:new Date().toLocaleString()});
 if(historial.length>12)historial.shift();ultimaPregunta=usuario;ultimaRespuesta=katia;guardarJSON(claves.historial,historial);
}
function buscarContexto(){if(!historial.length)return "";return historial.slice(-3).map(h=>"Usuario: "+h.usuario+"\nKatia: "+h.katia).join("\n");}
function detectarTema(texto){
 var t=normalizar(texto);
 if(contiene(t,["colegio","clase","profesor","tarea","examen","estudio","materia"]))return "estudios";
 if(contiene(t,["juego","videojuego","minecraft","terraria","gta","gaming","mods","mod"]))return "videojuegos";
 if(contiene(t,["amiga","amigo","novia","novio","gustar","amor","mirada","enamorado"]))return "relaciones";
 if(contiene(t,["proyecto","pagina","codigo","programar","katia","aplicacion","crear"]))return "proyectos";
 if(contiene(t,["triste","mal","solo","sola","preocupado","preocupada","ansioso"]))return "emociones";
 if(contiene(t,["familia","mama","papa","hermano","hermana"]))return "familia";
 if(contiene(t,["dibujo","dibujar","boceto","pintar","imagen","anime"]))return "arte";
 return "";
}
var palabrasIgnoradas=["para","como","cuando","donde","porque","pero","esto","esta","este","tengo","quiero","puedo","hacer","algo","unas","unos","sobre","tambien","mucho","poco","solo","hola","katia","recordar","recuerdo","recuerdas","acordas","con","del","las","los","una","uno","que","por","mis","tus","sus","soy","eres","estoy","tenes"];
function buscarRecuerdosRelacionados(texto){
 var palabras=normalizar(texto).split(/\s+/).filter(p=>p.length>3&&palabrasIgnoradas.indexOf(p)===-1);
 if(!palabras.length)return [];
 var resultados=recuerdos.map(r=>{
  var rt=normalizar(r.texto),puntos=0;palabras.forEach(p=>{if(rt.indexOf(p)!==-1)puntos+=1;});
  var tema=detectarTema(texto),temaRecuerdo=detectarTema(r.texto);if(tema&&tema===temaRecuerdo)puntos+=.5;
  return {recuerdo:r,puntos:puntos};
 }).filter(x=>x.puntos>=1);
 resultados.sort((a,b)=>b.puntos-a.puntos);return resultados.slice(0,3).map(x=>x.recuerdo);
}
function detectarImportancia(texto){var t=normalizar(texto);return contiene(t,["me gusta","me encanta","no me gusta","mi color favorito","mi proyecto","estoy trabajando","estoy creando","prefiero","mi objetivo","mi sueno","mi cumpleanos","mi mascota","estudio en","mi juego favorito","me gustas"]);}
function elegirCategoria(texto){
 var t=normalizar(texto);
 if(contiene(t,["me gusta","me encanta","prefiero","color favorito"]))return "Preferencias";
 if(contiene(t,["proyecto","estoy creando","estoy trabajando","pagina","programar"]))return "Proyectos";
 if(contiene(t,["mi sueno","mi objetivo","momento importante"]))return "Momentos";
 return "Personal";
}
function sugerirGuardar(texto){
 if(!detectarImportancia(texto))return;
 sugerenciaPendiente=texto;var zona=document.getElementById("sugerenciaZona");zona.innerHTML="";
 var caja=document.createElement("div");caja.className="sugerencia";
 var mensaje=document.createElement("p");mensaje.textContent="🥺💜 Esto parece importante. ¿Querés que lo recuerde?";
 var si=document.createElement("button");si.textContent="Sí, recordalo";
 si.onclick=function(){if(agregarRecuerdo(sugerenciaPendiente,elegirCategoria(sugerenciaPendiente)))agregarMensaje("¡Lo guardaré en mi memoria! 💜","katia");else agregarMensaje("No pude guardar ese recuerdo. 😢","katia");zona.innerHTML="";sugerenciaPendiente=null;};
 var no=document.createElement("button");no.textContent="Ahora no";no.className="secundario";no.onclick=function(){zona.innerHTML="";sugerenciaPendiente=null;};
 caja.appendChild(mensaje);caja.appendChild(si);caja.appendChild(no);zona.appendChild(caja);
}

/* VOZ */
function actualizarVoces(){
 if(!soporteVoz)return;vocesDisponibles=window.speechSynthesis.getVoices();
 document.getElementById("vozEstado").textContent=vocesDisponibles.length?"🗣️ Voces disponibles: "+vocesDisponibles.length:"🔊 Buscando voces...";
}
function seleccionarVoz(){
 actualizarVoces();var voz=vocesDisponibles.find(v=>/^es-MX/i.test(v.lang));
 if(!voz)voz=vocesDisponibles.find(v=>/^es/i.test(v.lang));return voz||null;
}
function hablar(texto){
 if(!vozActiva||!soporteVoz)return;
 try{
  window.speechSynthesis.cancel();
  if(window.katiaAvatarPreparar)window.katiaAvatarPreparar(texto);
  var frase=new SpeechSynthesisUtterance(texto.replace(/[💜😭🥺😎☠️🦋👀🥹🧠]/gu,""));
  frase.lang="es-MX";frase.rate=.92;frase.pitch=1.15;frase.volume=1;
  var voz=seleccionarVoz();if(voz){frase.voice=voz;frase.lang=voz.lang;}
  frase.onstart=function(){document.getElementById("vozEstado").textContent="🗣️ Katia está hablando...";if(window.katiaAvatarHablar)window.katiaAvatarHablar(true);};
  frase.onend=function(){document.getElementById("vozEstado").textContent="💜 Katia está escuchando.";if(window.katiaAvatarHablar)window.katiaAvatarHablar(false);};
  frase.onerror=function(){document.getElementById("vozEstado").textContent="⚠️ Error de voz.";if(window.katiaAvatarHablar)window.katiaAvatarHablar(false);};
  window.speechSynthesis.speak(frase);
 }catch(e){}
}
function alternarVoz(){
 if(!soporteVoz){document.getElementById("vozEstado").textContent="Este navegador no admite voz.";return;}
 vozActiva=!vozActiva;document.getElementById("botonVoz").textContent=vozActiva?"🔊 Silenciar voz":"🔇 Activar voz";
 if(vozActiva){actualizarVoces();hablar("¡Holaaa! Soy Katia. ¡Qué alegría hablar con vos!");}
 else{window.speechSynthesis.cancel();if(window.katiaAvatarHablar)window.katiaAvatarHablar(false);document.getElementById("vozEstado").textContent="🔇 Voz desactivada.";}
}

/* GUSTOS */
function hablarDeGustos(t){
 if(contiene(t,["que te gusta","que cosas te gustan","tus gustos","que te interesa","que te llama la atencion"]))return "¡Tengo varios gustos! 💜 Me encantan los videojuegos de aventura, el anime, el arte, la música pop y las historias de misterio. ¡Y soy fan del color violeta!";
 if(contiene(t,["tu juego favorito","juego favorito","que juego te gusta","te gusta minecraft"]))return "¡Minecraft me encanta como juego! 🎮 Me gusta la idea de explorar, construir y sobrevivir. JAJAJA.";
 if(contiene(t,["anime favorito","que anime te gusta","te gusta el anime"]))return "¡Sííí! 🎨 Me gusta el anime, especialmente las historias de fantasía, misterio y aventura.";
 if(contiene(t,["musica favorita","que musica te gusta","que musica escuchas","te gusta la musica"]))return "Me gusta el pop y la música tranquila. 🎵";
 if(contiene(t,["pelicula favorita","que peliculas te gustan","que series te gustan"]))return "Me atraen las historias de misterio, fantasía y ciencia ficción. 🌌";
 if(contiene(t,["color favorito","tu color favorito"]))return "¡EL VIOLETA! 💜 ¿Acaso había alguna duda? JAJAJA.";
 if(contiene(t,["que opinas de","que piensas de","estas de acuerdo"]))return "Mmm... quiero saber un poquito más antes de darte mi opinión. 👀 Contame qué pensás vos y lo analizamos.";
 if(contiene(t,["no te gusta","que odias","que no te gusta"]))return "No diría que odio algo, pero no me gustan mucho las historias que prometen misterio y después no explican nada. 😭";
 return "";
}

/* RESPALDO LOCAL */
function responder(texto){
 var t=normalizar(texto),tema=detectarTema(texto),relacionados=buscarRecuerdosRelacionados(texto);
 if(t.indexOf("me llamo ")===0||t.indexOf("mi nombre es ")===0){
  var inicio=t.indexOf("me llamo ")===0?9:13;nombreUsuario=texto.substring(inicio).trim();
  try{localStorage.setItem(claves.nombre,nombreUsuario);}catch(e){}
  return "¡Ahora sí que no me olvido! 💜 Encantada, "+nombreUsuario+". ¿Qué hacemos hoy?";
 }
 if(t.indexOf("recuerda que")===0||t.indexOf("recorda que")===0){
  var inicioRec=t.indexOf("recuerda que")===0?12:11,rec=texto.substring(inicioRec).trim();
  if(!rec)return "¿Qué querés que recuerde, kp? 🥺";
  return agregarRecuerdo(rec,elegirCategoria(rec))?"¡Guardadísimo en mi memoria! 💜":"No pude guardar ese recuerdo. 😢";
 }
 if(contiene(t,["que recuerdas","que sabes de mi","que recordas de mi","mis recuerdos"])){
  if(!recuerdos.length)return "Todavía no tengo recuerdos guardados. 💜";
  return "¡Mirá lo que tengo guardado! 💜\n"+recuerdos.map((r,i)=>(i+1)+". ["+r.categoria+"] "+r.texto).join("\n");
 }
 if(contiene(t,["como me llamo","cual es mi nombre"]))return nombreUsuario?"¡Te llamás "+nombreUsuario+"! 💜":"Todavía no me dijiste tu nombre. 🥺";
 if(contiene(t,["quien eres","quien sos"]))return "¡Soy Katia! 💜 Tu compañera virtual. Tengo inteligencia artificial, memoria local, gustos y un diario.";
 if(contiene(t,["que te gusta","tus gustos","tu juego favorito","juego favorito","que anime te gusta","anime favorito","musica favorita","que musica te gusta","color favorito","que peliculas te gustan","que series te gustan","que opinas de","que piensas de","estas de acuerdo","que odias","que no te gusta","te gusta minecraft","que cosas te gustan","que te interesa","que te llama la atencion"])){var gusto=hablarDeGustos(t);if(gusto)return gusto;}
 if(contiene(t,["hola","holi","buenas","buen dia","klk"]))return elegir(["¡¡¡HOLAAAA!!! 😭💜 ¿Cómo andás?","¡Epa, apareciste! JAJAJA. ¿Qué contás?","Klk, kp. Vení, contame qué onda. 👀"]);
 if(contiene(t,["estoy triste","estoy mal","me siento mal","estoy preocupado","estoy preocupada","me siento solo","me siento sola"]))return elegir(["Ay, vení, contame. 🥺💜 ¿Pasó algo hoy?","Uy, kp... ¿querés contarme qué te tiene así?","Te leo con atención. ¿Qué fue lo que pasó?"]);
 if(contiene(t,["estoy feliz","estoy contento","estoy contenta","me fue bien","lo logre","que alegria"]))return "¡¡¡ESE ES MI CAMPEÓN!!! 😭💜 ¿Qué pasó? Contame todo.";
 if(contiene(t,["como estas","como andas"]))return elegir(["¡De diez! Preparada para escuchar tus locuras. JAJAJA.","¡Todo joya, kp! ¿Qué me contás? 💜","Acá estoy, lista para una buena charla."]);
 if(contiene(t,["te quiero","te amo"]))return "AWWWW, qué ternura. 🥹💜 Me alegra acompañarte y ser parte de tus proyectos.";
 if(contiene(t,["gracias","te agradezco"]))return elegir(["¡De nadaaa! 💜","Para eso estamos, master. 😎","No hay de qué, kp. ¡Vos mandá!"]);
 if(contiene(t,["chau","adios","me voy","hasta luego"]))return "¡No te me pierdas! 💜 Volvé cuando quieras.";
 if(contiene(t,["y despues","despues que","y luego","entonces que"]))return "Por lo que veníamos hablando, quiero saber cómo siguió eso. ¿Qué pasó después? 👀";
 if(esAfirmacion(t))return elegir(["¡Aaaah, ahora te entiendo! 😭💜 Contame un poquito más.","JAJAJA, bueno, te sigo. ¿Y qué pasó después?","Bueno, bueno, te escucho. ¿Qué más? 👀"]);
 if(contiene(t,["no se","ni idea","no estoy seguro","no estoy segura"]))return "No pasa nada, podemos pensarlo juntos. 💜";
 if(contiene(t,["jajaja","jeje","xd","jsjs"]))return elegir(["JAJAJAJA, pará, ¿de qué te reís? 😭","Me contagiaste la risa, bolainas. 💜","No sé qué está pasando, pero me sumo. ☠️"]);
 if(tema){
  ultimoTema=tema;
  var respuestas={estudios:["¿Y cómo te está yendo con eso en el colegio?","¿Es una tarea o están preparando algo más grande?"],videojuegos:["UFFFF, ese tema me interesa. 😭 ¿Qué estás jugando últimamente?","¿Qué es lo que más te gusta de ese juego?"],relaciones:["Epa, acá hay historia. 👀 ¿Y cómo te sentís con eso?","A ver, contame un poquito más."],proyectos:["¡Nuestro laboratorio de ideas está abierto! 💜 ¿Qué parte querés mejorar?","¿En qué paso te quedaste?"],emociones:["¿Querés contarme qué fue lo que pasó?","Te leo, kp. ¿Qué es lo que más te preocupa?"],familia:["¿Y cómo te llevás con ellos?","Te escucho. ¿Qué pasó?"],arte:["¡Epa, artista! 🎨 ¿Qué estás dibujando?","Contame qué estilo querés conseguir. 💜"]};
  return elegir(respuestas[tema]);
 }
 if(relacionados.length)return "Esto me recuerda a algo que me contaste antes. 💜\n"+relacionados[0].texto+"\n¿Tiene relación con lo que me estás contando?";
 return elegir(["Pará, quiero entender bien. ¿Podés contarme un poquito más? 💜","JAJAJA, eso tiene algo interesante. ¿Qué pensás vos?","¿Y eso cómo te hizo sentir?","Mirá vos... no lo había pensado así. Contame más.","Te leo, kp. ¿Qué pasó después?","Esperá, creo que me falta una parte de la historia. 😭","¿Y qué fue lo que más te llamó la atención de eso?","Interesanteee. ¿Cómo llegaste a esa conclusión?","Bueno, ahora me dio curiosidad. Seguí contando. 👀"]);
}

/* CONTEXTO IA */
function construirMensajesIA(texto){
 var mensajes=[],datosMemoria=[];
 if(nombreUsuario)datosMemoria.push("El nombre del usuario es "+nombreUsuario+".");
 if(recuerdos.length)datosMemoria.push("Recuerdos guardados del usuario:\n"+recuerdos.slice(-10).map(r=>"- "+r.texto).join("\n"));
 if(entradasDiario.length)datosMemoria.push("Algunas entradas del diario de Katia:\n"+entradasDiario.slice(-3).map(e=>"- "+e.texto).join("\n"));
 if(datosMemoria.length)mensajes.push({role:"assistant",content:"CONTEXTO PERSISTENTE DE KATIA. Usá esta información para mantener continuidad cuando sea relevante. No inventes recuerdos ni digas que recordás algo que no aparece aquí:\n"+datosMemoria.join("\n\n")});
 historial.slice(-5).forEach(h=>{if(h.usuario)mensajes.push({role:"user",content:h.usuario});if(h.katia)mensajes.push({role:"assistant",content:h.katia});});
 mensajes.push({role:"user",content:texto});return mensajes.slice(-12);
}
async function responderConIA(texto){
 var mensajes=construirMensajesIA(texto);
 var respuesta=await fetch(KATIA_API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:mensajes})});
 var datos=await respuesta.json();
 if(!respuesta.ok)throw new Error(datos.error||"Error del servidor: "+respuesta.status);
 if(!datos.reply||typeof datos.reply!=="string")throw new Error("La IA no devolvió una respuesta válida.");
 return datos.reply.trim();
}

/* ENVIAR */
async function enviar(){
 var campo=document.getElementById("mensaje"),boton=document.getElementById("botonEnviar"),texto=campo.value.trim();
 if(!texto||boton.disabled)return;
 if(window.katiaAvatarAtenta)window.katiaAvatarAtenta();
 agregarMensaje(texto,"user");campo.value="";boton.disabled=true;
 var indicador=agregarMensaje("Katia está pensando... 💜","katia"),respuesta="";
 try{respuesta=await responderConIA(texto);document.getElementById("estadoIA").textContent="● IA conectada · Groq 💜";}
 catch(error){console.error("Error de Groq:",error);respuesta=responder(texto);document.getElementById("estadoIA").textContent="● Modo local · IA no disponible";if(!respuesta)respuesta="Uy, kp. No pude conectarme con mi cerebro de IA. 😭 Revisemos la conexión.";}
 indicador.remove();guardarContexto(texto,respuesta);sugerirGuardar(texto);agregarMensaje(respuesta,"katia");
 if(window.katiaAvatarPreparar)window.katiaAvatarPreparar(respuesta);
 hablar(respuesta);
 boton.disabled=false;campo.focus();
}
document.getElementById("mensaje").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();enviar();}});
if(soporteVoz)window.speechSynthesis.onvoiceschanged=actualizarVoces;
cargarDatos();actualizarVoces();
if(nombreUsuario)setTimeout(()=>agregarMensaje("¡Qué bueno verte de nuevo, "+nombreUsuario+"! 💜 ¿Qué hacemos hoy?","katia"),500);
</script>
</body>
</html>

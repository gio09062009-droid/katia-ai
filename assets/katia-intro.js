/* KATIA AI · Intro cinematográfica de partículas + escáner */
(()=> {
 "use strict";
 const STYLE_ID="katia-cinematic-intro-style";
 let started=false;
 const css=`
 #katiaCinematicIntro{position:fixed;inset:0;z-index:100001;display:grid;place-items:center;overflow:hidden;background:radial-gradient(ellipse at 50% 48%,#24103f 0%,#10091f 43%,#05030b 100%);opacity:1;transition:opacity .8s ease}
 #katiaCinematicIntro.kci-leaving{opacity:0;pointer-events:none}
 #katiaCinematicIntro:before,#katiaCinematicIntro:after{content:"";position:absolute;width:min(78vw,520px);height:min(78vw,520px);border:1px solid #9d4dff35;border-radius:50%;box-shadow:0 0 50px #8b35df16,inset 0 0 50px #8b35df12;animation:kciOrbit 18s linear infinite}
 #katiaCinematicIntro:after{width:min(92vw,620px);height:min(92vw,620px);border-style:dashed;border-color:#c084fc25;animation-duration:32s;animation-direction:reverse}
 #katiaCinematicIntro canvas{position:relative;z-index:2;width:min(94vw,760px);height:auto;max-height:48vh;overflow:visible}
 #katiaCinematicIntro .kci-glow{position:absolute;width:45vw;height:45vw;max-width:360px;max-height:360px;border-radius:50%;background:#922be8;filter:blur(100px);opacity:.12;animation:kciPulse 3s ease-in-out infinite}
 #katiaCinematicIntro .kci-stars{position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(2px 2px at 15% 25%,#d9b5ff99 50%,transparent 100%),radial-gradient(1px 1px at 72% 18%,#fff9 50%,transparent 100%),radial-gradient(2px 2px at 84% 72%,#b56cff99 50%,transparent 100%),radial-gradient(1px 1px at 28% 80%,#fff8 50%,transparent 100%),radial-gradient(1px 1px at 55% 12%,#d8a5ff99 50%,transparent 100%);opacity:.75}
 @keyframes kciOrbit{to{transform:rotate(360deg)}}@keyframes kciPulse{50%{transform:scale(1.22);opacity:.2}}
 @media(prefers-reduced-motion:reduce){#katiaCinematicIntro:before,#katiaCinematicIntro:after,#katiaCinematicIntro .kci-glow{animation:none}}
 `;
 function addStyle(){if(document.getElementById(STYLE_ID))return;const s=document.createElement("style");s.id=STYLE_ID;s.textContent=css;document.head.appendChild(s)}
 function launch(){
  if(started)return;
  const gate=document.getElementById("visitorGate"),app=document.querySelector(".app");
  if(!app||!app.classList.contains("visitor-ready"))return;
  if(gate&&!gate.hidden&&gate.style.display!=="none")return;
  started=true;addStyle();app.style.visibility="hidden";
  const layer=document.createElement("div");layer.id="katiaCinematicIntro";layer.setAttribute("role","img");layer.setAttribute("aria-label","Presentación animada de KATIA");
  layer.innerHTML='<div class="kci-stars"></div><div class="kci-glow"></div><canvas aria-hidden="true"></canvas>';
  document.body.appendChild(layer);
  // Sonido ambiental de viento generado localmente con Web Audio API.
  // Se intenta iniciar tras el toque del usuario en "Entrar a Katia".
  let soundStarted=false,audioContext=null;
  function playWind(){
   if(soundStarted)return;
   const AudioCtx=window.AudioContext||window.webkitAudioContext;
   if(!AudioCtx)return;
   try{
    audioContext=audioContext||new AudioCtx();
    const ctxAudio=audioContext;
    const begin=()=>{
     if(soundStarted||ctxAudio.state!=="running")return;
     soundStarted=true;
     const nowAudio=ctxAudio.currentTime;
     const buffer=ctxAudio.createBuffer(1,Math.floor(ctxAudio.sampleRate*4.9),ctxAudio.sampleRate);
     const data=buffer.getChannelData(0);
     for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*0.55;
     const noise=ctxAudio.createBufferSource();noise.buffer=buffer;
     const low=ctxAudio.createBiquadFilter();low.type="lowpass";low.frequency.setValueAtTime(260,nowAudio);low.frequency.exponentialRampToValueAtTime(1050,nowAudio+2.7);low.frequency.exponentialRampToValueAtTime(180,nowAudio+4.7);
     const high=ctxAudio.createBiquadFilter();high.type="highpass";high.frequency.value=110;
     const volume=ctxAudio.createGain();volume.gain.setValueAtTime(0.001,nowAudio);volume.gain.linearRampToValueAtTime(0.105,nowAudio+0.65);volume.gain.setValueAtTime(0.085,nowAudio+2.8);volume.gain.exponentialRampToValueAtTime(0.001,nowAudio+4.8);
     noise.connect(low);low.connect(high);high.connect(volume);volume.connect(ctxAudio.destination);
     noise.start(nowAudio);noise.stop(nowAudio+4.85);
     noise.onended=()=>{try{ctxAudio.close()}catch(e){}};
    };
    const resume=ctxAudio.state==="running"?Promise.resolve():ctxAudio.resume();
    resume.then(begin).catch(()=>{});
    // Algunos navegadores Android exigen un gesto directo para habilitar audio.
    if(ctxAudio.state!=="running"){
     const unlock=()=>{ctxAudio.resume().then(begin).catch(()=>{});};
     layer.addEventListener("pointerdown",unlock,{once:true});
     layer.addEventListener("touchstart",unlock,{once:true,passive:true});
     layer.addEventListener("keydown",unlock,{once:true});
    }
   }catch(e){}
  }
  playWind();
  const canvas=layer.querySelector("canvas"),ctx=canvas.getContext("2d");
  const W=760,H=250,D=Math.min(window.devicePixelRatio||1,1.5);
  canvas.width=W*D;canvas.height=H*D;ctx.scale(D,D);
  const mask=document.createElement("canvas");mask.width= W;mask.height=H;
  const mctx=mask.getContext("2d");mctx.clearRect(0,0,W,H);
  mctx.fillStyle="#fff";mctx.textAlign="center";mctx.textBaseline="middle";
  mctx.font="900 150px Arial, sans-serif";mctx.fillText("KATIA",W/2,H/2+3);
  const pixels=mctx.getImageData(0,0,W,H).data,targets=[];
  for(let y=0;y<H;y+=4){for(let x=0;x<W;x+=4){if(pixels[(y*W+x)*4+3]>120)targets.push({x,y})}}
  for(let i=targets.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[targets[i],targets[j]]=[targets[j],targets[i]]}
  const count=Math.min(620,targets.length),particles=[];
  for(let i=0;i<count;i++){const t=targets[i];const angle=Math.random()*Math.PI*2,dist=180+Math.random()*380;particles.push({x:W/2+Math.cos(angle)*dist,y:H/2+Math.sin(angle)*dist,tx:t.x,ty:t.y,r:.8+Math.random()*1.5,phase:Math.random()*6.28})}
  const start=performance.now(),duration=4700,reduced=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function frame(now){
   if(!document.body.contains(layer))return;
   const elapsed=now-start,progress=reduced?1:Math.min(1,Math.max(0,(elapsed-250)/2450));
   ctx.clearRect(0,0,W,H);
   const ease=1-Math.pow(1-progress,3);
   // Ráfagas diagonales de viento que acompañan la llegada de las partículas.
   const windPower=Math.max(0,1-progress)*Math.max(0,Math.min(1,(elapsed-100)/500));
   ctx.save();ctx.globalCompositeOperation="lighter";
   for(let i=0;i<34;i++){
    const seed=i*97.3;
    const speed=0.22+(i%5)*0.055;
    const travel=((now*speed+seed)%(W+220))-110;
    const y=28+((i*53)%194)+Math.sin(now/420+i)*9;
    const length=24+(i%6)*13;
    const alpha=(0.08+(i%4)*0.025)*windPower;
    const gust=ctx.createLinearGradient(travel-length,y+length*.22,travel+length,y-length*.22);
    gust.addColorStop(0,"rgba(170,110,255,0)");
    gust.addColorStop(.5,"rgba(220,190,255,"+alpha+")");
    gust.addColorStop(1,"rgba(255,255,255,0)");
    ctx.strokeStyle=gust;ctx.lineWidth=1+(i%3)*.35;
    ctx.beginPath();ctx.moveTo(travel-length,y+length*.22);ctx.quadraticCurveTo(travel,y,travel+length,y-length*.22);ctx.stroke();
   }
   ctx.restore();
   for(const p of particles){
    const gust=Math.max(0,1-progress);
    const drift=Math.sin(now/650+p.phase)*2*gust + Math.sin(now/360+p.phase)*5*gust;
    const windX=-22*gust + Math.sin(now/500+p.phase)*3*gust;
    const x=p.x+(p.tx-p.x)*ease+windX,y=p.y+(p.ty-p.y)*ease+drift;
    ctx.beginPath();ctx.arc(x,y,p.r,0,Math.PI*2);ctx.fillStyle="rgba(210,157,255,"+(.45+.55*progress)+")";ctx.shadowBlur=progress>0.75?13:7;ctx.shadowColor="#b65cff";ctx.fill();
   }
   ctx.shadowBlur=0;
   if(elapsed>2450&&elapsed<3650){
    const scan=Math.min(1,(elapsed-2450)/1050)*W;
    const grad=ctx.createLinearGradient(scan-32,0,scan+32,0);grad.addColorStop(0,"rgba(196,132,252,0)");grad.addColorStop(.5,"rgba(255,255,255,.95)");grad.addColorStop(1,"rgba(168,85,247,0)");
    ctx.fillStyle=grad;ctx.fillRect(scan-32,30,64,H-60);
    ctx.fillStyle="rgba(216,180,254,.9)";ctx.fillRect(scan,38,1.5,H-76);
   }
   if(elapsed<duration)requestAnimationFrame(frame);
   else{
    layer.classList.add("kci-leaving");
    setTimeout(()=>{layer.remove();app.style.visibility="";},850);
   }
  }
  requestAnimationFrame(frame);
 }
 function check(){launch()}
 function init(){
  const app=document.querySelector(".app"),gate=document.getElementById("visitorGate");
  if(!app)return;
  const observer=new MutationObserver(check);
  observer.observe(app,{attributes:true,attributeFilter:["class"]});
  if(gate)observer.observe(gate,{attributes:true,attributeFilter:["hidden","style"]});
  check();
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
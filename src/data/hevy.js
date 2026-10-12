import { fechaLocal } from "../lib/util.js";
import {REGLAS,MESES} from "./constants.js";
const nSeg=e=>{const t=parseFloat(String(e==null?"":e).replace(",",".").replace(/[^0-9.\-]/g,""));return Number.isFinite(t)?t:0};
const uid=()=>Math.random().toString(36).slice(2,10);
export function grupoDeEjercicio(e){
    const a=String(e||"");
    for(const[n,s]of REGLAS)if(n.test(a))return s;
    return"Core"
  }
export function leerCSV(e){
    const a=[];
    let n="",s=[],o=!1;
    const i=e.replace(/\r\n/g,`
`).replace(/\r/g,`
`);
    for(let t=0;
    t<i.length;
    t++){
      const r=i[t];
      o?r==='"'&&i[t+1]==='"'?(n+='"',t++):r==='"'?o=!1:n+=r:r==='"'?o=!0:r===","?(s.push(n),n=""):r===`
`?(s.push(n),a.push(s),s=[],n=""):n+=r
    }
    if((n||s.length)&&(s.push(n),a.push(s)),!a.length)return[];
    const c=a[0].map(t=>t.trim());
    return a.slice(1).filter(t=>t.length>1).map(t=>{
      const r={
      }
      ;
      return c.forEach((A,g)=>r[A]=(t[g]||"").trim()),r
    }
    )
  }
export function fechaHevy(e){
    if(!e)return null;
    let a=String(e).match(/^(\d{1,2})\s+([a-zA-Zé]+)\.?\s+(\d{4})/);
    if(a){
      const s=MESES[a[2].toLowerCase().slice(0,4)]??MESES[a[2].toLowerCase().slice(0,3)];
      if(s!==void 0)return new Date(Date.UTC(+a[3],s,+a[1])).toISOString().slice(0,10)
    }
    if(a=String(e).match(/^(\d{4})-(\d{2})-(\d{2})/),a)return`${a[1]}-${a[2]}-${a[3]}`;
    const n=new Date(e);
    return isNaN(n)?null:fechaLocal(n)
  }
export function analizarHevy(e){
    const a=leerCSV(e);
    if(!a.length)throw new Error("El archivo est\xE1 vac\xEDo o no es un CSV");
    const n=(p,...h)=>{
      for(const u of h)if(p[u]!==void 0)return p[u];
      return""
    }
    ;
    if(!a[0].exercise_title&&!a[0].title)throw new Error("No parece la exportaci\xF3n de Hevy: faltan las columnas esperadas");
    const s=new Map;
    a.forEach(p=>{
      const h=n(p,"exercise_title"),u=nSeg(n(p,"weight_kg","weight_lbs")),l=Math.round(nSeg(n(p,"reps")));
      if(!h||!l)return;
      const x=fechaHevy(n(p,"start_time"));
      if(!x)return;
      const d=n(p,"title")||"Entrenamiento",f=x+"|"+d;
      s.has(f)||s.set(f,{
        fecha:x,dia:d,series:[]
      }
      );
      const L=nSeg(n(p,"rpe"))||NaN,C=/fail/i.test(n(p,"set_type"));
      s.get(f).series.push({
        ejercicio:h,grupo:grupoDeEjercicio(h),serie:(parseInt(n(p,"set_index"),10)||0)+1,peso:u,reps:l,rpe:!isNaN(L)&&L>0?L:C?10:8
      }
      )
    }
    );
    const o=[...s.values()].sort((p,h)=>p.fecha<h.fecha?-1:1);
    if(!o.length)throw new Error("No se encontr\xF3 ninguna serie con peso y repeticiones");
    const i=new Map;
    o.forEach(p=>i.set(p.dia,p));
    const c=[];
    i.forEach((p,h)=>{
      const u=[];
      p.series.forEach(l=>{
        u.includes(l.ejercicio)||u.push(l.ejercicio)
      }
      ),u.forEach(l=>{
        const x=o.flatMap(z=>z.series.filter(m=>m.ejercicio===l)),d=Math.round(p.series.filter(z=>z.ejercicio===l).length)||3,f=x.map(z=>z.reps).sort((z,m)=>z-m),L=f[Math.floor(f.length*.25)]||8,C=f[Math.floor(f.length*.75)]||12,S=x.reduce((z,m)=>z+m.rpe,0)/x.length;
        c.push({
          id:uid(),dia:h,ejercicio:l,grupo:grupoDeEjercicio(l),series:d,repMin:Math.max(3,L),repMax:Math.max(L+2,C),rpe:Math.min(10,Math.max(6,Math.round(S*2)/2)),video:""
        }
        )
      }
      )
    }
    );
    const t=[...new Set(o.map(p=>p.fecha))].sort(),r=Math.max(1,Math.round((new Date(t[t.length-1])-new Date(t[0]))/6048e5)),A=t.length/r,g=o.reduce((p,h)=>p+h.series.length,0),N=Math.round(g/r),M=t.length>=24&&r>=8?"Avanzado":t.length>=10?"Intermedio":"Principiante",w=M==="Principiante"?4:M==="Intermedio"?5:6,K={
    }
    ;
    o.forEach(p=>p.series.forEach(h=>{
      K[h.grupo]=(K[h.grupo]||0)+1
    }
    ));
    const v=Object.entries(K).map(([p,h])=>({
      grupo:p,series:Math.round(h/r*10)/10
    }
    )).sort((p,h)=>h.series-p.series);
    return{
      sesiones:o,rutina:c,resumen:{
        sesiones:o.length,dias:[...i.keys()],ejercicios:c.length,desde:t[0],hasta:t[t.length-1],semanas:r,frecuencia:Math.round(A*10)/10,seriesSemana:N,nivel:M,semanasMeso:w,seriesSemGrupo:v
      }
    }
  }

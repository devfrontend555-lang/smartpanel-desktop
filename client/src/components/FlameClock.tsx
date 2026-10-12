import { useEffect, useState } from "react";

interface Props { accent?: string; compact?: boolean }

function FlameDigit({ digit, color, compact }: { digit: string; color: string; compact?: boolean }) {
  const W = compact ? 40 : 58;
  const H = compact ? 62 : 88;
  const FS = compact ? 36 : 54;

  const [cur,  setCur]  = useState(digit);
  const [flip, setFlip] = useState(false);

  useEffect(() => {
    if (digit !== cur) {
      setFlip(true);
      const t = setTimeout(() => { setCur(digit); setFlip(false); }, 180);
      return () => clearTimeout(t);
    }
  }, [digit]);

  return (
    <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",width:W,height:H}}>
      <div style={{
        position:"absolute",inset:0,borderRadius:14,
        background:"var(--sp-surface)",
        border:`1px solid var(--sp-border)`,
        boxShadow:`0 8px 32px rgba(0,0,0,0.3),inset 0 1px 0 var(--sp-border)`,
      }}/>
      <div style={{
        position:"absolute",bottom:-5,left:"10%",right:"10%",height:16,
        borderRadius:"50%",
        background:`radial-gradient(ellipse,${color}55 0%,transparent 70%)`,
        filter:"blur(3px)",animation:"glowPulse 1.6s ease-in-out infinite",
      }}/>
      <span style={{
        position:"relative",zIndex:2,
        fontFamily:"'SF Mono','Fira Mono','Consolas',monospace",
        fontSize:FS,fontWeight:700,lineHeight:1,
        color:"var(--sp-text)",
        textShadow:`0 0 16px ${color}cc,0 0 40px ${color}66`,
        transform:flip?"scale(1.18) translateY(-3px)":"scale(1)",
        transition:"transform 0.18s cubic-bezier(0.34,1.56,0.64,1)",
        display:"block",
      }}>{cur}</span>
      {!compact && [0,1,2].map(i=>(
        <div key={i} style={{
          position:"absolute",bottom:8,left:`${22+i*18}%`,
          width:4,height:4,borderRadius:"50%",
          background:color,boxShadow:`0 0 6px ${color}`,
          animation:`particle${i} ${0.75+i*0.18}s ease-out infinite`,
          animationDelay:`${i*0.22}s`,pointerEvents:"none",
        }}/>
      ))}
    </div>
  );
}

function Separator({ color, compact }: { color: string; compact?: boolean }) {
  const size = compact ? 5 : 6;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap: compact?12:16,width: compact?18:24,height: compact?62:88,paddingBottom:4}}>
      {[0,1].map(i=>(
        <div key={i} style={{
          width:size,height:size,borderRadius:"50%",background:color,
          boxShadow:`0 0 10px ${color},0 0 20px ${color}88`,
          animation:"sepBlink 1s ease-in-out infinite",animationDelay:`${i*0.18}s`,
        }}/>
      ))}
    </div>
  );
}

export default function FlameClock({ accent="#FF6B35", compact }: Props) {
  const [t, setT] = useState(new Date());
  useEffect(() => { const id=setInterval(()=>setT(new Date()),1000); return ()=>clearInterval(id); },[]);

  const hh=t.getHours().toString().padStart(2,"0");
  const mm=t.getMinutes().toString().padStart(2,"0");
  const ss=t.getSeconds().toString().padStart(2,"0");

  const DAYS   = ["Yakshanba","Dushanba","Seshanba","Chorshanba","Payshanba","Juma","Shanba"];
  const MONTHS = ["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"];

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap: compact ? 12 : 20}}>
      <style>{`
        @keyframes glowPulse{0%,100%{opacity:.55}50%{opacity:1}}
        @keyframes particle0{0%{transform:translateY(0);opacity:.85}100%{transform:translateY(-30px) translateX(-5px);opacity:0}}
        @keyframes particle1{0%{transform:translateY(0);opacity:.85}100%{transform:translateY(-38px) translateX(3px);opacity:0}}
        @keyframes particle2{0%{transform:translateY(0);opacity:.85}100%{transform:translateY(-24px) translateX(7px);opacity:0}}
        @keyframes sepBlink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.25;transform:scale(.65)}}
      `}</style>
      <div style={{display:"flex",alignItems:"center",gap: compact ? 3 : 4}}>
        <FlameDigit digit={hh[0]} color="#FF6B35" compact={compact}/>
        <FlameDigit digit={hh[1]} color="#FF6B35" compact={compact}/>
        <Separator  color="#FF9050" compact={compact}/>
        <FlameDigit digit={mm[0]} color="#FFB020" compact={compact}/>
        <FlameDigit digit={mm[1]} color="#FFB020" compact={compact}/>
        <Separator  color="#FFD060" compact={compact}/>
        <FlameDigit digit={ss[0]} color={accent} compact={compact}/>
        <FlameDigit digit={ss[1]} color={accent} compact={compact}/>
      </div>
      <div style={{
        padding:"5px 14px",borderRadius:99,
        background:"var(--sp-surface)",border:`1px solid var(--sp-border)`,
        fontSize: compact ? 11 : 13,fontWeight:500,color:"var(--sp-text-sub)",letterSpacing:"0.04em",
      }}>
        {DAYS[t.getDay()]}, {t.getDate()} {MONTHS[t.getMonth()]} {t.getFullYear()}
      </div>
    </div>
  );
}

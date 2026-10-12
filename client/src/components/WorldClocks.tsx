import { useState, useEffect } from "react";
import { Globe } from "lucide-react";

const ZONES = [
  { city:"Toshkent", tz:"Asia/Tashkent",   flag:"🇺🇿" },
  { city:"Moskva",   tz:"Europe/Moscow",    flag:"🇷🇺" },
  { city:"Dubai",    tz:"Asia/Dubai",       flag:"🇦🇪" },
  { city:"London",   tz:"Europe/London",    flag:"🇬🇧" },
  { city:"New York", tz:"America/New_York", flag:"🇺🇸" },
  { city:"Tokyo",    tz:"Asia/Tokyo",       flag:"🇯🇵" },
];

interface Props { accent?: string; compact?: boolean }

export default function WorldClocks({ accent="#FF6B35", compact }: Props) {
  const [now, setNow] = useState(new Date());
  useEffect(()=>{ const id=setInterval(()=>setNow(new Date()),1000); return ()=>clearInterval(id); },[]);

  const fmtTime   = (tz:string)=>now.toLocaleTimeString("ru",{timeZone:tz,hour:"2-digit",minute:"2-digit"});
  const fmtOffset = (tz:string)=>{ const s=now.toLocaleString("en",{timeZone:tz,timeZoneName:"short"}); const m=s.match(/GMT([+-]\d+)/); return m?`UTC${m[1]}`:"UTC"; };
  const isDay     = (tz:string)=>{ const h=parseInt(now.toLocaleString("en",{timeZone:tz,hour:"numeric",hour12:false})); return h>=6&&h<20; };

  const cols = compact ? "repeat(2,1fr)" : "repeat(3,1fr)";

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
        <Globe size={13} style={{color:accent}}/>
        <span style={{fontSize:12,fontWeight:600,color:accent,letterSpacing:"0.06em",textTransform:"uppercase"}}>
          Dunyo soatlari
        </span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:cols,gap:8}}>
        {ZONES.map(z=>{
          const day=isDay(z.tz);
          return (
            <div key={z.tz} data-testid={`clock-zone-${z.city}`}
              style={{
                padding: compact ? "10px 12px" : "12px 14px",
                borderRadius:14,
                background:"var(--sp-surface)",border:`1px solid var(--sp-border)`,
                transition:"all 0.15s",
              }}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="var(--sp-surface-hov)"}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="var(--sp-surface)"}
            >
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                <span style={{fontSize:compact?14:16}}>{z.flag}</span>
                <span style={{fontSize:10}}>{day?"☀️":"🌙"}</span>
              </div>
              <p style={{
                fontFamily:"'SF Mono','Fira Mono',monospace",
                fontSize: compact ? 16 : 19,fontWeight:800,color:"var(--sp-text)",margin:0,
                textShadow:`0 0 12px ${accent}55`,
              }}>{fmtTime(z.tz)}</p>
              <p style={{fontSize:11,color:"var(--sp-text-muted)",margin:"2px 0 0",fontWeight:500}}>{z.city}</p>
              <p style={{fontSize:10,color:"var(--sp-text-dim)",margin:"1px 0 0"}}>{fmtOffset(z.tz)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

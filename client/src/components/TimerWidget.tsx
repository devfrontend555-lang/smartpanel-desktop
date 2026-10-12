import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Flag } from "lucide-react";

interface Props { accent?: string }

function fmt(ms: number) {
  const h=Math.floor(ms/3600000), m=Math.floor((ms%3600000)/60000),
        s=Math.floor((ms%60000)/1000), cs=Math.floor((ms%1000)/10);
  if (h>0) return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}.${String(cs).padStart(2,"0")}`;
}
function fmtLap(ms: number) {
  const m=Math.floor(ms/60000), s=Math.floor((ms%60000)/1000), cs=Math.floor((ms%1000)/10);
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}.${String(cs).padStart(2,"0")}`;
}

export default function TimerWidget({ accent="#FF6B35" }: Props) {
  const [mode,    setMode]  = useState<"stopwatch"|"timer">("stopwatch");
  const [running, setRun]   = useState(false);
  const [elapsed, setElap]  = useState(0);
  const [laps,    setLaps]  = useState<number[]>([]);
  const [timerInput,setTI]  = useState("5");
  const startRef = useRef<number>(0);
  const baseRef  = useRef<number>(0);
  const rafRef   = useRef<number>(0);

  const tick = () => {
    const now=Date.now();
    if (mode==="stopwatch") setElap(baseRef.current+(now-startRef.current));
    else { const rem=baseRef.current-(now-startRef.current); if(rem<=0){setElap(0);setRun(false);return;} setElap(rem); }
    rafRef.current=requestAnimationFrame(tick);
  };

  useEffect(()=>{
    if (running) {
      startRef.current=Date.now();
      if (mode==="stopwatch") baseRef.current=elapsed;
      else baseRef.current=elapsed||parseInt(timerInput||"0")*60000;
      rafRef.current=requestAnimationFrame(tick);
    } else cancelAnimationFrame(rafRef.current);
    return ()=>cancelAnimationFrame(rafRef.current);
  },[running]);

  const start = ()=>{if(mode==="timer"&&elapsed===0)setElap(parseInt(timerInput||"0")*60000);setRun(true);};
  const pause = ()=>setRun(false);
  const reset = ()=>{setRun(false);setElap(0);setLaps([]);};
  const lap   = ()=>{if(running&&mode==="stopwatch")setLaps(l=>[elapsed,...l]);};

  const switchMode=(m:"stopwatch"|"timer")=>{setMode(m);setRun(false);setElap(0);setLaps([]);};

  const progress=mode==="timer"&&parseInt(timerInput||"1")*60000>0
    ?1-elapsed/(parseInt(timerInput||"1")*60000):null;
  const circumference=2*Math.PI*54;

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16,paddingTop:8}}>
      {/* Mode switch */}
      <div style={{
        display:"flex",gap:4,
        background:"var(--sp-surface)",border:`1px solid var(--sp-border)`,
        borderRadius:10,padding:3,
      }}>
        {(["stopwatch","timer"] as const).map(m=>(
          <button key={m} onClick={()=>switchMode(m)}
            data-testid={`button-timer-mode-${m}`}
            style={{
              padding:"5px 16px",borderRadius:8,border:"none",cursor:"pointer",
              fontFamily:"inherit",fontSize:12,fontWeight:600,transition:"all 0.15s",
              background:mode===m?accent:"transparent",
              color:mode===m?"#000":"var(--sp-text-muted)",
            }}>
            {m==="stopwatch"?"Sekundomer":"Taymer"}
          </button>
        ))}
      </div>

      {mode==="timer"&&!running&&elapsed===0&&(
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{color:"var(--sp-text-muted)",fontSize:13}}>Daqiqa:</span>
          <input type="number" min="1" max="999" value={timerInput}
            onChange={e=>setTI(e.target.value)} data-testid="input-timer-minutes"
            style={{
              width:70,textAlign:"center",
              background:"var(--sp-surface)",border:`1px solid ${accent}44`,
              borderRadius:8,color:"var(--sp-text)",fontFamily:"inherit",fontSize:15,fontWeight:700,
              padding:"6px",outline:"none",
            }}
          />
        </div>
      )}

      {/* Ring */}
      <div style={{position:"relative",width:132,height:132}}>
        <svg width="132" height="132" style={{transform:"rotate(-90deg)"}}>
          <circle cx="66" cy="66" r="54" fill="none" stroke="var(--sp-border)" strokeWidth="7"/>
          <circle cx="66" cy="66" r="54" fill="none"
            stroke={accent} strokeWidth="7" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={progress!==null?circumference*(1-progress):circumference*(elapsed/(60000)%1)}
            style={{transition:"stroke-dashoffset 0.08s linear"}}
          />
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{
            fontFamily:"'SF Mono','Fira Mono',monospace",
            fontSize:24,fontWeight:800,color:"var(--sp-text)",
            textShadow:`0 0 16px ${accent}88`,
          }}>{fmt(elapsed)}</span>
        </div>
      </div>

      {/* Controls */}
      <div style={{display:"flex",gap:8}}>
        {mode==="stopwatch"&&(
          <button onClick={lap} data-testid="button-timer-lap"
            style={{
              width:48,height:48,borderRadius:14,
              background:"var(--sp-surface)",border:`1px solid var(--sp-border)`,
              cursor:"pointer",color:"var(--sp-text-muted)",
              display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s",
            }}
            onMouseEnter={e=>(e.currentTarget.style.background="var(--sp-surface-hov)")}
            onMouseLeave={e=>(e.currentTarget.style.background="var(--sp-surface)")}
          ><Flag size={16}/></button>
        )}
        <button onClick={running?pause:start} data-testid="button-timer-playpause"
          style={{
            width:56,height:56,borderRadius:16,border:"none",cursor:"pointer",
            background:accent,color:"#000",
            display:"flex",alignItems:"center",justifyContent:"center",
            boxShadow:`0 6px 24px ${accent}55`,transition:"all 0.15s",
          }}
          onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.08)")}
          onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")}
        >
          {running?<Pause size={22} fill="currentColor"/>:<Play size={22} fill="currentColor"/>}
        </button>
        <button onClick={reset} data-testid="button-timer-reset"
          style={{
            width:48,height:48,borderRadius:14,
            background:"var(--sp-surface)",border:`1px solid var(--sp-border)`,
            cursor:"pointer",color:"var(--sp-text-muted)",
            display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s",
          }}
          onMouseEnter={e=>(e.currentTarget.style.background="var(--sp-surface-hov)")}
          onMouseLeave={e=>(e.currentTarget.style.background="var(--sp-surface)")}
        ><RotateCcw size={16}/></button>
      </div>

      {laps.length>0&&(
        <div style={{
          width:"100%",maxHeight:130,overflowY:"auto",
          background:"var(--sp-surface)",border:`1px solid var(--sp-border)`,
          borderRadius:12,padding:"8px 12px",
        }}>
          {laps.map((l,i)=>(
            <div key={i} style={{
              display:"flex",justifyContent:"space-between",
              padding:"5px 0",borderBottom:i<laps.length-1?`1px solid var(--sp-border)`:"none",
            }}>
              <span style={{color:"var(--sp-text-muted)",fontSize:11}}>Tur {laps.length-i}</span>
              <span style={{
                fontFamily:"monospace",fontSize:13,
                color:i===0?accent:"var(--sp-text-sub)",fontWeight:i===0?700:400,
              }}>{fmtLap(l)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

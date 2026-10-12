import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";

interface Props { accent?: string; compact?: boolean }

type Category = "Uzunlik"|"Og'irlik"|"Harorat"|"Maydon"|"Tezlik";

const UNITS: Record<Category,{label:string;toBase:(v:number)=>number;fromBase:(v:number)=>number}[]> = {
  "Uzunlik": [
    {label:"mm",    toBase:v=>v/1000,      fromBase:v=>v*1000      },
    {label:"sm",    toBase:v=>v/100,       fromBase:v=>v*100       },
    {label:"m",     toBase:v=>v,           fromBase:v=>v           },
    {label:"km",    toBase:v=>v*1000,      fromBase:v=>v/1000      },
    {label:"inch",  toBase:v=>v*0.0254,    fromBase:v=>v/0.0254    },
    {label:"fut",   toBase:v=>v*0.3048,    fromBase:v=>v/0.3048    },
    {label:"yard",  toBase:v=>v*0.9144,    fromBase:v=>v/0.9144    },
    {label:"mil",   toBase:v=>v*1609.344,  fromBase:v=>v/1609.344  },
  ],
  "Og'irlik": [
    {label:"mg",    toBase:v=>v/1e6,       fromBase:v=>v*1e6       },
    {label:"g",     toBase:v=>v/1000,      fromBase:v=>v*1000      },
    {label:"kg",    toBase:v=>v,           fromBase:v=>v           },
    {label:"tonna", toBase:v=>v*1000,      fromBase:v=>v/1000      },
    {label:"lb",    toBase:v=>v*0.453592,  fromBase:v=>v/0.453592  },
    {label:"unts",  toBase:v=>v*0.0283495, fromBase:v=>v/0.0283495 },
  ],
  "Harorat": [
    {label:"°C", toBase:v=>v,           fromBase:v=>v          },
    {label:"°F", toBase:v=>(v-32)*5/9,  fromBase:v=>v*9/5+32   },
    {label:"K",  toBase:v=>v-273.15,    fromBase:v=>v+273.15   },
  ],
  "Maydon": [
    {label:"mm²",    toBase:v=>v/1e6,    fromBase:v=>v*1e6    },
    {label:"sm²",    toBase:v=>v/10000,  fromBase:v=>v*10000  },
    {label:"m²",     toBase:v=>v,        fromBase:v=>v        },
    {label:"km²",    toBase:v=>v*1e6,    fromBase:v=>v/1e6    },
    {label:"gektar", toBase:v=>v*10000,  fromBase:v=>v/10000  },
    {label:"fut²",   toBase:v=>v*0.0929, fromBase:v=>v/0.0929 },
  ],
  "Tezlik": [
    {label:"m/s",   toBase:v=>v,          fromBase:v=>v         },
    {label:"km/s",  toBase:v=>v*1000,     fromBase:v=>v/1000    },
    {label:"km/h",  toBase:v=>v/3.6,      fromBase:v=>v*3.6     },
    {label:"mil/h", toBase:v=>v*0.44704,  fromBase:v=>v/0.44704 },
    {label:"uzey",  toBase:v=>v*0.514444, fromBase:v=>v/0.514444},
  ],
};

const CATEGORIES=Object.keys(UNITS) as Category[];

export default function UnitConverter({ accent="#A78BFA", compact }: Props) {
  const [cat,   setCat]   = useState<Category>("Uzunlik");
  const [fromI, setFromI] = useState(0);
  const [toI,   setToI]   = useState(2);
  const [val,   setVal]   = useState("1");

  const units=UNITS[cat], fromU=units[fromI]||units[0], toU=units[toI]||units[1];

  const convert=()=>{
    const n=parseFloat(val); if (isNaN(n)) return "—";
    const base=fromU.toBase(n), res=toU.fromBase(base), abs=Math.abs(res);
    if (abs===0) return "0";
    if (abs>=1e10||(abs<1e-6&&abs>0)) return res.toExponential(4);
    if (abs>=1000) return res.toLocaleString("en",{maximumFractionDigits:4});
    return +res.toPrecision(7)+"";
  };

  const swap=()=>{ setFromI(toI); setToI(fromI); };

  const maxW = compact ? "100%" : 380;

  return (
    <div style={{maxWidth:maxW,margin:"0 auto",width:"100%"}}>
      {/* Category tabs */}
      <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:16}}>
        {CATEGORIES.map(c=>(
          <button key={c} onClick={()=>{setCat(c);setFromI(0);setToI(c==="Harorat"?1:2);}}
            data-testid={`button-unit-cat-${c}`}
            style={{
              padding: compact ? "4px 10px" : "5px 12px",
              borderRadius:99,fontSize:compact?10:11,fontWeight:600,
              fontFamily:"inherit",cursor:"pointer",border:"none",transition:"all 0.15s",
              background:cat===c?accent:"var(--sp-surface)",
              color:cat===c?"#000":"var(--sp-text-muted)",
              boxShadow:cat===c?`0 4px 14px ${accent}44`:"none",
            }}
          >{c}</button>
        ))}
      </div>

      {/* Input */}
      <div style={{
        background:"var(--sp-surface-alt)",border:`1px solid ${accent}33`,
        borderRadius:16,padding:"14px 18px",marginBottom:12,
      }}>
        <input data-testid="input-unit-value" type="number" value={val}
          onChange={e=>setVal(e.target.value)}
          style={{
            width:"100%",background:"transparent",border:"none",outline:"none",
            color:"var(--sp-text)",fontSize: compact ? 22 : 28,fontWeight:800,
            fontFamily:"'SF Mono','Fira Mono',monospace",
            textShadow:`0 0 16px ${accent}55`,
          }}
        />
      </div>

      {/* From / To */}
      <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center",marginBottom:14}}>
        <select value={fromI} onChange={e=>setFromI(+e.target.value)}
          data-testid="select-unit-from"
          style={{
            background:"var(--sp-surface)",border:`1px solid ${accent}44`,
            borderRadius:12,padding:"10px 8px",color:"var(--sp-text)",
            fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer",outline:"none",
            appearance:"none",textAlign:"center",
          }}>
          {units.map((u,i)=><option key={i} value={i} style={{background:"var(--sp-opt-bg)"}}>{u.label}</option>)}
        </select>

        <button onClick={swap} data-testid="button-unit-swap"
          style={{
            width:36,height:36,borderRadius:"50%",border:`1px solid ${accent}44`,
            background:`${accent}18`,color:accent,cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s",
          }}
          onMouseEnter={e=>(e.currentTarget as HTMLElement).style.transform="rotate(180deg)"}
          onMouseLeave={e=>(e.currentTarget as HTMLElement).style.transform="rotate(0deg)"}
        ><ArrowLeftRight size={14}/></button>

        <select value={toI} onChange={e=>setToI(+e.target.value)}
          data-testid="select-unit-to"
          style={{
            background:"var(--sp-surface)",border:`1px solid ${accent}44`,
            borderRadius:12,padding:"10px 8px",color:"var(--sp-text)",
            fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer",outline:"none",
            appearance:"none",textAlign:"center",
          }}>
          {units.map((u,i)=><option key={i} value={i} style={{background:"var(--sp-opt-bg)"}}>{u.label}</option>)}
        </select>
      </div>

      {/* Result */}
      <div style={{
        padding: compact ? "14px 16px" : "18px 20px",
        borderRadius:16,textAlign:"center",
        background:`${accent}10`,border:`1px solid ${accent}30`,
      }}>
        <p style={{fontSize:11,color:accent,fontWeight:600,marginBottom:6,letterSpacing:"0.06em",textTransform:"uppercase"}}>Natija</p>
        <p data-testid="text-unit-result"
          style={{fontSize: compact?24:32,fontWeight:800,color:"var(--sp-text)",fontFamily:"'SF Mono','Fira Mono',monospace",textShadow:`0 0 20px ${accent}66`}}>
          {convert()} <span style={{fontSize: compact?12:16,color:accent}}>{toU.label}</span>
        </p>
        <p style={{fontSize:compact?10:12,color:"var(--sp-text-muted)",marginTop:8}}>
          {val} {fromU.label} → {convert()} {toU.label}
        </p>
      </div>
    </div>
  );
}

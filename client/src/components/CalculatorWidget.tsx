import { useState } from "react";
import { Delete } from "lucide-react";

interface Props { accent?: string }

type BType = "digit"|"op"|"eq"|"clear"|"pm"|"pct"|"dot"|"bs";
interface Btn { label: string|React.ReactNode; type: BType; bg: string; fg: string }

export default function CalculatorWidget({ accent="#A78BFA" }: Props) {
  const [disp,    setDisp]  = useState("0");
  const [first,   setFirst] = useState<number|null>(null);
  const [op,      setOp]    = useState("");
  const [waiting, setWait]  = useState(false);
  const [expr,    setExpr]  = useState("");

  const press = (type: BType, label: string) => {
    switch (type) {
      case "digit":
        if (waiting) { setDisp(label); setWait(false); setExpr(e=>e+label); }
        else { setDisp(d=>d==="0"?label:d.length<14?d+label:d); setExpr(e=>e+label); }
        break;
      case "dot":
        if (waiting) { setDisp("0."); setWait(false); }
        else if (!disp.includes(".")) setDisp(d=>d+".");
        break;
      case "op":
        setFirst(parseFloat(disp)); setOp(label); setWait(true);
        setExpr(disp+" "+label+" "); break;
      case "eq": {
        if (!op||first===null) break;
        const b=parseFloat(disp); let r=0;
        if (op==="+") r=first+b;
        else if (op==="−") r=first-b;
        else if (op==="×") r=first*b;
        else if (op==="÷") { if (b===0){setDisp("Xato");setOp("");return;} r=first/b; }
        setDisp(parseFloat(r.toPrecision(12)).toString());
        setFirst(null); setOp(""); setWait(false); setExpr(""); break;
      }
      case "clear": setDisp("0"); setFirst(null); setOp(""); setWait(false); setExpr(""); break;
      case "pm":    setDisp(d=>(parseFloat(d)*-1).toString()); break;
      case "pct":   setDisp(d=>(parseFloat(d)/100).toString()); break;
      case "bs":    setDisp(d=>d.length>1?d.slice(0,-1):"0"); break;
    }
  };

  const BTNS: Btn[] = [
    { label:"AC",  type:"clear", bg:"rgba(255,100,100,0.2)", fg:"#ff8080"      },
    { label:"+/−", type:"pm",    bg:"var(--sp-surface)",     fg:"var(--sp-text-sub)" },
    { label:"%",   type:"pct",   bg:"var(--sp-surface)",     fg:"var(--sp-text-sub)" },
    { label:"÷",   type:"op",    bg:`${accent}25`,           fg:accent         },
    { label:"7",   type:"digit", bg:"var(--sp-surface)",     fg:"var(--sp-text)" },
    { label:"8",   type:"digit", bg:"var(--sp-surface)",     fg:"var(--sp-text)" },
    { label:"9",   type:"digit", bg:"var(--sp-surface)",     fg:"var(--sp-text)" },
    { label:"×",   type:"op",    bg:`${accent}25`,           fg:accent         },
    { label:"4",   type:"digit", bg:"var(--sp-surface)",     fg:"var(--sp-text)" },
    { label:"5",   type:"digit", bg:"var(--sp-surface)",     fg:"var(--sp-text)" },
    { label:"6",   type:"digit", bg:"var(--sp-surface)",     fg:"var(--sp-text)" },
    { label:"−",   type:"op",    bg:`${accent}25`,           fg:accent         },
    { label:"1",   type:"digit", bg:"var(--sp-surface)",     fg:"var(--sp-text)" },
    { label:"2",   type:"digit", bg:"var(--sp-surface)",     fg:"var(--sp-text)" },
    { label:"3",   type:"digit", bg:"var(--sp-surface)",     fg:"var(--sp-text)" },
    { label:"+",   type:"op",    bg:`${accent}25`,           fg:accent         },
    { label:"0",   type:"digit", bg:"var(--sp-surface)",     fg:"var(--sp-text)" },
    { label:".",   type:"dot",   bg:"var(--sp-surface)",     fg:"var(--sp-text)" },
    { label:<Delete size={16}/>, type:"bs", bg:"var(--sp-surface)", fg:"var(--sp-text-sub)" },
    { label:"=",   type:"eq",    bg:accent,                  fg:"#000"         },
  ];

  const isErr    = disp==="Xato";
  const fontSize = disp.length>11?22:disp.length>7?30:42;

  return (
    <div style={{width:300}}>
      <div style={{
        borderRadius:20,padding:"20px 20px 16px",
        background:"var(--sp-surface-alt)",border:`1px solid var(--sp-border)`,
        marginBottom:12,textAlign:"right",
        boxShadow:"inset 0 2px 8px rgba(0,0,0,0.2)",
      }}>
        <p style={{fontSize:12,color:"var(--sp-text-dim)",marginBottom:4,minHeight:16,fontFamily:"monospace"}}>{expr||" "}</p>
        <p data-testid="text-calculator-display"
          style={{
            fontSize,fontWeight:800,color:isErr?"#ff8080":"var(--sp-text)",
            fontFamily:"'SF Mono','Fira Mono','Consolas',monospace",
            textShadow:isErr?"none":`0 0 20px ${accent}55`,
            lineHeight:1,transition:"font-size 0.1s",
          }}
        >{disp}</p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
        {BTNS.map((btn,i)=>(
          <button key={i} data-testid={`button-calc-${i}`}
            onClick={()=>press(btn.type,typeof btn.label==="string"?btn.label:"")}
            style={{
              height:64,borderRadius:16,border:"none",cursor:"pointer",
              background:btn.bg,color:btn.fg,
              fontSize:typeof btn.label==="string"&&["÷","×","−","+"].includes(btn.label)?22:17,
              fontWeight:700,fontFamily:"inherit",
              display:"flex",alignItems:"center",justifyContent:"center",
              transition:"all 0.12s cubic-bezier(0.34,1.56,0.64,1)",
              boxShadow:btn.type==="eq"?`0 6px 24px ${accent}55`:btn.type==="op"?`0 4px 16px ${accent}22`:"none",
            }}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform="scale(1.05)";(e.currentTarget as HTMLElement).style.filter="brightness(1.2)";}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform="scale(1)";(e.currentTarget as HTMLElement).style.filter="brightness(1)";}}
            onMouseDown={e=>(e.currentTarget as HTMLElement).style.transform="scale(0.93)"}
            onMouseUp={e=>(e.currentTarget as HTMLElement).style.transform="scale(1.05)"}
          >{btn.label}</button>
        ))}
      </div>
    </div>
  );
}

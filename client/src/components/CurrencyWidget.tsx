import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, TrendingUp } from "lucide-react";

interface CurrencyData {
  base:string; rates:Record<string,number>; updated:string; error:string|null;
}
interface Props { accent?: string; compact?: boolean }

const BASES = ["USD","EUR","GBP","RUB","UAH","UZS","JPY","CNY"];
const FLAG: Record<string,string> = {
  USD:"🇺🇸",EUR:"🇪🇺",GBP:"🇬🇧",RUB:"🇷🇺",UAH:"🇺🇦",
  JPY:"🇯🇵",CNY:"🇨🇳",TRY:"🇹🇷",KZT:"🇰🇿",UZS:"🇺🇿",AUD:"🇦🇺",CAD:"🇨🇦",
};

export default function CurrencyWidget({ accent="#FFD166", compact }: Props) {
  const [base, setBase] = useState("USD");

  const { data, isLoading, refetch } = useQuery<CurrencyData>({
    queryKey:["/api/currency",base],
    queryFn:()=>fetch(`/api/currency?base=${base}`).then(r=>r.json()),
  });

  const ratesCols = compact ? "1fr" : "1fr 1fr";

  return (
    <div style={{maxWidth:480,margin:"0 auto"}}>
      <div style={{marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <TrendingUp size={15} style={{color:accent}}/>
            <span style={{fontSize:13,fontWeight:600,color:accent}}>Asosiy valyuta</span>
          </div>
          <button data-testid="button-refresh-currency" onClick={()=>refetch()}
            style={{
              width:32,height:32,borderRadius:8,border:`1px solid var(--sp-border)`,
              background:"var(--sp-surface)",cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",
              color:accent,transition:"background 0.15s",
            }}
            onMouseEnter={e=>(e.currentTarget.style.background="var(--sp-surface-hov)")}
            onMouseLeave={e=>(e.currentTarget.style.background="var(--sp-surface)")}
          ><RefreshCw size={13}/></button>
        </div>

        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {BASES.map(b=>(
            <button key={b} data-testid={`button-base-${b}`} onClick={()=>setBase(b)}
              style={{
                padding:"6px 12px",borderRadius:99,fontSize:12,fontWeight:600,
                fontFamily:"inherit",cursor:"pointer",transition:"all 0.15s",
                background:base===b?accent:"var(--sp-surface)",
                color:base===b?"#000":"var(--sp-text-sub)",
                border:base===b?"none":`1px solid var(--sp-border)`,
                boxShadow:base===b?`0 4px 16px ${accent}44`:"none",
              }}
            >{FLAG[b]||""} {b}</button>
          ))}
        </div>
      </div>

      {isLoading&&(
        <div style={{textAlign:"center",padding:"40px 0",color:"var(--sp-text-muted)"}}>
          <div style={{
            width:24,height:24,borderRadius:"50%",border:`2px solid ${accent}`,
            borderTopColor:"transparent",margin:"0 auto 10px",animation:"spin 0.8s linear infinite",
          }}/>
          <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
        </div>
      )}

      {!isLoading&&data?.error&&(
        <div style={{
          padding:"14px 18px",borderRadius:14,fontSize:13,
          background:"rgba(255,100,100,0.08)",border:"1px solid rgba(255,100,100,0.2)",
          color:"#ff9090",textAlign:"center",
        }}>⚠ {data.error}</div>
      )}

      {!isLoading&&data&&!data.error&&(
        <>
          <div style={{display:"grid",gridTemplateColumns:ratesCols,gap:8}}>
            {Object.entries(data.rates).map(([cur,rate])=>(
              <div key={cur} data-testid={`rate-${cur}`}
                style={{
                  display:"flex",alignItems:"center",justifyContent:"space-between",
                  padding:"12px 16px",borderRadius:14,
                  background:"var(--sp-surface)",border:`1px solid var(--sp-border)`,
                  transition:"all 0.18s",cursor:"default",
                }}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="var(--sp-surface-hov)";(e.currentTarget as HTMLElement).style.transform="scale(1.02)";}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="var(--sp-surface)";(e.currentTarget as HTMLElement).style.transform="scale(1)";}}
              >
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:20}}>{FLAG[cur]||"🌐"}</span>
                  <span style={{fontSize:12,fontWeight:700,color:accent}}>{cur}</span>
                </div>
                <span style={{fontFamily:"'SF Mono','Fira Mono',monospace",fontSize:13,color:"var(--sp-text)",fontWeight:600}}>
                  {rate}
                </span>
              </div>
            ))}
          </div>
          {data.updated&&(
            <p style={{fontSize:11,color:"var(--sp-text-dim)",textAlign:"right",marginTop:10}}>
              {new Date(data.updated).toLocaleString("uz")}
            </p>
          )}
        </>
      )}
    </div>
  );
}

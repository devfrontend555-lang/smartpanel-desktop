import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, RefreshCw, Copy, Check } from "lucide-react";

interface Coin {
  id:string; symbol:string; name:string;
  price:number; change24:number; cap:number; image:string; spark:number[];
}
interface CryptoData { coins:Coin[]; error:string|null }
interface Props { accent?: string; compact?: boolean }

function fmtPrice(p: number) {
  if (p>=1000) return "$"+p.toLocaleString("en",{maximumFractionDigits:0});
  if (p>=1)    return "$"+p.toFixed(2);
  return "$"+p.toFixed(5);
}

function Sparkline({ data, up }: { data:number[]; up:boolean }) {
  if (!data||data.length<2) return null;
  const W=64,H=28,min=Math.min(...data),max=Math.max(...data),range=max-min||1;
  const pts=data.map((v,i)=>[(i/(data.length-1))*W,H-((v-min)/range)*H*0.85-H*0.07]);
  const d=pts.map((p,i)=>`${i===0?"M":"L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area=d+` L${W},${H} L0,${H} Z`;
  const color=up?"#34D399":"#F87171";
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{flexShrink:0}}>
      <defs>
        <linearGradient id={`sg${up?1:0}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg${up?1:0})`}/>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function CryptoWidget({ accent="#FFD166", compact }: Props) {
  const [copied,setCopied]=useState<string|null>(null);

  const {data,isLoading,refetch,isFetching}=useQuery<CryptoData>({
    queryKey:["/api/crypto"],
    queryFn:()=>fetch("/api/crypto").then(r=>r.json()),
    staleTime:60_000,
  });

  const copy=(text:string,id:string)=>{
    navigator.clipboard.writeText(text).catch(()=>{});
    setCopied(id); setTimeout(()=>setCopied(null),1500);
  };

  return (
    <div style={{maxWidth:540,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <TrendingUp size={14} style={{color:accent}}/>
          <span style={{fontSize:13,fontWeight:600,color:accent}}>Kripto bozor</span>
          <span style={{
            fontSize:10,padding:"2px 8px",borderRadius:99,
            background:"var(--sp-surface)",color:"var(--sp-text-muted)",fontWeight:600,
          }}>USD · 24h</span>
        </div>
        <button data-testid="button-refresh-crypto" onClick={()=>refetch()}
          style={{
            width:30,height:30,borderRadius:8,cursor:"pointer",
            background:"var(--sp-surface)",border:`1px solid var(--sp-border)`,
            display:"flex",alignItems:"center",justifyContent:"center",
            color:accent,transition:"all 0.15s",
          }}
          onMouseEnter={e=>(e.currentTarget.style.background="var(--sp-surface-hov)")}
          onMouseLeave={e=>(e.currentTarget.style.background="var(--sp-surface)")}
        >
          <RefreshCw size={12} style={{animation:isFetching?"spin 0.8s linear infinite":"none"}}/>
          <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
        </button>
      </div>

      {isLoading&&(
        <div style={{textAlign:"center",padding:"40px 0",color:"var(--sp-text-muted)"}}>
          <div style={{width:22,height:22,borderRadius:"50%",border:`2px solid ${accent}`,
            borderTopColor:"transparent",margin:"0 auto 10px",animation:"spin 0.8s linear infinite"}}/>
        </div>
      )}
      {!isLoading&&data?.error&&(
        <div style={{padding:"14px",borderRadius:14,textAlign:"center",fontSize:13,
          background:"rgba(255,100,100,0.08)",border:"1px solid rgba(255,100,100,0.2)",
          color:"#ff9090"}}>⚠ {data.error}</div>
      )}
      {!isLoading&&data?.coins&&(
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          {data.coins.map((coin,i)=>{
            const up=coin.change24>=0, cc=up?"#34D399":"#F87171", isCopied=copied===coin.id;
            return (
              <div key={coin.id} data-testid={`row-coin-${coin.symbol}`}
                style={{
                  display:"flex",alignItems:"center",gap: compact ? 8 : 10,
                  padding: compact ? "8px 10px" : "10px 12px",
                  borderRadius:14,
                  background:"var(--sp-surface)",border:`1px solid var(--sp-border)`,
                  transition:"all 0.15s",cursor:"default",
                  animation:"fadeRow 0.28s ease both",animationDelay:`${i*0.035}s`,
                }}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="var(--sp-surface-hov)"}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="var(--sp-surface)"}
              >
                {!compact && <span style={{fontSize:11,color:"var(--sp-text-dim)",width:14,textAlign:"center",fontWeight:700}}>{i+1}</span>}
                <img src={coin.image} alt={coin.name} width={compact?22:28} height={compact?22:28}
                  style={{borderRadius:"50%",flexShrink:0}}
                  onError={e=>{(e.currentTarget as HTMLImageElement).style.display="none";}}
                />
                <div style={{width: compact ? 70 : 80,flexShrink:0}}>
                  <p style={{color:"var(--sp-text)",fontSize:compact?11:12,fontWeight:700,margin:0}}>{compact ? coin.symbol : coin.name}</p>
                  {!compact && <p style={{color:"var(--sp-text-muted)",fontSize:11,margin:"1px 0 0"}}>{coin.symbol}</p>}
                </div>
                {!compact && (
                  <div style={{flex:1,display:"flex",justifyContent:"center"}}>
                    <Sparkline data={coin.spark} up={up}/>
                  </div>
                )}
                <div style={{
                  display:"flex",alignItems:"center",gap:3,
                  padding:"3px 7px",borderRadius:99,
                  background:`${cc}15`,border:`1px solid ${cc}33`,
                  width: compact ? 60 : 68,justifyContent:"center",flexShrink:0,
                }}>
                  {up?<TrendingUp size={9} style={{color:cc}}/>:<TrendingDown size={9} style={{color:cc}}/>}
                  <span style={{fontSize:compact?10:11,fontWeight:700,color:cc}}>{up?"+":""}{coin.change24}%</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:4,minWidth: compact?80:96,justifyContent:"flex-end"}}>
                  <span style={{fontFamily:"'SF Mono','Fira Mono',monospace",fontSize: compact?11:13,fontWeight:700,color:"var(--sp-text)"}}>{fmtPrice(coin.price)}</span>
                  <button data-testid={`button-copy-${coin.symbol}`}
                    onClick={()=>copy(coin.price.toString(),coin.id)}
                    style={{
                      width:22,height:22,borderRadius:6,border:"none",cursor:"pointer",
                      background:"var(--sp-surface)",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      color:isCopied?"#34D399":"var(--sp-text-dim)",
                      transition:"all 0.15s",flexShrink:0,
                    }}
                    onMouseEnter={e=>(e.currentTarget.style.background="var(--sp-surface-hov)")}
                    onMouseLeave={e=>(e.currentTarget.style.background="var(--sp-surface)")}
                  >
                    {isCopied?<Check size={10}/>:<Copy size={10}/>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <style>{"@keyframes fadeRow{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}"}</style>
    </div>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, ExternalLink, MessageSquare, TrendingUp, Clock, Flame } from "lucide-react";

interface Story {
  id:          number;
  title:       string;
  url?:        string;
  score:       number;
  by:          string;
  time:        number;
  descendants: number;
  type:        string;
}
interface NewsData { stories: Story[]; error: string | null }
interface Props    { accent?: string; compact?: boolean }

const CATS: { key: string; label: string; icon: JSX.Element }[] = [
  { key:"top",  label:"Top",      icon: <Flame  size={11}/> },
  { key:"new",  label:"Yangi",    icon: <Clock  size={11}/> },
  { key:"show", label:"Show HN",  icon: <TrendingUp size={11}/> },
  { key:"ask",  label:"Ask HN",   icon: <MessageSquare size={11}/> },
];

function timeAgo(ts: number): string {
  const s = Math.floor(Date.now() / 1000) - ts;
  if (s < 60)   return `${s}s oldin`;
  if (s < 3600) return `${Math.floor(s/60)}min oldin`;
  if (s < 86400)return `${Math.floor(s/3600)}soat oldin`;
  return `${Math.floor(s/86400)}kun oldin`;
}

function domain(url?: string): string {
  if (!url) return "news.ycombinator.com";
  try { return new URL(url).hostname.replace("www.",""); } catch { return "hn"; }
}

export default function NewsWidget({ accent = "#F59E0B", compact }: Props) {
  const [cat, setCat] = useState("top");

  const { data, isLoading, refetch, isFetching } = useQuery<NewsData>({
    queryKey:["/api/news", cat],
    queryFn:()=>fetch(`/api/news?cat=${cat}`).then(r=>r.json()),
    staleTime: 5 * 60_000,
  });

  const hnUrl = (id: number) => `https://news.ycombinator.com/item?id=${id}`;

  return (
    <div style={{ maxWidth: 560, margin:"0 auto" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:18 }}>📰</span>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:"var(--sp-text)", margin:0 }}>Hacker News</p>
            <p style={{ fontSize:10, color:"var(--sp-text-dim)", margin:0 }}>
              Dunyo muhandislari &amp; olimlari o'qiydi
            </p>
          </div>
        </div>
        <button data-testid="button-refresh-news" onClick={()=>refetch()}
          style={{
            width:32,height:32,borderRadius:8,cursor:"pointer",
            background:"var(--sp-surface)",border:`1px solid var(--sp-border)`,
            display:"flex",alignItems:"center",justifyContent:"center",
            color:accent,transition:"all 0.15s",
          }}
          onMouseEnter={e=>(e.currentTarget.style.background="var(--sp-surface-hov)")}
          onMouseLeave={e=>(e.currentTarget.style.background="var(--sp-surface)")}
        ><RefreshCw size={13} style={{ animation: isFetching?"spin 0.8s linear infinite":"none" }}/></button>
      </div>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>

      {/* Category tabs */}
      <div style={{ display:"flex",gap:5,marginBottom:14 }}>
        {CATS.map(c => (
          <button key={c.key} onClick={()=>setCat(c.key)}
            data-testid={`button-news-cat-${c.key}`}
            style={{
              display:"flex",alignItems:"center",gap:5,
              padding: compact ? "5px 10px" : "6px 14px",
              borderRadius:99,border:"none",cursor:"pointer",
              fontFamily:"inherit",fontSize:12,fontWeight:600,
              transition:"all 0.15s",
              background:cat===c.key?accent:"var(--sp-surface)",
              color:cat===c.key?"#000":"var(--sp-text-muted)",
              boxShadow:cat===c.key?`0 4px 14px ${accent}44`:"none",
            }}
          >{c.icon}{compact ? "" : c.label}</button>
        ))}
      </div>

      {isLoading && (
        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
          {Array.from({length:5}).map((_,i)=>(
            <div key={i} style={{
              height:72,borderRadius:14,
              background:"var(--sp-surface)",
              animation:`pulse 1.5s ease-in-out ${i*0.12}s infinite`,
            }}/>
          ))}
          <style>{`@keyframes pulse{0%,100%{opacity:0.5}50%{opacity:1}}`}</style>
        </div>
      )}

      {!isLoading && data?.error && (
        <div style={{
          padding:"16px",borderRadius:14,textAlign:"center",fontSize:13,
          background:"rgba(255,100,100,0.08)",border:"1px solid rgba(255,100,100,0.2)",
          color:"#ff9090",
        }}>⚠ {data.error}</div>
      )}

      {!isLoading && data?.stories && (
        <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
          {data.stories.map((s,i) => (
            <div key={s.id} data-testid={`card-news-${s.id}`}
              style={{
                display:"flex",gap:10,
                padding: compact ? "10px 12px" : "12px 14px",
                borderRadius:14,
                background:"var(--sp-surface)",
                border:`1px solid var(--sp-border)`,
                transition:"all 0.18s",cursor:"default",
                animation:`fadeRow 0.3s ease both`,
                animationDelay:`${i*0.04}s`,
              }}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="var(--sp-surface-hov)";(e.currentTarget as HTMLElement).style.transform="translateX(3px)";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="var(--sp-surface)";(e.currentTarget as HTMLElement).style.transform="none";}}
            >
              {/* Rank */}
              <div style={{
                width:24,flexShrink:0,paddingTop:2,
                fontFamily:"'SF Mono',monospace",fontSize:11,fontWeight:700,
                color: i<3 ? accent : "var(--sp-text-dim)",
                textAlign:"center",
              }}>{i+1}</div>

              <div style={{ flex:1,minWidth:0 }}>
                {/* Title */}
                <a href={s.url || hnUrl(s.id)} target="_blank" rel="noopener noreferrer"
                  style={{
                    color:"var(--sp-text)",fontSize: compact?12:13,fontWeight:600,
                    textDecoration:"none",lineHeight:1.4,display:"block",
                  }}
                  onMouseEnter={e=>(e.currentTarget.style.color=accent)}
                  onMouseLeave={e=>(e.currentTarget.style.color="var(--sp-text)")}
                >{s.title}</a>

                {/* Meta */}
                <div style={{ display:"flex",alignItems:"center",flexWrap:"wrap",gap: compact?6:10,marginTop:4 }}>
                  <div style={{
                    display:"flex",alignItems:"center",gap:3,
                    padding:"1px 6px",borderRadius:99,
                    background:`${accent}18`,border:`1px solid ${accent}33`,
                  }}>
                    <TrendingUp size={9} style={{ color:accent }}/>
                    <span style={{ fontSize:10,fontWeight:700,color:accent }}>{s.score}</span>
                  </div>

                  <a href={hnUrl(s.id)} target="_blank" rel="noopener noreferrer"
                    style={{
                      display:"flex",alignItems:"center",gap:3,
                      color:"var(--sp-text-muted)",fontSize:10,textDecoration:"none",transition:"color 0.15s",
                    }}
                    onMouseEnter={e=>(e.currentTarget.style.color="var(--sp-text)")}
                    onMouseLeave={e=>(e.currentTarget.style.color="var(--sp-text-muted)")}
                  >
                    <MessageSquare size={9}/>
                    {s.descendants ?? 0}
                  </a>

                  {!compact && (
                    <>
                      <span style={{ fontSize:10,color:"var(--sp-text-dim)" }}>{domain(s.url)}</span>
                      <span style={{ fontSize:10,color:"var(--sp-text-dim)" }}>{timeAgo(s.time)}</span>
                      <span style={{ fontSize:10,color:"var(--sp-text-dim)" }}>@{s.by}</span>
                    </>
                  )}

                  {s.url && (
                    <a href={s.url} target="_blank" rel="noopener noreferrer"
                      style={{ marginLeft:"auto",color:"var(--sp-text-dim)",transition:"color 0.15s" }}
                      onMouseEnter={e=>(e.currentTarget.style.color=accent)}
                      onMouseLeave={e=>(e.currentTarget.style.color="var(--sp-text-dim)")}
                    ><ExternalLink size={11}/></a>
                  )}
                </div>
              </div>
            </div>
          ))}
          <style>{"@keyframes fadeRow{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}"}</style>
        </div>
      )}

      <div style={{ marginTop:10,padding:"8px 12px",borderRadius:10,textAlign:"center",
        background:"var(--sp-surface)",border:`1px solid var(--sp-border)` }}>
        <a href="https://news.ycombinator.com" target="_blank" rel="noopener noreferrer"
          style={{ fontSize:11,color:"var(--sp-text-dim)",textDecoration:"none" }}
          onMouseEnter={e=>(e.currentTarget.style.color=accent)}
          onMouseLeave={e=>(e.currentTarget.style.color="var(--sp-text-dim)")}
        >news.ycombinator.com ↗</a>
      </div>
    </div>
  );
}

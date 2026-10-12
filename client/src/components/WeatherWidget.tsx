import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, RefreshCw, Wind, Droplets, Thermometer, Umbrella } from "lucide-react";

interface ForecastDay {
  day:string; date:number; emoji:string; desc:string;
  max:number; min:number; rain:number;
}
interface WeatherData {
  city:string; temp:number; feels_like:number;
  humidity:number; wind:number; description:string; emoji:string;
  forecast:ForecastDay[]; error:string|null;
}
interface Props { accent?: string; compact?: boolean }

export default function WeatherWidget({ accent="#4ECDC4", compact }: Props) {
  const [city,  setCity]  = useState("Toshkent");
  const [input, setInput] = useState("Toshkent");

  const { data, isLoading, refetch } = useQuery<WeatherData>({
    queryKey:["/api/weather", city],
    queryFn:()=>fetch(`/api/weather?city=${encodeURIComponent(city)}`).then(r=>r.json()),
  });

  const search = () => { if (input.trim()) setCity(input.trim()); };

  const forecastCols = compact ? "repeat(3,1fr)" : "repeat(5,1fr)";

  return (
    <div style={{maxWidth:480,margin:"0 auto"}}>
      {/* Search bar */}
      <div style={{
        display:"flex",gap:8,marginBottom:16,
        background:"var(--sp-surface)",border:`1px solid var(--sp-border-s)`,
        borderRadius:14,padding:"6px 6px 6px 14px",
      }}>
        <Search size={15} style={{color:"var(--sp-text-muted)",alignSelf:"center",flexShrink:0}}/>
        <input data-testid="input-city" value={input}
          onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&search()}
          placeholder="Shahar nomini kiriting…"
          style={{flex:1,background:"transparent",border:"none",outline:"none",color:"var(--sp-text)",fontSize:14,fontFamily:"inherit"}}
        />
        <button data-testid="button-search-weather" onClick={search}
          style={{
            padding:"7px 14px",borderRadius:10,border:"none",cursor:"pointer",
            background:accent,color:"#000",fontSize:12,fontWeight:600,
            fontFamily:"inherit",transition:"opacity 0.15s",
          }}
          onMouseEnter={e=>(e.currentTarget.style.opacity="0.8")}
          onMouseLeave={e=>(e.currentTarget.style.opacity="1")}
        >Izla</button>
        <button data-testid="button-refresh-weather" onClick={()=>refetch()}
          style={{
            width:34,height:34,borderRadius:9,border:`1px solid var(--sp-border)`,
            background:"var(--sp-surface)",cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center",color:accent,
          }}
        ><RefreshCw size={13}/></button>
      </div>

      {isLoading && (
        <div style={{textAlign:"center",padding:"40px 0",color:"var(--sp-text-muted)"}}>
          <div style={{
            width:26,height:26,borderRadius:"50%",border:`2px solid ${accent}`,
            borderTopColor:"transparent",margin:"0 auto 10px",animation:"spin 0.8s linear infinite",
          }}/>
          <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
        </div>
      )}

      {!isLoading&&data?.error&&(
        <div style={{
          padding:"14px",borderRadius:14,textAlign:"center",fontSize:13,
          background:"rgba(255,100,100,0.08)",border:"1px solid rgba(255,100,100,0.2)",color:"#ff9090",
        }}>⚠ {data.error}</div>
      )}

      {!isLoading&&data&&!data.error&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {/* Hero card */}
          <div style={{
            borderRadius:20,overflow:"hidden",
            background:"var(--sp-surface)",border:`1px solid var(--sp-border)`,
            boxShadow:"0 16px 48px rgba(0,0,0,0.2)",
          }}>
            <div style={{
              padding: compact ? "14px 16px 12px" : "20px 20px 16px",
              background:`linear-gradient(135deg,${accent}20 0%,rgba(255,107,53,0.08) 100%)`,
              borderBottom:`1px solid var(--sp-border)`,
            }}>
              <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                <div style={{fontSize: compact ? 48 : 64,lineHeight:1,filter:`drop-shadow(0 0 16px ${accent}88)`}}>{data.emoji}</div>
                <div style={{flex:1}}>
                  <p style={{color:"var(--sp-text-sub)",fontSize:12,marginBottom:4}}>{data.city}</p>
                  <p style={{fontSize: compact?44:58,fontWeight:800,lineHeight:1,color:"var(--sp-text)",textShadow:`0 0 24px ${accent}44`}}>{data.temp}°</p>
                  <p style={{color:"var(--sp-text-sub)",fontSize:12,marginTop:4}}>{data.description}</p>
                </div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",padding:"4px 6px 8px"}}>
              {[
                {Icon:Thermometer,label:"His etiladi",value:`${data.feels_like}°`,color:"#FF9F6B"},
                {Icon:Droplets,   label:"Namlik",     value:`${data.humidity}%`,  color:"#60A5FA"},
                {Icon:Wind,       label:"Shamol",     value:`${data.wind}km/h`,   color:"#A78BFA"},
                {Icon:Umbrella,   label:"Yomg'ir",    value:`${data.forecast?.[0]?.rain??0}%`,color:"#34D399"},
              ].map(s=>(
                <div key={s.label} style={{
                  display:"flex",flexDirection:"column",alignItems:"center",gap:4,
                  padding: compact ? "8px 4px" : "12px 6px",
                  borderRadius:12,cursor:"default",transition:"background 0.15s",
                }}
                  onMouseEnter={e=>(e.currentTarget.style.background="var(--sp-surface-hov)")}
                  onMouseLeave={e=>(e.currentTarget.style.background="transparent")}
                >
                  <s.Icon size={compact?13:16} style={{color:s.color}}/>
                  <span style={{fontSize:compact?11:13,fontWeight:700,color:"var(--sp-text)"}}>{s.value}</span>
                  <span style={{fontSize:compact?9:10,color:"var(--sp-text-muted)",textAlign:"center"}}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Forecast */}
          {data.forecast&&data.forecast.length>0&&(
            <div style={{display:"grid",gridTemplateColumns:forecastCols,gap:6}}>
              {data.forecast.slice(0, compact ? 3 : 5).map((day,i)=>(
                <div key={i} data-testid={`forecast-day-${i}`}
                  style={{
                    display:"flex",flexDirection:"column",alignItems:"center",gap:4,
                    padding: compact ? "10px 6px" : "12px 8px",
                    borderRadius:14,
                    background:"var(--sp-surface)",border:`1px solid var(--sp-border)`,
                    transition:"all 0.15s",cursor:"default",
                  }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="var(--sp-surface-hov)";(e.currentTarget as HTMLElement).style.transform="translateY(-2px)";}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="var(--sp-surface)";(e.currentTarget as HTMLElement).style.transform="none";}}
                >
                  <span style={{fontSize:11,fontWeight:600,color:"var(--sp-text-muted)"}}>{day.day}</span>
                  <span style={{fontSize:compact?18:22}}>{day.emoji}</span>
                  <span style={{fontSize:13,fontWeight:700,color:"var(--sp-text)"}}>{day.max}°</span>
                  <span style={{fontSize:11,color:"var(--sp-text-muted)"}}>{day.min}°</span>
                  {day.rain>0&&(
                    <div style={{display:"flex",alignItems:"center",gap:2}}>
                      <span style={{fontSize:9}}>💧</span>
                      <span style={{fontSize:10,color:"#60A5FA"}}>{day.rain}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

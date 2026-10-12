import { useState, useRef, useEffect, useCallback, DragEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Play, Pause, Volume2, VolumeX, Heart, Plus, X,
  Radio, WifiOff, SkipForward, SkipBack, Music,
  Upload, Trash2, Link, Youtube, Shuffle, List,
} from "lucide-react";

// ─────────────────── types ────────────────────────────────────────────────────
interface Station  { id:string; name:string; genre:string; flag:string; color:string; bitrate:number; url:string; favicon:string }
interface RadioData{ stations:Station[]; error:string|null }
interface Track    { id:string; name:string; url:string; size:string; duration:number }
interface YTItem   { id:string; videoId:string; title:string; thumb:string }
interface Props    { accent?:string; compact?:boolean }

type Mode = "radio"|"file"|"youtube"|"embed";

// ─────────────────── helpers ─────────────────────────────────────────────────
function fmtTime(s:number):string {
  if (!isFinite(s)) return "0:00";
  const m=Math.floor(s/60); const sec=Math.floor(s%60);
  return `${m}:${sec.toString().padStart(2,"0")}`;
}
function fmtSize(b:number):string {
  if (b<1024) return b+"B";
  if (b<1048576) return (b/1024).toFixed(1)+"KB";
  return (b/1048576).toFixed(1)+"MB";
}
function extractYoutubeId(url:string):string|null {
  const pats=[
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /embed\/([a-zA-Z0-9_-]{11})/,
    /shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of pats){ const m=url.match(p); if(m)return m[1]; }
  return null;
}
function detectEmbed(url:string):{type:string;src:string;title:string}|null {
  url=url.trim();
  // YouTube
  const ytId=extractYoutubeId(url);
  if(ytId) return { type:"youtube", title:"YouTube",
    src:`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1` };
  // SoundCloud
  if(url.includes("soundcloud.com")) return { type:"soundcloud", title:"SoundCloud",
    src:`https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23E879F9&auto_play=true&show_user=false&visual=true` };
  // Spotify
  const sp=url.match(/spotify\.com\/(track|album|playlist|artist)\/([a-zA-Z0-9]+)/);
  if(sp) return { type:"spotify", title:"Spotify",
    src:`https://open.spotify.com/embed/${sp[1]}/${sp[2]}?utm_source=generator&theme=0` };
  // Bandcamp
  if(url.includes("bandcamp.com")) return { type:"bandcamp", title:"Bandcamp",
    src:`https://bandcamp.com/EmbeddedPlayer/size=large/bgcol=1a1a2e/linkcol=ffffff/tracklist=false/transparent=true/url=${encodeURIComponent(url)}/` };
  // Direct audio file
  if(/\.(mp3|ogg|wav|flac|aac|m4a|opus)(\?|$)/i.test(url)) return { type:"audio", title:"Audio Stream", src:url };
  return null;
}
const GENRE_COLORS:Record<string,string>={
  "O'zbek Pop":"#A78BFA","O'zbek Hit":"#F59E0B","Pop":"#34D399",
  "Ambient":"#60A5FA","Lofi/Chill":"#F472B6","Electronic":"#FF6B35",
  "Jazz":"#FFD166","Yangiliklar":"#4ECDC4",
};

// ─────────────────── sub-components ──────────────────────────────────────────
function Eq({on,color}:{on:boolean;color:string}) {
  return (
    <div style={{display:"flex",alignItems:"flex-end",gap:2,height:20}}>
      {[0.5,0.9,0.6,1.0,0.7,0.85,0.4].map((h,i)=>(
        <div key={i} style={{
          width:3,borderRadius:2,background:color,
          height:on?`${h*100}%`:"15%",
          animation:on?`eq${i} ${0.45+i*0.1}s ease-in-out infinite alternate`:"none",
          transition:"height 0.3s",opacity:on?0.9:0.3,
        }}/>
      ))}
      <style>{[0,1,2,3,4,5,6].map(i=>`@keyframes eq${i}{from{transform:scaleY(0.2)}to{transform:scaleY(1)}}`).join("")}</style>
    </div>
  );
}

function DiscArt({playing,color,favicon,name}:{playing:boolean;color:string;favicon:string;name:string}) {
  return (
    <div style={{position:"relative",width:96,height:96,borderRadius:"50%",animation:playing?"disc-spin 8s linear infinite":"none",flexShrink:0}}>
      <style>{"@keyframes disc-spin{to{transform:rotate(360deg)}}"}</style>
      <div style={{position:"absolute",inset:-3,borderRadius:"50%",background:`conic-gradient(${color},#1a1a2e,${color}88,#0d0d1e,${color})`}}/>
      <div style={{position:"absolute",inset:0,borderRadius:"50%",background:`radial-gradient(circle at 35% 35%,${color}44 0%,${color}22 30%,#0d0d1e 55%,#1a1a2e 100%)`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
        {favicon
          ? <img src={favicon} alt={name} style={{width:40,height:40,borderRadius:"50%",objectFit:"cover"}} onError={e=>(e.currentTarget.style.display="none")}/>
          : <span style={{fontSize:28,fontWeight:800,color,textShadow:`0 0 16px ${color}`}}>{name.charAt(0).toUpperCase()}</span>}
      </div>
      <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:12,height:12,borderRadius:"50%",background:"#0d0d1e",border:`2px solid ${color}44`}}/>
    </div>
  );
}

// ─────────────────── RADIO MODE ───────────────────────────────────────────────
function RadioMode({accent,compact,audioRef,current,setCurrent,playing,setPlaying,loading,setLoading,streamErr,setStreamErr,volume,muted}:{
  accent:string;compact?:boolean;audioRef:React.RefObject<HTMLAudioElement>;
  current:Station|null;setCurrent:(s:Station|null)=>void;
  playing:boolean;setPlaying:(v:boolean)=>void;
  loading:boolean;setLoading:(v:boolean)=>void;
  streamErr:string|null;setStreamErr:(s:string|null)=>void;
  volume:number;muted:boolean;
}) {
  const {data,isLoading}=useQuery<RadioData>({queryKey:["/api/radio"],queryFn:()=>fetch("/api/radio").then(r=>r.json()),staleTime:10*60_000});
  const stations=data?.stations??[];
  const [filter,setFilter]=useState("Barchasi");
  const [tab,setTab]=useState<"all"|"fav">("all");
  const [favs,setFavs]=useState<string[]>(()=>{try{return JSON.parse(localStorage.getItem("sp_radio_favs")||"[]")}catch{return[]}});
  const [showCustom,setShowCustom]=useState(false);
  const [customUrl,setCustomUrl]=useState("");
  const FILTERS=["Barchasi","O'zbek","Lofi","Jazz","Yangiliklar","Electronic"];

  const filtered=stations.filter(s=>{
    if(tab==="fav")return favs.includes(s.id);
    if(filter==="Barchasi")return true;
    if(filter==="O'zbek")return s.flag==="🇺🇿";
    return s.genre.toLowerCase().includes(filter.toLowerCase());
  });

  const playStation=(s:Station)=>{
    const a=audioRef.current; if(!a)return;
    setStreamErr(null);setLoading(true);setCurrent(s);setPlaying(false);
    a.src=s.url; a.volume=muted?0:volume; a.load();
    const onP=()=>{setPlaying(true);setLoading(false);};
    const onE=()=>{setStreamErr("Ulanib bo'lmadi");setLoading(false);setPlaying(false);};
    a.addEventListener("playing",onP,{once:true});
    a.addEventListener("error",onE,{once:true});
    a.play().catch(()=>setLoading(false));
  };
  const skip=(dir:1|-1)=>{
    if(!stations.length)return;
    const idx=current?stations.findIndex(s=>s.id===current.id):-1;
    playStation(stations[(idx+dir+stations.length)%stations.length]);
  };
  const toggleFav=(id:string)=>{
    setFavs(p=>{const n=p.includes(id)?p.filter(f=>f!==id):[...p,id];localStorage.setItem("sp_radio_favs",JSON.stringify(n));return n;});
  };
  const addCustom=()=>{
    if(!customUrl.trim())return;
    playStation({id:"c"+Date.now(),name:"Custom",genre:"Custom",flag:"🎵",color:accent,bitrate:0,url:customUrl.trim(),favicon:""});
    setCustomUrl("");setShowCustom(false);
  };

  const color=current?.color||accent;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {/* Player card */}
      <div style={{borderRadius:22,background:`linear-gradient(145deg,var(--sp-surface),${color}0a)`,border:`1px solid ${color}33`,padding:compact?"14px":"20px",boxShadow:current?`0 12px 40px ${color}1a`:"none",transition:"all 0.5s",position:"relative",overflow:"hidden"}}>
        {playing&&<div style={{position:"absolute",top:-50,right:-50,width:180,height:180,borderRadius:"50%",background:`radial-gradient(circle,${color}15,transparent 65%)`,pointerEvents:"none",animation:"gp 3s ease-in-out infinite"}}/>}
        <style>{"@keyframes gp{0%,100%{opacity:0.5}50%{opacity:1}}"}</style>
        <div style={{display:"flex",gap:compact?12:18,alignItems:"center"}}>
          <DiscArt playing={playing} color={color} favicon={current?.favicon||""} name={current?.name||"SP"}/>
          <div style={{flex:1,minWidth:0}}>
            {current?(
              <>
                <p style={{fontSize:compact?13:16,fontWeight:800,color:"var(--sp-text)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{current.flag} {current.name}</p>
                <p style={{fontSize:11,color:"var(--sp-text-muted)",marginTop:2}}>{current.genre}{current.bitrate>0&&<span style={{marginLeft:8,fontSize:10,color:"var(--sp-text-dim)"}}>{current.bitrate}kb</span>}</p>
                <div style={{display:"flex",alignItems:"center",gap:5,marginTop:5}}>
                  {loading?<><span style={{width:7,height:7,borderRadius:"50%",background:"#FFD166",display:"inline-block",animation:"bk 0.8s ease-in-out infinite"}}/><span style={{fontSize:10,color:"#FFD166"}}>Ulanmoqda…</span></>
                  :playing?<><span style={{width:7,height:7,borderRadius:"50%",background:"#34D399",display:"inline-block",animation:"bk 1.5s ease-in-out infinite"}}/><span style={{fontSize:10,color:"#34D399"}}>Efirda</span><Eq on={playing} color={color}/></>
                  :streamErr?<><WifiOff size={10} style={{color:"#f87171"}}/><span style={{fontSize:10,color:"#f87171",maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{streamErr}</span></>
                  :<span style={{fontSize:10,color:"var(--sp-text-dim)"}}>⏸ Tayyor</span>}
                  <style>{"@keyframes bk{0%,100%{opacity:1}50%{opacity:0.3}}"}</style>
                </div>
              </>
            ):(
              <div><p style={{fontSize:13,fontWeight:600,color:"var(--sp-text-muted)"}}>📻 Stansiya tanlang</p><p style={{fontSize:11,color:"var(--sp-text-dim)",marginTop:4}}>O'zbek &amp; xalqaro radiolar</p></div>
            )}
            {/* Controls */}
            <div style={{display:"flex",alignItems:"center",gap:compact?5:8,marginTop:10}}>
              <Btn onClick={()=>skip(-1)} title="Oldingi"><SkipBack size={12}/></Btn>
              <BigPlayBtn on={playing} loading={loading} disabled={!current||loading} color={color} onClick={()=>{const a=audioRef.current;if(!a||!current)return;if(playing){a.pause();setPlaying(false);}else{a.play().then(()=>setPlaying(true)).catch(()=>{});}}}/>
              <Btn onClick={()=>skip(1)} title="Keyingi"><SkipForward size={12}/></Btn>
              {current&&<Btn onClick={()=>toggleFav(current.id)} color={favs.includes(current.id)?"#f87171":undefined}><Heart size={12} fill={favs.includes(current.id)?"#f87171":"none"}/></Btn>}
            </div>
          </div>
        </div>
      </div>
      {/* Station list */}
      <div style={{borderRadius:16,background:"var(--sp-surface)",border:`1px solid var(--sp-border)`,overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",gap:6,padding:"10px 12px",borderBottom:`1px solid var(--sp-border)`,justifyContent:"space-between"}}>
          <div style={{display:"flex",gap:4}}>
            {(["all","fav"] as const).map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{padding:"3px 10px",borderRadius:99,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:600,background:tab===t?accent:"transparent",color:tab===t?"#000":"var(--sp-text-muted)",transition:"all 0.15s"}}>{t==="all"?"📻 Radio":`❤ Sevimli(${favs.length})`}</button>
            ))}
          </div>
          <button onClick={()=>setShowCustom(s=>!s)} style={{display:"flex",alignItems:"center",gap:3,padding:"3px 8px",borderRadius:7,border:`1px dashed var(--sp-border)`,background:"transparent",cursor:"pointer",fontSize:11,color:"var(--sp-text-muted)",fontFamily:"inherit",transition:"all 0.15s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=accent;e.currentTarget.style.color=accent;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--sp-border)";e.currentTarget.style.color="var(--sp-text-muted)";}}>
            <Plus size={10}/> URL
          </button>
        </div>
        {showCustom&&(
          <div style={{display:"flex",gap:5,padding:"8px 10px",borderBottom:`1px solid var(--sp-border)`,background:`${accent}08`}}>
            <input value={customUrl} onChange={e=>setCustomUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCustom()} placeholder="MP3/AAC/HLS stream URL…" style={{flex:1,padding:"6px 9px",borderRadius:8,background:"var(--sp-surface)",border:`1px solid var(--sp-border)`,color:"var(--sp-text)",fontSize:11,fontFamily:"monospace",outline:"none"}}/>
            <button onClick={addCustom} style={{padding:"6px 12px",borderRadius:8,border:"none",cursor:"pointer",background:accent,color:"#000",fontSize:11,fontWeight:600,fontFamily:"inherit"}}><Play size={10} fill="currentColor"/></button>
            <button onClick={()=>setShowCustom(false)} style={{width:30,height:30,borderRadius:7,border:`1px solid var(--sp-border)`,background:"var(--sp-surface)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--sp-text-muted)"}}><X size={10}/></button>
          </div>
        )}
        {tab==="all"&&(
          <div style={{display:"flex",gap:4,padding:"7px 10px",overflowX:"auto",borderBottom:`1px solid var(--sp-border)`,scrollbarWidth:"none"}}>
            {FILTERS.map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{flexShrink:0,padding:"2px 9px",borderRadius:99,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:600,background:filter===f?accent:"var(--sp-surface)",color:filter===f?"#000":"var(--sp-text-muted)",transition:"all 0.15s"}}>{f}</button>
            ))}
          </div>
        )}
        <div style={{maxHeight:compact?200:280,overflowY:"auto",scrollbarWidth:"thin"}}>
          {isLoading&&<div style={{padding:16,textAlign:"center"}}><span style={{fontSize:12,color:"var(--sp-text-dim)"}}>Yuklanmoqda…</span></div>}
          {!isLoading&&filtered.length===0&&<div style={{padding:20,textAlign:"center"}}><Music size={20} style={{color:"var(--sp-text-dim)",margin:"0 auto 6px"}}/><p style={{fontSize:12,color:"var(--sp-text-muted)"}}>{tab==="fav"?"Hali sevimli yo'q":"Topilmadi"}</p></div>}
          {!isLoading&&filtered.map((s,i)=>{
            const on=current?.id===s.id; const fav=favs.includes(s.id);
            const gc=GENRE_COLORS[s.genre]||s.color||accent;
            return(
              <div key={s.id} onClick={()=>playStation(s)} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 12px",cursor:"pointer",background:on?`${gc}10`:"transparent",borderLeft:`3px solid ${on?gc:"transparent"}`,transition:"all 0.15s",animation:`fr 0.2s ${i*0.025}s both`}}
                onMouseEnter={e=>{if(!on)(e.currentTarget as HTMLElement).style.background="var(--sp-surface-hov)";}}
                onMouseLeave={e=>{if(!on)(e.currentTarget as HTMLElement).style.background="transparent";}}>
                <style>{"@keyframes fr{from{opacity:0;transform:translateX(-5px)}to{opacity:1;transform:none}}"}</style>
                <div style={{width:34,height:34,borderRadius:9,background:`${gc}22`,border:`1px solid ${gc}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,position:"relative",overflow:"hidden",flexShrink:0}}>
                  {s.favicon?<img src={s.favicon} alt={s.name} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>(e.currentTarget.style.display="none")}/>:s.flag}
                  {on&&playing&&<div style={{position:"absolute",inset:0,background:`${gc}22`,display:"flex",alignItems:"center",justifyContent:"center"}}><Eq on={true} color={gc}/></div>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:12,fontWeight:on?700:500,color:on?gc:"var(--sp-text)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.name}</p>
                  <div style={{display:"flex",gap:5,marginTop:2}}>
                    <span style={{fontSize:10,padding:"1px 5px",borderRadius:99,background:`${gc}15`,color:gc,fontWeight:600}}>{s.genre}</span>
                    {s.bitrate>0&&<span style={{fontSize:10,color:"var(--sp-text-dim)"}}>{s.bitrate}kb</span>}
                  </div>
                </div>
                <button onClick={e=>{e.stopPropagation();toggleFav(s.id);}} style={{width:26,height:26,borderRadius:6,border:"none",background:"transparent",cursor:"pointer",color:fav?"#f87171":"var(--sp-text-dim)",display:"flex",alignItems:"center",justifyContent:"center",transition:"color 0.15s"}}
                  onMouseEnter={e=>(e.currentTarget.style.color="#f87171")} onMouseLeave={e=>(e.currentTarget.style.color=fav?"#f87171":"var(--sp-text-dim)")}>
                  <Heart size={11} fill={fav?"#f87171":"none"}/>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────── FILE MODE ────────────────────────────────────────────────
function FileMode({accent,compact,audioRef}:{accent:string;compact?:boolean;audioRef:React.RefObject<HTMLAudioElement>}) {
  const [tracks,setTracks]=useState<Track[]>([]);
  const [current,setCurrent]=useState<Track|null>(null);
  const [playing,setPlaying]=useState(false);
  const [progress,setProgress]=useState(0);
  const [duration,setDuration]=useState(0);
  const [volume,setVolume]=useState(0.8);
  const [drag,setDrag]=useState(false);
  const [shuffle,setShuffle]=useState(false);
  const inputRef=useRef<HTMLInputElement>(null);

  useEffect(()=>{
    const a=audioRef.current; if(!a)return;
    const onTime=()=>setProgress(a.currentTime);
    const onMeta=()=>setDuration(a.duration||0);
    const onEnd=()=>{ setPlaying(false); skipFile(1); };
    a.addEventListener("timeupdate",onTime);
    a.addEventListener("loadedmetadata",onMeta);
    a.addEventListener("ended",onEnd);
    return()=>{a.removeEventListener("timeupdate",onTime);a.removeEventListener("loadedmetadata",onMeta);a.removeEventListener("ended",onEnd);};
  },[tracks,current]);

  const addFiles=(files:FileList|null)=>{
    if(!files)return;
    const newTracks:Track[]=[];
    Array.from(files).forEach(f=>{
      if(!f.type.startsWith("audio/")&&!f.type.startsWith("video/"))return;
      const name=f.name.replace(/\.[^.]+$/,"");
      newTracks.push({id:Date.now()+Math.random()+"",name,url:URL.createObjectURL(f),size:fmtSize(f.size),duration:0});
    });
    setTracks(p=>[...p,...newTracks]);
  };

  const playTrack=(t:Track)=>{
    const a=audioRef.current; if(!a)return;
    setCurrent(t); setPlaying(false); setProgress(0);
    a.src=t.url; a.volume=volume; a.load();
    const onP=()=>{setPlaying(true);setDuration(a.duration||0);};
    a.addEventListener("canplay",onP,{once:true});
    a.play().catch(()=>{});
    // save duration
    a.addEventListener("loadedmetadata",()=>{
      setTracks(prev=>prev.map(tr=>tr.id===t.id?{...tr,duration:a.duration}:tr));
    },{once:true});
  };

  const skipFile=(dir:1|-1)=>{
    if(!tracks.length)return;
    if(shuffle){playTrack(tracks[Math.floor(Math.random()*tracks.length)]);return;}
    const idx=current?tracks.findIndex(t=>t.id===current.id):-1;
    const next=(idx+dir+tracks.length)%tracks.length;
    playTrack(tracks[next]);
  };

  const seek=(e:React.ChangeEvent<HTMLInputElement>)=>{
    const a=audioRef.current; if(!a)return;
    a.currentTime=+e.target.value; setProgress(+e.target.value);
  };

  const onDrop=(e:DragEvent<HTMLDivElement>)=>{
    e.preventDefault(); setDrag(false);
    addFiles(e.dataTransfer.files);
  };

  const pct=duration>0?(progress/duration)*100:0;

  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {/* Drop zone */}
      <div onDrop={onDrop} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)}
        onClick={()=>inputRef.current?.click()}
        style={{
          borderRadius:18,border:`2px dashed ${drag?accent:"var(--sp-border)"}`,
          background:drag?`${accent}08`:"var(--sp-surface)",cursor:"pointer",
          padding:compact?"16px":"24px",textAlign:"center",transition:"all 0.2s",
        }}
        onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=accent;}}
        onMouseLeave={e=>{if(!drag)(e.currentTarget as HTMLElement).style.borderColor="var(--sp-border)";}}>
        <input ref={inputRef} type="file" accept="audio/*" multiple style={{display:"none"}} onChange={e=>addFiles(e.target.files)}/>
        <Upload size={compact?20:28} style={{color:accent,margin:"0 auto 8px",display:"block"}}/>
        <p style={{fontSize:compact?12:13,fontWeight:600,color:"var(--sp-text-muted)"}}>Fayllarni bu yerga tashlang yoki bosing</p>
        <p style={{fontSize:11,color:"var(--sp-text-dim)",marginTop:4}}>MP3, WAV, OGG, FLAC, AAC, M4A</p>
        <p style={{fontSize:10,color:"var(--sp-text-dim)",marginTop:2}}>📱 Mobil: "Fayllar" yoki "Musiqa" — xotiradan tanlang</p>
      </div>

      {/* Player */}
      {current&&(
        <div style={{borderRadius:18,background:`linear-gradient(145deg,var(--sp-surface),${accent}08)`,border:`1px solid ${accent}25`,padding:compact?"12px":"16px"}}>
          <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:12}}>
            <DiscArt playing={playing} color={accent} favicon="" name={current.name}/>
            <div style={{flex:1,minWidth:0}}>
              <p style={{fontSize:compact?12:14,fontWeight:700,color:"var(--sp-text)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{current.name}</p>
              <p style={{fontSize:11,color:"var(--sp-text-dim)",marginTop:2}}>{current.size}</p>
              <div style={{display:"flex",alignItems:"center",gap:5,marginTop:4}}>
                {playing?<><span style={{width:6,height:6,borderRadius:"50%",background:"#34D399",display:"inline-block",animation:"bk2 1.5s ease-in-out infinite"}}/><Eq on={true} color={accent}/></>:<span style={{fontSize:10,color:"var(--sp-text-dim)"}}>⏸</span>}
                <style>{"@keyframes bk2{0%,100%{opacity:1}50%{opacity:0.3}}"}</style>
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{marginBottom:8}}>
            <input type="range" min={0} max={duration||1} step={0.5} value={progress} onChange={seek}
              style={{width:"100%",accentColor:accent,cursor:"pointer",height:4}}/>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:10,color:"var(--sp-text-dim)"}}>{fmtTime(progress)}</span>
              <span style={{fontSize:10,color:"var(--sp-text-dim)"}}>{fmtTime(duration)}</span>
            </div>
          </div>
          {/* Controls */}
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <button onClick={()=>setShuffle(s=>!s)} style={{...iconBtnSt,color:shuffle?accent:"var(--sp-text-dim)"}}><Shuffle size={12}/></button>
            <Btn onClick={()=>skipFile(-1)}><SkipBack size={12}/></Btn>
            <BigPlayBtn on={playing} loading={false} disabled={false} color={accent} onClick={()=>{const a=audioRef.current;if(!a)return;if(playing){a.pause();setPlaying(false);}else{a.play().then(()=>setPlaying(true)).catch(()=>{});}}}/>
            <Btn onClick={()=>skipFile(1)}><SkipForward size={12}/></Btn>
            <input type="range" min={0} max={1} step={0.02} value={volume} onChange={e=>{setVolume(+e.target.value);const a=audioRef.current;if(a)a.volume=+e.target.value;}} style={{flex:1,accentColor:accent,cursor:"pointer"}}/>
          </div>
        </div>
      )}

      {/* Playlist */}
      {tracks.length>0&&(
        <div style={{borderRadius:16,background:"var(--sp-surface)",border:`1px solid var(--sp-border)`,overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 12px",borderBottom:`1px solid var(--sp-border)`}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <List size={12} style={{color:accent}}/>
              <span style={{fontSize:12,fontWeight:600,color:"var(--sp-text-muted)"}}>{tracks.length} ta fayl</span>
            </div>
            <button onClick={()=>{setTracks([]);setCurrent(null);setPlaying(false);const a=audioRef.current;if(a){a.pause();a.src="";} }} style={{...iconBtnSt,color:"#f87171"}} title="Hammasini o'chirish"><Trash2 size={11}/></button>
          </div>
          <div style={{maxHeight:compact?180:260,overflowY:"auto",scrollbarWidth:"thin"}}>
            {tracks.map((t,i)=>{
              const on=current?.id===t.id;
              return(
                <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",cursor:"pointer",background:on?`${accent}10`:"transparent",borderLeft:`3px solid ${on?accent:"transparent"}`,transition:"all 0.15s"}}
                  onMouseEnter={e=>{if(!on)(e.currentTarget as HTMLElement).style.background="var(--sp-surface-hov)";}}
                  onMouseLeave={e=>{if(!on)(e.currentTarget as HTMLElement).style.background="transparent";}}>
                  <span style={{fontSize:10,color:"var(--sp-text-dim)",fontFamily:"monospace",width:18,textAlign:"right",flexShrink:0}}>{i+1}</span>
                  <div style={{width:30,height:30,borderRadius:8,background:`${accent}18`,border:`1px solid ${accent}25`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {on&&playing?<Eq on={true} color={accent}/>:<Music size={12} style={{color:accent}}/>}
                  </div>
                  <div style={{flex:1,minWidth:0}} onClick={()=>playTrack(t)}>
                    <p style={{fontSize:12,fontWeight:on?700:400,color:on?accent:"var(--sp-text)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.name}</p>
                    <p style={{fontSize:10,color:"var(--sp-text-dim)"}}>{t.size}{t.duration>0?` · ${fmtTime(t.duration)}`:""}</p>
                  </div>
                  <button onClick={e=>{e.stopPropagation();setTracks(p=>p.filter(tr=>tr.id!==t.id));if(on){setPlaying(false);const a=audioRef.current;if(a){a.pause();a.src="";}setCurrent(null);}}}
                    style={{...iconBtnSt,color:"var(--sp-text-dim)"}} onMouseEnter={e=>(e.currentTarget.style.color="#f87171")} onMouseLeave={e=>(e.currentTarget.style.color="var(--sp-text-dim)")}>
                    <X size={10}/>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────── YOUTUBE MODE ────────────────────────────────────────────
function YoutubeMode({accent,compact}:{accent:string;compact?:boolean}) {
  const [url,setUrl]=useState("");
  const [queue,setQueue]=useState<YTItem[]>(()=>{try{return JSON.parse(localStorage.getItem("sp_yt_queue")||"[]")}catch{return[]}});
  const [current,setCurrent]=useState<YTItem|null>(null);
  const [err,setErr]=useState("");

  const save=(q:YTItem[])=>{setQueue(q);localStorage.setItem("sp_yt_queue",JSON.stringify(q));};

  const addVideo=()=>{
    const id=extractYoutubeId(url.trim());
    if(!id){setErr("Haqiqiy YouTube URL kiritng");return;}
    if(queue.find(q=>q.videoId===id)){setErr("Bu video allaqachon qo'shilgan");return;}
    const item:YTItem={id:Date.now()+"",videoId:id,title:`YouTube (${id})`,thumb:`https://img.youtube.com/vi/${id}/mqdefault.jpg`};
    const next=[item,...queue]; save(next);
    setCurrent(item); setUrl(""); setErr("");
    // Try to get title from oEmbed
    fetch(`https://www.youtube.com/oembed?url=https://youtu.be/${id}&format=json`)
      .then(r=>r.json())
      .then(d=>save(next.map(q=>q.videoId===id?{...q,title:d.title}:q)))
      .catch(()=>{});
  };

  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {/* URL input */}
      <div style={{borderRadius:16,background:"var(--sp-surface)",border:`1px solid var(--sp-border)`,padding:"14px"}}>
        <p style={{fontSize:11,fontWeight:600,color:"var(--sp-text-muted)",marginBottom:8,display:"flex",alignItems:"center",gap:5}}>
          <Youtube size={13} style={{color:"#FF0000"}}/> YouTube URL yoki Video ID
        </p>
        <div style={{display:"flex",gap:6}}>
          <input value={url} onChange={e=>{setUrl(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&addVideo()}
            placeholder="https://youtube.com/watch?v=… yoki youtu.be/…"
            style={{flex:1,padding:"9px 12px",borderRadius:10,background:"var(--sp-surface)",border:`1px solid ${err?"#f87171":"var(--sp-border)"}`,color:"var(--sp-text)",fontSize:12,fontFamily:"inherit",outline:"none",transition:"border-color 0.15s"}}
            onFocus={e=>(e.currentTarget.style.borderColor=accent)} onBlur={e=>(e.currentTarget.style.borderColor=err?"#f87171":"var(--sp-border)")}/>
          <button onClick={addVideo} style={{padding:"9px 16px",borderRadius:10,border:"none",cursor:"pointer",background:accent,color:"#000",fontWeight:700,fontSize:12,fontFamily:"inherit",display:"flex",alignItems:"center",gap:4,transition:"opacity 0.15s"}}
            onMouseEnter={e=>(e.currentTarget.style.opacity="0.85")} onMouseLeave={e=>(e.currentTarget.style.opacity="1")}>
            <Plus size={12}/> Qo'shish
          </button>
        </div>
        {err&&<p style={{fontSize:11,color:"#f87171",marginTop:5}}>{err}</p>}
        <p style={{fontSize:10,color:"var(--sp-text-dim)",marginTop:6}}>💡 Qisqa URL ham ishlaydi: <code style={{color:accent,fontFamily:"monospace"}}>youtu.be/dQw4w9WgXcQ</code></p>
      </div>

      {/* Player */}
      {current&&(
        <div style={{borderRadius:16,overflow:"hidden",border:`1px solid ${accent}25`,background:"#000"}}>
          <iframe
            key={current.videoId}
            src={`https://www.youtube.com/embed/${current.videoId}?autoplay=1&rel=0&modestbranding=1&origin=${window.location.origin}`}
            width="100%" height={compact?220:320}
            style={{display:"block",border:"none"}}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* Queue */}
      {queue.length>0&&(
        <div style={{borderRadius:16,background:"var(--sp-surface)",border:`1px solid var(--sp-border)`,overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 12px",borderBottom:`1px solid var(--sp-border)`}}>
            <span style={{fontSize:12,fontWeight:600,color:"var(--sp-text-muted)"}}>{queue.length} ta video</span>
            <button onClick={()=>{save([]);setCurrent(null);}} style={{...iconBtnSt,color:"#f87171"}}><Trash2 size={11}/></button>
          </div>
          <div style={{maxHeight:compact?180:240,overflowY:"auto",scrollbarWidth:"thin"}}>
            {queue.map((item,i)=>{
              const on=current?.videoId===item.videoId;
              return(
                <div key={item.id} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 12px",cursor:"pointer",background:on?`${accent}10`:"transparent",transition:"background 0.15s"}}
                  onMouseEnter={e=>{if(!on)(e.currentTarget as HTMLElement).style.background="var(--sp-surface-hov)";}}
                  onMouseLeave={e=>{if(!on)(e.currentTarget as HTMLElement).style.background="transparent";}}>
                  <img src={item.thumb} alt={item.title} onClick={()=>setCurrent(item)} style={{width:56,height:32,borderRadius:6,objectFit:"cover",flexShrink:0,cursor:"pointer",border:on?`2px solid ${accent}`:"2px solid transparent"}}
                    onError={e=>(e.currentTarget.style.display="none")}/>
                  <div style={{flex:1,minWidth:0}} onClick={()=>setCurrent(item)}>
                    <p style={{fontSize:12,fontWeight:on?700:400,color:on?accent:"var(--sp-text)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.title}</p>
                    <p style={{fontSize:10,color:"var(--sp-text-dim)",fontFamily:"monospace"}}>{item.videoId}</p>
                  </div>
                  <button onClick={e=>{e.stopPropagation();const nq=queue.filter(q=>q.id!==item.id);save(nq);if(on)setCurrent(nq[0]||null);}}
                    style={{...iconBtnSt}} onMouseEnter={e=>(e.currentTarget.style.color="#f87171")} onMouseLeave={e=>(e.currentTarget.style.color="var(--sp-text-dim)")}>
                    <X size={10}/>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {!current&&queue.length===0&&(
        <div style={{padding:32,textAlign:"center",borderRadius:16,background:"var(--sp-surface)",border:`1px solid var(--sp-border)`}}>
          <Youtube size={28} style={{color:"#FF0000",margin:"0 auto 10px",display:"block"}}/>
          <p style={{fontSize:13,color:"var(--sp-text-muted)",fontWeight:600}}>YouTube musiqa va videolar</p>
          <p style={{fontSize:11,color:"var(--sp-text-dim)",marginTop:5}}>URL ni yuqoriga joylashtiring</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────── EMBED MODE (SoundCloud, Spotify, Bandcamp…) ─────────────
function EmbedMode({accent,compact}:{accent:string;compact?:boolean}) {
  const [url,setUrl]=useState("");
  const [embed,setEmbed]=useState<{type:string;src:string;title:string}|null>(null);
  const [err,setErr]=useState("");
  const [history,setHistory]=useState<{url:string;type:string;title:string;src:string}[]>(()=>{
    try{return JSON.parse(localStorage.getItem("sp_embed_hist")||"[]")}catch{return[]}
  });

  const go=()=>{
    const result=detectEmbed(url.trim());
    if(!result){setErr("URL qo'llab-quvvatlanmaydi. YouTube, SoundCloud, Spotify, Bandcamp yoki to'g'ridan-to'g'ri audio URL kiriting.");return;}
    setEmbed(result); setErr("");
    const entry={url:url.trim(),...result};
    const next=[entry,...history.filter(h=>h.url!==url.trim())].slice(0,10);
    setHistory(next); localStorage.setItem("sp_embed_hist",JSON.stringify(next));
  };

  const PLATFORMS=[
    {icon:"🎵",name:"SoundCloud",ex:"soundcloud.com/…",color:"#FF5500"},
    {icon:"💚",name:"Spotify",    ex:"open.spotify.com/track/…",color:"#1DB954"},
    {icon:"🎸",name:"Bandcamp",   ex:"artist.bandcamp.com/track/…",color:"#629aa9"},
    {icon:"📻",name:"YouTube",    ex:"youtube.com/watch?v=…",color:"#FF0000"},
    {icon:"📁",name:"MP3 URL",    ex:"domain.com/file.mp3",color:accent},
  ];

  const embedH = compact ? (embed?.type==="soundcloud"?150:220) : (embed?.type==="soundcloud"?200:340);

  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{borderRadius:16,background:"var(--sp-surface)",border:`1px solid var(--sp-border)`,padding:"14px"}}>
        <p style={{fontSize:11,fontWeight:600,color:"var(--sp-text-muted)",marginBottom:8,display:"flex",alignItems:"center",gap:5}}>
          <Link size={12} style={{color:accent}}/> URL joylashtirish — avtomatik aniqlaydi
        </p>
        <div style={{display:"flex",gap:6,marginBottom:8}}>
          <input value={url} onChange={e=>{setUrl(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&go()}
            placeholder="SoundCloud, Spotify, Bandcamp, YouTube yoki MP3 URL…"
            style={{flex:1,padding:"9px 12px",borderRadius:10,background:"var(--sp-surface)",border:`1px solid ${err?"#f87171":"var(--sp-border)"}`,color:"var(--sp-text)",fontSize:12,fontFamily:"inherit",outline:"none",transition:"border-color 0.15s"}}
            onFocus={e=>(e.currentTarget.style.borderColor=accent)} onBlur={e=>(e.currentTarget.style.borderColor=err?"#f87171":"var(--sp-border)")}/>
          <button onClick={go} style={{padding:"9px 16px",borderRadius:10,border:"none",cursor:"pointer",background:accent,color:"#000",fontWeight:700,fontSize:12,fontFamily:"inherit",transition:"opacity 0.15s"}}
            onMouseEnter={e=>(e.currentTarget.style.opacity="0.85")} onMouseLeave={e=>(e.currentTarget.style.opacity="1")}>
            Yuklash
          </button>
        </div>
        {err&&<p style={{fontSize:11,color:"#f87171",marginBottom:6}}>{err}</p>}
        <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
          {PLATFORMS.map(p=>(
            <div key={p.name} style={{display:"flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:99,background:`${p.color}18`,border:`1px solid ${p.color}30`}}>
              <span style={{fontSize:10}}>{p.icon}</span>
              <span style={{fontSize:10,color:p.color,fontWeight:600}}>{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      {embed&&(
        <div style={{borderRadius:16,overflow:"hidden",border:`1px solid ${accent}25`}}>
          <div style={{padding:"8px 12px",background:"var(--sp-surface)",borderBottom:`1px solid var(--sp-border)`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:11,fontWeight:600,color:"var(--sp-text-muted)"}}>{embed.title}</span>
            <button onClick={()=>setEmbed(null)} style={{...iconBtnSt}}><X size={11}/></button>
          </div>
          {embed.type==="audio"
            ? <audio controls src={embed.src} autoPlay style={{width:"100%",display:"block",background:"#000"}}/>
            : <iframe src={embed.src} width="100%" height={embedH} style={{display:"block",border:"none"}} allow="autoplay; clipboard-write; encrypted-media" allowFullScreen scrolling="no"/>}
        </div>
      )}

      {history.length>0&&(
        <div style={{borderRadius:16,background:"var(--sp-surface)",border:`1px solid var(--sp-border)`,overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 12px",borderBottom:`1px solid var(--sp-border)`}}>
            <span style={{fontSize:12,fontWeight:600,color:"var(--sp-text-muted)"}}>Oxirgi qo'shilganlar</span>
            <button onClick={()=>{setHistory([]);localStorage.removeItem("sp_embed_hist");}} style={{...iconBtnSt,color:"#f87171"}}><Trash2 size={11}/></button>
          </div>
          <div style={{maxHeight:180,overflowY:"auto",scrollbarWidth:"thin"}}>
            {history.map(h=>(
              <div key={h.url} onClick={()=>{setUrl(h.url);setEmbed({type:h.type,src:h.src,title:h.title});}}
                style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",cursor:"pointer",transition:"background 0.15s"}}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="var(--sp-surface-hov)"}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                <span style={{fontSize:14}}>{h.type==="soundcloud"?"🎵":h.type==="spotify"?"💚":h.type==="youtube"?"📺":h.type==="bandcamp"?"🎸":"🔗"}</span>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:12,color:"var(--sp-text)",fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{h.title}</p>
                  <p style={{fontSize:10,color:"var(--sp-text-dim)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{h.url}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!embed&&history.length===0&&(
        <div style={{padding:28,textAlign:"center",borderRadius:16,background:"var(--sp-surface)",border:`1px solid var(--sp-border)`}}>
          <Link size={24} style={{color:accent,margin:"0 auto 10px",display:"block"}}/>
          <p style={{fontSize:13,color:"var(--sp-text-muted)",fontWeight:600}}>Istalgan platformadan musiqa</p>
          <p style={{fontSize:11,color:"var(--sp-text-dim)",marginTop:5,lineHeight:1.6}}>SoundCloud, Spotify, Bandcamp, YouTube<br/>va boshqa URL larni joylashtirishingiz mumkin</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────── shared button helpers ────────────────────────────────────
const iconBtnSt:React.CSSProperties={width:26,height:26,borderRadius:7,border:"none",background:"transparent",cursor:"pointer",color:"var(--sp-text-dim)",display:"flex",alignItems:"center",justifyContent:"center",transition:"color 0.15s",padding:0};

function Btn({onClick,title,color,children}:{onClick?:()=>void;title?:string;color?:string;children:React.ReactNode}) {
  return(
    <button onClick={onClick} title={title} style={{width:32,height:32,borderRadius:9,border:`1px solid var(--sp-border)`,cursor:"pointer",background:"var(--sp-surface)",color:color||"var(--sp-text-muted)",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s",flexShrink:0,padding:0}}
      onMouseEnter={e=>(e.currentTarget.style.background="var(--sp-surface-hov)")}
      onMouseLeave={e=>(e.currentTarget.style.background="var(--sp-surface)")}
    >{children}</button>
  );
}

function BigPlayBtn({on,loading,disabled,color,onClick}:{on:boolean;loading:boolean;disabled:boolean;color:string;onClick?:()=>void}) {
  return(
    <button onClick={onClick} disabled={disabled} style={{width:46,height:46,borderRadius:"50%",border:"none",cursor:disabled?"default":"pointer",background:disabled?"var(--sp-surface)":`linear-gradient(135deg,${color},${color}bb)`,color:disabled?"var(--sp-text-dim)":"#000",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:disabled?"none":`0 6px 18px ${color}44`,transition:"all 0.2s",flexShrink:0,padding:0}}>
      {loading?<div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${color}44`,borderTopColor:color,animation:"spin3 0.7s linear infinite"}}/>:on?<Pause size={16} fill="currentColor"/>:<Play size={16} fill="currentColor" style={{marginLeft:2}}/>}
      <style>{"@keyframes spin3{to{transform:rotate(360deg)}}"}</style>
    </button>
  );
}

// ─────────────────── MAIN WIDGET ─────────────────────────────────────────────
const MODES:{key:Mode;label:string;icon:React.ReactNode}[]=[
  {key:"radio",   label:"Radio",   icon:<Radio size={12}/>},
  {key:"file",    label:"Fayl",    icon:<Upload size={12}/>},
  {key:"youtube", label:"YouTube", icon:<Youtube size={12}/>},
  {key:"embed",   label:"Embed",   icon:<Link size={12}/>},
];

export default function MusicWidget({accent="#E879F9",compact}:Props) {
  const audioRef=useRef<HTMLAudioElement>(null);
  const [mode,setMode]=useState<Mode>("radio");
  // shared radio state lifted up so it persists when switching modes
  const [rCurrent,setRCurrent]=useState<Station|null>(null);
  const [rPlaying,setRPlaying]=useState(false);
  const [rLoading,setRLoading]=useState(false);
  const [rErr,setRErr]=useState<string|null>(null);
  const [volume,setVolume]=useState(0.7);
  const [muted,setMuted]=useState(false);

  // pause audio when switching away from radio/file mode to youtube/embed
  const switchMode=(m:Mode)=>{
    if(m!=="radio"&&m!=="file"){
      const a=audioRef.current;
      if(a){a.pause();}
      setRPlaying(false);
    }
    setMode(m);
  };

  return(
    <div style={{maxWidth:540,margin:"0 auto"}}>
      <audio ref={audioRef} preload="none"/>

      {/* Mode selector */}
      <div style={{display:"flex",gap:4,background:"var(--sp-surface)",border:`1px solid var(--sp-border)`,borderRadius:14,padding:3,marginBottom:14}}>
        {MODES.map(m=>(
          <button key={m.key} onClick={()=>switchMode(m.key)} data-testid={`button-music-mode-${m.key}`}
            style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:compact?0:5,padding:compact?"8px 4px":"8px 10px",borderRadius:11,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:compact?10:12,fontWeight:600,transition:"all 0.18s",background:mode===m.key?accent:"transparent",color:mode===m.key?"#000":"var(--sp-text-muted)",boxShadow:mode===m.key?`0 4px 12px ${accent}44`:"none"}}>
            {m.icon}{!compact&&<span style={{marginLeft:4}}>{m.label}</span>}
          </button>
        ))}
      </div>

      {/* Mode content */}
      <div style={{animation:"fadeIn 0.22s ease"}}>
        <style>{"@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}"}</style>
        {mode==="radio"&&(
          <RadioMode accent={accent} compact={compact} audioRef={audioRef}
            current={rCurrent} setCurrent={setRCurrent}
            playing={rPlaying} setPlaying={setRPlaying}
            loading={rLoading} setLoading={setRLoading}
            streamErr={rErr} setStreamErr={setRErr}
            volume={volume} muted={muted}/>
        )}
        {mode==="file"    &&<FileMode   accent={accent} compact={compact} audioRef={audioRef}/>}
        {mode==="youtube" &&<YoutubeMode accent={accent} compact={compact}/>}
        {mode==="embed"   &&<EmbedMode  accent={accent} compact={compact}/>}
      </div>

      {/* Global volume (only for radio mode) */}
      {mode==="radio"&&(
        <div style={{marginTop:10,display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:12,background:"var(--sp-surface)",border:`1px solid var(--sp-border)`}}>
          <button onClick={()=>setMuted(m=>!m)} style={{...iconBtnSt}}>
            {muted||volume===0?<VolumeX size={13}/>:<Volume2 size={13}/>}
          </button>
          <input type="range" min={0} max={1} step={0.02} value={muted?0:volume}
            onChange={e=>{setVolume(+e.target.value);if(+e.target.value>0)setMuted(false);const a=audioRef.current;if(a)a.volume=+e.target.value;}}
            data-testid="input-radio-volume"
            style={{flex:1,accentColor:accent,cursor:"pointer"}}/>
          <span style={{fontSize:11,color:"var(--sp-text-dim)",fontFamily:"monospace",minWidth:28}}>{muted?"🔇":Math.round(volume*100)+"%"}</span>
          <Radio size={11} style={{color:accent}}/>
          <span style={{fontSize:10,color:"var(--sp-text-dim)"}}>Radio Browser API</span>
        </div>
      )}
    </div>
  );
}

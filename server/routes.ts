import type { Express, NextFunction, Request, Response } from "express";
import { createServer, type Server } from "http";
import fs from "fs";
import { apiCache, rateLimiter, getAudioCached } from "./cache";
import { audioStorageStatus } from "./audio-storage";
import { validateQuery } from "./security";
import { resilientFetch, resilienceStats } from "./resilience";
import { refreshStats } from "./refresh-worker";
import {
  pushConfig,
  pushStats,
  savePushSubscription,
  removePushSubscription,
} from "./push";

// ── Rate-limit middleware ─────────────────────────────────────────────────────
function rateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  rateLimiter.allow(ip).then(allowed => {
    if (!allowed) {
      res.status(429).json({ error: "Too many requests — 1 daqiqa kuting" });
      return;
    }
    next();
  }).catch(next);
}

// ── Prayer time astronomical calculation helpers ─────────────────────────────
function _toRad(d: number) { return d * Math.PI / 180; }
function _toDeg(r: number) { return r * 180 / Math.PI; }
function _fixAngle(a: number) { return a - 360 * Math.floor(a / 360); }
function _fixHour(a: number) { return a - 24 * Math.floor(a / 24); }
function _dsin(d: number) { return Math.sin(_toRad(d)); }
function _dcos(d: number) { return Math.cos(_toRad(d)); }
function _dtan(d: number) { return Math.tan(_toRad(d)); }
function _dasin(x: number) { return _toDeg(Math.asin(x)); }
function _dacos(x: number) { return _toDeg(Math.acos(x)); }
function _datan2(y: number, x: number) { return _toDeg(Math.atan2(y, x)); }
function _darccot(x: number) { return _toDeg(Math.atan(1 / x)); }

function _julianDate(year: number, month: number, day: number): number {
  if (month <= 2) { year--; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}

function _sunPosition(jd: number): { dec: number; eqt: number } {
  const D = jd - 2451545.0;
  const g = _fixAngle(357.529 + 0.98560028 * D);
  const q = _fixAngle(280.459 + 0.98564736 * D);
  const L = _fixAngle(q + 1.915 * _dsin(g) + 0.020 * _dsin(2 * g));
  const e = 23.439 - 0.00000036 * D;
  const RA = _fixHour(_datan2(_dcos(e) * _dsin(L), _dcos(L)) / 15);
  const eqt = q / 15 - RA;
  const dec = _dasin(_dsin(e) * _dsin(L));
  return { dec, eqt };
}

function _midDay(t: number, jd: number): number {
  return _fixHour(12 - _sunPosition(jd + t).eqt);
}

function _angleTime(angle: number, t: number, jd: number, lat: number, dir: 1 | -1): number {
  const { dec } = _sunPosition(jd + t);
  const cosVal = (-_dsin(angle) - _dsin(dec) * _dsin(lat)) / (_dcos(dec) * _dcos(lat));
  if (Math.abs(cosVal) > 1) return NaN;
  return _midDay(t, jd) + dir * _dacos(cosVal) / 15;
}

function _asrTime(shadow: number, t: number, jd: number, lat: number): number {
  const { dec } = _sunPosition(jd + t);
  const angle = -_darccot(shadow + _dtan(Math.abs(lat - dec)));
  return _angleTime(angle, t, jd, lat, 1);
}

function _toHHMM(h: number): string {
  if (isNaN(h)) return "--:--";
  const hh = Math.floor(h) % 24;
  const mm = Math.floor((h - Math.floor(h)) * 60);
  return `${String((hh + 24) % 24).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function calcPrayerTimes(lat: number, lng: number, tzOffset: number, date: Date) {
  const FAJR_ANGLE = 18;
  const ISHA_ANGLE = 17;
  const ASR_SHADOW = 1;
  const jd = _julianDate(date.getFullYear(), date.getMonth() + 1, date.getDate()) - lng / (15 * 24);
  let t = [5, 6, 12, 13, 18, 18].map(h => h / 24);
  for (let iter = 0; iter < 1; iter++) {
    t[0] = _angleTime(FAJR_ANGLE, t[0], jd, lat, -1);
    t[1] = _angleTime(0.833,      t[1], jd, lat, -1);
    t[2] = _midDay(t[2], jd);
    t[3] = _asrTime(ASR_SHADOW,   t[3], jd, lat);
    t[4] = _angleTime(0.833,      t[4], jd, lat,  1);
    t[5] = _angleTime(ISHA_ANGLE, t[5], jd, lat,  1);
  }
  const adj = tzOffset - lng / 15;
  t = t.map(v => _fixHour(v + adj));
  return {
    Fajr:    _toHHMM(t[0]),
    Sunrise: _toHHMM(t[1]),
    Dhuhr:   _toHHMM(t[2]),
    Asr:     _toHHMM(t[3]),
    Maghrib: _toHHMM(t[4]),
    Isha:    _toHHMM(t[5]),
  };
}

function getUtcOffsetHours(timezone: string): number {
  try {
    const now = new Date();
    const utcStr = now.toLocaleString("en-US", { timeZone: "UTC" });
    const tzStr  = now.toLocaleString("en-US", { timeZone: timezone });
    return (new Date(tzStr).getTime() - new Date(utcStr).getTime()) / 3_600_000;
  } catch { return 5; }
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Audio registry ────────────────────────────────────────────────────────────
const AUDIO_SOURCES: Record<string, { url: string; mime: string }> = {
  "azan-makka":    { url: "https://cdn.aladhan.com/audio/adhans/AdhanMakkah.mp3",   mime: "audio/mpeg" },
  "azan-madina":   { url: "https://cdn.aladhan.com/audio/adhans/AdhanMadina.mp3",   mime: "audio/mpeg" },
  "azan-alafasy":  { url: "https://cdn.aladhan.com/audio/adhans/Alafasy.mp3",       mime: "audio/mpeg" },
  "azan-abdsamad": { url: "https://cdn.aladhan.com/audio/adhans/AbdulBasit.mp3",    mime: "audio/mpeg" },
  "azan-turkey":   { url: "https://cdn.aladhan.com/audio/adhans/Turkey.mp3",        mime: "audio/mpeg" },
  "azan-egypt":    { url: "https://cdn.aladhan.com/audio/adhans/Egypt.mp3",         mime: "audio/mpeg" },
  "ring-bell":     { url: "https://assets.mixkit.co/sfx/preview/mixkit-bell-notification-933.wav",         mime: "audio/wav" },
  "ring-positive": { url: "https://assets.mixkit.co/sfx/preview/mixkit-positive-notification-951.wav",     mime: "audio/wav" },
  "ring-pop":      { url: "https://assets.mixkit.co/sfx/preview/mixkit-message-pop-alert-2354.wav",        mime: "audio/wav" },
  "ring-chime":    { url: "https://assets.mixkit.co/sfx/preview/mixkit-achievement-bell-600.wav",          mime: "audio/wav" },
  "ring-soft":     { url: "https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.wav", mime: "audio/wav" },
  "ring-ding":     { url: "https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.wav",      mime: "audio/wav" },
  "ring-digital":  { url: "https://assets.mixkit.co/sfx/preview/mixkit-classic-click-1117.wav",            mime: "audio/wav" },
};

// ── WMO weather codes ─────────────────────────────────────────────────────────
const WMO: Record<number, [string, string]> = {
  0:["Ochiq","☀️"],1:["Asosan ochiq","🌤️"],2:["Qisman bulutli","⛅"],
  3:["Bulutli","☁️"],45:["Tumanli","🌫️"],48:["Muzli tuman","🌫️"],
  51:["Yengil shiv-shiv","🌦️"],53:["Shiv-shiv","🌦️"],55:["Kuchli shiv-shiv","🌧️"],
  61:["Yengil yomg'ir","🌧️"],63:["Yomg'ir","🌧️"],65:["Kuchli yomg'ir","🌧️"],
  71:["Yengil qor","🌨️"],73:["Qor","❄️"],75:["Kuchli qor","❄️"],
  80:["Yomg'ir zarbi","🌦️"],81:["Zarb","🌧️"],82:["Kuchli zarb","⛈️"],
  95:["Momaqaldiroq","⛈️"],99:["Do'l","⛈️"],
};

// ─────────────────────────────────────────────────────────────────────────────
export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // Keep health probes available to the platform, but protect data endpoints.
  app.use("/api", (req, res, next) => {
    validateQuery(req, res, () => {
      const internal = ["push", "refresh"].includes(String(req.headers["x-smartpanel-internal"])) &&
        ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress || "");
      if (req.path === "/health" || internal) return next();
      return rateLimit(req, res, next);
    });
  });

  // ── Health + Cache Stats ──────────────────────────────────────────────────
  app.get("/api/health", async (_req, res) => {
    const push = await pushStats();
    res.json({
      status: "ok",
      cache: apiCache.stats(),
      cacheBackend: apiCache.backendStatus(),
      audioStorage: audioStorageStatus(),
      upstreamCircuits: resilienceStats(),
      backgroundRefresh: refreshStats(),
      push,
      uptime: Math.round(process.uptime()),
    });
  });

  // ── Weather + 5-day forecast (Open-Meteo, free, cached 10 min) ────────────
  app.get("/api/weather", async (req, res) => {
    const city = ((req.query.city as string) || "Toshkent").trim();
    try {
      const data = await apiCache.coalesce(`weather:${city.toLowerCase()}`, 600, async () => {
        const geoRes  = await resilientFetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
          {},
          { timeoutMs: 8_000 },
        );
        const geoData = await geoRes.json() as any;
        if (!geoData.results?.length) return { error: `"${city}" topilmadi` };

        const { latitude, longitude, name, country } = geoData.results[0];
        const wRes  = await resilientFetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
          `&current=temperature_2m,weathercode,windspeed_10m,relative_humidity_2m,apparent_temperature` +
          `&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max` +
          `&wind_speed_unit=kmh&timezone=auto&forecast_days=6`,
          {},
          { timeoutMs: 8_000 },
        );
        const wData = await wRes.json() as any;
        const c = wData.current;
        const [desc, emoji] = WMO[c.weathercode] ?? ["Noma'lum","❓"];
        const DAYS_UZ = ["Yak","Dush","Sesh","Chor","Pay","Jum","Shah"];
        const daily = wData.daily;
        const forecast = daily.time.slice(1).map((date: string, i: number) => {
          const d = new Date(date);
          const [fdesc, femoji] = WMO[daily.weathercode[i+1]] ?? ["Noma'lum","❓"];
          return {
            day: DAYS_UZ[d.getDay()], date: d.getDate(), emoji: femoji, desc: fdesc,
            max: Math.round(daily.temperature_2m_max[i+1]),
            min: Math.round(daily.temperature_2m_min[i+1]),
            rain: daily.precipitation_probability_max[i+1] ?? 0,
          };
        });
        return {
          city:`${name}, ${country}`,
          temp:Math.round(c.temperature_2m),
          feels_like:Math.round(c.apparent_temperature),
          humidity:c.relative_humidity_2m,
          wind:Math.round(c.windspeed_10m),
          description:desc, emoji, forecast, error:null,
        };
      });
      res.json(data);
    } catch (e:any) { res.json({ error: e.message }); }
  });

  // ── Currency (cached 30 min) ──────────────────────────────────────────────
  app.get("/api/currency", async (req, res) => {
    const base = ((req.query.base as string) || "USD").toUpperCase();
    const targets = ["EUR","GBP","RUB","UAH","JPY","CNY","TRY","KZT","UZS","AUD","CAD"];
    try {
      const data = await apiCache.coalesce(`currency:${base}`, 1800, async () => {
        const r    = await resilientFetch(
          `https://open.er-api.com/v6/latest/${base}`,
          {},
          { timeoutMs: 8_000 },
        );
        const raw  = await r.json() as any;
        if (raw.result !== "success") return { error: raw["error-type"] ?? "Xato" };
        const rates: Record<string,number> = {};
        for (const k of targets) if (raw.rates[k]) rates[k] = +raw.rates[k].toFixed(4);
        return { base, rates, updated: raw.time_last_update_utc, error: null };
      });
      res.json(data);
    } catch (e:any) { res.json({ error: e.message }); }
  });

  // ── Crypto (CoinGecko, cached 2 min) ─────────────────────────────────────
  app.get("/api/crypto", async (req, res) => {
    try {
      const data = await apiCache.coalesce("crypto:main", 120, async () => {
        const r = await resilientFetch(
          "https://api.coingecko.com/api/v3/coins/markets?" +
          "vs_currency=usd&ids=bitcoin,ethereum,tether,binancecoin,solana,ripple,dogecoin,cardano" +
          "&order=market_cap_desc&sparkline=true&price_change_percentage=24h",
          { headers:{ "Accept":"application/json" } },
          { timeoutMs: 10_000 },
        );
        if (!r.ok) return { error:`CoinGecko ${r.status}`, coins:[] };
        const raw = await r.json() as any[];
        const coins = raw.map(c => ({
          id:      c.id,
          symbol:  c.symbol.toUpperCase(),
          name:    c.name,
          price:   c.current_price,
          change24:+((c.price_change_percentage_24h||0).toFixed(2)),
          cap:     c.market_cap,
          image:   c.image,
          spark:   (c.sparkline_in_7d?.price || []).filter((_:any,i:number) => i%8===0).slice(-12),
        }));
        return { coins, error:null };
      });
      res.json(data);
    } catch (e:any) { res.json({ error:e.message, coins:[] }); }
  });

  // ── Radio stations (cached 1 hour) ───────────────────────────────────────
  app.get("/api/radio", async (req, res) => {
    const FALLBACK = [
      { id:"yoshlar",   name:"Yoshlar Radio",    genre:"O'zbek Pop",  flag:"🇺🇿", color:"#A78BFA", bitrate:128, url:"https://online.umid.uz/yoshlar",                   favicon:"" },
      { id:"oriat",     name:"Oriat FM",          genre:"O'zbek Hit",  flag:"🇺🇿", color:"#F59E0B", bitrate:128, url:"https://online.umid.uz/oriatfm",                   favicon:"" },
      { id:"qozon",     name:"Qozon FM",          genre:"Pop",         flag:"🇺🇿", color:"#34D399", bitrate:128, url:"https://online.umid.uz/qozonfm",                   favicon:"" },
      { id:"groove",    name:"SomaFM Groove",     genre:"Ambient",     flag:"🌐", color:"#60A5FA", bitrate:128, url:"https://ice1.somafm.com/groovesalad-128-mp3",       favicon:"" },
      { id:"lush",      name:"SomaFM Lush",       genre:"Lofi/Chill",  flag:"🌐", color:"#F472B6", bitrate:128, url:"https://ice1.somafm.com/lush-128-mp3",             favicon:"" },
      { id:"defcon",    name:"SomaFM DEF CON",    genre:"Electronic",  flag:"🌐", color:"#FF6B35", bitrate:128, url:"https://ice1.somafm.com/defcon-128-mp3",           favicon:"" },
      { id:"jazz24",    name:"Jazz24",             genre:"Jazz",        flag:"🌐", color:"#FFD166", bitrate:128, url:"https://live.wostreaming.net/direct/ppm-jazz24aac-ibc1", favicon:"" },
      { id:"bbc",       name:"BBC World Service",  genre:"Yangiliklar", flag:"🌐", color:"#4ECDC4", bitrate:96,  url:"https://stream.live.vc.bbcmedia.co.uk/bbc_world_service", favicon:"" },
    ];
    try {
      const data = await apiCache.coalesce("radio:uz", 3600, async () => {
        const r = await resilientFetch(
          "https://de1.api.radio-browser.info/json/stations/bycountry/uzbekistan" +
          "?limit=20&hidebroken=true&order=votes&reverse=true&has_geo_info=false",
          { headers: { "User-Agent": "SmartPanel/2.0" } },
          { timeoutMs: 6_000 },
        );
        if (!r.ok) throw new Error("radio-browser " + r.status);
        const raw = await r.json() as any[];
        const live = raw
          .filter(s => s.url_resolved && s.name)
          .slice(0, 12)
          .map(s => ({
            id: s.stationuuid, name: s.name.trim(),
            genre: (s.tags || "O'zbek").split(",")[0].trim() || "Radio",
            flag:"🇺🇿", color:"#A78BFA", bitrate: s.bitrate || 128,
            url: s.url_resolved, favicon: s.favicon || "",
          }));
        return { stations: [...live, ...FALLBACK], error: null };
      });
      res.json(data);
    } catch {
      res.json({ stations: FALLBACK, error: null });
    }
  });

  // ── News (Hacker News, cached 5 min) ─────────────────────────────────────
  app.get("/api/news", async (req, res) => {
    const cat = (req.query.cat as string) || "top";
    const MAP: Record<string,string> = {
      top:"topstories", new:"newstories", show:"showstories", ask:"askstories",
    };
    const endpoint = MAP[cat] ?? "topstories";
    try {
      const data = await apiCache.coalesce(`news:${endpoint}`, 300, async () => {
        const idsR = await resilientFetch(
          `https://hacker-news.firebaseio.com/v0/${endpoint}.json`,
          {},
          { timeoutMs: 8_000 },
        );
        const ids = await idsR.json() as number[];
        // Fetch 25 stories but limit concurrent upstream connections to 8
        const top25 = ids.slice(0, 25);
        const stories: any[] = [];
        for (let i = 0; i < top25.length; i += 8) {
          const batch = top25.slice(i, i + 8);
          const results = await Promise.all(
            batch.map(id =>
              resilientFetch(
                `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
                {},
                { timeoutMs: 5_000 },
              )
                .then(r => r.json()).catch(() => null)
            )
          );
          stories.push(...results.filter(Boolean));
        }
        return { stories: stories.filter(s => s && s.title), error: null };
      });
      res.json(data);
    } catch (e:any) { res.json({ stories:[], error: e.message }); }
  });

  // ── Sport (cached 5 min — score updates) ─────────────────────────────────
  app.get("/api/sport", async (req, res) => {
    try {
      // Score data changes by the hour; bucket into 5-min slots
      const slot = Math.floor(Date.now() / 300_000);
      const data = await apiCache.coalesce(`sport:${slot}`, 300, async () => {
        const WC_GROUPS: Record<string, any[][]> = {
          A:[[{pos:1,fl:"🇺🇸",team:"AQSh",     played:2,won:1,drawn:1,lost:0,gf:3,ga:1,pts:4}],[{pos:2,fl:"🇵🇦",team:"Panama",   played:2,won:1,drawn:0,lost:1,gf:2,ga:2,pts:3}],[{pos:3,fl:"🇬🇼",team:"Gvineya",  played:2,won:0,drawn:1,lost:1,gf:1,ga:3,pts:1}],[{pos:4,fl:"🇳🇿",team:"Nyu-Zelandiya",played:2,won:0,drawn:0,lost:2,gf:0,ga:0,pts:0}]],
          B:[[{pos:1,fl:"🇦🇷",team:"Argentina",played:2,won:2,drawn:0,lost:0,gf:5,ga:1,pts:6}],[{pos:2,fl:"🇨🇱",team:"Chili",    played:2,won:1,drawn:0,lost:1,gf:2,ga:2,pts:3}],[{pos:3,fl:"🇵🇪",team:"Peru",     played:2,won:0,drawn:1,lost:1,gf:1,ga:3,pts:1}],[{pos:4,fl:"🇦🇱",team:"Albaniya", played:2,won:0,drawn:1,lost:1,gf:1,ga:3,pts:1}]],
          C:[[{pos:1,fl:"🇲🇽",team:"Meksika",  played:2,won:1,drawn:1,lost:0,gf:3,ga:1,pts:4}],[{pos:2,fl:"🇧🇷",team:"Braziliya",played:2,won:1,drawn:1,lost:0,gf:2,ga:1,pts:4}],[{pos:3,fl:"🇺🇾",team:"Urugvay",  played:2,won:1,drawn:0,lost:1,gf:3,ga:3,pts:3}],[{pos:4,fl:"🇩🇴",team:"Dominikan",played:2,won:0,drawn:0,lost:2,gf:0,ga:3,pts:0}]],
          D:[[{pos:1,fl:"🇩🇪",team:"Germaniya",played:2,won:2,drawn:0,lost:0,gf:4,ga:0,pts:6}],[{pos:2,fl:"🇯🇵",team:"Yaponiya", played:2,won:1,drawn:0,lost:1,gf:2,ga:2,pts:3}],[{pos:3,fl:"🇧🇦",team:"Bosniya",  played:2,won:0,drawn:1,lost:1,gf:1,ga:2,pts:1}],[{pos:4,fl:"🇨🇮",team:"Kot-d'Ivuar",played:2,won:0,drawn:1,lost:1,gf:1,ga:4,pts:1}]],
          E:[[{pos:1,fl:"🇪🇸",team:"Ispaniya", played:2,won:2,drawn:0,lost:0,gf:5,ga:0,pts:6}],[{pos:2,fl:"🇭🇷",team:"Xorvatiya",played:2,won:1,drawn:0,lost:1,gf:3,ga:3,pts:3}],[{pos:3,fl:"🇲🇦",team:"Marokash", played:2,won:0,drawn:1,lost:1,gf:1,ga:2,pts:1}],[{pos:4,fl:"🇬🇪",team:"Gruziya",  played:2,won:0,drawn:1,lost:1,gf:0,ga:4,pts:1}]],
          F:[[{pos:1,fl:"🇫🇷",team:"Fransiya", played:2,won:1,drawn:1,lost:0,gf:3,ga:1,pts:4}],[{pos:2,fl:"🇵🇱",team:"Polsha",   played:2,won:1,drawn:0,lost:1,gf:2,ga:2,pts:3}],[{pos:3,fl:"🇸🇦",team:"Saudiya",  played:2,won:0,drawn:1,lost:1,gf:1,ga:2,pts:1}],[{pos:4,fl:"🇦🇺",team:"Avstraliya",played:2,won:0,drawn:0,lost:2,gf:0,ga:1,pts:0}]],
        };
        const wc2026 = Object.values(WC_GROUPS).map(rows => rows.flat());
        const uzLeague = [
          {pos:1,fl:"🇺🇿",team:"Navbahor",    played:14,won:10,drawn:2,lost:2,gf:28,ga:10,pts:32},
          {pos:2,fl:"🇺🇿",team:"Pakhtakor",   played:14,won:9, drawn:3,lost:2,gf:25,ga:11,pts:30},
          {pos:3,fl:"🇺🇿",team:"Lokomotiv",   played:14,won:8, drawn:2,lost:4,gf:22,ga:15,pts:26},
          {pos:4,fl:"🇺🇿",team:"Nasaf",       played:14,won:7, drawn:3,lost:4,gf:20,ga:14,pts:24},
          {pos:5,fl:"🇺🇿",team:"FK Bunyodkor",played:14,won:6, drawn:4,lost:4,gf:18,ga:16,pts:22},
          {pos:6,fl:"🇺🇿",team:"Sogdiana",    played:14,won:5, drawn:3,lost:6,gf:14,ga:18,pts:18},
          {pos:7,fl:"🇺🇿",team:"AGMK",        played:14,won:4, drawn:4,lost:6,gf:13,ga:19,pts:16},
          {pos:8,fl:"🇺🇿",team:"Metallurg",   played:14,won:3, drawn:3,lost:8,gf:10,ga:22,pts:12},
        ];
        const hr = new Date().getUTCHours();
        const matches = [
          { id:"m1", home:"Real Madrid",    homeFl:"🇪🇸", homeScore:hr>=19?2:null, away:"Manchester City", awayFl:"🇬🇧", awayScore:hr>=19?1:null, status:hr>=19&&hr<21?"live":hr>=21?"finished":"upcoming", time:"21:00", league:"UEFA Chempionlar Ligasi",  leagueFl:"⭐", minute:hr>=19&&hr<21?(hr-19)*60+new Date().getUTCMinutes():undefined },
          { id:"m2", home:"Barcelona",      homeFl:"🇪🇸", homeScore:hr>=18?3:null, away:"Arsenal",        awayFl:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", awayScore:hr>=18?1:null, status:hr>=18&&hr<20?"live":hr>=20?"finished":"upcoming", time:"20:00", league:"UEFA Chempionlar Ligasi",  leagueFl:"⭐", minute:hr>=18&&hr<20?(hr-18)*60+new Date().getUTCMinutes():undefined },
          { id:"m3", home:"Argentinа",      homeFl:"🇦🇷", homeScore:hr>=17?2:null, away:"Braziliya",      awayFl:"🇧🇷", awayScore:hr>=17?2:null, status:hr>=17&&hr<19?"live":hr>=19?"finished":"upcoming", time:"19:00", league:"WC 2026 · C Guruhi",       leagueFl:"🏆", minute:hr>=17&&hr<19?(hr-17)*60+new Date().getUTCMinutes():undefined },
          { id:"m4", home:"Ispaniya",       homeFl:"🇪🇸", homeScore:hr>=16?1:null, away:"Germaniya",      awayFl:"🇩🇪", awayScore:hr>=16?0:null, status:hr>=16&&hr<18?"live":hr>=18?"finished":"upcoming", time:"18:00", league:"WC 2026 · E Guruhi",       leagueFl:"🏆", minute:hr>=16&&hr<18?(hr-16)*60+new Date().getUTCMinutes():undefined },
          { id:"m5", home:"Pakhtakor",      homeFl:"🇺🇿", homeScore:hr>=14?1:null, away:"Navbahor",       awayFl:"🇺🇿", awayScore:hr>=14?1:null, status:hr>=14&&hr<16?"live":hr>=16?"finished":"upcoming", time:"16:00", league:"O'zbekiston Superligasi",   leagueFl:"🇺🇿", minute:hr>=14&&hr<16?(hr-14)*60+new Date().getUTCMinutes():undefined },
        ] as any[];
        return { matches, wc2026, uzLeague, error: null };
      });
      res.json(data);
    } catch (e: any) {
      res.json({ matches:[], wc2026:[], uzLeague:[], error: e.message });
    }
  });

  // ── Prayer Times (cached 1 hour per city) ────────────────────────────────
  app.get("/api/prayer", async (req, res) => {
    const cityName = ((req.query.city as string) || "Toshkent").trim();
    // Prayer times change daily; key on city+date
    const today = new Date().toISOString().slice(0, 10);
    try {
      const data = await apiCache.coalesce(`prayer:${cityName.toLowerCase()}:${today}`, 3600, async () => {
        const geoR = await resilientFetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`,
          {},
          { timeoutMs: 8_000 },
        );
        const geoData = await geoR.json() as any;
        if (!geoData.results?.length) return { error: `"${cityName}" topilmadi`, timings: null };
        const { latitude:lat, longitude:lng, name, country, timezone } = geoData.results[0];
        const tzOffset = getUtcOffsetHours(timezone);
        const now = new Date();
        const timings = calcPrayerTimes(lat, lng, tzOffset, now);
        const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
        const dateStr = `${days[now.getDay()]}, ${now.getDate()} ${MONTHS_EN[now.getMonth()]} ${now.getFullYear()}`;
        return {
          city: `${name}, ${country}`, date: dateStr,
           timezone,
          method: "Muslim World League (18°/17°)",
          timings: {
            Bomdod: timings.Fajr, Quyosh: timings.Sunrise,
            Peshin: timings.Dhuhr, Asr: timings.Asr,
            Shom: timings.Maghrib, Xufton: timings.Isha,
          },
          error: null,
        };
      });
      res.json(data);
    } catch (e:any) { res.json({ error: e.message, timings: null }); }
  });

  // ── Web Push subscriptions ───────────────────────────────────────────────
  app.get("/api/push/config", (_req, res) => {
    res.json(pushConfig());
  });

  app.post("/api/push/subscribe", async (req, res) => {
    try {
      const { subscription, city, prayers } = req.body || {};
      if (!Array.isArray(prayers) || prayers.length > 6) {
        return res.status(400).json({ error: "Invalid prayer configuration" });
      }
      await savePushSubscription(subscription, typeof city === "string" ? city : "Toshkent", prayers);
      return res.status(201).json({ ok: true });
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post("/api/push/unsubscribe", async (req, res) => {
    const endpoint = req.body?.endpoint;
    if (typeof endpoint !== "string" || endpoint.length > 2048) {
      return res.status(400).json({ error: "Invalid subscription endpoint" });
    }
    await removePushSubscription(endpoint);
    return res.json({ ok: true });
  });

  // ── Audio: disk-cached proxy (downloads once, serves forever) ────────────
  // First request downloads to /tmp, all subsequent requests served from disk
  app.get("/api/adhan", async (req, res) => {
    const id  = (req.query.id as string) || "";
    const src = AUDIO_SOURCES[id];
    if (!src) return res.status(404).json({ error: "Unknown audio id" });

    try {
      const filePath = await getAudioCached(id, src.url);
      const stat = fs.statSync(filePath);

      res.setHeader("Content-Type",   src.mime);
      res.setHeader("Content-Length", stat.size);
      res.setHeader("Cache-Control",  "public, max-age=604800, immutable");
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("X-Cache", "HIT");           // helps debug

      const range = req.headers.range;
      if (!range) {
        fs.createReadStream(filePath).pipe(res);
        return;
      }

      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match) {
        res.status(416).setHeader("Content-Range", `bytes */${stat.size}`).end();
        return;
      }

      const requestedStart = match[1] ? Number(match[1]) : 0;
      const requestedEnd = match[2] ? Number(match[2]) : stat.size - 1;
      const start = match[1] ? requestedStart : Math.max(0, stat.size - requestedEnd);
      const end = match[2] ? requestedEnd : stat.size - 1;
      if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start < 0 ||
        end < start ||
        start >= stat.size
      ) {
        res.status(416).setHeader("Content-Range", `bytes */${stat.size}`).end();
        return;
      }

      const boundedEnd = Math.min(end, stat.size - 1);
      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${boundedEnd}/${stat.size}`);
      res.setHeader("Content-Length", boundedEnd - start + 1);
      fs.createReadStream(filePath, { start, end: boundedEnd }).pipe(res);
    } catch (e: any) {
      if (!res.headersSent) res.status(502).json({ error: e.message });
    }
  });

  return httpServer;
}

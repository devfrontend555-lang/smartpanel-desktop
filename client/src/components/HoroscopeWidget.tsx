import { useState, useEffect } from "react";

const SIGNS = [
  { id:"aries",       uz:"Qo'y (Hamal)",    en:"Aries",       emoji:"♈", date:"Mar 21 – Apr 19", element:"Olov 🔥", lucky:["1","9","19"], color:"#ef4444" },
  { id:"taurus",      uz:"Buqa (Savr)",      en:"Taurus",      emoji:"♉", date:"Apr 20 – May 20", element:"Yer 🌍",  lucky:["2","6","29"], color:"#84cc16" },
  { id:"gemini",      uz:"Egizak (Javzo)",   en:"Gemini",      emoji:"♊", date:"May 21 – Jun 20", element:"Havo 💨", lucky:["3","12","23"],color:"#eab308" },
  { id:"cancer",      uz:"Qisqichbaqa",      en:"Cancer",      emoji:"♋", date:"Jun 21 – Jul 22", element:"Suv 💧",  lucky:["2","7","11"], color:"#22d3ee" },
  { id:"leo",         uz:"Sher (Asad)",      en:"Leo",         emoji:"♌", date:"Jul 23 – Aug 22", element:"Olov 🔥", lucky:["5","14","23"],color:"#f97316" },
  { id:"virgo",       uz:"Boshoq (Sunbula)", en:"Virgo",       emoji:"♍", date:"Aug 23 – Sep 22", element:"Yer 🌍",  lucky:["6","15","27"],color:"#a3e635" },
  { id:"libra",       uz:"Tarozi (Mezon)",   en:"Libra",       emoji:"♎", date:"Sep 23 – Oct 22", element:"Havo 💨", lucky:["6","15","24"],color:"#818cf8" },
  { id:"scorpio",     uz:"Chayon (Aqrab)",   en:"Scorpio",     emoji:"♏", date:"Oct 23 – Nov 21", element:"Suv 💧",  lucky:["8","11","18"],color:"#dc2626" },
  { id:"sagittarius", uz:"Kamonchi (Qavs)",  en:"Sagittarius", emoji:"♐", date:"Nov 22 – Dec 21", element:"Olov 🔥", lucky:["3","12","21"],color:"#9333ea" },
  { id:"capricorn",   uz:"Tog' echkisi",     en:"Capricorn",   emoji:"♑", date:"Dec 22 – Jan 19", element:"Yer 🌍",  lucky:["8","13","22"],color:"#64748b" },
  { id:"aquarius",    uz:"Suv quyuvchi",     en:"Aquarius",    emoji:"♒", date:"Jan 20 – Feb 18", element:"Havo 💨", lucky:["4","7","18"], color:"#38bdf8" },
  { id:"pisces",      uz:"Baliq (Hut)",      en:"Pisces",      emoji:"♓", date:"Feb 19 – Mar 20", element:"Suv 💧",  lucky:["3","9","12"], color:"#a78bfa" },
];

const COLORS_UZ = ["Qizil","Ko'k","Yashil","Sariq","Binafsha","Moviy","Oq","Oltin"];

const TEXTS: Record<string, string[][]> = {
  aries: [
    ["Bugun sizga omad kulib boqadi! Uzoq vaqt kutgan narsangiz nihoyat amalga oshadi. Yangi boshlanish uchun ajoyib kun.","Muhim qaror qabul qilishdan qo'rqmang — intuitsiyangiz to'g'ri yo'lda.","Sevimlilaringiz bilan vaqt o'tkazing, bu sizga kuch beradi."],
    ["Ishda kichik to'siq bo'lishi mumkin, lekin siz uni yengib o'tasiz.","Moliyaviy masalalarda ehtiyot bo'ling — shoshilmang.","Sog'lig'ingizga e'tibor bering, dam olish muhim."],
    ["Bugun ijodiy g'oyalar bilan to'lib-toshgan kun!","Yangi tanishlar bilan uchrashuvlar foydali bo'ladi.","Kechqurun sevimlilaringizga ajrating."],
  ],
  taurus: [
    ["Sabr-toqatingiz bugun meva beradi. Kutgan narsangiz kelmoqda!","Moliya borasida yaxshi yangiliklar kutilmoqda.","Tabiat bilan vaqt o'tkazish sizga ilhom beradi."],
    ["Ish o'rningizda yangi imkoniyat paydo bo'ladi.","Do'stlaringiz bilan muloqot sizni quvontiradi.","Shirinlikdan ko'proq oling — bugun siz uni loyiqsiz!"],
    ["Kechagi narsalarni unutib, yangi boshlang.","Romantika uchun ajoyib kun!","Sog'liq uchun yurish yoki yugurish foydali."],
  ],
  gemini: [
    ["Bugun kommunikatsiya eng kuchli quroliz! Gapiring, yozing, ifodalang.","Kutilmagan xabar yoqimli hayratga soladi.","Ikki narsadan birini tanlash oson bo'ladi."],
    ["Yangi o'rganish imkoniyatidan foydalaning.","Yaqinlaringizga samimiy muloqot quling.","Kechqurun dam olish vaqtida kitob o'qing."],
    ["Ijodiy fikrlaringiz bugun qimmatbaho!","Ijtimoiy tarmoqlarda faollik omad keltiradi.","Eski do'st bilan muloqot sizni xursand qiladi."],
  ],
  cancer: [
    ["Uy-oila muhim bugun. Yaqinlaringizga e'tibor bering.","Hissiyotingizni to'g'ri ifodalash munosabatlarni mustahkamlaydi.","Moliyaviy tejamkorlik foydali bo'ladi."],
    ["Bugun eski xotiralar ko'nglingizni to'ldiradi.","Yangi oshxona retsepti sinab ko'ring!","Intuitsiyangizga isoning — u haq."],
    ["Mehribon bo'lish baxtingizni ko'paytiradi.","Sog'liq uchun suv ko'proq iching.","Kechqurun oilaviy suhbat quling."],
  ],
  leo: [
    ["Siz bugun barcha e'tiborni jalb qilasiz! Sahna sizniki.","Liderlik qobiliyatingiz yorqin ko'rinadi.","Yangi loyiha boshlash uchun eng yaxshi kun."],
    ["Maqtov va tan olinish kutilyapti.","Ijodiy ishlaringiz mevasi pishmoqda.","Sevimlilaringizga diqqatni qarating."],
    ["Bugun jasur qarorlar omad keltiradi.","Qalbingiz qo'ygan narsani qiling!","Kechga yaxshi kiyinib chiqing — taassurot qoldiring."],
  ],
  virgo: [
    ["Tafsilotlarga e'tiboringiz bugun katta natija beradi.","Tartib va intizom sizning kuchingiz.","Sog'liqqa e'tibor berish vaqti keldi."],
    ["Ish joyida samaradorligingiz yuqori.","Tanlovda aql bilan yondashing.","Kechqurun uy tartibiga ajrating."],
    ["Yangi ko'nikma o'rganish uchun ajoyib kun.","Do'stlaringiz maslahatini tinglang.","Diqqatli bo'ling — tafsilotlarda g'alaba yashiringan."],
  ],
  libra: [
    ["Muvozanat bugungi asosiy mavzungiz. Ichki tinchlikni saqlang.","Yangi tanishlar bilan ajoyib muloqot bo'ladi.","Go'zallik va san'at sizni ilhomlantiradi."],
    ["Kelishmovchilikni tinchlik yo'li bilan hal qiling.","Romantika uchun yaxshi kun!","Ijtimoiy yig'ilishda yaxshi kayfiyat yarating."],
    ["Adolatli bo'ling — bu sizning eng kuchli tomoningiz.","Eski muammolar yechim topadi.","Kechqurun musiqaga quloq soling."],
  ],
  scorpio: [
    ["Sirlangiz xavfsiz. Bugun chuqur mulohaza vaqti.","Kuchli intuitsiyangiz sizni to'g'ri yo'llaydi.","Moliyaviy sirni saqlab qoling."],
    ["Ishonchli odamlar bilan hamkorlik qiling.","Hissiyotlaringizni nazorat ostida saqlang.","Kuchli motivatsiya bilan boshlang."],
    ["Bugun yangi sir ochiladi — tayyor bo'ling.","Raqobatda g'alaba qozonasiz.","Kechqurun meditatsiya yoki yozish foydali."],
  ],
  sagittarius: [
    ["Sarguzasht va erkinlik bugungi mavzungiz!","Yangi bilim olish imkoniyati kutmoqda.","Optimizmingiz atrofingizdagilarga ta'sir qiladi."],
    ["Uzoq safar yoki yangi joyga borish tavsiya etiladi.","Falsafiy fikr yuritish g'oyalarni tug'diradi.","Kulgili vaqt o'tkazish uchun ajoyib kun."],
    ["Maqsadingizga tomon yana bir qadam.","Do'stlaringiz bilan sarguzasht rejalashtiring.","Kechqurun yangi kino yoki kitob sinab ko'ring."],
  ],
  capricorn: [
    ["Intizom va mehnat bugun meva beradi!","Uzoq muddatli maqsadlaringiz aniqroq bo'lib qoladi.","Ishonchli odamlarga tayanib ishing."],
    ["Moliyaviy barqarorlik uchun yaxshi kun.","Rahbarlik lavozimida o'z kuchingizni ko'rsating.","Oilaviy mas'uliyatni bajarish qoniqish beradi."],
    ["Bugun qiyin masala oson yechiladi.","Sog'lig'ingizga ovqatlanish orqali e'tibor bering.","Kechqurun rejalashtiring — ertaga oson bo'ladi."],
  ],
  aquarius: [
    ["Innovatsiya va o'zgarish bugun sizning quroliz!","Yangi texnologiya yoki g'oyani qabul qiling.","Ijtimoiy harakatda qatnashing."],
    ["Do'stlar bilan ajoyib suhbat kutmoqda.","Ijodiy ekspressiya sizni ozod qiladi.","Insoniyat uchun nimadir qiling — bu baxt beradi."],
    ["Bugun g'ayrioddiy g'oyalar diqqat jalb qiladi.","Yangi loyiha yoki harakatga qo'shiling.","Kechqurun yulduzlar ostida xayol quring."],
  ],
  pisces: [
    ["Intuitiv his-tuyg'ularingiz bugun eng aniq!","Ijodiy va badiiy ishlar sizga ilhom beradi.","Romantik va lirik kayfiyatda bo'ling."],
    ["Qo'shiq, rasm yoki she'r orqali his-tuyg'ularingizni ifodalang.","Sezgirligingiz boshqalar uchun sovg'a.","Suv yonida vaqt o'tkazish sizga kuch beradi."],
    ["Bugun tushlaringiz real ma'no kasb etadi.","Yaqin odamingizga mehringizni ko'rsating.","Kechqurun meditatsiya kayfiyatni ko'taradi."],
  ],
};

function getDayIndex(sign: string): number {
  const d = new Date();
  return (d.getDate() + d.getMonth() * 31 + SIGNS.findIndex(s => s.id === sign)) % 3;
}

function getLuckyColor(sign: string): string {
  const d = new Date();
  return COLORS_UZ[(d.getDate() + SIGNS.findIndex(s => s.id === sign)) % COLORS_UZ.length];
}

function getMoodBar(pct: number, color: string) {
  return (
    <div style={{ height: 6, borderRadius: 99, background: "var(--sp-border)", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 1s ease" }} />
    </div>
  );
}

interface Props { accent?: string; compact?: boolean; }

export default function HoroscopeWidget({ accent = "#a78bfa", compact }: Props) {
  const [selected, setSelected] = useState<string>(() =>
    localStorage.getItem("sp_horoscope_sign") || "aries"
  );
  const [showPicker, setShowPicker] = useState(false);

  const sign = SIGNS.find(s => s.id === selected) || SIGNS[0];
  const dayIdx = getDayIndex(selected);
  const texts = TEXTS[selected]?.[dayIdx] || TEXTS["aries"][0];
  const luckyColor = getLuckyColor(selected);
  const luckyNums = sign.lucky;

  // Fake but consistent daily scores
  const d = new Date();
  const seed = d.getDate() + d.getMonth() + SIGNS.findIndex(s => s.id === selected);
  const love    = 40 + (seed * 17) % 55;
  const career  = 35 + (seed * 13) % 60;
  const health  = 50 + (seed * 11) % 45;
  const luck    = 30 + (seed * 19) % 65;

  const DAYS_UZ = ["Yakshanba","Dushanba","Seshanba","Chorshanba","Payshanba","Juma","Shanba"];
  const MONTHS_UZ = ["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"];
  const dateStr = `${DAYS_UZ[d.getDay()]}, ${d.getDate()} ${MONTHS_UZ[d.getMonth()]}`;

  const handleSign = (id: string) => {
    setSelected(id);
    localStorage.setItem("sp_horoscope_sign", id);
    setShowPicker(false);
  };

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Header */}
      <div style={{
        borderRadius: 22, padding: compact ? "16px" : "22px",
        background: `linear-gradient(145deg,${sign.color}20,${sign.color}06)`,
        border: `1px solid ${sign.color}33`,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -50, right: -50, width: 160, height: 160, borderRadius: "50%", background: `radial-gradient(circle,${sign.color}22,transparent 70%)`, pointerEvents: "none" }} />

        <div style={{ position: "absolute", top: compact ? 12 : 16, right: compact ? 12 : 20, fontSize: compact ? 48 : 64, opacity: 0.18 }}>{sign.emoji}</div>

        <div style={{ position: "relative" }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: sign.color, marginBottom: 4, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            🌟 Kunlik Burç
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: compact ? 28 : 36 }}>{sign.emoji}</span>
            <div>
              <p style={{ fontSize: compact ? 18 : 24, fontWeight: 800, color: "var(--sp-text)" }}>{sign.uz}</p>
              <p style={{ fontSize: 10, color: "var(--sp-text-muted)" }}>{sign.date} · {sign.element}</p>
            </div>
          </div>
          <p style={{ fontSize: compact ? 11 : 12, color: "var(--sp-text-muted)", lineHeight: 1.65, marginBottom: 8 }}>
            {texts[0]}
          </p>
          <p style={{ fontSize: 10, color: "var(--sp-text-dim)" }}>{dateStr}</p>
        </div>
      </div>

      {/* Daily scores */}
      <div style={{
        borderRadius: 16, padding: compact ? 14 : 18,
        background: "var(--sp-surface)", border: "1px solid var(--sp-border)",
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--sp-text)", marginBottom: 2 }}>📊 Kunlik ko'rsatkichlar</p>
        {[
          { label: "❤️ Muhabbat",   pct: love,   color: "#f472b6" },
          { label: "💼 Martaba",    pct: career, color: "#60a5fa" },
          { label: "🌿 Sog'liq",    pct: health, color: "#34d399" },
          { label: "🍀 Omad",       pct: luck,   color: sign.color },
        ].map(item => (
          <div key={item.label}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--sp-text-muted)", marginBottom: 4 }}>
              <span>{item.label}</span>
              <span style={{ color: item.color, fontWeight: 700 }}>{item.pct}%</span>
            </div>
            {getMoodBar(item.pct, item.color)}
          </div>
        ))}
      </div>

      {/* Lucky numbers + color + advice */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{
          borderRadius: 14, padding: "12px 14px",
          background: "var(--sp-surface)", border: "1px solid var(--sp-border)",
        }}>
          <p style={{ fontSize: 10, color: "var(--sp-text-muted)", marginBottom: 6 }}>🎲 Omadli raqamlar</p>
          <div style={{ display: "flex", gap: 6 }}>
            {luckyNums.map(n => (
              <span key={n} style={{
                width: 30, height: 30, borderRadius: "50%",
                background: `${sign.color}22`, border: `1px solid ${sign.color}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, color: sign.color,
              }}>{n}</span>
            ))}
          </div>
        </div>
        <div style={{
          borderRadius: 14, padding: "12px 14px",
          background: "var(--sp-surface)", border: "1px solid var(--sp-border)",
        }}>
          <p style={{ fontSize: 10, color: "var(--sp-text-muted)", marginBottom: 6 }}>🎨 Omadli rang</p>
          <p style={{ fontSize: 15, fontWeight: 800, color: sign.color }}>{luckyColor}</p>
          <p style={{ fontSize: 9, color: "var(--sp-text-dim)" }}>Bugun ushbu rangda keling!</p>
        </div>
      </div>

      {/* Extra advice */}
      <div style={{
        borderRadius: 14, padding: "12px 14px",
        background: `${sign.color}0a`, border: `1px solid ${sign.color}22`,
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: sign.color }}>✨ Bugungi maslahatlar</p>
        {texts.slice(1).map((t, i) => (
          <p key={i} style={{ fontSize: 11, color: "var(--sp-text-muted)", lineHeight: 1.5 }}>• {t}</p>
        ))}
      </div>

      {/* Sign picker */}
      <button
        onClick={() => setShowPicker(s => !s)}
        style={{
          padding: "10px 16px", borderRadius: 14, border: `1px solid ${sign.color}44`,
          background: `${sign.color}10`, color: sign.color, fontWeight: 600, fontSize: 12,
          fontFamily: "inherit", cursor: "pointer", textAlign: "center",
        }}
      >
        {showPicker ? "✕ Yopish" : `${sign.emoji} Burçni o'zgartirish`}
      </button>

      {showPicker && (
        <div style={{
          display: "grid", gridTemplateColumns: compact ? "repeat(3,1fr)" : "repeat(4,1fr)", gap: 8,
          borderRadius: 16, padding: 12,
          background: "var(--sp-surface)", border: "1px solid var(--sp-border)",
        }}>
          {SIGNS.map(s => (
            <button key={s.id} onClick={() => handleSign(s.id)}
              style={{
                padding: "8px 4px", borderRadius: 10, border: `1px solid ${selected===s.id ? s.color+"66" : "var(--sp-border)"}`,
                background: selected===s.id ? `${s.color}18` : "transparent",
                cursor: "pointer", fontFamily: "inherit",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              }}>
              <span style={{ fontSize: 20 }}>{s.emoji}</span>
              <span style={{ fontSize: 8, color: selected===s.id ? s.color : "var(--sp-text-dim)", fontWeight: 600, lineHeight: 1.2, textAlign: "center" }}>
                {s.uz.split(" ")[0]}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

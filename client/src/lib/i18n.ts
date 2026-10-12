export type Lang = "uz" | "en" | "ru";

export const LANG_LABELS: Record<Lang, string> = {
  uz: "O'zbek 🇺🇿",
  en: "English 🇬🇧",
  ru: "Русский 🇷🇺",
};

export interface Translations {
  tabs: string[];
  search: string;
  timer: string;
  timerClose: string;
  install: string;
  online: string;
  offline: string;
  settings: string;
  theme: string;
  accent: string;
  customColor: string;
  keyboard: string;
  language: string;
  shortcuts: { key: string; desc: string }[];
  dragHint: string;
  version: string;
  workspace: string;
}

const T: Record<Lang, Translations> = {
  uz: {
    tabs: ["Soat","Ob-havo","Valyuta","Hisob","Messenjer","Eslatma","Kripto","Yangilik","Asboblar","Musiqa","Namoz","Burç","Hazil","Sport","Shaxmat"],
    search: "Qidirish",
    timer: "Taymer",
    timerClose: "Yopish",
    install: "O'rnatish",
    online: "Online",
    offline: "Oflayn",
    settings: "Sozlamalar",
    theme: "Tema",
    accent: "Asosiy rang",
    customColor: "Maxsus rang",
    keyboard: "Klaviatura",
    language: "Til",
    shortcuts: [
      { key:"1–9, 0", desc:"Tab almashtirish" },
      { key:"Ctrl+K", desc:"Tez qidiruv"      },
    ],
    dragHint: "Sudrab tartiblash",
    version: "v4.0",
    workspace: "Ish maydoni",
  },
  en: {
    tabs: ["Clock","Weather","Currency","Calculator","Messenger","Notes","Crypto","News","Tools","Music","Prayer","Horoscope","Jokes","Sports","Chess"],
    search: "Search",
    timer: "Timer",
    timerClose: "Close",
    install: "Install",
    online: "Online",
    offline: "Offline",
    settings: "Settings",
    theme: "Theme",
    accent: "Accent color",
    customColor: "Custom color",
    keyboard: "Keyboard",
    language: "Language",
    shortcuts: [
      { key:"1–9, 0", desc:"Switch tab"    },
      { key:"Ctrl+K", desc:"Quick search"  },
    ],
    dragHint: "Drag to reorder",
    version: "v4.0",
    workspace: "Workspace",
  },
  ru: {
    tabs: ["Часы","Погода","Валюта","Калькулятор","Мессенджер","Заметки","Крипто","Новости","Инструменты","Музыка","Намоз","Гороскоп","Приколы","Спорт","Шахматы"],
    search: "Поиск",
    timer: "Таймер",
    timerClose: "Закрыть",
    install: "Установить",
    online: "Онлайн",
    offline: "Офлайн",
    settings: "Настройки",
    theme: "Тема",
    accent: "Акцент",
    customColor: "Свой цвет",
    keyboard: "Клавиши",
    language: "Язык",
    shortcuts: [
      { key:"1–9, 0", desc:"Переключить вкладку" },
      { key:"Ctrl+K", desc:"Быстрый поиск"       },
    ],
    dragHint: "Перетащите для сортировки",
    version: "v4.0",
    workspace: "Рабочая область",
  },
};

export function getT(lang: Lang): Translations { return T[lang]; }

export function loadLang(): Lang {
  const v = localStorage.getItem("sp_lang");
  return (v === "uz" || v === "en" || v === "ru") ? v : "uz";
}
export function saveLang(l: Lang) { localStorage.setItem("sp_lang", l); }

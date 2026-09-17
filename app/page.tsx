"use client";

import { useEffect, useRef, useState } from "react";

const vocabularySets = [
  [
    { kind: "word", label: "сөз", value: "рахмет", translation: "Sag boluň", simple: true },
    { kind: "phrase", label: "СӨЗ ТІРКЕСІ", value: "Қайда барасыз?", translation: "Nirä barýaňyz?" },
    { kind: "answer", label: "ЖАУАП", value: "Жақсы, рақмет!", translation: "Gowy, sag boluň!" },
  ],
  [
    { kind: "word", label: "сөз", value: "сәлем", translation: "Salam", simple: true },
    { kind: "phrase", label: "СӨЗ ТІРКЕСІ", value: "Қалыңыз қалай?", translation: "Halyňyz nähili?" },
    { kind: "answer", label: "ЖАУАП", value: "Жақсымын, рақмет!", translation: "Gowymy, sag boluň!" },
  ],
  [
    { kind: "word", label: "сөз", value: "кітапхана", translation: "Kitaphana", simple: true },
    { kind: "phrase", label: "СӨЗ ТІРКЕСІ", value: "Кітапхана қайда?", translation: "Kitaphana nirede?" },
    { kind: "answer", label: "ЖАУАП", value: "Ол ана жерде.", translation: "Ol ana ýerde." },
  ],
];

const translations: Record<string, { kazakh: string; russian: string; note: string; example: string }> = {
  "sag boluň": { kazakh: "Рақмет", russian: "Спасибо", note: "Alkyş bildirmek üçin aýdylýar.", example: "Sag boluň! — Рақмет!" },
  "salam": { kazakh: "Сәлем", russian: "Привет", note: "Her günki salamlaşyk sözi.", example: "Salam! Halyňyz nähili?" },
  "meniň adym erbolat": { kazakh: "Менің атым Ерболат", russian: "Меня зовут Ерболат", note: "Özüňizi tanatmak üçin ulanylýan söz düzümi.", example: "Meniň adym Erbolat." },
};

const interfaceLanguages = [
  { code: "ҚАЗ", label: "Қазақша", translateCode: "kk" },
  { code: "ENG", label: "English", translateCode: "en" },
  { code: "TKM", label: "Türkmençe", translateCode: "tk" },
  { code: "ДАРИ", label: "دری — Ауғанстан", translateCode: "fa" },
  { code: "ПУШ", label: "پښتو — Ауғанстан", translateCode: "ps" },
  { code: "БЕЛ", label: "Беларуская", translateCode: "be" },
  { code: "HUN", label: "Magyar", translateCode: "hu" },
  { code: "ҚЫР", label: "Кыргызча", translateCode: "ky" },
  { code: "中文", label: "中文", translateCode: "zh-CN" },
  { code: "МОН", label: "Монгол", translateCode: "mn" },
  { code: "URD", label: "اردو — Пәкістан", translateCode: "ur" },
  { code: "RUS", label: "Русский", translateCode: "ru" },
  { code: "ТӘЖ", label: "Тоҷикӣ", translateCode: "tg" },
  { code: "TUR", label: "Türkçe", translateCode: "tr" },
  { code: "UZB", label: "O‘zbekcha", translateCode: "uz" },
  { code: "UKR", label: "Українська", translateCode: "uk" },
];

export default function Home() {
  const [isListening, setIsListening] = useState(false);
  const [vocabularyIndex, setVocabularyIndex] = useState(0);
  const [sourceText, setSourceText] = useState("");
  const [translation, setTranslation] = useState<{ kazakh: string; russian: string; note: string; example: string } | null>(null);
  const [selectedLanguageCode, setSelectedLanguageCode] = useState("TKM");
  const radioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setVocabularyIndex((current) => (current + 1) % vocabularySets.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, []);

  const currentVocabulary = vocabularySets[vocabularyIndex];
  const selectedLanguage = interfaceLanguages.find((language) => language.code === selectedLanguageCode) ?? interfaceLanguages[2];

  const toggleRadio = async () => {
    const radio = radioRef.current;
    if (!radio) return;

    if (radio.paused) {
      try {
        await radio.play();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
      return;
    }

    radio.pause();
    setIsListening(false);
  };

  const translateText = async () => {
    const text = sourceText.trim();
    if (!text) return;
    try {
      const translate = async (target: "kk" | "ru") => {
        const query = new URLSearchParams({ client: "gtx", sl: selectedLanguage.translateCode, tl: target, dt: "t", q: text });
        const response = await fetch(`https://translate.googleapis.com/translate_a/single?${query}`);
        const data: unknown = await response.json();
        if (!response.ok || !Array.isArray(data) || !Array.isArray(data[0])) throw new Error("Translation request failed");
        return data[0].map((part) => Array.isArray(part) && typeof part[0] === "string" ? part[0] : "").join("");
      };

      const [kazakh, russian] = await Promise.all([translate("kk"), translate("ru")]);
      setTranslation({ kazakh, russian, note: `${selectedLanguage.label} тілінен автоматты аударма`, example: text });
    } catch {
      setTranslation(translations[text.toLowerCase()] ?? { kazakh: "Аударма қызметіне қосылу мүмкін болмады.", russian: "Не удалось подключиться к сервису перевода.", note: "Интернет байланысын тексеріп, қайта көріңіз.", example: text });
    }
  };

  return (
    <main>
        <audio ref={radioRef} preload="none" src="https://radio-streams.kaztrk.kz/shalqar/shalqar/icecast.audio" onPause={() => setIsListening(false)} onError={() => setIsListening(false)} />
        <div className="utility-bar"><div className="utility-inner"><span>Қазақ ұлттық аграрлық зерттеу университеті</span><div className="language-list" aria-label="Аудармаға арналған бастапқы тіл">{interfaceLanguages.map((language) => <a className={`language${language.code === selectedLanguage.code ? " active" : ""}`} href="#translator-title" onClick={() => { setSelectedLanguageCode(language.code); setTranslation(null); }} key={language.code} title={`${language.label} тілінен аудару`} aria-label={`${language.label} тілінен аудару`}>{language.code}</a>)}</div></div></div>
      <header className="site-header" id="top">
        <a className="brand" href="#top" aria-label="Ai.Saule басты беті"><span className="brand-seal"><i>AI</i></span><span className="brand-copy"><strong>Ai.Saule</strong><small>Kazakh language for KazNARU students</small></span></a>
        <div className="header-audio-group"><div className={`header-audio ${isListening ? "listening" : ""}`} aria-label="Шалқар радиосы"><div className="header-audio-wave" aria-hidden="true">{Array.from({ length: 14 }).map((_, index) => <i key={index} style={{ height: `${30 + ((index * 23) % 58)}%` }} />)}</div><button onClick={toggleRadio} aria-pressed={isListening} aria-label={isListening ? "Шалқар радиосын тоқтату" : "Шалқар радиосын қосу"}>{isListening ? "■" : "●"}</button></div><p>Diňläň. <em>Gaýtalaň.</em> Gepleşiň.</p></div>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-grid"><div className="hero-copy"><p className="section-tag light">ҚАЗҰАЗУ • ШЕТЕЛДІК СТУДЕНТТЕР ҮШІН</p><h1 id="hero-title">Қазақ тілі —<br /><em>жаңа ортаңыздың</em><br />тілі.</h1><p>Ai.Saule көмегімен ҚазҰАЗУ-дағы күнделікті өмірге керек қазақ тілін қысқа, түсінікті сабақтар арқылы үйреніңіз.</p></div><section className="hero-dictionary" aria-labelledby="hero-dictionary-title"><p className="dictionary-label">БҮГІНГІ СӨЗДІК — <span>ŞU GÜNKI SÖZLÜK</span></p><h2 id="hero-dictionary-title">Күнде бір сөз — <em>бір қадам алға.</em></h2><p className="dictionary-translation">Her gün bir söz — öňe bir ädim.</p><div className="dictionary-line" />{currentVocabulary.map((item) => <div className={`dictionary-row ${item.kind}`} key={item.kind}><span className={`dictionary-left ${item.simple ? "simple" : ""}`}>{item.label}</span><strong>{item.value}</strong><span>{item.translation}</span></div>)}</section></div><div className="hero-ring ring-one" /><div className="hero-ring ring-two" /></section>

      <section className="translator-section" aria-labelledby="translator-title"><div className="translator-wrap"><p className="translator-label">Ai.SAULE TÜRKMEN</p><h2 id="translator-title">Türkmençe söz — <em>bir ädim alğa.</em></h2><p className="translator-status"><i /> Түрікменше-қазақша және орысша аудармашы</p><div className="translator-input-head"><span>ТҮРІКМЕНШЕ</span><strong>Türkmençe</strong></div><textarea value={sourceText} onChange={(event) => setSourceText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); translateText(); } }} placeholder="Türkmençe sözi ýazyň..." /><div className="translator-actions"><div>{["Sag boluň", "Salam", "Meniň adym Erbolat"].map((example) => <button key={example} onClick={() => setSourceText(example)}>{example}</button>)}</div><button className="translate-button" onClick={translateText}>TERJIME ET →</button></div><div className="translation-results"><article><header><span>GAZAKÇA</span><b>Қазақша</b></header><p>{translation?.kazakh ?? "Аударма осында шығады"}</p></article><article><header><span>RUSÇA</span><b>Русский</b></header><p>{translation?.russian ?? "Перевод появится здесь"}</p></article></div><div className="translator-note"><strong>Ai.SAULE ТҮСІНДІРМЕСІ</strong><p>{translation?.note ?? "Türkmençe sözi giriziň. Netije hem düşündiriş şu ýerde görkeziler."}</p></div><div className="translator-example"><span>МЫСАЛ</span><p>{translation?.example ?? "Мысal sözlem şu ýerde görkeziler."}</p></div></div></section>
      <footer className="site-footer"><a className="brand" href="#top"><span className="brand-seal"><i>AI</i></span><span className="brand-copy"><strong>Ai.Saule</strong><small>Kazakh language for KazNARU students</small></span></a><p>ҚазҰАЗУ-дың шетелдік студенттеріне<br />арналған қазақ тілі порталы.</p><a className="top-link" href="#top">Жоғарыға ↑</a></footer>
    </main>
  );
}

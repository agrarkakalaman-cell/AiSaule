"use client";

/* eslint-disable jsx-a11y/media-has-caption -- The embedded source is a live radio stream without a caption track. */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

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

type Language = {
  code: string;
  label: string;
  translateCode: string;
  inputLabel: string;
  placeholder: string;
};

const interfaceLanguages: Language[] = [
  { code: "ҚАЗ", label: "Қазақша", translateCode: "kk", inputLabel: "ҚАЗАҚША", placeholder: "Қазақша мәтін жазыңыз..." },
  { code: "ENG", label: "English", translateCode: "en", inputLabel: "ENGLISH", placeholder: "Enter English text..." },
  { code: "TKM", label: "Türkmençe", translateCode: "tk", inputLabel: "TÜRKMENÇE", placeholder: "Türkmençe tekst ýazyň..." },
  { code: "ДАРИ", label: "دری — Ауғанстан", translateCode: "fa", inputLabel: "دری", placeholder: "متن را وارد کنید..." },
  { code: "ПУШ", label: "پښتو — Ауғанстан", translateCode: "ps", inputLabel: "پښتو", placeholder: "متن ولیکئ..." },
  { code: "БЕЛ", label: "Беларуская", translateCode: "be", inputLabel: "БЕЛАРУСКАЯ", placeholder: "Увядзіце тэкст..." },
  { code: "HUN", label: "Magyar", translateCode: "hu", inputLabel: "MAGYAR", placeholder: "Írja be a szöveget..." },
  { code: "ҚЫР", label: "Кыргызча", translateCode: "ky", inputLabel: "КЫРГЫЗЧА", placeholder: "Кыргызча текст жазыңыз..." },
  { code: "中文", label: "中文", translateCode: "zh-CN", inputLabel: "中文", placeholder: "请输入文本..." },
  { code: "МОН", label: "Монгол", translateCode: "mn", inputLabel: "МОНГОЛ", placeholder: "Монгол текст оруулна уу..." },
  { code: "URD", label: "اردو — Пәкістан", translateCode: "ur", inputLabel: "اردو", placeholder: "متن درج کریں..." },
  { code: "RUS", label: "Русский", translateCode: "ru", inputLabel: "РУССКИЙ", placeholder: "Введите текст на русском..." },
  { code: "ТӘЖ", label: "Тоҷикӣ", translateCode: "tg", inputLabel: "ТОҶИКӢ", placeholder: "Матнро ворид кунед..." },
  { code: "TUR", label: "Türkçe", translateCode: "tr", inputLabel: "TÜRKÇE", placeholder: "Türkçe metin yazın..." },
  { code: "UZB", label: "O‘zbekcha", translateCode: "uz", inputLabel: "O‘ZBEKCHA", placeholder: "O‘zbekcha matn kiriting..." },
  { code: "UKR", label: "Українська", translateCode: "uk", inputLabel: "УКРАЇНСЬКА", placeholder: "Введіть текст..." },
];

const targetLanguageMeta: Record<string, { short: string; label: string; placeholder: string }> = {
  kk: { short: "ҚАЗАҚША", label: "Қазақша", placeholder: "Аударма осында шығады" },
  ru: { short: "РУССКИЙ", label: "Русский", placeholder: "Перевод появится здесь" },
  tk: { short: "TÜRKMENÇE", label: "Türkmençe", placeholder: "Terjime şu ýerde peýda bolar" },
};

const examplesByLanguage: Record<string, string[]> = {
  tk: ["Sag boluň", "Salam", "Meniň adym Erbolat"],
  kk: ["Рақмет", "Сәлем", "Менің атым Ерболат"],
  ru: ["Спасибо", "Привет", "Меня зовут Ерболат"],
  en: ["Thank you", "Hello", "My name is Erbolat"],
};

type TranslationState = Record<string, { text?: string; error?: string }>;

function getTargetLanguages(sourceLanguage: string): string[] {
  if (sourceLanguage === "kk") return ["tk", "ru"];
  if (sourceLanguage === "ru") return ["kk", "tk"];
  return ["kk", "ru"];
}

function parseGoogleTranslation(data: unknown): string {
  if (!Array.isArray(data) || !Array.isArray(data[0])) throw new Error("Invalid translation response");
  const translatedText = data[0]
    .map((part) => (Array.isArray(part) && typeof part[0] === "string" ? part[0] : ""))
    .join("")
    .trim();
  if (!translatedText) throw new Error("Empty translation response");
  return translatedText;
}

const subscribeToHydration = () => () => {};

export default function Home() {
  const isReady = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [isListening, setIsListening] = useState(false);
  const [vocabularyIndex, setVocabularyIndex] = useState(0);
  const [sourceText, setSourceText] = useState("");
  const [translation, setTranslation] = useState<TranslationState>({});
  const [selectedLanguageCode, setSelectedLanguageCode] = useState("TKM");
  const [isTranslating, setIsTranslating] = useState(false);
  const radioRef = useRef<HTMLAudioElement>(null);
  const translationControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setVocabularyIndex((current) => (current + 1) % vocabularySets.length);
    }, 5000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => () => translationControllerRef.current?.abort(), []);

  const currentVocabulary = vocabularySets[vocabularyIndex];
  const selectedLanguage = interfaceLanguages.find((language) => language.code === selectedLanguageCode) ?? interfaceLanguages[2];
  const targetLanguages = getTargetLanguages(selectedLanguage.translateCode);
  const sourceExamples = examplesByLanguage[selectedLanguage.translateCode] ?? [];

  const clearPendingTranslation = () => {
    requestIdRef.current += 1;
    translationControllerRef.current?.abort();
    translationControllerRef.current = null;
    setIsTranslating(false);
    setTranslation({});
  };

  const selectLanguage = (language: Language) => {
    clearPendingTranslation();
    setSelectedLanguageCode(language.code);
  };

  const updateSourceText = (text: string) => {
    clearPendingTranslation();
    setSourceText(text);
  };

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
    if (!text || isTranslating) return;

    clearPendingTranslation();
    const requestId = requestIdRef.current;
    const controller = new AbortController();
    translationControllerRef.current = controller;
    setIsTranslating(true);
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);
    const sourceLanguage = selectedLanguage.translateCode;

    const translate = async (targetLanguage: string) => {
      try {
        const query = new URLSearchParams({ client: "gtx", sl: sourceLanguage, tl: targetLanguage, dt: "t", q: text });
        const response = await fetch(`https://translate.googleapis.com/translate_a/single?${query}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Translation request failed");
        return { text: parseGoogleTranslation(await response.json()) };
      } catch {
        return { error: controller.signal.aborted
          ? "Аударма уақыты аяқталды. Қайта көріңіз."
          : "Аударма алынбады. Қайта көріңіз." };
      }
    };

    try {
      await Promise.all(targetLanguages.map(async (targetLanguage) => {
        const result = await translate(targetLanguage);
        if (requestId === requestIdRef.current) {
          setTranslation((current) => requestId === requestIdRef.current
            ? { ...current, [targetLanguage]: result }
            : current);
        }
      }));
    } finally {
      window.clearTimeout(timeoutId);
      if (requestId === requestIdRef.current) {
        translationControllerRef.current = null;
        setIsTranslating(false);
      }
    }
  };

  return (
    <main data-ready={isReady ? "true" : "false"}>
      <audio ref={radioRef} preload="none" src="https://radio-streams.kaztrk.kz/shalqar/shalqar/icecast.audio" onPause={() => setIsListening(false)} onError={() => setIsListening(false)} />
      <div className="utility-bar"><div className="utility-inner"><span>Қазақ ұлттық аграрлық зерттеу университеті</span><div className="language-list" aria-label="Аудармаға арналған бастапқы тіл">{interfaceLanguages.map((language) => <button type="button" className={`language${language.code === selectedLanguage.code ? " active" : ""}`} onClick={() => selectLanguage(language)} key={language.code} title={`${language.label} тілінен аудару`} aria-label={`${language.label} тілінен аудару`} aria-pressed={language.code === selectedLanguage.code} disabled={!isReady}>{language.code}</button>)}</div></div></div>
      <header className="site-header" id="top">
        <a className="brand" href="#top" aria-label="Ai.Saule басты беті"><span className="brand-seal"><i>AI</i></span><span className="brand-copy"><strong>Ai.Saule</strong><small>Kazakh language for KazNARU students</small></span></a>
        <div className="header-audio-group"><div className={`header-audio ${isListening ? "listening" : ""}`} aria-label="Шалқар радиосы"><div className="header-audio-wave" aria-hidden="true">{Array.from({ length: 14 }).map((_, index) => <i key={index} style={{ height: `${30 + ((index * 23) % 58)}%` }} />)}</div><button onClick={toggleRadio} aria-pressed={isListening} aria-label={isListening ? "Шалқар радиосын тоқтату" : "Шалқар радиосын қосу"}>{isListening ? "■" : "●"}</button></div><p>Diňläň. <em>Gaýtalaň.</em> Gepleşiň.</p></div>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-grid"><div className="hero-copy"><p className="section-tag light">ҚАЗҰАЗУ • ШЕТЕЛДІК СТУДЕНТТЕР ҮШІН</p><h1 id="hero-title">Қазақ тілі —<br /><em>жаңа ортаңыздың</em><br />тілі.</h1><p>Ai.Saule көмегімен ҚазҰАЗУ-дағы күнделікті өмірге керек қазақ тілін қысқа, түсінікті сабақтар арқылы үйреніңіз.</p></div><section className="hero-dictionary" aria-labelledby="hero-dictionary-title"><p className="dictionary-label">БҮГІНГІ СӨЗДІК — <span>ŞU GÜNKI SÖZLÜK</span></p><h2 id="hero-dictionary-title">Күнде бір сөз — <em>бір қадам алға.</em></h2><p className="dictionary-translation">Her gün bir söz — öňe bir ädim.</p><div className="dictionary-line" />{currentVocabulary.map((item) => <div className={`dictionary-row ${item.kind}`} key={item.kind}><span className={`dictionary-left ${item.simple ? "simple" : ""}`}>{item.label}</span><strong>{item.value}</strong><span>{item.translation}</span></div>)}</section></div><div className="hero-ring ring-one" /><div className="hero-ring ring-two" />
      </section>

      <section className="translator-section" aria-labelledby="translator-title"><div className="translator-wrap"><p className="translator-label">Ai.SAULE TRANSLATE</p><h2 id="translator-title">{selectedLanguage.label} мәтін — <em>бір қадам алға.</em></h2><p className="translator-status"><i /> {selectedLanguage.label} тілінен аударма</p><div className="translator-input-head"><span>{selectedLanguage.inputLabel}</span><strong>{selectedLanguage.label}</strong></div><label className="sr-only" htmlFor="source-text">{selectedLanguage.label} мәтіні</label><textarea id="source-text" value={sourceText} disabled={!isReady} onChange={(event) => updateSourceText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); translateText(); } }} placeholder={selectedLanguage.placeholder} /><div className="translator-actions"><div>{sourceExamples.map((example) => <button type="button" key={example} disabled={!isReady} onClick={() => updateSourceText(example)}>{example}</button>)}</div><button type="button" className="translate-button" onClick={translateText} disabled={!isReady || !sourceText.trim() || isTranslating}>{isTranslating ? "АУДАРЫЛУДА…" : "АУДАРУ →"}</button></div><div className="translation-results" aria-live="polite">{targetLanguages.map((targetLanguage) => { const meta = targetLanguageMeta[targetLanguage]; const result = translation[targetLanguage]; return <article key={targetLanguage} data-target-language={targetLanguage}><header><span>{meta.short}</span><b>{meta.label}</b></header><p className={result?.error ? "translation-error" : undefined}>{result?.text ?? result?.error ?? meta.placeholder}</p></article>; })}</div><div className="translator-note"><strong>Ai.SAULE ТҮСІНДІРМЕСІ</strong><p>{Object.keys(translation).length ? `${selectedLanguage.label} тілінен автоматты аударма` : "Мәтінді енгізіп, «Аудару» батырмасын басыңыз."}</p></div><div className="translator-example"><span>БАСТАПҚЫ МӘТІН</span><p>{Object.keys(translation).length ? sourceText.trim() : "Аударылған мәтін осы жерде көрсетіледі."}</p></div></div></section>
      <footer className="site-footer"><a className="brand" href="#top"><span className="brand-seal"><i>AI</i></span><span className="brand-copy"><strong>Ai.Saule</strong><small>Kazakh language for KazNARU students</small></span></a><p>ҚазҰАЗУ-дың шетелдік студенттеріне<br />арналған қазақ тілі порталы.</p><a className="top-link" href="#top">Жоғарыға ↑</a></footer>
    </main>
  );
}

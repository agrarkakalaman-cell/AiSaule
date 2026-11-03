"use client";

/* eslint-disable jsx-a11y/media-has-caption -- The embedded source is a live radio stream without a caption track. */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import dailyVocabularyData from "./data/daily-vocabulary.json";
import uiCopyData from "./data/ui-copy.json";

type VocabularyEntry = {
  id: number;
  category: string;
  kazakh: string;
  translations: Record<string, string>;
};

const dailyVocabulary = dailyVocabularyData as VocabularyEntry[];
const vocabularyPageSize = 3;
const vocabularyPageCount = Math.ceil(dailyVocabulary.length / vocabularyPageSize);
const vocabularyRowKinds = ["word", "phrase", "answer"] as const;
type UiCopy = typeof uiCopyData.kk;
const uiCopy = uiCopyData as Record<string, UiCopy>;
const heroTitleSegments: Record<string, [string, string, string]> = {
  kk: ["Қазақ тілі —", "жаңа ортаңыздың", "тілі."],
  en: ["Kazakh —", "the language of your", "new environment."],
  tk: ["Gazak dili —", "täze gurşawyňyzyň", "dilidir."],
  prs: ["زبان قزاقی —", "زبان محیط جدید", "شماست."],
  ps: ["قزاقي ژبه —", "ستاسو د نوي چاپېریال", "ژبه ده."],
  be: ["Казахская мова —", "мова вашага", "новага асяроддзя."],
  hu: ["A kazah nyelv —", "az új környezeted", "nyelve."],
  ky: ["Казак тили —", "жаңы чөйрөңүздүн", "тили."],
  "zh-CN": ["哈萨克语 —", "您融入新环境的", "语言。"],
  mn: ["Казах хэл —", "таны шинэ орчны", "хэл."],
  ur: ["قازق زبان —", "آپ کے نئے ماحول کی", "زبان ہے۔"],
  ru: ["Казахский язык —", "язык вашей", "новой среды."],
  tr: ["Kazakça —", "yeni çevrenizin", "dilidir."],
  uz: ["Qozoq tili —", "yangi muhitingizning", "tili."],
  uk: ["Казахська мова —", "мова вашого", "нового середовища."],
};
const brandTaglines: Record<string, string> = {
  kk: "Қазақ тілі • ҚазҰАЗУ", en: "Kazakh language • KazNARU", tk: "Gazak dili • KazNARU",
  prs: "زبان قزاقی • KazNARU", ps: "قزاقي ژبه • KazNARU", be: "Казахская мова • KazNARU",
  hu: "Kazah nyelv • KazNARU", ky: "Казак тили • KazNARU", "zh-CN": "哈萨克语 • KazNARU",
  mn: "Казах хэл • KazNARU", ur: "قازق زبان • KazNARU", ru: "Казахский язык • KazNARU",
  tr: "Kazakça • KazNARU", uz: "Qozoq tili • KazNARU", uk: "Казахська мова • KazNARU",
};

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
  { code: "ДАРИ", label: "دری — Ауғанстан", translateCode: "prs", inputLabel: "دری", placeholder: "متن را وارد کنید..." },
  { code: "ПУШ", label: "پښتو — Ауғанстан", translateCode: "ps", inputLabel: "پښتو", placeholder: "متن ولیکئ..." },
  { code: "БЕЛ", label: "Беларуская", translateCode: "be", inputLabel: "БЕЛАРУСКАЯ", placeholder: "Увядзіце тэкст..." },
  { code: "HUN", label: "Magyar", translateCode: "hu", inputLabel: "MAGYAR", placeholder: "Írja be a szöveget..." },
  { code: "ҚЫР", label: "Кыргызча", translateCode: "ky", inputLabel: "КЫРГЫЗЧА", placeholder: "Кыргызча текст жазыңыз..." },
  { code: "中文", label: "中文", translateCode: "zh-CN", inputLabel: "中文", placeholder: "请输入文本..." },
  { code: "МОН", label: "Монгол", translateCode: "mn", inputLabel: "МОНГОЛ", placeholder: "Монгол текст оруулна уу..." },
  { code: "URD", label: "اردو — Пәкістан", translateCode: "ur", inputLabel: "اردو", placeholder: "متن درج کریں..." },
  { code: "RUS", label: "Русский", translateCode: "ru", inputLabel: "РУССКИЙ", placeholder: "Введите текст на русском..." },
  { code: "TUR", label: "Türkçe", translateCode: "tr", inputLabel: "TÜRKÇE", placeholder: "Türkçe metin yazın..." },
  { code: "UZB", label: "O‘zbekcha", translateCode: "uz", inputLabel: "O‘ZBEKCHA", placeholder: "O‘zbekcha matn kiriting..." },
  { code: "UKR", label: "Українська", translateCode: "uk", inputLabel: "УКРАЇНСЬКА", placeholder: "Введіть текст..." },
];

const targetLanguageMeta: Record<string, { short: string; label: string; placeholder: string }> = {
  kk: { short: "ҚАЗАҚША", label: "Қазақша", placeholder: "Аударма осында шығады" },
  ru: { short: "РУССКИЙ", label: "Русский", placeholder: "Перевод появится здесь" },
  tk: { short: "TÜRKMENÇE", label: "Türkmençe", placeholder: "Terjime şu ýerde peýda bolar" },
};

type TranslationState = Record<string, { text?: string; error?: string }>;

const translatorApiUrl = (process.env.NEXT_PUBLIC_TRANSLATOR_API_URL ?? "").trim().replace(/\/$/, "");
const speechSupportedLanguages = new Set(["en", "hu", "kk", "mn", "ps", "ru", "tr", "uk", "ur", "uz", "zh-CN"]);

type SpeechRecognitionEventLike = {
  results: ArrayLike<{ 0: { transcript: string } }>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start(): void;
  stop(): void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const subscribeToHydration = () => () => {};

type IconName = "arrow-left" | "arrow-right" | "download" | "mic" | "play" | "stop" | "volume" | "book" | "translate";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "mic") return <svg {...common}><rect x="8" y="3" width="8" height="12" rx="4" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" /></svg>;
  if (name === "play") return <svg {...common}><path d="m9 7 8 5-8 5Z" /></svg>;
  if (name === "stop") return <svg {...common}><rect x="7" y="7" width="10" height="10" rx="1.5" /></svg>;
  if (name === "download") return <svg {...common}><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14" /></svg>;
  if (name === "volume") return <svg {...common}><path d="M5 10v4h4l5 4V6L9 10H5Zm12-1.5a5 5 0 0 1 0 7" /></svg>;
  if (name === "book") return <svg {...common}><path d="M4 5.5A3.5 3.5 0 0 1 7.5 4H11v15H7.5A3.5 3.5 0 0 0 4 20.5v-15ZM20 5.5A3.5 3.5 0 0 0 16.5 4H13v15h3.5a3.5 3.5 0 0 1 3.5 1.5v-15Z" /></svg>;
  if (name === "translate") return <svg {...common}><path d="M4 5h9M8.5 3v2m2.5 0c-.7 3.7-2.9 6.5-6 8m2-5c1 1.8 2.4 3.2 4 4m3-1 4 10m0-10 4 10m-6-4h4" /></svg>;
  if (name === "arrow-left") return <svg {...common}><path d="m15 18-6-6 6-6" /></svg>;
  return <svg {...common}><path d="m9 18 6-6-6-6" /></svg>;
}

export default function Home() {
  const isReady = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [isListening, setIsListening] = useState(false);
  const [vocabularyIndex, setVocabularyIndex] = useState(0);
  const [selectedVocabularyId, setSelectedVocabularyId] = useState<number | null>(dailyVocabulary[0]?.id ?? null);
  const [robotMotion, setRobotMotion] = useState(0);
  const [sourceText, setSourceText] = useState("");
  const [translation, setTranslation] = useState<TranslationState>({});
  const [selectedLanguageCode, setSelectedLanguageCode] = useState("ҚАЗ");
  const [secondaryLanguageCode, setSecondaryLanguageCode] = useState("ru");
  const [isTranslating, setIsTranslating] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [speakingLanguage, setSpeakingLanguage] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState("");
  const radioRef = useRef<HTMLAudioElement>(null);
  const generatedAudioRef = useRef<HTMLAudioElement | null>(null);
  const generatedAudioUrlRef = useRef<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const translationControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setVocabularyIndex((current) => (current + 1) % vocabularyPageCount);
    }, 6000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => () => translationControllerRef.current?.abort(), []);
  useEffect(() => () => {
    if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current);
  }, []);
  useEffect(() => () => {
    recognitionRef.current?.stop();
    generatedAudioRef.current?.pause();
    if (generatedAudioUrlRef.current) URL.revokeObjectURL(generatedAudioUrlRef.current);
  }, []);

  const selectedLanguage = interfaceLanguages.find((language) => language.code === selectedLanguageCode) ?? interfaceLanguages[2];
  const copy = uiCopy[selectedLanguage.translateCode] ?? uiCopy.kk;
  const heroTitle = heroTitleSegments[selectedLanguage.translateCode] ?? heroTitleSegments.kk;
  const brandTagline = brandTaglines[selectedLanguage.translateCode] ?? brandTaglines.kk;
  const vocabularyStart = vocabularyIndex * vocabularyPageSize;
  const currentVocabulary = dailyVocabulary.slice(vocabularyStart, vocabularyStart + vocabularyPageSize).map((item, itemIndex) => ({
    ...item,
    kind: vocabularyRowKinds[itemIndex],
    translation: item.translations[selectedLanguage.translateCode] ?? item.translations.en,
  }));
  const selectVocabulary = (item: VocabularyEntry) => {
    setSelectedVocabularyId(item.id);
    setRobotMotion((current) => current + 1);
  };
  const speakVocabulary = (item: VocabularyEntry) => {
    selectVocabulary(item);
    createSpeech(item.kazakh, "kk");
  };
  const targetLanguages = ["kk", secondaryLanguageCode];
  const sourceExamples = dailyVocabulary.slice(0, 3).map((item) => item.translations[selectedLanguage.translateCode] ?? item.translations.en);
  const featureLabels = selectedLanguage.translateCode === "kk"
    ? ["Нақты аударма", "Дауыспен енгізу"]
    : [copy.translate.replace(" →", ""), copy.microphoneStart];
  const targetPlaceholder = selectedLanguage.translateCode === "uz"
    ? "Tarjima shu yerda ko‘rsatiladi."
    : copy.targetPlaceholder;

  useEffect(() => {
    document.documentElement.lang = selectedLanguage.translateCode;
    document.documentElement.dir = "ltr";
  }, [selectedLanguage.translateCode]);

  const clearPendingTranslation = () => {
    requestIdRef.current += 1;
    translationControllerRef.current?.abort();
    translationControllerRef.current = null;
    setIsTranslating(false);
    setTranslation({});
  };

  const selectLanguage = (language: Language) => {
    clearPendingTranslation();
    setVocabularyIndex(0);
    setSelectedLanguageCode(language.code);
    if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current);
    scrollFrameRef.current = null;
    const header = headerRef.current;
    if (!header) return;
    const startY = window.scrollY;
    const distance = header.getBoundingClientRect().top;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.scrollTo({ top: startY + distance, behavior: "instant" });
      return;
    }
    let startedAt: number | undefined;
    const animateScroll = (now: number) => {
      startedAt ??= now;
      const progress = Math.min((now - startedAt) / 400, 1);
      const eased = progress * progress * (3 - 2 * progress);
      window.scrollTo({ top: startY + distance * eased, behavior: "instant" });
      scrollFrameRef.current = progress < 1 ? requestAnimationFrame(animateScroll) : null;
    };
    scrollFrameRef.current = requestAnimationFrame(animateScroll);
  };

  const updateSourceText = (text: string) => {
    clearPendingTranslation();
    setSourceText(text);
  };

  const changeSecondaryLanguage = async (languageCode: string) => {
    const text = sourceText.trim();
    const kazakhTranslation = translation.kk;
    clearPendingTranslation();
    setSecondaryLanguageCode(languageCode);
    setTranslation(kazakhTranslation ? { kk: kazakhTranslation } : {});
    if (!text || !kazakhTranslation) return;

    const requestId = requestIdRef.current;
    const controller = new AbortController();
    translationControllerRef.current = controller;
    setIsTranslating(true);
    const timeoutId = window.setTimeout(() => controller.abort(), 35000);

    try {
      const response = await fetch(`${translatorApiUrl}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, source: selectedLanguage.translateCode, targets: [languageCode] }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(copy.translationFailed);
      const payload = await response.json() as { translations?: Record<string, string> };
      if (!payload.translations?.[languageCode]) throw new Error(copy.translationFailed);
      if (requestId === requestIdRef.current) {
        setTranslation((current) => ({ ...current, [languageCode]: { text: payload.translations![languageCode] } }));
      }
    } catch (caughtError) {
      if (requestId === requestIdRef.current) {
        const error = controller.signal.aborted
          ? copy.translationTimeout
          : caughtError instanceof TypeError
            ? copy.translationConnection
            : caughtError instanceof Error
              ? caughtError.message
              : copy.translationFailed;
        setTranslation((current) => ({ ...current, [languageCode]: { error } }));
      }
    } finally {
      window.clearTimeout(timeoutId);
      if (requestId === requestIdRef.current) {
        translationControllerRef.current = null;
        setIsTranslating(false);
      }
    }
  };

  const toggleDictation = () => {
    setSpeechError("");
    if (recognitionRef.current && isDictating) {
      recognitionRef.current.stop();
      return;
    }

    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setSpeechError("Бұл браузер микрофоннан мәтін енгізуді қолдамайды. Chrome немесе Edge қолданыңыз.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = selectedLanguage.translateCode === "zh-CN"
      ? "zh-CN"
      : ({ kk: "kk-KZ", ru: "ru-RU", en: "en-US", tk: "tk-TM" }[selectedLanguage.translateCode] ?? selectedLanguage.translateCode);
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => updateSourceText(event.results[0][0].transcript);
    recognition.onerror = () => {
      setSpeechError("Дауыс танылмады. Микрофон рұқсатын тексеріп, қайта көріңіз.");
      setIsDictating(false);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsDictating(false);
    };
    recognitionRef.current = recognition;
    setIsDictating(true);
    recognition.start();
  };

  const createSpeech = async (text: string, language: string, download = false) => {
    if (!text || speakingLanguage) return;
    setSpeechError("");
    setSpeakingLanguage(language);
    try {
      const response = await fetch(`${translatorApiUrl}/speech`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { detail?: string; error?: string };
        throw new Error(payload.detail ?? payload.error ?? "Дыбыс алынбады.");
      }

      const audioUrl = URL.createObjectURL(await response.blob());
      if (generatedAudioUrlRef.current) URL.revokeObjectURL(generatedAudioUrlRef.current);
      generatedAudioUrlRef.current = audioUrl;
      if (download) {
        const link = document.createElement("a");
        link.href = audioUrl;
        link.download = `aisaule-${language}.mp3`;
        link.click();
      } else {
        generatedAudioRef.current?.pause();
        const audio = new Audio(audioUrl);
        generatedAudioRef.current = audio;
        await audio.play();
      }
    } catch (error) {
      setSpeechError(error instanceof Error ? error.message : "Дыбыс алынбады.");
    } finally {
      setSpeakingLanguage(null);
    }
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
    const timeoutId = window.setTimeout(() => controller.abort(), 35000);
    const sourceLanguage = selectedLanguage.translateCode;

    try {
      const response = await fetch(`${translatorApiUrl}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, source: sourceLanguage, targets: targetLanguages }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(copy.translationFailed);
      }
      const payload = await response.json() as { translations?: Record<string, string> };
      if (!payload.translations) throw new Error(copy.translationFailed);
      if (requestId === requestIdRef.current) {
        setTranslation(Object.fromEntries(targetLanguages.map((targetLanguage) => [
          targetLanguage,
          payload.translations?.[targetLanguage]
            ? { text: payload.translations[targetLanguage] }
            : { error: copy.translationFailed },
        ])));
      }
    } catch (caughtError) {
      if (requestId === requestIdRef.current) {
        const error = controller.signal.aborted
          ? copy.translationTimeout
          : caughtError instanceof TypeError
            ? copy.translationConnection
            : caughtError instanceof Error
              ? caughtError.message
              : copy.translationFailed;
        setTranslation(Object.fromEntries(targetLanguages.map((targetLanguage) => [targetLanguage, { error }])));
      }
    } finally {
      window.clearTimeout(timeoutId);
      if (requestId === requestIdRef.current) {
        translationControllerRef.current = null;
        setIsTranslating(false);
      }
    }
  };

  return (
    <main data-ready={isReady ? "true" : "false"} data-language={selectedLanguage.translateCode} dir="ltr">
      <audio ref={radioRef} preload="none" src="https://radio-streams.kaztrk.kz/shalqar/shalqar/icecast.audio" onPause={() => setIsListening(false)} onError={() => setIsListening(false)} />
      <header ref={headerRef} className="institutional-header" id="top">
        <div className="institutional-header-inner"><a className="university-brand" href="https://www.kaznaru.edu.kz/" target="_blank" rel="noreferrer" aria-label={`${copy.university} — kaznaru.edu.kz`}><img src="/kaznaru_logo.png" alt="KazNARU" /><span className="university-name-full"><strong>ҚАЗАҚ ҰЛТТЫҚ АГРАРЛЫҚ ЗЕРТТЕУ УНИВЕРСИТЕТІ</strong><small>KAZAKH NATIONAL AGRARIAN RESEARCH UNIVERSITY</small></span><span className="university-name-short"><strong>ҚазҰАЗУ</strong><small>KazNARU</small></span></a><nav className="header-language-list" aria-label={copy.translationFrom}>{interfaceLanguages.map((language) => <button type="button" key={language.code} className={`header-language${language.code === selectedLanguage.code ? " active" : ""}`} disabled={!isReady} onClick={() => selectLanguage(language)} aria-current={language.code === selectedLanguage.code ? "true" : undefined}>{language.code}</button>)}</nav></div>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-radio"><div className={`header-audio ${isListening ? "listening" : ""}`} aria-label="Шалқар радиосы"><div className="header-audio-wave" aria-hidden="true">{Array.from({ length: 14 }).map((_, index) => <i key={index} style={{ height: `${30 + ((index * 23) % 58)}%` }} />)}</div><button onClick={toggleRadio} aria-pressed={isListening} aria-label="Шалқар радиосы">{isListening ? <Icon name="stop" size={14} /> : <Icon name="play" size={14} />}</button></div><p dir="auto">{copy.listen} <em>{copy.repeat}</em> {copy.speak}</p></div>
        <div className="hero-grid"><div className="hero-copy" dir="auto"><div className="aisaule-lockup"><span>AI</span><strong>Ai.Saule</strong></div><p className="section-tag light">{copy.audience}</p><h1 id="hero-title"><span>{heroTitle[0]}</span><em>{heroTitle[1]}</em><span>{heroTitle[2]}</span></h1><p>{copy.heroDescription}</p><div className="hero-features"><span><Icon name="translate" />{featureLabels[0]}</span><span><Icon name="mic" />{featureLabels[1]}</span></div></div><div className="dictionary-scene"><i className="monitor-contact-shadow" aria-hidden="true" /><i className="robot-contact-shadow" aria-hidden="true" /><section className="hero-dictionary" aria-labelledby="hero-dictionary-title"><img className="dictionary-monitor" src="/images/monitor.png" alt="" aria-hidden="true" /><div className="dictionary-screen"><header className="dictionary-heading"><Icon name="book" size={22} /><h2 id="hero-dictionary-title">{copy.dailyVocabulary}</h2><span dir="auto">{selectedLanguage.label}</span></header><div className="dictionary-list" key={`${selectedLanguage.translateCode}-${vocabularyIndex}`} aria-live="polite">{currentVocabulary.map((item) => <button type="button" className={`dictionary-row ${item.kind}${selectedVocabularyId === item.id ? " selected" : ""}`} key={item.id} onClick={() => selectVocabulary(item)} aria-pressed={selectedVocabularyId === item.id}><span className="dictionary-left">{item.category}</span><strong>{item.kazakh}</strong>{selectedLanguage.translateCode !== "kk" && <span dir="auto" className="dictionary-meaning">{item.translation}</span>}<span className="row-speech" role="button" tabIndex={0} aria-label={`${item.kazakh} — ${copy.listenTitle}`} title={copy.listenTitle} onClick={(event) => { event.stopPropagation(); speakVocabulary(item); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); speakVocabulary(item); } }}><Icon name="volume" size={16} /></span></button>)}</div><div className="dictionary-pages" aria-label={copy.dailyVocabulary}><button type="button" onClick={() => setVocabularyIndex((current) => (current - 1 + vocabularyPageCount) % vocabularyPageCount)} aria-label={copy.previousWords}><Icon name="arrow-left" size={17} /></button><span>{vocabularyStart + 1}–{Math.min(vocabularyStart + vocabularyPageSize, dailyVocabulary.length)} / {dailyVocabulary.length}</span><button type="button" onClick={() => setVocabularyIndex((current) => (current + 1) % vocabularyPageCount)} aria-label={copy.nextWords}><Icon name="arrow-right" size={17} /></button></div></div></section><div key={robotMotion} className={`dictionary-robot${robotMotion ? " bow" : ""}`}><div className="robot-body"><img src="/images/aiSaule-blank-face.png" alt="Ai.Saule" /><span className="robot-face" aria-hidden="true"><span className={`robot-eyes${robotMotion ? " look" : ""}`}><i /><i /></span><i className="robot-mouth" /></span></div></div></div></div>
      </section>

      <section className="translator-section" aria-labelledby="translator-title">
        <div className="translator-wrap">
          <p className="translator-label">Ai.SAULE • {copy.translate.replace(" →", "")}</p>
          <h2 id="translator-title" dir="auto">{selectedLanguage.label} {copy.textLabel} — <em>{copy.dictionaryAccent}</em></h2>
          <div className="translator-workbench"><div className="source-panel"><div className="translator-input-head"><span>{selectedLanguage.inputLabel}</span><strong>{selectedLanguage.label}</strong></div><div className="translator-input"><label className="sr-only" htmlFor="source-text">{selectedLanguage.label} {copy.textLabel}</label><textarea id="source-text" dir="auto" value={sourceText} disabled={!isReady} onChange={(event) => updateSourceText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); translateText(); } }} placeholder={selectedLanguage.placeholder} /><button type="button" className={`dictation-button${isDictating ? " active" : ""}`} onClick={toggleDictation} disabled={!isReady} aria-pressed={isDictating} aria-label={isDictating ? copy.microphoneStop : copy.microphoneStart} title={copy.microphoneStart}>{isDictating ? <Icon name="stop" /> : <Icon name="mic" />}</button></div><div className="translator-actions"><div>{sourceExamples.map((example, index) => <button type="button" key={`${selectedLanguage.translateCode}-${index}`} disabled={!isReady} onClick={() => updateSourceText(example)}>{example}</button>)}</div></div></div><button type="button" className="translate-button central-translate" onClick={translateText} disabled={!isReady || !sourceText.trim() || isTranslating} aria-label={copy.translate}>{isTranslating ? <span>{copy.translating}</span> : <><span>{copy.translate.replace(" →", "")}</span><Icon name="arrow-right" size={19} /></>}</button><div className="translation-results" aria-live="polite">{targetLanguages.map((targetLanguage) => {
            const language = interfaceLanguages.find((item) => item.translateCode === targetLanguage)!;
            const meta = targetLanguageMeta[targetLanguage] ?? { short: language.inputLabel, label: language.label, placeholder: copy.targetPlaceholder };
            const result = translation[targetLanguage];
            const hasSpeech = speechSupportedLanguages.has(targetLanguage);
            return <article key={targetLanguage} data-target-language={targetLanguage}><header><span>{meta.short}</span><div>{targetLanguage !== "kk" && <><label className="sr-only" htmlFor="secondary-target-language">{copy.secondaryLanguage}</label><select id="secondary-target-language" className="target-language-select" aria-label={copy.secondaryLanguage} value={secondaryLanguageCode} disabled={!isReady || isTranslating} onChange={(event) => changeSecondaryLanguage(event.target.value)}>{interfaceLanguages.filter((item) => item.translateCode !== "kk").map((item) => <option key={item.translateCode} value={item.translateCode}>{item.label}</option>)}</select></>}<button type="button" className="speech-button" onClick={() => createSpeech(result?.text ?? "", targetLanguage)} disabled={!hasSpeech || !result?.text || speakingLanguage !== null} aria-label={`${meta.label} ${copy.listenTranslation}`} title={hasSpeech ? copy.listenTitle : copy.speechUnsupported}>{speakingLanguage === targetLanguage ? "…" : <Icon name="volume" size={16} />}</button><button type="button" className="speech-button" onClick={() => createSpeech(result?.text ?? "", targetLanguage, true)} disabled={!hasSpeech || !result?.text || speakingLanguage !== null} aria-label={`${meta.label} ${copy.downloadTranslation}`} title={hasSpeech ? copy.downloadTitle : copy.speechUnsupported}><Icon name="download" size={16} /></button></div></header><p dir="auto" className={result?.error ? "translation-error" : undefined}>{result?.text ?? result?.error ?? targetPlaceholder}</p></article>;
          })}</div></div>{speechError && <p className="speech-error" role="alert">{speechError}</p>}
          <div className="translator-note" dir="auto"><strong>{copy.explanationTitle}</strong><p>{Object.keys(translation).length ? copy.automaticTranslation : copy.explanationEmpty}</p></div>
          <div className="translator-example"><span dir="auto">{copy.sourceText}</span><p dir="auto">{Object.keys(translation).length ? sourceText.trim() : copy.sourcePlaceholder}</p></div>
        </div>
      </section>
      <footer className="site-footer"><a className="brand" href="#top"><span className="brand-seal"><i>AI</i></span><span className="brand-copy"><strong>Ai.Saule</strong><small>{brandTagline}</small></span></a><p className="department-credit" dir="auto">{copy.department}</p><a className="top-link" href="#top">{copy.top}</a></footer>
    </main>
  );
}

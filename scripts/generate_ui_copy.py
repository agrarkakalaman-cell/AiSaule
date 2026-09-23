"""Generate the bundled interface copy through the local translation backend."""

import json
from pathlib import Path

import httpx


ROOT = Path(__file__).resolve().parents[1]
API_URL = "http://127.0.0.1:8001/translate"
LANGUAGE_GROUPS = [
    ["en", "tk", "prs", "ps", "be", "hu", "ky"],
    ["zh-CN", "mn", "ur", "ru", "tr", "uz", "uk"],
]
BASE_COPY = {
    "university": "Қазақ ұлттық аграрлық зерттеу университеті",
    "audience": "KazNARU • ШЕТЕЛДІК СТУДЕНТТЕР ҮШІН",
    "heroLead": "Қазақ тілі —",
    "heroAccent": "жаңа ортаңыздың",
    "heroEnd": "тілі.",
    "heroDescription": "Ai.Saule көмегімен KazNARU-дағы күнделікті өмірге керек қазақ тілін қысқа, түсінікті сабақтар арқылы үйреніңіз.",
    "listen": "Тыңдаңыз.",
    "repeat": "Қайталаңыз.",
    "speak": "Сөйлеңіз.",
    "dailyVocabulary": "КҮНДЕЛІКТІ 300 СӨЗ",
    "dictionaryLead": "Күнде бір сөз —",
    "dictionaryAccent": "бір қадам алға.",
    "dictionaryDescription": "KazNARU-да жиі қолданылатын қазақ сөздері мен тіркестері",
    "textLabel": "мәтін",
    "translationFrom": "тілінен аударма",
    "translate": "АУДАРУ →",
    "translating": "АУДАРЫЛУДА…",
    "explanationTitle": "AI.SAULE ТҮСІНДІРМЕСІ",
    "explanationEmpty": "Мәтінді енгізіп, «Аудару» батырмасын басыңыз.",
    "automaticTranslation": "тілінен автоматты аударма",
    "sourceText": "БАСТАПҚЫ МӘТІН",
    "sourcePlaceholder": "Аударылған мәтін осы жерде көрсетіледі.",
    "targetPlaceholder": "Аударма осында шығады",
    "previousWords": "Алдыңғы үш сөз",
    "nextWords": "Келесі үш сөз",
    "top": "Жоғарыға ↑",
    "translationFailed": "Аударма алынбады. Қайта көріңіз.",
    "translationTimeout": "Аударма уақыты аяқталды. Қайта көріңіз.",
    "translationConnection": "Аударма сервисімен байланыс жоқ. Қайта көріңіз.",
    "listenTranslation": "аудармасын тыңдау",
    "downloadTranslation": "аудармасын MP3 форматында жүктеу",
    "listenTitle": "Тыңдау",
    "downloadTitle": "MP3 жүктеу",
    "speechUnsupported": "Azure Speech бұл тілді қолдамайды",
    "microphoneStart": "Микрофонмен мәтін енгізу",
    "microphoneStop": "Микрофонды тоқтату",
    "secondaryLanguage": "Екінші аударма тілі",
    "department": "Жасанды интеллект және цифрлық трансформация бөлімі",
}


def main() -> None:
    copy = {language: {} for group in LANGUAGE_GROUPS for language in group}
    copy["kk"] = dict(BASE_COPY)
    copy["kk"].update({
        "audience": "ҚАЗҰАЗУ • ШЕТЕЛДІК СТУДЕНТТЕР ҮШІН",
        "heroDescription": "Ai.Saule көмегімен ҚазҰАЗУ-дағы күнделікті өмірге керек қазақ тілін қысқа, түсінікті сабақтар арқылы үйреніңіз.",
        "dictionaryDescription": "ҚазҰАЗУ-да жиі қолданылатын қазақ сөздері мен тіркестері",
    })
    with httpx.Client(timeout=40.0) as client:
        for key, text in BASE_COPY.items():
            for targets in LANGUAGE_GROUPS:
                response = client.post(API_URL, json={"text": text, "source": "kk", "targets": targets})
                response.raise_for_status()
                for language, translation in response.json()["translations"].items():
                    copy[language][key] = translation

    copy["en"]["department"] = "Department of Artificial Intelligence and Digital Transformation"
    copy["ru"]["department"] = "Отдел искусственного интеллекта и цифровой трансформации"

    required_keys = set(BASE_COPY)
    assert len(copy) == 15
    assert all(set(language_copy) == required_keys for language_copy in copy.values())
    output = ROOT / "app" / "data" / "ui-copy.json"
    output.write_text(json.dumps(copy, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Generated UI copy for {len(copy)} languages at {output}")


if __name__ == "__main__":
    main()

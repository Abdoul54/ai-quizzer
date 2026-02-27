export type Direction = "ltr" | "rtl";

export const languages: {
    code: LanguageCode;
    direction: Direction;
    labels: {
        ar: string
        fr: string
        en: string
        es: string
        pt: string
        it: string
        de: string
        ru: string
    }
}[] = [
        {
            "code": "ar",
            "direction": "rtl",
            "labels": {
                "ar": "العربية",
                "fr": "Arabe",
                "en": "Arabic",
                "es": "Árabe",
                "pt": "Árabe",
                "it": "Arabo",
                "de": "Arabisch",
                "ru": "Арабский"
            }
        },
        {
            "code": "fr",
            "direction": "ltr",
            "labels": {
                "ar": "الفرنسية",
                "fr": "Français",
                "en": "French",
                "es": "Francés",
                "pt": "Francês",
                "it": "Francese",
                "de": "Französisch",
                "ru": "Французский"
            }
        },
        {
            "code": "en",
            "direction": "ltr",
            "labels": {
                "ar": "الإنجليزية",
                "fr": "Anglais",
                "en": "English",
                "es": "Inglés",
                "pt": "Inglês",
                "it": "Inglese",
                "de": "Englisch",
                "ru": "Английский"
            }
        },
        {
            "code": "es",
            "direction": "ltr",
            "labels": {
                "ar": "الإسبانية",
                "fr": "Espagnol",
                "en": "Spanish",
                "es": "Español",
                "pt": "Espanhol",
                "it": "Spagnolo",
                "de": "Spanisch",
                "ru": "Испанский"
            }
        },
        {
            "code": "pt",
            "direction": "ltr",
            "labels": {
                "ar": "البرتغالية",
                "fr": "Portugais",
                "en": "Portuguese",
                "es": "Portugués",
                "pt": "Português",
                "it": "Portoghese",
                "de": "Portugiesisch",
                "ru": "Португальский"
            }
        },
        {
            "code": "it",
            "direction": "ltr",
            "labels": {
                "ar": "الإيطالية",
                "fr": "Italien",
                "en": "Italian",
                "es": "Italiano",
                "pt": "Italiano",
                "it": "Italiano",
                "de": "Italienisch",
                "ru": "Итальянский"
            }
        },
        {
            "code": "de",
            "direction": "ltr",
            "labels": {
                "ar": "الألمانية",
                "fr": "Allemand",
                "en": "German",
                "es": "Alemán",
                "pt": "Alemão",
                "it": "Tedesco",
                "de": "Deutsch",
                "ru": "Немецкий"
            }
        },
        {
            "code": "ru",
            "direction": "ltr",
            "labels": {
                "ar": "الروسية",
                "fr": "Russe",
                "en": "Russian",
                "es": "Ruso",
                "pt": "Russo",
                "it": "Russo",
                "de": "Russisch",
                "ru": "Русский"
            }
        }
    ];

export const languageCodes = [
    "ar",
    "fr",
    "en",
    "es",
    "pt",
    "it",
    "de",
    "ru",
] as const;

export const getLanguage = (code: LanguageCode) => {
    return languages.find(l => l.code === code);
};

export const getDirection = (code: LanguageCode): Direction | undefined => {
    return languages.find(l => l.code === code)?.direction;
};

export const getLanguageLabel = (
    targetLanguage: LanguageCode,
    uiLanguage: LanguageCode
): string | undefined => {
    return languages.find(l => l.code === targetLanguage)?.labels[uiLanguage];
};

export type LanguageCode = typeof languageCodes[number];
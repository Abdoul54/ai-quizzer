import { getDirection, type LanguageCode } from "./languages";

// ─── Translation dictionary ───────────────────────────────────────────────────

const dict = {
    // ── App shell ──────────────────────────────────────────────────────────────
    "app.name": {
        en: "AI Quizzer", fr: "AI Quizzer", ar: "AI Quizzer",
        es: "AI Quizzer", pt: "AI Quizzer", it: "AI Quizzer",
        de: "AI Quizzer", ru: "AI Quizzer",
    },
    "nav.platform": {
        en: "Platform", fr: "Plateforme", ar: "المنصة",
        es: "Plataforma", pt: "Plataforma", it: "Piattaforma",
        de: "Plattform", ru: "Платформа",
    },
    "nav.quizzes": {
        en: "Quizzes", fr: "Quiz", ar: "الاختبارات",
        es: "Cuestionarios", pt: "Questionários", it: "Quiz",
        de: "Tests", ru: "Тесты",
    },

    // ── User menu ──────────────────────────────────────────────────────────────
    "user.account": {
        en: "Account", fr: "Compte", ar: "الحساب",
        es: "Cuenta", pt: "Conta", it: "Account",
        de: "Konto", ru: "Аккаунт",
    },
    "user.profile": {
        en: "Profile", fr: "Profil", ar: "الملف الشخصي",
        es: "Perfil", pt: "Perfil", it: "Profilo",
        de: "Profil", ru: "Профиль",
    },
    "user.settings": {
        en: "Settings", fr: "Paramètres", ar: "الإعدادات",
        es: "Configuración", pt: "Configurações", it: "Impostazioni",
        de: "Einstellungen", ru: "Настройки",
    },
    "user.signOut": {
        en: "Sign out", fr: "Se déconnecter", ar: "تسجيل الخروج",
        es: "Cerrar sesión", pt: "Sair", it: "Esci",
        de: "Abmelden", ru: "Выйти",
    },

    // ── Profile page ───────────────────────────────────────────────────────────
    "profile.title": {
        en: "Profile", fr: "Profil", ar: "الملف الشخصي",
        es: "Perfil", pt: "Perfil", it: "Profilo",
        de: "Profil", ru: "Профиль",
    },
    "profile.subtitle": {
        en: "Manage your account settings",
        fr: "Gérez les paramètres de votre compte",
        ar: "إدارة إعدادات حسابك",
        es: "Gestiona la configuración de tu cuenta",
        pt: "Gerencie as configurações da sua conta",
        it: "Gestisci le impostazioni del tuo account",
        de: "Verwalte deine Kontoeinstellungen",
        ru: "Управление настройками аккаунта",
    },
    "profile.personalInfo": {
        en: "Personal Information",
        fr: "Informations personnelles",
        ar: "المعلومات الشخصية",
        es: "Información personal",
        pt: "Informações pessoais",
        it: "Informazioni personali",
        de: "Persönliche Daten",
        ru: "Личная информация",
    },
    "profile.personalInfoDesc": {
        en: "Update your name and preferred language.",
        fr: "Mettez à jour votre nom et votre langue préférée.",
        ar: "تحديث اسمك ولغتك المفضلة.",
        es: "Actualiza tu nombre y el idioma preferido.",
        pt: "Atualize seu nome e idioma preferido.",
        it: "Aggiorna il tuo nome e la lingua preferita.",
        de: "Aktualisiere deinen Namen und die bevorzugte Sprache.",
        ru: "Обновите своё имя и предпочтительный язык.",
    },
    "profile.name": {
        en: "Name", fr: "Nom", ar: "الاسم",
        es: "Nombre", pt: "Nome", it: "Nome",
        de: "Name", ru: "Имя",
    },
    "profile.email": {
        en: "Email", fr: "E-mail", ar: "البريد الإلكتروني",
        es: "Correo electrónico", pt: "E-mail", it: "Email",
        de: "E-Mail", ru: "Электронная почта",
    },
    "profile.emailNote": {
        en: "Email cannot be changed here.",
        fr: "L'e-mail ne peut pas être modifié ici.",
        ar: "لا يمكن تغيير البريد الإلكتروني هنا.",
        es: "El correo no se puede cambiar aquí.",
        pt: "O e-mail não pode ser alterado aqui.",
        it: "L'email non può essere modificata qui.",
        de: "E-Mail kann hier nicht geändert werden.",
        ru: "Электронную почту нельзя изменить здесь.",
    },
    "profile.language": {
        en: "Language", fr: "Langue", ar: "اللغة",
        es: "Idioma", pt: "Idioma", it: "Lingua",
        de: "Sprache", ru: "Язык",
    },
    "profile.saveChanges": {
        en: "Save changes", fr: "Enregistrer", ar: "حفظ التغييرات",
        es: "Guardar cambios", pt: "Salvar alterações", it: "Salva modifiche",
        de: "Änderungen speichern", ru: "Сохранить изменения",
    },
    "profile.password": {
        en: "Password", fr: "Mot de passe", ar: "كلمة المرور",
        es: "Contraseña", pt: "Senha", it: "Password",
        de: "Passwort", ru: "Пароль",
    },
    "profile.passwordDesc": {
        en: "Choose a strong password. Other sessions will be signed out.",
        fr: "Choisissez un mot de passe fort. Les autres sessions seront déconnectées.",
        ar: "اختر كلمة مرور قوية. سيتم تسجيل الخروج من الجلسات الأخرى.",
        es: "Elige una contraseña segura. Las otras sesiones se cerrarán.",
        pt: "Escolha uma senha forte. Outras sessões serão encerradas.",
        it: "Scegli una password sicura. Le altre sessioni verranno disconnesse.",
        de: "Wähle ein sicheres Passwort. Andere Sitzungen werden abgemeldet.",
        ru: "Выберите надёжный пароль. Другие сеансы будут завершены.",
    },
    "profile.currentPassword": {
        en: "Current Password", fr: "Mot de passe actuel", ar: "كلمة المرور الحالية",
        es: "Contraseña actual", pt: "Senha atual", it: "Password attuale",
        de: "Aktuelles Passwort", ru: "Текущий пароль",
    },
    "profile.newPassword": {
        en: "New Password", fr: "Nouveau mot de passe", ar: "كلمة المرور الجديدة",
        es: "Nueva contraseña", pt: "Nova senha", it: "Nuova password",
        de: "Neues Passwort", ru: "Новый пароль",
    },
    "profile.updatePassword": {
        en: "Update password", fr: "Mettre à jour le mot de passe", ar: "تحديث كلمة المرور",
        es: "Actualizar contraseña", pt: "Atualizar senha", it: "Aggiorna password",
        de: "Passwort aktualisieren", ru: "Обновить пароль",
    },

    // ── Quizzes list ───────────────────────────────────────────────────────────
    "quizzes.title": {
        en: "Quizzes", fr: "Quiz", ar: "الاختبارات",
        es: "Cuestionarios", pt: "Questionários", it: "Quiz",
        de: "Tests", ru: "Тесты",
    },
    "quizzes.new": {
        en: "New Quiz", fr: "Nouveau quiz", ar: "اختبار جديد",
        es: "Nuevo cuestionario", pt: "Novo questionário", it: "Nuovo quiz",
        de: "Neuer Test", ru: "Новый тест",
    },
    "quizzes.empty": {
        en: "No quizzes yet", fr: "Aucun quiz pour l'instant", ar: "لا توجد اختبارات بعد",
        es: "Aún no hay cuestionarios", pt: "Nenhum questionário ainda", it: "Nessun quiz ancora",
        de: "Noch keine Tests", ru: "Тестов пока нет",
    },
    "quizzes.emptyHint": {
        en: "Create your first quiz to get started.",
        fr: "Créez votre premier quiz pour commencer.",
        ar: "أنشئ اختبارك الأول للبدء.",
        es: "Crea tu primer cuestionario para empezar.",
        pt: "Crie seu primeiro questionário para começar.",
        it: "Crea il tuo primo quiz per iniziare.",
        de: "Erstelle deinen ersten Test, um loszulegen.",
        ru: "Создайте первый тест, чтобы начать.",
    },

    // ── Quiz detail ────────────────────────────────────────────────────────────
    "quiz.passQuiz": {
        en: "Pass the quiz", fr: "Passer le quiz", ar: "أداء الاختبار",
        es: "Realizar el cuestionario", pt: "Fazer o questionário", it: "Esegui il quiz",
        de: "Test absolvieren", ru: "Пройти тест",
    },
    "quiz.edit": {
        en: "Edit", fr: "Modifier", ar: "تعديل",
        es: "Editar", pt: "Editar", it: "Modifica",
        de: "Bearbeiten", ru: "Редактировать",
    },
    "quiz.difficulty": {
        en: "Difficulty", fr: "Difficulté", ar: "الصعوبة",
        es: "Dificultad", pt: "Dificuldade", it: "Difficoltà",
        de: "Schwierigkeit", ru: "Сложность",
    },
    "quiz.questionCount": {
        en: "Questions", fr: "Questions", ar: "الأسئلة",
        es: "Preguntas", pt: "Perguntas", it: "Domande",
        de: "Fragen", ru: "Вопросы",
    },
    "quiz.questionTypes": {
        en: "Question Types", fr: "Types de questions", ar: "أنواع الأسئلة",
        es: "Tipos de preguntas", pt: "Tipos de perguntas", it: "Tipi di domanda",
        de: "Fragetypen", ru: "Типы вопросов",
    },
    "quiz.languages": {
        en: "Languages", fr: "Langues", ar: "اللغات",
        es: "Idiomas", pt: "Idiomas", it: "Lingue",
        de: "Sprachen", ru: "Языки",
    },
    "quiz.additionalPrompt": {
        en: "Additional Prompt", fr: "Instructions supplémentaires", ar: "تعليمات إضافية",
        es: "Instrucciones adicionales", pt: "Instruções adicionais", it: "Istruzioni aggiuntive",
        de: "Zusätzliche Anweisungen", ru: "Дополнительные инструкции",
    },
    "quiz.status": {
        en: "Status", fr: "Statut", ar: "الحالة",
        es: "Estado", pt: "Status", it: "Stato",
        de: "Status", ru: "Статус",
    },
    "quiz.topic": {
        en: "Topic", fr: "Sujet", ar: "الموضوع",
        es: "Tema", pt: "Tema", it: "Argomento",
        de: "Thema", ru: "Тема",
    },

    // ── Difficulty labels ──────────────────────────────────────────────────────
    "difficulty.easy": {
        en: "Easy", fr: "Facile", ar: "سهل",
        es: "Fácil", pt: "Fácil", it: "Facile",
        de: "Einfach", ru: "Лёгкий",
    },
    "difficulty.medium": {
        en: "Medium", fr: "Moyen", ar: "متوسط",
        es: "Medio", pt: "Médio", it: "Medio",
        de: "Mittel", ru: "Средний",
    },
    "difficulty.hard": {
        en: "Hard", fr: "Difficile", ar: "صعب",
        es: "Difícil", pt: "Difícil", it: "Difficile",
        de: "Schwer", ru: "Сложный",
    },

    // ── Question type labels ───────────────────────────────────────────────────
    "questionType.true_false": {
        en: "True / False", fr: "Vrai / Faux", ar: "صح / خطأ",
        es: "Verdadero / Falso", pt: "Verdadeiro / Falso", it: "Vero / Falso",
        de: "Wahr / Falsch", ru: "Верно / Неверно",
    },
    "questionType.single_choice": {
        en: "Single Choice", fr: "Choix unique", ar: "اختيار واحد",
        es: "Selección única", pt: "Escolha única", it: "Scelta singola",
        de: "Einfachauswahl", ru: "Один ответ",
    },
    "questionType.multiple_choice": {
        en: "Multiple Choice", fr: "Choix multiple", ar: "اختيار متعدد",
        es: "Selección múltiple", pt: "Múltipla escolha", it: "Scelta multipla",
        de: "Mehrfachauswahl", ru: "Несколько ответов",
    },

    // ── Status labels ──────────────────────────────────────────────────────────
    "status.queued": {
        en: "Queued", fr: "En file d'attente", ar: "في قائمة الانتظار",
        es: "En cola", pt: "Na fila", it: "In coda",
        de: "Warteschlange", ru: "В очереди",
    },
    "status.architecting": {
        en: "Designing", fr: "Conception", ar: "جارٍ التصميم",
        es: "Diseñando", pt: "Projetando", it: "Progettazione",
        de: "Entwurf", ru: "Проектирование",
    },
    "status.building": {
        en: "Building", fr: "Génération", ar: "جارٍ البناء",
        es: "Construyendo", pt: "Construindo", it: "Costruzione",
        de: "Erstellung", ru: "Создание",
    },
    "status.draft": {
        en: "Draft", fr: "Brouillon", ar: "مسودة",
        es: "Borrador", pt: "Rascunho", it: "Bozza",
        de: "Entwurf", ru: "Черновик",
    },
    "status.published": {
        en: "Published", fr: "Publié", ar: "منشور",
        es: "Publicado", pt: "Publicado", it: "Pubblicato",
        de: "Veröffentlicht", ru: "Опубликован",
    },
    "status.archived": {
        en: "Archived", fr: "Archivé", ar: "مؤرشف",
        es: "Archivado", pt: "Arquivado", it: "Archiviato",
        de: "Archiviert", ru: "В архиве",
    },
    "status.failed": {
        en: "Failed", fr: "Échoué", ar: "فشل",
        es: "Fallido", pt: "Falhou", it: "Fallito",
        de: "Fehlgeschlagen", ru: "Ошибка",
    },

    // ── Quiz taking ────────────────────────────────────────────────────────────
    "take.selectLanguage": {
        en: "Select your language", fr: "Choisissez votre langue", ar: "اختر لغتك",
        es: "Selecciona tu idioma", pt: "Selecione seu idioma", it: "Seleziona la tua lingua",
        de: "Wähle deine Sprache", ru: "Выберите язык",
    },
    "take.start": {
        en: "Start Quiz", fr: "Commencer le quiz", ar: "ابدأ الاختبار",
        es: "Iniciar cuestionario", pt: "Iniciar questionário", it: "Inizia il quiz",
        de: "Test starten", ru: "Начать тест",
    },
    "take.next": {
        en: "Next", fr: "Suivant", ar: "التالي",
        es: "Siguiente", pt: "Próximo", it: "Avanti",
        de: "Weiter", ru: "Далее",
    },
    "take.submit": {
        en: "Submit", fr: "Soumettre", ar: "إرسال",
        es: "Enviar", pt: "Enviar", it: "Invia",
        de: "Absenden", ru: "Отправить",
    },
    "take.results": {
        en: "Results", fr: "Résultats", ar: "النتائج",
        es: "Resultados", pt: "Resultados", it: "Risultati",
        de: "Ergebnisse", ru: "Результаты",
    },
    "take.score": {
        en: "{score} out of {total} correct",
        fr: "{score} sur {total} correct",
        ar: "{score} من أصل {total} صحيح",
        es: "{score} de {total} correctas",
        pt: "{score} de {total} corretas",
        it: "{score} su {total} corrette",
        de: "{score} von {total} richtig",
        ru: "{score} из {total} правильно",
    },
    "take.perfectScore": {
        en: "Perfect score!", fr: "Score parfait !", ar: "نتيجة مثالية!",
        es: "¡Puntuación perfecta!", pt: "Pontuação perfeita!", it: "Punteggio perfetto!",
        de: "Perfekte Punktzahl!", ru: "Отличный результат!",
    },
    "take.wellDone": {
        en: "Well done!", fr: "Bien joué !", ar: "أحسنت!",
        es: "¡Bien hecho!", pt: "Muito bem!", it: "Ben fatto!",
        de: "Gut gemacht!", ru: "Отлично!",
    },
    "take.keepPracticing": {
        en: "Keep practicing.", fr: "Continuez à pratiquer.", ar: "استمر في التدرب.",
        es: "Sigue practicando.", pt: "Continue praticando.", it: "Continua ad allenarti.",
        de: "Weiter üben.", ru: "Продолжайте практиковаться.",
    },
    "take.tryAgain": {
        en: "Try Again", fr: "Réessayer", ar: "حاول مجددًا",
        es: "Intentar de nuevo", pt: "Tentar novamente", it: "Riprova",
        de: "Erneut versuchen", ru: "Попробовать снова",
    },
    "take.loading": {
        en: "Loading...", fr: "Chargement...", ar: "جارٍ التحميل...",
        es: "Cargando...", pt: "Carregando...", it: "Caricamento...",
        de: "Laden...", ru: "Загрузка...",
    },
    "take.loadingQuiz": {
        en: "Loading quiz...", fr: "Chargement du quiz...", ar: "جارٍ تحميل الاختبار...",
        es: "Cargando cuestionario...", pt: "Carregando questionário...", it: "Caricamento quiz...",
        de: "Test wird geladen...", ru: "Загрузка теста...",
    },
    "take.failedLoad": {
        en: "Failed to load quiz.", fr: "Échec du chargement.", ar: "فشل تحميل الاختبار.",
        es: "Error al cargar el cuestionario.", pt: "Falha ao carregar.", it: "Caricamento fallito.",
        de: "Laden fehlgeschlagen.", ru: "Не удалось загрузить тест.",
    },
    "take.question": {
        en: "Question", fr: "Question", ar: "سؤال",
        es: "Pregunta", pt: "Pergunta", it: "Domanda",
        de: "Frage", ru: "Вопрос",
    },

    // ── New quiz dialog ────────────────────────────────────────────────────────
    "newQuiz.dialogTitle": {
        en: "Create New Quiz", fr: "Créer un nouveau quiz", ar: "إنشاء اختبار جديد",
        es: "Crear nuevo cuestionario", pt: "Criar novo questionário", it: "Crea nuovo quiz",
        de: "Neuen Test erstellen", ru: "Создать новый тест",
    },
    "newQuiz.quizTitle": {
        en: "Quiz Title", fr: "Titre du quiz", ar: "عنوان الاختبار",
        es: "Título del cuestionario", pt: "Título do questionário", it: "Titolo del quiz",
        de: "Test-Titel", ru: "Название теста",
    },
    "newQuiz.topic": {
        en: "Topic (optional)", fr: "Sujet (optionnel)", ar: "الموضوع (اختياري)",
        es: "Tema (opcional)", pt: "Tema (opcional)", it: "Argomento (opzionale)",
        de: "Thema (optional)", ru: "Тема (необязательно)",
    },
    "newQuiz.questionCount": {
        en: "Number of Questions", fr: "Nombre de questions", ar: "عدد الأسئلة",
        es: "Número de preguntas", pt: "Número de perguntas", it: "Numero di domande",
        de: "Anzahl der Fragen", ru: "Количество вопросов",
    },
    "newQuiz.difficulty": {
        en: "Difficulty", fr: "Difficulté", ar: "مستوى الصعوبة",
        es: "Dificultad", pt: "Dificuldade", it: "Difficoltà",
        de: "Schwierigkeit", ru: "Сложность",
    },
    "newQuiz.questionTypes": {
        en: "Question Types", fr: "Types de questions", ar: "أنواع الأسئلة",
        es: "Tipos de preguntas", pt: "Tipos de perguntas", it: "Tipi di domanda",
        de: "Fragetypen", ru: "Типы вопросов",
    },
    "newQuiz.languages": {
        en: "Languages", fr: "Langues", ar: "اللغات",
        es: "Idiomas", pt: "Idiomas", it: "Lingue",
        de: "Sprachen", ru: "Языки",
    },
    "newQuiz.additionalPrompt": {
        en: "Additional Instructions", fr: "Instructions supplémentaires", ar: "تعليمات إضافية",
        es: "Instrucciones adicionales", pt: "Instruções adicionais", it: "Istruzioni aggiuntive",
        de: "Zusätzliche Anweisungen", ru: "Дополнительные инструкции",
    },
    "newQuiz.uploadDocument": {
        en: "Upload Document", fr: "Télécharger un document", ar: "رفع مستند",
        es: "Subir documento", pt: "Carregar documento", it: "Carica documento",
        de: "Dokument hochladen", ru: "Загрузить документ",
    },
    "newQuiz.uploading": {
        en: "Uploading...", fr: "Téléchargement...", ar: "جارٍ الرفع...",
        es: "Subiendo...", pt: "Carregando...", it: "Caricamento...",
        de: "Hochladen...", ru: "Загрузка...",
    },
    "newQuiz.create": {
        en: "Create Quiz", fr: "Créer le quiz", ar: "إنشاء الاختبار",
        es: "Crear cuestionario", pt: "Criar questionário", it: "Crea quiz",
        de: "Test erstellen", ru: "Создать тест",
    },
    "newQuiz.cancel": {
        en: "Cancel", fr: "Annuler", ar: "إلغاء",
        es: "Cancelar", pt: "Cancelar", it: "Annulla",
        de: "Abbrechen", ru: "Отмена",
    },

    // ── Generation steps ───────────────────────────────────────────────────────
    "step.0.pre": {
        en: "Analyze Quiz Details", fr: "Analyser les détails", ar: "تحليل تفاصيل الاختبار",
        es: "Analizar detalles", pt: "Analisar detalhes", it: "Analizza i dettagli",
        de: "Details analysieren", ru: "Анализ данных",
    },
    "step.0.loading": {
        en: "Saving Quiz Details", fr: "Enregistrement...", ar: "جارٍ الحفظ...",
        es: "Guardando detalles...", pt: "Salvando detalhes...", it: "Salvataggio...",
        de: "Details speichern...", ru: "Сохранение...",
    },
    "step.0.done": {
        en: "Quiz Details Saved", fr: "Détails enregistrés", ar: "تم حفظ التفاصيل",
        es: "Detalles guardados", pt: "Detalhes salvos", it: "Dettagli salvati",
        de: "Details gespeichert", ru: "Данные сохранены",
    },
    "step.1.pre": {
        en: "Design Quiz Structure", fr: "Concevoir la structure", ar: "تصميم هيكل الاختبار",
        es: "Diseñar estructura", pt: "Projetar estrutura", it: "Progetta struttura",
        de: "Struktur entwerfen", ru: "Проектирование структуры",
    },
    "step.1.loading": {
        en: "Designing Quiz Structure", fr: "Conception en cours...", ar: "جارٍ تصميم الهيكل...",
        es: "Diseñando estructura...", pt: "Projetando estrutura...", it: "Progettazione...",
        de: "Struktur wird entworfen...", ru: "Проектирование...",
    },
    "step.1.done": {
        en: "Quiz Structure Designed", fr: "Structure conçue", ar: "تم تصميم الهيكل",
        es: "Estructura diseñada", pt: "Estrutura projetada", it: "Struttura progettata",
        de: "Struktur entworfen", ru: "Структура готова",
    },
    "step.2.pre": {
        en: "Generate Questions", fr: "Générer des questions", ar: "توليد الأسئلة",
        es: "Generar preguntas", pt: "Gerar perguntas", it: "Genera domande",
        de: "Fragen generieren", ru: "Генерация вопросов",
    },
    "step.2.loading": {
        en: "Generating Quiz Questions", fr: "Génération en cours...", ar: "جارٍ توليد الأسئلة...",
        es: "Generando preguntas...", pt: "Gerando perguntas...", it: "Generazione...",
        de: "Fragen werden generiert...", ru: "Генерация вопросов...",
    },
    "step.2.done": {
        en: "Quiz Questions Generated", fr: "Questions générées", ar: "تم توليد الأسئلة",
        es: "Preguntas generadas", pt: "Perguntas geradas", it: "Domande generate",
        de: "Fragen generiert", ru: "Вопросы сгенерированы",
    },

    // ── Common ─────────────────────────────────────────────────────────────────
    "common.loading": {
        en: "Loading...", fr: "Chargement...", ar: "جارٍ التحميل...",
        es: "Cargando...", pt: "Carregando...", it: "Caricamento...",
        de: "Laden...", ru: "Загрузка...",
    },
    "common.error": {
        en: "Something went wrong.", fr: "Une erreur est survenue.", ar: "حدث خطأ ما.",
        es: "Algo salió mal.", pt: "Algo deu errado.", it: "Qualcosa è andato storto.",
        de: "Etwas ist schiefgelaufen.", ru: "Что-то пошло не так.",
    },
} as const;

export type TranslationKey = keyof typeof dict;

// ─── Translate function ───────────────────────────────────────────────────────

export function t(key: TranslationKey, lang: LanguageCode, vars?: Record<string, string | number>): string {
    const entry = dict[key] as Record<string, string> | undefined;
    // Fallback chain: requested lang → "en" → key itself
    let text = entry?.[lang] ?? entry?.["en"] ?? key;

    if (vars) {
        for (const [k, v] of Object.entries(vars)) {
            text = text.replaceAll(`{${k}}`, String(v));
        }
    }

    return text;
}

// ─── Convenience: build a bound t() for a fixed language ─────────────────────

export function createT(lang: LanguageCode) {
    return (key: TranslationKey, vars?: Record<string, string | number>) => t(key, lang, vars);
}

// ─── Dir helper (re-exported for convenience) ─────────────────────────────────

export { getDirection };
export type Locale = 'en' | 'ar';

export interface TranslationDictionary {
  // Brand & Header
  brandName: string;
  engineBadge: string;
  newAnalysis: string;
  telegramBot: string;
  language: string;
  toggleLang: string;

  // Importer
  heroTitle: string;
  heroSubtitle: string;
  tabSearch: string;
  tabPgn: string;
  tabLibrary: string;
  pasteBtn: string;
  loadBtn: string;
  analyzeBtn: string;
  searchPlaceholder: string;
  popularProfiles: string;
  recentGamesTitle: string;
  noGamesFound: string;
  analyzingPgn: string;
  pgnPlaceholder: string;
  invalidPgn: string;
  win: string;
  loss: string;
  draw: string;

  // Presets
  libraryOperaTitle: string;
  libraryOperaDesc: string;
  libraryKasparovTitle: string;
  libraryKasparovDesc: string;
  libraryTacticalTitle: string;
  libraryTacticalDesc: string;

  // Analyzing Mode
  analyzingTitle: string;
  evaluatingMove: string;
  multiPvInfo: string;
  cancel: string;

  // Reviewed Header
  vs: string;
  result: string;

  // Board Controls
  flipBoard: string;
  firstMove: string;
  prevMove: string;
  nextMove: string;
  lastMove: string;
  autoPlay: string;
  pause: string;
  white: string;
  black: string;

  // Coach Explainer
  tacticalInsight: string;
  bestMoveLabel: string;
  evalLoss: string;
  showTactics: string;
  hideTactics: string;

  // Tabs & Review Summary
  tabSummary: string;
  tabMoves: string;
  tabTelegram: string;
  accuracyTitle: string;
  perfRating: string;
  classificationBreakdown: string;
  openTelegramModal: string;
  restartReview: string;

  // Classifications
  classBrilliant: string;
  classGreat: string;
  classBest: string;
  classExcellent: string;
  classGood: string;
  classBook: string;
  classInaccuracy: string;
  classMistake: string;
  classBlunder: string;
  classMissedWin: string;

  // Classification Descriptions
  descBrilliant: string;
  descGreat: string;
  descBest: string;
  descExcellent: string;
  descGood: string;
  descBook: string;
  descInaccuracy: string;
  descMistake: string;
  descBlunder: string;
  descMissedWin: string;

  // Move List
  moveNumberCol: string;
  whiteCol: string;
  blackCol: string;

  // Telegram Bridge Modal
  modalTitle: string;
  modalDesc: string;
  puzzlesExtracted: string;
  launchBot: string;
  downloadJson: string;
  close: string;
}

export const translations: Record<Locale, TranslationDictionary> = {
  en: {
    brandName: 'RewindBoard',
    engineBadge: 'Stockfish 19',
    newAnalysis: 'New Analysis',
    telegramBot: 'Telegram Bot',
    language: 'Language',
    toggleLang: 'العربية',

    heroTitle: 'Chess Game Review',
    heroSubtitle:
      'Analyze games with client-side Stockfish 19 WebAssembly. Accurate accuracy scores, tactical breakdown, and blunder detection.',
    tabSearch: 'Search or URL',
    tabPgn: 'Paste PGN',
    tabLibrary: 'Library Games',
    pasteBtn: 'Paste',
    loadBtn: 'Load',
    analyzeBtn: 'Analyze Game',
    searchPlaceholder: 'Chess.com username, game link, or Lichess URL...',
    popularProfiles: 'Popular profiles:',
    recentGamesTitle: 'Recent Games for',
    noGamesFound: 'No games found for this player.',
    analyzingPgn: 'Analyzing PGN...',
    pgnPlaceholder: 'Paste your PGN text here...',
    invalidPgn: 'Please enter a valid PGN.',
    win: 'Win',
    loss: 'Loss',
    draw: 'Draw',

    libraryOperaTitle: 'Morphy vs. Duke of Brunswick (Opera Game)',
    libraryOperaDesc: 'Paris, 1858 — Rapid piece coordination and queen sacrifice',
    libraryKasparovTitle: "Kasparov vs. Topalov (Kasparov's Immortal)",
    libraryKasparovDesc: 'Wijk aan Zee, 1999 — Dynamic rook sacrifice and King march',
    libraryTacticalTitle: 'Tactical Comeback Game',
    libraryTacticalDesc: 'Open Italian position with multiple tactical swings and mistake recoveries',

    analyzingTitle: 'Evaluating Game Positions',
    evaluatingMove: 'Move {current} of {total} • Stockfish 19',
    multiPvInfo: 'MultiPV 2 • Depth 14',
    cancel: 'Cancel',

    vs: 'vs',
    result: 'Result:',

    flipBoard: 'Flip Board',
    firstMove: 'First Move',
    prevMove: 'Previous Move',
    nextMove: 'Next Move',
    lastMove: 'Last Move',
    autoPlay: 'Auto Play',
    pause: 'Pause',
    white: 'White',
    black: 'Black',

    tacticalInsight: 'Tactical Insight',
    bestMoveLabel: 'Best move was:',
    evalLoss: 'Win chance change:',
    showTactics: 'Show details',
    hideTactics: 'Hide details',

    tabSummary: 'Summary',
    tabMoves: 'Moves',
    tabTelegram: 'Telegram',
    accuracyTitle: 'CAPS Accuracy',
    perfRating: 'Estimated Performance',
    classificationBreakdown: 'Move Classifications',
    openTelegramModal: 'Export Puzzles',
    restartReview: 'Start from Move 1',

    classBrilliant: 'Brilliant',
    classGreat: 'Great',
    classBest: 'Best',
    classExcellent: 'Excellent',
    classGood: 'Good',
    classBook: 'Book',
    classInaccuracy: 'Inaccuracy',
    classMistake: 'Mistake',
    classBlunder: 'Blunder',
    classMissedWin: 'Missed Win',

    descBrilliant: 'A brilliant move sacrificing material for decisive tactical compensation.',
    descGreat: 'The only move that maintains the advantage or escapes trouble.',
    descBest: 'The engine top recommendation.',
    descExcellent: 'An excellent move that preserves the advantage.',
    descGood: 'A solid, natural move.',
    descBook: 'Standard opening theory.',
    descInaccuracy: 'An inaccuracy that surrenders some of your advantage.',
    descMistake: 'A mistake that worsens your position.',
    descBlunder: 'A critical blunder that drastically shifts evaluation.',
    descMissedWin: 'Missed a decisive tactical win or advantage.',

    moveNumberCol: 'Move',
    whiteCol: 'White',
    blackCol: 'Black',

    modalTitle: 'Companion Telegram Bot',
    modalDesc:
      'Practice blunders and tactics directly through your personal chess trainer bot.',
    puzzlesExtracted: 'Puzzles Extracted:',
    launchBot: 'Open in Telegram',
    downloadJson: 'Download JSON',
    close: 'Close',
  },
  ar: {
    brandName: 'RewindBoard',
    engineBadge: 'ستوكفيش 19',
    newAnalysis: 'تحليل جديد',
    telegramBot: 'بوت تيليجرام',
    language: 'اللغة',
    toggleLang: 'English',

    heroTitle: 'مراجعة مباريات الشطرنج',
    heroSubtitle:
      'حلّل مبارياتك بمحرك ستوكفيش 19 المدمج عبر المتصفح. تقييم دقة النقلات، تفكيك التكتيكات، واكتشاف الأخطاء الفادحة.',
    tabSearch: 'بحث أو رابط',
    tabPgn: 'لصق PGN',
    tabLibrary: 'مباريات مميزة',
    pasteBtn: 'لصق',
    loadBtn: 'تحميل',
    analyzeBtn: 'بدء التحليل',
    searchPlaceholder: 'اسم مستخدم Chess.com، أو رابط المباراة، أو Lichess...',
    popularProfiles: 'حسابات مشهورة:',
    recentGamesTitle: 'أحدث مباريات',
    noGamesFound: 'لم يتم العثور على مباريات لهذا اللاعب.',
    analyzingPgn: 'جاري قراءة PGN...',
    pgnPlaceholder: 'الصق نص الـ PGN هنا...',
    invalidPgn: 'يرجى إدخال نص PGN صالح.',
    win: 'فوز',
    loss: 'خسارة',
    draw: 'تعادل',

    libraryOperaTitle: 'مورفي ضد دوق برونزويك (مباراة الأوبرا)',
    libraryOperaDesc: 'باريس، 1858 — سرعة انتشار القطع وتضحية بالوزير لإنهاء حاسم',
    libraryKasparovTitle: 'كاسباروف ضد توبالوف (خالدة كاسباروف)',
    libraryKasparovDesc: 'فايك آن زي، 1999 — تضحية رخ ديناميكية ومطاردة ملك أسطورية',
    libraryTacticalTitle: 'مباراة ريمونتادا تكتيكية',
    libraryTacticalDesc: 'افتتاح إيطالي مفتوح مع تقلبات تكتيكية وتدريب على استغلال الأخطاء',

    analyzingTitle: 'جاري تقييم مواقف المباراة',
    evaluatingMove: 'النقلة {current} من {total} • ستوكفيش 19',
    multiPvInfo: 'تفريعات 2 • عمق 14',
    cancel: 'إلغاء',

    vs: 'ضد',
    result: 'النتيجة:',

    flipBoard: 'قلب الرقعة',
    firstMove: 'البداية',
    prevMove: 'النقلة السابقة',
    nextMove: 'النقلة التالية',
    lastMove: 'النهاية',
    autoPlay: 'تشغيل تلقائي',
    pause: 'إيقاف مؤقت',
    white: 'الأبيض',
    black: 'الأسود',

    tacticalInsight: 'تحليل المدرب التكتيكي',
    bestMoveLabel: 'النقلة الأفضل كانت:',
    evalLoss: 'تغير فرصة الفوز:',
    showTactics: 'عرض التفاصيل',
    hideTactics: 'إخفاء التفاصيل',

    tabSummary: 'ملخص الدقة',
    tabMoves: 'سجل النقلات',
    tabTelegram: 'تيليجرام',
    accuracyTitle: 'دقة اللعب (CAPS)',
    perfRating: 'الأداء التقديري (Elo)',
    classificationBreakdown: 'تصنيف النقلات',
    openTelegramModal: 'تصدير الألغاز',
    restartReview: 'البدء من النقلة 1',

    classBrilliant: 'بارع',
    classGreat: 'رائع',
    classBest: 'الأفضل',
    classExcellent: 'ممتاز',
    classGood: 'جيد',
    classBook: 'نظري',
    classInaccuracy: 'غير دقيقة',
    classMistake: 'خطأ',
    classBlunder: 'فادح',
    classMissedWin: 'فوز ضائع',

    descBrilliant: 'نقلة بارعة وتضحية بالقطع لمكاسب تكتيكية حاسمة.',
    descGreat: 'النقلة الوحيدة التي تحافظ على التفوق أو تنجو من المأزق.',
    descBest: 'النقلة الأفضل حسب توصية المحرك.',
    descExcellent: 'نقلة ممتازة تحافظ على الأفضلية.',
    descGood: 'نقلة طبيعية وقوية تحافظ على التوازن.',
    descBook: 'نقلة نظرية متوافقة مع كتب الافتتاحيات.',
    descInaccuracy: 'نقلة غير دقيقة أهدرت جزءاً من الأفضلية.',
    descMistake: 'خطأ يمنح الخصم فرصاً للمبادرة.',
    descBlunder: 'خطأ فادح يقلب موازين الموقف لصالح الخصم.',
    descMissedWin: 'إهدار فرصة حاسمة للفوز بالمباراة.',

    moveNumberCol: 'النقلة',
    whiteCol: 'الأبيض',
    blackCol: 'الأسود',

    modalTitle: 'بوت تدريب تيليجرام',
    modalDesc:
      'تدرّب على أخطائك ونقلاتك التكتيكية المستخرجة مباشرة عبر بوت الشطرنج في تيليجرام.',
    puzzlesExtracted: 'الألغاز المستخرجة:',
    launchBot: 'فتح في تيليجرام',
    downloadJson: 'تنزيل ملف JSON',
    close: 'إغلاق',
  },
};

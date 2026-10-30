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
  customVariation: string;
  undoVariationMove: string;
  variationHint: string;

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

  // Variations & Live Analysis
  exploringVariation: string;
  backToGame: string;
  exitVariation: string;
  playBestMove: string;
  resetVariation: string;
  variationFromMove: string;
  candidateLines: string;
  evalLabel: string;
  engineBestLabel: string;
  playedMoveLabel: string;
  engineCalculating: string;

  // Player Profile & Bookmarks
  playerProfile: string;
  rapid: string;
  blitz: string;
  bullet: string;
  daily: string;
  copyProfileLink: string;
  linkCopied: string;
  backToPlayerGames: string;
  allGames: string;
  reviewGame: string;
  searchAnotherPlayer: string;
  playerNotFound: string;
  playerNotFoundDesc: string;
  openPlayerPage: string;
  bookmarkHint: string;
}

export const translations: Record<Locale, TranslationDictionary> = {
  en: {
    brandName: 'RewindBoard',
    engineBadge: 'Stockfish 19 WASM',
    newAnalysis: 'New Game',
    telegramBot: 'Telegram Bot',
    language: 'العربية',
    toggleLang: 'العربية',

    heroTitle: 'Review Any Chess Game',
    heroSubtitle:
      'Unlimited, 100% free Game Review powered by client-side Stockfish 19. Enter any Chess.com username or paste PGN notation.',
    tabSearch: 'Chess.com User',
    tabPgn: 'Paste PGN',
    tabLibrary: 'Library Games',
    pasteBtn: 'Paste',
    loadBtn: 'Fetch Games',
    analyzeBtn: 'Analyze Game',
    searchPlaceholder: 'Enter Chess.com username (e.g. hikaru, magnuscarlsen)',
    popularProfiles: 'Popular profiles:',
    recentGamesTitle: 'Recent Games for {username}',
    noGamesFound: 'No completed games found for this player in current or prior archives.',
    analyzingPgn: 'Loading and parsing PGN...',
    pgnPlaceholder: 'Paste your raw PGN text here (1. e4 e5 2. Nf3 ...)',
    invalidPgn: 'Could not parse the provided PGN. Please verify the move text format.',
    win: 'Win',
    loss: 'Loss',
    draw: 'Draw',

    libraryOperaTitle: 'Morphy vs. Duke Karl (Opera Game)',
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
    customVariation: 'Custom Variation',
    undoVariationMove: 'Undo Move',
    variationHint: 'Click or drag any piece to explore alternative lines',

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

    exploringVariation: 'Exploring Variation',
    backToGame: 'Back to Game',
    exitVariation: 'Back to Game',
    playBestMove: 'Play Best Move',
    resetVariation: 'Reset Variation',
    variationFromMove: 'Variation from Move {move}',
    candidateLines: 'Candidate Moves',
    evalLabel: 'Eval:',
    engineBestLabel: 'Engine Best:',
    playedMoveLabel: 'Played:',
    engineCalculating: 'Calculating...',

    playerProfile: 'Player Profile',
    rapid: 'Rapid',
    blitz: 'Blitz',
    bullet: 'Bullet',
    daily: 'Daily',
    copyProfileLink: 'Copy Profile Link',
    linkCopied: 'Link copied!',
    backToPlayerGames: 'Back to {username}\'s Games',
    allGames: 'All',
    reviewGame: 'Review Game',
    searchAnotherPlayer: 'Search player or URL...',
    playerNotFound: 'Player Not Found',
    playerNotFoundDesc: 'We could not find a Chess.com account for "{username}". Please check the username.',
    openPlayerPage: 'Open Player Page',
    bookmarkHint: 'Bookmark this link to quickly access your game history anytime!',
  },

  ar: {
    brandName: 'RewindBoard',
    engineBadge: 'ستوكفيش 19 تقنية WASM',
    newAnalysis: 'مباراة جديدة',
    telegramBot: 'بوت تيليجرام',
    language: 'English',
    toggleLang: 'English',

    heroTitle: 'راجع أي مباراة شطرنج باحترافية',
    heroSubtitle:
      'مراجعة شاملة ومجانية 100% مدعومة بمحرك ستوكفيش 19 يعمل محلياً في متصفحك. أدخل اسم أي لاعب على Chess.com أو الصق سجل PGN.',
    tabSearch: 'لاعب Chess.com',
    tabPgn: 'سجل PGN',
    tabLibrary: 'مكتبة المباريات',
    pasteBtn: 'لصق',
    loadBtn: 'جلب المباريات',
    analyzeBtn: 'تحليل المباراة',
    searchPlaceholder: 'أدخل اسم المستخدم على Chess.com (مثال: hikaru, magnuscarlsen)',
    popularProfiles: 'حسابات مشهورة:',
    recentGamesTitle: 'آخر مباريات اللاعب {username}',
    noGamesFound: 'لم يتم العثور على مباريات مكتملة لهذا اللاعب في الأرشيف الحالي أو السابق.',
    analyzingPgn: 'جاري قراءة وتجهيز سجل النقلات...',
    pgnPlaceholder: 'الصق سجل PGN هنا (1. e4 e5 2. Nf3 ...)',
    invalidPgn: 'تعذر قراءة سجل PGN المدخل. يرجى التحقق من صحة تنسيق النقلات.',
    win: 'فوز',
    loss: 'خسارة',
    draw: 'تعادل',

    libraryOperaTitle: 'مورفي ضد دوق كارل (مباراة دار الأوبرا)',
    libraryOperaDesc: 'باريس، 1858 — تناغم وتنسيق مذهل للقطع وتضحية تاريخية بالوزير',
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
    customVariation: 'تفريعة خاصة',
    undoVariationMove: 'تراجع',
    variationHint: 'انقر أو اسحب أي قطعة لاستكشاف تفريعات بديلة',

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

    exploringVariation: 'استكشاف تفريع',
    backToGame: 'العودة للمباراة',
    exitVariation: 'العودة للمباراة',
    playBestMove: 'لعب أفضل نقلة',
    resetVariation: 'إعادة تعيين التفريع',
    variationFromMove: 'تفريع من النقلة {move}',
    candidateLines: 'نقلات مرشحة',
    evalLabel: 'التقييم:',
    engineBestLabel: 'أفضل نقلة للمحرك:',
    playedMoveLabel: 'لُعبت:',
    engineCalculating: 'جاري الحساب...',

    playerProfile: 'الملف الشخصي للاعب',
    rapid: 'سريع (Rapid)',
    blitz: 'خاطف (Blitz)',
    bullet: 'رصاصة (Bullet)',
    daily: 'يومي (Daily)',
    copyProfileLink: 'نسخ رابط الصفحة',
    linkCopied: 'تم نسخ الرابط!',
    backToPlayerGames: 'العودة لمباريات {username}',
    allGames: 'الكل',
    reviewGame: 'مراجعة المباراة',
    searchAnotherPlayer: 'ابحث عن لاعب أو رابط...',
    playerNotFound: 'لم يتم العثور على اللاعب',
    playerNotFoundDesc: 'تعذر العثور على حساب Chess.com للاعب "{username}". يرجى التأكد من اسم المستخدم.',
    openPlayerPage: 'فتح صفحة اللاعب',
    bookmarkHint: 'احفظ هذا الرابط في المفضلة للوصول إلى مبارياتك مباشرة في أي وقت!',
  },
};

import { Chess, Square } from 'chess.js';
import { MoveAnalysis } from '@/types/chess';
import { Locale } from '@/lib/i18n/translations';

const PIECE_NAMES_EN: Record<string, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

const PIECE_NAMES_AR: Record<string, string> = {
  p: 'البيدق',
  n: 'الحصان',
  b: 'الفيل',
  r: 'الرخ',
  q: 'الوزير',
  k: 'الملك',
};

/**
 * Deterministic tactical heuristic explanation generator for chess moves
 */
export function generateHeuristicExplanation(
  move: MoveAnalysis,
  locale: Locale = 'en'
): string {
  const {
    classification,
    san,
    bestMoveSan,
    turn,
    from,
    to,
    fenBefore,
    fenAfter,
    winPctLoss,
    openingName,
  } = move;

  const isAr = locale === 'ar';
  const playerColor = isAr
    ? turn === 'w' ? 'الأبيض' : 'الأسود'
    : turn === 'w' ? 'White' : 'Black';
  const opponentColor = isAr
    ? turn === 'w' ? 'الأسود' : 'الأبيض'
    : turn === 'w' ? 'Black' : 'White';
  const opponentTurn = turn === 'w' ? 'b' : 'w';

  // 1. Book moves
  if (classification === 'book') {
    if (isAr) {
      return openingName
        ? `نقلة نظرية في افتتاح ${openingName}. تطوير سريع للقطع وتأمين انتشار متناسق.`
        : 'نقلة افتتاحية كلاسيكية متوافقة مع قواعد النظرية وتطوير القطع والتحضير للتبييت.';
    }
    return openingName
      ? `Theory move in the ${openingName}. Developing quickly according to standard master opening play.`
      : 'Solid book move, developing pieces and preparing castling according to opening theory.';
  }

  // 2. Brilliant move
  if (classification === 'brilliant') {
    if (isAr) {
      return `نقلة بارعة واستثنائية! تضحية بالقطع عبر نقلة ${san} تفتح خطوط هجوم حاسمة أو تسترجع أفضلية مادية بالقوة الإجبارية.`;
    }
    return `Brilliant move! You voluntarily sacrificed material with ${san}, which creates an unstoppable attack or wins back decisive material by force.`;
  }

  // 3. Great move
  if (classification === 'great') {
    if (isAr) {
      return `اكتشاف رائع! نقلة ${san} كانت الخيار الوحيد الدقيق للحفاظ على الأفضلية وإبطال خطة الخصم. النقلات البديلة كانت ستفقدك زمام المبادرة.`;
    }
    return `Great find! ${san} was the only critical move that retains the advantage and refutes your opponent's setup. Alternative moves would have relinquished the edge.`;
  }

  // 4. Best move
  if (classification === 'best') {
    if (isAr) {
      return `خيار ممتاز. نقلة ${san} هي التوصية الأولى للمحرك، حيث تحافظ على تنسيق القطع والسيطرة على المربعات المفتاحية وتضغط على ${opponentColor}.`;
    }
    return `Excellent decision. ${san} is the top computer recommendation, maintaining ideal piece coordination, controlling key squares, and putting maximum pressure on ${opponentColor}.`;
  }

  // 5. Excellent & Good
  if (classification === 'excellent' || classification === 'good') {
    if (isAr) {
      return `نقلة ${san} قوية وطبيعية تحافظ على متانة الموقف. فضّل المحرك قليلاً نقلة ${bestMoveSan}، لكن خيارك ممتاز وموثوق.`;
    }
    return `${san} is a solid and natural move that keeps your position strong. The engine slightly preferred ${bestMoveSan}, but your choice remains completely sound.`;
  }

  // Tactical inspection for mistakes & blunders
  try {
    const chessBefore = new Chess(fenBefore);
    const pieceMoved = chessBefore.get(from as Square);
    const pieceName = isAr
      ? pieceMoved ? PIECE_NAMES_AR[pieceMoved.type] : 'القطعة'
      : pieceMoved ? PIECE_NAMES_EN[pieceMoved.type] : 'piece';

    const chessAfter = new Chess(fenAfter);
    const isAttacked = chessAfter.isAttacked(to as Square, opponentTurn);

    // 6. Missed Win
    if (classification === 'missed_win') {
      if (isAr) {
        return `فرصة فوز ضائعة! أُتيحت لك فرصة تكتيكية لحسم المباراة فوراً. لعب ${bestMoveSan} كان سينهي الموقف، بينما نقلة ${san} سمحت لـ ${opponentColor} بالعودة للمنافسة.`;
      }
      return `Missed Win! You had a decisive winning opportunity. Playing ${bestMoveSan} would have sealed the victory immediately, whereas ${san} gave ${opponentColor} a way back into the game.`;
    }

    // 7. Blunder (??)
    if (classification === 'blunder') {
      if (isAttacked && pieceMoved && pieceMoved.type !== 'p') {
        if (isAr) {
          return `خطأ فادح (??): نقلة ${san} تترك ${pieceName} في مربع ${to} عرضة للهجوم دون تعويض كافٍ. كانت نقلة ${bestMoveSan} ضرورية لحماية تماسك موقفك.`;
        }
        return `Blunder (??): ${san} hangs your ${pieceName} on ${to} to opponent's attack with no compensation. ${bestMoveSan} was essential to keep your position intact.`;
      }

      if (winPctLoss >= 35) {
        if (isAr) {
          return `خطأ فادح جداً! نقلة ${san} قلبت التقييم بشكل حاد لصالح ${opponentColor}. التكملة الدقيقة كانت ${bestMoveSan}.`;
        }
        return `Severe blunder! ${san} dramatically tilts the evaluation in favor of ${opponentColor}. You missed ${bestMoveSan}, which was the critical continuation.`;
      }

      if (isAr) {
        return `خطأ فادح! نقلة ${san} أهدرت تفوقاً كبيراً في الموقف. يوصي المحرك بلعب ${bestMoveSan} لضمان سلامة الملك وفاعلية القطع.`;
      }
      return `Blunder! Playing ${san} gives away a substantial advantage. The engine recommends ${bestMoveSan} to maintain optimal piece activity and king safety.`;
    }

    // 8. Mistake (?)
    if (classification === 'mistake') {
      if (isAttacked && pieceMoved) {
        if (isAr) {
          return `خطأ (?): تحريك ${pieceName} إلى ${to} يمنح ${opponentColor} فرصة للضغط وكسب وتيرة لعب. الأفضل كان ${bestMoveSan}.`;
        }
        return `Mistake (?): Moving the ${pieceName} to ${to} allows ${opponentColor} to target your position and win tactical tempo. Better was ${bestMoveSan}.`;
      }
      if (isAr) {
        return `خطأ: نقلة ${san} أفقدتك جزءاً من المبادرة. كانت نقلة ${bestMoveSan} أكثر فاعلية وتحافظ على الضغط.`;
      }
      return `Mistake: ${san} relinquishes significant initiative. ${bestMoveSan} was much more active and keeps the pressure on your opponent.`;
    }

    // 9. Inaccuracy (?!):
    if (classification === 'inaccuracy') {
      if (isAr) {
        return `نقلة غير دقيقة (?!): نقلة ${san} تفتقر للفاعلية المطلوبة. لعب ${bestMoveSan} كان أكثر ديناميكية للسيطرة على الوسط.`;
      }
      return `Inaccuracy (?!): ${san} is slightly imprecise. ${bestMoveSan} was more energetic and would have maintained better central control.`;
    }
  } catch (e) {
    console.error('Heuristic explanation generation error:', e);
  }

  if (isAr) {
    return `لعب ${playerColor} نقلة ${san}. النقلة الأفضل كانت ${bestMoveSan}.`;
  }
  return `${playerColor} played ${san}. The best move was ${bestMoveSan}.`;
}

/**
 * Explains a move with fallback to AI API route if configured
 */
export async function getMoveExplanation(
  move: MoveAnalysis,
  locale: Locale = 'en'
): Promise<string> {
  const heuristic = generateHeuristicExplanation(move, locale);

  if (typeof window !== 'undefined') {
    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          san: move.san,
          bestMoveSan: move.bestMoveSan,
          classification: move.classification,
          fenBefore: move.fenBefore,
          fenAfter: move.fenAfter,
          turn: move.turn,
          openingName: move.openingName,
          winPctLoss: move.winPctLoss,
          locale,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.explanation) {
          return data.explanation;
        }
      }
    } catch {
      // Fallback silently to heuristic
    }
  }

  return heuristic;
}

'use client';

import React from 'react';
import { MoveClassification } from '@/types/chess';
import { CLASSIFICATION_META } from '@/lib/engine/classifier';
import { useTranslation } from '@/lib/i18n/LanguageContext';

const LABEL_KEYS = {
  brilliant: 'classBrilliant', great: 'classGreat', best: 'classBest',
  excellent: 'classExcellent', good: 'classGood', book: 'classBook',
  inaccuracy: 'classInaccuracy', mistake: 'classMistake', blunder: 'classBlunder',
  missed_win: 'classMissedWin',
} as const;

const Exclamation = () => <><path d="M10.5 5.5h3l-.5 9h-2z" /><circle cx="12" cy="17.5" r="1.6" /></>;
const Question = () => <><path d="M8.4 8.7c0-4.5 7.2-4.5 7.2 0 0 2.6-3.6 2.6-3.6 5.2" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" /><circle cx="12" cy="17.5" r="1.6" /></>;

/** Locally drawn, scalable review glyphs using familiar chess annotation symbols. */
export function MoveClassificationIcon({ classification, size = 22, decorative = false, className = '' }: {
  classification: MoveClassification;
  size?: number;
  decorative?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const label = t(LABEL_KEYS[classification]);
  let glyph: React.ReactNode;
  switch (classification) {
    case 'brilliant':
      glyph = <><g transform="translate(-4 0)"><Exclamation /></g><g transform="translate(4 0)"><Exclamation /></g></>;
      break;
    case 'great': glyph = <Exclamation />; break;
    case 'best':
      glyph = <path d="m12 4.6 2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7z" />;
      break;
    case 'excellent':
      glyph = <><path d="M9 10.5 12 5c.6-1 2.5-.4 2.3 1.1L13.7 10h3.5c1.2 0 1.8.8 1.5 2l-1.1 5c-.2.9-.8 1.4-1.7 1.4H9z" /><rect x="5" y="10.5" width="2.7" height="8" rx=".7" /></>;
      break;
    case 'good':
      glyph = <path d="m6.5 12 3.6 3.7 7.4-7.4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />;
      break;
    case 'book':
      glyph = <><path d="M5 6.5c2.8-.8 5-.3 7 1.2 2-1.5 4.2-2 7-1.2v11c-2.8-.8-5-.3-7 1.2-2-1.5-4.2-2-7-1.2z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M12 8v10" fill="none" stroke="currentColor" strokeWidth="1.5" /></>;
      break;
    case 'inaccuracy':
      glyph = <><g transform="translate(-4 0)"><Question /></g><g transform="translate(4 0)"><Exclamation /></g></>;
      break;
    case 'mistake': glyph = <Question />; break;
    case 'blunder':
      glyph = <><g transform="translate(-4.2 0)"><Question /></g><g transform="translate(4.2 0)"><Question /></g></>;
      break;
    case 'missed_win':
      glyph = <><circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.3" /><path d="m7.4 16.6 9.2-9.2" stroke="currentColor" strokeWidth="2.3" /></>;
      break;
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size}
      className={`inline-block shrink-0 align-middle ${className}`}
      role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined} focusable="false"
      data-move-classification={classification}
    >
      {!decorative && <title>{label}</title>}
      <circle cx="12" cy="12" r="12" fill={CLASSIFICATION_META[classification].color} />
      <g fill="currentColor" style={{ color: '#fff' }}>{glyph}</g>
    </svg>
  );
}

'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { MoveAnalysis } from '@/types/chess';
import { CLASSIFICATION_META } from '@/lib/engine/classifier';

interface EvalGraphProps {
  moves: MoveAnalysis[];
  currentPly: number;
  onSelectPly: (ply: number) => void;
  className?: string;
}

interface ChartPoint {
  ply: number;
  moveLabel: string;
  evalPawns: number;
  san: string;
  turn: 'w' | 'b';
  classification?: string;
  badgeSymbol?: string;
  badgeColor?: string;
}

export const EvalGraph: React.FC<EvalGraphProps> = ({
  moves,
  currentPly,
  onSelectPly,
  className = '',
}) => {
  if (!moves || moves.length === 0) {
    return null;
  }

  // Build chart dataset from moves
  // Ply 0 is start position (0.00 eval)
  const data: ChartPoint[] = [
    {
      ply: 0,
      moveLabel: 'Start',
      evalPawns: 0,
      san: 'Start',
      turn: 'w',
    },
    ...moves.map((m) => {
      // Clamp pawn eval between -8 and +8 for readable chart scale
      let pawns = m.evalAfter / 100;
      if (m.isMateAfter && m.mateAfter) {
        pawns = m.mateAfter > 0 ? 8 : -8;
      }
      const clamped = Math.max(-8, Math.min(8, pawns));
      const meta = CLASSIFICATION_META[m.classification];

      return {
        ply: m.ply,
        moveLabel: `${m.moveNumber}${m.turn === 'w' ? '.' : '...'} ${m.san}`,
        evalPawns: Math.round(clamped * 100) / 100,
        san: m.san,
        turn: m.turn,
        classification: m.classification,
        badgeSymbol: meta?.symbol,
        badgeColor: meta?.color,
      };
    }),
  ];

  // Custom Dot renderer for Blunders, Brilliancies, Mistakes, etc.
  const renderCustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload || payload.ply === 0) return <circle key={`dot-empty-${cx}-${cy}`} cx={cx} cy={cy} r={0} />;

    const isSelected = payload.ply === currentPly;
    const isBlunder = payload.classification === 'blunder';
    const isMistake = payload.classification === 'mistake';
    const isBrilliant = payload.classification === 'brilliant';
    const isMissedWin = payload.classification === 'missed_win';

    if (isSelected) {
      return (
        <circle
          key={`dot-selected-${payload.ply}`}
          cx={cx}
          cy={cy}
          r={6}
          fill="#38bdf8"
          stroke="#ffffff"
          strokeWidth={2}
          className="animate-pulse"
        />
      );
    }

    if (isBrilliant) {
      return (
        <circle
          key={`dot-brilliant-${payload.ply}`}
          cx={cx}
          cy={cy}
          r={5}
          fill="#1baca6"
          stroke="#ffffff"
          strokeWidth={1.5}
        />
      );
    }

    if (isBlunder) {
      return (
        <circle
          key={`dot-blunder-${payload.ply}`}
          cx={cx}
          cy={cy}
          r={5}
          fill="#ca3431"
          stroke="#ffffff"
          strokeWidth={1.5}
        />
      );
    }

    if (isMistake || isMissedWin) {
      return (
        <circle
          key={`dot-mistake-${payload.ply}`}
          cx={cx}
          cy={cy}
          r={4}
          fill="#e69d35"
          stroke="#ffffff"
          strokeWidth={1}
        />
      );
    }

    return <circle key={`dot-${payload.ply}`} cx={cx} cy={cy} r={0} />;
  };

  return (
    <div className={`w-full bg-slate-900/90 rounded-lg p-3 border border-slate-800 ${className}`}>
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Evaluation Graph
        </span>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            Brilliant (!!)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
            Mistake (?)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
            Blunder (??)
          </span>
        </div>
      </div>

      <div className="w-full h-28 sm:h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            onClick={(state: any) => {
              if (state && state.activePayload && state.activePayload.length > 0) {
                const ply = state.activePayload[0].payload.ply;
                onSelectPly(ply);
              }
            }}
            margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
          >
            <defs>
              <linearGradient id="evalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
            <XAxis dataKey="ply" hide />
            <YAxis domain={[-6, 6]} hide />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const pt = payload[0].payload as ChartPoint;
                  const evalStr =
                    pt.evalPawns > 0 ? `+${pt.evalPawns.toFixed(1)}` : pt.evalPawns.toFixed(1);
                  return (
                    <div className="bg-slate-950 border border-slate-700/80 rounded-md p-2 shadow-xl text-xs space-y-1">
                      <div className="font-semibold text-slate-200">{pt.moveLabel}</div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-emerald-400 font-bold">{evalStr}</span>
                        {pt.classification && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                            style={{
                              backgroundColor: `${pt.badgeColor}25`,
                              color: pt.badgeColor,
                              border: `1px solid ${pt.badgeColor}60`,
                            }}
                          >
                            {pt.badgeSymbol} {pt.classification}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="evalPawns"
              stroke="#38bdf8"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#evalGradient)"
              dot={renderCustomDot}
              activeDot={{ r: 5, fill: '#38bdf8', stroke: '#ffffff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

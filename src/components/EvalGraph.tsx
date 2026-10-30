'use client';

import { MoveClassificationIcon } from '@/components/MoveClassificationIcon';

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
import { MoveAnalysis, MoveClassification } from '@/types/chess';
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
  classification?: MoveClassification;
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

  const data: ChartPoint[] = [
    {
      ply: 0,
      moveLabel: 'Start',
      evalPawns: 0,
      san: 'Start',
      turn: 'w',
    },
    ...moves.map((m) => {
      let pawns = m.evalAfter / 100;
      if (m.isMateAfter && m.mateAfter) {
        pawns = m.mateAfter > 0 ? 7 : -7;
      }
      const clamped = Math.max(-7, Math.min(7, pawns));
      const meta = CLASSIFICATION_META[m.classification];

      return {
        ply: m.ply,
        moveLabel: `${m.moveNumber}${m.turn === 'w' ? '.' : '...'} ${m.san}`,
        evalPawns: Math.round(clamped * 100) / 100,
        san: m.san,
        turn: m.turn,
        classification: m.classification,
        badgeColor: meta?.color,
      };
    }),
  ];

  const renderCustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload || payload.ply === 0) return <circle key={`dot-empty-${cx}-${cy}`} cx={cx} cy={cy} r={0} />;

    const isSelected = payload.ply === currentPly;
    const isBlunder = payload.classification === 'blunder';
    const isMistake = payload.classification === 'mistake';
    const isBrilliant = payload.classification === 'brilliant';

    if (isSelected) {
      return (
        <circle
          key={`dot-selected-${payload.ply}`}
          cx={cx}
          cy={cy}
          r={5}
          fill="#38bdf8"
          stroke="#ffffff"
          strokeWidth={2}
        />
      );
    }

    if (isBrilliant) {
      return (
        <circle
          key={`dot-brilliant-${payload.ply}`}
          cx={cx}
          cy={cy}
          r={4}
          fill="#14b8a6"
          stroke="#ffffff"
          strokeWidth={1}
        />
      );
    }

    if (isBlunder) {
      return (
        <circle
          key={`dot-blunder-${payload.ply}`}
          cx={cx}
          cy={cy}
          r={4}
          fill="#ef4444"
          stroke="#ffffff"
          strokeWidth={1}
        />
      );
    }

    if (isMistake) {
      return (
        <circle
          key={`dot-mistake-${payload.ply}`}
          cx={cx}
          cy={cy}
          r={3.5}
          fill="#f97316"
          stroke="#ffffff"
          strokeWidth={1}
        />
      );
    }

    return <circle key={`dot-${payload.ply}`} cx={cx} cy={cy} r={0} />;
  };

  return (
    <div className={`w-full bg-slate-900/80 rounded-xl p-3 border border-white/[0.08] ${className}`}>
      <div className="flex items-center justify-between mb-1.5 px-1">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
          Evaluation History
        </span>
        <div className="flex items-center gap-2.5 text-[11px] text-slate-400 font-mono">
          <span className="flex items-center gap-1">
            <MoveClassificationIcon classification="brilliant" size={16} decorative />
            <span>Brilliant</span>
          </span>
          <span className="flex items-center gap-1">
            <MoveClassificationIcon classification="mistake" size={16} decorative />
            <span>Mistake</span>
          </span>
          <span className="flex items-center gap-1">
            <MoveClassificationIcon classification="blunder" size={16} decorative />
            <span>Blunder</span>
          </span>
        </div>
      </div>

      <div className="w-full h-24 sm:h-28">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            onClick={(state: any) => {
              if (state && state.activePayload && state.activePayload.length > 0) {
                const ply = state.activePayload[0].payload.ply;
                onSelectPly(ply);
              }
            }}
            margin={{ top: 6, right: 6, left: -24, bottom: 0 }}
          >
            <defs>
              <linearGradient id="evalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <ReferenceLine y={0} stroke="#334155" strokeDasharray="2 2" />
            <XAxis dataKey="ply" hide />
            <YAxis domain={[-6, 6]} hide />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const pt = payload[0].payload as ChartPoint;
                  const evalStr =
                    pt.evalPawns > 0 ? `+${pt.evalPawns.toFixed(1)}` : pt.evalPawns.toFixed(1);
                  return (
                    <div className="bg-slate-950 border border-white/[0.1] rounded-md px-2.5 py-1.5 shadow-xl text-xs space-y-0.5">
                      <div className="font-medium text-slate-200">{pt.moveLabel}</div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-300 font-semibold">{evalStr}</span>
                        {pt.classification && (
                          <MoveClassificationIcon classification={pt.classification} size={20} />
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
              stroke="#cbd5e1"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#evalGradient)"
              dot={renderCustomDot}
              activeDot={{ r: 4, fill: '#38bdf8', stroke: '#ffffff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

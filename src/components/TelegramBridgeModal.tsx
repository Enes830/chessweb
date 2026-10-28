'use client';

import React, { useState } from 'react';
import { RewindPuzzlePayload } from '@/types/chess';
import {
  createTelegramBotDeepLink,
  sendPuzzlesToWebhook,
} from '@/lib/bridge/telegramExport';
import { Send, Copy, Check, ExternalLink, X, Bot, Sparkles, AlertTriangle } from 'lucide-react';

interface TelegramBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  puzzles: RewindPuzzlePayload[];
  whitePlayer: string;
  blackPlayer: string;
}

export const TelegramBridgeModal: React.FC<TelegramBridgeModalProps> = ({
  isOpen,
  onClose,
  puzzles,
  whitePlayer,
  blackPlayer,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);
  const [webhookMessage, setWebhookMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyJson = () => {
    const jsonStr = JSON.stringify(puzzles, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendWebhook = async () => {
    setIsSendingWebhook(true);
    setWebhookMessage(null);
    const res = await sendPuzzlesToWebhook(puzzles);
    setIsSendingWebhook(false);
    setWebhookMessage(res.message);
  };

  const deepLink = createTelegramBotDeepLink(puzzles);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-gradient-to-r from-sky-950/40 via-slate-900 to-indigo-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Train Mistakes on Telegram
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  RewindChess Bot
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Turn your analyzed blunders & tactical oversights into personalized daily training puzzles.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between bg-slate-850 p-3 rounded-xl border border-slate-800 text-xs">
            <div>
              <span className="text-slate-400">Game: </span>
              <span className="font-semibold text-white">
                {whitePlayer} vs {blackPlayer}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Extracted Puzzles:</span>
              <span className="font-bold text-sky-400 px-2 py-0.5 rounded bg-sky-950 border border-sky-800">
                {puzzles.length}
              </span>
            </div>
          </div>

          {puzzles.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              <Sparkles className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
              <p className="font-medium text-slate-300">Clean Game!</p>
              <p className="text-xs text-slate-500 mt-1">
                No blunders or major mistakes were detected in this review.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {puzzles.map((p, idx) => (
                <div
                  key={p.id || idx}
                  className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-300">
                        Move {p.move_number} ({p.player_color === 'w' ? 'White' : 'Black'})
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          p.puzzle_type === 'BLUNDER'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : p.puzzle_type === 'MISSED_WIN'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                        }`}
                      >
                        {p.puzzle_type}
                      </span>
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      Played:{' '}
                      <span className="text-red-400 font-mono font-semibold">
                        {p.user_played_move_san}
                      </span>{' '}
                      → Best:{' '}
                      <span className="text-emerald-400 font-mono font-semibold">
                        {p.best_move_san}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-mono">
                      Eval drop: {Math.abs(p.eval_before_cp - p.eval_after_cp) / 100} pawns
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {webhookMessage && (
            <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{webhookMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyJson}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Copied JSON</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span>Copy JSON Payload</span>
                </>
              )}
            </button>

            <button
              onClick={handleSendWebhook}
              disabled={isSendingWebhook || puzzles.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <Send className="w-4 h-4 text-indigo-400" />
              <span>{isSendingWebhook ? 'Dispatching...' : 'Push to Webhook'}</span>
            </button>
          </div>

          <a
            href={deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/20 transition-all hover:scale-[1.02]"
          >
            <Send className="w-4 h-4" />
            <span>Open in Telegram Bot</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </a>
        </div>
      </div>
    </div>
  );
};

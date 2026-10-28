'use client';

import React, { useState } from 'react';
import { RewindPuzzlePayload } from '@/types/chess';
import {
  createTelegramBotDeepLink,
  sendPuzzlesToWebhook,
} from '@/lib/bridge/telegramExport';
import { Send, Copy, Check, ExternalLink, X, CheckCircle2 } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-xl bg-slate-900 border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              Export Puzzles to Telegram
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/[0.06]">
                @RewindChessBot
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Sync detected mistake positions directly into your personal puzzle trainer.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 overflow-y-auto space-y-3">
          <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-lg border border-white/[0.06] text-xs">
            <div className="text-slate-300">
              <span className="text-slate-500">Game: </span>
              <span className="font-medium text-white">{whitePlayer}</span>
              <span className="text-slate-500"> vs </span>
              <span className="font-medium text-white">{blackPlayer}</span>
            </div>
            <div className="text-xs font-mono text-slate-300">
              {puzzles.length} {puzzles.length === 1 ? 'position' : 'positions'}
            </div>
          </div>

          {puzzles.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2 opacity-80" />
              <p className="font-medium text-slate-200">No Blunders or Mistakes</p>
              <p className="text-slate-500 mt-0.5">
                All moves in this game met accuracy thresholds.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {puzzles.map((p, idx) => (
                <div
                  key={p.id || idx}
                  className="p-2.5 rounded-lg bg-slate-950/40 border border-white/[0.04] flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-300">
                        Move {p.move_number} ({p.player_color === 'w' ? 'White' : 'Black'})
                      </span>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                          p.puzzle_type === 'BLUNDER'
                            ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                            : p.puzzle_type === 'MISSED_WIN'
                            ? 'bg-pink-500/15 text-pink-400 border border-pink-500/30'
                            : 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                        }`}
                      >
                        {p.puzzle_type}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      Played: <span className="text-slate-400">{p.user_played_move_uci}</span> • Best:{' '}
                      <span className="text-emerald-400">{p.best_move_uci}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {webhookMessage && (
            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-white/[0.08] text-xs text-slate-300">
              {webhookMessage}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-white/[0.08] bg-slate-950/40 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyJson}
              disabled={puzzles.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-white/[0.06] transition-colors disabled:opacity-40"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy JSON'}</span>
            </button>

            {process.env.NEXT_PUBLIC_BOT_WEBHOOK_URL && (
              <button
                onClick={handleSendWebhook}
                disabled={isSendingWebhook || puzzles.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-white/[0.06] transition-colors disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingWebhook ? 'Sending...' : 'Send Webhook'}</span>
              </button>
            )}
          </div>

          <a
            href={deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-slate-100 hover:bg-white text-slate-950 font-semibold text-xs transition-colors"
          >
            <span>Open in Telegram</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};

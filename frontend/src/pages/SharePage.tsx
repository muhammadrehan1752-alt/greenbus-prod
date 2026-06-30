import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, Star, MessageCircle, Bus, Copy, Check } from 'lucide-react';
import { useBuses, useSubmitFeedback, useFeedback } from '../hooks';
import { Bus as BusType } from '../types';

function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map((n) => (
        <button key={n} onClick={() => onChange(n)} className="text-2xl transition-transform active:scale-90">
          <span className={n <= value ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'}>★</span>
        </button>
      ))}
    </div>
  );
}

export default function SharePage() {
  const { buses } = useBuses();
  const { data: feedback = [] } = useFeedback();
  const submitFeedback = useSubmitFeedback();

  const [tab, setTab] = useState<'share' | 'feedback'>('share');
  const [selectedBus, setSelectedBus] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareMsg, setShareMsg] = useState('');

  const activeBuses = buses.filter((b) => b.status === 'active');

  function copyShareLink() {
    const link = `${window.location.origin}/?track=${selectedBus || 'all'}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleFeedback() {
    if (!rating) return;
    await submitFeedback.mutateAsync({ bus_id: selectedBus || undefined, rating, comment });
    setSubmitted(true);
    setComment('');
    setRating(5);
    setTimeout(() => setSubmitted(false), 3000);
  }

  const avgRating = feedback.length
    ? (feedback.reduce((s: number, f: any) => s + f.rating, 0) / feedback.length).toFixed(1)
    : '—';

  return (
    <div className="h-full overflow-y-auto pb-28 px-4 pt-4">
      <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4">Share & Feedback</h2>

      <div className="flex rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 mb-5">
        {([['share', 'Share Ride'], ['feedback', 'Rate Bus']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${tab === key ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 dark:text-slate-400'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'share' ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <p className="font-bold text-slate-900 dark:text-white mb-1">Share bus tracking link</p>
            <p className="text-xs text-slate-400 mb-4">Let friends see exactly where the bus is</p>

            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Select Bus (optional)</label>
            <select
              value={selectedBus}
              onChange={(e) => setSelectedBus(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm dark:text-white mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All active buses</option>
              {activeBuses.map((b) => (
                <option key={b.id} value={b.id}>{b.id} — {b.route_name ?? b.route_id}</option>
              ))}
            </select>

            <button
              onClick={copyShareLink}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white active:scale-95 transition-all"
            >
              {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy tracking link</>}
            </button>
          </div>

          {/* Live bus cards */}
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Active buses right now</p>
          {activeBuses.map((b) => {
            const occ = b.capacity ? Math.round((b.occupied_seats / b.capacity) * 100) : 0;
            return (
              <div key={b.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className={`p-2 rounded-xl ${b.type === 'pink' ? 'bg-pink-50 dark:bg-pink-950/50' : 'bg-emerald-50 dark:bg-emerald-950/50'}`}>
                  <Bus size={18} className={b.type === 'pink' ? 'text-pink-600' : 'text-emerald-600'} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm text-slate-900 dark:text-white">{b.id}</p>
                  <p className="text-xs text-slate-400">{b.route_name ?? b.route_id}</p>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${occ > 80 ? 'bg-rose-100 text-rose-600' : occ > 50 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {occ}% full
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Average rating banner */}
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-4 flex items-center gap-3">
            <div className="text-3xl font-black text-amber-500">{avgRating}</div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Average rating</p>
              <p className="text-xs text-slate-400">Based on {feedback.length} reviews (last 30 days)</p>
            </div>
          </div>

          {/* Submit form */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <p className="font-bold text-slate-900 dark:text-white">Rate your ride</p>
            <StarRating value={rating} onChange={setRating} />

            <select
              value={selectedBus}
              onChange={(e) => setSelectedBus(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Select bus (optional)</option>
              {buses.map((b) => (
                <option key={b.id} value={b.id}>{b.id} — {b.route_name ?? b.route_id}</option>
              ))}
            </select>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience…"
              rows={3}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />

            {submitted ? (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-sm font-semibold p-3 text-center">
                ✓ Thanks for your feedback!
              </div>
            ) : (
              <button
                onClick={handleFeedback}
                disabled={submitFeedback.isPending}
                className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white disabled:opacity-50 active:scale-95 transition-all"
              >
                {submitFeedback.isPending ? 'Submitting…' : 'Submit feedback'}
              </button>
            )}
          </div>

          {/* Recent reviews */}
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Recent reviews</p>
          {feedback.slice(0, 10).map((f: any) => (
            <div key={f.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-slate-900 dark:text-white">{f.display_name || 'Anonymous'}</p>
                <div className="flex">
                  {[1,2,3,4,5].map((n) => (
                    <span key={n} className={`text-sm ${n <= f.rating ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'}`}>★</span>
                  ))}
                </div>
              </div>
              {f.comment && <p className="text-xs text-slate-500 dark:text-slate-400">{f.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Plus, Ticket, Clock, CheckCircle2, XCircle, ChevronRight, Leaf, Trophy, X } from 'lucide-react';
import { useMyTickets, useTopUp, useWalletHistory } from '../hooks';
import { useAuth } from '../contexts/AuthContext';
import { Ticket as TicketType, TicketStatus, WalletTransaction } from '../types';

function TicketCard({ ticket, onView }: { ticket: TicketType; onView: (t: TicketType) => void }) {
  const statusColor: Record<string, string> = {
    valid: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50',
    used: 'text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-slate-800',
    expired: 'text-rose-500 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/30',
  };
  const icons: Record<string, React.ReactNode> = {
    valid: <CheckCircle2 size={13} />,
    used: <Clock size={13} />,
    expired: <XCircle size={13} />,
  };

  return (
    <motion.button
      onClick={() => ticket.status === TicketStatus.VALID && onView(ticket)}
      whileTap={{ scale: 0.98 }}
      className="w-full text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center gap-3"
    >
      <div className={`p-2.5 rounded-xl ${ticket.route_type === 'pink' ? 'bg-pink-50 dark:bg-pink-950/50' : 'bg-emerald-50 dark:bg-emerald-950/50'}`}>
        <Ticket size={18} className={ticket.route_type === 'pink' ? 'text-pink-600' : 'text-emerald-600'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{ticket.route_name ?? ticket.route_id}</p>
        <p className="text-xs text-slate-400 mt-0.5">{new Date(ticket.created_at).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</p>
      </div>
      <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
        <span className="text-sm font-black text-slate-900 dark:text-white">PKR {ticket.fare}</span>
        <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${statusColor[ticket.status]}`}>
          {icons[ticket.status]} {ticket.status}
        </span>
      </div>
    </motion.button>
  );
}

function QRModal({ ticket, onClose }: { ticket: TicketType; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[800] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4 pb-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Valid Ticket</p>
            <p className="font-black text-slate-900 dark:text-white">{ticket.route_name ?? ticket.route_id}</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-slate-100 dark:bg-slate-800 p-2">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <div className="flex justify-center bg-white rounded-2xl p-4 border border-slate-100 mb-4">
          {ticket.qr_code ? (
            <img src={ticket.qr_code} alt="QR" className="w-48 h-48 object-contain" />
          ) : (
            <QRCodeSVG value={JSON.stringify({ id: ticket.id, route: ticket.route_id })} size={192} />
          )}
        </div>

        <div className="text-center space-y-1">
          <p className="text-xl font-black text-emerald-600">PKR {ticket.fare}</p>
          <p className="text-xs text-slate-400">Show to conductor for scanning</p>
          <p className="text-xs text-slate-400">Expires: {new Date(ticket.expires_at).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TopUpModal({ onClose }: { onClose: () => void }) {
  const topUp = useTopUp();
  const { updateUser } = useAuth();
  const [amount, setAmount] = useState('');
  const [done, setDone] = useState(false);
  const presets = [100, 200, 500, 1000];

  async function handleTopUp() {
    const amt = parseFloat(amount);
    if (!amt || amt < 10) return;
    const res = await topUp.mutateAsync(amt);
    updateUser({ wallet_balance: res.wallet_balance });
    setDone(true);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[800] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4 pb-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl"
      >
        {done ? (
          <div className="text-center py-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mb-4">
              <CheckCircle2 size={28} className="text-emerald-600" />
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white">Wallet Topped Up!</p>
            <p className="text-sm text-slate-500 mt-1">PKR {amount} added to your wallet</p>
            <button onClick={onClose} className="mt-5 w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white">Done</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <p className="font-black text-slate-900 dark:text-white text-lg">Top Up Wallet</p>
              <button onClick={onClose} className="rounded-full bg-slate-100 dark:bg-slate-800 p-2">
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {presets.map((p) => (
                <button
                  key={p}
                  onClick={() => setAmount(String(p))}
                  className={`py-3 rounded-xl text-sm font-bold border transition-all ${amount === String(p) ? 'bg-emerald-600 text-white border-transparent' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}
                >
                  PKR {p}
                </button>
              ))}
            </div>
            <input
              type="number"
              placeholder="Custom amount (PKR)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
            />
            <button
              onClick={handleTopUp}
              disabled={!amount || parseFloat(amount) < 10 || topUp.isPending}
              className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white disabled:opacity-50 transition-all active:scale-95"
            >
              {topUp.isPending ? 'Processing…' : `Add PKR ${amount || '0'}`}
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function WalletPage() {
  const { user } = useAuth();
  const { data: tickets = [], isLoading } = useMyTickets();
  const { data: history = [] } = useWalletHistory();
  const [tab, setTab] = useState<'tickets' | 'history'>('tickets');
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [showTopUp, setShowTopUp] = useState(false);

  return (
    <div className="h-full overflow-y-auto pb-28 px-4 pt-4">
      {/* Balance card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 mb-5 shadow-xl shadow-emerald-200 dark:shadow-none">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-10 translate-x-10" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-8 -translate-x-6" />
        <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-1">Wallet Balance</p>
        <p className="text-4xl font-black text-white">PKR {user?.wallet_balance?.toFixed(2)}</p>
        <div className="mt-4 flex gap-4">
          <div className="flex items-center gap-1.5">
            <Trophy size={14} className="text-emerald-200" />
            <span className="text-emerald-100 text-sm font-semibold">{user?.reward_points} pts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Leaf size={14} className="text-emerald-200" />
            <span className="text-emerald-100 text-sm font-semibold">{user?.carbon_saved?.toFixed(1)} kg CO₂ saved</span>
          </div>
        </div>
        <button
          onClick={() => setShowTopUp(true)}
          className="mt-4 flex items-center gap-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2.5 text-sm font-bold text-white transition-all active:scale-95"
        >
          <Plus size={16} /> Top Up
        </button>
      </div>

      {/* Tabs */}
      <div className="flex rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 mb-4">
        {([['tickets', 'My Tickets'], ['history', 'History']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${tab === key ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 dark:text-slate-400'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'tickets' ? (
        isLoading ? (
          <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}</div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Ticket size={40} className="mb-3 opacity-30" />
            <p className="text-sm font-semibold">No tickets yet</p>
            <p className="text-xs mt-1">Buy a ticket from the Routes tab</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {tickets.map((t: TicketType) => <TicketCard key={t.id} ticket={t} onView={setSelectedTicket} />)}
          </div>
        )
      ) : (
        <div className="space-y-2.5">
          {history.map((tx: WalletTransaction) => (
            <div key={tx.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className={`p-2.5 rounded-xl ${tx.type === 'topup' ? 'bg-emerald-50 dark:bg-emerald-950/50' : 'bg-rose-50 dark:bg-rose-950/30'}`}>
                {tx.type === 'topup' ? <Plus size={16} className="text-emerald-600" /> : <Ticket size={16} className="text-rose-500" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900 dark:text-white capitalize">{tx.type}</p>
                <p className="text-xs text-slate-400">{new Date(tx.created_at).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}</p>
              </div>
              <div className="text-right">
                <p className={`font-black text-sm ${tx.amount > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {tx.amount > 0 ? '+' : ''}PKR {Math.abs(tx.amount).toFixed(0)}
                </p>
                <p className="text-xs text-slate-400">Bal: {tx.balance_after.toFixed(0)}</p>
              </div>
            </div>
          ))}
          {history.length === 0 && <p className="text-center text-slate-400 py-10 text-sm">No transactions yet</p>}
        </div>
      )}

      <AnimatePresence>
        {selectedTicket && <QRModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />}
        {showTopUp && <TopUpModal onClose={() => setShowTopUp(false)} />}
      </AnimatePresence>
    </div>
  );
}

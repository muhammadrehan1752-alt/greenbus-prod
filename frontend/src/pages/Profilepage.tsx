import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Phone, MapPin, Calendar,
  Lock, RefreshCw, Trash2, LogOut, Save,
  Eye, EyeOff, CheckCircle, XCircle, Plus,
  Bus, Star, Shield, CreditCard, AlertTriangle,
  Camera, ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────
interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  dob: string;
  address: string;
}

interface AccountItem {
  id: number;
  name: string;
  email: string;
  role: 'Passenger' | 'Admin' | 'Driver';
  active: boolean;
}

// ─── Avatar Data ──────────────────────────────────────────────────────────────
const maleAvatars = ['👨‍💼', '👨‍💻', '👨‍🎨', '👨‍🚀', '👨‍🍳', '👨‍⚕️', '👨‍✈️', '🧔', '👲', '🧑'];
const femaleAvatars = ['👩‍💼', '👩‍💻', '👩‍🎨', '👩‍🚀', '👩‍🍳', '👩‍⚕️', '👩‍✈️', '👸', '👩‍🦱', '🧕'];

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'accounts' | 'avatars'>('profile');
  
  const [profile, setProfile] = useState<UserProfile>({
    firstName: user?.display_name?.split(' ')[0] || '',
    lastName: user?.display_name?.split(' ')[1] || '',
    email: user?.email || '',
    phone: '+92 300 1234567',
    city: 'Quetta',
    dob: '1995-03-20',
    address: 'Street 5, Satellite Town, Quetta'
  });

  const [selectedAvatar, setSelectedAvatar] = useState<string>('👤');
  const [avatarGender, setAvatarGender] = useState<'male' | 'female'>('male');
  
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [showPassword, setShowPassword] = useState({ current: false, newPass: false, confirm: false });
  const [passStrength, setPassStrength] = useState(0);
  
  const [accounts, setAccounts] = useState<AccountItem[]>([
    { id: 1, name: user?.display_name || 'Ahmed Khan', email: user?.email || '', role: 'Passenger', active: true },
    { id: 2, name: 'Sara Baloch', email: 'sara@greenbus.pk', role: 'Passenger', active: false },
  ]);

  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [showModal, setShowModal] = useState<'logout' | 'delete' | null>(null);

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const calculateStrength = (pass: string): number => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 8) score += 25;
    if (/[A-Z]/.test(pass)) score += 25;
    if (/[0-9]/.test(pass)) score += 25;
    if (/[^A-Za-z0-9]/.test(pass)) score += 25;
    return score;
  };

  const getStrengthColor = (strength: number): string => {
    if (strength <= 25) return 'bg-red-500';
    if (strength <= 50) return 'bg-yellow-500';
    if (strength <= 75) return 'bg-blue-500';
    return 'bg-emerald-500';
  };

  const getStrengthText = (strength: number): string => {
    if (strength <= 25) return 'Weak';
    if (strength <= 50) return 'Fair';
    if (strength <= 75) return 'Good';
    return 'Strong';
  };

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleSaveProfile = () => { showToast('✅ Profile updated successfully!'); };
  
  const handleChangePassword = () => {
    if (!passwords.current || !passwords.newPass || !passwords.confirm) { showToast('❌ Please fill all fields'); return; }
    if (passwords.current !== 'demo') { showToast('❌ Current password is incorrect'); return; }
    if (passwords.newPass.length < 8) { showToast('❌ Password must be 8+ characters'); return; }
    if (passwords.newPass !== passwords.confirm) { showToast('❌ Passwords do not match'); return; }
    setPasswords({ current: '', newPass: '', confirm: '' }); setPassStrength(0);
    showToast('✅ Password changed successfully!');
  };

  const handleSwitchAccount = (id: number) => {
    setAccounts(prev => prev.map(acc => ({ ...acc, active: acc.id === id })));
    showToast('🔄 Account switched!');
  };

  const handleLogout = () => { setShowModal(null); setTimeout(() => logout(), 300); };
  const handleDelete = () => { setShowModal(null); showToast('🗑️ Account deletion requested'); };

  const tabs = [
    { key: 'profile', icon: User, label: 'Profile' },
    { key: 'security', icon: Lock, label: 'Security' },
    { key: 'accounts', icon: RefreshCw, label: 'Accounts' },
    { key: 'avatars', icon: Camera, label: 'Avatar' },
  ];

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      
      {/* Success Toast */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute top-4 left-4 right-4 z-[999] bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3"
          >
            <CheckCircle size={18} /><span className="font-semibold text-sm">{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="relative bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 pt-12 pb-16 px-5 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/3" />

        <div className="relative z-10 flex items-center gap-4 mb-6">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setActiveTab('avatars')} className="relative group">
            <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center text-5xl shadow-lg">
              {selectedAvatar}
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center text-white border-2 border-white shadow-md"><Camera size={14} /></div>
          </motion.button>

          <div className="text-white flex-1">
            <h1 className="text-2xl font-black tracking-tight">{profile.firstName} {profile.lastName}</h1>
            <p className="text-emerald-100 text-sm mt-0.5 font-medium">{profile.email}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">Active Passenger</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 relative z-10">
          {[
            { value: '24', label: 'Trips', icon: Bus },
            { value: 'PKR 12K', label: 'Spent', icon: CreditCard },
            { value: '4.9★', label: 'Rating', icon: Star },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
              <stat.icon size={16} className="mx-auto mb-1 text-emerald-200" />
              <div className="text-white font-bold text-lg leading-none">{stat.value}</div>
              <div className="text-emerald-200 text-[10px] font-bold uppercase tracking-wider mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 -mt-8 px-5 pb-24 overflow-y-auto custom-scrollbar">
        
        {/* Tabs */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-1.5 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 mb-5 flex gap-1">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all font-bold text-xs ${
                activeTab === tab.key ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}>
              <tab.icon size={16} strokeWidth={activeTab === tab.key ? 2.5 : 2} />{tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>

            {/* ══════════ PROFILE TAB ══════════ */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <FieldGroup label="First Name" icon={User}>
                    <input type="text" value={profile.firstName} onChange={(e) => setProfile(p => ({...p, firstName: e.target.value}))} className="field-input" placeholder="First Name" />
                  </FieldGroup>
                  <FieldGroup label="Last Name" icon={User}>
                    <input type="text" value={profile.lastName} onChange={(e) => setProfile(p => ({...p, lastName: e.target.value}))} className="field-input" placeholder="Last Name" />
                  </FieldGroup>
                  <FieldGroup label="Email Address" icon={Mail}>
                    <input type="email" value={profile.email} onChange={(e) => setProfile(p => ({...p, email: e.target.value}))} className="field-input" placeholder="email@example.com" />
                  </FieldGroup>
                  <FieldGroup label="Phone Number" icon={Phone}>
                    <input type="tel" value={profile.phone} onChange={(e) => setProfile(p => ({...p, phone: e.target.value}))} className="field-input" placeholder="+92 300..." />
                  </FieldGroup>
                  <FieldGroup label="City" icon={MapPin}>
                    <select value={profile.city} onChange={(e) => setProfile(p => ({...p, city: e.target.value}))} className="field-input">
                      <option>Quetta</option><option>Gwadar</option><option>Turbat</option><option>Khuzdar</option><option>Loralai</option><option>Zhob</option>
                    </select>
                  </FieldGroup>
                  <FieldGroup label="Date of Birth" icon={Calendar}>
                    <input type="date" value={profile.dob} onChange={(e) => setProfile(p => ({...p, dob: e.target.value}))} className="field-input" />
                  </FieldGroup>
                </div>

                <div className="col-span-2 space-y-1 pl-[1px]">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Home Address</label>
                  <textarea value={profile.address} onChange={(e) => setProfile(p => ({...p, address: e.target.value}))} className="field-input min-h-[80px] resize-none" placeholder="Enter address..." />
                </div>

                <button onClick={handleSaveProfile} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transition-all active:scale-[0.98]">
                  <Save size={18} />Save Changes
                </button>
              </div>
            )}

            {/* ══════════ SECURITY TAB ══════════ */}
            {activeTab === 'security' && (
              <div className="space-y-5">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><Lock size={18} className="text-emerald-600" />Change Password</h3>

                  <PasswordField label="Current Password" value={passwords.current} show={showPassword.current} onShow={() => setShowPassword(s => ({...s, current: !s.current}))} onChange={(val) => setPasswords(p =>({...p, current: val}))} placeholder="Enter current" />

                  <PasswordField label="New Password" value={passwords.newPass} show={showPassword.newPass} onShow={() => setShowPassword(s => ({...s, newPass: !s.newPass}))} onChange={(val) => { setPasswords(p =>({...p, newPass: val})); setPassStrength(calculateStrength(val)); }} placeholder="Min 8 chars" />

                  {passwords.newPass && (
                    <div className="space-y-1.5 pl-1">
                      <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <motion.div className={`h-full ${getStrengthColor(passStrength)} transition-colors`} initial={{ width: 0 }} animate={{ width: `${passStrength}%` }} />
                      </div>
                      <div className={`text-xs font-bold ${getStrengthColor(passStrength).replace('bg-', 'text-')}`}>Strength: {getStrengthText(passStrength)}</div>
                      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                        {[{ met: passwords.newPass.length >= 8, t: '8+ characters' }, { met: /[A-Z]/.test(passwords.newPass), t: 'Uppercase' }, { met: /[0-9]/.test(passwords.newPass), t: 'Number' }, { met: /[^A-Za-z0-9]/.test(passwords.newPass), t: 'Special' }].map(r => (
                          <div key={r.t} className={`flex items-center gap-2 font-medium ${r.met ? 'text-emerald-600' : 'text-slate-400'}`}>{r.met ? <CheckCircle size={14}/> : <XCircle size={14}/>} {r.t}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  <PasswordField label="Confirm New Password" value={passwords.confirm} show={showPassword.confirm} onShow={() => setShowPassword(s => ({...s, confirm: !s.confirm}))} onChange={(val) => setPasswords(p => ({...p, confirm: val}))} placeholder="Re-enter" />

                  <button onClick={handleChangePassword} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                    <Lock size={16} />Update Password
                  </button>
                </div>

                <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl p-5 border border-red-200 dark:border-red-900/30 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-lg mt-0.5"><AlertTriangle size={18} className="text-red-600"/></div>
                    <div>
                      <h3 className="font-bold text-red-700 dark:text-red-400">Danger Zone</h3>
                      <p className="text-xs text-red-600 dark:text-red-500 mt-1 leading-relaxed">Permanently delete your account and all travel history.</p>
                      <button onClick={() => setShowModal('delete')} className="mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all"><Trash2 size={14}/>Delete Account</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════ ACCOUNTS TAB ══════════ */}
            {activeTab === 'accounts' && (
              <div className="space-y-4">
                {accounts.map(acc => (
                  <motion.div key={acc.id} whileTap={{ scale: 0.98 }} onClick={() => !acc.active && handleSwitchAccount(acc.id)} className={`rounded-2xl p-4 border-2 ${acc.active ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${acc.active ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}>{acc.name.split(' ').map(n=>n[0]).join('')}</div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{acc.name}</h4>
                        <p className="text-xs text-slate-500 truncate">{acc.email}</p>
                        <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${acc.role==='Admin'?'bg-purple-100 text-purple-700':acc.role==='Driver'?'bg-blue-100 text-blue-700':'bg-slate-100 text-slate-600'}`}>{acc.role}</span>
                      </div>
                      <div>{acc.active ? <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-3 py-1.5 rounded-full">✓ Active</span> : <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">Switch →</span>}</div>
                    </div>
                  </motion.div>
                ))}

                <button className="w-full border-2 border-dashed border-slate-300 rounded-2xl py-4 text-slate-500 font-bold text-sm flex items-center justify-center gap-2"><Plus size={18}/>Add Account</button>

                <div className="pt-2 border-t border-slate-200">
                  <button onClick={() => setShowModal('logout')} className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border border-red-200"><LogOut size={18}/>Sign Out</button>
                </div>
              </div>
            )}

            {/* ══════════ AVATARS TAB ══════════ */}
            {activeTab === 'avatars' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-slate-500">Choose style</p>
                  <div className="flex bg-slate-100 rounded-xl p-1">
                    {(['male','female'] as const).map(g=>(<button key={g} onClick={()=>setAvatarGender(g)} className={`px-4 py-2 rounded-lg text-xs font-bold capitalize ${avatarGender===g?'bg-white shadow text-slate-900':'text-slate-500'}`}>{g==='male'? '👨 Men':'👩 Women'}</button>))}
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-3">
                  {(avatarGender==='male'?maleAvatars:femaleAvatars).map(emoji=>(
                    <motion.button key={emoji} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }} onClick={()=>setSelectedAvatar(emoji)} className={`aspect-square rounded-2xl flex items-center justify-center text-4xl border-2 ${selectedAvatar===emoji?'border-emerald-500 bg-emerald-50 scale-105':'border-transparent'} shadow-sm`}>{emoji}{selectedAvatar===emoji&&<div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center"><CheckCircle size={12} className="text-white"/></div>}</motion.button>
                  ))}
                </div>

                <button onClick={()=>{setShowSuccess(true);setSuccessMsg('✅ Avatar updated!');setTimeout(()=>setShowSuccess(false),2500);setActiveTab('profile');}} className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-sm">Apply Avatar</button>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{opacity:0}}animate={{opacity:1}}exit={{opacity:0}} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-5" onClick={() => setShowModal(null)}>
            <motion.div initial={{scale:0.9}}animate={{scale:1}}exit={{scale:0.9}} className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl" onClick={e=>e.stopPropagation()}>
              <div className="text-center"><div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-3xl mb-4 ${showModal==='logout'?'bg-blue-100':'bg-red-100'}`}>{showModal==='logout'?'🚪':'⚠️'}</div>
                <h3 className="text-xl font-bold mb-2">{showModal==='logout'?'Sign Out?':'Delete?'}</h3>
                <p className="text-sm text-slate-500 mb-6">{showModal==='logout'?'Sign out of all accounts?':'Cannot be undone.'}</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowModal(null)} className="flex-1 py-3 rounded-xl border-2 border-slate-200 font-bold">Cancel</button>
                  <button onClick={showModal==='logout'?handleLogout:handleDelete} className={`flex-1 py-3 rounded-xl text-white font-bold ${showModal==='logout'?'bg-blue-600':'bg-red-600'}`}>Confirm</button>
                </div></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`.custom-scrollbar::-webkit-scrollbar{width:4px;display:none}.field-input{width:100%;padding:10px 12px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:.75rem;font-size:13px;color:#1e293b;outline:none;box-sizing:border-box;transition:.2s}.dark .field-input{background:#0f172a;border-color:#334155;color:#f8fafc}.field-input:focus{border-color:#059669;box-shadow:0 0 0 3px rgba(5,150,105,.1)}`}</style>
    </div>
  );
}

// ─── Sub Components ──────────────────────────────────────────────────────────
function FieldGroup({ children, label, icon: Icon }: {children:React.ReactNode;label:string;icon:React.ComponentType<any>}) {
  return (<div className="space-y-1 col-span-1"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 ml-1"><Icon size={11}/> {label}</label>{children}</div>);
}

function PasswordField({ label, value, show, onShow, onChange, placeholder }: {label:string;value:string;show:boolean;onShow:()=>void;onChange:(v:string)=>void;placeholder?:string}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 ml-1"><Lock size={11}/> {label}</label>
      <div className="relative">
        <input type={show?'text':'password'} value={value} onChange={(e)=>onChange(e.target.value)} className="field-input pr-10" placeholder={placeholder}/>
        <button type="button" onClick={onShow} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{show?<EyeOff size={16}/>:<Eye size={16}/>}</button>
      </div>
    </div>
  );
}
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Users, 
  Calendar, 
  Image as ImageIcon, 
  MessageSquare, 
  Heart, 
  Share2, 
  Plus, 
  LogOut, 
  LayoutDashboard,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Menu,
  X,
  Lock,
  Phone,
  User as UserIcon,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
interface User {
  username: string;
  name: string;
  role: 'resident' | 'admin';
  avatar?: string;
  houseNumber?: string;
}

interface Post {
  id: number;
  author: string;
  authorAvatar?: string;
  content: string;
  imageUrl?: string;
  likes: number;
  createdAt: string;
  isPublic?: boolean;
}

interface Activity {
  id: number;
  title: string;
  description: string;
  date: string;
  location: string;
  pic?: string;
  phone?: string;
}

interface Financial {
  id: number;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
  description: string;
  addedBy: string;
  attachment?: string;
  status: 'pending' | 'approved';
}

interface UserData {
  username: string;
  name: string;
  houseNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  role: string;
  createdAt: string;
}

// --- Components ---

const Navbar = ({ user, onLogout, setActiveTab, activeTab }: { user: User | null; onLogout: () => void; setActiveTab: (t: string) => void; activeTab: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'activities', label: 'Kegiatan', icon: Calendar },
    { id: 'residents', label: 'Warga', icon: Users },
    { id: 'feed', label: 'Feed', icon: ImageIcon },
  ];

  if (user) {
    navItems.push({ id: 'dashboard', label: 'Kas', icon: Wallet });
    navItems.push({ id: 'profile', label: 'Profil Saya', icon: UserIcon });
    if (user.role === 'admin') {
      navItems.push({ id: 'admin', label: 'Panel Admin', icon: LayoutDashboard });
    }
  } else {
    navItems.push({ id: 'login', label: 'Login', icon: LogOut });
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <span className="text-xl font-bold text-brand-primary flex items-center gap-2">
              <Home className="w-6 h-6" />
              <span>Rumah Kiara 2</span>
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === item.id ? 'bg-brand-primary/10 text-brand-primary' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
            {user && (
              <button onClick={onLogout} className="text-slate-500 hover:text-red-500 transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="text-slate-600">
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-slate-200"
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setIsOpen(false); }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-base font-medium text-slate-600 hover:bg-slate-100"
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
              {user && (
                <button
                  onClick={() => { onLogout(); setIsOpen(false); }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-base font-medium text-red-500 hover:bg-red-50"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [posts, setPosts] = useState<Post[]>([]);
  const [postPage, setPostPage] = useState(1);
  const [totalPostPages, setTotalPostPages] = useState(1);
  
  const [activities, setActivities] = useState<Activity[]>([]);
  
  const [financials, setFinancials] = useState<Financial[]>([]);
  const [finPage, setFinPage] = useState(1);
  const [totalFinPages, setTotalFinPages] = useState(1);
  const [residentCount, setResidentCount] = useState(0);
  const [residentList, setResidentList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Auth State
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data) {
          // Fetch full profile info for current user
          fetch('/api/profile')
            .then(res => res.json())
            .then(profile => setUser(prev => prev ? { ...prev, ...profile } : profile));
          setUser(data);
        }
        setLoading(false);
      });
  }, []);

  // Fetch Public Data
  useEffect(() => {
    fetch('/api/stats').then(res => res.json()).then(data => setResidentCount(data.residentCount || 0));
    
    if (activeTab === 'residents') {
      fetch('/api/residents')
        .then(res => res.json())
        .then(data => Array.isArray(data) ? setResidentList(data) : []);
    }
    if (activeTab === 'feed' || activeTab === 'home') {
      fetch(`/api/posts?page=${postPage}&limit=5`)
        .then(res => res.json())
        .then(data => {
          if (data.posts) {
            setPosts(data.posts);
            setTotalPostPages(data.totalPages);
          }
        });
    }
    if (activeTab === 'activities' || activeTab === 'home') {
      fetch('/api/activities')
        .then(res => res.json())
        .then(data => Array.isArray(data) ? setActivities(data) : setActivities([]));
    }
    if (activeTab === 'dashboard' && user) {
      fetch(`/api/financials?page=${finPage}&limit=10`)
        .then(res => res.json())
        .then(data => {
          if (data.financials) {
            setFinancials(data.financials);
            setTotalFinPages(data.totalPages);
          }
        });
    }
  }, [activeTab, user, postPage, finPage]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setActiveTab('home');
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={handleLogout} setActiveTab={setActiveTab} activeTab={activeTab} />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && <HomeContent key="home" activities={activities} posts={posts} residentCount={residentCount} />}
          {activeTab === 'activities' && <ActivitiesContent key="activities" activities={activities} user={user} setActivities={setActivities} />}
          {activeTab === 'feed' && <FeedContent key="feed" posts={posts} user={user} setPosts={setPosts} currentPage={postPage} totalPages={totalPostPages} setPage={setPostPage} />}
          {activeTab === 'residents' && <ResidentsContent residents={residentList} />}
          {activeTab === 'profile' && <ProfileContent user={user} setUser={setUser} posts={posts} setActiveTab={setActiveTab} />}
          {activeTab === 'login' && <LoginContent key="login" setUser={setUser} setActiveTab={setActiveTab} />}
          {activeTab === 'dashboard' && <DashboardContent key="dashboard" user={user} financials={financials} setFinancials={setFinancials} currentPage={finPage} totalPages={totalFinPages} setPage={setFinPage} />}
          {activeTab === 'admin' && <AdminContent key="admin" />}
          {activeTab === 'register' && <RegisterContent key="register" setActiveTab={setActiveTab} />}
          {activeTab === 'reset-password' && <ResetPasswordContent key="reset" setActiveTab={setActiveTab} />}
        </AnimatePresence>
      </main>

      <footer className="mt-16 border-t border-slate-200 py-12 bg-white text-center text-slate-500">
        <p>©2026 Rumah Kiara 2-Management.</p>
      </footer>
    </div>
  );
}

// --- Sub-Pages ---

const HomeContent = ({ activities, posts, residentCount }: { activities: Activity[]; posts: Post[]; residentCount: number; key?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="space-y-12"
  >
    <section className="relative rounded-3xl overflow-hidden min-h-[400px] flex items-center bg-slate-900 text-white p-8 md:p-16">
      <div className="absolute inset-0 z-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1542332213-9b5a5a3fad35?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center"></div>
      <div className="relative z-10 max-w-2xl">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">Welcome to Rumah Kiara 2</h1>
        <p className="text-lg md:text-xl opacity-90 mb-8">Hunian nyaman, asri, dan terpercaya. Tempat di mana tetangga menjadi keluarga.</p>
        <div className="flex gap-4">
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/20">
            <h3 className="text-2xl font-bold">{residentCount}</h3>
            <p className="text-xs uppercase tracking-widest opacity-70">Keluarga</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/20">
            <h3 className="text-2xl font-bold">Safe</h3>
            <p className="text-xs uppercase tracking-widest opacity-70">Security 24/7</p>
          </div>
        </div>
      </div>
    </section>

    <div className="grid md:grid-cols-2 gap-12">
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-3xl font-bold text-slate-900">Kegiatan Mendatang</h2>
          <Calendar className="text-emerald-500 w-8 h-8" />
        </div>
        <div className="space-y-4">
          {activities.length > 0 ? activities.slice(0, 3).map((act, i) => (
            <div key={i} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all">
              <span className="text-emerald-500 font-bold text-lg mb-2 block">{new Date(act.date).toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-')}</span>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">{act.title}</h3>
              <p className="text-slate-500 leading-relaxed">{act.description}</p>
            </div>
          )) : (
            <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-100 text-slate-400">
              Belum ada kegiatan mendatang
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-3xl font-bold text-slate-900">Update Warga</h2>
          <ImageIcon className="text-emerald-500 w-8 h-8" />
        </div>
        <div className="space-y-4">
          {posts.slice(0, 4).map((p, i) => (
            <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all flex gap-6">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl overflow-hidden bg-slate-50 shrink-0 border border-slate-100 shadow-inner">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt="Update" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-300">
                    <ImageIcon className="w-10 h-10" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2 py-1">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">
                    {p.author.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'WARGA'}
                  </span>
                  <span className="text-[10px] md:text-xs font-medium text-slate-300">
                    {new Date(p.createdAt).toLocaleDateString('id-ID')}
                  </span>
                </div>
                <p className="text-slate-700 font-medium line-clamp-3 leading-relaxed">
                  {p.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </motion.div>
);

const ActivitiesContent = ({ activities, user, setActivities }: { activities: Activity[]; user: User | null; setActivities: any; key?: string }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', date: '', location: '', pic: '', phone: '' });
  const [isSaving, setIsSaving] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      setFormData({ title: '', description: '', date: '', location: '', pic: '', phone: '' });
      setShowAdd(false);
      const res = await fetch('/api/activities');
      setActivities(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus kegiatan ini?')) return;
    await fetch(`/api/activities/${id}`, { method: 'DELETE' });
    const res = await fetch('/api/activities');
    setActivities(await res.json());
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">Kegiatan & Acara</h2>
        <p className="text-slate-600">Jadwal kegiatan rutin dan khusus di cluster Rumah Kiara 2.</p>
        {user?.role === 'admin' && (
          <button 
            onClick={() => setShowAdd(!showAdd)}
            className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" />
            {showAdd ? 'Tutup Form' : 'Tambah Kegiatan'}
          </button>
        )}
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleAdd} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <input 
                  placeholder="Nama Kegiatan" 
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl w-full" 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                  required 
                />
                <input 
                  type="date" 
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl w-full" 
                  value={formData.date} 
                  onChange={e => setFormData({...formData, date: e.target.value})} 
                  required 
                />
              </div>
              <input 
                placeholder="Lokasi" 
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl w-full" 
                value={formData.location} 
                onChange={e => setFormData({...formData, location: e.target.value})} 
                required 
              />
              <div className="grid md:grid-cols-2 gap-4">
                <input 
                  placeholder="PIC (Penanggung Jawab)" 
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl w-full" 
                  value={formData.pic} 
                  onChange={e => setFormData({...formData, pic: e.target.value})} 
                />
                <input 
                  placeholder="No. Telp PIC" 
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl w-full" 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                />
              </div>
              <textarea 
                placeholder="Keterangan Kegiatan" 
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl w-full h-32 resize-none" 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
              />
              <button 
                type="submit" 
                disabled={isSaving}
                className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold hover:bg-brand-secondary transition-colors"
              >
                {isSaving ? 'Menyimpan...' : 'Simpan Kegiatan'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        {activities.map((act, i) => (
          <div key={i} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl flex gap-6 items-start relative">
            {user?.role === 'admin' && (
              <button 
                onClick={() => handleDelete(act.id)}
                className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            <div className="bg-brand-primary/10 text-brand-primary p-4 rounded-2xl shrink-0">
              <Calendar className="w-8 h-8" />
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-bold">{act.title}</h3>
                <span className="text-xs font-bold px-3 py-1 bg-slate-100 rounded-full">{act.date}</span>
              </div>
              <p className="text-slate-500">{act.description}</p>
              
              <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-2 border-t border-slate-50 mt-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Info className="w-4 h-4 text-slate-400" />
                  <span>Lokasi: {act.location}</span>
                </div>
                {act.pic && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <UserIcon className="w-4 h-4 text-slate-400" />
                    <span>PIC: {act.pic}</span>
                  </div>
                )}
                {act.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>Telp: {act.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

const ResidentsContent = ({ residents }: { residents: any[] }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
    <div className="text-center space-y-4">
      <h2 className="text-3xl font-bold">Daftar Penghuni</h2>
      <p className="text-slate-600">Direktori warga cluster Rumah Kiara 2.</p>
    </div>
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {residents.map((res, i) => (
        <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 overflow-hidden shrink-0 border-2 border-brand-primary/10">
            {res.avatar ? (
              <img src={res.avatar} alt={res.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-500 font-bold text-xl">
                {res.name[0]}
              </div>
            )}
          </div>
          <div>
            <h4 className="font-bold text-slate-800">{res.name}</h4>
            <p className="text-sm text-slate-500">Blok {res.houseNumber}</p>
            {res.role === 'admin' && (
              <span className="text-[10px] uppercase font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full">
                Pengurus
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  </motion.div>
);

const ProfileContent = ({ user, setUser, posts, setActiveTab }: { user: User | null; setUser: any; posts: Post[]; setActiveTab: (t: string) => void }) => {
  const [formData, setFormData] = useState({ name: user?.name || '', houseNumber: user?.houseNumber || '', avatar: user?.avatar || '', password: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const fileRef = React.useRef<HTMLInputElement>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setMessage('V');
        setUser({ ...user, name: data.name, avatar: data.avatar, houseNumber: formData.houseNumber });
        setTimeout(() => setMessage(''), 3000);
      } else {
        alert(data.error || 'Terjadi kesalahan');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const myPosts = posts.filter(p => p.author === user?.name);

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl grid md:grid-cols-3 gap-12">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
            <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-slate-50 shadow-2xl relative">
              {formData.avatar ? (
                <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-slate-200 flex items-center justify-center text-5xl font-bold text-slate-400">
                  {user?.name[0]}
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="text-white w-8 h-8" />
              </div>
            </div>
            <input type="file" hidden ref={fileRef} accept="image/*" onChange={handleAvatarChange} />
          </div>
          <div className="text-center">
            <h3 className="text-2xl font-bold">{user?.name}</h3>
            <p className="text-slate-400 font-medium">@{user?.username}</p>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <h4 className="text-lg font-bold flex items-center gap-2">
            <Info className="w-5 h-5 text-brand-primary" />
            Update Data Penghuni
          </h4>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nama Lengkap</label>
                <input 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nomor Rumah</label>
                <input 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl" 
                  value={formData.houseNumber} 
                  onChange={e => setFormData({...formData, houseNumber: e.target.value})} 
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Ganti Password (Biarkan kosong jika tidak ganti)</label>
              <input 
                type="password"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl" 
                placeholder="Password baru..."
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
              />
            </div>
            <button 
              type="submit" 
              disabled={isSaving}
              className="w-full bg-slate-900 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors"
            >
              {isSaving ? 'Menyimpan...' : message === 'V' ? 'Profil Terupdate!' : 'Simpan Perubahan'}
            </button>
          </form>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="text-2xl font-bold">Riwayat Postingan</h3>
          <span className="bg-slate-100 px-4 py-1 rounded-full text-xs font-bold text-slate-500">{myPosts.length} Post</span>
        </div>
        
        {myPosts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {myPosts.map((p, i) => (
              <motion.button 
                key={i} 
                whileHover={{ scale: 1.02 }}
                onClick={() => setActiveTab('feed')}
                className="aspect-square rounded-2xl overflow-hidden border border-slate-100 shadow-sm relative group bg-slate-50"
              >
                {p.imageUrl ? (
                  <img src={p.imageUrl} className="w-full h-full object-cover" alt="History" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                    <MessageSquare className="w-6 h-6 text-slate-200 mb-2" />
                    <p className="text-[10px] text-slate-400 line-clamp-3">{p.content}</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-xs font-bold uppercase tracking-wider">Lihat Post</span>
                </div>
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 border-dashed">
            <ImageIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 italic">Belum ada postingan yang dibagikan.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const PostCard = ({ post, user, onDelete }: { post: Post; user: User | null; onDelete?: (id: number) => void; key?: any }) => {
  const [likes, setLikes] = useState(post.likes);
  const [comments, setComments] = useState<{ author: string; content: string; createdAt: string }[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');

  const fetchComments = async () => {
    const res = await fetch(`/api/posts/${post.id}/comments`);
    const data = await res.json();
    setComments(data);
  };

  useEffect(() => {
    if (showComments) fetchComments();
  }, [showComments]);

  const handleLike = async () => {
    if (!user) return;
    const res = await fetch(`/api/posts/${post.id}/like`, { method: 'POST' });
    const data = await res.json();
    if (data.likes) setLikes(data.likes);
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await fetch(`/api/posts/${post.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newComment })
    });
    setNewComment('');
    fetchComments();
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold overflow-hidden border border-slate-100">
              {post.authorAvatar ? (
                <img src={post.authorAvatar} alt={post.author} className="w-full h-full object-cover" />
              ) : post.author[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900">{post.author}</h4>
                {!post.isPublic && (
                  <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Lock className="w-2 h-2" /> Warga
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">{new Date(post.createdAt).toLocaleString()}</p>
            </div>
          </div>
          {user?.role === 'admin' && onDelete && (
            <button onClick={() => onDelete(post.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <p className="text-slate-700 leading-relaxed">{post.content}</p>
      </div>
      {post.imageUrl && (
        <img src={post.imageUrl} alt="Post content" className="w-full object-cover max-h-[500px]" />
      )}
      <div className="px-6 py-4 border-t border-slate-50 flex items-center gap-6">
        <button 
          onClick={handleLike}
          className={`flex items-center gap-2 transition-colors ${user ? 'hover:text-brand-primary text-slate-500' : 'text-slate-300 cursor-not-allowed'}`}
        >
          <Heart className={`w-5 h-5 ${likes > post.likes ? 'fill-rose-500 text-rose-500' : ''}`} />
          <span className="text-sm font-medium">{likes}</span>
        </button>
        <button 
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 text-slate-500 hover:text-brand-primary transition-colors"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-sm font-medium">Komentar</span>
        </button>
        <button className="flex items-center gap-2 text-slate-500 hover:text-brand-primary transition-colors ml-auto">
          <Share2 className="w-5 h-5" />
        </button>
      </div>
      
      <AnimatePresence>
        {showComments && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-50 bg-slate-50/50 p-6 space-y-4"
          >
            {user && (
              <form onSubmit={handleComment} className="flex gap-2">
                <input 
                  placeholder="Tulis komentar..." 
                  className="flex-1 p-2 text-sm rounded-xl border border-slate-200 bg-white"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <button className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold">Kirim</button>
              </form>
            )}
            <div className="space-y-3">
              {comments.map((c, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
                    {c.author[0]}
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex-1">
                    <p className="text-xs font-bold text-slate-900 mb-1">{c.author}</p>
                    <p className="text-sm text-slate-600">{c.content}</p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && <p className="text-center text-xs text-slate-400 italic">Belum ada komentar.</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FeedContent = ({ posts, user, setPosts, currentPage, totalPages, setPage }: { posts: Post[]; user: User | null; setPosts: any; currentPage: number; totalPages: number; setPage: (p: number) => void; key?: string }) => {
  const [newContent, setNewContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchPosts = async () => {
    const res = await fetch(`/api/posts?page=${currentPage}&limit=5`);
    const data = await res.json();
    if (data.posts) setPosts(data.posts);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("File terlalu besar. Maksimal 10MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePost = async () => {
    if (!newContent.trim()) return;
    setIsPosting(true);
    try {
      const resPost = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent, imageUrl, isPublic })
      });
      const postData = await resPost.json();
      if (postData.error) {
        alert(postData.error);
        setIsPosting(false);
        return;
      }

      setNewContent('');
      setImageUrl('');
      fetchPosts();
    } catch (e) {
      console.error(e);
    } finally {
      setIsPosting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus postingan ini?')) return;
    await fetch(`/api/posts/${id}`, { method: 'DELETE' });
    fetchPosts();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {user && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg space-y-4">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
              {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : user.name[0]}
            </div>
            <textarea
              placeholder="Bagikan momen atau info cluster..."
              className="w-full p-4 bg-slate-50 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-brand-primary/20 min-h-[100px]"
              rows={3}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
            />
          </div>

          {imageUrl && (
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-100">
              <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
              <button 
                onClick={() => setImageUrl('')}
                className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full hover:bg-black/80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center justify-between pt-2 gap-4">
            <div className="flex gap-2 items-center">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200"
              >
                <Camera className="w-4 h-4 text-brand-primary" />
                Upload Foto
              </button>
              
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-slate-400">Publik?</span>
                <button 
                  onClick={() => setIsPublic(!isPublic)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${isPublic ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isPublic ? 'translate-x-6' : ''}`} />
                </button>
              </div>
            </div>
            <button
              onClick={handlePost}
              disabled={isPosting}
              className={`bg-brand-primary text-white px-8 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-brand-secondary transition-colors ${isPosting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isPosting ? 'Memeriksa & Posting...' : 'Kirim Post'}
            </button>
          </div>
        </div>
      )}

      {!user && (
        <div className="bg-slate-100 p-4 rounded-xl text-center text-sm text-slate-500">
          Hanya penghuni yang dapat memposting foto dan komentar.
        </div>
      )}

      <div className="space-y-6">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} user={user} onDelete={handleDelete} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 py-8">
          <button 
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl disabled:opacity-50"
          >
            Prev
          </button>
          <span className="px-4 py-2 text-sm font-bold text-slate-500">Hal {currentPage} / {totalPages}</span>
          <button 
            disabled={currentPage === totalPages}
            onClick={() => setPage(currentPage + 1)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

const AdminContent = ({ key }: { key?: string }) => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [pendingFin, setPendingFin] = useState<Financial[]>([]);
  const [loading, setLoading] = useState(true);
  const [connStatus, setConnStatus] = useState<{ status: string; message?: string; title?: string } | null>(null);

  const checkConnection = async () => {
    try {
      const res = await fetch('/api/health-check');
      const data = await res.json();
      setConnStatus(data);
    } catch (e) {
      setConnStatus({ status: 'error', message: 'Tidak dapat menghubungi server.' });
    }
  };

  const fetchData = async () => {
    const [resUsers, resFin] = await Promise.all([
      fetch('/api/admin/users'),
      fetch('/api/financials?pending=true')
    ]);
    const usersData = await resUsers.json();
    const finData = await resFin.json();
    if (Array.isArray(usersData)) setUsers(usersData);
    if (finData.financials) setPendingFin(finData.financials);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateStatus = async (username: string, status: string) => {
    await fetch('/api/admin/users/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, status })
    });
    fetchData();
  };

  const handleApproveFin = async (id: number) => {
    await fetch(`/api/admin/financials/${id}/approve`, { method: 'PUT' });
    fetchData();
  };

  const handleDeleteFin = async (id: number) => {
    if (!confirm('Hapus/Tolak data ini?')) return;
    await fetch(`/api/admin/financials/${id}`, { method: 'DELETE' });
    fetchData();
  };

  if (loading) return <div>Loading...</div>;
  
  const pendingUsers = users.filter(u => u.status === 'pending');
  const resetRequests = users.filter(u => u.status === 'reset_requested');
  const otherUsers = users.filter(u => u.status !== 'pending' && u.status !== 'reset_requested');
  
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Panel Admin</h2>
        <div className="flex gap-4">
          <button 
            onClick={checkConnection}
            className="px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold hover:bg-slate-50 transition-colors"
          >
            Cek Koneksi Database
          </button>
          <div className="bg-slate-100 px-4 py-2 rounded-full text-sm font-bold text-slate-600">
            Total Penghuni: {users.filter(u => u.status === 'approved').length} / 18 Keluarga
          </div>
        </div>
      </div>

      {pendingFin.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-3xl space-y-6">
          <div className="flex items-center gap-2 text-emerald-800">
            <Wallet className="w-6 h-6" />
            <h3 className="text-xl font-bold">Persetujuan Transaksi (Pending)</h3>
          </div>
          <div className="grid gap-4">
            {pendingFin.map((f, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {f.attachment && (
                    <a href={f.attachment} target="_blank" rel="noopener noreferrer" className="w-16 h-16 rounded-xl overflow-hidden border border-slate-100 shrink-0">
                      <img src={f.attachment} className="w-full h-full object-cover" />
                    </a>
                  )}
                  <div>
                    <h4 className="font-bold text-lg">{f.description}</h4>
                    <p className="text-slate-500 text-sm">
                      Oleh: {f.addedBy} • {f.type === 'income' ? 'Masuk' : 'Keluar'}: <span className={f.type === 'income' ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>Rp {f.amount.toLocaleString()}</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => handleDeleteFin(f.id)}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    Hapus
                  </button>
                  <button 
                    onClick={() => handleApproveFin(f.id)}
                    className="px-6 py-2 rounded-xl text-sm font-bold bg-brand-primary text-white hover:bg-brand-secondary transition-colors"
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {connStatus && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl border text-sm font-medium ${
            connStatus.status === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {connStatus.status === 'ok' 
            ? `Berhasil Terhubung: "${connStatus.title}"` 
            : `Koneksi Bermasalah: ${connStatus.message || 'Cek konfigurasi Secrets Anda.'}`}
        </motion.div>
      )}
  
      {pendingUsers.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-8 rounded-3xl space-y-6">
          <div className="flex items-center gap-2 text-amber-800">
            <Users className="w-6 h-6" />
            <h3 className="text-xl font-bold">Pendaftaran Menunggu Persetujuan</h3>
          </div>
          <div className="grid gap-4">
            {pendingUsers.map((u, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-amber-100 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-lg">{u.name}</h4>
                  <p className="text-slate-500 text-sm">Rumah: {u.houseNumber} • Username: {u.username}</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => handleUpdateStatus(u.username, 'rejected')}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    Tolak
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(u.username, 'approved')}
                    className="px-6 py-2 rounded-xl text-sm font-bold bg-brand-primary text-white hover:bg-brand-secondary transition-colors"
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {resetRequests.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-8 rounded-3xl space-y-6">
          <div className="flex items-center gap-2 text-blue-800">
            <Lock className="w-6 h-6" />
            <h3 className="text-xl font-bold">Permintaan Reset Password</h3>
          </div>
          <div className="grid gap-4">
            {resetRequests.map((u, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-lg">{u.name}</h4>
                  <p className="text-slate-500 text-sm">Rumah: {u.houseNumber} • Meminta password baru</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => handleUpdateStatus(u.username, 'approved')}
                    className="px-6 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    Terima dan Update Password
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
  
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100">
          <h3 className="text-xl font-bold">Daftar Penghuni</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50">
                <th className="py-4 px-8 font-bold text-slate-400 text-xs uppercase">Nama</th>
                <th className="py-4 px-8 font-bold text-slate-400 text-xs uppercase">No. Rumah</th>
                <th className="py-4 px-8 font-bold text-slate-400 text-xs uppercase text-center">Status</th>
                <th className="py-4 px-8 font-bold text-slate-400 text-xs uppercase text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {otherUsers.map((u, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td className="py-4 px-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-400">
                            {u.name[0]}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-bold">{u.name}</div>
                        <div className="text-xs text-slate-400">{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-8">{u.houseNumber}</td>
                  <td className="py-4 px-8 text-center">
                    <span className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full ${
                      u.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="py-4 px-8 text-right">
                    {u.status === 'approved' ? (
                      <button 
                        onClick={() => handleUpdateStatus(u.username, 'rejected')}
                        className="text-xs font-bold text-rose-500 hover:underline"
                      >
                        Non-aktifkan
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleUpdateStatus(u.username, 'approved')}
                        className="text-xs font-bold text-brand-primary hover:underline"
                      >
                        Aktifkan
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

const ResetPasswordContent = ({ setActiveTab }: { setActiveTab: any; key?: string }) => {
  const [formData, setFormData] = useState({ username: '', houseNumber: '', newPassword: '' });
  const [msg, setMsg] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/reset-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const data = await res.json();
    if (data.error) setMsg(data.error);
    else {
      setMsg('Permintaan reset berhasil terkirim. Hubungi Admin untuk verifikasi.');
      setTimeout(() => setActiveTab('login'), 3000);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto">
      <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-2xl space-y-8">
        <h2 className="text-3xl font-bold text-center">Lupa Password</h2>
        <p className="text-sm text-slate-500 text-center">Sebutkan username dan No. Rumah Anda untuk meminta pergantian password.</p>
        <form onSubmit={handleReset} className="space-y-4">
          <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl" placeholder="Username / Email" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required />
          <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl" placeholder="Nomor Rumah (contoh: A1)" value={formData.houseNumber} onChange={e => setFormData({...formData, houseNumber: e.target.value})} required />
          <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl" type="password" placeholder="Password Baru" value={formData.newPassword} onChange={e => setFormData({...formData, newPassword: e.target.value})} required />
          {msg && <p className="text-brand-primary text-sm font-medium text-center">{msg}</p>}
          <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:shadow-lg transition-all">Minta Ganti Password</button>
        </form>
        <button onClick={() => setActiveTab('login')} className="w-full text-slate-500 text-sm">Kembali ke Login</button>
      </div>
    </motion.div>
  );
};

const DashboardContent = ({ user, financials, setFinancials, currentPage, totalPages, setPage }: { user: User | null; financials: Financial[]; setFinancials: any; currentPage: number; totalPages: number; setPage: (p: number) => void; key?: string }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ type: 'income', category: 'Iuran Bulanan', amount: 0, description: '', attachment: '' });
  const [isSaving, setIsSaving] = useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const fetchFinancials = async () => {
    const res = await fetch(`/api/financials?page=${currentPage}&limit=10`);
    const data = await res.json();
    if (data.financials) {
      setFinancials(data.financials);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, attachment: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleAdd = async () => {
    if (formData.amount <= 0) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/financials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        alert(data.pending ? 'Berhasil dikirim! Menunggu approval admin.' : 'Berhasil ditambahkan!');
        setFormData({ type: 'income', category: 'Iuran Bulanan', amount: 0, description: '', attachment: '' });
        setShowAdd(false);
        fetchFinancials();
      } else {
        alert(data.error || 'Terjadi kesalahan');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const totalBalance = financials.reduce((acc, curr) => acc + (curr.type === 'income' ? curr.amount : -curr.amount), 0);

  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-brand-primary text-white p-8 rounded-3xl shadow-xl shadow-brand-primary/20">
          <p className="text-sm opacity-80 uppercase tracking-wider font-bold">Total Saldo Kas</p>
          <h2 className="text-4xl font-bold mt-2">Rp {totalBalance.toLocaleString()}</h2>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Pemasukan</p>
            <h3 className="text-2xl font-bold mt-1 text-emerald-600">Rp {financials.filter(f => f.type === 'income').reduce((a, b) => a + b.amount, 0).toLocaleString()}</h3>
          </div>
          <ArrowUpRight className="text-emerald-500 w-10 h-10" />
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Pengeluaran</p>
            <h3 className="text-2xl font-bold mt-1 text-rose-600">Rp {financials.filter(f => f.type === 'expense').reduce((a, b) => a + b.amount, 0).toLocaleString()}</h3>
          </div>
          <ArrowDownRight className="text-rose-500 w-10 h-10" />
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold">Riwayat Keuangan</h3>
          <button onClick={() => setShowAdd(!showAdd)} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2">
            <Plus className="w-4 h-4" /> {user?.role === 'admin' ? 'Tambah Catatan' : 'Ajukan Transaksi'}
          </button>
        </div>

        {showAdd && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <div className="grid md:grid-cols-3 gap-4">
              <select className="p-3 bg-white border border-slate-200 rounded-xl" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                <option value="income">Pemasukan (Contoh: Iuran)</option>
                <option value="expense">Pengeluaran (Contoh: Beli Lampu)</option>
              </select>
              <input placeholder="Kategori" className="p-3 bg-white border border-slate-200 rounded-xl" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
              <input type="number" placeholder="Jumlah (Rp)" className="p-3 bg-white border border-slate-200 rounded-xl" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex gap-2 items-center">
                <input type="file" hidden ref={fileRef} onChange={handleFile} accept="image/*" />
                <button 
                  onClick={() => fileRef.current?.click()}
                  className={`flex-1 p-3 border rounded-xl text-xs font-bold transition-colors ${formData.attachment ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-500'}`}
                >
                  {formData.attachment ? 'Bukti Terpilih' : 'Upload Bukti Transfer/Bon'}
                </button>
                {formData.attachment && (
                  <button onClick={() => setFormData({...formData, attachment: ''})} className="text-rose-500"><X className="w-5 h-5" /></button>
                )}
              </div>
              <div className="flex gap-2">
                <input placeholder="Keterangan / Catatan" className="flex-1 p-3 bg-white border border-slate-200 rounded-xl" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                <button 
                  disabled={isSaving}
                  onClick={handleAdd} 
                  className="bg-brand-primary text-white px-6 rounded-xl font-bold hover:bg-brand-secondary disabled:opacity-50"
                >
                  {isSaving ? '...' : 'Kirim'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="py-4 px-2 font-bold text-slate-400 text-sm uppercase">Tanggal</th>
                <th className="py-4 px-2 font-bold text-slate-400 text-sm uppercase">Kategori</th>
                <th className="py-4 px-2 font-bold text-slate-400 text-sm uppercase text-center">Bukti</th>
                <th className="py-4 px-2 font-bold text-slate-400 text-sm uppercase">Keterangan</th>
                <th className="py-4 px-2 font-bold text-slate-400 text-sm uppercase text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {financials.map((f, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-4 px-2 text-sm">{f.date}</td>
                  <td className="py-4 px-2 font-medium">{f.category}</td>
                  <td className="py-4 px-2 text-center">
                    {f.attachment ? (
                      <a href={f.attachment} target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline text-xs font-bold">Lihat Bukti</a>
                    ) : '-'}
                  </td>
                  <td className="py-4 px-2 text-slate-500 text-sm">{f.description}</td>
                  <td className={`py-4 px-2 text-right font-bold ${f.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {f.type === 'income' ? '+' : '-'} Rp {f.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-end gap-2 pt-4">
            <button 
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              className="px-4 py-2 text-xs font-bold border rounded-lg disabled:opacity-30"
            >
              Prev
            </button>
            <span className="px-4 py-2 text-xs font-bold text-slate-500">Hal {currentPage} / {totalPages}</span>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="px-4 py-2 text-xs font-bold border rounded-lg disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const LoginContent = ({ setUser, setActiveTab }: { setUser: any; setActiveTab: any; key?: string }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.error) setError(data.error);
    else {
      setUser(data);
      setActiveTab('dashboard');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
      <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-2xl space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-bold">Portal Penghuni</h2>
          <p className="text-slate-500">Gunakan akun yang telah terdaftar di sistem.</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Username</label>
            <input 
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900/5 focus:outline-none" 
              placeholder="user@kiara"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Password</label>
            <input 
              type="password"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900/5 focus:outline-none" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}
          <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:shadow-lg transition-all active:scale-95">
            Masuk Sekarang
          </button>
        </form>
        <div className="text-center space-y-2">
          <p className="text-slate-500 text-sm">Belum terdaftar? <button onClick={() => setActiveTab('register')} className="text-brand-primary font-bold">Daftar sebagai penghuni baru</button></p>
          <p className="text-slate-400 text-xs"><button onClick={() => setActiveTab('reset-password')} className="hover:underline">Lupa Password?</button></p>
        </div>
      </div>
    </motion.div>
  );
};

const RegisterContent = ({ setActiveTab }: { setActiveTab: any; key?: string }) => {
  const [formData, setFormData] = useState({ username: '', password: '', name: '', houseNumber: '' });
  const [msg, setMsg] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const data = await res.json();
    if (data.error) setMsg(data.error);
    else {
      setMsg('Registrasi berhasil! Menunggu persetujuan admin.');
      setTimeout(() => setActiveTab('login'), 3000);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
      <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-2xl space-y-8">
        <h2 className="text-3xl font-bold text-center">Registrasi Penghuni</h2>
        <form onSubmit={handleRegister} className="space-y-4">
          <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl" placeholder="Nama Lengkap" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl" placeholder="Username / Email" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required />
          <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl" placeholder="No. Rumah" value={formData.houseNumber} onChange={e => setFormData({...formData, houseNumber: e.target.value})} required />
          <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl" type="password" placeholder="Password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
          {msg && <p className="text-brand-primary text-sm font-medium text-center">{msg}</p>}
          <button type="submit" className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold">Ajukan Pendaftaran</button>
        </form>
        <button onClick={() => setActiveTab('login')} className="w-full text-slate-500 text-sm">Kembali ke Login</button>
      </div>
    </motion.div>
  );
};

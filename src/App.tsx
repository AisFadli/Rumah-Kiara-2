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
  Video,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from '@google/genai';

// --- Gemini Safety Check ---
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

async function checkContentSafety(content: string, mediaUrl?: string): Promise<{ safe: boolean; reason?: string }> {
  try {
    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this social media post for a residential cluster community. 
      Content: ${content}
      Media URL: ${mediaUrl || "None"}
      
      Is this appropriate? Avoid hate speech, explicit content, or illegal activities. 
      Respond ONLY in JSON format: {"safe": true/false, "reason": "short explanation if unsafe"}`,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);
    return { safe: data.safe ?? true, reason: data.reason };
  } catch (e) {
    console.error('Safety check error:', e);
    return { safe: true }; 
  }
}

// --- Types ---
interface User {
  username: string;
  name: string;
  role: 'resident' | 'admin';
  houseNumber: string;
  profilePic?: string;
}

interface Post {
  id: number;
  author: string;
  authorProfilePic?: string;
  content: string;
  imageUrl?: string;
  visibility?: 'public' | 'resident';
  likes: number;
  createdAt: string;
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
  id?: number;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
  description: string;
  addedBy: string;
  proofUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedBy?: string;
}

interface UserData {
  username: string;
  name: string;
  houseNumber: string;
  status: 'pending' | 'approved' | 'rejected' | 'reset_requested';
  role: string;
  profilePic?: string;
  createdAt: string;
}

// --- Components ---

const Pagination = ({ totalItems, itemsPerPage, currentPage, onPageChange }: { totalItems: number, itemsPerPage: number, currentPage: number, onPageChange: (p: number) => void }) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button 
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="px-4 py-2 text-sm font-bold bg-white border border-slate-200 rounded-xl disabled:opacity-50"
      >
        Prev
      </button>
      <span className="text-sm font-bold text-slate-500">Halaman {currentPage} dari {totalPages}</span>
      <button 
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="px-4 py-2 text-sm font-bold bg-white border border-slate-200 rounded-xl disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
};

const Navbar = ({ user, onLogout, setActiveTab, activeTab }: { user: User | null; onLogout: () => void; setActiveTab: (t: string) => void; activeTab: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'activities', label: 'Kegiatan', icon: Calendar },
    { id: 'feed', label: 'Feed', icon: ImageIcon },
  ];

  if (user) {
    navItems.push({ id: 'dashboard', label: 'Kas & Keuangan', icon: Wallet });
    if (user.role === 'admin') {
      navItems.push({ id: 'admin', label: 'Panel Admin', icon: LayoutDashboard });
    }
  } else {
    navItems.push({ id: 'login', label: 'Login Penghuni', icon: Users });
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
              <div className="flex items-center gap-4 pl-4 border-l border-slate-200">
                <button 
                  onClick={() => setActiveTab('profile')}
                  className={`flex items-center gap-2 transition-opacity hover:opacity-80 ${activeTab === 'profile' ? 'text-brand-primary' : 'text-slate-600'}`}
                >
                  {user.profilePic ? (
                    <img src={user.profilePic} className="w-8 h-8 rounded-full object-cover border border-slate-200" alt="Avatar" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-xs">
                      {user.name[0]}
                    </div>
                  )}
                  <span className="font-bold text-sm hidden lg:block">{user.name ? user.name.split(' ')[0] : ''}</span>
                </button>
                <button onClick={onLogout} className="text-slate-400 hover:text-red-500 transition-colors">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
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
  const [targetPostId, setTargetPostId] = useState<number | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [financials, setFinancials] = useState<Financial[]>([]);
  const [residentCount, setResidentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Auth State
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data && !data.error) setUser(data);
      })
      .catch(err => {
        console.warn('Auth session check failed or user not logged in:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Fetch Public Data
  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.ok ? res.json() : { residentCount: 0 })
      .then(data => setResidentCount(data?.residentCount || 0))
      .catch(() => setResidentCount(0));
    
    if (activeTab === 'feed' || activeTab === 'home') {
      fetch('/api/posts')
        .then(res => res.ok ? res.json() : [])
        .then(data => Array.isArray(data) ? setPosts(data) : setPosts([]))
        .catch(() => setPosts([]));
    }
    if (activeTab === 'activities' || activeTab === 'home') {
      fetch('/api/activities')
        .then(res => res.ok ? res.json() : [])
        .then(data => Array.isArray(data) ? setActivities(data) : setActivities([]))
        .catch(() => setActivities([]));
    }
    if (activeTab === 'dashboard' && user) {
      fetch('/api/financials')
        .then(res => res.ok ? res.json() : [])
        .then(data => Array.isArray(data) ? setFinancials(data) : setFinancials([]))
        .catch(() => setFinancials([]));
    }
  }, [activeTab, user]);

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
          {activeTab === 'home' && <HomeContent key="home" activities={activities} posts={posts} residentCount={residentCount} setActiveTab={setActiveTab} setTargetPostId={setTargetPostId} />}
          {activeTab === 'profile' && <ProfileContent key="profile" user={user} setUser={setUser} />}
          {activeTab === 'activities' && (
            <ActivitiesContent 
              key="activities" 
              activities={activities} 
              user={user} 
              onAddSuccess={() => {
                fetch('/api/activities').then(res => res.json()).then(data => setActivities(data));
              }}
            />
          )}
          {activeTab === 'feed' && <FeedContent key="feed" posts={posts} user={user} setPosts={setPosts} targetPostId={targetPostId} setTargetPostId={setTargetPostId} />}
          {activeTab === 'login' && <LoginContent key="login" setUser={setUser} setActiveTab={setActiveTab} />}
          {activeTab === 'dashboard' && <DashboardContent key="dashboard" user={user} financials={financials} setFinancials={setFinancials} />}
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

const HomeContent: React.FC<{ activities: Activity[]; posts: Post[]; residentCount: number; setActiveTab: (t: string) => void; setTargetPostId: (id: number) => void }> = ({ activities, posts, residentCount, setActiveTab, setTargetPostId }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;
  
  const handlePostClick = (postId: number) => {
    setTargetPostId(postId);
    setActiveTab('feed');
  };

  const paginatedPosts = posts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
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
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Kegiatan Mendatang</h2>
            <Calendar className="text-brand-primary" />
          </div>
          <div className="space-y-4">
            {activities.slice(0, 3).map((act, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <span className="text-brand-primary font-bold text-sm">{act.date}</span>
                <h3 className="text-lg font-bold mt-1">{act.title}</h3>
                <p className="text-slate-600 text-sm mt-2 line-clamp-2">{act.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Update Warga</h2>
            <ImageIcon className="text-brand-primary" />
          </div>
          <div className="space-y-4">
            {paginatedPosts.map((post, i) => (
              <button 
                key={i} 
                onClick={() => handlePostClick(post.id)}
                className="w-full text-left bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden"
              >
                <div className="flex gap-4">
                  {post.imageUrl && (
                    <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-slate-50">
                      <img src={post.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-brand-primary uppercase truncate">{post.author}</span>
                        <span className="text-[10px] text-slate-400">{new Date(post.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-slate-700 line-clamp-2 leading-relaxed">
                        {post.content}
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            ))}
            
            <Pagination 
              totalItems={posts.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />

            <button 
              onClick={() => setActiveTab('feed')}
              className="w-full py-3 text-center text-xs font-bold text-slate-400 hover:text-brand-primary transition-colors bg-slate-50 rounded-xl border border-dashed border-slate-200"
            >
              Lihat Semua Postingan
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const ActivitiesContent: React.FC<{ activities: Activity[]; user: User | null; onAddSuccess: () => void }> = ({ activities, user, onAddSuccess }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', date: '', location: '', pic: '', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Safety Check
    if (user?.role !== 'admin') {
      const safety = await checkContentSafety(`${formData.title} ${formData.description}`);
      if (!safety.safe) {
        setError(`Konten ditolak AI: ${safety.reason}`);
        setIsSubmitting(false);
        return;
      }
    }

    const res = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Gagal menyimpan kegiatan.');
      setIsSubmitting(false);
      return;
    }
    setFormData({ title: '', description: '', date: '', location: '', pic: '', phone: '' });
    setShowAdd(false);
    setIsSubmitting(false);
    onAddSuccess();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus kegiatan ini?')) return;
    await fetch(`/api/activities/${id}`, { method: 'DELETE' });
    onAddSuccess();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">Kegiatan & Acara</h2>
        <p className="text-slate-600">Jadwal kegiatan rutin dan khusus di cluster Rumah Kiara 2.</p>
        <div className="flex gap-4 justify-center">
          {user && (
            <button 
              onClick={() => setShowAdd(!showAdd)}
              className="mt-4 bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:shadow-lg transition-all"
            >
              {showAdd ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {showAdd ? 'Batal' : 'Tambah Kegiatan'}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-4 mb-8">
              <h3 className="text-xl font-bold mb-4">Buat Jadwal Baru</h3>
              {error && <div className="p-4 bg-rose-50 text-rose-600 rounded-xl text-sm font-medium">{error}</div>}
              <input 
                placeholder="Judul Kegiatan" 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                required
              />
              <textarea 
                placeholder="Deskripsi Kegiatan" 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl resize-none"
                rows={3}
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="date" 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                  required
                />
                <input 
                  placeholder="Lokasi" 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl"
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input 
                  placeholder="PIC (Penanggung Jawab)" 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl"
                  value={formData.pic}
                  onChange={e => setFormData({...formData, pic: e.target.value})}
                  required
                />
                <input 
                  placeholder="No. Telpon" 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold hover:bg-brand-secondary transition-colors"
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan Kegiatan'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        {activities.map((act, i) => (
          <div key={act.id || i} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex gap-6 items-start hover:shadow-md transition-shadow relative group">
            <div className="bg-brand-primary/10 text-brand-primary p-4 rounded-2xl shrink-0">
              <Calendar className="w-8 h-8" />
            </div>
            <div className="space-y-4 flex-1">
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-bold">{act.title}</h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold px-3 py-1 bg-slate-100 rounded-full">{act.date}</span>
                  {user?.role === 'admin' && (
                    <button 
                      onClick={() => handleDelete(act.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-slate-500">{act.description}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Info className="w-4 h-4 text-brand-primary" />
                  <span>Lokasi: <span className="font-medium">{act.location}</span></span>
                </div>
                {act.pic && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Users className="w-4 h-4 text-brand-primary" />
                    <span>PIC: <span className="font-medium">{act.pic}</span> ({act.phone})</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {activities.length === 0 && <p className="text-center text-slate-400 py-12">Belum ada kegiatan terencana.</p>}
      </div>
    </motion.div>
  );
};

const PostCard: React.FC<{ post: Post; user: User | null; onDelete: (id: number) => void }> = ({ post, user, onDelete }) => {
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

  const isVideo = post.imageUrl && (post.imageUrl.includes('youtube.com') || post.imageUrl.includes('youtu.be') || post.imageUrl.match(/\.(mp4|webm|ogg)$/i));

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  return (
    <div id={`post-${post.id}`} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden relative group">
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            {post.authorProfilePic ? (
              <img src={post.authorProfilePic} className="w-10 h-10 rounded-full object-cover border border-slate-100" alt="" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold uppercase">
                {post.author[0]}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900">{post.author}</h4>
                {post.visibility === 'resident' && (
                  <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded-full font-bold">Hanya Penghuni</span>
                )}
              </div>
              <p className="text-xs text-slate-400">{new Date(post.createdAt).toLocaleString()}</p>
            </div>
          </div>
          {user?.role === 'admin' && (
            <button 
              onClick={() => onDelete(post.id)}
              className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <p className="text-slate-700 leading-relaxed">{post.content}</p>
      </div>
      {post.imageUrl && !isVideo && (
        <img src={post.imageUrl} alt="Post content" className="w-full object-cover max-h-[500px]" />
      )}
      {post.imageUrl && isVideo && (
        <div className="w-full aspect-video">
          {post.imageUrl.includes('youtube.com') || post.imageUrl.includes('youtu.be') ? (
            <iframe 
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${getYoutubeId(post.imageUrl)} text-center`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          ) : (
            <video controls className="w-full h-full bg-black">
              <source src={post.imageUrl} />
            </video>
          )}
        </div>
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

const FeedContent: React.FC<{ posts: Post[]; user: User | null; setPosts: any; targetPostId?: number | null; setTargetPostId?: (id: number | null) => void }> = ({ posts, user, setPosts, targetPostId, setTargetPostId }) => {
  const [newContent, setNewContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'resident'>('public');
  const [isPosting, setIsPosting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (targetPostId && posts.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`post-${targetPostId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight effect
          el.classList.add('ring-4', 'ring-brand-primary/20');
          setTimeout(() => el.classList.remove('ring-4', 'ring-brand-primary/20'), 2000);
          if (setTargetPostId) setTargetPostId(null);
        }
      }, 100);
    }
  }, [targetPostId, posts]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin'
      });
      
      const contentType = res.headers.get('content-type');
      if (!res.ok) {
        let errorMsg = 'Upload failed';
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          errorMsg = data.error || data.detail || errorMsg;
        } else {
          const text = await res.text();
          console.error('Non-JSON error response:', text.substring(0, 200));
        }
        throw new Error(errorMsg);
      }

      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('Unexpected non-JSON response:', text.substring(0, 200));
        throw new Error('Server returned invalid response format.');
      }

      const data = await res.json();
      if (data.url) {
        setMediaUrl(data.url.startsWith('http') ? data.url : `${window.location.origin}${data.url}`);
      }
    } catch (error: any) {
      console.error('Upload failed', error);
      setError(error.message || 'Gagal mengunggah file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePost = async () => {
    if (!newContent.trim()) return;
    setIsPosting(true);
    setError('');

    // Safety Check
    if (user?.role !== 'admin') {
      const safety = await checkContentSafety(newContent, mediaUrl);
      if (!safety.safe) {
        setError(`Konten ditolak AI: ${safety.reason}`);
        setIsPosting(false);
        return;
      }
    }

    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newContent, imageUrl: mediaUrl, visibility })
    });
    
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Gagal mengirim postingan.');
      setIsPosting(false);
      return;
    }

    setNewContent('');
    setMediaUrl('');
    const refreshRes = await fetch('/api/posts');
    const data = await refreshRes.json();
    if (Array.isArray(data)) setPosts(data);
    setIsPosting(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus postingan ini?')) return;
    await fetch(`/api/posts/${id}`, { method: 'DELETE' });
    const refreshRes = await fetch('/api/posts');
    const data = await refreshRes.json();
    if (Array.isArray(data)) setPosts(data);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      {user && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg space-y-4">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold shrink-0">
              {user.name[0]}
            </div>
            <textarea
              placeholder="Bagikan momen, foto, atau video info cluster..."
              className="w-full p-4 bg-slate-50 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              rows={3}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
            />
          </div>
          {error && <div className="p-4 bg-rose-50 text-rose-600 rounded-xl text-sm font-medium">{error}</div>}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="cursor-pointer flex items-center gap-2 text-slate-600 hover:bg-slate-100 transition-colors bg-slate-50 px-4 py-2 rounded-xl text-sm font-medium border border-slate-100">
                <ImageIcon className="w-4 h-4" />
                <span>{isUploading ? 'Mengunggah...' : 'Upload Foto'}</span>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileUpload} 
                  disabled={isUploading} 
                />
              </label>

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-1 rounded-xl">
                <button 
                  onClick={() => setVisibility('public')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${visibility === 'public' ? 'bg-white shadow-sm text-brand-primary' : 'text-slate-400'}`}
                >
                  Publik
                </button>
                <button 
                  onClick={() => setVisibility('resident')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${visibility === 'resident' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400'}`}
                >
                  Hanya Penghuni
                </button>
              </div>

              {mediaUrl && (
                <div className="flex-1 flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-lg border border-emerald-100 overflow-hidden">
                  <span className="font-bold shrink-0">Media Ready:</span>
                  <span className="truncate opacity-70">{mediaUrl}</span>
                  <button onClick={() => setMediaUrl('')} className="ml-auto text-emerald-900 font-bold px-2">X</button>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-50">
              <div className="flex items-center gap-2 text-slate-400 text-xs px-2 mb-2">
                <Video className="w-3 h-3" />
                <span>Atau masukkan Link Video (YouTube/Direct)</span>
              </div>
              <input 
                type="text" 
                placeholder="Contoh: https://youtube.com/watch?v=..." 
                className="w-full text-sm p-4 rounded-xl bg-slate-50 border border-slate-100"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handlePost}
                disabled={isPosting || isUploading || !newContent}
                className="bg-brand-primary text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-brand-secondary transition-all disabled:opacity-50 disabled:grayscale"
              >
                <Plus className="w-4 h-4" />
                {isPosting ? 'Posting...' : 'Posting Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}

      {!user && (
        <div className="bg-slate-100 p-4 rounded-xl text-center text-sm text-slate-500">
          Hanya penghuni yang dapat memposting foto dan komentar.
        </div>
      )}

      <div className="space-y-8">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} user={user} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
};

const ProfileContent: React.FC<{ user: User | null; setUser: (u: User | null) => void }> = ({ user, setUser }) => {
  const [name, setName] = useState(user?.name || '');
  const [houseNumber, setHouseNumber] = useState(user?.houseNumber || '');
  const [profilePic, setProfilePic] = useState(user?.profilePic || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setMsg({ text: '', type: '' });
    
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, houseNumber, profilePic })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUser(data);
      setMsg({ text: 'Profil berhasil diperbarui!', type: 'success' });
    } catch (err: any) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setMsg({ text: '', type: '' });
    
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg({ text: 'Password berhasil diganti!', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) setProfilePic(data.url.startsWith('http') ? data.url : `${window.location.origin}${data.url}`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  if (!user) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="h-32 bg-slate-900"></div>
        <div className="px-8 pb-8">
          <div className="relative -mt-16 mb-6 flex flex-col md:flex-row md:items-end gap-6">
            <div className="relative group">
              {profilePic ? (
                <img src={profilePic} className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg" alt="" />
              ) : (
                <div className="w-32 h-32 rounded-full bg-slate-100 flex items-center justify-center text-4xl font-bold text-slate-300 border-4 border-white shadow-lg">
                  {user.name[0]}
                </div>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="text-white w-8 h-8" />
                <input type="file" className="hidden" accept="image/*" onChange={handlePicUpload} disabled={isUploading} />
              </label>
            </div>
            <div className="flex-1 space-y-1">
              <h2 className="text-2xl font-bold text-slate-900">{user.name}</h2>
              <p className="text-slate-500 font-medium">Penghuni Rumah {user.houseNumber}</p>
            </div>
          </div>

          {msg.text && (
            <div className={`p-4 rounded-xl mb-6 text-sm font-bold ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {msg.text}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-12">
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <h3 className="font-bold text-lg border-b border-slate-100 pb-2">Informasi Profil</h3>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Nama Lengkap</label>
                <input className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Nomor Rumah</label>
                <input className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl" value={houseNumber} onChange={e => setHouseNumber(e.target.value)} />
              </div>
              <button disabled={isUpdating || isUploading} className="bg-brand-primary text-white w-full py-3 rounded-xl font-bold hover:bg-brand-secondary transition-colors">
                {isUpdating ? 'Menyimpan...' : 'Update Profil'}
              </button>
            </form>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <h3 className="font-bold text-lg border-b border-slate-100 pb-2">Ganti Password</h3>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Password Sekarang</label>
                <input type="password" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Password Baru</label>
                <input type="password" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
              </div>
              <button disabled={isUpdating} className="bg-slate-900 text-white w-full py-3 rounded-xl font-bold hover:shadow-lg transition-all">
                Update Password
              </button>
            </form>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const AdminContent: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
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

  const fetchUsers = async () => {
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    if (Array.isArray(data)) setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateStatus = async (username: string, status: string) => {
    await fetch('/api/admin/users/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, status })
    });
    fetchUsers();
  };

  if (loading) return <div>Loading...</div>;
  
  const pendingUsers = users.filter(u => u.status === 'pending');
  const resetRequests = users.filter(u => u.status === 'reset_requested');
  const otherUsers = users.filter(u => u.status !== 'pending' && u.status !== 'reset_requested');
  
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
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
                      {u.profilePic ? (
                        <img src={u.profilePic} className="w-10 h-10 rounded-full object-cover border border-slate-100" alt="" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-xs">
                          {u.name[0]}
                        </div>
                      )}
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

const ResetPasswordContent: React.FC<{ setActiveTab: any }> = ({ setActiveTab }) => {
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

const DashboardContent: React.FC<{ user: User | null; financials: Financial[]; setFinancials: any }> = ({ user, financials, setFinancials }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ type: 'income', category: 'Iuran Bulanan', amount: 0, description: '', proofUrl: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const itemsPerPage = 8;
  const [msg, setMsg] = useState({ text: '', type: '' });

  const handleAdd = async () => {
    if (formData.amount <= 0) return setMsg({ text: 'Jumlah harus lebih dari 0', type: 'error' });
    setIsSubmitting(true);
    setMsg({ text: '', type: '' });
    
    try {
      const res = await fetch('/api/financials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Gagal menyimpan catatan');
      
      setShowAdd(false);
      setFormData({ type: 'income', category: 'Iuran Bulanan', amount: 0, description: '', proofUrl: '' });
      setMsg({ text: user?.role === 'admin' ? 'Catatan berhasil disimpan!' : 'Catatan terkirim dan menunggu approval.', type: 'success' });
      
      const refresh = await fetch('/api/financials');
      setFinancials(await refresh.json());
    } catch (err: any) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      const res = await fetch('/api/admin/financials/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) {
        const refresh = await fetch('/api/financials');
        setFinancials(await refresh.json());
      }
    } catch (err) { console.error(err); }
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.url) setFormData({ ...formData, proofUrl: data.url.startsWith('http') ? data.url : `${window.location.origin}${data.url}` });
    } catch (err) { console.error(err); }
    finally { setIsUploading(false); }
  };

  // Only count approved items for balance stats
  const approvedItems = financials.filter(f => f.status === 'approved');
  const totalBalance = approvedItems.reduce((acc, curr) => acc + (curr.type === 'income' ? curr.amount : -curr.amount), 0);
  const monthlyIncome = approvedItems.filter(f => f.type === 'income').reduce((a, b) => a + b.amount, 0);
  const monthlyExpense = approvedItems.filter(f => f.type === 'expense').reduce((a, b) => a + b.amount, 0);

  const paginatedFinancials = financials.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-8">
      {msg.text && (
        <div className={`p-4 rounded-2xl text-sm font-bold flex items-center gap-2 ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          <Info className="w-4 h-4" />
          {msg.text}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-brand-primary text-white p-8 rounded-3xl shadow-xl shadow-brand-primary/20">
          <p className="text-sm opacity-80 uppercase tracking-wider font-bold">Total Saldo Kas</p>
          <h2 className="text-4xl font-bold mt-2">Rp {totalBalance.toLocaleString()}</h2>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Pemasukan (Total Approved)</p>
            <h3 className="text-2xl font-bold mt-1 text-emerald-600">Rp {monthlyIncome.toLocaleString()}</h3>
          </div>
          <ArrowUpRight className="text-emerald-500 w-10 h-10" />
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Pengeluaran (Total Approved)</p>
            <h3 className="text-2xl font-bold mt-1 text-rose-600">Rp {monthlyExpense.toLocaleString()}</h3>
          </div>
          <ArrowDownRight className="text-rose-500 w-10 h-10" />
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold">Riwayat Keuangan</h3>
            <p className="text-xs text-slate-400 mt-1">Laporan transparansi keuangan warga Kiara 2</p>
          </div>
          {user && (
            <button onClick={() => setShowAdd(!showAdd)} className={`px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${showAdd ? 'bg-slate-100 text-slate-600' : 'bg-slate-900 text-white shadow-lg'}`}>
              {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showAdd ? 'Batal' : user.role === 'admin' ? 'Tambah Catatan' : 'Bayar/Klaim Kas'}
            </button>
          )}
        </div>

        <AnimatePresence>
          {showAdd && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Jenis</label>
                  <select className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                    <option value="income">Pemasukan / Iuran</option>
                    <option value="expense">Pengeluaran / Klaim</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Kategori</label>
                  <input placeholder="Contoh: Iuran Keamanan" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Jumlah (Rp)</label>
                  <input type="number" placeholder="0" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Lampirkan Bukti</label>
                  <label className={`w-full p-3 bg-white border border-slate-200 rounded-xl text-sm flex items-center gap-2 cursor-pointer transition-colors ${formData.proofUrl ? 'border-emerald-500 text-emerald-600' : 'hover:border-slate-300'}`}>
                    <Camera className="w-4 h-4" />
                    <span className="truncate">{isUploading ? 'Uploading...' : formData.proofUrl ? 'Bukti Ada' : 'Hanya Foto/PDF'}</span>
                    <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleProofUpload} disabled={isUploading} />
                  </label>
                </div>
                <div className="md:col-span-2 lg:col-span-3 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Keterangan</label>
                  <input placeholder="Contoh: Pembayaran iuran bulan Mei" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>
                <div className="flex items-end">
                  <button onClick={handleAdd} disabled={isSubmitting || isUploading || formData.amount <= 0} className="w-full h-[46px] bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-secondary transition-all disabled:opacity-50">
                    {isSubmitting ? 'Mengirim...' : 'Simpan Transaksi'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="py-4 px-2 font-bold text-slate-400 text-[10px] uppercase">Tanggal</th>
                <th className="py-4 px-2 font-bold text-slate-400 text-[10px] uppercase">Kategori</th>
                <th className="py-4 px-2 font-bold text-slate-400 text-[10px] uppercase">Keterangan</th>
                <th className="py-4 px-2 font-bold text-slate-400 text-[10px] uppercase">Bukti</th>
                <th className="py-4 px-2 font-bold text-slate-400 text-[10px] uppercase text-center">Status</th>
                <th className="py-4 px-2 font-bold text-slate-400 text-[10px] uppercase text-right">Jumlah</th>
                {user?.role === 'admin' && <th className="py-4 px-2 font-bold text-slate-400 text-[10px] uppercase text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedFinancials.map((f, i) => (
                <tr key={i} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${f.status === 'pending' ? 'bg-amber-50/30' : ''}`}>
                  <td className="py-4 px-2 text-xs text-slate-400">{f.date}</td>
                  <td className="py-4 px-2">
                    <span className="font-bold text-sm text-slate-700 block">{f.category}</span>
                    <span className="text-[10px] text-slate-400 font-medium">Oleh: {f.addedBy}</span>
                  </td>
                  <td className="py-4 px-2 text-xs text-slate-600 max-w-[200px] truncate">{f.description}</td>
                  <td className="py-4 px-2">
                    {f.proofUrl ? (
                      <a href={f.proofUrl} target="_blank" rel="noreferrer" className="text-brand-primary hover:underline text-[10px] font-bold flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> Lihat
                      </a>
                    ) : '-'}
                  </td>
                  <td className="py-4 px-2 text-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      f.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      f.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {f.status}
                    </span>
                  </td>
                  <td className={`py-4 px-2 text-right font-bold text-sm ${f.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {f.type === 'income' ? '+' : '-'} Rp {f.amount.toLocaleString()}
                  </td>
                  {user?.role === 'admin' && (
                    <td className="py-4 px-2 text-right">
                      {f.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleStatusUpdate(f.id!, 'rejected')} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg">
                            <X className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleStatusUpdate(f.id!, 'approved')} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination 
          totalItems={financials.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

const LoginContent: React.FC<{ setUser: any; setActiveTab: any }> = ({ setUser, setActiveTab }) => {
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

const RegisterContent: React.FC<{ setActiveTab: any }> = ({ setActiveTab }) => {
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

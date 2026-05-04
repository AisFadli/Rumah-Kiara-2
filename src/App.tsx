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
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
interface User {
  username: string;
  name: string;
  role: 'resident' | 'admin';
}

interface Post {
  id: number;
  author: string;
  content: string;
  imageUrl?: string;
  likes: number;
  createdAt: string;
}

interface Activity {
  title: string;
  description: string;
  date: string;
  location: string;
}

interface Financial {
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
  description: string;
  addedBy: string;
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
  const [activities, setActivities] = useState<Activity[]>([]);
  const [financials, setFinancials] = useState<Financial[]>([]);
  const [residentCount, setResidentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Auth State
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data) setUser(data);
        setLoading(false);
      });
  }, []);

  // Fetch Public Data
  useEffect(() => {
    fetch('/api/stats').then(res => res.json()).then(data => setResidentCount(data.residentCount || 0));
    
    if (activeTab === 'feed' || activeTab === 'home') {
      fetch('/api/posts')
        .then(res => res.json())
        .then(data => Array.isArray(data) ? setPosts(data) : setPosts([]));
    }
    if (activeTab === 'activities' || activeTab === 'home') {
      fetch('/api/activities')
        .then(res => res.json())
        .then(data => Array.isArray(data) ? setActivities(data) : setActivities([]));
    }
    if (activeTab === 'dashboard' && user) {
      fetch('/api/financials')
        .then(res => res.json())
        .then(data => Array.isArray(data) ? setFinancials(data) : setFinancials([]));
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
          {activeTab === 'home' && <HomeContent key="home" activities={activities} posts={posts} residentCount={residentCount} />}
          {activeTab === 'activities' && <ActivitiesContent key="activities" activities={activities} />}
          {activeTab === 'feed' && <FeedContent key="feed" posts={posts} user={user} setPosts={setPosts} />}
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

    <div className="grid md:grid-cols-2 gap-8">
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
              <p className="text-slate-600 text-sm mt-2">{act.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Update Warga</h2>
          <ImageIcon className="text-brand-primary" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {posts.filter(p => p.imageUrl).slice(0, 4).map((p, i) => (
            <div key={i} className="aspect-square relative rounded-2xl overflow-hidden group">
              <img src={p.imageUrl} alt="Warga" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <span className="text-white text-xs font-bold">{p.author}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </motion.div>
);

const ActivitiesContent = ({ activities }: { activities: Activity[]; key?: string }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-8">
    <div className="text-center space-y-4">
      <h2 className="text-3xl font-bold">Kegiatan & Acara</h2>
      <p className="text-slate-600">Jadwal kegiatan rutin dan khusus di cluster Rumah Kiara 2.</p>
    </div>
    <div className="space-y-6">
      {activities.map((act, i) => (
        <div key={i} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl flex gap-6 items-start">
          <div className="bg-brand-primary/10 text-brand-primary p-4 rounded-2xl shrink-0">
            <Calendar className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-bold">{act.title}</h3>
              <span className="text-xs font-bold px-3 py-1 bg-slate-100 rounded-full">{act.date}</span>
            </div>
            <p className="text-slate-500">{act.description}</p>
            <div className="pt-4 flex items-center gap-2 text-sm text-slate-400">
              <Info className="w-4 h-4" />
              <span>Lokasi: {act.location}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  </motion.div>
);

const PostCard = ({ post, user, key }: { post: Post; user: User | null; key?: any }) => {
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
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
            {post.author[0]}
          </div>
          <div>
            <h4 className="font-bold text-slate-900">{post.author}</h4>
            <p className="text-xs text-slate-400">{new Date(post.createdAt).toLocaleString()}</p>
          </div>
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

const FeedContent = ({ posts, user, setPosts }: { posts: Post[]; user: User | null; setPosts: any; key?: string }) => {
  const [newContent, setNewContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const handlePost = async () => {
    if (!newContent.trim()) return;
    setIsPosting(true);
    await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newContent, imageUrl })
    });
    setNewContent('');
    setImageUrl('');
    const res = await fetch('/api/posts');
    const data = await res.json();
    if (Array.isArray(data)) setPosts(data);
    setIsPosting(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {user && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg space-y-4">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold">
              {user.name[0]}
            </div>
            <textarea
              placeholder="Bagikan momen atau info cluster..."
              className="w-full p-4 bg-slate-50 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              rows={3}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <input 
              type="text" 
              placeholder="Image URL (optional)" 
              className="text-sm p-2 rounded-lg bg-slate-50 border border-slate-100"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            <button
              onClick={handlePost}
              disabled={isPosting}
              className="bg-brand-primary text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-brand-secondary transition-colors"
            >
              <Plus className="w-4 h-4" />
              {isPosting ? 'Posting...' : 'Post'}
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
          <PostCard key={post.id} post={post} user={user} />
        ))}
      </div>
    </div>
  );
};

const AdminContent = ({ key }: { key?: string }) => {
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
                    <div className="font-bold">{u.name}</div>
                    <div className="text-xs text-slate-400">{u.username}</div>
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

const DashboardContent = ({ user, financials, setFinancials }: { user: User | null; financials: Financial[]; setFinancials: any; key?: string }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ type: 'income', category: 'Iuran Bulanan', amount: 0, description: '' });

  const handleAdd = async () => {
    await fetch('/api/financials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    setShowAdd(false);
    const res = await fetch('/api/financials');
    setFinancials(await res.json());
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
            <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Pemasukan (Bulan ini)</p>
            <h3 className="text-2xl font-bold mt-1 text-emerald-600">Rp {financials.filter(f => f.type === 'income').reduce((a, b) => a + b.amount, 0).toLocaleString()}</h3>
          </div>
          <ArrowUpRight className="text-emerald-500 w-10 h-10" />
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Pengeluaran (Bulan ini)</p>
            <h3 className="text-2xl font-bold mt-1 text-rose-600">Rp {financials.filter(f => f.type === 'expense').reduce((a, b) => a + b.amount, 0).toLocaleString()}</h3>
          </div>
          <ArrowDownRight className="text-rose-500 w-10 h-10" />
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold">Riwayat Keuangan</h3>
          {user?.role === 'admin' && (
            <button onClick={() => setShowAdd(!showAdd)} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2">
              <Plus className="w-4 h-4" /> Tambah Catatan
            </button>
          )}
        </div>

        {showAdd && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="grid md:grid-cols-4 gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <select className="p-3 bg-white border border-slate-200 rounded-xl" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
              <option value="income">Pemasukan</option>
              <option value="expense">Pengeluaran</option>
            </select>
            <input placeholder="Kategori" className="p-3 bg-white border border-slate-200 rounded-xl" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
            <input type="number" placeholder="Jumlah" className="p-3 bg-white border border-slate-200 rounded-xl" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} />
            <div className="flex gap-2">
              <input placeholder="Keterangan" className="flex-1 p-3 bg-white border border-slate-200 rounded-xl" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              <button onClick={handleAdd} className="bg-brand-primary text-white px-4 rounded-xl font-bold hover:bg-brand-secondary">Simpan</button>
            </div>
          </motion.div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="py-4 px-2 font-bold text-slate-400 text-sm uppercase">Tanggal</th>
                <th className="py-4 px-2 font-bold text-slate-400 text-sm uppercase">Kategori</th>
                <th className="py-4 px-2 font-bold text-slate-400 text-sm uppercase">Keterangan</th>
                <th className="py-4 px-2 font-bold text-slate-400 text-sm uppercase text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {financials.map((f, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-4 px-2 text-sm">{f.date}</td>
                  <td className="py-4 px-2 font-medium">{f.category}</td>
                  <td className="py-4 px-2 text-slate-500">{f.description}</td>
                  <td className={`py-4 px-2 text-right font-bold ${f.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {f.type === 'income' ? '+' : '-'} Rp {f.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  // Google Sheets Auth
  const getPrivateKey = () => {
    let key = process.env.GOOGLE_PRIVATE_KEY;
    if (!key) return undefined;
    key = key.trim();
    if (key.startsWith('"') && key.endsWith('"')) { key = key.slice(1, -1); }
    return key.replace(/\\n/g, '\n');
  };

  const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: getPrivateKey(),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID || '', serviceAccountAuth);

  // Helper to get sheets
  const getSheet = async (title: string) => {
    await doc.loadInfo();
    let sheet = doc.sheetsByTitle[title];
    if (!sheet) {
      // Basic initialization for demonstration if sheet missing
      // In production, user should set up the sheet structure first
      throw new Error(`Sheet "${title}" not found. Please create it in your Google Spreadsheet.`);
    }
    return sheet;
  };

  // --- API Routes ---

  app.get('/api/health-check', async (req, res) => {
    try {
      if (!process.env.GOOGLE_SHEET_ID) throw new Error('SHEET_ID missing');
      await doc.loadInfo();
      res.json({ status: 'ok', title: doc.title });
    } catch (e: any) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  });

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, process.env.JWT_SECRET || 'secret', (err: any, user: any) => {
      if (err) return res.status(403).json({ error: 'Forbidden' });
      req.user = user;
      next();
    });
  };

  // Login
  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
      const sheet = await getSheet('Users');
      const rows = await sheet.getRows();
      const userRow = rows.find(r => r.get('username') === username);

      if (!userRow) return res.status(401).json({ error: 'Invalid credentials' });
      if (userRow.get('status') !== 'approved') return res.status(403).json({ error: 'Account pending approval' });

      const validPassword = await bcrypt.compare(password, userRow.get('password'));
      if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

      const token = jwt.sign({ 
        username: userRow.get('username'),
        name: userRow.get('name'),
        role: userRow.get('role') 
      }, process.env.JWT_SECRET || 'secret');

      res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' });
      res.json({ name: userRow.get('name'), role: userRow.get('role'), username: userRow.get('username') });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Register
  app.post('/api/auth/register', async (req, res) => {
    const { username, password, name, houseNumber } = req.body;
    try {
      const sheet = await getSheet('Users');
      const rows = await sheet.getRows();
      if (rows.some(r => r.get('username') === username)) {
        return res.status(400).json({ error: 'Username sudah terdaftar.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await sheet.addRow({
        username,
        password: hashedPassword,
        name,
        houseNumber,
        role: 'resident',
        status: 'pending',
        pendingPassword: '',
        createdAt: new Date().toISOString()
      });

      res.json({ success: true, message: 'Pendaftaran berhasil dikirim, menunggu persetujuan admin.' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Forgot Password Request
  app.post('/api/auth/reset-request', async (req, res) => {
    const { username, houseNumber, newPassword } = req.body;
    try {
      const sheet = await getSheet('Users');
      const rows = await sheet.getRows();
      const userRow = rows.find(r => r.get('username') === username && r.get('houseNumber') === houseNumber);

      if (!userRow) return res.status(404).json({ error: 'Data tidak ditemukan. Pastikan username dan nomor rumah benar.' });

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      userRow.set('pendingPassword', hashedNewPassword);
      userRow.set('status', 'reset_requested');
      await userRow.save();

      res.json({ success: true, message: 'Permintaan reset password telah dikirim ke Admin.' });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
  });

  app.get('/api/auth/me', (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.json(null);
    jwt.verify(token, process.env.JWT_SECRET || 'secret', (err: any, user: any) => {
      if (err) return res.json(null);
      res.json(user);
    });
  });

  // Feed / Posts
  app.get('/api/posts', async (req, res) => {
    try {
      const sheet = await getSheet('Posts');
      const rows = await sheet.getRows();
      res.json(rows.map(r => ({
        id: r.rowNumber,
        author: r.get('author'),
        content: r.get('content'),
        imageUrl: r.get('imageUrl'),
        likes: parseInt(r.get('likes') || '0'),
        createdAt: r.get('createdAt')
      })).reverse());
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/posts', authenticateToken, async (req: any, res) => {
    const { content, imageUrl } = req.body;
    try {
      const sheet = await getSheet('Posts');
      await sheet.addRow({
        author: req.user.name,
        content,
        imageUrl: imageUrl || '',
        likes: 0,
        createdAt: new Date().toISOString()
      });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Financials
  app.get('/api/financials', authenticateToken, async (req, res) => {
    try {
      const sheet = await getSheet('Financials');
      const rows = await sheet.getRows();
      res.json(rows.map(r => ({
        type: r.get('type'), // income/expense
        category: r.get('category'),
        amount: parseFloat(r.get('amount')),
        date: r.get('date'),
        description: r.get('description'),
        addedBy: r.get('addedBy')
      })).reverse());
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/financials', authenticateToken, async (req: any, res) => {
    const { type, category, amount, description, date } = req.body;
    try {
      const sheet = await getSheet('Financials');
      await sheet.addRow({
        type,
        category,
        amount,
        description,
        date: date || new Date().toISOString().split('T')[0],
        addedBy: req.user.name
      });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Activities
  app.get('/api/activities', async (req, res) => {
    try {
      const sheet = await getSheet('Activities');
      const rows = await sheet.getRows();
      res.json(rows.map(r => ({
        title: r.get('title'),
        description: r.get('description'),
        date: r.get('date'),
        location: r.get('location')
      })).reverse());
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Likes
  app.post('/api/posts/:id/like', authenticateToken, async (req: any, res) => {
    try {
      const sheet = await getSheet('Posts');
      const rows = await sheet.getRows();
      const postRow = rows.find(r => r.rowNumber === parseInt(req.params.id));
      if (!postRow) return res.status(404).json({ error: 'Post not found' });

      const currentLikes = parseInt(postRow.get('likes') || '0');
      postRow.set('likes', currentLikes + 1);
      await postRow.save();
      res.json({ success: true, likes: currentLikes + 1 });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Comments
  app.get('/api/posts/:id/comments', async (req, res) => {
    try {
      const sheet = await getSheet('Comments');
      const rows = await sheet.getRows();
      const comments = rows
        .filter(r => r.get('postId') === req.params.id)
        .map(r => ({
          author: r.get('author'),
          content: r.get('content'),
          createdAt: r.get('createdAt')
        }));
      res.json(comments);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/posts/:id/comments', authenticateToken, async (req: any, res) => {
    const { content } = req.body;
    try {
      const sheet = await getSheet('Comments');
      await sheet.addRow({
        postId: req.params.id,
        author: req.user.name,
        content,
        createdAt: new Date().toISOString()
      });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Admin: Get Users
  app.get('/api/admin/users', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    try {
      const sheet = await getSheet('Users');
      const rows = await sheet.getRows();
      res.json(rows.map(r => ({
        username: r.get('username'),
        name: r.get('name'),
        houseNumber: r.get('houseNumber'),
        status: r.get('status'),
        role: r.get('role'),
        createdAt: r.get('createdAt')
      })));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Admin: Update User Status
  app.post('/api/admin/users/status', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { username, status } = req.body;
    try {
      const sheet = await getSheet('Users');
      const rows = await sheet.getRows();
      const userRow = rows.find(r => r.get('username') === username);
      if (!userRow) return res.status(404).json({ error: 'User not found' });

      if (status === 'approved' && userRow.get('status') === 'reset_requested') {
        // If it was a reset request, apply the new password
        const newPass = userRow.get('pendingPassword');
        if (newPass) {
          userRow.set('password', newPass);
          userRow.set('pendingPassword', '');
        }
      }

      userRow.set('status', status);
      await userRow.save();
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Public Stats
  app.get('/api/stats', async (req, res) => {
    try {
      const sheet = await getSheet('Users');
      const rows = await sheet.getRows();
      const approvedCount = rows.filter(r => r.get('status') === 'approved').length;
      res.json({ residentCount: approvedCount });
    } catch (e: any) {
      res.json({ residentCount: 0 });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

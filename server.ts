import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

  // Google Sheets Auth
  const getPrivateKey = () => {
    let key = process.env.GOOGLE_PRIVATE_KEY;
    if (!key) return undefined;
    
    // Clean-up common formatting issues from .env or Secrets
    key = key.trim();
    if (key.startsWith("'") && key.endsWith("'")) { key = key.slice(1, -1); }
    if (key.startsWith('"') && key.endsWith('"')) { key = key.slice(1, -1); }
    
    // Convert escaped newlines back to actual newlines
    return key.replace(/\\n/g, '\n');
  };

  const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: getPrivateKey(),
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file'
    ],
  });

  const drive = google.drive({ version: 'v3', auth: serviceAccountAuth as any });
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

  async function deleteFromDrive(imageUrl: string) {
    if (!imageUrl || !imageUrl.includes('id=')) return;
    try {
      const fileId = imageUrl.split('id=')[1].split('&')[0];
      await drive.files.delete({ fileId });
    } catch (error) {
      console.error('Drive Delete Error:', error);
    }
  }

  async function checkImageSafety(base64Data: string): Promise<{ safe: boolean; reason?: string }> {
    if (!process.env.GEMINI_API_KEY) return { safe: true };
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const [header, data] = base64Data.split(',');
      const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
      
      const prompt = "Berperanlah sebagai moderator komunitas. Analisis gambar ini. Apakah layak dipublish di portal warga (family-friendly)? Tolak jika ada kekerasan, ketidaksopanan, konten dewasa, atau hal berbahaya. Jawab hanya: 'AMAN' atau 'TOLAK: [alasan singkat dalam Bahasa Indonesia]'.";
      const result = await model.generateContent([
        prompt,
        { inlineData: { data, mimeType: mime } }
      ]);
      const text = result.response.text().trim();
      if (text.toUpperCase().startsWith('AMAN')) return { safe: true };
      return { safe: false, reason: text.replace('TOLAK:', '').replace('REJECT:', '').trim() };
    } catch (error) {
      console.error('Safety Check Error:', error);
      return { safe: true }; // Fallback
    }
  }

  async function uploadToDrive(base64Data: string, fileName: string) {
    if (!base64Data || !base64Data.startsWith('data:')) return base64Data;

    try {
      const [header, data] = base64Data.split(',');
      const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
      const buffer = Buffer.from(data, 'base64');
      
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);

      const response = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [process.env.GOOGLE_DRIVE_FOLDER_ID || ''],
        },
        media: {
          mimeType: mime,
          body: stream,
        },
        fields: 'id',
      });

      const fileId = response.data.id;
      
      await drive.permissions.create({
        fileId: fileId!,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    } catch (error) {
      console.error('Drive Upload Error:', error);
      return '';
    }
  }



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
      console.error('Login Error:', e);
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
      console.error('Registration Error:', e);
      res.status(500).json({ error: `Server Error: ${e.message}` });
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

  app.get('/api/posts', async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;
      
      const postsSheet = await getSheet('Posts');
      const postsRows = await postsSheet.getRows();
      
      const usersSheet = await getSheet('Users');
      const usersRows = await usersSheet.getRows();
      const userMap = new Map();
      usersRows.forEach(r => userMap.set(r.get('name'), r.get('avatar')));

      let posts = postsRows.map(r => ({
        id: r.rowNumber,
        author: r.get('author'),
        authorAvatar: userMap.get(r.get('author')) || '',
        content: r.get('content'),
        imageUrl: r.get('imageUrl'),
        likes: parseInt(r.get('likes') || '0'),
        createdAt: r.get('createdAt'),
        isPublic: r.get('isPublic') === 'TRUE' || r.get('isPublic') === undefined || r.get('isPublic') === ''
      })).reverse();

      // Robust auth check for public/resident visibility
      const token = req.cookies.token;
      let isResident = false;
      if (token) {
        try {
          jwt.verify(token, process.env.JWT_SECRET || 'secret');
          isResident = true;
        } catch (e) {}
      }

      if (!isResident) {
        posts = posts.filter(p => p.isPublic);
      }

      const total = posts.length;
      const paginatedPosts = posts.slice((page - 1) * limit, page * limit);

      res.json({
        posts: paginatedPosts,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/posts', authenticateToken, async (req: any, res) => {
    let { content, imageUrl, isPublic } = req.body;
    try {
      if (imageUrl && imageUrl.startsWith('data:')) {
        const safety = await checkImageSafety(imageUrl);
        if (!safety.safe) {
          return res.status(400).json({ error: `Konten ditolak AI: ${safety.reason}` });
        }
        imageUrl = await uploadToDrive(imageUrl, `post_${Date.now()}.jpg`);
      }
      
      const sheet = await getSheet('Posts');
      await sheet.addRow({
        author: req.user.name,
        content,
        imageUrl: imageUrl || '',
        likes: 0,
        createdAt: new Date().toISOString(),
        isPublic: isPublic ? 'TRUE' : 'FALSE'
      });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/posts/:id', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    try {
      const sheet = await getSheet('Posts');
      const rows = await sheet.getRows();
      // Find by rowNumber
      const row = rows.find(r => r.rowNumber === parseInt(req.params.id));
      if (row) {
        const img = row.get('imageUrl');
        if (img) await deleteFromDrive(img);
        await row.delete();
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Post not found' });
      }
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Financials
  app.get('/api/financials', authenticateToken, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const showPending = req.query.pending === 'true' && (req as any).user.role === 'admin';

      const sheet = await getSheet('Financials');
      const rows = await sheet.getRows();
      
      const data = rows
        .map(r => ({
          id: r.rowNumber,
          type: r.get('type'), // income/expense
          category: r.get('category'),
          amount: parseFloat(r.get('amount')),
          date: r.get('date'),
          description: r.get('description'),
          addedBy: r.get('addedBy'),
          attachment: r.get('attachment') || '',
          status: r.get('status') || 'approved'
        }))
        .filter(f => showPending ? f.status === 'pending' : f.status === 'approved')
        .reverse();

      const total = data.length;
      const paginated = data.slice((page - 1) * limit, page * limit);

      res.json({
        financials: paginated,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/financials', authenticateToken, async (req: any, res) => {
    let { type, category, amount, description, date, attachment } = req.body;
    try {
      const sheet = await getSheet('Financials');
      const isPending = req.user.role === 'resident';

      if (attachment && attachment.startsWith('data:')) {
        const safety = await checkImageSafety(attachment);
        if (!safety.safe) return res.status(400).json({ error: `Bukti ditolak: ${safety.reason}` });
        attachment = await uploadToDrive(attachment, `receipt_${Date.now()}.jpg`);
      }

      await sheet.addRow({
        type,
        category,
        amount,
        description,
        date: date || new Date().toISOString().split('T')[0],
        addedBy: req.user.name,
        attachment: attachment || '',
        status: isPending ? 'pending' : 'approved'
      });
      res.json({ success: true, pending: isPending });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/admin/financials/:id/approve', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    try {
      const sheet = await getSheet('Financials');
      const rows = await sheet.getRows();
      const row = rows.find(r => r.rowNumber === parseInt(req.params.id));
      if (row) {
        row.set('status', 'approved');
        await row.save();
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Data not found' });
      }
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/admin/financials/:id', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    try {
      const sheet = await getSheet('Financials');
      const rows = await sheet.getRows();
      const row = rows.find(r => r.rowNumber === parseInt(req.params.id));
      if (row) {
        const att = row.get('attachment');
        if (att) await deleteFromDrive(att);
        await row.delete();
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Data not found' });
      }
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/activities', async (req, res) => {
    try {
      const sheet = await getSheet('Activities');
      const rows = await sheet.getRows();
      res.json(rows.map(r => ({
        id: r.rowNumber,
        title: r.get('title'),
        description: r.get('description'),
        date: r.get('date'),
        location: r.get('location'),
        pic: r.get('pic') || '',
        phone: r.get('phone') || ''
      })).reverse());
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/activities', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { title, description, date, location, pic, phone } = req.body;
    try {
      const sheet = await getSheet('Activities');
      await sheet.addRow({
        title,
        description,
        date,
        location,
        pic,
        phone
      });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/activities/:id', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    try {
      const sheet = await getSheet('Activities');
      const rows = await sheet.getRows();
      const row = rows.find(r => r.rowNumber === parseInt(req.params.id));
      if (row) {
        await row.delete();
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Activity not found' });
      }
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

  // Resident Directory
  app.get('/api/residents', async (req, res) => {
    try {
      const sheet = await getSheet('Users');
      const rows = await sheet.getRows();
      res.json(rows
        .filter(r => r.get('status') === 'approved')
        .map(r => ({
          name: r.get('name'),
          houseNumber: r.get('houseNumber'),
          avatar: r.get('avatar') || '',
          role: r.get('role')
        })));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Profile Management
  app.get('/api/profile', authenticateToken, async (req: any, res) => {
    try {
      const sheet = await getSheet('Users');
      const rows = await sheet.getRows();
      const userRow = rows.find(r => r.get('username') === req.user.username);
      if (!userRow) return res.status(404).json({ error: 'User not found' });
      
      res.json({
        username: userRow.get('username'),
        name: userRow.get('name'),
        houseNumber: userRow.get('houseNumber'),
        avatar: userRow.get('avatar') || '',
        role: userRow.get('role')
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/profile', authenticateToken, async (req: any, res) => {
    let { name, houseNumber, avatar, password } = req.body;
    try {
      const sheet = await getSheet('Users');
      const rows = await sheet.getRows();
      const userRow = rows.find(r => r.get('username') === req.user.username);
      if (!userRow) return res.status(404).json({ error: 'User not found' });

      if (avatar && avatar.startsWith('data:')) {
        // Delete old avatar if it exists
        const oldAvatar = userRow.get('avatar');
        if (oldAvatar) await deleteFromDrive(oldAvatar);
        
        const safety = await checkImageSafety(avatar);
        if (!safety.safe) return res.status(400).json({ error: `Avatar ditolak: ${safety.reason}` });
        
        avatar = await uploadToDrive(avatar, `avatar_${req.user.username}.jpg`);
      }

      if (name) userRow.set('name', name);
      if (houseNumber) userRow.set('houseNumber', houseNumber);
      if (avatar) userRow.set('avatar', avatar);
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        userRow.set('password', hashedPassword);
      }

      await userRow.save();
      
      // Update token if name changed
      const token = jwt.sign({ 
        username: userRow.get('username'),
        name: userRow.get('name'),
        role: userRow.get('role') 
      }, process.env.JWT_SECRET || 'secret');

      res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' });
      res.json({ success: true, name: userRow.get('name'), avatar: userRow.get('avatar') });
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
        avatar: r.get('avatar') || '',
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
    const { createServer } = await import('vite');
    const vite = await createServer({
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

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

export default app;

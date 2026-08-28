import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { google } from 'googleapis';
import { Readable } from 'stream';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import fileUpload from 'express-fileupload';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists (local fallback)
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Utility to normalize image URLs across local, drive, and legacy links
function normalizeImageUrl(url?: string, driveId?: string): string {
  if (driveId && typeof driveId === 'string' && driveId.trim()) {
    return `/api/drive-image/${driveId.trim()}`;
  }
  if (!url || typeof url !== 'string' || !url.trim()) return '';
  let cleaned = url.trim();

  // If accidentally doubled origin e.g. "https://my-app.run.apphttps://..."
  const doubleOrigin = cleaned.match(/https?:\/\/[^\/]+(https?:\/\/.+)/);
  if (doubleOrigin) {
    cleaned = doubleOrigin[1];
  }

  // If already an internal path
  if (cleaned.startsWith('/api/drive-image/') || cleaned.startsWith('/uploads/')) {
    return cleaned;
  }

  // If it's a full URL pointing to our internal endpoint
  const internalDriveMatch = cleaned.match(/\/api\/drive-image\/([a-zA-Z0-9_-]+)/);
  if (internalDriveMatch) {
    return `/api/drive-image/${internalDriveMatch[1]}`;
  }

  const internalUploadMatch = cleaned.match(/\/uploads\/([^/?#]+)/);
  if (internalUploadMatch) {
    return `/uploads/${internalUploadMatch[1]}`;
  }

  // Google Drive LH3 CDN or Drive direct links
  const lh3Match = cleaned.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (lh3Match) {
    return `/api/drive-image/${lh3Match[1]}`;
  }

  const driveMatch = cleaned.match(/drive\.google\.com\/(?:file\/d\/|uc\?(?:export=view&)?id=)([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    return `/api/drive-image/${driveMatch[1]}`;
  }

  return cleaned;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());
  app.use(fileUpload());

  // Serve static files from uploads directory
  app.use('/uploads', express.static(uploadsDir));
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
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.readonly'
    ],
  });

  const drive = google.drive({ version: 'v3', auth: serviceAccountAuth });

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

      const userData = { 
        username: userRow.get('username'),
        name: userRow.get('name'),
        role: userRow.get('role'),
        houseNumber: userRow.get('houseNumber'),
        profilePic: userRow.get('profilePic') || ''
      };

      const token = jwt.sign(userData, process.env.JWT_SECRET || 'secret');

      res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' });
      res.json(userData);
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
        profilePic: '',
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
      if (user && user.profilePic) {
        user.profilePic = normalizeImageUrl(user.profilePic);
      }
      res.json(user);
    });
  });

  app.post('/api/auth/profile', authenticateToken, async (req: any, res) => {
    const { name, houseNumber, profilePic } = req.body;
    try {
      const sheet = await getSheet('Users');
      const rows = await sheet.getRows();
      const userRow = rows.find(r => r.get('username') === req.user.username);
      if (userRow) {
        if (name) userRow.set('name', name);
        if (houseNumber) userRow.set('houseNumber', houseNumber);
        if (profilePic !== undefined) userRow.set('profilePic', normalizeImageUrl(profilePic));
        await userRow.save();
        
        const updatedUser = {
          name: userRow.get('name'),
          username: userRow.get('username'),
          role: userRow.get('role'),
          houseNumber: userRow.get('houseNumber'),
          profilePic: normalizeImageUrl(userRow.get('profilePic') || '')
        };
        const token = jwt.sign(updatedUser, process.env.JWT_SECRET || 'secret');
        res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' }).json(updatedUser);
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/auth/change-password', authenticateToken, async (req: any, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
      const sheet = await getSheet('Users');
      const rows = await sheet.getRows();
      const userRow = rows.find(r => r.get('username') === req.user.username);
      if (userRow) {
        const isMatch = await bcrypt.compare(currentPassword, userRow.get('password'));
        if (!isMatch) return res.status(400).json({ error: 'Password saat ini salah' });
        
        const hashed = await bcrypt.hash(newPassword, 10);
        userRow.set('password', hashed);
        await userRow.save();
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Direct streaming of Google Drive images to browser
  app.get('/api/drive-image/:id', async (req, res) => {
    try {
      const fileId = req.params.id;
      if (!fileId) return res.status(400).send('Missing file ID');

      try {
        const meta = await drive.files.get({
          fileId,
          fields: 'mimeType, name, size'
        });
        if (meta.data.mimeType) {
          res.setHeader('Content-Type', meta.data.mimeType);
        } else {
          res.setHeader('Content-Type', 'image/jpeg');
        }
      } catch (e) {
        res.setHeader('Content-Type', 'image/jpeg');
      }

      res.setHeader('Cache-Control', 'public, max-age=86400');
      const streamRes = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
      );

      streamRes.data.on('error', (err: any) => {
        console.error('Drive stream error:', err?.message || err);
        if (!res.headersSent) res.status(500).end();
      });

      streamRes.data.pipe(res);
    } catch (err: any) {
      console.error('Drive image error:', err?.message || err);
      res.status(404).send('Image not found');
    }
  });

  // AI Content Safety Check API (Gemini server-side)
  app.post('/api/check-safety', async (req, res) => {
    const { content, mediaUrl } = req.body;
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.json({ safe: true });
      }
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze this social media post for a residential cluster community. 
Content: ${content || ''}
Media URL: ${mediaUrl || 'None'}

Is this appropriate? Avoid hate speech, explicit content, or illegal activities. 
Respond ONLY in JSON format: {"safe": true/false, "reason": "short explanation if unsafe"}`,
        config: {
          responseMimeType: 'application/json'
        }
      });
      const text = response.text || '{}';
      const data = JSON.parse(text);
      res.json({ safe: data.safe ?? true, reason: data.reason });
    } catch (e: any) {
      console.error('Safety check error:', e?.message || e);
      res.json({ safe: true });
    }
  });

  // Feed / Posts
  app.get('/api/posts', async (req: any, res) => {
    try {
      const sheet = await getSheet('Posts');
      const rows = await sheet.getRows();
      
      const token = req.cookies.token;
      let isResident = false;
      if (token) {
        try {
          jwt.verify(token, process.env.JWT_SECRET || 'secret');
          isResident = true;
        } catch (e) {}
      }

      const posts = rows.map(r => {
        const driveId = r.get('driveId') || '';
        const rawImageUrl = r.get('imageUrl') || '';
        const rawProfilePic = r.get('authorProfilePic') || '';
        return {
          id: r.rowNumber,
          author: r.get('author'),
          authorProfilePic: normalizeImageUrl(rawProfilePic),
          content: r.get('content'),
          imageUrl: normalizeImageUrl(rawImageUrl, driveId),
          driveId: driveId,
          likes: parseInt(r.get('likes') || '0'),
          visibility: r.get('visibility') || 'public',
          createdAt: r.get('createdAt')
        };
      });

      const filteredPosts = posts.filter(p => p.visibility === 'public' || isResident);
      res.json(filteredPosts.reverse());
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/posts', authenticateToken, async (req: any, res) => {
    const { content, imageUrl, driveId, visibility = 'public' } = req.body;
    try {
      const sheet = await getSheet('Posts');
      const finalImageUrl = normalizeImageUrl(imageUrl, driveId);
      await sheet.addRow({
        author: req.user.name,
        authorProfilePic: normalizeImageUrl(req.user.profilePic || ''),
        content,
        imageUrl: finalImageUrl || '',
        driveId: driveId || '',
        likes: '0',
        visibility,
        createdAt: new Date().toISOString()
      });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/posts/:id', authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
      const sheet = await getSheet('Posts');
      const rows = await sheet.getRows();
      const row = rows.find(r => r.rowNumber === parseInt(req.params.id));
      if (row) {
        const driveId = row.get('driveId');
        if (driveId) {
          try { await drive.files.delete({ fileId: driveId }); } catch (de) {}
        }
        await row.delete();
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Post not found' });
      }
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Financials
  app.get('/api/financials', authenticateToken, async (req: any, res) => {
    try {
      const sheet = await getSheet('Financials');
      const rows = await sheet.getRows();
      const financials = rows.map(r => ({
        id: r.rowNumber,
        type: r.get('type'), // income/expense
        category: r.get('category'),
        amount: parseFloat(r.get('amount')),
        date: r.get('date'),
        description: r.get('description'),
        addedBy: r.get('addedBy'),
        proofUrl: normalizeImageUrl(r.get('proofUrl') || ''),
        status: r.get('status') || 'approved',
        submittedBy: r.get('submittedBy') || ''
      }));

      // If admin, show all. If resident, show all approved + their own pending/rejected
      if (req.user.role === 'admin') {
        res.json(financials.reverse());
      } else {
        const filtered = financials.filter(f => f.status === 'approved' || f.submittedBy === req.user.username);
        res.json(filtered.reverse());
      }
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/financials', authenticateToken, async (req: any, res) => {
    const { type, category, amount, description, date, proofUrl } = req.body;
    try {
      const sheet = await getSheet('Financials');
      await sheet.addRow({
        type,
        category,
        amount: amount.toString(),
        description: description || '',
        date: date || new Date().toISOString().split('T')[0],
        addedBy: req.user.name,
        proofUrl: proofUrl || '',
        status: req.user.role === 'admin' ? 'approved' : 'pending',
        submittedBy: req.user.username
      });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/admin/financials/status', authenticateToken, async (req: any, res) => {
    const { id, status } = req.body;
    try {
      if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
      const sheet = await getSheet('Financials');
      const rows = await sheet.getRows();
      const row = rows.find(r => r.rowNumber === id);
      if (row) {
        row.set('status', status);
        await row.save();
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Activities
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
    const { title, description, date, location, pic, phone } = req.body;
    try {
      const sheet = await getSheet('Activities');
      await sheet.addRow({
        title,
        description,
        date,
        location,
        pic: pic || '',
        phone: phone || '',
        addedBy: req.user.name,
        createdAt: new Date().toISOString()
      });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/activities/:id', authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
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
        profilePic: normalizeImageUrl(r.get('profilePic') || ''),
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

  // File Upload to Google Drive (with local fallback)
  app.post('/api/upload', authenticateToken, async (req: any, res) => {
    try {
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ error: 'No files were uploaded.' });
      }

      const file = req.files.file;
      if (!file) {
        return res.status(400).json({ error: 'Missing "file" field in upload.' });
      }

      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

      if (folderId) {
        try {
          // Upload to Google Drive
          const bufferStream = new Readable();
          bufferStream.push(file.data);
          bufferStream.push(null);

          const response = await drive.files.create({
            requestBody: {
              name: `${Date.now()}-${file.name}`,
              parents: [folderId],
            },
            media: {
              mimeType: file.mimetype,
              body: bufferStream,
            },
            fields: 'id, webViewLink, webContentLink',
          });

          // Make file public if possible
          try {
            await drive.permissions.create({
              fileId: response.data.id!,
              requestBody: {
                role: 'reader',
                type: 'anyone',
              },
            });
          } catch (permError) {
            console.warn('Could not set public permissions on Drive file:', permError);
          }

          const fileId = response.data.id!;
          // Streamable proxy endpoint that works for any viewer
          const publicUrl = `/api/drive-image/${fileId}`;
          return res.json({ url: publicUrl, driveId: fileId });
        } catch (e: any) {
          console.error('Google Drive Upload Error:', e);
          // Fallback to local if drive fails
        }
      }

      // Local Fallback (if no Folder ID or if Drive upload fails)
      const fileName = `${Date.now()}-${file.name}`;
      const uploadPath = path.join(uploadsDir, fileName);

      file.mv(uploadPath, (err: any) => {
        if (err) {
          console.error('Local Upload MV Error:', err);
          return res.status(500).json({ error: 'Failed to save file locally.', detail: err.message || err });
        }
        res.json({ url: `/uploads/${fileName}` });
      });
    } catch (error: any) {
      console.error('Upload route error:', error);
      res.status(500).json({ error: error.message });
    }
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

  // Error logging middleware
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({ error: 'Internal Server Error', detail: err.message });
  });
}

startServer();

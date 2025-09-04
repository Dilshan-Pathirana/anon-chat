import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuid } from 'uuid';
import fs from 'fs';
import path from 'path';
import { Images } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

// Ensure uploads folder exists
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${uuid()}_${file.originalname}`)
});
const upload = multer({ storage });

app.post('/upload', upload.single('image'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  const url = `http://localhost:3000/uploads/${file.filename}`;
  await Images.insertOne({
    imageId: uuid(),
    filename: file.filename,
    path: url,
    createdAt: new Date()
  });

  res.json({ imageUrl: url });
});

// serve uploaded images
app.use('/uploads', express.static(UPLOAD_DIR));

app.listen(3000, () => console.log('Express server running on http://localhost:3000'));

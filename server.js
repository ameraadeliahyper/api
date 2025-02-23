// server.js
const express = require('express');
const cors = require('cors'); // Import cors
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const Replicate = require('replicate');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Gunakan middleware CORS
app.use(cors({
  origin: 'https://img2video.kingai.online', // Ganti dengan domain frontend Anda
  methods: ['GET', 'POST'], // Metode yang diizinkan
  credentials: false // Jika Anda menggunakan cookie atau otentikasi
}));
  
// Inisialisasi client Replicate
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Function to generate a random string
function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Set up storage for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

// Create uploads directory if it doesn't exist
fs.mkdir('uploads', { recursive: true });

// Endpoint to generate video
app.post('/gen', upload.single('image'), async (req, res) => {
  try {
      if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
      }

      const imagePath = path.join(__dirname, 'uploads', req.file.filename);
      const imageBuffer = await fs.readFile(imagePath);

    const input = {
      prompt: req.body.prompt, // Ambil prompt dari request
      duration: Number(req.body.duration), // Ambil duration dari request
      aspect_ratio: req.body.aspect_ratio, // Ambil aspect_ratio dari request
      negative_prompt: req.body.negative_prompt, // Ambil negative_prompt dari request
      start_image: imageBuffer, // Ambil prompt dari request
    };

    console.log('Menjalankan model...');
    const output = await replicate.run('kwaivgi/kling-v1.6-pro', { input });

    // Save the output video
    const randomString = generateRandomString(8);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `output-${randomString}-${timestamp}.mp4`;
    const outputPath = path.join(__dirname, 'videos', filename);

    await fs.mkdir('videos', { recursive: true });
    await fs.writeFile(outputPath, output);

    console.log(`Video berhasil disimpan dengan nama: ${filename}`);

    // Clean up uploaded image
    await fs.unlink(imagePath);

    res.json({ videoUrl: `/videos/${filename}` });
  } catch (error) {
    console.error('Error occurred:', error);
    res.status(500).json({ error: 'Error generating video' });
}
});

// Serve static files from the 'videos' directory
app.use('/videos', express.static(path.join(__dirname, 'videos')));

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

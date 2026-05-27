import fs from 'fs';
import path from 'path';

const ALLOWED = {
  'recon-bg.jpg': { src: 'email-assets/recon-bg.jpg', type: 'image/jpeg' },
  'doi-logo.png': { src: 'email-assets/doi-logo.png', type: 'image/png'  },
};

export default function handler(req, res) {
  const { file } = req.query;
  const entry = ALLOWED[file];

  if (!entry) {
    return res.status(404).end();
  }

  try {
    const filePath = path.join(process.cwd(), entry.src);
    const data = fs.readFileSync(filePath);

    res.setHeader('Content-Type', entry.type);
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(data);
  } catch {
    res.status(404).end();
  }
}

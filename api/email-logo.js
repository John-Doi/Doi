import { readFileSync } from 'fs';
import { join } from 'path';

export default function handler(req, res) {
  try {
    const file = readFileSync(join(process.cwd(), 'email-assets', 'doi-logo.png'));
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(file);
  } catch {
    res.status(404).end();
  }
}

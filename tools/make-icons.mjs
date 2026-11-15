import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const publicDir = path.resolve('public');
await mkdir(publicDir, { recursive: true });

const mark = `
  <rect x="14" y="18" width="36" height="33" rx="8" fill="#0f1115" fill-opacity="0.24"/>
  <rect x="14" y="18" width="36" height="33" rx="8" stroke="#ffffff" stroke-opacity="0.92" stroke-width="2.6"/>
  <path d="M14 29h36" stroke="#ffffff" stroke-opacity="0.92" stroke-width="2.6"/>
  <path d="M23 13.5V21M41 13.5V21" stroke="#ffffff" stroke-opacity="0.92" stroke-width="3" stroke-linecap="round"/>
  <rect x="21" y="34" width="7" height="7" rx="2" fill="#ffffff" fill-opacity="0.96"/>
  <rect x="31" y="34" width="6.5" height="7" rx="2" fill="#ffffff" fill-opacity="0.55"/>
  <rect x="41" y="34" width="4" height="7" rx="2" fill="#ffffff" fill-opacity="0.34"/>
`;

function icon({ bleed }) {
  // bleed = true: background fills the whole square (maskable / apple touch)
  if (bleed) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 64 64">
      <defs>
        <linearGradient id="g" x1="4" y1="0" x2="60" y2="64" gradientUnits="userSpaceOnUse">
          <stop stop-color="#6D8CFF"/>
          <stop offset="0.55" stop-color="#8B6CFF"/>
          <stop offset="1" stop-color="#38C9A0"/>
        </linearGradient>
      </defs>
      <rect width="64" height="64" fill="url(#g)"/>
      <g transform="translate(32 32) scale(0.78) translate(-32 -32)">
        ${mark}
      </g>
    </svg>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 64 64">
    <defs>
      <linearGradient id="g" x1="6" y1="2" x2="58" y2="62" gradientUnits="userSpaceOnUse">
        <stop stop-color="#6D8CFF"/>
        <stop offset="0.55" stop-color="#8B6CFF"/>
        <stop offset="1" stop-color="#38C9A0"/>
      </linearGradient>
    </defs>
    <rect width="64" height="64" rx="16" fill="url(#g)"/>
    ${mark}
  </svg>`;
}

const rounded = Buffer.from(icon({ bleed: false }));
const bleed = Buffer.from(icon({ bleed: true }));

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="6" y1="2" x2="58" y2="62" gradientUnits="userSpaceOnUse">
      <stop stop-color="#6D8CFF"/>
      <stop offset="0.55" stop-color="#8B6CFF"/>
      <stop offset="1" stop-color="#38C9A0"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="16" fill="url(#g)"/>
  ${mark}
</svg>
`;

await writeFile(path.join(publicDir, 'favicon.svg'), favicon, 'utf8');

const jobs = [
  { file: 'pwa-192.png', size: 192, input: rounded },
  { file: 'pwa-512.png', size: 512, input: rounded },
  { file: 'pwa-maskable-512.png', size: 512, input: bleed },
  { file: 'apple-touch-icon.png', size: 180, input: bleed },
];

for (const job of jobs) {
  await sharp(job.input, { density: 384 })
    .resize(job.size, job.size)
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, job.file));
  console.log(`✓ ${job.file} (${job.size}×${job.size})`);
}

console.log('Иконки готовы → public/');

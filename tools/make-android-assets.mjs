import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const res = path.resolve('android/app/src/main/res');
const iconFile = path.resolve('public/pwa-512.png');
const icon = await readFile(iconFile);

const legacySizes = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
};

const foregroundSizes = {
  mdpi: 108,
  hdpi: 162,
  xhdpi: 216,
  xxhdpi: 324,
  xxxhdpi: 432,
};

for (const [density, size] of Object.entries(legacySizes)) {
  const dir = path.join(res, `mipmap-${density}`);
  for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) {
    await sharp(icon).resize(size, size).png({ compressionLevel: 9 }).toFile(path.join(dir, name));
  }
}

for (const [density, size] of Object.entries(foregroundSizes)) {
  const dir = path.join(res, `mipmap-${density}`);
  const inner = Math.round(size * 0.66);
  const offset = Math.round((size - inner) / 2);
  const canvas = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });
  const logo = await sharp(icon).resize(inner, inner).png().toBuffer();
  await canvas
    .composite([{ input: logo, left: offset, top: offset }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(dir, 'ic_launcher_foreground.png'));
}

const splashes = [
  ['drawable/splash.png', 480, 320],
  ['drawable-land-mdpi/splash.png', 480, 320],
  ['drawable-land-hdpi/splash.png', 800, 480],
  ['drawable-land-xhdpi/splash.png', 1280, 720],
  ['drawable-land-xxhdpi/splash.png', 1600, 960],
  ['drawable-land-xxxhdpi/splash.png', 1920, 1280],
  ['drawable-port-mdpi/splash.png', 320, 480],
  ['drawable-port-hdpi/splash.png', 480, 800],
  ['drawable-port-xhdpi/splash.png', 720, 1280],
  ['drawable-port-xxhdpi/splash.png', 960, 1600],
  ['drawable-port-xxxhdpi/splash.png', 1280, 1920],
];

for (const [file, width, height] of splashes) {
  const logoSize = Math.round(Math.min(width, height) * 0.26);
  const logo = await sharp(icon).resize(logoSize, logoSize).png().toBuffer();
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 15, g: 17, b: 21 },
    },
  })
    .composite([
      {
        input: logo,
        left: Math.round((width - logoSize) / 2),
        top: Math.round((height - logoSize) / 2),
      },
    ])
    .png({ compressionLevel: 9 })
    .toFile(path.join(res, file));
}

console.log('✓ Android launcher icons and splash screens updated');

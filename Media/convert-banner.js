const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, 'youtube-banner.svg');
const pngPath = path.join(__dirname, 'youtube-banner.png');

const svgBuffer = fs.readFileSync(svgPath);

sharp(svgBuffer)
  .resize(2048, 1152)
  .png({ quality: 90 })
  .toFile(pngPath)
  .then(() => {
    console.log('Banner created: youtube-banner.png (2048x1152)');
    const stats = fs.statSync(pngPath);
    console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  })
  .catch(err => {
    console.error('Error:', err);
  });

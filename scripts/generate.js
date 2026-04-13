import fs from 'fs';
import sharp from 'sharp';

const svgBuffer = fs.readFileSync('./public/favicon.svg');

async function generate() {
  await sharp(svgBuffer).resize(180, 180).png().toFile('./public/apple-touch-icon.png');
  await sharp(svgBuffer).resize(192, 192).png().toFile('./public/icon-192.png');
  await sharp(svgBuffer).resize(512, 512).png().toFile('./public/icon-512.png');
  await sharp(svgBuffer).resize(32, 32).png().toFile('./public/favicon-32x32.png');
  await sharp(svgBuffer).resize(16, 16).png().toFile('./public/favicon-16x16.png');
  console.log("Images generated successfully!");
}

generate();

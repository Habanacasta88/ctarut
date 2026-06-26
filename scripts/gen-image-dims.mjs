// Genera src/data/image-dims.json: mapa "/images/<archivo>" -> [width, height].
// Se ejecuta como prebuild para que Article.image use ImageObject con dimensiones
// reales sin quedar obsoleto. Imágenes nuevas sin dims caen a string (válido).
import { readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const IMAGES_DIR = fileURLToPath(new URL('../public/images/', import.meta.url));
const OUT = fileURLToPath(new URL('../src/data/image-dims.json', import.meta.url));
const IMG_RE = /\.(jpe?g|png|webp|avif|gif)$/i;

const files = (await readdir(IMAGES_DIR)).filter((f) => IMG_RE.test(f)).sort();
const dims = {};
let ok = 0;
let failed = 0;

for (const file of files) {
  try {
    const { width, height } = await sharp(IMAGES_DIR + file).metadata();
    if (width && height) {
      dims[`/images/${file}`] = [width, height];
      ok++;
    }
  } catch {
    failed++; // imagen corrupta/ilegible: se omite y el schema usará string
  }
}

await writeFile(OUT, JSON.stringify(dims, null, 0) + '\n');
console.log(`[gen-image-dims] ${ok} imágenes mapeadas, ${failed} omitidas -> src/data/image-dims.json`);

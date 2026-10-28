import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const targetDir = path.join(rootDir, 'public', 'engine');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Candidates for Stockfish lite single-threaded WASM
const sourceJs = path.join(rootDir, 'node_modules', 'stockfish', 'bin', 'stockfish-19-lite-single.js');
const sourceWasm = path.join(rootDir, 'node_modules', 'stockfish', 'bin', 'stockfish-19-lite-single.wasm');

const destJs = path.join(targetDir, 'stockfish.js');
const destWasm = path.join(targetDir, 'stockfish.wasm');

try {
  if (fs.existsSync(sourceJs) && fs.existsSync(sourceWasm)) {
    fs.copyFileSync(sourceJs, destJs);
    fs.copyFileSync(sourceWasm, destWasm);
    console.log('✅ Successfully copied Stockfish 19 lite single-threaded WASM & JS to public/engine/');
  } else {
    console.warn('⚠️ Stockfish source files not found at expected location:', sourceJs);
  }
} catch (err) {
  console.error('❌ Error copying Stockfish engine files:', err);
  process.exit(1);
}

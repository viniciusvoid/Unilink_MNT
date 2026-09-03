#!/usr/bin/env node
// Extrai logs para um .zip ou pasta — uso: node extract-logs.js [--out ./saida]
const fs = require('fs');
const path = require('path');
const { LOG_DIR, APP_LOG, ERROR_LOG } = require('./logger');

const outArg = process.argv.indexOf('--out');
const outDir = outArg !== -1 ? path.resolve(process.argv[outArg + 1]) : path.resolve(__dirname, '..', `logs-export-${new Date().toISOString().slice(0,10)}`);

if (!fs.existsSync(LOG_DIR)) { console.log('Nenhum log ainda em', LOG_DIR); process.exit(0); }
fs.mkdirSync(outDir, { recursive: true });

function copyIfExists(src) {
    if (fs.existsSync(src)) {
        const dest = path.join(outDir, path.basename(src));
        fs.copyFileSync(src, dest);
        console.log(`→ ${dest} (${(fs.statSync(src).size/1024).toFixed(1)} KB)`);
    }
    const rotated = src + '.1';
    if (fs.existsSync(rotated)) {
        const dest = path.join(outDir, path.basename(rotated));
        fs.copyFileSync(rotated, dest);
        console.log(`→ ${dest} (rotated)`);
    }
}
copyIfExists(APP_LOG);
copyIfExists(ERROR_LOG);
// também exporta frontend se houver arquivo temporário
console.log(`Extração concluída em ${outDir}`);

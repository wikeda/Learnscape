import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SRC = 'data/questions.csv';
const OUT = 'src/data/questions.json';

// 素朴なCSVパーサ（ダブルクオート対応, カンマ/改行をクオート内で許容）
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

const raw = readFileSync(SRC, 'utf8');
const rows = parseCsv(raw).filter((r) => r.some((c) => c.trim() !== ''));

// ヘッダ行(No/チャプター/質問/解答 を含む行)を検出
const headerIdx = rows.findIndex((r) => r.map((c) => c.trim()).includes('質問'));
if (headerIdx === -1) throw new Error('ヘッダ行(質問)が見つかりません');
const header = rows[headerIdx].map((c) => c.trim());
const col = (name) => header.indexOf(name);
const iNo = col('No'), iCh = col('チャプター'), iQ = col('質問'), iA = col('解答');

let lastChapter = '';
const out = [];
for (let i = headerIdx + 1; i < rows.length; i++) {
  const r = rows[i];
  const no = parseInt((r[iNo] || '').trim(), 10);
  const question = (r[iQ] || '').trim();
  const answer = (r[iA] || '').trim();
  let chapter = (r[iCh] || '').trim();
  if (!question || !answer || Number.isNaN(no)) continue;
  // 章が空欄(例:No.206)なら直前の章で補完
  if (!chapter) chapter = lastChapter;
  else lastChapter = chapter;
  out.push({ no, chapter, question, answer });
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');

const chapters = [...new Set(out.map((q) => q.chapter))];
console.log(`questions: ${out.length}, chapters: ${chapters.length}`);
console.log(chapters.join(' / '));

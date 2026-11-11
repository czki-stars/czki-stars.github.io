// Reads the public paper index of purezhi.com and rewrites build/data.txt.
// Runs on Node 18+ with no dependencies. If anything looks wrong it exits
// with an error and leaves data.txt untouched.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(HERE, 'data.txt');
const BASE = 'https://purezhi.com';
const UA = 'czki-stars-updater/1.0 (+https://czki-stars.github.io)';
const DISCIPLINES = ['心理', '社会与传播', '哲学', '文学', '语言文字', '影音戏剧番', '历史政治法律', '经济管理', '数学、计算机与工程', '物理', '化学', '生物医学', '地理天文', '玄学', '纯稚原创'];
const sleep = ms => new Promise(r => setTimeout(r, ms));

function fail(msg) {
  console.log('::warning::Update skipped: ' + msg);
  process.exit(1);
}

async function raw(p) {
  let err;
  for (let t = 0; t < 3; t++) {
    try {
      const res = await fetch(BASE + p, { headers: { 'user-agent': UA, accept: 'text/html' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const h = await res.text();
      const i = h.indexOf('data: [');
      if (i < 0) throw new Error('page has no data block');
      await sleep(250);
      return h.slice(i);
    } catch (e) { err = e; await sleep(1500 * (t + 1)); }
  }
  throw new Error(p + ': ' + err.message);
}

const totalOf = h => +((h.match(/[,{]total:(\d+)/) || [0, 0])[1]);
const RE = /\{id:"([^"]+)",title:"((?:[^"\\]|\\.)*)",author:"((?:[^"\\]|\\.)*)".*?published_at:"([^"]*)",comment_count:(\d+),highlight_count:(\d+).*?theories:\[(.*?)\]/g;

async function listAll() {
  const total = totalOf(await raw('/?page=1'));
  if (!total) throw new Error('could not read the paper count');
  const pages = Math.ceil(total / 10), docs = [], seen = new Set();
  for (let p = 1; p <= pages; p++) {
    const h = await raw('/?page=' + p);
    const s = h.slice(h.indexOf('list:['), h.indexOf('highlights:['));
    let m; RE.lastIndex = 0;
    while ((m = RE.exec(s))) {
      if (seen.has(m[1])) continue;
      seen.add(m[1]);
      docs.push({ id: m[1], title: m[2], author: m[3], date: m[4], c: +m[5], h: +m[6], th: [...m[7].matchAll(/name:"((?:[^"\\]|\\.)*)"/g)].map(x => x[1]) });
    }
  }
  const totalAfter = totalOf(await raw('/?page=1'));
  return { docs, total, stable: total === totalAfter && docs.length === total };
}

const cl = s => s.replace(/\\"/g, '"').replace(/\\n/g, ' ').replace(/\\/g, '').replace(/\|/g, '｜').replace(/`/g, "'").replace(/\$\{/g, '$ {').replace(/</g, '＜').replace(/>/g, '＞').replace(/\s+/g, ' ').trim();
const cut = (s, n) => { const a = [...s]; return a.length > n ? a.slice(0, n).join('') + '…' : s; };

try {
  let got = null;
  for (let attempt = 0; attempt < 3 && !(got && got.stable); attempt++) got = await listAll();
  if (!got.stable) fail('the paper list kept changing while it was being read (' + got.docs.length + ' of ' + got.total + ')');

  const t2d = {};
  for (let i = 0; i < DISCIPLINES.length; i++) {
    const h = await raw('/d/' + encodeURIComponent(DISCIPLINES[i]));
    const s = h.slice(h.indexOf('theories:['), h.indexOf('posts:['));
    for (const m of s.matchAll(/name:"((?:[^"\\]|\\.)*)",post_count:(\d+)/g)) if (!(m[1] in t2d)) t2d[m[1]] = i;
  }

  const rows = [];
  for (const d of got.docs) {
    const th = d.th.slice(0, 6);
    let p = th.find(t => t !== '波根二象性' && t in t2d);
    if (p === undefined) p = th.find(t => t in t2d);
    const di = p === undefined ? 15 : t2d[p];
    const date = /^\d{4}-\d{2}-\d{2}$/.test(d.date) ? d.date.slice(5).replace('-', '') : '0101';
    const title = cut(cl(d.title), 36);
    if (!/^[A-Za-z0-9_-]{3,40}$/.test(d.id) || !title) continue;
    rows.push([d.id, title, cut(cl(d.author), 12) || '佚名', date, d.c, d.h, di, th.map(t => cl(t).replace(/,/g, '，')).join(',')].join('|'));
  }
  rows.sort();

  const before = fs.existsSync(DATA) ? fs.readFileSync(DATA, 'utf8').split('\n').filter(Boolean).length : 0;
  if (rows.length < 100 || rows.length < before * 0.9) fail('got ' + rows.length + ' papers but had ' + before + '; keeping the old data');
  fs.writeFileSync(DATA, rows.join('\n') + '\n');
  console.log('papers: ' + before + ' -> ' + rows.length);
} catch (e) {
  fail(e.message);
}

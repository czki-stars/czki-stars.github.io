#!/usr/bin/env python3
"""Rebuild index.html from build/head.html + build/data.txt + build/tail.html.

Each line of data.txt is one paper:
  id|title|author|MMDD|comments|highlights|discipline(0-15)|theory,theory,...

data.txt comes from the web, so every row is validated and sanitised here
before it is written into the page. Rows that do not pass are skipped.
"""
import os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ID_RE = re.compile(r'^[A-Za-z0-9_-]{3,40}$')

def clean(s):
    s = s.replace('`', "'").replace('${', '$ {').replace('\\', '').replace('<', '＜').replace('>', '＞')
    return re.sub(r'\s+', ' ', s).strip()

def valid_row(line):
    p = [clean(x) for x in line.split('|')]
    if len(p) != 8: return None
    if not ID_RE.match(p[0]) or not p[1]: return None
    if not re.match(r'^\d{4}$', p[3]): return None
    if not (p[4].isdigit() and p[5].isdigit() and p[6].isdigit() and int(p[6]) <= 15): return None
    return p

def main():
    rows, seen, skipped = [], set(), 0
    for line in open(os.path.join(HERE, 'data.txt'), encoding='utf8'):
        line = line.rstrip('\n')
        if not line: continue
        p = valid_row(line)
        if p is None or p[0] in seen:
            skipped += 1
            print('::warning::skipped row: ' + line[:60])
            continue
        seen.add(p[0]); rows.append(p)
    if len(rows) < 100: sys.exit('refusing to build: only %d valid papers' % len(rows))
    head = open(os.path.join(HERE, 'head.html'), encoding='utf8').read()
    tail = open(os.path.join(HERE, 'tail.html'), encoding='utf8').read()
    with open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf8') as f:
        f.write(head + ''.join('|'.join(p) + '\n' for p in rows) + tail)
    print('built index.html with %d papers (%d skipped)' % (len(rows), skipped))

if __name__ == '__main__':
    main()

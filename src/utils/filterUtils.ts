// ─── Tokenizer ────────────────────────────────────────────────────────────────

import type { TimelineElement } from '../types/timeline';

const SPECIAL = ' \t|()~"<>';
type DateOperator = '<' | '<=' | '>' | '>=';
type LeafKind = 'quoted' | 'date' | 'type' | 'has' | 'contains' | 'tag' | 'text';
type LeafToken = { t: 'LEAF'; kind: LeafKind; value: string; op?: DateOperator };
type Token = { t: 'LPAREN' | 'RPAREN' | 'OR' | 'NOT' | 'PENDING_CONTAINS' } | LeafToken;
type FilterNode =
  LeafToken | { t: 'AND' | 'OR'; left: FilterNode; right: FilterNode } | { t: 'NOT'; operand: FilterNode };

function tokenize(input: string): Token[] {
  const s = input;
  const len = s.length;
  let i = 0;
  const raw: Token[] = [];

  const skipWS = () => {
    while (i < len && (s[i] === ' ' || s[i] === '\t')) i++;
  };
  const readWord = () => {
    let w = '';
    while (i < len && !SPECIAL.includes(s[i])) w += s[i++];
    return w;
  };

  while (i < len) {
    skipWS();
    if (i >= len) break;
    const ch = s[i];

    if (ch === '(') {
      raw.push({ t: 'LPAREN' });
      i++;
      continue;
    }
    if (ch === ')') {
      raw.push({ t: 'RPAREN' });
      i++;
      continue;
    }
    if (ch === '|') {
      raw.push({ t: 'OR' });
      i++;
      continue;
    }
    if (ch === '~') {
      raw.push({ t: 'NOT' });
      i++;
      continue;
    }

    if (ch === '"') {
      i++;
      let val = '';
      while (i < len && s[i] !== '"') val += s[i++];
      if (i < len) i++;
      raw.push({ t: 'LEAF', kind: 'quoted', value: val.toLowerCase() });
      continue;
    }

    if (ch === '<' || ch === '>') {
      let op: DateOperator = ch;
      i++;
      if (i < len && s[i] === '=') {
        op = ch === '<' ? '<=' : '>=';
        i++;
      }
      skipWS();
      const val = readWord();
      if (val) raw.push({ t: 'LEAF', kind: 'date', op, value: val });
      continue;
    }

    const word = readWord();
    if (!word) {
      i++;
      continue;
    }
    const wl = word.toLowerCase();

    if (wl === 'is:event' || wl === 'is:span' || wl === 'is:era') {
      raw.push({ t: 'LEAF', kind: 'type', value: wl.slice(3) });
    } else if (wl === 'has:coords') {
      raw.push({ t: 'LEAF', kind: 'has', value: 'coords' });
    } else if (wl.startsWith('contains:')) {
      const v = wl.slice(9);
      if (v) raw.push({ t: 'LEAF', kind: 'contains', value: v });
      else raw.push({ t: 'PENDING_CONTAINS' });
    } else if (word[0] === '#' && word.length > 1) {
      raw.push({ t: 'LEAF', kind: 'tag', value: word.slice(1).toLowerCase() });
    } else {
      raw.push({ t: 'LEAF', kind: 'text', value: wl });
    }
  }

  // Resolve "contains: text" (space between keyword and value)
  const tokens: Token[] = [];
  for (let j = 0; j < raw.length; j++) {
    if (raw[j].t === 'PENDING_CONTAINS') {
      const next = raw[j + 1];
      if (next && next.t === 'LEAF' && (next.kind === 'text' || next.kind === 'quoted')) {
        tokens.push({ t: 'LEAF', kind: 'contains', value: next.value });
        j++;
      }
    } else {
      tokens.push(raw[j]);
    }
  }
  return tokens;
}

// ─── Parser (recursive descent) ───────────────────────────────────────────────

function parse(tokens: Token[]): FilterNode | null {
  let pos = 0;
  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  function parseExpr(): FilterNode | null {
    return parseOr();
  }

  function parseOr(): FilterNode | null {
    let left = parseAnd();
    while (peek()?.t === 'OR') {
      consume();
      const right = parseAnd();
      left = left && right ? { t: 'OR', left, right } : left || right;
    }
    return left;
  }

  function parseAnd(): FilterNode | null {
    let left = parseNot();
    while (peek() && peek().t !== 'OR' && peek().t !== 'RPAREN') {
      const right = parseNot();
      if (!right) break;
      left = left ? { t: 'AND', left, right } : right;
    }
    return left;
  }

  function parseNot(): FilterNode | null {
    if (peek()?.t === 'NOT') {
      consume();
      const operand = parsePrimary();
      return operand ? { t: 'NOT', operand } : null;
    }
    return parsePrimary();
  }

  function parsePrimary(): FilterNode | null {
    if (peek()?.t === 'LPAREN') {
      consume();
      const expr = parseExpr();
      if (peek()?.t === 'RPAREN') consume();
      return expr;
    }
    const token = peek();
    if (token?.t === 'LEAF') {
      consume();
      return token;
    }
    if (peek()) consume();
    return null;
  }

  return parseExpr();
}

// ─── Date parsing ─────────────────────────────────────────────────────────────

function parseDateValue(val: string): number | null {
  const full = /^(-?\d+)-(\d{2})-(\d{2})$/.exec(val);
  if (full) {
    const year = parseInt(full[1], 10);
    const month = parseInt(full[2], 10);
    const day = parseInt(full[3], 10);
    return year + (month - 1) / 12 + (day - 1) / 365;
  }
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

// ─── Evaluator ────────────────────────────────────────────────────────────────

function evalLeaf(leaf: LeafToken, el: TimelineElement, noteContent: string | null): boolean {
  const title = String(el.title || el.id || '').toLowerCase();

  switch (leaf.kind) {
    case 'text':
    case 'quoted':
      return title.includes(leaf.value);

    case 'type':
      return el.type === leaf.value;

    case 'tag': {
      const tags = Array.isArray(el.tags) ? el.tags : [];
      return tags.some((t: string) => t.toLowerCase() === leaf.value);
    }

    case 'has':
      if (leaf.value === 'coords') return el.lat != null && el.lng != null;
      return false;

    case 'contains':
      if (!noteContent) return false;
      return noteContent.toLowerCase().includes(leaf.value);

    case 'date': {
      const dateVal = el.date ?? el.start;
      if (dateVal == null) return false;
      const filterVal = parseDateValue(leaf.value);
      if (filterVal == null) return false;
      switch (leaf.op) {
        case '<':
          return dateVal < filterVal;
        case '<=':
          return dateVal <= filterVal;
        case '>':
          return dateVal > filterVal;
        case '>=':
          return dateVal >= filterVal;
        default:
          return false;
      }
    }

    default:
      return false;
  }
}

function evalNode(node: FilterNode | null, el: TimelineElement, noteContent: string | null): boolean {
  if (!node) return true;
  switch (node.t) {
    case 'AND':
      return evalNode(node.left, el, noteContent) && evalNode(node.right, el, noteContent);
    case 'OR':
      return evalNode(node.left, el, noteContent) || evalNode(node.right, el, noteContent);
    case 'NOT':
      return !evalNode(node.operand, el, noteContent);
    case 'LEAF':
      return evalLeaf(node, el, noteContent);
    default:
      return true;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function tokenizeFilterQuery(query: string): Token[] {
  const q = (query || '').trim();
  return q ? tokenize(q) : [];
}

export function parseFilterQuery(query: string): FilterNode | null {
  const q = (query || '').trim();
  if (!q) return null;
  const tokens = tokenize(q);
  if (!tokens.length) return null;
  return parse(tokens);
}

export function matchesFilter(
  el: TimelineElement,
  parsedQuery: FilterNode | null,
  noteContent: string | null = null,
): boolean {
  if (!parsedQuery) return true;
  return evalNode(parsedQuery, el, noteContent);
}

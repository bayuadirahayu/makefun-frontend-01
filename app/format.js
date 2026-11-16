// Small formatting helpers: money, dates, time left, safe HTML, markdown-lite.
// Everything here works on plain values, no network, no framework.

export function usd(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: n % 1 ? 2 : 0 });
}

export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Whole seconds between now and an ISO deadline. Negative means past. */
export function secondsLeft(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((t - Date.now()) / 1000);
}

/** "2d 5h left", "47m left", or "closed 3d ago" — always from the deadline, never the status. */
export function timeLeft(iso) {
  const s = secondsLeft(iso);
  if (s === null) return '—';
  const abs = Math.abs(s);
  const days = Math.floor(abs / 86400);
  const hours = Math.floor((abs % 86400) / 3600);
  const mins = Math.floor((abs % 3600) / 60);
  const span = days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  return s >= 0 ? `${span} left` : `closed ${span} ago`;
}

/** True while the bounty still takes entries: its deadline has not passed. */
export function entriesOpen(bounty) {
  const s = secondsLeft(bounty && bounty.deadline);
  return s !== null && s > 0;
}

export function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Inline markdown-lite: `code`, **bold**, [text](https://…) — input is escaped first. */
export function inlineMd(text) {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, (_, bold) => `<strong>${bold}</strong>`);
  out = out.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, (_, label, href) => `<a href="${href}" rel="noopener">${label}</a>`);
  return out;
}

/** Block markdown-lite for bounty descriptions: ## headings, paragraphs, lists. */
export function blockMd(text) {
  const src = String(text ?? '').replace(/\r\n/g, '\n');
  const blocks = src.split(/\n{2,}/);
  const html = [];
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const head = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (head) {
      const level = Math.min(head[1].length + 1, 4);
      html.push(`<h${level}>${inlineMd(head[2])}</h${level}>`);
      continue;
    }
    const lines = trimmed.split('\n').map((line) => line.trim()).filter(Boolean);
    if (lines.every((line) => /^[-*]\s+/.test(line))) {
      const items = lines.map((line) => `<li>${inlineMd(line.replace(/^[-*]\s+/, ''))}</li>`).join('');
      html.push(`<ul>${items}</ul>`);
      continue;
    }
    if (lines.every((line) => /^\d+[.)]\s+/.test(line))) {
      const items = lines.map((line) => `<li>${inlineMd(line.replace(/^\d+[.)]\s+/, ''))}</li>`).join('');
      html.push(`<ol>${items}</ol>`);
      continue;
    }
    html.push(`<p>${lines.map(inlineMd).join('<br>')}</p>`);
  }
  return html.join('\n');
}

/** A leaderboard value in the column's own display form; judge win rates read as %. */
export function cellValue(column, entry) {
  const raw = entry.values ? entry.values[column.key] : undefined;
  const shown = entry.display ? entry.display[column.key] : undefined;
  if (raw === undefined || raw === null) return shown ?? '—';
  if (column.key === 'judge' || /win_rate_micro$/.test(column.source || '')) {
    return `${(Number(raw) / 10000).toFixed(1)}%`;
  }
  if (column.key === 'bytes') {
    const n = Number(raw);
    if (!Number.isFinite(n)) return shown ?? '—';
    return n >= 1048576 ? `${(n / 1048576).toFixed(2)} MB` : n >= 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`;
  }
  return shown ?? String(raw);
}

export function plural(n, one, many) {
  return `${Number(n).toLocaleString('en-US')} ${n === 1 ? one : many}`;
}

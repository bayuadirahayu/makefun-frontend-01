// The four surfaces: board, bounty page, leaderboard, profile.
// Each render takes its data and returns HTML; the router drops it into #view.
// Links are hash routes, so every surface has its own URL and is reachable by link.

import { apiUrl, cacheSize } from './api.js';
import { blockMd, cellValue, entriesOpen, escapeHtml, fmtDate, fmtDateTime, plural, timeLeft, usd } from './format.js';

const BOARD_PAGE = 24;
const TABLE_PAGE = 25;

/** Shared: a bounty status badge that reads the deadline, never the status alone. */
export function statusBadge(bounty) {
  if (bounty.resolvedAt || bounty.winner) return '<span class="tag done">Resolved</span>';
  if (entriesOpen(bounty)) return '<span class="tag open">Open for entries</span>';
  return '<span class="tag closed">Entries closed</span>';
}

/** Shared: the pot / fee / time-left facts every bounty surface shows. */
export function bountyFacts(bounty) {
  const pot = bounty.potUsd ?? bounty.rewardAmount;
  const fee = bounty.entryFeeUsd;
  const left = timeLeft(bounty.deadline);
  const open = entriesOpen(bounty);
  const feeHtml = fee === null || fee === undefined || Number(fee) === 0
    ? '<span class="fee">Fee: free</span>'
    : `<span class="fee">Entry fee: <b>${usd(fee)}</b></span>`;
  return `<div class="facts">
    <span>Reward <b class="pot">${usd(pot)}</b>${bounty.rewardAmount && Number(pot) !== Number(bounty.rewardAmount) ? ` <span class="muted small">(base ${usd(bounty.rewardAmount)})</span>` : ''}</span>
    ${feeHtml}
    <span>Deadline <b>${fmtDateTime(bounty.deadline)}</b></span>
    <span class="time-left ${open ? 'open' : 'soon'}">${escapeHtml(left)}</span>
    <span>${plural(bounty.submissionCount ?? 0, 'entry', 'entries')}</span>
  </div>`;
}

/** Board: the live bounties, soonest deadline first, filtered and paged in the browser. */
export function renderBoard(data, state) {
  // Open bounties first (soonest deadline first), then the closed ones — the
  // board is for entering, so what can still be entered leads.
  const items = (data.items || []).slice().sort((a, b) => {
    const openA = entriesOpen(a) ? 0 : 1;
    const openB = entriesOpen(b) ? 0 : 1;
    if (openA !== openB) return openA - openB;
    return new Date(a.deadline) - new Date(b.deadline);
  });
  const query = (state.q || '').trim().toLowerCase();
  const filtered = items.filter((item) => {
    const open = entriesOpen(item);
    if (state.filter === 'open' && !open) return false;
    if (state.filter === 'soon' && (!open || (new Date(item.deadline) - Date.now()) > 86400000)) return false;
    if (state.filter === 'closed' && open) return false;
    if (query) {
      const hay = `${item.title || ''} ${item.summary || ''} ${item.slug || ''} ${item.category || ''}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
  const shown = filtered.slice(0, state.shown);
  const rows = shown.map((item) => {
    const slug = escapeHtml(item.slug);
    return `<li class="card">
      <h2><a href="#/bounty/${slug}">${escapeHtml(item.title || item.slug)}</a>${statusBadge(item)}</h2>
      ${item.summary ? `<p class="summary">${escapeHtml(item.summary)}</p>` : ''}
      ${bountyFacts(item)}
      <p class="small muted" style="margin:8px 0 0">
        <a href="#/bounty/${slug}">Details</a> &middot;
        <a href="#/bounty/${slug}/leaderboard">Leaderboard</a>
        ${item.category ? ` &middot; ${escapeHtml(item.category)}` : ''}
      </p>
    </li>`;
  }).join('');
  const filters = ['all', 'open', 'soon', 'closed'].map((key) => {
    const label = { all: 'All', open: 'Open for entries', soon: 'Closing within 24h', closed: 'Entries closed' }[key];
    return `<button class="chip" data-filter="${key}" aria-pressed="${state.filter === key}">${label}</button>`;
  }).join('');
  return `<h1>Live bounties</h1>
  <p class="lede">${plural(filtered.length, 'bounty', 'bounties')} on the board, open ones first and soonest deadline first.
  The reward is the live pot; the fee is what one entry costs, where one is set.</p>
  <div class="toolbar" role="search">
    ${filters}
    <input class="search" type="search" placeholder="Search bounties…" value="${escapeHtml(state.q || '')}" aria-label="Search bounties">
  </div>
  ${rows ? `<ul class="board">${rows}</ul>` : '<p class="notice">No bounties match that filter.</p>'}
  ${filtered.length > state.shown ? `<button class="more" data-more="1">Show more (${filtered.length - state.shown} left)</button>` : ''}
  <p class="small muted">Fetched live from the make.fun API${cacheSize() ? ` · ${cacheSize()} answer${cacheSize() === 1 ? '' : 's'} cached` : ''}.</p>`;
}

/** Bounty page: summary, description and rules, the rewards table with the live pot, dates, status. */
export function renderBounty(bounty) {
  const rewards = bounty.rewardsNow || [];
  const rewardRows = rewards.map((row) => {
    const feeShare = Number(row.feeShareUsd || 0);
    return `<tr><td class="rank">${escapeHtml(String(row.place))}</td>
      <td class="num">${usd(row.baseUsd)}</td>
      <td class="num">${feeShare > 0 ? `+ ${usd(row.feeShareUsd)} fees` : '—'}</td>
      <td class="num"><b>${usd(row.amountUsd)}</b></td></tr>`;
  }).join('');
  const rules = renderRules(bounty.rules);
  return `<div class="detail-head"><h1>${escapeHtml(bounty.title || bounty.slug)}</h1>${statusBadge(bounty)}</div>
  ${bounty.summary ? `<p class="lede">${escapeHtml(bounty.summary)}</p>` : ''}
  ${bountyFacts(bounty)}
  <div class="meta">
    <div><dt>Live pot</dt><dd>${usd(bounty.potUsd ?? bounty.rewardAmount)}</dd></div>
    <div><dt>Entry fee</dt><dd>${bounty.entryFeeUsd ? usd(bounty.entryFeeUsd) : 'Free'}</dd></div>
    <div><dt>Entries</dt><dd>${plural(bounty.submissionCount ?? 0, 'entry', 'entries')}</dd></div>
    <div><dt>Opens</dt><dd><small>${fmtDate(bounty.opensAt || bounty.publishedAt)}</small></dd></div>
    <div><dt>Deadline</dt><dd><small>${fmtDateTime(bounty.deadline)}</small></dd></div>
    <div><dt>Status</dt><dd><small>${escapeHtml(bounty.status || '—')}${entriesOpen(bounty) ? ' · taking entries' : ' · not taking entries'}</small></dd></div>
  </div>
  <p><a href="#/bounty/${escapeHtml(bounty.slug)}/leaderboard">See the leaderboard &rarr;</a></p>
  ${rewards.length ? `<h2>Rewards</h2>
  <div class="table-wrap"><table>
    <thead><tr><th>Place</th><th class="num">Base</th><th class="num">Fee share</th><th class="num">Pays now</th></tr></thead>
    <tbody>${rewardRows}</tbody>
  </table></div>
  <p class="small muted">“Pays now” is the live pot split: the base reward plus each place&rsquo;s share of the entry fees paid so far.</p>` : ''}
  ${bounty.description ? `<h2>About this bounty</h2><div class="prose">${blockMd(bounty.description)}</div>` : ''}
  ${rules}
  <p class="small muted">Bounty page on make.fun: <a href="https://make.fun/bounty/${escapeHtml(bounty.slug)}">make.fun/bounty/${escapeHtml(bounty.slug)}</a></p>`;
}

/** Rules arrive as text, a list, or an object — render whichever shape came back. */
export function renderRules(rules) {
  if (!rules) return '';
  if (typeof rules === 'string') {
    return `<h2>Rules</h2><div class="prose">${blockMd(rules)}</div>`;
  }
  if (Array.isArray(rules)) {
    const items = rules.map((rule) => `<li>${escapeHtml(typeof rule === 'string' ? rule : JSON.stringify(rule))}</li>`).join('');
    return `<h2>Rules</h2><div class="prose"><ul>${items}</ul></div>`;
  }
  const rows = Object.entries(rules).map(([key, value]) => `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(typeof value === 'string' ? value : JSON.stringify(value))}</td></tr>`).join('');
  return `<h2>Rules</h2><div class="table-wrap"><table><tbody>${rows}</tbody></table></div>`;
}

/** Leaderboard: the ranked entries, paged from the one fetched answer. */
export function renderLeaderboard(board, slug, shown) {
  const columns = (board.columns || []).filter((col) => !col.hidden);
  const entries = board.entries || [];
  const page = entries.slice(0, shown);
  // Interval columns are nice on desktop; on a phone they crowd the table out.
  const colClass = (col) => `${/^(judge|bytes|valid)/.test(col.key) ? 'num' : ''}${/_low$|_high$/.test(col.key) ? ' opt' : ''}`;
  const head = columns.map((col) => `<th class="${colClass(col)}">${escapeHtml(col.title)}</th>`).join('');
  const rows = page.map((entry) => {
    const cells = columns.map((col) => `<td class="${colClass(col)}">${escapeHtml(cellValue(col, entry))}</td>`).join('');
    const who = entry.handle
      ? `<a href="#/account/${escapeHtml(entry.handle)}">${escapeHtml(entry.handle)}</a>`
      : '—';
    const title = entry.title ? `<br><span class="muted small">${escapeHtml(entry.title)}</span>` : '';
    return `<tr><td class="rank">${escapeHtml(String(entry.rank ?? '—'))}</td><td>${who}${title}</td>${cells}</tr>`;
  }).join('');
  const phase = board.phase ? `${escapeHtml(board.phase.title || board.phase.key || '')}` : '';
  return `<h1>${escapeHtml(board.title || 'Leaderboard')}</h1>
  <p class="lede">${escapeHtml(board.competition ? board.competition.title : slug)}${phase ? ` · ${phase}` : ''}
  · ${plural(entries.length, 'ranked entry', 'ranked entries')}.
  <a href="#/bounty/${escapeHtml(slug)}">Back to the bounty &rarr;</a></p>
  ${rows ? `<div class="table-wrap"><table>
    <thead><tr><th>Rank</th><th>Entrant</th>${head}</tr></thead>
    <tbody>${rows}</tbody>
  </table></div>` : '<p class="notice">No ranked entries yet.</p>'}
  ${entries.length > shown ? `<button class="more" data-more="1">Show more (${entries.length - shown} left)</button>` : ''}
  <p class="small muted">Rank key: ${escapeHtml(board.rank_key || '—')}. Scores are live from the make.fun API.</p>`;
}

/** Profile: an account's public page — identity, record, and its entries. */
export function renderProfile(profile) {
  const name = profile.display_name || profile.handle;
  const avatar = profile.avatar && profile.avatar.url ? apiUrl(profile.avatar.url) : '';
  const initial = (profile.handle || '?').charAt(0).toUpperCase();
  const record = profile.record || {};
  const links = [];
  if (profile.github_login) links.push(`<a href="https://github.com/${escapeHtml(profile.github_login)}">GitHub: ${escapeHtml(profile.github_login)}</a>`);
  if (profile.x && profile.x.url) links.push(`<a href="${escapeHtml(profile.x.url)}">X: @${escapeHtml(profile.x.username || '')}</a>`);
  if (profile.discord && profile.discord.url) links.push(`<a href="${escapeHtml(profile.discord.url)}">Discord: ${escapeHtml(profile.discord.username || '')}</a>`);
  if (profile.wallet && profile.wallet.explorer_url) links.push(`<a href="${escapeHtml(profile.wallet.explorer_url)}">Wallet</a>`);
  const solutions = (profile.solutions || []).map((sol) => {
    const comp = sol.competition || {};
    const place = sol.placement ? `#${sol.placement}` : '—';
    const prize = sol.prize_usd ? usd(sol.prize_usd) : '—';
    const score = sol.score && sol.score.display ? escapeHtml(sol.score.display) : '—';
    return `<tr>
      <td><a href="#/bounty/${escapeHtml(comp.slug || '')}">${escapeHtml(comp.title || comp.slug || '—')}</a><br><span class="muted small">${escapeHtml(sol.title || '')}</span></td>
      <td class="num">${place}</td>
      <td class="num">${prize}</td>
      <td class="num">${score}</td>
      <td class="num small">${fmtDate(sol.entered_at)}</td>
    </tr>`;
  }).join('');
  return `<div class="profile-head">
    ${avatar
      ? `<img class="avatar" src="${escapeHtml(avatar)}" alt="" crossorigin="anonymous" referrerpolicy="no-referrer">`
      : `<span class="avatar-fallback" aria-hidden="true">${escapeHtml(initial)}</span>`}
    <div>
      <h1 style="margin:0">${escapeHtml(name)}</h1>
      <p class="muted" style="margin:2px 0 0">@${escapeHtml(profile.handle)}${profile.joined_at ? ` · joined ${fmtDate(profile.joined_at)}` : ''}</p>
      ${profile.bio ? `<p style="margin:6px 0 0">${escapeHtml(profile.bio)}</p>` : ''}
    </div>
  </div>
  ${links.length ? `<div class="links">${links.join('')}</div>` : ''}
  <div class="stat-grid">
    <div><b>${Number(record.competitions_entered ?? 0).toLocaleString('en-US')}</b><span>competitions entered</span></div>
    <div><b>${Number(record.competitions_placed ?? 0).toLocaleString('en-US')}</b><span>placed</span></div>
    <div><b>${Number(record.competitions_won ?? 0).toLocaleString('en-US')}</b><span>won</span></div>
    <div><b>${record.best_placement ? `#${record.best_placement}` : '—'}</b><span>best placement</span></div>
    <div><b>${usd(record.prize_usd ?? 0)}</b><span>prize money</span></div>
  </div>
  <h2>Entries</h2>
  ${solutions ? `<div class="table-wrap"><table>
    <thead><tr><th>Bounty</th><th class="num">Place</th><th class="num">Prize</th><th class="num">Score</th><th class="num">Entered</th></tr></thead>
    <tbody>${solutions}</tbody>
  </table></div>` : '<p class="notice">No public entries yet.</p>'}
  <p class="small muted">Profile on make.fun: <a href="https://make.fun/u/${escapeHtml(profile.handle)}">make.fun/u/${escapeHtml(profile.handle)}</a></p>`;
}

/** Loading and error states the router shows while a view fetches. */
export function renderLoading(label) {
  return `<p class="loading" role="status">Loading ${escapeHtml(label)}…</p>`;
}

export function renderError(message, retryHash) {
  return `<div class="error" role="alert"><p><strong>Couldn&rsquo;t load this view.</strong></p>
  <p>${escapeHtml(message)}</p>
  <p><a href="${escapeHtml(retryHash)}">Try again</a> &middot; <a href="#/">Back to the board</a></p></div>`;
}

export function renderNotFound(hash) {
  return `<h1>Nothing here</h1>
  <p class="lede">No page matches <code>${escapeHtml(hash)}</code>.</p>
  <p><a href="#/">Back to the board &rarr;</a></p>`;
}

export { BOARD_PAGE, TABLE_PAGE };

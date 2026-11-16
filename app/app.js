// Router and boot: hash routes, one view at a time, __shotReady for screenshots.
// Routes: #/ (board) · #/bounty/<slug> · #/bounty/<slug>/leaderboard · #/account/<handle> (#/u/<handle> works too).

import { getBounties, getBounty, getLeaderboard, getProfile } from './api.js';
import {
  renderBoard, renderBounty, renderError, renderLeaderboard, renderLoading,
  renderNotFound, renderProfile, BOARD_PAGE, TABLE_PAGE,
} from './views.js';

const view = document.getElementById('view');

// Board state lives here so filter/search/paging survive a re-render, not a reload.
const boardState = { filter: 'all', q: '', shown: BOARD_PAGE };
let shownRows = TABLE_PAGE;

function setReady(done) {
  window.__shotReady = done;
}

function setNav(name) {
  document.querySelectorAll('[data-nav]').forEach((link) => {
    const active = link.dataset.nav === name;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

function parseHash() {
  const hash = location.hash || '#/';
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts.length === 0) return { name: 'board' };
  if (parts[0] === 'bounty' && parts[1] && parts.length === 2) return { name: 'bounty', slug: parts[1] };
  if (parts[0] === 'bounty' && parts[1] && parts[2] === 'leaderboard') return { name: 'leaderboard', slug: parts[1] };
  if ((parts[0] === 'account' || parts[0] === 'u') && parts[1]) return { name: 'profile', handle: parts[1] };
  return { name: 'not-found', hash };
}

async function showBoard() {
  setNav('board');
  setReady(false);
  view.innerHTML = renderLoading('the bounty board');
  try {
    const data = await getBounties();
    view.innerHTML = renderBoard(data, boardState);
    wireBoard();
    setReady(true);
  } catch (err) {
    view.innerHTML = renderError(err.message, '#/');
    setReady(true);
  }
}

function wireBoard() {
  view.querySelectorAll('[data-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      boardState.filter = button.dataset.filter;
      boardState.shown = BOARD_PAGE;
      showBoard();
    });
  });
  const search = view.querySelector('.search');
  if (search) {
    search.addEventListener('input', () => {
      boardState.q = search.value;
      boardState.shown = BOARD_PAGE;
      const pos = search.selectionStart;
      showBoard().then(() => {
        const next = view.querySelector('.search');
        if (next) {
          next.focus();
          next.setSelectionRange(pos, pos);
        }
      });
    });
  }
  const more = view.querySelector('[data-more]');
  if (more) {
    more.addEventListener('click', () => {
      boardState.shown += BOARD_PAGE;
      showBoard();
    });
  }
}

async function showBounty(slug) {
  setNav('bounty');
  setReady(false);
  view.innerHTML = renderLoading(`bounty ${slug}`);
  try {
    const bounty = await getBounty(slug);
    document.title = `${bounty.title || slug} — make.fun board`;
    view.innerHTML = renderBounty(bounty);
    setReady(true);
  } catch (err) {
    view.innerHTML = renderError(err.message, `#/bounty/${encodeURIComponent(slug)}`);
    setReady(true);
  }
}

async function showLeaderboard(slug) {
  setNav('bounty');
  setReady(false);
  shownRows = TABLE_PAGE;
  view.innerHTML = renderLoading('the leaderboard');
  try {
    const board = await getLeaderboard(slug);
    document.title = `Leaderboard — ${board.competition ? board.competition.title : slug}`;
    const paint = () => {
      view.innerHTML = renderLeaderboard(board, slug, shownRows);
      const more = view.querySelector('[data-more]');
      if (more) {
        more.addEventListener('click', () => {
          shownRows += TABLE_PAGE;
          paint();
        });
      }
    };
    paint();
    setReady(true);
  } catch (err) {
    view.innerHTML = renderError(err.message, `#/bounty/${encodeURIComponent(slug)}/leaderboard`);
    setReady(true);
  }
}

async function showProfile(handle) {
  setNav('profile');
  setReady(false);
  view.innerHTML = renderLoading(`profile @${handle}`);
  try {
    const profile = await getProfile(handle);
    document.title = `@${profile.handle} — make.fun board`;
    view.innerHTML = renderProfile(profile);
    setReady(true);
  } catch (err) {
    view.innerHTML = renderError(err.status === 404 ? `No public profile for @${handle}.` : err.message, `#/account/${encodeURIComponent(handle)}`);
    setReady(true);
  }
}

async function route(navigated = true) {
  const parsed = parseHash();
  document.title = 'make.fun — bounties, leaderboards, profiles';
  if (parsed.name === 'board') await showBoard();
  else if (parsed.name === 'bounty') await showBounty(parsed.slug);
  else if (parsed.name === 'leaderboard') await showLeaderboard(parsed.slug);
  else if (parsed.name === 'profile') await showProfile(parsed.handle);
  else {
    setReady(false);
    view.innerHTML = renderNotFound(parsed.hash);
    setReady(true);
  }
  // Moving to a new view moves keyboard focus with it, so a screen reader
  // announces the new page instead of staying on the old nav link.
  if (navigated) view.focus({ preventScroll: true });
}

window.addEventListener('hashchange', () => route(true));
setReady(false);
route(true);

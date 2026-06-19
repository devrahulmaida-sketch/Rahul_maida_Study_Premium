const CONFIG = {
    PROXY: "https://rahul-study-bot.dev-rahulmaida.workers.dev"
};

let allBatches = [];
let favorites = JSON.parse(localStorage.getItem('fav-batches') || '[]');
let currentCategory = 'pw'; 
let mode = 'all'; 

let displayCount = 60;
const LOAD_STEP = 40;

const FALLBACK_LOGO = "https://i.ibb.co/RTvsC93K/bannerimage-Rahul-maida.jpg";

// --- TOKEN PROXY FIX ---
async function getFreshToken() {
    try {
        const res = await fetch(`${CONFIG.PROXY}/token`);
        const data = await res.json();
        return data.token;
    } catch(e) { 
        return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjozNjUyODI4LCJhcHBfaWQiOiIxNzcwOTgxMzQ3IiwiZGV2aWNlX2lkIjoiYzZmZTNjYWYtOWRkMS00ZTE0LTgyMGEtNGIyZDVjMjJjNDViIiwicGxhdGZvcm0iOiIzIiwidXNlcl90eXBlIjoxLCJpYXQiOjE3ODAxMjEwNjQsImV4cCI6MTc4MjcxMzA2NH0.sFVc3OuVvIfZfLkyDWbkQNmV92oRIzycNh7e-bMMck8"; 
    }
}

// --- NAVIGATION & SIDEBAR ---
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('open');
}

function switchCategory(cat, skipHash = false) {
    currentCategory = cat;
    mode = 'all';
    displayCount = 60; 
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active-nav', btn.dataset.cat === cat);
    });
    
    const labels = { 'pw': 'PW PORTAL', 'mj': 'MISSION JEET', 'nt': 'NEXT TOPPER' };
    document.getElementById('viewTitle').innerText = labels[cat];
    
    if (window.innerWidth < 1024) toggleSidebar();
    
    if (!skipHash) window.location.hash = cat;

    if (cat === 'mj') handlePortalOpen('https://eduvibe-mj.pages.dev/', true);
    else if (cat === 'nt') handlePortalOpen('https://eduvibe-nt.pages.dev/', true);
    else {
        closePortal(true);
        renderGrid(true);
    }
}

// --- UNIVERSAL ROUTING (DEEP LINKS & PERSISTENCE) ---
function updateParentUrl(path, queryParams) {
    const newUrl = `${window.location.origin}${path}${queryParams}`;
    window.history.pushState({ portalOpen: true }, '', newUrl);
}

function handlePortalOpen(url, isDirectPlatform = false, skipPush = false) {
    const portal = document.getElementById('iframePortal');
    const frame = document.getElementById('portalFrame');
    
    if (!skipPush && !isDirectPlatform) {
        window.history.pushState({ portalOpen: true }, '', window.location.href);
    }
    
    // THE HACKER BYPASS: If this is a page refresh, the browser NATIVELY remembers the deepest
    // cross-origin iframe URL and restores it automatically. If we set frame.src here, we destroy it.
    let isReload = false;
    try {
        const navs = performance.getEntriesByType("navigation");
        if (navs.length > 0 && navs[0].type === "reload") isReload = true;
    } catch(e) {}
    
    // Only set src if it's NOT a reload.
    // This allows F5 to keep the user perfectly in the deep video/subject page!
    if (!isReload) {
        frame.src = url;
    }
    
    portal.classList.add('active');
}

function forceClosePortal() {
    const portal = document.getElementById('iframePortal');
    const frame = document.getElementById('portalFrame');
    frame.src = 'about:blank';
    portal.classList.remove('active');
    
    // Go back to root on close
    window.history.pushState({}, '', '/');
    if (currentCategory !== 'pw') switchCategory('pw');
}

function closePortal(internal = false) {
    const portal = document.getElementById('iframePortal');
    const frame = document.getElementById('portalFrame');
    frame.src = 'about:blank';
    portal.classList.remove('active');
    if (!internal) window.history.pushState({}, '', '/');
}

function handleSmartBack() {
    window.history.back();
}

async function handleBatchClick(id, name) {
    const bName = encodeURIComponent(name).replace(/%20/g, '+');
    const path = '/subjects';
    const query = `?batchId=${id}&batchName=${bName}`;
    const url = `https://rarestudy.in${path}${query}`;
    
    updateParentUrl(path, query);
    handlePortalOpen(url, false, true);
}

// Read deep links on load (e.g. /stream?batchId=...)
async function loadStateFromUrl() {
    const path = window.location.pathname;
    const search = window.location.search;
    
    // If it's a known deepest link path, proxy it directly to rarestudy
    if (path.includes('/subjects') || path.includes('/content') || path.includes('/stream') || path.includes('/videos')) {
        const url = `https://rarestudy.in${path}${search}`;
        currentCategory = 'pw';
        handlePortalOpen(url, false, true);
        return;
    }

    const hash = window.location.hash.replace('#', '');
    if (hash === 'mj') {
        switchCategory('mj', true);
    } else if (hash === 'nt') {
        switchCategory('nt', true);
    } else {
        switchCategory('pw', true);
    }
}

// --- RENDERING ---
function renderGrid(resetScroll = false) {
    const grid = document.getElementById('gridContainer');
    const mainScroll = document.getElementById('mainScroll');
    
    if (currentCategory !== 'pw') return;
    if (resetScroll) mainScroll.scrollTo(0, 0);

    let list = mode === 'fav' ? allBatches.filter(b => favorites.includes(b._id || b.batch_id)) : allBatches.slice(0, displayCount);
    
    if (list.length === 0 && mode === 'fav') {
        grid.innerHTML = `<div class="col-span-full text-center py-40 opacity-40 font-black uppercase text-xs tracking-widest">No Favorites Yet</div>`;
        return;
    }

    grid.innerHTML = list.map(b => {
        const id = b._id || b.batch_id;
        const isFav = favorites.includes(id);
        const img = b.previewImage || FALLBACK_LOGO;
        
        return `
            <div class="premium-card group" onclick="handleBatchClick('${id}', '${b.name.replace(/'/g,"\\'")}')">
                <div class="card-thumb">
                    <img src="${img}" onerror="this.src='${FALLBACK_LOGO}'" loading="lazy">
                    <button onclick="event.stopPropagation(); toggleFav('${id}')" class="absolute top-3 right-3 z-10 p-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-${isFav ? 'yellow-400' : 'gray-400'} active:scale-90 transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="${isFav ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    </button>
                </div>
                <div class="card-body">
                    <h3 class="text-[10px] font-black text-gray-200 uppercase tracking-tight line-clamp-1 mb-3">${b.name}</h3>
                    <button class="w-full py-2 bg-indigo-500 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20">Enter Portal</button>
                </div>
            </div>
        `;
    }).join('');
}

document.getElementById('mainScroll').onscroll = (e) => {
    if (mode === 'fav' || currentCategory !== 'pw') return;
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 800) {
        if (displayCount < allBatches.length) {
            displayCount += LOAD_STEP;
            renderGrid(false);
        }
    }
};

function toggleFav(id) {
    if (favorites.includes(id)) favorites = favorites.filter(f => f !== id);
    else favorites.push(id);
    localStorage.setItem('fav-batches', JSON.stringify(favorites));
    renderGrid();
}

function openSearch() { document.getElementById('searchModal').classList.add('active'); document.getElementById('searchInput').focus(); }
function closeSearch() { document.getElementById('searchModal').classList.remove('active'); }

document.getElementById('searchInput').oninput = () => {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const resEl = document.getElementById('searchResults');
    if (!q) { resEl.innerHTML = ''; return; }
    
    const matches = allBatches.filter(b => b.name.toLowerCase().includes(q)).slice(0, 15);
    resEl.innerHTML = matches.map(b => `
        <div onclick="closeSearch(); handleBatchClick('${b._id || b.batch_id}', '${b.name.replace(/'/g,"\\'")}')" class="flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl cursor-pointer">
            <img src="${b.previewImage || FALLBACK_LOGO}" class="w-10 h-10 rounded-lg object-cover">
            <div class="text-xs font-black uppercase text-white">${b.name}</div>
        </div>
    `).join('');
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/batches.json');
        const data = await res.json();
        allBatches = data.batches;
        loadStateFromUrl();
    } catch (e) { console.error("Init Error"); }
    
    document.getElementById('heartBtn').onclick = () => {
        mode = mode === 'all' ? 'fav' : 'all';
        document.getElementById('heartBtn').classList.toggle('text-red-500', mode === 'fav');
        renderGrid(true);
    };

    window.addEventListener('popstate', (event) => {
        const path = window.location.pathname;
        // If the URL naturally implies the portal should be open, DO NOT force close it.
        // This fixes the bug where mobile browsers firing popstate on load throw users back to the main page.
        if (path.includes('/subjects') || path.includes('/content') || path.includes('/stream') || path.includes('/videos')) {
            return;
        }
        if (!event.state || !event.state.portalOpen) forceClosePortal();
    });

    // Attempt to sync URL if the iframe broadcasts its navigation state (Bonus feature)
    window.addEventListener('message', (event) => {
        if (event.origin.includes('rarestudy') && event.data) {
            try {
                let currentPath = '';
                if (typeof event.data === 'string' && event.data.startsWith('http')) {
                    currentPath = event.data;
                } else if (event.data.url) {
                    currentPath = event.data.url;
                }
                
                if (currentPath) {
                    const url = new URL(currentPath);
                    updateParentUrl(url.pathname, url.search);
                }
            } catch(e) {}
        }
    });
});

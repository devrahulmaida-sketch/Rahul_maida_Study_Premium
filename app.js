
let allBatches = [];
let favorites = JSON.parse(localStorage.getItem('fav-batches') || '[]');
let currentCategory = 'pw'; 
let mode = 'all'; 

const FALLBACK_LOGO = "https://i.ibb.co/RTvsC93K/bannerimage-Rahul-maida.jpg";

// --- NAVIGATION & SIDEBAR ---
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('open');
}

function switchCategory(cat) {
    currentCategory = cat;
    mode = 'all';
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active-nav', btn.dataset.cat === cat);
    });
    
    const labels = { 'pw': 'PW PORTAL', 'mj': 'MISSION JEET', 'nt': 'NEXT TOPPER' };
    document.getElementById('viewTitle').innerText = labels[cat];
    
    if (window.innerWidth < 1024) toggleSidebar();
    
    if (cat === 'mj') handlePortalOpen('https://eduvibe-mj.pages.dev/');
    else if (cat === 'nt') handlePortalOpen('https://eduvibe-nt.pages.dev/');
    else renderGrid();
}

// --- PORTAL (SMART HISTORY REDIRECT) ---
function handlePortalOpen(url) {
    const portal = document.getElementById('iframePortal');
    const frame = document.getElementById('portalFrame');
    
    // Professional History Logic
    history.pushState({ portalOpen: true }, '');
    
    frame.src = url;
    portal.classList.add('active');
}

// This function now only handles the visual closing
function forceClosePortal() {
    const portal = document.getElementById('iframePortal');
    const frame = document.getElementById('portalFrame');
    frame.src = 'about:blank';
    portal.classList.remove('active');
    if (currentCategory !== 'pw') {
        currentCategory = 'pw';
        renderGrid();
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active-nav', btn.dataset.cat === 'pw'));
        document.getElementById('viewTitle').innerText = 'PW PORTAL';
    }
}

// Floating button now uses browser back to respect internal iframe history
function handleSmartBack() {
    window.history.back();
}

function handleBatchClick(id, name) {
    const bName = encodeURIComponent(name).replace(/%20/g, '+');
    const url = `https://rarestudy.in/subjects?batchId=${id}&batchName=${bName}`;
    handlePortalOpen(url);
}

// --- RENDERING ---
function renderGrid() {
    const grid = document.getElementById('gridContainer');
    const mainScroll = document.getElementById('mainScroll');
    
    if (currentCategory !== 'pw') return;
    mainScroll.scrollTo(0, 0);

    let list = mode === 'fav' ? allBatches.filter(b => favorites.includes(b._id || b.batch_id)) : allBatches.slice(0, 100);
    
    if (list.length === 0 && mode === 'fav') {
        grid.innerHTML = `<div class="col-span-full text-center py-40 opacity-40 font-black uppercase text-xs tracking-widest">No Enrolled Batches</div>`;
        return;
    }

    grid.innerHTML = list.map(b => {
        const id = b._id || b.batch_id;
        const isFav = favorites.includes(id);
        const img = b.previewImage || FALLBACK_LOGO;
        
        return `
            <div class="premium-card group" onclick="handleBatchClick('${id}', '${b.name.replace(/'/g,"")}')">
                <div class="card-thumb">
                    <img src="${img}" onerror="this.src='${FALLBACK_LOGO}'" loading="lazy">
                    <button onclick="event.stopPropagation(); toggleFav('${id}')" class="absolute top-3 right-3 z-10 p-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-${isFav ? 'yellow-400' : 'gray-400'} active:scale-90 transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="${isFav ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    </button>
                    <div class="absolute inset-0 bg-gradient-to-t from-[#09090b] to-transparent opacity-40"></div>
                </div>
                <div class="card-body">
                    <h3 class="text-[10px] font-black text-gray-200 uppercase tracking-tight line-clamp-1 mb-3">${b.name}</h3>
                    <button class="w-full py-2 bg-indigo-500 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20">Enter Portal</button>
                </div>
            </div>
        `;
    }).join('');
}

// --- FEATURES ---
function toggleFav(id) {
    if (favorites.includes(id)) favorites = favorites.filter(f => f !== id);
    else favorites.push(id);
    localStorage.setItem('fav-batches', JSON.stringify(favorites));
    renderGrid();
}

function openSearch() { document.getElementById('searchModal').classList.add('active'); document.getElementById('searchInput').focus(); }
function closeSearch() { document.getElementById('searchModal').classList.remove('active'); }

function handleSearch() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const resEl = document.getElementById('searchResults');
    if (!q) { resEl.innerHTML = ''; return; }
    
    const matches = allBatches.filter(b => b.name.toLowerCase().includes(q)).slice(0, 15);
    resEl.innerHTML = matches.map(b => `
        <div onclick="closeSearch(); handleBatchClick('${b._id || b.batch_id}', '${b.name.replace(/'/g,"")}')" class="flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl cursor-pointer hover:border-indigo-500/50 transition-all">
            <img src="${b.previewImage || FALLBACK_LOGO}" class="w-10 h-10 rounded-lg object-cover">
            <div class="text-xs font-black uppercase text-white">${b.name}</div>
        </div>
    `).join('');
}

// --- INIT & HISTORY LISTENER ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('batches.json');
        const data = await res.json();
        allBatches = data.batches;
        renderGrid();
    } catch (e) { console.error("Init Error"); }
    
    document.getElementById('searchInput').oninput = handleSearch;
    document.getElementById('heartBtn').onclick = () => {
        mode = mode === 'all' ? 'fav' : 'all';
        document.getElementById('heartBtn').classList.toggle('text-red-500', mode === 'fav');
        renderGrid();
    };

    // SMART POPSTATE LISTENER
    window.addEventListener('popstate', (event) => {
        if (!event.state || !event.state.portalOpen) {
            forceClosePortal();
        }
    });
});


let allBatches = [];
let favorites = JSON.parse(localStorage.getItem('fav-batches') || '[]');
let currentCategory = 'pw'; 
let mode = 'all'; // all, fav

const FALLBACK_LOGO = "https://i.ibb.co/RTvsC93K/bannerimage-Rahul-maida.jpg";

// --- SIDEBAR & NAVIGATION ---
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('open');
}

function switchCategory(cat) {
    currentCategory = cat;
    mode = 'all';
    
    // Update Sidebar UI
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active-nav', btn.dataset.cat === cat);
    });
    
    // Update Header Label
    const labels = { 'pw': 'PW PORTAL', 'mj': 'MISSION JEET', 'nt': 'NEXT TOPPER' };
    document.getElementById('viewTitle').innerText = labels[cat];
    
    if (window.innerWidth < 1024) toggleSidebar();
    
    renderGrid();
}

// --- PORTAL REDIRECT LOGIC (IFRAME) ---
function openPortal(url) {
    const portal = document.getElementById('iframePortal');
    const frame = document.getElementById('portalFrame');
    
    showPreloader(true);
    frame.src = url;
    
    frame.onload = () => {
        showPreloader(false);
        portal.classList.add('active');
    };
    
    // Timeout backup
    setTimeout(() => { if (!portal.classList.contains('active')) { showPreloader(false); portal.classList.add('active'); } }, 4000);
}

function closePortal() {
    const portal = document.getElementById('iframePortal');
    const frame = document.getElementById('portalFrame');
    frame.src = 'about:blank';
    portal.classList.remove('active');
}

function handleBatchClick(id, name) {
    const bName = encodeURIComponent(name).replace(/%20/g, '+');
    // Bypassing "Portal Access Restricted" by using the Iframe redirect logic
    const url = `https://rarestudy.in/subjects?batchId=${id}&batchName=${bName}`;
    openPortal(url);
}

// --- RENDERING ---
function renderGrid() {
    const grid = document.getElementById('gridContainer');
    let list = [];

    if (currentCategory === 'pw') {
        list = mode === 'fav' ? allBatches.filter(b => favorites.includes(b._id || b.batch_id)) : allBatches.slice(0, 80);
    } else if (currentCategory === 'mj') {
        // Mission Jeet specialized view or direct portal
        openPortal('https://eduvibe-mj.pages.dev/');
        return;
    } else if (currentCategory === 'nt') {
        // Next Topper specialized view or direct portal
        openPortal('https://eduvibe-nt.pages.dev/');
        return;
    }

    if (list.length === 0 && mode === 'fav') {
        grid.innerHTML = `<div class="col-span-full text-center py-40 opacity-40 font-black uppercase tracking-[0.3em] text-xs">No Favorites Found</div>`;
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
                    <button onclick="event.stopPropagation(); toggleFav('${id}')" class="absolute top-4 right-4 z-10 p-2.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-${isFav ? 'yellow-400' : 'gray-400'} hover:scale-110 transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="${isFav ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    </button>
                    <div class="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent opacity-60"></div>
                </div>
                <div class="card-body">
                    <h3 class="text-[11px] font-black text-gray-100 uppercase tracking-tight line-clamp-1 mb-4 group-hover:text-indigo-400 transition-colors">${b.name}</h3>
                    <button class="w-full py-3 bg-white/5 rounded-2xl text-[9px] font-black uppercase tracking-widest group-hover:bg-indigo-600 group-hover:text-white transition-all">Launch Portal</button>
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

function toggleSearch() {
    const el = document.getElementById('searchOverlay');
    el.classList.toggle('hidden');
    el.classList.toggle('flex');
    if (!el.classList.contains('hidden')) document.getElementById('searchInput').focus();
}

function handleSearch() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const results = document.getElementById('searchResults');
    if (!q) { results.innerHTML = ''; return; }
    
    const matches = allBatches.filter(b => b.name.toLowerCase().includes(q)).slice(0, 15);
    results.innerHTML = matches.map(b => `
        <div onclick="toggleSearch(); handleBatchClick('${b._id || b.batch_id}', '${b.name.replace(/'/g,"")}')" class="flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl cursor-pointer hover:border-indigo-500/50 transition-all">
            <img src="${b.previewImage || FALLBACK_LOGO}" class="w-12 h-12 rounded-xl object-cover">
            <div><p class="text-xs font-black text-white uppercase tracking-tight">${b.name}</p><p class="text-[9px] text-gray-500 font-bold uppercase mt-1">Ready to Study</p></div>
        </div>
    `).join('');
}

function showPreloader(show) { document.getElementById('globalPreloader').style.display = show ? 'flex' : 'none'; }

// --- INIT ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('batches.json');
        const data = await res.json();
        allBatches = data.batches;
        renderGrid();
    } catch (e) { console.error("Init Error"); }
    
    showPreloader(false);
    document.getElementById('searchInput').oninput = handleSearch;
    document.getElementById('heartBtn').onclick = () => {
        mode = mode === 'all' ? 'fav' : 'all';
        document.getElementById('heartBtn').classList.toggle('text-red-500', mode === 'fav');
        renderGrid();
    };
});

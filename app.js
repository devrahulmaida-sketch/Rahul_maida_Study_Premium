
let allBatches = [];
let favorites = JSON.parse(localStorage.getItem('fav-batches') || '[]');
let currentCategory = 'pw'; 
let mode = 'all'; 

// Pagination State
let displayCount = 60;
const LOAD_STEP = 40;

const FALLBACK_LOGO = "https://i.ibb.co/RTvsC93K/bannerimage-Rahul-maida.jpg";

// --- NAVIGATION & SIDEBAR ---
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('open');
}

function switchCategory(cat) {
    currentCategory = cat;
    mode = 'all';
    displayCount = 60; 
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active-nav', btn.dataset.cat === cat);
    });
    
    const labels = { 'pw': 'PW PORTAL', 'mj': 'MISSION JEET', 'nt': 'NEXT TOPPER' };
    document.getElementById('viewTitle').innerText = labels[cat];
    
    if (window.innerWidth < 1024) toggleSidebar();
    
    if (cat === 'mj') handlePortalOpen('https://eduvibe-mj.pages.dev/');
    else if (cat === 'nt') handlePortalOpen('https://eduvibe-nt.pages.dev/');
    else renderGrid(true);
}

// --- PORTAL (SMART HISTORY REDIRECT) ---
function handlePortalOpen(url) {
    const portal = document.getElementById('iframePortal');
    const frame = document.getElementById('portalFrame');
    history.pushState({ portalOpen: true }, '');
    frame.src = url;
    portal.classList.add('active');
}

function forceClosePortal() {
    const portal = document.getElementById('iframePortal');
    const frame = document.getElementById('portalFrame');
    frame.src = 'about:blank';
    portal.classList.remove('active');
    if (currentCategory !== 'pw') switchCategory('pw');
}

function handleSmartBack() {
    window.history.back();
}

function handleBatchClick(id, name) {
    const bName = encodeURIComponent(name).replace(/%20/g, '+');
    const url = `https://rarestudy.in/subjects?batchId=${id}&batchName=${bName}`;
    handlePortalOpen(url);
}

// --- POPUP SYSTEM (Front-page, First-time, 24h Mute) ---
function checkAndShowPopup() {
    if (localStorage.getItem('joined_community')) return;
    
    const mutedUntil = localStorage.getItem('popup_muted_until');
    if (mutedUntil && Date.now() < parseInt(mutedUntil)) return;

    // Show after 4 seconds on front page
    setTimeout(showJoinPopup, 4000);
}

function showJoinPopup() {
    if (document.getElementById('communityPopup') || currentCategory !== 'pw') return;
    const popup = document.createElement('div');
    popup.id = 'communityPopup';
    popup.className = "fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300";
    popup.innerHTML = `
        <div class="bg-[#111114] border border-white/10 rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-500">
            <div class="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.185-.573c.948.527 1.927.817 3.141.817 3.181 0 5.767-2.587 5.768-5.766 0-3.181-2.587-5.768-5.766-5.768zm3.391 8.247c-.146.415-.852.797-1.157.846-.305.048-.682.08-2.116-.512-1.71-.713-2.807-2.448-2.891-2.56-.085-.113-.691-.921-.691-1.756 0-.835.439-1.246.596-1.411.158-.165.341-.205.454-.205s.227 0 .326.005c.106.005.25.039.39.39.141.35.484 1.179.527 1.265.042.085.07.184.013.298-.057.113-.085.184-.171.283-.085.1-.184.223-.263.303-.095.094-.194.195-.084.364.111.168.49 1.103.733 1.341.312.304.577.34.733.415.158.077.25.066.341-.039.091-.106.39-.454.496-.61.106-.156.213-.131.36-.073.146.057.927.437 1.086.516.159.079.265.118.305.186.04.068.04.394-.106.809z"/></svg>
            </div>
            <h3 class="text-xl font-black text-white mb-2 italic uppercase tracking-tighter">Join Community</h3>
            <p class="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-8 leading-loose">Get latest batch updates & premium support instantly</p>
            <div class="space-y-3">
                <button onclick="joinCommunity()" class="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-green-600/20 transition-all">Join Now</button>
                <div class="grid grid-cols-2 gap-3">
                    <button onclick="mutePopup24h()" class="py-3 bg-white/5 hover:bg-white/10 text-gray-500 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all">Mute 24h</button>
                    <button onclick="closeJoinPopup()" class="py-3 bg-white/5 hover:bg-white/10 text-gray-500 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all">Later</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(popup);
}

function closeJoinPopup() {
    const el = document.getElementById('communityPopup');
    if (el) el.remove();
}

function joinCommunity() {
    window.open("https://whatsapp.com/channel/0029Vb86VfU8V0tmM9KqqT2c", "_blank");
    localStorage.setItem('joined_community', 'true');
    closeJoinPopup();
}

function mutePopup24h() {
    const tomorrow = Date.now() + (24 * 60 * 60 * 1000);
    localStorage.setItem('popup_muted_until', tomorrow.toString());
    closeJoinPopup();
}

// --- RENDERING & INFINITE SCROLL ---
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
            <div class="premium-card group" onclick="handleBatchClick('${id}', '${b.name.replace(/'/g,"")}')">
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

function handleSearch() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const resEl = document.getElementById('searchResults');
    if (!q) { resEl.innerHTML = ''; return; }
    
    const matches = allBatches.filter(b => b.name.toLowerCase().includes(q)).slice(0, 15);
    resEl.innerHTML = matches.map(b => `
        <div onclick="closeSearch(); handleBatchClick('${b._id || b.batch_id}', '${b.name.replace(/'/g,"")}')" class="flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl cursor-pointer">
            <img src="${b.previewImage || FALLBACK_LOGO}" class="w-10 h-10 rounded-lg object-cover">
            <div class="text-xs font-black uppercase text-white">${b.name}</div>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('batches.json');
        const data = await res.json();
        allBatches = data.batches;
        renderGrid(true);
        checkAndShowPopup();
    } catch (e) { console.error("Init Error"); }
    
    document.getElementById('searchInput').oninput = handleSearch;
    document.getElementById('heartBtn').onclick = () => {
        mode = mode === 'all' ? 'fav' : 'all';
        document.getElementById('heartBtn').classList.toggle('text-red-500', mode === 'fav');
        renderGrid(true);
    };

    window.addEventListener('popstate', (event) => {
        if (!event.state || !event.state.portalOpen) forceClosePortal();
    });
});


let allBatches = [];
let favorites = JSON.parse(localStorage.getItem('fav-batches') || '[]');
let currentTheme = localStorage.getItem('theme-mode') || 'dark';
let displayCount = 60;
const LOAD_STEP = 40;
let mode = 'all';

// --- INVISIBLE REDIRECT LOGIC ---
function openBatch(id, name) {
    const bName = encodeURIComponent(name);
    const targetUrl = `https://studypanda.in/study-v2/batches/${id}?name=${bName}`;
    const container = document.getElementById('iframeContainer');
    const iframe = document.getElementById('studyIframe');
    
    // Show container immediately to avoid white screen lag
    container.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    showPreloader(true);
    
    iframe.src = targetUrl;
    iframe.onload = () => showPreloader(false);
    
    // Fallback if onload doesn't fire
    setTimeout(() => showPreloader(false), 4000);
}

function closeIframe() {
    const container = document.getElementById('iframeContainer');
    const iframe = document.getElementById('studyIframe');
    iframe.src = 'about:blank'; // Clear it to stop video/audio
    container.style.display = 'none';
    document.body.style.overflow = '';
    
    // Force re-render of batches to ensure they are visible
    renderBatchGrid();
}

// --- RENDERING ---
function renderBatchGrid() {
    const grid = document.getElementById('batchGrid');
    const list = mode === 'fav' ? allBatches.filter(b => favorites.includes(b._id || b.batch_id)) : allBatches.slice(0, displayCount);
    
    if (list.length === 0 && mode === 'fav') {
        grid.innerHTML = `<div class="col-span-full text-center py-20 text-gray-500 font-bold uppercase text-xs">No Enrolled Batches</div>`;
        return;
    }

    grid.innerHTML = list.map(b => {
        const id = b._id || b.batch_id;
        const isFav = favorites.includes(id);
        return `
            <div class="card border-white/5 bg-gray-900/40">
                <button onclick="event.stopPropagation(); toggleFav('${id}')" class="absolute top-3 right-3 z-10 p-2 rounded-xl bg-black/60 backdrop-blur-md text-${isFav ? 'yellow-400' : 'white'} hover:scale-110 transition-all"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="${isFav ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l2.07 6.223a1 1 0 00.95.69h6.544c.969 0 1.371 1.24.588 1.81l-5.297 3.848a1 1 0 00-.364 1.118l2.07 6.223c.3.921-.755 1.688-1.54 1.118l-5.297-3.848a1 1 0 00-1.175 0l-5.297 3.848c-.784.57-1.838-.197-1.539-1.118l2.07-6.223a1 1 0 00-.364-1.118L2.244 11.65c-.783-.57-.38-1.81.588-1.81h6.544a1 1 0 00.95-.69l2.07-6.223z" /></svg></button>
                <div onclick="openBatch('${id}', '${b.name.replace(/'/g,"")}')">
                    <div class="card-img-wrap h-32 bg-black"><img src="${b.previewImage}" class="card-img opacity-80" loading="lazy"></div>
                    <div class="card-content p-4"><div class="card-title text-sm font-black uppercase text-gray-100">${b.name}</div></div>
                    <div class="px-4 pb-4"><button class="action-btn w-full rounded-xl font-black">ENTER PORTAL</button></div>
                </div>
            </div>
        `;
    }).join('');
}

window.onscroll = () => {
    if (mode === 'fav') return;
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
        if (displayCount < allBatches.length) {
            displayCount += LOAD_STEP;
            renderBatchGrid();
        }
    }
};

// --- MISC ---
function applyTheme(theme) { document.body.classList.toggle('dark-mode', theme === 'dark'); localStorage.setItem('theme-mode', theme); }
function showPreloader(show) { document.getElementById('globalPreloader').style.display = show ? 'flex' : 'none'; }

function toggleFav(id) {
    if (favorites.includes(id)) favorites = favorites.filter(f => f !== id);
    else favorites.push(id);
    localStorage.setItem('fav-batches', JSON.stringify(favorites));
    renderBatchGrid();
}

function handleSearch() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const results = document.getElementById('searchResults');
    if (!q) { results.innerHTML = ''; return; }
    const filtered = allBatches.filter(b => b.name.toLowerCase().includes(q)).slice(0, 15);
    results.innerHTML = filtered.map(b => `
        <div class="flex items-center gap-3 p-3 hover:bg-white/10 rounded-lg cursor-pointer" onclick="document.getElementById('searchModal').classList.remove('active'); openBatch('${b._id || b.batch_id}', '${b.name.replace(/'/g,"")}')">
            <img src="${b.previewImage}" class="w-10 h-10 rounded object-cover">
            <div class="text-white font-bold text-xs uppercase">${b.name}</div>
        </div>
    `).join('');
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', async () => {
    applyTheme(currentTheme);
    try {
        const res = await fetch('batches.json');
        const data = await res.json();
        allBatches = data.batches;
        renderBatchGrid();
    } catch (e) { console.error("Init failed"); }
    showPreloader(false);

    document.getElementById('favToggleBtn').onclick = (e) => {
        mode = mode === 'fav' ? 'all' : 'fav';
        e.currentTarget.classList.toggle('text-indigo-500', mode === 'fav');
        renderBatchGrid();
    };
    document.getElementById('themeBtn').onclick = () => document.getElementById('themeModal').classList.add('active');
    document.getElementById('searchBtn').onclick = () => document.getElementById('searchModal').classList.add('active');
    document.getElementById('searchInput').oninput = handleSearch;
    document.querySelectorAll('.theme-card').forEach(card => card.onclick = () => { applyTheme(card.dataset.theme); document.getElementById('themeModal').classList.remove('active'); });
    window.onclick = (e) => { if (['themeModal','searchModal'].includes(e.target.id)) e.target.classList.remove('active'); };
});

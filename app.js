
let allBatches = [];
let currentTheme = localStorage.getItem('theme-mode') || 'dark';
let displayCount = 80;
const LOAD_STEP = 40;

// --- INVISIBLE REDIRECT LOGIC ---
function openBatch(id, name) {
    const bName = encodeURIComponent(name).replace(/%20/g,'+');
    const targetUrl = `https://stream.testuk.org/subjects?batchId=${id}&batchName=${bName}`;
    
    const container = document.getElementById('iframeContainer');
    const iframe = document.getElementById('studyIframe');
    
    iframe.src = targetUrl;
    container.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    console.log("Opening in Iframe:", targetUrl);
}

function closeIframe() {
    const container = document.getElementById('iframeContainer');
    const iframe = document.getElementById('studyIframe');
    iframe.src = 'about:blank';
    container.style.display = 'none';
    document.body.style.overflow = '';
}

// --- UI RENDERING ---
function renderBatchGrid() {
    const grid = document.getElementById('batchGrid');
    const items = allBatches.slice(0, displayCount);
    
    grid.innerHTML = items.map(b => {
        const id = b._id || b.batch_id;
        return `
            <div class="card" onclick="openBatch('${id}', '${b.name.replace(/'/g,"")}')">
                <div class="card-img-wrap h-32 bg-black"><img src="${b.previewImage}" class="card-img opacity-80" loading="lazy"></div>
                <div class="card-content p-4">
                    <div class="card-title text-sm font-black uppercase text-gray-100">${b.name}</div>
                </div>
                <div class="px-4 pb-4"><button class="action-btn w-full rounded-xl font-black">ENTER PORTAL</button></div>
            </div>
        `;
    }).join('');
}

window.onscroll = () => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
        if (displayCount < allBatches.length) {
            displayCount += LOAD_STEP;
            renderBatchGrid();
        }
    }
};

// --- THEME & SEARCH ---
function applyTheme(theme) {
    document.body.classList.toggle('dark-mode', theme === 'dark');
    localStorage.setItem('theme-mode', theme);
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
    } catch (e) { console.error("Data error"); }

    document.getElementById('globalPreloader').style.display = 'none';
    document.getElementById('themeBtn').onclick = () => document.getElementById('themeModal').classList.add('active');
    document.getElementById('searchBtn').onclick = () => document.getElementById('searchModal').classList.add('active');
    document.getElementById('searchInput').oninput = handleSearch;
    document.querySelectorAll('.theme-card').forEach(card => card.onclick = () => { applyTheme(card.dataset.theme); document.getElementById('themeModal').classList.remove('active'); });
    window.onclick = (e) => { if (['themeModal','searchModal'].includes(e.target.id)) e.target.classList.remove('active'); };
});

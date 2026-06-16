
let allBatches = [];
let currentTheme = localStorage.getItem('theme-mode') || 'dark';

// Theme Logic
function applyTheme(theme) {
    const body = document.body;
    const themeClasses = ["sandalwood-mode", "forest-emerald", "ocean-deep", "sakura-blossom", "dracula-midnight", "lavender-mist", "cyberpunk-neon", "dark-mode", "dark", "light"];
    themeClasses.forEach(c => body.classList.remove(c));
    
    if (theme === 'light') {
        body.classList.add('light');
    } else {
        body.classList.add('dark', 'dark-mode');
        if (theme !== 'dark') body.classList.add(theme + (theme === 'sandalwood' ? '-mode' : ''));
    }
    
    localStorage.setItem('theme-mode', theme);
    document.querySelectorAll('.theme-card').forEach(card => {
        card.classList.toggle('active', card.dataset.theme === theme);
    });
}

// Redirect Helper
function openBatch(id, name) {
    const bName = encodeURIComponent(name).replace(/%20/g,'+');
    window.location.href = `https://stream.testuk.org/subjects?batchId=${id}&batchName=${bName}`;
}

// UI Rendering
function renderBatches(batches) {
    const grid = document.getElementById('batchGrid');
    grid.innerHTML = batches.map(b => {
        const id = b._id || b.batch_id;
        return `
            <div class="card" onclick="openBatch('${id}', '${b.name}')">
                <div class="card-img-wrap">
                    <img src="${b.previewImage || 'https://i.ibb.co/RTvsC93K/bannerimage-Rahul-maida.jpg'}" class="card-img" loading="lazy" onerror="this.src='https://i.ibb.co/RTvsC93K/bannerimage-Rahul-maida.jpg'">
                </div>
                <div class="card-content">
                    <div class="card-title">${b.name}</div>
                    <div class="text-xs text-gray-400 mb-4">${b.byName || ''}</div>
                    <div class="action-btn">ENTER BATCH</div>
                </div>
            </div>
        `;
    }).join('');
}

async function loadBatches() {
    try {
        const res = await fetch('batches.json');
        const data = await res.json();
        allBatches = data.batches;
        renderBatches(allBatches);
    } catch (e) {
        console.error("Failed to load batches:", e);
    } finally {
        document.getElementById('globalPreloader').style.display = 'none';
    }
}

// Fuzzy Search Logic
function handleSearch() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const results = document.getElementById('searchResults');
    
    if (!q) {
        results.innerHTML = '';
        return;
    }

    const filtered = allBatches.filter(b => b.name.toLowerCase().includes(q));
    results.innerHTML = filtered.map(b => `
        <div class="flex items-center gap-3 p-3 hover:bg-white/10 rounded-lg cursor-pointer" onclick="openBatch('${b._id || b.batch_id}', '${b.name}')">
            <img src="${b.previewImage}" class="w-12 h-12 rounded object-cover">
            <div>
                <div class="text-white font-bold text-sm">${b.name}</div>
                <div class="text-gray-400 text-xs">${b.language}</div>
            </div>
        </div>
    `).join('');
}

function closeSearchModal() {
    document.getElementById('searchModal').classList.remove('active');
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    applyTheme(currentTheme);
    loadBatches();

    document.getElementById('themeBtn').onclick = () => document.getElementById('themeModal').classList.add('active');
    document.getElementById('closeTheme').onclick = () => document.getElementById('themeModal').classList.remove('active');
    
    document.getElementById('searchBtn').onclick = () => document.getElementById('searchModal').classList.add('active');
    document.getElementById('closeSearch').onclick = closeSearchModal;
    document.getElementById('searchInput').oninput = handleSearch;

    document.querySelectorAll('.theme-card').forEach(card => {
        card.onclick = () => {
            applyTheme(card.dataset.theme);
            document.getElementById('themeModal').classList.remove('active');
        };
    });

    window.onclick = (e) => {
        if (e.target.id === 'themeModal') document.getElementById('themeModal').classList.remove('active');
        if (e.target.id === 'searchModal') closeSearchModal();
    };
});

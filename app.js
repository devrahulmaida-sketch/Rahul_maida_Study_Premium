
const CONFIG = {
    API_BEARER: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE3ODE3MDM2NTYuMzE1LCJkYXRhIjp7Il9pZCI6IjY5YjRmN2RhMGQyOTk0ZjE3MTliMjBlMCIsInVzZXJuYW1lIjoiODcyNjgzMjk0MiIsImZpcnN0TmFtZSI6Ik5pa2hpbCIsImxhc3ROYW1lIjoiIiwib3JnYW5pemF0aW9uIjp7Il9pZCI6IjVlYjM5M2VlOTVmYWI3NDY4YTc5ZDE4OSIsIndlYnNpdGUiOiJwaHlzaWNzd2FsbGFoLmNvbSIsIm5hbWUiOiJQaHlzaWNzd2FsbGFoIn0sInJvbGVzIjpbIjViMjdiZDk2NTg0MmY5NTBhNzc4YzZlZiJdLCJjb3VudHJ5R3JvdXAiOiJJTiIsIm9uZVJvbGVzIjpbXSwidHlwZSI6IlVTRVIifSwianRpIjoiOFBwa2RRejdRN3VWa0wyNXNtSmJFd182OWI0ZjdkYTBkMjk5NGYxNzE5YjIwZTAiLCJpYXQiOjE3ODEwOTg4NTZ9.5vM0jZUjaeVWr_EwW2bmgdlPXBgcOXVlDAIQ95Y6ezw",
    CLIENT_ID: "5eb393ee95fab7468a79d189",
    SENDER_ID: "766499830677",
    WORKER_URL: "https://rahul-study-bot.dev-rahulmaida.workers.dev",
    DELTA_API: "https://apiserver.deltastudy.site/api/pw"
};

let allBatches = [];
let favorites = JSON.parse(localStorage.getItem('fav-batches') || '[]');
let lastAnnouncements = JSON.parse(localStorage.getItem('last-announcements') || '{}');
let mode = 'all'; 
let currentTheme = localStorage.getItem('theme-mode') || 'dark';

let announcementCache = {};
let liveStatusCache = {};
let displayCount = 60;
const LOAD_STEP = 40;
let hls = null;

function applyTheme(theme) {
    const body = document.body;
    body.classList.remove('dark-mode', 'light');
    if (theme === 'light') body.classList.add('light');
    else body.classList.add('dark-mode');
    localStorage.setItem('theme-mode', theme);
    document.querySelectorAll('.theme-card').forEach(card => card.classList.toggle('active', card.dataset.theme === theme));
}

async function toggleFav(id) {
    if (favorites.includes(id)) {
        favorites = favorites.filter(f => f !== id);
    } else {
        favorites.push(id);
        if ("Notification" in window) {
            const permission = await Notification.requestPermission();
            if (permission === "granted") {
                fetch(`${CONFIG.WORKER_URL}/register?batchId=${id}`).catch(e => {});
            }
        }
        checkAnnouncementsForBatch(id);
    }
    localStorage.setItem('fav-batches', JSON.stringify(favorites));
    renderBatches();
}

function openBatch(id, name) {
    const bName = encodeURIComponent(name).replace(/%20/g,'+');
    window.location.href = `https://stream.testuk.org/subjects?batchId=${id}&batchName=${bName}`;
}

async function getLiveStatus(batchId) {
    if (liveStatusCache[batchId] !== undefined) return liveStatusCache[batchId];
    try {
        const res = await fetch(`${CONFIG.DELTA_API}/live`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ batchId })
        });
        const data = await res.json();
        const isLive = data.data?.some(item => item.lectureType === 'LIVE');
        liveStatusCache[batchId] = isLive || false;
        return isLive;
    } catch (e) { return false; }
}

async function fetchAnnouncements(id) {
    if (announcementCache[id]) return announcementCache[id];
    try {
        const url = `https://api.penpencil.co/v1/batches/${id}/announcement?page=1`;
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${CONFIG.API_BEARER}`, 'Client-Id': CONFIG.CLIENT_ID, 'Client-Type': 'WEB' }
        });
        const data = await res.json();
        if (data.success) {
            const list = Array.isArray(data.data) ? data.data : (data.data?.data || []);
            announcementCache[id] = list;
            return list;
        }
    } catch (e) { console.error(e); }
    return [];
}

async function checkAnnouncementsForBatch(id) {
    const announcements = await fetchAnnouncements(id);
    if (announcements.length > 0) {
        const latest = announcements[0];
        const batch = allBatches.find(b => (b._id || b.batch_id) === id);
        if (lastAnnouncements[id] !== latest._id) {
            showAnnouncementModal(batch?.name || 'Batch Update', latest);
            lastAnnouncements[id] = latest._id;
            localStorage.setItem('last-announcements', JSON.stringify(lastAnnouncements));
        }
    }
}

function showAnnouncementModal(batchName, announcement) {
    const modal = document.getElementById('announcementModal');
    document.getElementById('notifBatchLabel').innerText = batchName;
    document.getElementById('notifHeading').innerText = announcement.heading || 'Update';
    document.getElementById('notifFullText').innerText = announcement.announcement;
    const imgContainer = document.getElementById('notifImageContainer');
    if (announcement.attachment?.key) {
        document.getElementById('notifFullImage').src = announcement.attachment.baseUrl + announcement.attachment.key;
        imgContainer.classList.remove('hidden');
    } else imgContainer.classList.add('hidden');
    modal.classList.add('active');
}

async function showRecentNotices(id, batchName) {
    const modal = document.getElementById('historyModal');
    const content = document.getElementById('historyContent');
    content.innerHTML = '<div class="text-center py-10 animate-pulse text-indigo-500 font-bold">Checking Official PW Notices...</div>';
    modal.classList.add('active');

    const announcements = await fetchAnnouncements(id);
    const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
    const recent = announcements.filter(a => new Date(a.createdAt).getTime() > threeDaysAgo);

    if (recent.length === 0) {
        content.innerHTML = `<div class="text-center py-10 text-gray-500 font-bold">No updates in 3 days.<br><button onclick="renderAllHistory('${id}')" class="mt-4 text-indigo-400 underline text-xs">VIEW FULL HISTORY</button></div>`;
    } else renderHistoryContent(recent);
}

function renderHistoryContent(data) {
    const content = document.getElementById('historyContent');
    content.innerHTML = data.map(ann => `
        <div class="bg-secondary p-4 rounded-xl border border-border-gray mb-3">
            <div class="flex justify-between items-start mb-2">
                <span class="text-[9px] font-bold text-indigo-500 uppercase">${new Date(ann.createdAt).toLocaleString()}</span>
                <h4 class="font-bold text-xs">${ann.heading || 'Update'}</h4>
            </div>
            <p class="text-[11px] text-gray-300 leading-relaxed">${ann.announcement}</p>
            ${ann.attachment ? `<img src="${ann.attachment.baseUrl + ann.attachment.key}" class="mt-3 rounded-lg w-full h-40 object-cover">` : ''}
        </div>
    `).join('');
}

async function renderAllHistory(id) {
    const announcements = await fetchAnnouncements(id);
    renderHistoryContent(announcements);
}

async function renderBatches() {
    const grid = document.getElementById('batchGrid');
    const list = mode === 'fav' ? allBatches.filter(b => favorites.includes(b._id || b.batch_id)) : allBatches.slice(0, displayCount);
    
    if (list.length === 0 && mode === 'fav') {
        grid.innerHTML = `<div class="col-span-full text-center py-20 text-gray-500 font-bold tracking-widest uppercase text-xs">No Enrolled Batches</div>`;
        return;
    }

    const cardsHtml = await Promise.all(list.map(async b => {
        const id = b._id || b.batch_id;
        const isFav = favorites.includes(id);
        const img = b.previewImage || 'https://i.ibb.co/RTvsC93K/bannerimage-Rahul-maida.jpg';
        
        let liveTag = '';
        if (mode === 'fav') {
            const isLive = await getLiveStatus(id);
            if (isLive) liveTag = `<div class="live-badge">LIVE NOW</div>`;
        }

        return `
            <div class="card flex flex-col h-full animate-fadeIn relative">
                ${liveTag}
                <div class="relative">
                    <button onclick="toggleFav('${id}')" class="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/50 backdrop-blur-md text-${isFav ? 'yellow-400' : 'white'} hover:scale-110 transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="${isFav ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l2.07 6.223a1 1 0 00.95.69h6.544c.969 0 1.371 1.24.588 1.81l-5.297 3.848a1 1 0 00-.364 1.118l2.07 6.223c.3.921-.755 1.688-1.54 1.118l-5.297-3.848a1 1 0 00-1.175 0l-5.297 3.848c-.784.57-1.838-.197-1.539-1.118l2.07-6.223a1 1 0 00-.364-1.118L2.244 11.65c-.783-.57-.38-1.81.588-1.81h6.544a1 1 0 00.95-.69l2.07-6.223z" /></svg>
                    </button>
                    <div onclick="openBatch('${id}', '${b.name}')" class="cursor-pointer">
                        <div class="card-img-wrap h-32"><img src="${img}" class="card-img" loading="lazy"></div>
                        <div class="card-content p-3">
                            <div class="card-title text-sm line-clamp-2 h-10 font-bold">${b.name}</div>
                        </div>
                    </div>
                </div>
                <div class="mt-auto p-3 pt-0 flex gap-2">
                    ${mode === 'fav' ? `
                        <button onclick="showRecentNotices('${id}', '${b.name}')" class="flex-1 p-2 rounded-lg text-[9px] font-bold bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all uppercase">NOTICES</button>
                    ` : `
                        <button onclick="openBatch('${id}', '${b.name}')" class="action-btn w-full uppercase">ENTER</button>
                    `}
                </div>
            </div>
        `;
    }));
    grid.innerHTML = cardsHtml.join('');
}

window.onscroll = () => {
    if (mode === 'fav') return;
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
        if (displayCount < allBatches.length) {
            displayCount += LOAD_STEP;
            renderBatches();
        }
    }
};

async function init() {
    try {
        const res = await fetch('batches.json');
        const data = await res.json();
        allBatches = data.batches;
        renderBatches();
        favorites.forEach(id => checkAnnouncementsForBatch(id));
        if ('serviceWorker' in navigator) navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(e => {});
    } catch (e) { console.error(e); }
    finally { document.getElementById('globalPreloader').style.display = 'none'; }
}

function handleSearch() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const results = document.getElementById('searchResults');
    if (!q) { results.innerHTML = ''; return; }
    const filtered = allBatches.filter(b => b.name.toLowerCase().includes(q)).slice(0, 15);
    results.innerHTML = filtered.map(b => `
        <div class="flex items-center gap-3 p-3 hover:bg-white/10 rounded-lg cursor-pointer" onclick="closeSearchModal(); openBatch('${b._id || b.batch_id}', '${b.name}')">
            <img src="${b.previewImage}" class="w-10 h-10 rounded object-cover">
            <div class="text-white font-bold text-xs">${b.name}</div>
        </div>
    `).join('');
}

function closeSearchModal() { document.getElementById('searchModal').classList.remove('active'); }

document.addEventListener('DOMContentLoaded', () => {
    applyTheme(currentTheme);
    init();
    document.getElementById('favToggleBtn').onclick = (e) => {
        mode = mode === 'fav' ? 'all' : 'fav';
        e.currentTarget.classList.toggle('text-indigo-500', mode === 'fav');
        displayCount = 60;
        window.scrollTo(0,0);
        renderBatches();
    };
    document.getElementById('themeBtn').onclick = () => document.getElementById('themeModal').classList.add('active');
    document.getElementById('closeTheme').onclick = () => document.getElementById('themeModal').classList.remove('active');
    document.getElementById('searchBtn').onclick = () => document.getElementById('searchModal').classList.add('active');
    document.getElementById('searchInput').oninput = handleSearch;

    document.querySelectorAll('.theme-card').forEach(card => {
        card.onclick = () => { applyTheme(card.dataset.theme); document.getElementById('themeModal').classList.remove('active'); };
    });

    window.onclick = (e) => {
        if (['themeModal','searchModal','announcementModal','historyModal'].includes(e.target.id)) e.target.classList.remove('active');
    };

    setInterval(() => favorites.forEach(id => checkAnnouncementsForBatch(id)), 300000);
});

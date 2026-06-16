
const CONFIG = {
    API_BEARER: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE3ODE3MDM2NTYuMzE1LCJkYXRhIjp7Il9pZCI6IjY5YjRmN2RhMGQyOTk0ZjE3MTliMjBlMCIsInVzZXJuYW1lIjoiODcyNjgzMjk0MiIsImZpcnN0TmFtZSI6Ik5pa2hpbCIsImxhc3ROYW1lIjoiIiwib3JnYW5pemF0aW9uIjp7Il9pZCI6IjVlYjM5M2VlOTVmYWI3NDY4YTc5ZDE4OSIsIndlYnNpdGUiOiJwaHlzaWNzd2FsbGFoLmNvbSIsIm5hbWUiOiJQaHlzaWNzd2FsbGFoIn0sInJvbGVzIjpbIjViMjdiZDk2NTg0MmY5NTBhNzc4YzZlZiJdLCJjb3VudHJ5R3JvdXAiOiJJTiIsIm9uZVJvbGVzIjpbXSwidHlwZSI6IlVTRVIifSwianRpIjoiOFBwa2RRejdRN3VWa0wyNXNtSmJFd182OWI0ZjdkYTBkMjk5NGYxNzE5YjIwZTAiLCJpYXQiOjE3ODEwOTg4NTZ9.5vM0jZUjaeVWr_EwW2bmgdlPXBgcOXVlDAIQ95Y6ezw",
    CLIENT_ID: "5eb393ee95fab7468a79d189",
    SENDER_ID: "766499830677",
    WORKER_URL: "https://rahul-study-bot.dev-rahulmaida.workers.dev",
    DELTA_API: "https://apiserver.deltastudy.site/api/pw"
};

let state = {
    view: 'batches', // batches, subjects, topics, contents
    currentBatch: null,
    currentSubject: null,
    currentTopic: null,
    batchTitle: '',
    subjectTitle: '',
    history: []
};

let allBatches = [];
let favorites = JSON.parse(localStorage.getItem('fav-batches') || '[]');
let lastAnnouncements = JSON.parse(localStorage.getItem('last-announcements') || '{}');
let mode = 'all'; 
let currentTheme = localStorage.getItem('theme-mode') || 'dark';

let displayCount = 60;
const LOAD_STEP = 40;
let hls = null;

// --- SPA NAVIGATION ---
function navigate(view, params = {}) {
    state.history.push({ ...state, history: [] }); // Save snapshot
    state.view = view;
    Object.assign(state, params);
    render();
    window.scrollTo(0,0);
}

function goBack() {
    if (state.history.length > 0) {
        const prev = state.history.pop();
        Object.assign(state, prev);
        render();
    }
}

// --- API FETCHERS ---
async function apiGet(endpoint) {
    const res = await fetch(`https://api.penpencil.co${endpoint}`, {
        headers: { 'Authorization': `Bearer ${CONFIG.API_BEARER}`, 'Client-Id': CONFIG.CLIENT_ID, 'Client-Type': 'WEB' }
    });
    return await res.json();
}

// --- UI RENDERING ---
async function render() {
    const container = document.getElementById('mainContent');
    const backBtn = document.getElementById('backBtn');
    const pageTitle = document.getElementById('pageTitle');
    
    showPreloader(true);
    backBtn.classList.toggle('hidden', state.view === 'batches');

    try {
        if (state.view === 'batches') {
            pageTitle.innerHTML = 'RAHUL MAIDA<span> STUDY PREMIUM</span>';
            renderBatchGrid();
        } 
        else if (state.view === 'subjects') {
            pageTitle.innerHTML = `<span>${state.batchTitle}</span> / SUBJECTS`;
            const data = await apiGet(`/v2/batches/${state.currentBatch}/subjects`);
            container.innerHTML = `<div class="grid">${data.data.map(s => `
                <div class="card" onclick="navigate('topics', { currentSubject: '${s._id}', subjectTitle: '${s.subject}' })">
                    <div class="card-img-wrap h-40"><img src="${s.imageId || 'https://i.ibb.co/RTvsC93K/bannerimage-Rahul-maida.jpg'}" class="card-img"></div>
                    <div class="card-content">
                        <div class="card-title text-center">${s.subject}</div>
                        <div class="action-btn">VIEW CHAPTERS</div>
                    </div>
                </div>
            `).join('')}</div>`;
        }
        else if (state.view === 'topics') {
            pageTitle.innerHTML = `<span>${state.subjectTitle}</span> / CHAPTERS`;
            const data = await apiGet(`/v2/batches/${state.currentBatch}/subject/${state.currentSubject}/contents?contentType=videos&page=1`);
            const tags = {};
            data.data.forEach(item => item.tags.forEach(t => tags[t._id] = t.name));

            container.innerHTML = `<div class="max-w-3xl mx-auto">${Object.entries(tags).map(([id, name]) => `
                <div class="chapter-card flex justify-between items-center" onclick="navigate('contents', { currentTopic: '${id}', topicTitle: '${name}' })">
                    <span class="font-bold text-sm">${name}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                </div>
            `).join('')}</div>`;
        }
        else if (state.view === 'contents') {
            pageTitle.innerHTML = `<span>${state.topicTitle}</span> / VIDEOS`;
            const data = await apiGet(`/v2/batches/${state.currentBatch}/subject/${state.currentSubject}/contents?tag=${state.currentTopic}&contentType=videos&page=1`);
            container.innerHTML = `<div class="grid">${data.data.map(v => `
                <div class="card" onclick="playVideo('${state.currentBatch}', '${v._id}', '${v.topic}', '${state.currentSubject}')">
                    <div class="card-img-wrap"><img src="${v.videoDetails?.image || 'https://i.ibb.co/RTvsC93K/bannerimage-Rahul-maida.jpg'}" class="card-img"></div>
                    <div class="card-content">
                        <div class="card-title text-sm">${v.topic}</div>
                        <div class="action-btn">WATCH NOW</div>
                    </div>
                </div>
            `).join('')}</div>`;
        }
    } catch (e) {
        container.innerHTML = `<div class="text-center py-20 text-red-500 font-bold">Failed to load data. Please check connection.</div>`;
    } finally {
        showPreloader(false);
    }
}

function renderBatchGrid() {
    const container = document.getElementById('mainContent');
    container.innerHTML = `<div id="batchGrid" class="grid"></div>`;
    const grid = document.getElementById('batchGrid');
    const list = mode === 'fav' ? allBatches.filter(b => favorites.includes(b._id || b.batch_id)) : allBatches.slice(0, displayCount);
    
    grid.innerHTML = list.map(b => {
        const id = b._id || b.batch_id;
        const isFav = favorites.includes(id);
        return `
            <div class="card">
                <button onclick="event.stopPropagation(); toggleFav('${id}')" class="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/50 text-${isFav ? 'yellow-400' : 'white'}"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="${isFav ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l2.07 6.223a1 1 0 00.95.69h6.544c.969 0 1.371 1.24.588 1.81l-5.297 3.848a1 1 0 00-.364 1.118l2.07 6.223c.3.921-.755 1.688-1.54 1.118l-5.297-3.848a1 1 0 00-1.175 0l-5.297 3.848c-.784.57-1.838-.197-1.539-1.118l2.07-6.223a1 1 0 00-.364-1.118L2.244 11.65c-.783-.57-.38-1.81.588-1.81h6.544a1 1 0 00.95-.69l2.07-6.223z" /></svg></button>
                <div onclick="navigate('subjects', { currentBatch: '${id}', batchTitle: '${b.name.replace(/'/g,"\\'")}' })">
                    <div class="card-img-wrap h-32"><img src="${b.previewImage}" class="card-img"></div>
                    <div class="card-content p-3"><div class="card-title text-sm font-bold">${b.name}</div></div>
                    <div class="p-3 pt-0"><button class="action-btn w-full">ENTER</button></div>
                </div>
            </div>
        `;
    }).join('');
}

// --- VIDEO PLAYER (No Redirect) ---
async function playVideo(batchId, childId, title, subjectId) {
    const modal = document.getElementById('videoModal');
    const player = document.getElementById('videoPlayer');
    const loader = document.getElementById('videoLoader');
    document.getElementById('videoTitle').innerText = title;
    modal.classList.add('active');
    loader.classList.remove('hidden');

    try {
        const res = await fetch(`${CONFIG.DELTA_API}/video-url-details?batchId=${batchId}&childId=${childId}&subjectId=${subjectId}`);
        const data = await res.json();
        const streamUrl = data.data[0]?.url;
        if (streamUrl) {
            if (Hls.isSupported()) {
                if (hls) hls.destroy();
                hls = new Hls();
                hls.loadSource(streamUrl);
                hls.attachMedia(player);
                hls.on(Hls.Events.MANIFEST_PARSED, () => player.play());
            } else if (player.canPlayType('application/vnd.apple.mpegurl')) {
                player.src = streamUrl;
                player.play();
            }
        } else alert("Video link not found!");
    } catch (e) { alert("Failed to fetch stream."); }
    finally { loader.classList.add('hidden'); }
}

function closeVideo() {
    document.getElementById('videoModal').classList.remove('active');
    document.getElementById('videoPlayer').pause();
}

function showPreloader(show) { document.getElementById('globalPreloader').style.display = show ? 'flex' : 'none'; }

// --- INIT ---
document.addEventListener('DOMContentLoaded', async () => {
    applyTheme(currentTheme);
    const res = await fetch('batches.json');
    const data = await res.json();
    allBatches = data.batches;
    render();

    document.getElementById('favToggleBtn').onclick = (e) => {
        mode = mode === 'fav' ? 'all' : 'fav';
        e.currentTarget.classList.toggle('text-indigo-500', mode === 'fav');
        render();
    };
    document.getElementById('themeBtn').onclick = () => document.getElementById('themeModal').classList.add('active');
    document.querySelectorAll('.theme-card').forEach(card => card.onclick = () => { applyTheme(card.dataset.theme); document.getElementById('themeModal').classList.remove('active'); });
    window.onclick = (e) => { if (['themeModal','searchModal','announcementModal','historyModal'].includes(e.target.id)) e.target.classList.remove('active'); };
});

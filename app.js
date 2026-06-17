
let allBatches = [];
let state = {
    platform: 'pw', // pw, mj, nt
    view: 'batches', // batches, subjects, topics, contents
    currentBatch: null,
    currentSubject: null,
    currentTopic: null,
    batchTitle: '',
    subjectTitle: '',
    history: [],
    bearer: null
};

const CONFIG = {
    CLIENT_ID: "5eb393ee95fab7468a79d189",
    PROXY: "https://rahul-study-bot.dev-rahulmaida.workers.dev"
};

let hls = null;

// --- PLATFORM SWITCHING ---
function switchPlatform(id) {
    state.platform = id;
    state.view = 'batches';
    state.history = [];
    
    // UI Updates
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active-platform', el.dataset.id === id);
    });
    
    document.getElementById('platformLabel').innerText = id.toUpperCase() + " PORTAL";
    if (window.innerWidth < 1024) toggleSidebar();
    
    render();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('open');
}

// --- SMART NAVIGATION ---
function navigate(view, params = {}) {
    state.history.push({ 
        view: state.view, 
        currentBatch: state.currentBatch,
        currentSubject: state.currentSubject,
        currentTopic: state.currentTopic,
        batchTitle: state.batchTitle,
        subjectTitle: state.subjectTitle
    });
    
    state.view = view;
    Object.assign(state, params);
    render();
}

function goBack() {
    if (state.history.length > 0) {
        const prev = state.history.pop();
        Object.assign(state, prev);
        render();
    }
}

// --- API & DATA ---
async function getFreshToken() {
    if (state.bearer) return state.bearer;
    try {
        const res = await fetch(`${CONFIG.PROXY}/token`);
        const data = await res.json();
        state.bearer = data.token;
        return state.bearer;
    } catch(e) { return "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE3ODE3MDM2NTYuMzE1LCJkYXRhIjp7Il9pZCI6IjY5YjRmN2RhMGQyOTk0ZjE3MTliMjBlMCIsInVzZXJuYW1lIjoiODcyNjgzMjk0MiIsImZpcnN0TmFtZSI6Ik5pa2hpbCIsImxhc3ROYW1lIjoiIiwib3JnYW5pemF0aW9uIjp7Il9pZCI6IjVlYjM5M2VlOTVmYWI3NDY4YTc5ZDE4OSIsIndlYnNpdGUiOiJwaHlzaWNzd2FsbGFoLmNvbSIsIm5hbWUiOiJQaHlzaWNzd2FsbGFoIn0sInJvbGVzIjpbIjViMjdiZDk2NTg0MmY5NTBhNzc4YzZlZiJdLCJjb3VudHJ5R3JvdXAiOiJJTiIsIm9uZVJvbGVzIjpbXSwidHlwZSI6IlVTRVIifSwianRpIjoiOFBwa2RRejdRN3VWa0wyNXNtSmJFd182OWI0ZjdkYTBkMjk5NGYxNzE5YjIwZTAiLCJpYXQiOjE3ODEwOTg4NTZ9.5vM0jZUjaeVWr_EwW2bmgdlPXBgcOXVlDAIQ95Y6ezw"; }
}

async function apiCall(endpoint) {
    const token = await getFreshToken();
    const res = await fetch(`${CONFIG.PROXY}/proxy?endpoint=${encodeURIComponent(endpoint)}&token=${token}`);
    return await res.json();
}

// --- RENDERING ---
async function render() {
    const container = document.getElementById('portalContainer');
    const backBtn = document.getElementById('masterBackBtn');
    backBtn.classList.toggle('hidden', state.history.length === 0);

    if (state.platform === 'mj') {
        container.innerHTML = `<iframe src="https://eduvibe-mj.pages.dev/"></iframe>`;
        return;
    }
    if (state.platform === 'nt') {
        container.innerHTML = `<iframe src="https://eduvibe-nt.pages.dev/"></iframe>`;
        return;
    }

    showPreloader(true);
    try {
        if (state.view === 'batches') {
            renderBatchGrid(container);
        } 
        else if (state.view === 'subjects') {
            const data = await apiCall(`/v3/batches/${state.currentBatch}/details`);
            const subjects = data.data?.subjects || [];
            container.innerHTML = `<div class="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-500">${subjects.map(s => `
                <div class="group bg-sidebar-bg border border-white/5 rounded-3xl overflow-hidden hover:border-indigo-500/50 transition-all cursor-pointer" onclick="navigate('topics', { currentSubject: '${s._id}', subjectTitle: '${s.subject}' })">
                    <div class="h-40 bg-black overflow-hidden relative"><img src="${s.imageId || 'https://i.ibb.co/RTvsC93K/bannerimage-Rahul-maida.jpg'}" class="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-500"><div class="absolute inset-0 bg-gradient-to-t from-sidebar-bg to-transparent opacity-60"></div></div>
                    <div class="p-5">
                        <div class="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">Explore</div>
                        <h3 class="font-bold text-sm text-gray-100">${s.subject}</h3>
                    </div>
                </div>
            `).join('')}</div>`;
        }
        else if (state.view === 'topics') {
            const data = await apiCall(`/v2/batches/${state.currentBatch}/subject/${state.currentSubject}/contents?contentType=videos&page=1`);
            const items = data.data || [];
            const tags = {};
            items.forEach(item => item.tags.forEach(t => tags[t._id] = t.name));

            container.innerHTML = `<div class="max-w-4xl mx-auto p-6 space-y-3 animate-in slide-in-from-bottom-4 duration-500">${Object.entries(tags).map(([id, name]) => `
                <div class="flex items-center justify-between p-5 bg-white/5 border border-white/5 rounded-2xl hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all cursor-pointer group" onclick="navigate('contents', { currentTopic: '${id}', topicTitle: '${name}' })">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-black text-xs">${name.substring(0,1).toUpperCase()}</div>
                        <span class="font-black text-xs text-gray-200 tracking-tight">${name}</span>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-600 group-hover:text-indigo-500 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
                </div>
            `).join('')}</div>`;
        }
        else if (state.view === 'contents') {
            const data = await apiCall(`/v2/batches/${state.currentBatch}/subject/${state.currentSubject}/contents?tag=${state.currentTopic}&contentType=videos&page=1`);
            const items = data.data || [];
            container.innerHTML = `<div class="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">${items.map(v => `
                <div class="bg-sidebar-bg border border-white/5 rounded-3xl overflow-hidden hover:border-indigo-500/50 transition-all cursor-pointer group" onclick="playVideo('${v.videoDetails?.videoUrl}', '${v.topic}')">
                    <div class="h-44 bg-black relative">
                        <img src="${v.videoDetails?.image || 'https://i.ibb.co/RTvsC93K/bannerimage-Rahul-maida.jpg'}" class="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700">
                        <div class="absolute inset-0 flex items-center justify-center"><div class="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center shadow-2xl pl-1 group-hover:scale-110 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg></div></div>
                    </div>
                    <div class="p-5"><h3 class="font-bold text-[11px] text-gray-300 leading-relaxed line-clamp-2">${v.topic}</h3></div>
                </div>
            `).join('')}</div>`;
        }
    } catch (e) {
        container.innerHTML = `<div class="h-full flex flex-col items-center justify-center text-center px-6"><div class="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-6"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div><h2 class="text-lg font-black mb-2">Portal Access Restricted</h2><button onclick="state.bearer=null;render();" class="px-8 py-3 bg-indigo-500 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-500/20 mt-4">Refresh Key</button></div>`;
    } finally {
        showPreloader(false);
    }
}

function renderBatchGrid(container) {
    container.innerHTML = `<div class="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in zoom-in-95 duration-500">${allBatches.slice(0, 100).map(b => {
        const id = b._id || b.batch_id;
        return `
            <div class="bg-sidebar-bg border border-white/5 rounded-[2rem] overflow-hidden hover:border-indigo-500/30 transition-all cursor-pointer group" onclick="navigate('subjects', { currentBatch: '${id}', batchTitle: '${b.name.replace(/'/g,"")}' })">
                <div class="h-32 bg-black overflow-hidden relative">
                    <img src="${b.previewImage}" class="w-full h-full object-cover opacity-70 group-hover:scale-110 transition-transform duration-500">
                    <div class="absolute inset-0 bg-gradient-to-t from-sidebar-bg to-transparent opacity-60"></div>
                </div>
                <div class="p-5">
                    <h3 class="font-black text-[10px] text-gray-300 uppercase tracking-tight line-clamp-1 mb-4">${b.name}</h3>
                    <button class="w-full py-2.5 bg-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest group-hover:bg-indigo-500 transition-colors">Launch Batch</button>
                </div>
            </div>
        `;
    }).join('')}</div>`;
}

// --- VIDEO PLAYER ---
function playVideo(url, title) {
    const video = document.createElement('video');
    video.controls = true;
    video.className = "w-full h-full rounded-2xl shadow-2xl";
    const modal = document.createElement('div');
    modal.className = "fixed inset-0 z-[10000] bg-black/98 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300";
    modal.innerHTML = `<div class="w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl" id="playerWrap"></div><div class="mt-8 text-center"><h2 class="text-lg font-black">${title}</h2><button onclick="this.parentElement.parentElement.remove()" class="mt-6 px-10 py-3 bg-white/5 border border-white/10 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all">Close Player</button></div>`;
    document.body.appendChild(modal);
    
    const playerWrap = modal.querySelector('#playerWrap');
    playerWrap.appendChild(video);

    if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
    } else {
        video.src = url;
        video.play();
    }
}

function showPreloader(show) {
    document.getElementById('globalPreloader').style.display = show ? 'flex' : 'none';
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('batches.json');
        const data = await res.json();
        allBatches = data.batches;
        render();
    } catch (e) { console.error("Init failed"); }
});

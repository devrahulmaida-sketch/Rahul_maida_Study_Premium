
const CONFIG = {
    CLIENT_ID: "5eb393ee95fab7468a79d189",
    PROXY: "https://rahul-study-bot.dev-rahulmaida.workers.dev"
};

let state = {
    view: 'batches',
    currentBatch: null,
    currentSubject: null,
    currentTopic: null,
    batchTitle: '',
    subjectTitle: '',
    history: [],
    bearer: null
};

let allBatches = [];
let favorites = JSON.parse(localStorage.getItem('fav-batches') || '[]');
let currentTheme = localStorage.getItem('theme-mode') || 'dark';
let displayCount = 80;
let hls = null;

// --- SELF-HEALING API CALLER ---
async function apiCall(endpoint, method = "GET", body = null, retryCount = 0) {
    try {
        const token = await getFreshToken();
        const url = `${CONFIG.PROXY}/proxy?endpoint=${encodeURIComponent(endpoint)}&token=${token}`;
        const res = await fetch(url, {
            method: method,
            body: body ? JSON.stringify(body) : null
        });
        const data = await res.json();
        
        if (data.retry && retryCount < 2) {
            console.log("Retrying with fresh token...");
            state.bearer = null; // Clear cached bearer
            return await apiCall(endpoint, method, body, retryCount + 1);
        }
        
        if (data.success === false) throw new Error(data.message || "Blocked");
        return data;
    } catch (e) {
        if (retryCount < 2) return await apiCall(endpoint, method, body, retryCount + 1);
        throw e;
    }
}

async function getFreshToken() {
    if (state.bearer) return state.bearer;
    const res = await fetch(`${CONFIG.PROXY}/token`);
    const data = await res.json();
    state.bearer = data.token;
    return state.bearer;
}

// --- NAVIGATION ---
function navigate(view, params = {}) {
    state.history.push({ ...state, history: [] });
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
    } else {
        location.href = '/';
    }
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
            pageTitle.innerHTML = `<span class="text-indigo-400 font-bold">${state.batchTitle}</span>`;
            const data = await apiCall(`/v3/batches/${state.currentBatch}/details`);
            const subjects = data.data?.subjects || [];
            container.innerHTML = `<div class="grid">${subjects.map(s => `
                <div class="card bg-gray-900/50 backdrop-blur-md border-white/10" onclick="navigate('topics', { currentSubject: '${s._id}', subjectTitle: '${s.subject}' })">
                    <div class="card-img-wrap h-44 bg-black"><img src="${s.imageId || 'https://i.ibb.co/RTvsC93K/bannerimage-Rahul-maida.jpg'}" class="card-img opacity-80"></div>
                    <div class="card-content p-4">
                        <div class="text-[10px] text-indigo-400 font-bold mb-1 uppercase tracking-widest">Subject</div>
                        <div class="card-title text-sm font-extrabold text-white">${s.subject}</div>
                        <div class="action-btn mt-3 py-3 rounded-xl shadow-lg shadow-indigo-500/20">VIEW CHAPTERS</div>
                    </div>
                </div>
            `).join('')}</div>`;
        }
        else if (state.view === 'topics') {
            pageTitle.innerHTML = `<span class="text-indigo-400 font-bold">${state.subjectTitle}</span>`;
            const data = await apiCall(`/v2/batches/${state.currentBatch}/subject/${state.currentSubject}/contents?contentType=videos&page=1`);
            const items = data.data || [];
            const tags = {};
            items.forEach(item => item.tags.forEach(t => tags[t._id] = t.name));

            container.innerHTML = `<div class="max-w-3xl mx-auto space-y-3 py-4">${Object.entries(tags).map(([id, name]) => `
                <div class="chapter-row group bg-gray-900/50 border-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all p-4 rounded-2xl flex justify-between items-center" onclick="navigate('contents', { currentTopic: '${id}', topicTitle: '${name}' })">
                    <div class="flex items-center gap-4">
                        <div class="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-all font-bold text-xs">${name.substring(0,2)}</div>
                        <span class="font-extrabold text-sm text-gray-200">${name}</span>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-600 group-hover:text-indigo-500 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
                </div>
            `).join('')}</div>`;
        }
        else if (state.view === 'contents') {
            pageTitle.innerHTML = `<span class="text-indigo-400 font-bold">${state.topicTitle}</span>`;
            const data = await apiCall(`/v2/batches/${state.currentBatch}/subject/${state.currentSubject}/contents?tag=${state.currentTopic}&contentType=videos&page=1`);
            const items = data.data || [];
            container.innerHTML = `<div class="grid">${items.map(v => `
                <div class="card bg-gray-900 border-white/5 overflow-hidden" onclick="openInternalVideo('${state.currentBatch}', '${v._id}', '${v.topic.replace(/'/g,"")}', '${state.currentSubject}')">
                    <div class="card-img-wrap h-40 bg-black relative">
                        <img src="${v.videoDetails?.image || 'https://i.ibb.co/RTvsC93K/bannerimage-Rahul-maida.jpg'}" class="card-img opacity-70">
                        <div class="absolute inset-0 flex items-center justify-center"><div class="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center pl-1 shadow-xl"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg></div></div>
                    </div>
                    <div class="card-content p-4">
                        <div class="card-title text-xs font-bold text-gray-300 leading-tight">${v.topic}</div>
                        <div class="flex justify-between items-center mt-3 pt-3 border-t border-white/5 text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                            <span>Lecture</span>
                            <span class="text-indigo-500">Play Now</span>
                        </div>
                    </div>
                </div>
            `).join('')}</div>`;
        }
    } catch (e) {
        container.innerHTML = `<div class="text-center py-20 bg-red-500/5 rounded-3xl border border-red-500/20 max-w-md mx-auto">
            <div class="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div>
            <div class="text-white font-black text-lg mb-2">ACCESS BLOCKED</div>
            <p class="text-xs text-gray-400 mb-6 px-10">Bhai, PW ne temporary block kiya hai ya token expired hai. Ek baar retry karo, bot refresh kar lega.</p>
            <button onclick="render()" class="action-btn w-40 mx-auto rounded-full font-black">RETRY CONNECTION</button>
        </div>`;
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
            <div class="card border-white/5 bg-gray-900/40">
                <button onclick="event.stopPropagation(); toggleFav('${id}')" class="absolute top-3 right-3 z-10 p-2 rounded-xl bg-black/60 backdrop-blur-md text-${isFav ? 'yellow-400' : 'white'} hover:scale-110 transition-all"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="${isFav ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l2.07 6.223a1 1 0 00.95.69h6.544c.969 0 1.371 1.24.588 1.81l-5.297 3.848a1 1 0 00-.364 1.118l2.07 6.223c.3.921-.755 1.688-1.54 1.118l-5.297-3.848a1 1 0 00-1.175 0l-5.297 3.848c-.784.57-1.838-.197-1.539-1.118l2.07-6.223a1 1 0 00-.364-1.118L2.244 11.65c-.783-.57-.38-1.81.588-1.81h6.544a1 1 0 00.95-.69l2.07-6.223z" /></svg></button>
                <div onclick="navigate('subjects', { currentBatch: '${id}', batchTitle: '${b.name.replace(/'/g,"")}' })">
                    <div class="card-img-wrap h-32 bg-black"><img src="${b.previewImage}" class="card-img opacity-80" loading="lazy"></div>
                    <div class="card-content p-4"><div class="card-title text-sm font-black uppercase text-gray-100">${b.name}</div></div>
                    <div class="px-4 pb-4"><button class="action-btn w-full rounded-xl font-black">EXPLORE</button></div>
                </div>
            </div>
        `;
    }).join('');
}

// --- VIDEO PLAYER ---
async function openInternalVideo(batchId, childId, title, subjectId) {
    const loader = document.getElementById('videoLoader');
    loader.classList.remove('hidden');
    try {
        const res = await fetch(`https://apiserver.deltastudy.site/api/pw/video-url-details?batchId=${batchId}&childId=${childId}&subjectId=${subjectId}`);
        const data = await res.json();
        const streamUrl = data.data[0]?.url;
        if (streamUrl) startHlsPlayer(streamUrl, title);
        else alert("Stream link failed. Retrying...");
    } catch (e) { alert("Mirror Down. Using Backup..."); }
    finally { loader.classList.add('hidden'); }
}

function startHlsPlayer(url, title) {
    const modal = document.getElementById('videoModal');
    const player = document.getElementById('videoPlayer');
    document.getElementById('videoTitle').innerText = title;
    modal.classList.add('active');
    
    if (Hls.isSupported()) {
        if (hls) hls.destroy();
        hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(player);
        hls.on(Hls.Events.MANIFEST_PARSED, () => player.play());
    } else if (player.canPlayType('application/vnd.apple.mpegurl')) {
        player.src = url;
        player.play();
    }
}

function closeVideo() {
    document.getElementById('videoModal').classList.remove('active');
    document.getElementById('videoPlayer').pause();
}

function showPreloader(show) { document.getElementById('globalPreloader').style.display = show ? 'flex' : 'none'; }
function applyTheme(theme) { document.body.classList.toggle('dark-mode', theme === 'dark'); localStorage.setItem('theme-mode', theme); }

function toggleFav(id) {
    if (favorites.includes(id)) favorites = favorites.filter(f => f !== id);
    else favorites.push(id);
    localStorage.setItem('fav-batches', JSON.stringify(favorites));
    render();
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', async () => {
    applyTheme(currentTheme);
    
    try {
        const res = await fetch('batches.json');
        const data = await res.json();
        allBatches = data.batches;
        render();
    } catch (e) { console.error("Data error"); }

    document.getElementById('favToggleBtn').onclick = (e) => {
        mode = mode === 'fav' ? 'all' : 'fav';
        e.currentTarget.classList.toggle('text-indigo-500', mode === 'fav');
        render();
    };
    document.getElementById('themeBtn').onclick = () => document.getElementById('themeModal').classList.add('active');
    document.querySelectorAll('.theme-card').forEach(card => card.onclick = () => { applyTheme(card.dataset.theme); document.getElementById('themeModal').classList.remove('active'); });
});

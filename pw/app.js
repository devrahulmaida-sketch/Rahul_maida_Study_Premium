
const CONFIG = {
    PROXY: "https://rahul-study-bot.dev-rahulmaida.workers.dev",
    DEFAULT_IMG: "https://i.ibb.co/RTvsC93K/bannerimage-Rahul-maida.jpg"
};

let state = {
    view: 'batches',
    batches: [],
    favorites: JSON.parse(localStorage.getItem('fav-batches') || '[]'),
    currentBatch: null,
    currentSubject: null,
    currentChapter: null,
    history: [],
    displayCount: 60
};

let hls = null;

// --- CORE NAVIGATION ---
function navigate(view, data = {}) {
    console.log("Navigating to:", view, data);
    state.view = view;
    Object.assign(state, data);
    
    // Update URL hash for "back" support (basic)
    window.location.hash = view;
    
    render();
    window.scrollTo(0, 0);
}

// --- API CALLER (PROXY) ---
async function apiCall(endpoint, method = "GET", body = null) {
    const url = `${CONFIG.PROXY}/proxy?endpoint=${encodeURIComponent(endpoint)}`;
    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : null
        });
        const data = await res.json();
        if (data.success === false) throw new Error(data.message || "API Error");
        return data.data || data;
    } catch (e) {
        console.error("API Call Failed:", e);
        throw e;
    }
}

// --- RENDERING LOGIC ---
async function render() {
    const container = document.getElementById('viewContainer');
    
    if (state.view === 'batches') {
        renderBatches(container);
    } else if (state.view === 'subjects') {
        renderSubjects(container);
    } else if (state.view === 'chapters') {
        renderChapters(container);
    } else if (state.view === 'videos') {
        renderVideos(container);
    }
}

function renderBatches(container) {
    const list = state.batches.slice(0, state.displayCount);
    container.innerHTML = `
        <div class="flex items-center justify-between mb-8">
            <h2 class="text-3xl font-black tracking-tight">EXPLORE <span class="text-indigo-500">BATCHES</span></h2>
            <div class="text-xs font-bold text-gray-500 uppercase tracking-widest">${state.batches.length} Available</div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            ${list.map(b => `
                <div class="glass-card group" onclick="navigate('subjects', { currentBatch: '${b._id || b.batch_id}', batchTitle: '${b.name.replace(/'/g,"")}' })">
                    <div class="h-40 overflow-hidden bg-gray-900">
                        <img src="${b.previewImage || CONFIG.DEFAULT_IMG}" class="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500 opacity-80">
                    </div>
                    <div class="p-5">
                        <h3 class="font-bold text-sm h-10 overflow-hidden line-clamp-2 uppercase tracking-tight mb-4">${b.name}</h3>
                        <button class="btn-premium w-full py-3 rounded-xl text-[10px]">Access Portal</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

async function renderSubjects(container) {
    container.innerHTML = renderSkeleton('SUBJECTS');
    try {
        // v3 endpoint is usually more robust for details
        const data = await apiCall(`/v3/batches/${state.currentBatch}/details`);
        const subjects = data.batchData?.subjects || [];
        
        container.innerHTML = `
            <div class="mb-8">
                <button onclick="navigate('batches')" class="text-indigo-500 font-bold text-xs uppercase mb-2 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" /></svg> Back to Batches
                </button>
                <h2 class="text-3xl font-black tracking-tight uppercase">${state.batchTitle}</h2>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                ${subjects.map(s => `
                    <div class="glass-card p-6 flex items-center gap-4 hover:bg-indigo-500/5" onclick="navigate('chapters', { currentSubject: '${s._id}', subjectTitle: '${s.subject.replace(/'/g,"")}' })">
                        <div class="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.082.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                        </div>
                        <div>
                            <h3 class="font-bold text-sm uppercase tracking-tight">${s.subject}</h3>
                            <p class="text-[10px] text-gray-500 font-bold uppercase">View Chapters</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (e) {
        container.innerHTML = renderError("Failed to load subjects. Try again.");
    }
}

async function renderChapters(container) {
    container.innerHTML = renderSkeleton('CHAPTERS');
    try {
        const data = await apiCall(`/v2/batches/${state.currentBatch}/subjects/${state.currentSubject}/topics?page=1&limit=50`);
        const chapters = data || [];

        container.innerHTML = `
            <div class="mb-8">
                <button onclick="navigate('subjects')" class="text-indigo-500 font-bold text-xs uppercase mb-2 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" /></svg> Back to Subjects
                </button>
                <h2 class="text-3xl font-black tracking-tight uppercase">${state.subjectTitle}</h2>
            </div>
            <div class="space-y-3">
                ${chapters.map(c => `
                    <div class="glass-card p-5 flex items-center justify-between hover:bg-white/5" onclick="navigate('videos', { currentChapter: '${c._id}', chapterTitle: '${c.name.replace(/'/g,"")}' })">
                        <div class="flex items-center gap-4">
                            <div class="text-indigo-500 opacity-40 font-black text-xl italic">${chapters.indexOf(c) + 1}</div>
                            <h3 class="font-bold text-sm uppercase tracking-tight">${c.name}</h3>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (e) {
        container.innerHTML = renderError("Failed to load chapters.");
    }
}

async function renderVideos(container) {
    container.innerHTML = renderSkeleton('VIDEOS');
    try {
        const data = await apiCall(`/v2/batches/${state.currentBatch}/subjects/${state.currentSubject}/contents?page=1&limit=50&tag=${state.currentChapter}&contentType=video`);
        const videos = data || [];

        container.innerHTML = `
            <div class="mb-8">
                <button onclick="navigate('chapters')" class="text-indigo-500 font-bold text-xs uppercase mb-2 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" /></svg> Back to Chapters
                </button>
                <h2 class="text-3xl font-black tracking-tight uppercase">${state.chapterTitle}</h2>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                ${videos.map(v => {
                    const url = v.url || v.videoUrl;
                    const hlsUrl = v.hlsUrl || v.url;
                    return `
                        <div class="glass-card group" onclick="playVideo('${hlsUrl}', '${v.name.replace(/'/g,"")}')">
                            <div class="relative aspect-video bg-black overflow-hidden">
                                <img src="${CONFIG.DEFAULT_IMG}" class="w-full h-full object-cover opacity-40">
                                <div class="absolute inset-0 flex items-center justify-center">
                                    <div class="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-lg group-hover:scale-125 transition-transform">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                    </div>
                                </div>
                            </div>
                            <div class="p-4">
                                <h3 class="font-bold text-[11px] uppercase tracking-tight line-clamp-2">${v.name}</h3>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } catch (e) {
        container.innerHTML = renderError("Failed to load videos.");
    }
}

// --- VIDEO PLAYER ---
function playVideo(url, title) {
    console.log("Playing Video:", url);
    const modal = document.getElementById('videoModal');
    const player = document.getElementById('hlsPlayer');
    document.getElementById('videoTitle').innerText = title;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    if (Hls.isSupported()) {
        if (hls) hls.destroy();
        hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(player);
        hls.on(Hls.Events.MANIFEST_PARSED, () => player.play());
    } else if (player.canPlayType('application/vnd.apple.mpegurl')) {
        player.src = url;
        player.addEventListener('loadedmetadata', () => player.play());
    }
}

function closeVideo() {
    const modal = document.getElementById('videoModal');
    const player = document.getElementById('hlsPlayer');
    modal.classList.remove('active');
    player.pause();
    document.body.style.overflow = '';
}

// --- DYNAMIC URL DETECTION ---
function checkDynamicUrl() {
    const params = new URLSearchParams(window.location.search);
    const videoUrl = params.get('url');
    const signature = params.get('signature');
    
    if (videoUrl) {
        let fullUrl = videoUrl;
        if (signature) {
            fullUrl += (signature.startsWith('?') ? signature : '?' + signature);
        }
        console.log("Dynamic URL Detected:", fullUrl);
        setTimeout(() => playVideo(fullUrl, "External Stream"), 1500);
    }
}

// --- UTILS ---
function renderSkeleton(title) {
    return `
        <div class="mb-8">
            <div class="h-4 w-32 skeleton rounded mb-4"></div>
            <h2 class="text-3xl font-black tracking-tight uppercase">${title}</h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            ${Array(6).fill(0).map(() => `<div class="h-48 glass-card skeleton"></div>`).join('')}
        </div>
    `;
}

function renderError(msg) {
    return `<div class="flex flex-col items-center justify-center py-20 text-center"><p class="text-red-500 font-bold mb-4">${msg}</p><button onclick="render()" class="btn-premium px-6 py-2 rounded-xl text-xs">Retry</button></div>`;
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('batches.json');
        const data = await res.json();
        state.batches = data.batches || [];
        
        // Initial render
        navigate('batches');
        
        // Check for dynamic URL
        checkDynamicUrl();
        
    } catch (e) { console.error("Initialization failed:", e); }
    
    document.getElementById('globalPreloader').style.display = 'none';
    
    // Theme and Search handlers
    document.getElementById('themeBtn').onclick = () => document.body.classList.toggle('dark-mode');
    document.getElementById('searchBtn').onclick = () => document.getElementById('searchOverlay').style.display = 'flex';
});

window.onscroll = () => {
    if (state.view !== 'batches') return;
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 800) {
        if (state.displayCount < state.batches.length) {
            state.displayCount += 40;
            render();
        }
    }
};

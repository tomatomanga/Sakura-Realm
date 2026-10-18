// --- Firebase Config & SDK Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBAyTxN3YWVFzkmyAsd6SWF8f2YYpbc0T8",
  authDomain: "sakura-realm.firebaseapp.com",
  databaseURL: "https://sakura-realm-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sakura-realm",
  storageBucket: "sakura-realm.firebasestorage.app",
  messagingSenderId: "1033024958998",
  appId: "1:1033024958998:web:5f6dab22aebd6b9fc83b37",
  measurementId: "G-7VZ07WZK6D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// --- Global State & Shared Storage Keys ---
const SHARED_STORAGE_KEY = "sakura_shared_master_mangas_v1";
let currentMangaData = [];

// --- Firebase Realtime Database Listener ---
function listenToFirebaseData() {
    const mangaRef = ref(database, 'manga_list');
    onValue(mangaRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Convert Firebase Object to Array format
            const formattedList = Object.keys(data).map(key => {
                const item = data[key];
                let chaptersArr = [];
                if (item.chapters) {
                    chaptersArr = Object.keys(item.chapters).map(cKey => ({
                        id: cKey,
                        title: item.chapters[cKey].chapter_title || `Chapter ${item.chapters[cKey].chapter_number || cKey}`,
                        date: item.chapters[cKey].created_at ? new Date(item.chapters[cKey].created_at).toLocaleDateString() : 'Recent',
                        pages: (item.chapters[cKey].pages || []).map(pUrl => ({ data: pUrl }))
                    }));
                }
                return {
                    id: key,
                    title: item.title || key,
                    image: item.cover_image || item.image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000',
                    coverType: item.coverType || 'Manga',
                    status: item.status || 'Ongoing',
                    rating: item.rating || '4.9 / 5.0',
                    description: item.description || 'Cinematic Manga Experience desu~',
                    genre: item.genre || 'Action, Fantasy',
                    chapters: chaptersArr
                };
            });
            currentMangaData = formattedList;
            localStorage.setItem(SHARED_STORAGE_KEY, JSON.stringify(formattedList));
        } else {
            currentMangaData = JSON.parse(localStorage.getItem(SHARED_STORAGE_KEY)) || [];
        }
        refreshCurrentView();
    }, (error) => {
        console.warn("Firebase Read Warning/Fallback:", error);
        currentMangaData = JSON.parse(localStorage.getItem(SHARED_STORAGE_KEY)) || [];
        refreshCurrentView();
    });
}

function loadSharedMangas() {
    return currentMangaData.length > 0 ? currentMangaData : (JSON.parse(localStorage.getItem(SHARED_STORAGE_KEY)) || []);
}

function refreshCurrentView() {
    renderHotShowcase();
    renderMainMangaGrid();
    const hash = window.location.hash;
    if (hash.includes('#detail')) {
        const parts = hash.replace('#', '').split('-');
        const mangaId = parts.slice(1).join('-');
        renderChapterList(mangaId);
    }
}

// --- Bookmark Toggle Function ---
window.toggleBookmark = function() {
    const btn = document.getElementById("bookmarkBtn");
    const icon = document.getElementById("bookmarkIcon");
    const text = document.getElementById("bookmarkText");
    if (!btn) return;
    
    btn.classList.toggle("active");
    if (btn.classList.contains("active")) {
        icon.className = "fa-solid fa-bookmark text-white text-sm";
        text.textContent = "Bookmarked";
    } else {
        icon.className = "fa-regular fa-bookmark text-sakura-400 text-sm";
        text.textContent = "Add to Bookmark";
    }
};

// 1. Hot Trending Showcase Renderer
function renderHotShowcase() {
    const container = document.getElementById("showcaseScrollContainer");
    if (!container) return;
    const mangas = loadSharedMangas();
    container.innerHTML = "";
    
    if (mangas.length === 0) {
        container.innerHTML = `
            <div class="w-full py-5 text-center text-xs text-slate-400/80 italic glass-card rounded-xl border border-dark-border">
                No Hot Trending Manga Available Desu~
            </div>
        `;
        return;
    }
    
    const limitedMangas = mangas.slice(0, 6);
    limitedMangas.forEach((manga, index) => {
        const rank = index + 1;
        const card = document.createElement("div");
        card.className = "showcase-card shrink-0 w-32 sm:w-40 h-44 sm:h-52 rounded-2xl relative overflow-hidden cursor-pointer group snap-start border border-dark-border shadow-lg";
        card.onclick = () => window.navigateToView('detail', manga.id, manga.title);
        
        const mangaStatus = manga.status || manga.chapter || 'Ongoing';
        card.innerHTML = `
            <div class="absolute inset-0 bg-gradient-to-t from-dark-base via-dark-card/40 to-transparent z-10"></div>
            <div class="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition duration-500" style="background-image: url('${manga.image}')"></div>
            <div class="absolute top-2.5 left-2.5 z-20">
                <span class="px-2 py-0.5 rounded-md bg-dark-card/90 text-white font-bold text-[9px] border border-dark-border shadow-sm">HOT #${rank}</span>
            </div>
            <div class="absolute bottom-3 left-3 right-3 z-20 space-y-1">
                <h3 class="formula-manga-title !mt-0 !text-left !text-xs !w-full text-white group-hover:text-sakura-300 transition line-clamp-1">${manga.title}</h3>
                <p class="text-[10px] text-sakura-400 font-semibold uppercase tracking-wider">${mangaStatus}</p>
            </div>
        `;
        container.appendChild(card);
    });
}

// 2. Main Manga Collection Grid Renderer
function renderMainMangaGrid() {
    const gridContainer = document.getElementById("mainMangaGridContainer");
    if (!gridContainer) return;
    const mangas = loadSharedMangas();
    gridContainer.innerHTML = "";
    
    if (mangas.length === 0) {
        gridContainer.innerHTML = `
            <div class="col-span-2 py-10 text-center text-xs text-slate-400/80 italic glass-card rounded-2xl border border-dark-border">
                No Manga in Collection Yet Desu~
            </div>
        `;
        return;
    }
    
    mangas.forEach((manga) => {
        const card = document.createElement("div");
        card.className = "formula-manga-card";
        card.onclick = () => window.navigateToView('detail', manga.id, manga.title);
        const coverTagType = manga.coverType || 'Manga';
        const mangaStatus = manga.status || manga.chapter || 'Ongoing';
        
        card.innerHTML = `
            <div class="clean-single-bold-frame">
                <div class="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition duration-500" style="background-image: url('${manga.image}')"></div>
                <div class="formula-type-badge">
                    <span>${coverTagType}</span>
                </div>
                <div class="formula-chapter-tag">
                    <i class="fa-solid fa-circle-dot mr-1 text-[7px] text-sakura-400"></i>${mangaStatus}
                </div>
            </div>
            <h3 class="formula-manga-title">${manga.title}</h3>
        `;
        gridContainer.appendChild(card);
    });
}

// 3. Dynamic Chapter List Renderer
function renderChapterList(mangaId) {
    const container = document.getElementById('chapterListContainer');
    if (!container) return;
    container.innerHTML = '';
    const mangas = loadSharedMangas();
    const foundManga = mangas.find(m => m.id === mangaId);
    
    let chapters = (foundManga && foundManga.chapters && foundManga.chapters.length > 0) ? foundManga.chapters : [
        { id: 'ch-3', title: 'Chapter 3 (Preview)', date: '2026-06-01', pages: [] },
        { id: 'ch-2', title: 'Chapter 2 (Preview)', date: '2026-05-15', pages: [] },
        { id: 'ch-1', title: 'Chapter 1 (Preview)', date: '2026-05-01', pages: [] }
    ];
    
    chapters.forEach((ch) => {
        const chBox = document.createElement('div');
        chBox.className = "chapter-grey-box flex items-center justify-between p-3.5 rounded-xl border border-dark-border cursor-pointer transition";
        chBox.onclick = () => navigateToReaderView(mangaId, ch.id, ch.title);
        const pageCountText = ch.pages ? `${ch.pages.length} pages` : 'Preview';
        
        chBox.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-sakura-900/40 border border-sakura-500/30 flex items-center justify-center text-sakura-400 text-xs font-bold">
                    <i class="fa-solid fa-book-open"></i>
                </div>
                <div class="flex flex-col">
                    <span class="text-xs sm:text-sm font-bold text-slate-200">${ch.title}</span>
                    <span class="text-[10px] text-slate-400">${ch.date || 'Recent Release'} • ${pageCountText}</span>
                </div>
            </div>
            <div class="flex items-center gap-2 text-xs text-sakura-400 font-bold">
                <span>Read</span>
                <i class="fa-solid fa-chevron-right text-[10px]"></i>
            </div>
        `;
        container.appendChild(chBox);
    });
}

// First Read Button Handler
window.readFirstChapter = function() {
    const hash = window.location.hash.replace('#', '');
    const parts = hash.split('-');
    const mangaId = parts.slice(1).join('-');
    const mangas = loadSharedMangas();
    const found = mangas.find(m => m.id === mangaId);
    
    if (found && found.chapters && found.chapters.length > 0) {
        const firstCh = found.chapters[found.chapters.length - 1];
        navigateToReaderView(mangaId, firstCh.id, firstCh.title);
    } else {
        window.navigateToView('reader', 'ch-1', 'Chapter Reading');
    }
};

function navigateToReaderView(mangaId, chapterId, chapterTitle) {
    window.navigateToView('reader', `${mangaId}___${chapterId}`, chapterTitle);
}

// --- View Router & Navigation Engine ---
const scrollPositions = {};

window.navigateToView = function(viewName, id = '', title = '') {
    const activeSection = document.querySelector('.view-section:not(.hidden)');
    if (activeSection) {
        scrollPositions[activeSection.id] = window.scrollY;
    }
    const stateData = { view: viewName, id: id, title: title };
    const hash = `#${viewName}${id ? '-' + id : ''}`;
    history.pushState(stateData, '', hash);
    renderView(stateData);
};

window.goHome = function() {
    window.navigateToView('home');
};

window.addEventListener('popstate', () => {
    restoreViewFromHash();
});

function restoreViewFromHash() {
    const hash = window.location.hash.replace('#', '');
    if (!hash) {
        renderView({ view: 'home' });
        return;
    }
    const parts = hash.split('-');
    const viewName = parts[0];
    const id = parts.slice(1).join('-');
    let title = '';
    
    if (viewName === 'detail') {
        const mangas = loadSharedMangas();
        const found = mangas.find(m => m.id === id);
        title = found ? found.title : 'Manga Detail';
        if (found) {
            document.getElementById('detailTitle').textContent = found.title;
            document.getElementById('detailCoverBox').style.backgroundImage = `url('${found.image}')`;
            
            const badgeEl = document.getElementById('detailCoverTagBadge');
            if (badgeEl) badgeEl.textContent = found.coverType || 'Manga';
            
            const ratingEl = document.getElementById('detailRatingText');
            if (ratingEl) ratingEl.textContent = found.rating || '4.9 / 5.0';
            
            const heroEl = document.getElementById('cinematicHero');
            if (heroEl && found.image) {
                heroEl.style.setProperty('--hero-bg', `url('${found.image}')`);
            }
            
            const descEl = document.getElementById('detailDescription');
            if (descEl) descEl.textContent = found.description || 'No description available desu~';
            
            if (found.genre) {
                const genresContainer = document.getElementById('detailGenresContainer');
                genresContainer.innerHTML = '';
                const genresList = found.genre.split(',');
                genresList.forEach(g => {
                    const cleanG = g.trim();
                    if (cleanG !== '') {
                        const tag = document.createElement('div');
                        tag.className = "individual-genre-frame";
                        tag.textContent = cleanG;
                        genresContainer.appendChild(tag);
                    }
                });
            }
            renderChapterList(found.id);
        }
    } else if (viewName === 'reader') {
        renderReaderContent(id);
    }
    renderView({ view: viewName, id: id, title: title }, true);
}

function renderReaderContent(readerParam) {
    const titleEl = document.getElementById('readerTitle');
    const container = document.getElementById('readerPagesContainer');
    if (!container) return;
    container.innerHTML = '';
    
    const [mangaId, chapterId] = readerParam.includes('___') ? readerParam.split('___') : [null, readerParam];
    
    if (mangaId) {
        const mangas = loadSharedMangas();
        const foundManga = mangas.find(m => m.id === mangaId);
        if (foundManga && foundManga.chapters) {
            const foundCh = foundManga.chapters.find(c => c.id === chapterId);
            if (foundCh) {
                if (titleEl) titleEl.textContent = foundCh.title;
                if (foundCh.pages && foundCh.pages.length > 0) {
                    foundCh.pages.forEach((pageObj, idx) => {
                        const img = document.createElement('img');
                        img.src = pageObj.data || pageObj;
                        img.alt = `Page ${idx + 1}`;
                        img.className = "w-full rounded-xl shadow-lg border border-dark-border object-contain";
                        container.appendChild(img);
                    });
                    return;
                }
            }
        }
    }
    
    if (titleEl) titleEl.textContent = "Chapter Reading (Preview)";
    container.innerHTML = `
        <div class="p-6 bg-black/40 rounded-xl border border-dark-border text-slate-400 text-xs w-full">
            Manga Panel Image Placeholder desu~ (Upload chapters from Uploader Panel to view actual images!)
        </div>
    `;
}

function renderView(state, isRestore = false) {
    const views = ['homeView', 'genresView', 'detailView', 'readerView'];
    views.forEach(v => document.getElementById(v).classList.add('hidden'));
    
    let targetId = 'homeView';
    if (state.view === 'genres' || state.view === 'latest') targetId = 'genresView';
    if (state.view === 'detail') {
        targetId = 'detailView';
        const mangas = loadSharedMangas();
        const found = mangas.find(m => m.id === state.id);
        if (found) {
            document.getElementById('detailTitle').textContent = found.title;
            document.getElementById('detailCoverBox').style.backgroundImage = `url('${found.image}')`;
            
            const badgeEl = document.getElementById('detailCoverTagBadge');
            if (badgeEl) badgeEl.textContent = found.coverType || 'Manga';
            
            const ratingEl = document.getElementById('detailRatingText');
            if (ratingEl) ratingEl.textContent = found.rating || '4.9 / 5.0';
            
            const heroEl = document.getElementById('cinematicHero');
            if (heroEl && found.image) {
                heroEl.style.setProperty('--hero-bg', `url('${found.image}')`);
            }
            
            if (found.description) {
                document.getElementById('detailDescription').textContent = found.description;
            }
            
            if (found.genre) {
                const genresContainer = document.getElementById('detailGenresContainer');
                genresContainer.innerHTML = '';
                const genresList = found.genre.split(',');
                genresList.forEach(g => {
                    const cleanG = g.trim();
                    if (cleanG !== '') {
                        const tag = document.createElement('div');
                        tag.className = "individual-genre-frame";
                        tag.textContent = cleanG;
                        genresContainer.appendChild(tag);
                    }
                });
            }
            renderChapterList(found.id);
        }
    }
    
    if (state.view === 'reader') {
        targetId = 'readerView';
        renderReaderContent(state.id);
    }
    
    const targetSection = document.getElementById(targetId);
    if (targetSection) targetSection.classList.remove('hidden');
    
    const headerBar = document.getElementById('mainHeaderBar');
    const sakuraCanvas = document.getElementById('sakuraCanvas');
    
    if (targetId === 'detailView') {
        if (headerBar) headerBar.classList.add('hidden');
        if (sakuraCanvas) sakuraCanvas.style.display = 'none';
    } else {
        if (headerBar) headerBar.classList.remove('hidden');
        if (sakuraCanvas) sakuraCanvas.style.display = 'block';
    }
    
    if (targetId === 'homeView') {
        renderHotShowcase();
        renderMainMangaGrid();
    }
    
    if (state.view === 'detail') {
        window.scrollTo(0, 0);
    } else if (state.view === 'reader' && !isRestore) {
        window.scrollTo(0, 0);
    } else {
        setTimeout(() => {
            const savedPos = scrollPositions[targetId] || 0;
            window.scrollTo(0, savedPos);
        }, 30);
    }
}

// UI Controls & Sidebar Drawer Controls
window.toggleSearchBar = function() {
    const overlay = document.getElementById('searchOverlay');
    overlay.classList.toggle('hidden');
    if (!overlay.classList.contains('hidden')) {
        document.getElementById('searchInput').focus();
    }
};

window.toggleDarkMode = function() {
    const html = document.documentElement;
    const icon = document.getElementById('themeIcon');
    
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        icon.className = "fa-solid fa-sun text-sm sm:text-base text-amber-500";
    } else {
        html.classList.add('dark');
        icon.className = "fa-solid fa-moon text-sm sm:text-base text-sakura-300";
    }
};

window.toggleRightSidebar = function() {
    const sidebar = document.getElementById('rightSidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    
    const isOpen = !sidebar.classList.contains('translate-x-full');
    if (isOpen) {
        sidebar.classList.add('translate-x-full');
        backdrop.classList.add('opacity-0', 'pointer-events-none');
    } else {
        sidebar.classList.remove('translate-x-full');
        backdrop.classList.remove('opacity-0', 'pointer-events-none');
        setTimeout(resizeSidebarCanvas, 50);
    }
};

// --- Cinematic Anime Sakura Canvas Animation Engine ---
const sidebarCanvas = document.getElementById('sidebarSakuraCanvas');
let sCtx = sidebarCanvas ? sidebarCanvas.getContext('2d') : null;
let sWidth, sHeight;

function resizeSidebarCanvas() {
    if (!sidebarCanvas) return;
    sWidth = sidebarCanvas.width = sidebarCanvas.parentElement.clientWidth;
    sHeight = sidebarCanvas.height = sidebarCanvas.parentElement.clientHeight;
}

window.addEventListener('resize', resizeSidebarCanvas);
if (sidebarCanvas) resizeSidebarCanvas();

class BranchNode {
    constructor(x, y, length, angle, width, depth) {
        this.x = x;
        this.y = y;
        this.length = length;
        this.angle = angle;
        this.baseAngle = angle;
        this.width = width;
        this.depth = depth;
        this.children = [];
        this.clusters = [];
        this.swayOffset = Math.random() * Math.PI * 2;
        this.swaySpeed = 0.012 + Math.random() * 0.008;
        this.buildSubBranches();
    }
    
    buildSubBranches() {
        if (this.depth <= 0) return;
        let numChildren = this.depth > 2 ? 2 : (Math.random() > 0.5 ? 1 : 2);
        for (let i = 0; i < numChildren; i++) {
            let angleDiff = (i === 0 ? -1 : 1) * (0.25 + Math.random() * 0.35);
            let newLength = this.length * (0.7 + Math.random() * 0.15);
            let newWidth = this.width * 0.62;
            let endX = this.x + Math.cos(this.angle + angleDiff) * this.length;
            let endY = this.y + Math.sin(this.angle + angleDiff) * this.length;
            this.children.push(new BranchNode(endX, endY, newLength, this.angle + angleDiff, newWidth, this.depth - 1));
        }
        if (this.depth <= 2) {
            let numClusters = 2 + Math.floor(Math.random() * 3);
            for (let c = 0; c < numClusters; c++) {
                let t = c / numClusters;
                let cx = this.x + Math.cos(this.angle) * (this.length * t) + (Math.random() - 0.5) * 15;
                let cy = this.y + Math.sin(this.angle) * (this.length * t) + (Math.random() - 0.5) * 15;
                this.clusters.push(new FlowerCluster(cx, cy));
            }
        }
    }
    
    update(time, parentWind) {
        this.swayOffset += this.swaySpeed;
        let windEffect = Math.sin(time * 1.8 + this.swayOffset) * 0.045;
        this.angle = this.baseAngle + windEffect + parentWind;
        for (let child of this.children) {
            child.update(time, windEffect);
        }
        for (let cluster of this.clusters) {
            cluster.update(time);
        }
    }
    
    draw(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        let endX = this.x + Math.cos(this.angle) * this.length;
        let endY = this.y + Math.sin(this.angle) * this.length;
        let ctrlX = this.x + Math.cos(this.angle + 0.15) * (this.length * 0.5);
        let ctrlY = this.y + Math.sin(this.angle + 0.15) * (this.length * 0.5);
        
        ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
        ctx.strokeStyle = this.depth > 2 ? '#140c12' : '#22151c';
        ctx.lineWidth = this.width;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        for (let child of this.children) {
            child.x = endX;
            child.y = endY;
            child.draw(ctx);
        }
        for (let cluster of this.clusters) {
            cluster.draw(ctx);
        }
    }
}

class FlowerCluster {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.flowers = [];
        let count = 4 + Math.floor(Math.random() * 4);
        for (let i = 0; i < count; i++) {
            this.flowers.push({
                offsetX: (Math.random() - 0.5) * 20,
                offsetY: (Math.random() - 0.5) * 20,
                size: 4 + Math.random() * 4,
                rotation: Math.random() * Math.PI,
                pulseOffset: Math.random() * 10
            });
        }
    }
    
    update(time) {
        if (Math.random() < 0.0015) {
            let f = this.flowers[Math.floor(Math.random() * this.flowers.length)];
            sidebarPetals.push(new SidebarPetal(this.x + f.offsetX, this.y + f.offsetY));
        }
    }
    
    draw(ctx) {
        for (let f of this.flowers) {
            let fx = this.x + f.offsetX;
            let fy = this.y + f.offsetY;
            ctx.save();
            ctx.translate(fx, fy);
            ctx.rotate(f.rotation + Math.sin(Date.now() * 0.002 + f.pulseOffset) * 0.15);
            for (let p = 0; p < 5; p++) {
                ctx.rotate((Math.PI * 2) / 5);
                ctx.beginPath();
                ctx.fillStyle = '#ffb3c6';
                ctx.shadowColor = '#ff70a6';
                ctx.shadowBlur = 4;
                ctx.ellipse(0, -f.size * 0.55, f.size * 0.32, f.size * 0.55, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.beginPath();
            ctx.arc(0, 0, f.size * 0.18, 0, Math.PI * 2);
            ctx.fillStyle = '#ff2a75';
            ctx.fill();
            ctx.restore();
        }
    }
}

class SidebarPetal {
    constructor(x, y) {
        this.x = x || Math.random() * sWidth;
        this.y = y || Math.random() * sHeight * 0.4;
        this.size = 3 + Math.random() * 4;
        this.speedX = Math.random() * 0.8 + 0.4;
        this.speedY = Math.random() * 0.6 + 0.3;
        this.angle = Math.random() * Math.PI * 2;
        this.spinSpeed = (Math.random() - 0.5) * 0.05;
        this.oscillationSpeed = 0.02 + Math.random() * 0.02;
        this.initialX = this.x;
        this.age = 0;
        this.maxAge = 350 + Math.random() * 200;
        this.opacity = 0;
    }
    
    update(time) {
        this.age++;
        if (this.opacity < 1) this.opacity += 0.02;
        let windForce = 1.0 + Math.sin(time * 1.2 + this.initialX * 0.01) * 0.4;
        this.speedX = windForce + Math.cos(time * this.oscillationSpeed) * 0.3;
        this.speedY = 0.7 + Math.sin(time * 0.8 + this.initialX) * 0.2;
        this.x += this.speedX;
        this.y += this.speedY;
        this.angle += this.spinSpeed;
        if (this.y > sHeight + 20 || this.x > sWidth + 20 || this.age > this.maxAge) {
            this.reset();
        }
    }
    
    reset() {
        this.x = -20 + Math.random() * (sWidth + 20);
        this.y = -10 - Math.random() * 30;
        this.size = 3 + Math.random() * 4;
        this.speedX = Math.random() * 0.8 + 0.4;
        this.speedY = Math.random() * 0.6 + 0.3;
        this.angle = Math.random() * Math.PI * 2;
        this.spinSpeed = (Math.random() - 0.5) * 0.05;
        this.initialX = this.x;
        this.age = 0;
        this.maxAge = 350 + Math.random() * 200;
        this.opacity = 0;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.globalAlpha = Math.min(1, this.opacity) * 0.75;
        ctx.beginPath();
        ctx.fillStyle = '#ffb3c6';
        ctx.shadowColor = '#ff70a6';
        ctx.shadowBlur = 4;
        ctx.ellipse(0, 0, this.size * 0.38, this.size, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

let sidebarBranches = [];
let sidebarPetals = [];

function initSidebarScene() {
    if (!sidebarCanvas) return;
    sidebarBranches = [];
    sidebarPetals = [];
    if (!sWidth || !sHeight) resizeSidebarCanvas();
    sidebarBranches.push(new BranchNode(sWidth + 10, -10, 180, 2.6, 18, 3));
    sidebarBranches.push(new BranchNode(-10, sHeight + 10, 150, -0.6, 15, 2));
    let totalPetals = 20;
    for (let i = 0; i < totalPetals; i++) {
        let p = new SidebarPetal();
        p.y = Math.random() * sHeight;
        p.x = Math.random() * sWidth;
        sidebarPetals.push(p);
    }
}

if (sidebarCanvas) {
    initSidebarScene();
    let sStartTime = Date.now();
    function animateSidebar() {
        let time = (Date.now() - sStartTime) * 0.001;
        sCtx.clearRect(0, 0, sWidth, sHeight);
        let bgGrad = sCtx.createLinearGradient(0, 0, 0, sHeight);
        bgGrad.addColorStop(0, '#060814');
        bgGrad.addColorStop(1, '#180e1f');
        sCtx.fillStyle = bgGrad;
        sCtx.fillRect(0, 0, sWidth, sHeight);
        for (let branch of sidebarBranches) {
            branch.update(time, 0);
            branch.draw(sCtx);
        }
        for (let petal of sidebarPetals) {
            petal.update(time);
            petal.draw(sCtx);
        }
        requestAnimationFrame(animateSidebar);
    }
    animateSidebar();
}

function initSakuraPetals() {
    const canvas = document.getElementById('sakuraCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    const petals = Array.from({ length: 22 }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 3.5 + 2.5,
        speedY: Math.random() * 0.7 + 0.3,
        speedX: Math.random() * 0.4 - 0.2,
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 1.2 - 0.6,
        opacity: Math.random() * 0.5 + 0.2
    }));
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        petals.forEach(p => {
            p.y += p.speedY;
            p.x += p.speedX;
            p.rotation += p.rotationSpeed;
            if (p.y > canvas.height) {
                p.y = -10;
                p.x = Math.random() * canvas.width;
            }
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = '#ff5c8a';
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size, p.size * 1.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
        requestAnimationFrame(animate);
    }
    animate();
}

// Global DOM Content Loaded Initialization
window.addEventListener('DOMContentLoaded', () => {
    initSakuraPetals();
    listenToFirebaseData();
    restoreViewFromHash();
    
    window.addEventListener('storage', (e) => {
        if (e.key === SHARED_STORAGE_KEY) {
            refreshCurrentView();
        }
    });
});

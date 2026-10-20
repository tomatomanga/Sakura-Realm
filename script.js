// --- Firebase Config & SDK Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getDatabase, ref, onValue, update, get } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";

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

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// --- Global State & Shared Storage Keys ---
const SHARED_STORAGE_KEY = "sakura_shared_master_mangas_v1";
let currentMangaData = [];

// Filter States
let currentReleaseFilter = 'all';
let selectedGenres = [];

// Reader Settings State
let currentReadingMode = 'scroll';
let currentImageQuality = 'high';
let currentPageIndex = 0;
let totalChapterPages = [];

let startX = 0;
let startY = 0;
let currentX = 0;
let isDragging = false;
let isLocked = false;
let containerWidth = 0;
let lastReaderScrollTop = 0;

let currentActiveView = 'home';
let previousActiveView = '';

// --- Firebase Realtime Database Listener ---
function listenToFirebaseData() {
    const mangaRef = ref(database, 'manga_list');
    onValue(mangaRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            let formattedList = Object.keys(data).map(key => {
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
                    views: Number(item.views || 0),
                    createdAt: Number(item.created_at || item.createdAt || Date.now()),
                    description: item.description || 'Cinematic Manga Experience desu~',
                    genre: item.genre || 'Action, Fantasy',
                    chapters: chaptersArr
                };
            });

            formattedList.sort((a, b) => b.views - a.views);
            currentMangaData = formattedList;
            localStorage.setItem(SHARED_STORAGE_KEY, JSON.stringify(formattedList));
        } else {
            currentMangaData = JSON.parse(localStorage.getItem(SHARED_STORAGE_KEY)) || [];
        }
        refreshCurrentView();
        populateFilterGenres();
    }, (error) => {
        console.warn("Firebase Read Warning/Fallback:", error);
        currentMangaData = JSON.parse(localStorage.getItem(SHARED_STORAGE_KEY)) || [];
        refreshCurrentView();
        populateFilterGenres();
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

// --- FILTER MODAL CONTROLS ---
window.toggleFilterModal = function() {
    const modal = document.getElementById('filterModal');
    const backdrop = document.getElementById('filterBackdrop');
    const isOpen = modal.classList.contains('show');
    
    if (isOpen) {
        modal.classList.remove('show');
        backdrop.classList.add('opacity-0', 'pointer-events-none');
    } else {
        modal.classList.add('show');
        backdrop.classList.remove('opacity-0', 'pointer-events-none');
    }
};

window.setReleaseFilter = function(type) {
    currentReleaseFilter = type;
    document.getElementById('filterRelAll').className = type === 'all' ? "setting-btn-active py-2.5 px-2 rounded-xl border transition text-center text-xs" : "setting-btn-inactive py-2.5 px-2 rounded-xl border transition text-center text-xs";
    document.getElementById('filterRelNew').className = type === 'new' ? "setting-btn-active py-2.5 px-2 rounded-xl border transition text-center text-xs" : "setting-btn-inactive py-2.5 px-2 rounded-xl border transition text-center text-xs";
    document.getElementById('filterRelOld').className = type === 'old' ? "setting-btn-active py-2.5 px-2 rounded-xl border transition text-center text-xs" : "setting-btn-inactive py-2.5 px-2 rounded-xl border transition text-center text-xs";
};

function populateFilterGenres() {
    const container = document.getElementById('filterGenresList');
    if (!container) return;
    
    const mangas = loadSharedMangas();
    const defaultGenres = [
        'Action', 'Adventure', 'Fantasy', 'Romance', 'Comedy', 
        'Sci-Fi', 'Supernatural', 'Isekai', 'Drama', 'Mystery', 
        'Horror', 'Slice of Life', 'Martial Arts', 'Seinen', 'Shonen'
    ];
    
    const genresSet = new Set(defaultGenres);
    mangas.forEach(m => {
        if (m.genre) {
            m.genre.split(',').forEach(g => {
                const clean = g.trim();
                if (clean) genresSet.add(clean);
            });
        }
    });
    
    container.innerHTML = '';
    genresSet.forEach(g => {
        const btn = document.createElement('button');
        const isSelected = selectedGenres.includes(g);
        
        btn.className = isSelected ? 
            "setting-btn-active py-1.5 px-2.5 rounded-lg border text-[11px] font-bold transition shadow-sakura-sm" : 
            "setting-btn-inactive py-1.5 px-2.5 rounded-lg border text-[11px] font-bold transition";
        
        btn.innerHTML = `${g} ${isSelected ? '<i class="fa-solid fa-check ml-1 text-[9px]"></i>' : ''}`;
        
        btn.onclick = () => {
            if (isSelected) {
                selectedGenres = selectedGenres.filter(item => item !== g);
            } else {
                selectedGenres.push(g);
            }
            populateFilterGenres();
        };
        container.appendChild(btn);
    });
}

window.clearAllGenres = function() {
    selectedGenres = [];
    populateFilterGenres();
};

window.applyFilters = function() {
    toggleFilterModal();
    renderMainMangaGrid();
};

async function incrementMangaViewCount(mangaId) {
    if (!mangaId) return;
    try {
        const mangaItemRef = ref(database, `manga_list/${mangaId}`);
        const snapshot = await get(mangaItemRef);
        if (snapshot.exists()) {
            const currentData = snapshot.val();
            const currentViews = Number(currentData.views || 0);
            await update(mangaItemRef, { views: currentViews + 1 });
        }
    } catch (err) {
        console.warn("Failed to increment view count:", err);
    }
}

function isMangaNew(createdAtTimestamp) {
    if (!createdAtTimestamp) return false;
    const now = Date.now();
    const twoDaysInMillis = 2 * 24 * 60 * 60 * 1000;
    return (now - createdAtTimestamp) < twoDaysInMillis;
}

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

window.toggleSettingsModal = function() {
    const modal = document.getElementById('settingsModal');
    const backdrop = document.getElementById('settingsBackdrop');
    const isOpen = modal.classList.contains('show');
    
    if (isOpen) {
        modal.classList.remove('show');
        backdrop.classList.add('opacity-0', 'pointer-events-none');
    } else {
        modal.classList.add('show');
        backdrop.classList.remove('opacity-0', 'pointer-events-none');
    }
};

window.setReadingMode = function(mode) {
    currentReadingMode = mode;
    const scrollBtn = document.getElementById('modeScrollBtn');
    const pageBtn = document.getElementById('modePageBtn');
    
    if (mode === 'scroll') {
        scrollBtn.className = "setting-btn-active py-3 px-3 rounded-xl border transition text-center shadow-md flex items-center justify-center gap-2";
        pageBtn.className = "setting-btn-inactive py-3 px-3 rounded-xl border transition text-center shadow-md flex items-center justify-center gap-2";
    } else {
        pageBtn.className = "setting-btn-active py-3 px-3 rounded-xl border transition text-center shadow-md flex items-center justify-center gap-2";
        scrollBtn.className = "setting-btn-inactive py-3 px-3 rounded-xl border transition text-center shadow-md flex items-center justify-center gap-2";
    }
    
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('reader-')) {
        renderReaderContent(hash.replace('reader-', ''));
    }
    toggleSettingsModal();
};

window.setImageQuality = function(quality) {
    currentImageQuality = quality;
    const qualLow = document.getElementById('qualLow');
    const qualMed = document.getElementById('qualMed');
    const qualHigh = document.getElementById('qualHigh');
    
    qualLow.className = "setting-btn-inactive py-2.5 px-2 rounded-xl border transition text-center flex items-center justify-center gap-1.5 text-xs";
    qualMed.className = "setting-btn-inactive py-2.5 px-2 rounded-xl border transition text-center flex items-center justify-center gap-1.5 text-xs";
    qualHigh.className = "setting-btn-inactive py-2.5 px-2 rounded-xl border transition text-center flex items-center justify-center gap-1.5 text-xs";
    
    if (quality === 'low') {
        qualLow.className = "setting-btn-active py-2.5 px-2 rounded-xl border transition text-center flex items-center justify-center gap-1.5 text-xs shadow-md";
    } else if (quality === 'medium') {
        qualMed.className = "setting-btn-active py-2.5 px-2 rounded-xl border transition text-center flex items-center justify-center gap-1.5 text-xs shadow-md";
    } else if (quality === 'high') {
        qualHigh.className = "setting-btn-active py-2.5 px-2 rounded-xl border transition text-center flex items-center justify-center gap-1.5 text-xs shadow-md";
    }
    
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('reader-')) {
        renderReaderContent(hash.replace('reader-', ''));
    }
    toggleSettingsModal();
};

function loadDownscaledImage(originalUrl, imgElement, loaderElement) {
    if (currentImageQuality === 'high') {
        imgElement.src = originalUrl;
        return;
    }
    
    const targetHeight = currentImageQuality === 'low' ? 480 : 720;
    const imageObj = new Image();
    imageObj.crossOrigin = "anonymous";
    imageObj.src = originalUrl;
    
    imageObj.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const scaleFactor = targetHeight / imageObj.height;
        
        canvas.height = targetHeight;
        canvas.width = Math.round(imageObj.width * scaleFactor);
        ctx.drawImage(imageObj, 0, 0, canvas.width, canvas.height);
        
        const jpegQuality = currentImageQuality === 'low' ? 0.5 : 0.75;
        imgElement.src = canvas.toDataURL('image/jpeg', jpegQuality);
    };
    
    imageObj.onerror = function() {
        imgElement.src = originalUrl;
    };
}

function getStatusClass(statusText) {
    if (!statusText) return 'status-ongoing';
    const lower = statusText.toLowerCase();
    if (lower.includes('complete') || lower.includes('completed')) {
        return 'status-complete';
    } else if (lower.includes('pause') || lower.includes('paused')) {
        return 'status-pause';
    }
    return 'status-ongoing';
}

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
        
        const mangaStatus = manga.status || 'Ongoing';
        const statusClass = getStatusClass(mangaStatus);
        
        card.innerHTML = `
            <div class="absolute inset-0 bg-gradient-to-t from-dark-base via-dark-card/40 to-transparent z-10"></div>
            <div class="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition duration-500" style="background-image: url('${manga.image}')"></div>
            <div class="absolute top-2.5 left-2.5 z-20">
                <span class="px-2 py-0.5 rounded-md bg-dark-card/90 text-white font-bold text-[9px] border border-dark-border shadow-sm">HOT #${rank}</span>
            </div>
            <div class="absolute bottom-3 left-3 right-3 z-20 space-y-1">
                <h3 class="formula-manga-title !mt-0 !text-left !text-xs !w-full text-white group-hover:text-sakura-300 transition line-clamp-1">${manga.title}</h3>
                <p class="text-[10px] font-semibold uppercase tracking-wider ${statusClass}">${mangaStatus}</p>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderMainMangaGrid() {
    const gridContainer = document.getElementById("mainMangaGridContainer");
    if (!gridContainer) return;
    const mangas = loadSharedMangas();
    gridContainer.innerHTML = "";
    
    const filteredMangas = mangas.filter(manga => {
        const isNew = isMangaNew(manga.createdAt);
        if (currentReleaseFilter === 'new' && !isNew) return false;
        if (currentReleaseFilter === 'old' && isNew) return false;
        
        if (selectedGenres.length > 0) {
            const mangaGenres = manga.genre ? manga.genre.split(',').map(g => g.trim().toLowerCase()) : [];
            const matchesAny = selectedGenres.some(sg => mangaGenres.includes(sg.toLowerCase()));
            if (!matchesAny) return false;
        }
        return true;
    });
    
    if (filteredMangas.length === 0) {
        gridContainer.innerHTML = `
            <div class="col-span-2 py-10 text-center text-xs text-slate-400/80 italic glass-card rounded-2xl border border-dark-border">
                No Manga found matching filter desu~
            </div>
        `;
        return;
    }
    
    filteredMangas.forEach((manga) => {
        const card = document.createElement("div");
        card.className = "formula-manga-card";
        card.onclick = () => window.navigateToView('detail', manga.id, manga.title);
        
        const coverTagType = manga.coverType || 'Manga';
        const mangaStatus = manga.status || 'Ongoing';
        const statusClass = getStatusClass(mangaStatus);
        const isNew = isMangaNew(manga.createdAt);
        const newBadgeHtml = isNew ? `<div class="formula-new-badge">NEW</div>` : '';
        
        card.innerHTML = `
            <div class="clean-single-bold-frame">
                <div class="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition duration-500" style="background-image: url('${manga.image}')"></div>
                <div class="formula-type-badge">
                    <span>${coverTagType}</span>
                </div>
                ${newBadgeHtml}
                <div class="formula-chapter-tag ${statusClass}">
                    <i class="fa-solid fa-circle-dot mr-1 text-[7px]"></i>${mangaStatus}
                </div>
            </div>
            <h3 class="formula-manga-title">${manga.title}</h3>
        `;
        gridContainer.appendChild(card);
    });
}

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
                    <span class="text-[10px] text-slate-400">${ch.date || 'Recent Release'}   ${pageCountText}</span>
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
    if (mangaId) {
        incrementMangaViewCount(mangaId);
    }
    window.navigateToView('reader', `${mangaId}___${chapterId}`, chapterTitle);
}

// Function to return from Reader View back to Chapter Lobby (Detail) with slide left-to-right animation
window.goBackToDetailFromReader = function() {
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('reader-')) {
        const readerParam = hash.replace('reader-', '');
        const [mangaId] = readerParam.includes('___') ? readerParam.split('___') : [null];
        if (mangaId) {
            window.navigateToView('detail', mangaId, 'Chapter Lobby');
            return;
        }
    }
    goHome();
};

const scrollPositions = {};

window.navigateToView = function(viewName, id = '', title = '') {
    previousActiveView = currentActiveView;
    currentActiveView = viewName;

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

window.addEventListener('popstate', (e) => {
    if (e.state && e.state.view) {
        previousActiveView = currentActiveView;
        currentActiveView = e.state.view;
    }
    restoreViewFromHash();
});

function restoreViewFromHash() {
    const hash = window.location.hash.replace('#', '');
    if (!hash) {
        previousActiveView = currentActiveView;
        currentActiveView = 'home';
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

window.handleReaderScreenTap = function(event) {
    if (isDragging) return;
    const floatingBar = document.getElementById('readerFloatingBar');
    const modal = document.getElementById('settingsModal');
    if (modal && modal.classList.contains('show')) return;
    
    if (floatingBar) {
        floatingBar.classList.toggle('show');
    }
};

function getClientX(e) {
    return e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
}

function getClientY(e) {
    return e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
}

function dragStart(e) {
    if (currentReadingMode !== 'page') return;
    isDragging = true;
    isLocked = false;
    startX = getClientX(e);
    startY = getClientY(e);
    currentX = startX;
    
    const container = document.getElementById('readerPagesContainer');
    containerWidth = container.offsetWidth || window.innerWidth;
    const wrappers = document.querySelectorAll('.manga-page-wrapper.page-mode');
    wrappers.forEach(w => w.classList.add('dragging'));
}

function dragMove(e) {
    if (currentReadingMode !== 'page' || !isDragging) return;
    const currentTouchX = getClientX(e);
    const currentTouchY = getClientY(e);
    
    let diffX = currentTouchX - startX;
    let diffY = currentTouchY - startY;

    if (!isLocked && (Math.abs(diffX) > 5 || Math.abs(diffY) > 5)) {
        if (Math.abs(diffY) > Math.abs(diffX)) {
            isDragging = false;
            const wrappers = document.querySelectorAll('.manga-page-wrapper.page-mode');
            wrappers.forEach(w => w.classList.remove('dragging'));
            updatePagePositions();
            return;
        }
        isLocked = true;
    }

    currentX = currentTouchX;
    const wrappers = document.querySelectorAll('.manga-page-wrapper.page-mode');
    if (wrappers.length === 0) return;
    const currentElem = wrappers[currentPageIndex];
    if (!currentElem) return;

    if ((currentPageIndex === 0 && diffX > 0) || (currentPageIndex === wrappers.length - 1 && diffX < 0)) {
        diffX = diffX / 3.5;
    }

    currentElem.style.transform = `translate3d(${diffX}px, 0, 0)`;

    if (diffX < 0 && currentPageIndex < wrappers.length - 1) {
        const nextElem = wrappers[currentPageIndex + 1];
        if (nextElem) {
            nextElem.style.transform = `translate3d(${containerWidth + diffX}px, 0, 0)`;
        }
    } else if (diffX > 0 && currentPageIndex > 0) {
        const prevElem = wrappers[currentPageIndex - 1];
        if (prevElem) {
            prevElem.style.transform = `translate3d(${-containerWidth + diffX}px, 0, 0)`;
        }
    }
}

function dragEnd(e) {
    if (currentReadingMode !== 'page' || !isDragging) return;
    isDragging = false;
    isLocked = false;
    let diffX = currentX - startX;
    const instantThreshold = 35; 

    const wrappers = document.querySelectorAll('.manga-page-wrapper.page-mode');
    wrappers.forEach(w => w.classList.remove('dragging'));

    if (diffX < -instantThreshold && currentPageIndex < wrappers.length - 1) {
        changePage(1);
    } else if (diffX > instantThreshold && currentPageIndex > 0) {
        changePage(-1);
    } else {
        updatePagePositions();
    }
    currentX = startX = startY = 0;
}

window.changePage = function(direction) {
    if (currentReadingMode !== 'page') return;
    let targetPage = currentPageIndex + direction;
    const wrappers = document.querySelectorAll('.manga-page-wrapper.page-mode');
    if (targetPage < 0 || targetPage >= wrappers.length) return;
    currentPageIndex = targetPage;
    updatePagePositions();
};

function updatePagePositions() {
    const wrappers = document.querySelectorAll('.manga-page-wrapper.page-mode');
    wrappers.forEach((elem, index) => {
        elem.style.transform = '';
        if (index < currentPageIndex) {
            elem.className = 'manga-page-wrapper page-mode prev-page';
        } else if (index > currentPageIndex) {
            elem.className = 'manga-page-wrapper page-mode next-page';
        } else {
            elem.className = 'manga-page-wrapper page-mode active-page';
        }
    });

    const readerSec = document.getElementById('readerView');
    if (readerSec) readerSec.scrollTop = 0;
    window.scrollTo(0, 0);
}

function setupReaderTouchEvents() {
    const container = document.getElementById('readerPagesContainer');
    if (!container) return;

    container.removeEventListener('touchstart', dragStart);
    container.removeEventListener('touchmove', dragMove);
    container.removeEventListener('touchend', dragEnd);
    container.removeEventListener('mousedown', dragStart);
    window.removeEventListener('mousemove', dragMove);
    window.removeEventListener('mouseup', dragEnd);

    container.addEventListener('touchstart', dragStart, { passive: true });
    container.addEventListener('touchmove', dragMove, { passive: true });
    container.addEventListener('touchend', dragEnd);
    container.addEventListener('mousedown', dragStart);
    window.addEventListener('mousemove', dragMove);
    window.addEventListener('mouseup', dragEnd);
}

const readerViewElement = document.getElementById('readerView');
if (readerViewElement) {
    readerViewElement.addEventListener('scroll', function() {
        if (currentReadingMode !== 'scroll') return;
        const floatingBar = document.getElementById('readerFloatingBar');
        if (!floatingBar || !floatingBar.classList.contains('show')) return;
        
        let currentScroll = readerViewElement.scrollTop;
        if (currentScroll > lastReaderScrollTop && currentScroll > 10) {
            floatingBar.classList.remove('show');
        }
        lastReaderScrollTop = currentScroll <= 0 ? 0 : currentScroll;
    }, { passive: true });
}

function renderReaderContent(readerParam) {
    const container = document.getElementById('readerPagesContainer');
    const readerSection = document.getElementById('readerView');
    if (!container) return;
    container.innerHTML = '';
    
    const [mangaId, chapterId] = readerParam.includes('___') ? readerParam.split('___') : [null, readerParam];
    const floatingTitle = document.getElementById('readerFloatingTitle');
    
    if (floatingTitle && mangaId) {
        const mangas = loadSharedMangas();
        const foundManga = mangas.find(m => m.id === mangaId);
        if (foundManga && foundManga.chapters) {
            const foundCh = foundManga.chapters.find(c => c.id === chapterId);
            if (foundCh) floatingTitle.textContent = `${foundManga.title} - ${foundCh.title}`;
        }
    }
    
    if (mangaId) {
        const mangas = loadSharedMangas();
        const foundManga = mangas.find(m => m.id === mangaId);
        if (foundManga && foundManga.chapters) {
            const foundCh = foundManga.chapters.find(c => c.id === chapterId);
            if (foundCh && foundCh.pages && foundCh.pages.length > 0) {
                totalChapterPages = foundCh.pages;
                currentPageIndex = 0;
                
                if (currentReadingMode === 'scroll') {
                    container.style.overflowY = 'auto';
                    container.style.height = 'auto';
                } else {
                    container.style.overflowY = 'hidden';
                    container.style.height = '100vh';
                }
                
                foundCh.pages.forEach((pageObj, index) => {
                    const rawUrl = pageObj.data || pageObj;
                    const wrapper = document.createElement('div');
                    wrapper.id = `manga-page-${index}`;
                    
                    if (currentReadingMode === 'page') {
                        if (index === 0) {
                            wrapper.className = "manga-page-wrapper page-mode active-page";
                        } else {
                            wrapper.className = "manga-page-wrapper page-mode next-page";
                        }
                    } else {
                        wrapper.className = "manga-page-wrapper w-full flex justify-center m-0 p-0";
                    }
                    
                    const loader = document.createElement('div');
                    loader.className = "simple-loading-text";
                    loader.textContent = "Loading...";
                    
                    const img = document.createElement('img');
                    img.loading = "lazy";
                    img.className = "manga-page-img";
                    
                    loadDownscaledImage(rawUrl, img, loader);
                    
                    img.onload = () => {
                        img.classList.add('loaded');
                        loader.style.opacity = '0';
                        setTimeout(() => loader.remove(), 250);
                    };
                    
                    img.onerror = () => {
                        loader.textContent = "Failed to load";
                    };
                    
                    wrapper.appendChild(loader);
                    wrapper.appendChild(img);
                    container.appendChild(wrapper);
                });
                
                setupReaderTouchEvents();
                if (readerSection) readerSection.scrollTop = 0;
                window.scrollTo(0, 0);
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;
                return;
            }
        }
    }
    
    container.innerHTML = `
        <div class="p-10 text-center text-slate-400 text-xs w-full">
            Manga Panel Image Placeholder desu~ (Upload chapters from Uploader Panel to view actual images!)
        </div>
    `;
    if (readerSection) readerSection.scrollTop = 0;
    window.scrollTo(0, 0);
}

function renderView(state, isRestore = false) {
    const views = ['homeView', 'genresView', 'detailView', 'readerView'];
    views.forEach(v => {
        const el = document.getElementById(v);
        el.classList.add('hidden');
        el.classList.remove('lobby-slide-right-transition', 'lobby-slide-left-transition');
    });
    
    const floatingBar = document.getElementById('readerFloatingBar');
    const modal = document.getElementById('settingsModal');
    const backdrop = document.getElementById('settingsBackdrop');
    
    if (floatingBar && state.view !== 'reader') floatingBar.classList.remove('show');
    if (modal) modal.classList.remove('show');
    if (backdrop) backdrop.classList.add('opacity-0', 'pointer-events-none');
    
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
    if (targetSection) {
        targetSection.classList.remove('hidden');
        
        // Strict Directional Check: If coming from reader to detail, slide Left-to-Right. Otherwise, slide Right-to-Left.
        if (previousActiveView === 'reader' && state.view === 'detail') {
            targetSection.classList.add('lobby-slide-left-transition');
        } else if (state.view !== 'home') {
            targetSection.classList.add('lobby-slide-right-transition');
        }
    }
    
    const headerBar = document.getElementById('mainHeaderBar');
    const sakuraCanvas = document.getElementById('sakuraCanvas');
    
    if (targetId === 'readerView') {
        if (headerBar) headerBar.classList.add('hidden');
        if (sakuraCanvas) sakuraCanvas.style.display = 'none';
    } else if (targetId === 'detailView') {
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
    
    if (state.view === 'reader') {
        const readerSec = document.getElementById('readerView');
        if (readerSec) readerSec.scrollTop = 0;
        window.scrollTo(0, 0);
    } else if (state.view === 'detail') {
        window.scrollTo(0, 0);
    } else {
        setTimeout(() => {
            const savedPos = scrollPositions[targetId] || 0;
            window.scrollTo(0, savedPos);
        }, 30);
    }
}

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
let sStartTime = Date.now();

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

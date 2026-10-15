// --- SPA Engine, Shared Master ID Sync & Cinematic Sidebar ---

const SHARED_STORAGE_KEY = "sakura_shared_master_mangas_v1";

function loadSharedMangas() {
    return JSON.parse(localStorage.getItem(SHARED_STORAGE_KEY)) || [];
}

function renderHotShowcase() {
    const container = document.getElementById("showcaseScrollContainer");
    if (!container) return;

    const mangas = loadSharedMangas();
    container.innerHTML = "";

    if (mangas.length === 0) {
        container.innerHTML = `
            <div class="w-full py-5 text-center text-xs text-slate-400/80 italic glass-card rounded-xl border border-sakura-500/15">
                🌸 Uploader မှ တင်ထားသော Manga များ ဤနေရာတွင် ပေါ်လာပါမည် ~
            </div>
        `;
        return;
    }

    mangas.forEach((manga, index) => {
        const rank = index + 1;
        const card = document.createElement("div");
        card.className = "showcase-card shrink-0 w-36 sm:w-44 h-48 sm:h-56 rounded-2xl relative overflow-hidden cursor-pointer group snap-start border border-sakura-500/30 shadow-lg";
        card.onclick = () => navigateToView('detail', manga.id, manga.title);

        card.innerHTML = `
            <div class="absolute inset-0 bg-gradient-to-t from-dark-base via-dark-card/40 to-transparent z-10"></div>
            <div class="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition duration-500" style="background-image: url('${manga.image}')"></div>
            <div class="absolute top-2.5 left-2.5 z-20">
                <span class="px-2 py-0.5 rounded-md bg-sakura-600/90 text-white font-bold text-[9px] shadow-sakura-sm">HOT #${rank}</span>
            </div>
            <div class="absolute bottom-3 left-3 right-3 z-20 space-y-1">
                <h3 class="text-xs sm:text-sm font-bold text-white group-hover:text-sakura-300 transition line-clamp-1">${manga.title}</h3>
                <p class="text-[10px] text-sakura-400 font-semibold">${manga.chapter}</p>
            </div>
        `;
        container.appendChild(card);
    });
}

const scrollPositions = {};

function navigateToView(viewName, id = '', title = '') {
    const activeSection = document.querySelector('.view-section:not(.hidden)');
    if (activeSection) {
        scrollPositions[activeSection.id] = window.scrollY;
    }

    const stateData = { view: viewName, id: id, title: title };
    const hash = `#${viewName}${id ? '-' + id : ''}`;
    history.pushState(stateData, '', hash);
    renderView(stateData);
}

function goHome() {
    navigateToView('home');
}

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
    if (viewName === 'genres') title = 'Browse Genres';
    if (viewName === 'detail') {
        const mangas = loadSharedMangas();
        const found = mangas.find(m => m.id === id);
        title = found ? found.title : 'Manga Detail';
        if (found) {
            document.getElementById('detailTitle').textContent = found.title;
            document.getElementById('detailChapter').textContent = found.chapter;
            document.getElementById('detailCoverBox').style.backgroundImage = `url('${found.image}')`;
        }
    }

    renderView({ view: viewName, id: id, title: title }, true);
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
            document.getElementById('detailChapter').textContent = found.chapter;
            document.getElementById('detailCoverBox').style.backgroundImage = `url('${found.image}')`;
        }
    }
    if (state.view === 'reader') targetId = 'readerView';

    const targetSection = document.getElementById(targetId);
    if (targetSection) targetSection.classList.remove('hidden');

    if (state.view === 'reader' && !isRestore) {
        window.scrollTo(0, 0);
    } else {
        setTimeout(() => {
            const savedPos = scrollPositions[targetId] || 0;
            window.scrollTo(0, savedPos);
        }, 30);
    }
}

// UI Controls & Sidebar Drawer
function toggleSearchBar() {
    const overlay = document.getElementById('searchOverlay');
    overlay.classList.toggle('hidden');
    if (!overlay.classList.contains('hidden')) {
        document.getElementById('searchInput').focus();
    }
}

function toggleDarkMode() {
    const html = document.documentElement;
    const icon = document.getElementById('themeIcon');
    
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        icon.className = "fa-solid fa-sun text-sm sm:text-base text-amber-500";
    } else {
        html.classList.add('dark');
        icon.className = "fa-solid fa-moon text-sm sm:text-base text-sakura-300";
    }
}

function toggleRightSidebar() {
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
}

// --- Cinematic Anime Sakura Cinematic Animation for Sidebar ---
const sidebarCanvas = document.getElementById('sidebarSakuraCanvas');
const sCtx = sidebarCanvas.getContext('2d');

let sWidth, sHeight;
function resizeSidebarCanvas() {
    if (!sidebarCanvas) return;
    sWidth = sidebarCanvas.width = sidebarCanvas.parentElement.clientWidth;
    sHeight = sidebarCanvas.height = sidebarCanvas.parentElement.clientHeight;
}
window.addEventListener('resize', resizeSidebarCanvas);
resizeSidebarCanvas();

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

        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
        ctx.strokeStyle = 'rgba(255, 192, 203, 0.07)';
        ctx.lineWidth = this.width * 0.35;
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

// Main website canvas petals engine
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
    initSidebarScene();
    animateSidebar();
    renderHotShowcase();
    restoreViewFromHash();

    window.addEventListener('storage', (e) => {
        if (e.key === SHARED_STORAGE_KEY) {
            renderHotShowcase();
        }
    });
});


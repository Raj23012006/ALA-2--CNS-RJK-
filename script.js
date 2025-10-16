// ====== Core Elements and Globals ======
const svg = document.getElementById('netSvg');
const tooltip = document.getElementById('tooltip');
const canvasWrap = document.getElementById('canvasWrap');

let nodes = [], edges = [], nodeId = 0;
let tickCounter = 0, chartData = [];
let running = false, tickHandle = null;
let currentMode = 'worms';

// ====== Utility Functions ======
const rand = (min, max) => Math.random() * (max - min) + min;

// ====== Mode Management ======
function changeMode(modeName) {
    currentMode = modeName;
    document.getElementById('currentMode').textContent =
        modeName.charAt(0).toUpperCase() + modeName.slice(1);
    document.querySelectorAll('.modeBtn').forEach(b => b.classList.remove('active'));
    document.getElementById('mode' + capitalize(modeName)).classList.add('active');
    renderModeInfo();
}

function renderModeInfo() {
    const infoBox = document.getElementById('modeInfo');
    let content = '';

    switch (currentMode) {
        case 'worms':
            content = `<div style="font-weight:700;margin-bottom:6px">Worms — autonomous spread</div>
                       <div class="small">Worms travel automatically through the network, scanning and infecting nearby nodes. Adjust infection and patch values to experiment with defenses.</div>`;
            break;
        case 'trojan':
            content = `<div style="font-weight:700;margin-bottom:6px">Trojan Horse — user deception</div>
                       <div class="small">Trojan samples appear benign until user interaction. Demonstrates social engineering principles and endpoint risk.</div>`;
            break;
        default:
            content = `<div style="font-weight:700;margin-bottom:6px">Virus — hybrid infection</div>
                       <div class="small">Combines automatic and manual infection routes, ideal for exploring compound malware spread.</div>`;
    }

    infoBox.innerHTML = content;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ====== Network Generation ======
function buildNetwork(count = 20) {
    nodes = []; edges = []; nodeId = 0;
    svg.innerHTML = '';
    const center = { x: 450, y: 270 };

    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const radius = rand(140, 240);
        const x = center.x + Math.cos(angle) * radius + rand(-30, 30);
        const y = center.y + Math.sin(angle) * radius + rand(-30, 30);
        nodes.push({ id: nodeId++, x, y, status: 'healthy', trojan: false, patched: false });
    }

    for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
            if (Math.random() < 0.15) edges.push({ a: i, b: j });
        }
    }

    if (edges.length === 0) for (let i = 0; i < count - 1; i++) edges.push({ a: i, b: i + 1 });
    drawNetwork();
}

// ====== Drawing ======
function drawNetwork() {
    svg.innerHTML = '';

    // Edges
    const gEdges = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    edges.forEach(e => {
        const A = nodes[e.a], B = nodes[e.b];
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', A.x);
        line.setAttribute('y1', A.y);
        line.setAttribute('x2', B.x);
        line.setAttribute('y2', B.y);
        line.setAttribute('stroke', '#10283f');
        line.setAttribute('stroke-width', 1.4);
        gEdges.appendChild(line);
    });
    svg.appendChild(gEdges);

    // Nodes
    nodes.forEach(n => {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('transform', `translate(${n.x},${n.y})`);
        g.dataset.id = n.id;

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('r', 12);
        circle.setAttribute('fill', colorForStatus(n));
        circle.setAttribute('stroke', '#082032');
        circle.setAttribute('stroke-width', 2);
        g.appendChild(circle);

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('y', 28);
        text.setAttribute('x', 0);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('class', 'node-label');
        text.setAttribute('style', 'font-size:11px;fill:#9fb0c9');
        text.textContent = 'N' + n.id;
        g.appendChild(text);

        if (n.trojan) {
            const trojanIcon = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            trojanIcon.setAttribute('x', 10);
            trojanIcon.setAttribute('y', -8);
            trojanIcon.setAttribute('width', 12);
            trojanIcon.setAttribute('height', 12);
            trojanIcon.setAttribute('fill', '#ffe49b');
            trojanIcon.setAttribute('stroke', '#b88c2f');
            trojanIcon.setAttribute('rx', 2);
            g.appendChild(trojanIcon);
        }

        g.addEventListener('mouseenter', e => showTooltip(e, n));
        g.addEventListener('mouseleave', hideTooltip);
        g.addEventListener('click', () => onNodeClick(n, g));

        svg.appendChild(g);
    });

    updateStats();
}

// ====== Visual Helpers ======
function colorForStatus(n) {
    if (n.patched) return '#60a5fa';
    if (n.status === 'infected') return '#ef4444';
    if (n.status === 'compromised') return '#f59e0b';
    return '#10b981';
}

function showTooltip(e, n) {
    tooltip.style.display = 'block';
    const rect = canvasWrap.getBoundingClientRect();
    tooltip.style.left = `${(n.x / 900) * rect.width}px`;
    tooltip.style.top = `${(n.y / 540) * rect.height}px`;
    tooltip.innerHTML = `<strong>Node N${n.id}</strong><br>Status: ${n.status.toUpperCase()}${n.patched ? '<br>Patched' : ''}${n.trojan ? '<br>Trojan present' : ''}`;
}

function hideTooltip() {
    tooltip.style.display = 'none';
}

// ====== Simulation Events ======
function onNodeClick(n, g) {
    if (currentMode === 'trojan') {
        if (n.trojan && n.status === 'healthy' && !n.patched) {
            const rate = parseFloat(document.getElementById('trojanRate').value);
            n.status = Math.random() < rate ? 'compromised' : 'healthy';
            n.trojan = false;
        } else if (n.status === 'compromised' && !n.patched) {
            n.status = 'infected';
        }
    } else if (currentMode === 'worms') {
        if (n.status === 'healthy' && !n.patched && Math.random() < 0.25) {
            n.status = 'infected';
        }
    } else {
        // Virus mode (hybrid)
        if (n.trojan && n.status === 'healthy' && !n.patched) {
            const rate = parseFloat(document.getElementById('trojanRate').value);
            if (Math.random() < rate) n.status = 'compromised';
            n.trojan = false;
        } else if (n.status === 'compromised' && !n.patched) {
            n.status = 'infected';
        } else if (n.status === 'healthy' && Math.random() < 0.06) {
            n.status = 'infected';
        }
    }

    pulse(g);
    drawNetwork();
}

function pulse(g) {
    const node = g.querySelector('circle');
    node.classList.remove('nodePulse');
    void node.offsetWidth;
    node.classList.add('nodePulse');
}

// ====== Infection Engine ======
function tickStep() {
    tickCounter++;
    document.getElementById('tickCount').textContent = tickCounter;

    const wormRate = parseFloat(document.getElementById('wormRate').value);
    const patchRate = parseFloat(document.getElementById('patchRate').value);

    nodes.forEach(n => {
        if (n.status === 'infected') {
            const neighbors = edges.filter(e => e.a === n.id || e.b === n.id)
                                   .map(e => e.a === n.id ? nodes[e.b] : nodes[e.a]);
            neighbors.forEach(nb => {
                if (!nb.patched && nb.status === 'healthy' && Math.random() < wormRate)
                    nb.status = 'infected';
            });
        }

        // Compromised -> infected step
        if (n.status === 'compromised' && Math.random() < 0.3)
            n.status = 'infected';

        // Auto patching
        if (!n.patched && Math.random() < patchRate)
            n.patched = true;
    });

    chartUpdate();
    drawNetwork();
}

// ====== Control Buttons ======
function startSimulation() {
    if (running) return;
    running = true;
    const speed = parseInt(document.getElementById('speedRange').value);
    tickHandle = setInterval(tickStep, speed);
}

function stopSimulation() {
    running = false;
    clearInterval(tickHandle);
}

function resetSimulation() {
    stopSimulation();
    tickCounter = 0;
    chartData = [];
    const size = parseInt(document.getElementById('netSize').value || 20);
    buildNetwork(size);
    autoSeed();
    drawNetwork();
    chartDraw();
}

// ====== Seeding ======
function autoSeed() {
    if (document.getElementById('autoSeedToggle').classList.contains('on'))
        infectRandom(1);
}

function infectRandom(k = 1) {
    const healthyNodes = nodes.filter(n => n.status === 'healthy' && !n.patched);
    for (let i = 0; i < k && healthyNodes.length > 0; i++) {
        const pick = healthyNodes.splice(Math.floor(Math.random() * healthyNodes.length), 1)[0];
        pick.status = 'infected';
    }
}

// ====== Stats and Chart ======
function updateStats() {
    const healthy = nodes.filter(n => n.status === 'healthy' && !n.patched).length;
    const infected = nodes.filter(n => n.status === 'infected').length;
    const compromised = nodes.filter(n => n.status === 'compromised').length;
    const patched = nodes.filter(n => n.patched).length;

    document.getElementById('statHealthy').textContent = healthy;
    document.getElementById('statInfected').textContent = infected;
    document.getElementById('statCompromised').textContent = compromised;
    document.getElementById('statPatched').textContent = patched;
}

function chartUpdate() {
    const healthy = nodes.filter(n => n.status === 'healthy' && !n.patched).length;
    const infected = nodes.filter(n => n.status === 'infected').length;
    const compromised = nodes.filter(n => n.status === 'compromised').length;
    const patched = nodes.filter(n => n.patched).length;

    chartData.push({ h: healthy, i: infected, c: compromised, p: patched });
    if (chartData.length > 50) chartData.shift();
    chartDraw();
}

function chartDraw() {
    const el = document.getElementById('chart');
    el.innerHTML = '';
    if (!chartData.length) return;

    const w = el.clientWidth - 10;
    const h = el.clientHeight - 10;
    const svgChart = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgChart.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const maxVal = Math.max(...chartData.flatMap(d => [d.h, d.i, d.c, d.p]), 1);

    const keys = [
        { key: 'h', color: '#10b981' },
        { key: 'i', color: '#ef4444' },
        { key: 'c', color: '#f59e0b' },
        { key: 'p', color: '#60a5fa' }
    ];

    keys.forEach(k => {
        const pathData = chartData.map((d, idx) => {
            const x = (idx / (chartData.length - 1)) * w;
            const y = h - (d[k.key] / maxVal) * h;
            return (idx === 0 ? 'M' : 'L') + x + ' ' + y;
        }).join(' ');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', k.color);
        path.setAttribute('stroke-width', 2);
        path.setAttribute('opacity', 0.9);
        svgChart.appendChild(path);
    });

    el.appendChild(svgChart);
}

// ====== Initialization ======
function initSimulation() {
    buildNetwork(parseInt(document.getElementById('netSize').value || 20));
    changeMode('worms');
    infectRandom(1);
    chartDraw();
}

// ====== Event Listeners ======
document.getElementById('modeWorms').addEventListener('click', () => changeMode('worms'));
document.getElementById('modeTrojan').addEventListener('click', () => changeMode('trojan'));
document.getElementById('modeVirus').addEventListener('click', () => changeMode('virus'));
document.getElementById('startBtn').addEventListener('click', startSimulation);
document.getElementById('pauseBtn').addEventListener('click', stopSimulation);
document.getElementById('resetBtn').addEventListener('click', resetSimulation);
document.getElementById('spawnTrojan').addEventListener('click', () => {
    const free = nodes.filter(n => n.status === 'healthy' && !n.trojan);
    if (free.length) {
        free[Math.floor(Math.random() * free.length)].trojan = true;
        drawNetwork();
    }
});
document.getElementById('seedInfected').addEventListener('click', () => infectRandom(1));
document.getElementById('wormRate').addEventListener('input', e => document.getElementById('wormRateLabel').textContent = (+e.target.value).toFixed(2));
document.getElementById('trojanRate').addEventListener('input', e => document.getElementById('trojanRateLabel').textContent = (+e.target.value).toFixed(2));
document.getElementById('patchRate').addEventListener('input', e => document.getElementById('patchRateLabel').textContent = (+e.target.value).toFixed(2));
document.getElementById('speedRange').addEventListener('input', e => document.getElementById('speedLabel').textContent = e.target.value);
document.getElementById('autoSeedToggle').addEventListener('click', e => {
    e.currentTarget.classList.toggle('on');
});

initSimulation();

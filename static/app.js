/* ============================================
   LinguaLink — Application Logic
   ============================================ */

const API_BASE = '';  // Same origin
let appState = {
    data: null,
    showLabels: true,
};

function buildRecordIndex(records) {
    const map = new Map();
    (records || []).forEach(r => map.set(r.idx, r));
    return map;
}

function edgeKey(a, b) {
    const s = Math.min(a, b);
    const t = Math.max(a, b);
    return `${s}|${t}`;
}

function buildEdgeIndex(edges) {
    const map = new Map();
    (edges || []).forEach(e => {
        const s = e.source ?? e.i ?? e.from;
        const t = e.target ?? e.j ?? e.to;
        if (typeof s === 'number' && typeof t === 'number') {
            map.set(edgeKey(s, t), e);
        }
    });
    return map;
}

function getEdgeBetween(edgeIndex, a, b) {
    return edgeIndex.get(edgeKey(a, b));
}

// Language color map
const LANG_COLORS = {
    'English':    '#3b82f6',
    'Japanese':   '#ef4444',
    'Chinese':    '#f59e0b',
    'Arabic':     '#10b981',
    'Korean':     '#8b5cf6',
    'Thai':       '#ec4899',
    'Hindi':      '#f97316',
    'Russian':    '#06b6d4',
    'French':     '#6366f1',
    'German':     '#a3e635',
    'Spanish':    '#fb923c',
    'Portuguese': '#22d3ee',
    'Vietnamese': '#34d399',
    'Turkish':    '#c084fc',
    'Indonesian': '#fbbf24',
    'Dutch':      '#f472b6',
    'Bengali':    '#a78bfa',
    'Swahili':    '#2dd4bf',
    'Urdu':       '#fb7185',
    'Italian':    '#4ade80',
};

function getLangColor(lang) {
    return LANG_COLORS[lang] || '#888';
}

// ---- Loading Animation ----
let loadingInterval = null;

function showLoading() {
    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = 'flex';
    
    const steps = document.querySelectorAll('.step');
    steps.forEach(s => { s.classList.remove('active', 'done'); });
    
    let current = 0;
    loadingInterval = setInterval(() => {
        if (current > 0) steps[current - 1].classList.remove('active');
        if (current > 0) steps[current - 1].classList.add('done');
        if (current < steps.length) {
            steps[current].classList.add('active');
            current++;
        } else {
            clearInterval(loadingInterval);
        }
    }, 2500);
}

function hideLoading() {
    clearInterval(loadingInterval);
    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = 'none';
}

// ---- Demo ----
async function loadDemo() {
    const sampleSize = parseInt(document.getElementById('sample-size').value) || 200;
    const threshold = parseFloat(document.getElementById('threshold').value) || 0.55;
    const dataset = document.getElementById('dataset-selector')?.value || 'ultra_complex_multilingual_dataset.csv';
    
    const btn = document.getElementById('btn-demo');
    btn.querySelector('.btn-text').style.display = 'none';
    btn.querySelector('.btn-loader').style.display = 'inline-block';
    btn.disabled = true;
    
    showLoading();
    
    try {
        const resp = await fetch(`${API_BASE}/api/demo?sample_size=${sampleSize}&threshold=${threshold}&dataset=${encodeURIComponent(dataset)}`, {
            method: 'POST',
        });
        
        if (!resp.ok) throw new Error('API error: ' + resp.status);
        
        const data = await resp.json();
        if (data.error) throw new Error(data.error);
        
        appState.data = data;
        renderResults(data);
    } catch (err) {
        alert('Error: ' + err.message);
        console.error(err);
    } finally {
        hideLoading();
        btn.querySelector('.btn-text').style.display = 'inline';
        btn.querySelector('.btn-loader').style.display = 'none';
        btn.disabled = false;
    }
}

// ---- File Upload ----
const fileInput = document.getElementById('file-input');
const uploadZone = document.getElementById('upload-zone');
const btnUpload = document.getElementById('btn-upload');

if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            uploadZone.querySelector('p').textContent = e.target.files[0].name;
            btnUpload.disabled = false;
        }
    });
}

if (uploadZone) {
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });
    
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            uploadZone.querySelector('p').textContent = e.dataTransfer.files[0].name;
            btnUpload.disabled = false;
        }
    });
}

async function uploadFile() {
    const file = fileInput.files[0];
    if (!file) return;
    
    const sampleSize = parseInt(document.getElementById('sample-size').value) || 200;
    const threshold = parseFloat(document.getElementById('threshold').value) || 0.55;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sample_size', sampleSize);
    formData.append('threshold', threshold);
    
    showLoading();
    
    try {
        const resp = await fetch(`${API_BASE}/api/detect`, {
            method: 'POST',
            body: formData,
        });
        
        const data = await resp.json();
        if (data.error) throw new Error(data.error);
        
        appState.data = data;
        renderResults(data);
    } catch (err) {
        alert('Error: ' + err.message);
    } finally {
        hideLoading();
    }
}

// ---- Search ----
async function searchDuplicates() {
    const query = document.getElementById('search-input').value.trim();
    if (!query) return;
    
    const container = document.getElementById('search-results');
    container.innerHTML = '<p style="color:var(--text-muted);padding:8px;font-size:0.8rem;">Searching...</p>';
    
    try {
        const formData = new FormData();
        formData.append('query', query);
        
        const resp = await fetch(`${API_BASE}/api/search`, {
            method: 'POST',
            body: formData,
        });
        
        const data = await resp.json();
        if (data.error) throw new Error(data.error);
        
        renderSearchResults(data.results);
    } catch (err) {
        container.innerHTML = `<p style="color:var(--accent-red);padding:8px;font-size:0.8rem;">Error: ${err.message}</p>`;
    }
}

// Allow Enter key search
document.getElementById('search-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchDuplicates();
});

function renderSearchResults(results) {
    const container = document.getElementById('search-results');
    
    if (!results || results.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);padding:8px;font-size:0.8rem;">No matches found</p>';
        return;
    }
    
    container.innerHTML = results.map(r => {
        const langColor = getLangColor(r.language);
        return `
            <div class="search-result-item">
                <div class="search-result-name">${escapeHtml(r.name)}</div>
                <div class="search-result-meta">
                    <span class="search-result-lang" style="background:${langColor}20;color:${langColor}">${r.language}</span>
                    <span class="search-result-score">Fused: ${(r.fused_score * 100).toFixed(1)}%</span>
                    <span class="search-result-score">Sem: ${(r.semantic_score * 100).toFixed(0)}%</span>
                    <span class="search-result-score">Phon: ${(r.phonetic_score * 100).toFixed(0)}%</span>
                    <span class="search-result-score">Struct: ${(r.structural_score * 100).toFixed(0)}%</span>
                </div>
                ${r.translated_to_en ? `<div class="search-result-translation">→ ${escapeHtml(r.translated_to_en)}</div>` : ''}
            </div>
        `;
    }).join('');
}

// ---- Render Results ----
function renderResults(data) {
    // Build quick lookup indices
    data._recordIndex = buildRecordIndex(data.records);
    data._edgeIndex = buildEdgeIndex(data.edges);

    // Update sidebar stats
    document.getElementById('stat-records').textContent = data.total_records;
    document.getElementById('stat-pairs').textContent = data.total_pairs.toLocaleString();
    document.getElementById('stat-clusters').textContent = data.total_clusters;
    document.getElementById('stat-time').textContent = data.processing_time + 's';

    // Update top-bar title
    document.getElementById('top-bar-title').textContent =
        `${data.total_records} records · ${data.total_pairs.toLocaleString()} duplicate pairs · ${data.total_clusters} clusters · ${data.processing_time}s`;

    // Hide empty state, show tabs
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('viz-tabs-bar').style.display = 'flex';

    // Render visualizations
    renderGraph(data);
    renderLanguageLegend(data);
    renderClusters(data);
    renderCharts(data);

    // Switch to graph tab
    switchTab('graph');
}

// ---- Language Legend ----
function renderLanguageLegend(data) {
    const legend = document.getElementById('language-legend');
    const langs = Object.keys(data.language_stats).sort();
    
    legend.innerHTML = langs.map(lang => {
        const color = getLangColor(lang);
        return `
            <div class="legend-item">
                <div class="legend-dot" style="background:${color}"></div>
                <span>${lang} (${data.language_stats[lang]})</span>
            </div>
        `;
    }).join('');
}

// ---- Cluster Results ----
function computeClusterLanguages(members) {
    const counts = new Map();
    members.forEach(m => {
        const lang = m?.language || 'Unknown';
        counts.set(lang, (counts.get(lang) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function renderLanguagePills(langCounts) {
    return `
        <div class="cluster-pills">
            ${langCounts.slice(0, 6).map(([lang, count]) => {
                const color = getLangColor(lang);
                return `<span class="pill" style="background:${color}18;border-color:${color}33;color:${color}">
                    ${escapeHtml(lang)} <span class="pill-count">${count}</span>
                </span>`;
            }).join('')}
            ${langCounts.length > 6 ? `<span class="pill pill-more">+${langCounts.length - 6} more</span>` : ''}
        </div>
    `;
}

function renderEdgeEvidenceTable(edges, recordIndex, limit = 12) {
    if (!edges || edges.length === 0) {
        return `<div class="cluster-evidence-empty">No scored edges found inside this cluster (threshold may be high).</div>`;
    }

    const top = edges
        .slice()
        .sort((a, b) => (b.fused_score ?? b.fused ?? 0) - (a.fused_score ?? a.fused ?? 0))
        .slice(0, limit);

    return `
        <div class="cluster-evidence-table">
            <div class="evidence-row evidence-header">
                <span>Pair</span>
                <span>Fused</span>
                <span>Sem</span>
                <span>Phon</span>
                <span>Struct</span>
            </div>
            ${top.map(e => {
                const s = e.source;
                const t = e.target;
                const a = recordIndex.get(s);
                const b = recordIndex.get(t);
                const fused = e.fused_score ?? e.fused ?? 0;
                const sem = e.semantic ?? e.semantic_score ?? 0;
                const phon = e.phonetic ?? e.phonetic_score ?? 0;
                const st = e.structural ?? e.structural_score ?? 0;
                return `
                    <div class="evidence-row">
                        <span class="evidence-pair">
                            <span class="evidence-name">${escapeHtml(a?.name || `#${s}`)}</span>
                            <span class="evidence-sep">↔</span>
                            <span class="evidence-name">${escapeHtml(b?.name || `#${t}`)}</span>
                        </span>
                        <span class="evidence-num">${(fused * 100).toFixed(1)}%</span>
                        <span class="evidence-num">${(sem * 100).toFixed(0)}%</span>
                        <span class="evidence-num">${(phon * 100).toFixed(0)}%</span>
                        <span class="evidence-num">${(st * 100).toFixed(0)}%</span>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderClusterCards(clusters, data) {
    const recordIndex = data._recordIndex || buildRecordIndex(data.records);
    const edgeIndex = data._edgeIndex || buildEdgeIndex(data.edges);

    return clusters.map((cluster, ci) => {
        const members = (cluster.members || []).map(idx => recordIndex.get(idx)).filter(Boolean);
        const confidence = (cluster.avg_confidence * 100).toFixed(1);
        const translations = [...new Set(members.map(m => m.translated_to_en).filter(Boolean))];
        const mainTranslation = translations[0] || (members[0]?.translated_to_en) || (members[0]?.name) || 'Unknown';
        const confidenceColor = cluster.avg_confidence > 0.75 ? 'var(--accent-green)'
                              : cluster.avg_confidence > 0.6  ? 'var(--accent-amber)'
                              : 'var(--accent-red)';

        const langCounts = computeClusterLanguages(members);
        const memberIds = new Set((cluster.members || []));
        const internalEdges = (data.edges || []).filter(e => memberIds.has(e.source) && memberIds.has(e.target));

        // compute quick stats
        const internalEdgeCount = internalEdges.length;
        const uniqueTranslations = translations.slice(0, 4);

        return `
            <div class="cluster-card">
                <div class="cluster-header">
                    <div class="cluster-title">
                        <span class="cluster-badge" style="background:rgba(16,185,129,0.12);color:var(--accent-green)">&#35;${ci + 1}</span>
                        <span class="cluster-name">${escapeHtml(mainTranslation)}</span>
                        <span class="cluster-size">${cluster.size} records</span>
                    </div>
                    <div class="cluster-header-right">
                        <span class="cluster-confidence" style="color:${confidenceColor}">${confidence}%</span>
                        <span class="cluster-chevron">▾</span>
                    </div>
                </div>
                <div class="cluster-subheader">
                    ${renderLanguagePills(langCounts)}
                    <div class="cluster-submeta">
                        <span class="submeta-item"><strong>${internalEdgeCount}</strong> scored pairs</span>
                        <span class="submeta-item"><strong>${langCounts.length}</strong> languages</span>
                    </div>
                    ${uniqueTranslations.length ? `<div class="cluster-translations">
                        ${uniqueTranslations.map(t => `<span class="translation-chip">“${escapeHtml(t)}”</span>`).join('')}
                        ${translations.length > uniqueTranslations.length ? `<span class="translation-chip more">+${translations.length - uniqueTranslations.length} more</span>` : ''}
                    </div>` : ''}
                </div>
                <div class="cluster-members collapsed">
                    <div class="member-row header-row">
                        <span>Record Name</span><span>Language</span><span>English Meaning</span><span>Type</span>
                    </div>
                    ${members.map(m => {
                        const langColor = getLangColor(m.language);
                        return `<div class="member-row">
                            <span class="member-name">${escapeHtml(m.name)}</span>
                            <span><span class="member-lang" style="background:${langColor}20;color:${langColor}">${m.language}</span></span>
                            <span class="member-translation">${escapeHtml(m.translated_to_en || '')}</span>
                            <span class="member-type">${m.duplicate_type || ''}</span>
                        </div>`;
                    }).join('')}

                    <div class="cluster-evidence">
                        <div class="cluster-evidence-title">Top evidence (pair scores inside this cluster)</div>
                        ${renderEdgeEvidenceTable(internalEdges, recordIndex, 14)}
                        <div class="cluster-evidence-hint">Tip: use this to justify why these records were grouped (fused + per-signal).</div>
                    </div>
                </div>
            </div>`;
    }).join('');
}

function renderClusters(data) {
    const container = document.getElementById('clusters-container');
    const badge = document.getElementById('cluster-count-badge');
    badge.textContent = `${data.total_clusters} clusters`;

    const clusters = data.clusters.slice().sort((a, b) => {
        if (b.size !== a.size) return b.size - a.size;
        return (b.avg_confidence || 0) - (a.avg_confidence || 0);
    }).slice(0, 80);
    allClustersHTML = renderClusterCards(clusters, data);
    container.innerHTML = allClustersHTML;
    reattachClusterToggles();
}

// ---- Tab Switching ----
function switchTab(tab) {
    document.querySelectorAll('.viz-tab').forEach(t => t.classList.remove('active'));
    // Hide all viz panels
    ['panel-graph','panel-heatmap','panel-clusters','panel-results'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    document.getElementById('tab-' + tab).classList.add('active');
    const panel = document.getElementById('panel-' + tab);
    if (panel) panel.style.display = tab === 'results' ? 'flex' : (tab === 'clusters' ? 'flex' : 'flex');

    // Render heatmap on first switch
    if (tab === 'heatmap' && appState.data && !document.querySelector('#heatmap-container svg')) {
        renderHeatmap(appState.data);
    }
}

function toggleLabels() {
    appState.showLabels = !appState.showLabels;
    const labels = document.querySelectorAll('.node-label');
    labels.forEach(l => l.style.display = appState.showLabels ? 'block' : 'none');
}

function resetGraph() {
    if (appState.data) renderGraph(appState.data);
}

// ---- Cluster Filter ----
let allClustersHTML = '';
let clusterToggleDelegationBound = false;

function ensureClusterToggleDelegation() {
    if (clusterToggleDelegationBound) return;
    clusterToggleDelegationBound = true;

    document.addEventListener('click', (event) => {
        const header = event.target.closest('.cluster-header');
        if (!header) return;

        const card = header.closest('.cluster-card');
        if (!card) return;

        const members = card.querySelector('.cluster-members');
        if (!members) return;

        members.classList.toggle('collapsed');
        card.classList.toggle('expanded', !members.classList.contains('collapsed'));
    });
}

function filterClusters(query) {
    const container = document.getElementById('clusters-container');
    if (!query.trim()) {
        container.innerHTML = allClustersHTML;
        reattachClusterToggles();
        return;
    }
    const q = query.toLowerCase();
    const cards = Array.from(container.querySelectorAll('.cluster-card'));
    // We need to rebuild from stored data
    if (!appState.data) return;
    const clusters = appState.data.clusters.slice().sort((a, b) => {
        if (b.size !== a.size) return b.size - a.size;
        return (b.avg_confidence || 0) - (a.avg_confidence || 0);
    }).slice(0, 200);
    const filtered = clusters.filter(cluster => {
        const recordIndex = appState.data._recordIndex || buildRecordIndex(appState.data.records);
        const members = (cluster.members || []).map(idx => recordIndex.get(idx)).filter(Boolean);
        return members.some(m =>
            (m.name && m.name.toLowerCase().includes(q)) ||
            (m.language && m.language.toLowerCase().includes(q)) ||
            (m.translated_to_en && m.translated_to_en.toLowerCase().includes(q))
        );
    });
    container.innerHTML = renderClusterCards(filtered, appState.data);
    reattachClusterToggles();
}

function reattachClusterToggles() {
    // Intentionally no-op: cluster toggle is handled by delegated click listener
    // in ensureClusterToggleDelegation(), which is robust across rerenders.
}

// ---- Methodology Toggle ----
function toggleMethodology() {
    const panel = document.getElementById('methodology-panel');
    const arrow = document.getElementById('method-arrow');
    const trigger = document.getElementById('method-trigger');
    const open = panel.style.display !== 'none';
    panel.style.display = open ? 'none' : 'block';
    arrow.classList.toggle('open', !open);
}

// ---- Utilities ----
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ==== Idle Interactive Background Swarm ====
function initIdleParticles() {
    // Create an SVG behind everything
    const bgContainer = d3.select('body').append('div')
        .style('position', 'fixed')
        .style('top', 0).style('left', 0).style('width', '100%').style('height', '100%')
        .style('z-index', '0')
        .style('pointer-events', 'none')
        .style('opacity', '0.25');
        
    const width = window.innerWidth;
    const height = window.innerHeight;
    const svg = bgContainer.append('svg').attr('width', width).attr('height', height);
    
    const numNodes = 40;
    const nodes = Array.from({length: numNodes}, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        radius: Math.random() * 3 + 1
    }));
    
    // Add mouse node
    const mouseNode = { x: width/2, y: height/2, radius: 0, vx: 0, vy: 0 };
    
    document.addEventListener('mousemove', e => {
        mouseNode.x = e.clientX;
        mouseNode.y = e.clientY;
    });
    
    const circles = svg.selectAll('circle').data(nodes)
        .join('circle')
        .attr('r', d => d.radius)
        .attr('fill', '#10b981');
        
    const lines = svg.append('g');
    
    d3.timer(() => {
        nodes.forEach(n => {
            n.x += n.vx;
            n.y += n.vy;
            if (n.x < 0 || n.x > width) n.vx *= -1;
            if (n.y < 0 || n.y > height) n.vy *= -1;
        });
        
        circles.attr('cx', d => d.x).attr('cy', d => d.y);
        
        // Draw lines
        const linesData = [];
        const maxDist = 150;
        
        for(let i=0; i<numNodes; i++) {
            for(let j=i+1; j<numNodes; j++) {
                const dx = nodes[i].x - nodes[j].x;
                const dy = nodes[i].y - nodes[j].y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < maxDist) {
                    linesData.push({source: nodes[i], target: nodes[j], dist});
                }
            }
            // Check against mouse
            const dx = nodes[i].x - mouseNode.x;
            const dy = nodes[i].y - mouseNode.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 200) {
                linesData.push({source: nodes[i], target: mouseNode, dist, isMouse: true});
                
                // Slight gravity to mouse
                nodes[i].vx -= dx * 0.0001;
                nodes[i].vy -= dy * 0.0001;
            }
        }
        
        lines.selectAll('line').data(linesData)
            .join('line')
            .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
            .attr('stroke', d => d.isMouse ? '#34d399' : '#059669')
            .attr('stroke-width', d => 1 - d.dist / (d.isMouse ? 200 : maxDist))
            .attr('opacity', d => 1 - d.dist / (d.isMouse ? 200 : maxDist));
    });
}

// Start immediately
window.addEventListener('load', () => {
    ensureClusterToggleDelegation();
    initIdleParticles();
});

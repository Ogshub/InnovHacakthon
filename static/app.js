/* ============================================
   LinguaLink — Application Logic
   ============================================ */

const API_BASE = '';  // Same origin
let appState = {
    data: null,
    showLabels: true,
    mobileSidebarOpen: false,
};

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

// ---- Mobile Sidebar Toggle ----
function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('mobile-menu-toggle');
    
    appState.mobileSidebarOpen = !appState.mobileSidebarOpen;
    
    if (appState.mobileSidebarOpen) {
        sidebar.classList.remove('collapsed');
        toggle.classList.add('active');
        // Prevent body scroll when sidebar is open
        document.body.style.overflow = 'hidden';
    } else {
        sidebar.classList.add('collapsed');
        toggle.classList.remove('active');
        // Restore body scroll
        document.body.style.overflow = '';
    }
}

// Close sidebar when clicking outside on mobile
function handleMobileClickOutside(event) {
    if (window.innerWidth <= 640 && appState.mobileSidebarOpen) {
        const sidebar = document.getElementById('sidebar');
        const toggle = document.getElementById('mobile-menu-toggle');
        
        if (!sidebar.contains(event.target) && !toggle.contains(event.target)) {
            toggleMobileSidebar();
        }
    }
}

// Handle window resize
function handleWindowResize() {
    if (window.innerWidth > 640 && appState.mobileSidebarOpen) {
        // Close mobile sidebar on desktop resize
        const sidebar = document.getElementById('sidebar');
        const toggle = document.getElementById('mobile-menu-toggle');
        sidebar.classList.remove('collapsed');
        toggle.classList.remove('active');
        appState.mobileSidebarOpen = false;
        document.body.style.overflow = '';
    }
}

// Initialize mobile event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Add click outside handler
    document.addEventListener('click', handleMobileClickOutside);
    
    // Add resize handler
    window.addEventListener('resize', handleWindowResize);
    
    // Initialize sidebar state on mobile
    if (window.innerWidth <= 640) {
        const sidebar = document.getElementById('sidebar');
        const toggle = document.getElementById('mobile-menu-toggle');
        sidebar.classList.add('collapsed');
        toggle.classList.remove('active');
        appState.mobileSidebarOpen = false;
    }
});

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
function renderClusterCards(clusters, data) {
    return clusters.map((cluster, ci) => {
        const members = cluster.members.map(idx => data.records.find(r => r.idx === idx)).filter(Boolean);
        const confidence = (cluster.avg_confidence * 100).toFixed(1);
        const translations = [...new Set(members.map(m => m.translated_to_en).filter(Boolean))];
        const mainTranslation = translations[0] || 'Unknown';
        const confidenceColor = cluster.avg_confidence > 0.75 ? 'var(--accent-green)'
                              : cluster.avg_confidence > 0.6  ? 'var(--accent-amber)'
                              : 'var(--accent-red)';
        return `
            <div class="cluster-card">
                <div class="cluster-header">
                    <div class="cluster-title">
                        <span class="cluster-badge" style="background:rgba(16,185,129,0.12);color:var(--accent-green)">&#35;${ci + 1}</span>
                        <span class="cluster-name">${escapeHtml(mainTranslation)}</span>
                        <span class="cluster-size">${cluster.size} records</span>
                    </div>
                    <span class="cluster-confidence" style="color:${confidenceColor}">${confidence}%</span>
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
                </div>
            </div>`;
    }).join('');
}

function renderClusters(data) {
    const container = document.getElementById('clusters-container');
    const badge = document.getElementById('cluster-count-badge');
    badge.textContent = `${data.total_clusters} clusters`;

    const clusters = data.clusters.sort((a, b) => b.size - a.size).slice(0, 30);
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
    const clusters = appState.data.clusters.sort((a,b)=>b.size-a.size).slice(0,30);
    const filtered = clusters.filter(cluster => {
        const members = cluster.members.map(idx => appState.data.records.find(r => r.idx === idx)).filter(Boolean);
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
    document.querySelectorAll('.cluster-header').forEach(header => {
        header.onclick = () => header.parentElement.querySelector('.cluster-members').classList.toggle('collapsed');
    });
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
window.addEventListener('load', initIdleParticles);

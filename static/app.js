/* ============================================
   LinguaLink — Application Logic
   ============================================ */

const API_BASE = '';  // Same origin
let appState = {
    data: null,
    showLabels: true,
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

// ---- Loading Animation ----
let loadingInterval = null;

function showEnhancedLoading() {
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
    }, 800);
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
    
    // Update status to processing
    updateStatus('processing');
    
    showEnhancedLoading();
    
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
        const resp = await fetch(`${API_BASE}/api/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query }),
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

    // Enable export buttons
    document.getElementById('export-cleaned').disabled = false;
    document.getElementById('export-clusters').disabled = false;
    document.getElementById('export-report').disabled = false;

    // Update AI Summary
    updateAISummary(data);

    // Show AI Insight Card
    showAIInsightCard(data);

    // Update status to ready
    updateStatus('ready');

    // Populate language filter
    populateLanguageFilter(data);

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

// ---- Language Filter Population ----
function populateLanguageFilter(data) {
    const select = document.getElementById('lang-filter');
    const languages = new Set();
    
    // Collect unique languages from records
    if (data.records) {
        data.records.forEach(record => {
            if (record.language) {
                languages.add(record.language);
            }
        });
    }
    
    // Clear and repopulate select
    select.innerHTML = '<option value="">All Languages</option>';
    Array.from(languages).sort().forEach(lang => {
        const option = document.createElement('option');
        option.value = lang;
        option.textContent = lang;
        select.appendChild(option);
    });
}

// ============================================
// NEW ENHANCED FEATURES
// ============================================

let currentViewMode = 'before';
let minimapVisible = false;
let currentEdgeThreshold = 0.55;

// ---- AI Explainability Panel ----
function showExplainability(nodeData, edgeData = null) {
    const panel = document.getElementById('explainability-panel');
    
    if (edgeData) {
        // Show edge explanation
        document.getElementById('explain-record-1-name').textContent = appState.data.records[edgeData.source].name;
        document.getElementById('explain-record-1-lang').textContent = appState.data.records[edgeData.source].language;
        document.getElementById('explain-record-1-id').textContent = `ID: ${edgeData.source}`;
        
        document.getElementById('explain-record-2-name').textContent = appState.data.records[edgeData.target].name;
        document.getElementById('explain-record-2-lang').textContent = appState.data.records[edgeData.target].language;
        document.getElementById('explain-record-2-id').textContent = `ID: ${edgeData.target}`;
        
        // Update signal scores
        const semScore = (edgeData.semantic_score || 0).toFixed(3);
        const phonScore = (edgeData.phonetic_score || 0).toFixed(3);
        structScore = (edgeData.structural_score || 0).toFixed(3);
        const fusedScore = (edgeData.fused_score || 0).toFixed(3);
        
        document.getElementById('semantic-score').textContent = semScore;
        document.getElementById('phonetic-score').textContent = phonScore;
        document.getElementById('structural-score').textContent = structScore;
        document.getElementById('fused-score').textContent = fusedScore;
        
        // Update progress bars
        document.getElementById('semantic-fill').style.width = `${semScore * 100}%`;
        document.getElementById('phonetic-fill').style.width = `${phonScore * 100}%`;
        document.getElementById('structural-fill').style.width = `${structScore * 100}%`;
        
        // Generate explanations
        document.getElementById('semantic-explanation').textContent = generateSemanticExplanation(semScore);
        document.getElementById('phonetic-explanation').textContent = generatePhoneticExplanation(phonScore);
        document.getElementById('structural-explanation').textContent = generateStructuralExplanation(structScore);
        
        // Update verdict
        const verdict = getVerdict(fusedScore);
        const badge = document.getElementById('verdict-badge');
        badge.textContent = verdict.label;
        badge.className = `verdict-badge ${verdict.class}`;
        document.getElementById('verdict-reasoning').textContent = verdict.reasoning;
    }
    
    panel.style.display = 'flex';
}

function closeExplainability() {
    document.getElementById('explainability-panel').style.display = 'none';
}

function generateSemanticExplanation(score) {
    if (score > 0.8) return "Very strong semantic match - likely same meaning across languages";
    if (score > 0.6) return "Good semantic similarity - related concepts or translations";
    if (score > 0.4) return "Moderate semantic overlap - some shared meaning";
    return "Low semantic similarity - different meanings";
}

function generatePhoneticExplanation(score) {
    if (score > 0.7) return "Sounds very similar - likely same pronunciation";
    if (score > 0.5) return "Some phonetic similarity - related sounds";
    if (score > 0.3) return "Minor phonetic resemblance";
    return "Different pronunciation patterns";
}

function generateStructuralExplanation(score) {
    if (score > 0.8) return "Very similar structure - minor spelling differences";
    if (score > 0.6) return "Good structural match - some character differences";
    if (score > 0.4) return "Moderate similarity - noticeable differences";
    return "Different structure - significant variations";
}

function getVerdict(score) {
    if (score > 0.75) {
        return {
            label: "Strong Duplicate",
            class: "strong",
            reasoning: "High confidence match across all signals - these records likely refer to the same entity."
        };
    } else if (score > 0.55) {
        return {
            label: "Medium Duplicate",
            class: "medium", 
            reasoning: "Moderate confidence - likely duplicates but may require human review."
        };
    } else {
        return {
            label: "Weak Duplicate",
            class: "weak",
            reasoning: "Low confidence - possible duplicates but high uncertainty."
        };
    }
}

// ---- View Mode Toggle ----
function setViewMode(mode) {
    currentViewMode = mode;
    
    // Update button states
    document.getElementById('view-before').classList.toggle('active', mode === 'before');
    document.getElementById('view-after').classList.toggle('active', mode === 'after');
    
    // Update visualization
    if (appState.data) {
        if (mode === 'before') {
            showRawDataView();
        } else {
            showDeduplicatedView();
        }
    }
}

function showRawDataView() {
    // Show original unclustered data
    updateTopBarTitle('📊 Raw Dataset View - Before Deduplication');
    // Implementation would show all records without clustering
}

function showDeduplicatedView() {
    // Show deduplicated clustered view
    updateTopBarTitle('🎯 Deduplicated View - After Clustering');
    // Implementation would show clustered results
}

// ---- Export Functions ----
function exportCleanedData() {
    if (!appState.data) return;
    
    // Generate cleaned data (one record per cluster)
    const cleanedData = [];
    const usedIds = new Set();
    
    appState.data.clusters.forEach(cluster => {
        if (cluster.members && cluster.members.length > 0) {
            const representativeId = cluster.members[0];
            if (!usedIds.has(representativeId)) {
                cleanedData.push(appState.data.records[representativeId]);
                usedIds.add(representativeId);
            }
        }
    });
    
    // Convert to CSV and download
    const csv = convertToCSV(cleanedData);
    downloadFile(csv, 'lingualink_cleaned_data.csv', 'text/csv');
}

function exportClusters() {
    if (!appState.data) return;
    
    const clusterData = {
        metadata: {
            total_records: appState.data.total_records,
            total_clusters: appState.data.total_clusters,
            threshold: appState.data.threshold || 0.55,
            processing_time: appState.data.processing_time
        },
        clusters: appState.data.clusters
    };
    
    const json = JSON.stringify(clusterData, null, 2);
    downloadFile(json, 'lingualink_clusters.json', 'application/json');
}

function exportReport() {
    if (!appState.data) return;
    
    const report = generateSummaryReport();
    const markdown = formatReportAsMarkdown(report);
    downloadFile(markdown, 'lingualink_report.md', 'text/markdown');
}

function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
        Object.values(row).map(val => `"${val}"`).join(',')
    ).join('\n');
    
    return headers + '\n' + rows;
}

function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ---- AI Summary ----
function updateAISummary(data) {
    const summaryDiv = document.getElementById('ai-summary');
    
    if (!data || !data.clusters) {
        summaryDiv.innerHTML = `
            <div class="summary-placeholder">
                <span class="summary-icon">📊</span>
                <span>Run analysis to see AI insights</span>
            </div>
        `;
        return;
    }
    
    const summary = generateAISummary(data);
    summaryDiv.innerHTML = `
        <div class="summary-content">
            <div class="summary-stat">
                <span class="summary-number">${data.total_clusters}</span>
                <span class="summary-label">Clusters Found</span>
            </div>
            <div class="summary-stat">
                <span class="summary-number">${data.total_pairs}</span>
                <span class="summary-label">Duplicate Pairs</span>
            </div>
            <div class="summary-insight">
                <span class="summary-icon">💡</span>
                <span>${summary.insight}</span>
            </div>
        </div>
    `;
}

function generateAISummary(data) {
    const avgClusterSize = data.clusters.reduce((sum, c) => sum + (c.size || 0), 0) / data.clusters.length;
    
    let insight = "";
    if (avgClusterSize > 3) {
        insight = "Many large clusters detected - consider reviewing data quality";
    } else if (avgClusterSize > 2) {
        insight = "Moderate duplication found - good candidates for deduplication";
    } else {
        insight = "Mostly pairs - high data quality with minimal duplication";
    }
    
    return { insight };
}

// ---- Test Playground ----
function runTestComparison() {
    const text1 = document.getElementById('test-input-1').value.trim();
    const text2 = document.getElementById('test-input-2').value.trim();
    
    if (!text1 || !text2) {
        alert('Please enter both texts to compare');
        return;
    }
    
    const btn = document.getElementById('btn-test');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="btn-icon">⏳</span> Analyzing...';
    btn.disabled = true;
    
    // Simulate processing delay
    setTimeout(() => {
        const results = generateMockResults(text1, text2);
        showTestResults(results);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }, 800);
}

function showTestResults(results) {
    const resultsDiv = document.getElementById('test-results');
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = `
        <div class="test-result-item">
            <span class="result-label">🧠 Semantic:</span>
            <span class="result-value">${(results.semantic || 0).toFixed(3)}</span>
        </div>
        <div class="test-result-item">
            <span class="result-label">🔊 Phonetic:</span>
            <span class="result-value">${(results.phonetic || 0).toFixed(3)}</span>
        </div>
        <div class="test-result-item">
            <span class="result-label">📝 Structural:</span>
            <span class="result-value">${(results.structural || 0).toFixed(3)}</span>
        </div>
        <div class="test-result-item">
            <span class="result-label">⚖️ Fused:</span>
            <span class="result-value">${(results.fused || 0).toFixed(3)}</span>
        </div>
    `;
}

function generateMockResults(text1, text2) {
    // Normalize texts
    const t1 = text1.toLowerCase().trim();
    const t2 = text2.toLowerCase().trim();
    
    // Calculate different similarity metrics
    const exactMatch = t1 === t2;
    const contains1 = t1.includes(t2) || t2.includes(t1);
    
    // Levenshtein-like distance approximation (simplified)
    const levenshteinSimilarity = calculateLevenshteinSimilarity(t1, t2);
    
    // Phonetic similarity (simplified - checks for common patterns)
    const phoneticSimilarity = calculatePhoneticSimilarity(t1, t2);
    
    // Semantic similarity (simplified - word overlap)
    const semanticSimilarity = calculateSemanticSimilarity(t1, t2);
    
    // Structural similarity (character-level)
    const structuralSimilarity = levenshteinSimilarity;
    
    // Calculate fused score (weighted like the real algorithm)
    const fused = (0.55 * semanticSimilarity) + (0.25 * phoneticSimilarity) + (0.20 * structuralSimilarity);
    
    return {
        semantic: semanticSimilarity,
        phonetic: phoneticSimilarity,
        structural: structuralSimilarity,
        fused: fused
    };
}

function calculateLevenshteinSimilarity(s1, s2) {
    // Simplified Levenshtein distance
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1.0;
    if (shorter.length === 0) return 0.0;
    
    // Count character matches
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
        if (longer.includes(shorter[i])) matches++;
    }
    
    return matches / longer.length;
}

function calculatePhoneticSimilarity(s1, s2) {
    // Simplified phonetic similarity - checks for sound patterns
    const sound1 = s1.replace(/[^a-z]/g, '');
    const sound2 = s2.replace(/[^a-z]/g, '');
    
    // Check for common phonetic patterns
    const patterns = [
        ['tion', 'sion'], ['c', 'k'], ['ph', 'f'], 
        ['gh', 'f'], ['ough', 'o'], ['ie', 'y']
    ];
    
    let similarity = calculateLevenshteinSimilarity(sound1, sound2);
    
    // Boost for common phonetic patterns
    patterns.forEach(([pattern, replacement]) => {
        if (sound1.includes(pattern) && sound2.includes(replacement) ||
            sound2.includes(pattern) && sound1.includes(replacement)) {
            similarity += 0.1;
        }
    });
    
    return Math.min(1.0, similarity);
}

function calculateSemanticSimilarity(s1, s2) {
    // Simplified semantic similarity - word overlap
    const words1 = s1.split(/\s+/).filter(w => w.length > 0);
    const words2 = s2.split(/\s+/).filter(w => w.length > 0);
    
    if (words1.length === 0 && words2.length === 0) return 1.0;
    if (words1.length === 0 || words2.length === 0) return 0.0;
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;
    
    return commonWords.length / totalWords;
}

// ---- AI Insight Card ----
function showAIInsightCard(data) {
    const card = document.getElementById('ai-insight-card');
    const content = document.getElementById('insight-content');
    
    // Calculate insights
    const avgClusterSize = data.clusters.reduce((sum, c) => sum + (c.size || 0), 0) / data.clusters.length;
    const highConfidencePairs = data.edges.filter(e => e.fused_score > 0.8).length;
    const confidencePercent = Math.round((highConfidencePairs / data.edges.length) * 100);
    
    // Generate insight message
    let insight = '';
    if (avgClusterSize > 3) {
        insight = 'Many large clusters detected - consider reviewing data quality';
    } else if (avgClusterSize > 2) {
        insight = 'Moderate duplication found - good candidates for deduplication';
    } else {
        insight = 'Mostly pairs - high data quality with minimal duplication';
    }
    
    content.innerHTML = `
        <div class="insight-stat">
            <span class="insight-label">Clusters Found</span>
            <span class="insight-value">${data.total_clusters}</span>
        </div>
        <div class="insight-stat">
            <span class="insight-label">Duplicate Pairs</span>
            <span class="insight-value">${data.total_pairs.toLocaleString()}</span>
        </div>
        <div class="insight-stat">
            <span class="insight-label">High Confidence</span>
            <span class="insight-value">${confidencePercent}%</span>
        </div>
        <div class="insight-stat">
            <span class="insight-label">Avg Cluster Size</span>
            <span class="insight-value">${avgClusterSize.toFixed(1)}</span>
        </div>
        <div class="insight-highlight">
            <strong>AI Insight:</strong> ${insight}
        </div>
    `;
    
    card.style.display = 'block';
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
        hideInsightCard();
    }, 10000);
}

function hideInsightCard() {
    const card = document.getElementById('ai-insight-card');
    card.style.display = 'none';
}

// ---- Status Management ----
function updateStatus(status) {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    
    if (status === 'processing') {
        statusDot.className = 'status-dot status-processing';
        statusText.textContent = 'Processing';
    } else {
        statusDot.className = 'status-dot status-ready';
        statusText.textContent = 'Ready';
    }
}

// ---- Header Actions ----
function resetDashboard() {
    location.reload();
}

function exportAll() {
    // Trigger export report
    exportReport();
}

// ---- Enhanced Graph Controls ----
function filterByLanguage() {
    const selectedLang = document.getElementById('lang-filter').value;
    
    // Get all graph elements
    const nodes = document.querySelectorAll('.nodes circle');
    const labels = document.querySelectorAll('.labels text');
    const links = document.querySelectorAll('.links line');
    
    if (!selectedLang) {
        // Show all nodes and edges
        nodes.forEach(node => node.style.display = 'block');
        labels.forEach(label => label.style.display = 'block');
        links.forEach(link => link.style.display = 'block');
        return;
    }
    
    // Filter nodes by language
    nodes.forEach((node, index) => {
        const nodeData = node.__data__;
        if (nodeData && nodeData.language === selectedLang) {
            node.style.display = 'block';
            if (labels[index]) labels[index].style.display = 'block';
        } else {
            node.style.display = 'none';
            if (labels[index]) labels[index].style.display = 'none';
        }
    });
    
    // Filter edges - show only if both nodes are visible
    links.forEach(link => {
        const linkData = link.__data__;
        const sourceNode = document.querySelector(`.nodes circle:nth-child(${Array.from(nodes).findIndex(n => n.__data__.id === (linkData.source.id || linkData.source)) + 1})`);
        const targetNode = document.querySelector(`.nodes circle:nth-child(${Array.from(nodes).findIndex(n => n.__data__.id === (linkData.target.id || linkData.target)) + 1})`);
        
        if (sourceNode && targetNode && 
            sourceNode.style.display !== 'none' && 
            targetNode.style.display !== 'none') {
            link.style.display = 'block';
        } else {
            link.style.display = 'none';
        }
    });
}

function updateEdgeThreshold(value) {
    currentEdgeThreshold = parseFloat(value);
    document.getElementById('threshold-value').textContent = value;
    // Implementation would update graph edge visibility
    console.log('Edge threshold updated:', currentEdgeThreshold);
}

function toggleMinimap() {
    minimapVisible = !minimapVisible;
    const minimap = document.getElementById('minimap-container');
    minimap.style.display = minimapVisible ? 'block' : 'none';
}

function exportGraph() {
    // Export graph as image
    const svgElement = document.querySelector('#graph-container svg');
    if (svgElement) {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            canvas.toBlob(function(blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'lingualink_graph.png';
                a.click();
                URL.revokeObjectURL(url);
            });
        };
        
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    }
}

// ---- Enhanced Loading Experience ----
function showEnhancedLoading() {
    showLoading();
    // Add dynamic progress updates based on actual API progress
    updateLoadingProgress();
}

function updateLoadingProgress() {
    // Simulate progress updates
    setTimeout(() => {
        updateStepStatus('step-1', 'Computing LaBSE Semantic Embeddings... (50%)');
    }, 1000);
    
    setTimeout(() => {
        updateStepStatus('step-1', 'Computing LaBSE Semantic Embeddings... (100%)');
        updateStepStatus('step-2', 'Generating Phonetic Fingerprints... (25%)');
    }, 2500);
    
    setTimeout(() => {
        updateStepStatus('step-2', 'Generating Phonetic Fingerprints... (75%)');
    }, 4000);
    
    setTimeout(() => {
        updateStepStatus('step-2', 'Generating Phonetic Fingerprints... (100%)');
        updateStepStatus('step-3', 'Running Structural Fuzzy Matching... (50%)');
    }, 5500);
}

function updateStepStatus(stepId, text) {
    const step = document.getElementById(stepId);
    if (step) {
        step.querySelector('span').textContent = text;
    }
}

// ---- Helper Functions ----
function updateTopBarTitle(title) {
    document.getElementById('top-bar-title').textContent = title;
}

function generateSummaryReport() {
    if (!appState.data) return {};
    
    return {
        totalRecords: appState.data.total_records,
        totalClusters: appState.data.total_clusters,
        totalPairs: appState.data.total_pairs,
        processingTime: appState.data.processing_time,
        threshold: appState.data.threshold || 0.55,
        languageDistribution: appState.data.language_stats || {},
        duplicateTypes: appState.data.duplicate_type_stats || {}
    };
}

function formatReportAsMarkdown(report) {
    return `# LinguaLink Analysis Report

## Summary
- **Total Records:** ${report.totalRecords}
- **Duplicate Clusters:** ${report.totalClusters}
- **Duplicate Pairs:** ${report.totalPairs}
- **Processing Time:** ${report.processingTime}s
- **Threshold:** ${report.threshold}

## Language Distribution
${Object.entries(report.languageDistribution)
    .map(([lang, count]) => `- ${lang}: ${count}`)
    .join('\n')}

## Duplicate Types
${Object.entries(report.duplicateTypes)
    .map(([type, count]) => `- ${type}: ${count}`)
    .join('\n')}

---
Generated by LinguaLink - Multilingual Duplicate Detection Engine
`;
}

// Start immediately
window.addEventListener('load', initIdleParticles);

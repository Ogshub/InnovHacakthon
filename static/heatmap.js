/* ============================================
   LinguaLink — D3.js Similarity Heatmap
   ============================================ */

function renderHeatmap(data) {
    const container = document.getElementById('heatmap-container');
    container.innerHTML = '';
    
    // Build a subset of records for the heatmap (top clusters)
    const topClusters = data.clusters.slice(0, 8);
    const memberIndices = new Set();
    topClusters.forEach(c => c.members.forEach(m => memberIndices.add(m)));
    
    const records = data.records.filter(r => memberIndices.has(r.idx));
    
    if (records.length < 2) {
        container.innerHTML = '<p style="padding:40px;text-align:center;color:var(--text-muted)">Not enough data for heatmap</p>';
        return;
    }
    
    // Limit to 50 for readability
    const subset = records.slice(0, 50);
    const n = subset.length;
    
    // Build similarity matrix from edges
    const simMatrix = Array.from({ length: n }, () => Array(n).fill(0));
    const idxMap = {};
    subset.forEach((r, i) => { idxMap[r.idx] = i; });
    
    data.edges.forEach(e => {
        const si = idxMap[e.source];
        const ti = idxMap[e.target];
        if (si !== undefined && ti !== undefined) {
            simMatrix[si][ti] = e.fused_score;
            simMatrix[ti][si] = e.fused_score;
        }
    });
    
    // Set diagonal to 1
    for (let i = 0; i < n; i++) simMatrix[i][i] = 1.0;
    
    const cellSize = Math.max(12, Math.min(28, 700 / n));
    const margin = { top: 120, right: 30, bottom: 10, left: 180 };
    const svgWidth = margin.left + n * cellSize + margin.right;
    const svgHeight = margin.top + n * cellSize + margin.bottom;
    
    const svg = d3.select(container)
        .append('svg')
        .attr('width', svgWidth)
        .attr('height', svgHeight);
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Color scale
    const colorScale = d3.scaleSequential()
        .domain([0, 1])
        .interpolator(d3.interpolateInferno);
    
    // Labels
    const labelTexts = subset.map(r => {
        const name = r.name;
        return name.length > 20 ? name.substring(0, 20) + '…' : name;
    });
    
    // Row labels
    g.selectAll('.row-label')
        .data(labelTexts)
        .join('text')
        .attr('class', 'row-label')
        .attr('x', -6)
        .attr('y', (d, i) => i * cellSize + cellSize / 2)
        .attr('text-anchor', 'end')
        .attr('alignment-baseline', 'middle')
        .attr('font-size', Math.min(10, cellSize - 2) + 'px')
        .attr('fill', (d, i) => getLangColor(subset[i].language))
        .attr('font-family', "'Inter', sans-serif")
        .text(d => d);
    
    // Column labels
    g.selectAll('.col-label')
        .data(labelTexts)
        .join('text')
        .attr('class', 'col-label')
        .attr('x', 0)
        .attr('y', 0)
        .attr('transform', (d, i) => `translate(${i * cellSize + cellSize / 2}, -6) rotate(-65)`)
        .attr('text-anchor', 'start')
        .attr('font-size', Math.min(10, cellSize - 2) + 'px')
        .attr('fill', (d, i) => getLangColor(subset[i].language))
        .attr('font-family', "'Inter', sans-serif")
        .text(d => d);
    
    // Cells
    const tooltip = document.getElementById('tooltip');
    
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            const val = simMatrix[i][j];
            
            g.append('rect')
                .attr('x', j * cellSize)
                .attr('y', i * cellSize)
                .attr('width', cellSize - 1)
                .attr('height', cellSize - 1)
                .attr('rx', 2)
                .attr('fill', val > 0.01 ? colorScale(val) : 'rgba(255,255,255,0.02)')
                .style('cursor', 'pointer')
                .on('mouseover', function(event) {
                    d3.select(this).attr('stroke', '#fff').attr('stroke-width', 1.5);
                    tooltip.style.display = 'block';
                    tooltip.innerHTML = `
                        <div class="tooltip-title">${escapeHtml(subset[i].name)}</div>
                        <div style="margin-bottom:4px;font-size:0.75rem;color:var(--text-muted)">↕</div>
                        <div class="tooltip-title">${escapeHtml(subset[j].name)}</div>
                        <div class="tooltip-row">
                            <span class="tooltip-label">Fused Score</span>
                            <span class="tooltip-value">${(val * 100).toFixed(1)}%</span>
                        </div>
                    `;
                })
                .on('mousemove', function(event) {
                    tooltip.style.left = (event.pageX + 12) + 'px';
                    tooltip.style.top = (event.pageY - 10) + 'px';
                })
                .on('mouseout', function() {
                    d3.select(this).attr('stroke', 'none');
                    tooltip.style.display = 'none';
                });
        }
    }
    
    // Color bar legend
    const legendWidth = 200;
    const legendHeight = 12;
    const legendG = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top - 90})`);
    
    const legendScale = d3.scaleLinear().domain([0, 1]).range([0, legendWidth]);
    
    const legendGradient = defs => {
        const grad = defs.append('linearGradient')
            .attr('id', 'heatmap-gradient');
        
        for (let i = 0; i <= 10; i++) {
            grad.append('stop')
                .attr('offset', `${i * 10}%`)
                .attr('stop-color', colorScale(i / 10));
        }
    };
    
    const svgDefs = svg.append('defs');
    legendGradient(svgDefs);
    
    legendG.append('rect')
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .attr('rx', 3)
        .style('fill', 'url(#heatmap-gradient)');
    
    legendG.append('text')
        .attr('x', 0).attr('y', -4)
        .text('0%').attr('fill', 'var(--text-muted)')
        .attr('font-size', '9px').attr('font-family', "'JetBrains Mono'");
    
    legendG.append('text')
        .attr('x', legendWidth).attr('y', -4)
        .text('100%').attr('fill', 'var(--text-muted)')
        .attr('font-size', '9px').attr('text-anchor', 'end').attr('font-family', "'JetBrains Mono'");
    
    legendG.append('text')
        .attr('x', legendWidth / 2).attr('y', -4)
        .text('Similarity Score').attr('fill', 'var(--text-secondary)')
        .attr('font-size', '10px').attr('text-anchor', 'middle').attr('font-family', "'Inter'");
}

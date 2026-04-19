/* ============================================
   LinguaLink — D3.js Analytics Charts
   ============================================ */

function renderCharts(data) {
    renderLanguageChart(data);
    renderClusterChart(data);
    renderSignalChart(data);
    renderTypeChart(data);
}

// ---- Language Distribution Donut ----
function renderLanguageChart(data) {
    const container = document.getElementById('lang-chart');
    container.innerHTML = '';
    
    const stats = data.language_stats;
    const entries = Object.entries(stats).sort((a, b) => b[1] - a[1]);
    
    const width = 300, height = 300;
    const radius = Math.min(width, height) / 2 - 20;
    
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width/2}, ${height/2})`);
    
    const pie = d3.pie().value(d => d[1]).sort(null);
    const arc = d3.arc().innerRadius(radius * 0.55).outerRadius(radius);
    const arcHover = d3.arc().innerRadius(radius * 0.55).outerRadius(radius + 8);
    
    const tooltip = document.getElementById('tooltip');
    
    const arcs = svg.selectAll('path')
        .data(pie(entries))
        .join('path')
        .attr('d', arc)
        .attr('fill', d => getLangColor(d.data[0]))
        .attr('stroke', 'var(--bg-primary)')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .style('opacity', 0.85)
        .on('mouseover', function(event, d) {
            d3.select(this)
                .transition().duration(200)
                .attr('d', arcHover)
                .style('opacity', 1);
            
            const total = entries.reduce((s, e) => s + e[1], 0);
            const pct = ((d.data[1] / total) * 100).toFixed(1);
            
            tooltip.style.display = 'block';
            tooltip.innerHTML = `
                <div class="tooltip-title" style="color:${getLangColor(d.data[0])}">${d.data[0]}</div>
                <div class="tooltip-row">
                    <span class="tooltip-label">Records</span>
                    <span class="tooltip-value">${d.data[1]}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">Share</span>
                    <span class="tooltip-value">${pct}%</span>
                </div>
            `;
        })
        .on('mousemove', (event) => {
            tooltip.style.left = (event.pageX + 12) + 'px';
            tooltip.style.top = (event.pageY - 10) + 'px';
        })
        .on('mouseout', function() {
            d3.select(this)
                .transition().duration(200)
                .attr('d', arc)
                .style('opacity', 0.85);
            tooltip.style.display = 'none';
        });
    
    // Center text
    svg.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.3em')
        .attr('fill', 'var(--text-primary)')
        .attr('font-size', '1.8rem')
        .attr('font-weight', '800')
        .attr('font-family', "'JetBrains Mono'")
        .text(entries.length);
    
    svg.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1.2em')
        .attr('fill', 'var(--text-muted)')
        .attr('font-size', '0.7rem')
        .attr('font-weight', '600')
        .attr('text-transform', 'uppercase')
        .text('Languages');
}

// ---- Cluster Size Bar Chart ----
function renderClusterChart(data) {
    const container = document.getElementById('cluster-chart');
    container.innerHTML = '';
    
    const clusters = data.clusters.slice(0, 12);
    
    const margin = { top: 10, right: 20, bottom: 30, left: 50 };
    const width = container.clientWidth - margin.left - margin.right || 400;
    const height = 260 - margin.top - margin.bottom;
    
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    const x = d3.scaleBand()
        .domain(clusters.map((_, i) => `C${i + 1}`))
        .range([0, width])
        .padding(0.3);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(clusters, d => d.size)])
        .nice()
        .range([height, 0]);
    
    // Bars
    svg.selectAll('rect')
        .data(clusters)
        .join('rect')
        .attr('x', (d, i) => x(`C${i + 1}`))
        .attr('y', d => y(d.size))
        .attr('width', x.bandwidth())
        .attr('height', d => height - y(d.size))
        .attr('rx', 4)
        .attr('fill', (d, i) => {
            const colors = ['#6366f1', '#8b5cf6', '#a78bfa', '#06b6d4', '#22d3ee', '#ec4899'];
            return colors[i % colors.length];
        })
        .attr('opacity', 0.8);
    
    // Confidence labels on bars
    svg.selectAll('.bar-label')
        .data(clusters)
        .join('text')
        .attr('x', (d, i) => x(`C${i + 1}`) + x.bandwidth() / 2)
        .attr('y', d => y(d.size) - 5)
        .attr('text-anchor', 'middle')
        .attr('font-size', '9px')
        .attr('fill', 'var(--text-secondary)')
        .attr('font-family', "'JetBrains Mono'")
        .text(d => `${(d.avg_confidence * 100).toFixed(0)}%`);
    
    // Axes
    svg.append('g')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('fill', 'var(--text-muted)')
        .attr('font-size', '10px');
    
    svg.append('g')
        .call(d3.axisLeft(y).ticks(5))
        .selectAll('text')
        .attr('fill', 'var(--text-muted)')
        .attr('font-size', '10px');
    
    svg.selectAll('.domain, .tick line').attr('stroke', 'var(--border)');
}

// ---- Signal Contribution Chart ----
function renderSignalChart(data) {
    const container = document.getElementById('signal-chart');
    container.innerHTML = '';
    
    // Compute average signals across all edges
    let totalSem = 0, totalPhon = 0, totalStruct = 0;
    const edgeCount = data.edges.length || 1;
    
    data.edges.forEach(e => {
        totalSem += e.semantic;
        totalPhon += e.phonetic;
        totalStruct += e.structural;
    });
    
    const signals = [
        { name: 'Semantic (LaBSE)', value: totalSem / edgeCount, color: '#6366f1', weight: '55%' },
        { name: 'Phonetic', value: totalPhon / edgeCount, color: '#06b6d4', weight: '25%' },
        { name: 'Structural', value: totalStruct / edgeCount, color: '#ec4899', weight: '20%' },
    ];
    
    const margin = { top: 10, right: 20, bottom: 10, left: 120 };
    const width = container.clientWidth - margin.left - margin.right || 300;
    const barHeight = 36;
    const height = signals.length * (barHeight + 16);
    
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    const x = d3.scaleLinear().domain([0, 1]).range([0, width]);
    
    signals.forEach((s, i) => {
        const y = i * (barHeight + 16);
        
        // Background bar
        svg.append('rect')
            .attr('x', 0).attr('y', y)
            .attr('width', width).attr('height', barHeight)
            .attr('rx', 6)
            .attr('fill', 'rgba(255,255,255,0.03)');
        
        // Value bar
        svg.append('rect')
            .attr('x', 0).attr('y', y)
            .attr('width', x(s.value)).attr('height', barHeight)
            .attr('rx', 6)
            .attr('fill', s.color)
            .attr('opacity', 0.6);
        
        // Label
        svg.append('text')
            .attr('x', -8).attr('y', y + barHeight / 2)
            .attr('text-anchor', 'end').attr('alignment-baseline', 'middle')
            .attr('font-size', '11px').attr('fill', 'var(--text-secondary)')
            .attr('font-family', "'Inter'").attr('font-weight', '600')
            .text(s.name);
        
        // Value
        svg.append('text')
            .attr('x', x(s.value) + 8).attr('y', y + barHeight / 2)
            .attr('alignment-baseline', 'middle')
            .attr('font-size', '11px').attr('fill', 'var(--text-primary)')
            .attr('font-family', "'JetBrains Mono'").attr('font-weight', '600')
            .text(`${(s.value * 100).toFixed(1)}% avg (w: ${s.weight})`);
    });
}

// ---- Duplicate Type Distribution ----
function renderTypeChart(data) {
    const container = document.getElementById('type-chart');
    container.innerHTML = '';
    
    const stats = data.duplicate_type_stats || {};
    const entries = Object.entries(stats).sort((a, b) => b[1] - a[1]);
    
    if (entries.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">No type data available</p>';
        return;
    }
    
    const typeColors = {
        'original': '#10b981',
        'typo': '#ef4444',
        'paraphrase': '#8b5cf6',
        'cross_lang': '#3b82f6',
        'noise': '#f59e0b',
        'abbreviation': '#06b6d4',
        'codemix': '#ec4899',
        'hard_negative': '#6b7280',
    };
    
    const margin = { top: 10, right: 20, bottom: 30, left: 100 };
    const width = container.clientWidth - margin.left - margin.right || 400;
    const barHeight = 24;
    const height = entries.length * (barHeight + 8);
    
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    const x = d3.scaleLinear()
        .domain([0, d3.max(entries, d => d[1])])
        .range([0, width]);
    
    entries.forEach(([type, count], i) => {
        const y = i * (barHeight + 8);
        const color = typeColors[type] || '#888';
        
        svg.append('rect')
            .attr('x', 0).attr('y', y)
            .attr('width', x(count)).attr('height', barHeight)
            .attr('rx', 4)
            .attr('fill', color)
            .attr('opacity', 0.7);
        
        svg.append('text')
            .attr('x', -8).attr('y', y + barHeight / 2)
            .attr('text-anchor', 'end').attr('alignment-baseline', 'middle')
            .attr('font-size', '10px').attr('fill', color)
            .attr('font-family', "'Inter'").attr('font-weight', '600')
            .text(type);
        
        svg.append('text')
            .attr('x', x(count) + 6).attr('y', y + barHeight / 2)
            .attr('alignment-baseline', 'middle')
            .attr('font-size', '10px').attr('fill', 'var(--text-muted)')
            .attr('font-family', "'JetBrains Mono'").attr('font-weight', '600')
            .text(count);
    });
}

/* ============================================
   LinguaLink — D3.js Force-Directed Network Graph
   ============================================ */

function renderGraph(data) {
    const container = document.getElementById('graph-container');
    container.innerHTML = '';
    
    const width = container.clientWidth;
    const height = container.clientHeight || 550;
    
    // Build nodes and links
    const nodeSet = new Set();
    data.edges.forEach(e => { nodeSet.add(e.source); nodeSet.add(e.target); });
    
    const nodeRecords = data.records.filter(r => nodeSet.has(r.idx));
    const nodes = nodeRecords.map(r => ({
        id: r.idx,
        name: r.name,
        language: r.language,
        cluster_id: r.cluster_id,
        translated_to_en: r.translated_to_en,
        duplicate_type: r.duplicate_type,
    }));
    
    const nodeIdSet = new Set(nodes.map(n => n.id));
    const links = data.edges
        .filter(e => nodeIdSet.has(e.source) && nodeIdSet.has(e.target))
        .map(e => ({
            source: e.source,
            target: e.target,
            fused_score: e.fused_score,
            semantic: e.semantic,
            phonetic: e.phonetic,
            structural: e.structural,
        }));
    
    if (nodes.length === 0) {
        container.innerHTML = '<p style="padding:40px;text-align:center;color:var(--text-muted)">No connected nodes to display. Try lowering the threshold.</p>';
        return;
    }
    
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Gradient defs
    const defs = svg.append('defs');
    
    // Glow filter
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    
    const g = svg.append('g');
    
    // Zoom
    const zoom = d3.zoom()
        .scaleExtent([0.2, 5])
        .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);
    
    // Simulation
    const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(d => 120 - d.fused_score * 60))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(25))
        .force('x', d3.forceX(width / 2).strength(0.05))
        .force('y', d3.forceY(height / 2).strength(0.05));
    
    // Links
    const link = g.append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke', d => {
            const score = d.fused_score;
            if (score > 0.8) return 'rgba(99, 102, 241, 0.5)';
            if (score > 0.65) return 'rgba(6, 182, 212, 0.35)';
            return 'rgba(255, 255, 255, 0.1)';
        })
        .attr('stroke-width', d => Math.max(0.5, d.fused_score * 3))
        .attr('stroke-linecap', 'round');
    
    // Nodes
    const node = g.append('g')
        .attr('class', 'nodes')
        .selectAll('circle')
        .data(nodes)
        .join('circle')
        .attr('r', d => {
            const clusterSize = data.clusters.find(c => c.cluster_id === d.cluster_id)?.size || 1;
            return Math.max(5, Math.min(14, 4 + clusterSize * 0.8));
        })
        .attr('fill', d => getLangColor(d.language))
        .attr('stroke', d => getLangColor(d.language))
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 0.3)
        .attr('fill-opacity', 0.85)
        .style('cursor', 'pointer')
        .style('filter', 'url(#glow)')
        .call(drag(simulation));
    
    // Labels
    const labels = g.append('g')
        .attr('class', 'labels')
        .selectAll('text')
        .data(nodes)
        .join('text')
        .attr('class', 'node-label')
        .text(d => {
            const name = d.name;
            return name.length > 18 ? name.substring(0, 18) + '…' : name;
        })
        .attr('font-size', '8px')
        .attr('fill', 'rgba(255,255,255,0.6)')
        .attr('text-anchor', 'middle')
        .attr('dy', -14)
        .style('pointer-events', 'none')
        .style('font-family', "'Inter', sans-serif")
        .style('font-weight', '500');
    
    // Tooltip
    const tooltip = document.getElementById('tooltip');
    
    node.on('mouseover', function(event, d) {
        // Highlight node
        d3.select(this)
            .transition().duration(200)
            .attr('r', d3.select(this).attr('r') * 1.5)
            .attr('fill-opacity', 1)
            .attr('stroke-width', 3);
        
        // Highlight connected edges
        link.attr('stroke-opacity', l => 
            (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.1
        ).attr('stroke-width', l =>
            (l.source.id === d.id || l.target.id === d.id) ? 3 : 0.5
        );
        
        // Dim unconnected nodes
        const connected = new Set();
        links.forEach(l => {
            const sid = typeof l.source === 'object' ? l.source.id : l.source;
            const tid = typeof l.target === 'object' ? l.target.id : l.target;
            if (sid === d.id) connected.add(tid);
            if (tid === d.id) connected.add(sid);
        });
        connected.add(d.id);
        
        node.attr('opacity', n => connected.has(n.id) ? 1 : 0.15);
        labels.attr('opacity', n => connected.has(n.id) ? 1 : 0.1);
        
        // Show tooltip
        tooltip.style.display = 'block';
        tooltip.innerHTML = `
            <div class="tooltip-title">${escapeHtml(d.name)}</div>
            <div class="tooltip-row">
                <span class="tooltip-label">Language</span>
                <span class="tooltip-value" style="color:${getLangColor(d.language)}">${d.language}</span>
            </div>
            <div class="tooltip-row">
                <span class="tooltip-label">English</span>
                <span class="tooltip-value">${d.translated_to_en || '—'}</span>
            </div>
            <div class="tooltip-row">
                <span class="tooltip-label">Cluster</span>
                <span class="tooltip-value">#${d.cluster_id}</span>
            </div>
            <div class="tooltip-row">
                <span class="tooltip-label">Type</span>
                <span class="tooltip-value">${d.duplicate_type || '—'}</span>
            </div>
        `;
    })
    .on('mousemove', (event) => {
        tooltip.style.left = (event.pageX + 12) + 'px';
        tooltip.style.top = (event.pageY - 10) + 'px';
    })
    .on('mouseout', function() {
        // Reset
        node.transition().duration(200)
            .attr('fill-opacity', 0.85)
            .attr('stroke-width', 2)
            .attr('opacity', 1);
        
        d3.select(this).attr('r', function(d) {
            const clusterSize = data.clusters.find(c => c.cluster_id === d.cluster_id)?.size || 1;
            return Math.max(5, Math.min(14, 4 + clusterSize * 0.8));
        });
        
        link.attr('stroke-opacity', 1)
            .attr('stroke-width', d => Math.max(0.5, d.fused_score * 3));
        
        labels.attr('opacity', 1);
        tooltip.style.display = 'none';
    })
    .on('dblclick', function(event, d) {
        // Highlight entire cluster on click
        const clusterId = d.cluster_id;
        const clusterMembers = new Set(
            data.records.filter(r => r.cluster_id === clusterId).map(r => r.idx)
        );
        
        node.attr('opacity', n => clusterMembers.has(n.id) ? 1 : 0.05)
            .attr('stroke-width', n => clusterMembers.has(n.id) ? 4 : 1);
        
        link.attr('stroke-opacity', l => {
            const sid = typeof l.source === 'object' ? l.source.id : l.source;
            const tid = typeof l.target === 'object' ? l.target.id : l.target;
            return (clusterMembers.has(sid) && clusterMembers.has(tid)) ? 1 : 0.02;
        });
        
        labels.attr('opacity', n => clusterMembers.has(n.id) ? 1 : 0.02);
        
        // Pan to node
        svg.transition().duration(750).call(
            zoom.transform,
            d3.zoomIdentity.translate(width / 2 - d.x * 1.5, height / 2 - d.y * 1.5).scale(1.5)
        );
    });
    
    // Tick
    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        
        node
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);
        
        labels
            .attr('x', d => d.x)
            .attr('y', d => d.y);
    });
    
    // Entrance animation — start with nodes at center
    nodes.forEach(n => { n.x = width / 2; n.y = height / 2; });
    simulation.alpha(1).restart();
}

// Drag behavior
function drag(simulation) {
    function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }
    
    function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }
    
    function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }
    
    return d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
}

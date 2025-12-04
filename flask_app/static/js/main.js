document.addEventListener('DOMContentLoaded', () => {
    // Initial Fetch
    fetchStats();
    fetchClusters();
    fetchData();

    // Setup Navigation
    setupNavigation();

    // Setup Notifications
    setupNotifications();

    // Setup Search/Filter
    setupSearch();
});

// Global Data Store
let allData = [];
let clusterData = {};

// --- Navigation ---
function setupNavigation() {
    const navItems = {
        'nav-dashboard': 'view-dashboard',
        'nav-clusters': 'view-clusters',
        'nav-raw-data': 'view-raw-data',
        'nav-accounts': 'view-accounts',
        'nav-settings': 'view-settings'
    };

    Object.keys(navItems).forEach(navId => {
        const el = document.getElementById(navId);
        if (el) {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                switchView(navId, navItems[navId]);
            });
        }
    });
}

function switchView(activeNavId, viewId) {
    // Update Nav State
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(activeNavId).classList.add('active');

    // Update View State
    document.querySelectorAll('.view-section').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('active');
    });

    const view = document.getElementById(viewId);
    view.classList.remove('hidden');
    view.classList.add('active');

    // Update Breadcrumb
    const viewName = document.getElementById(activeNavId).querySelector('span').textContent;
    document.getElementById('current-view-name').textContent = viewName;
}

// --- Notifications ---
function setupNotifications() {
    const btn = document.getElementById('notification-btn');
    const dropdown = document.getElementById('notification-dropdown');

    if (btn && dropdown) {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (!btn.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });
    }
}

// --- Search & Filter ---
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    const filterBtn = document.getElementById('filter-btn');
    const exportBtn = document.getElementById('export-csv');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allData.filter(item =>
                (item.Title && item.Title.toLowerCase().includes(term)) ||
                (item.Source && item.Source.toLowerCase().includes(term)) ||
                (item.topic_cluster && item.topic_cluster.toLowerCase().includes(term))
            );
            renderTable(filtered);
        });
    }

    if (filterBtn) {
        filterBtn.addEventListener('click', () => {
            if (searchInput) searchInput.focus();
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            alert('Exporting data to CSV... (Feature coming soon)');
        });
    }
}

// --- Fetch & Update Stats ---
async function fetchStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();

        updateStat('avg-impact', stats.avg_impact ? stats.avg_impact.toFixed(2) : '0.00');
        updateStat('avg-sentiment', stats.avg_sentiment ? stats.avg_sentiment.toFixed(2) : '0.00');
        updateStat('high-impact-count', stats.high_impact_count || 0);
        updateStat('total-sources', stats.sources_count || 0);
    } catch (error) {
        console.error('Error fetching stats:', error);
    }
}

function updateStat(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// --- Fetch & Render Charts/Clusters ---
let topicChartInstance = null;
let scatterChartInstance = null;

async function fetchClusters() {
    try {
        const response = await fetch('/api/clusters');
        clusterData = await response.json();

        renderTopicChart(clusterData);
        renderClustersView(clusterData);
    } catch (error) {
        console.error('Error fetching clusters:', error);
    }
}

function renderTopicChart(data) {
    const ctx = document.getElementById('topicChart').getContext('2d');
    const labels = Object.keys(data);
    const values = Object.values(data);

    if (topicChartInstance) topicChartInstance.destroy();

    topicChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    '#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fb7185', '#22c55e'
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#94a3b8', font: { family: 'Inter' } }
                }
            },
            cutout: '70%'
        }
    });
}

function renderClustersView(data) {
    const grid = document.getElementById('clusters-grid');
    if (!grid) return;

    grid.innerHTML = '';

    Object.entries(data).forEach(([cluster, count]) => {
        const card = document.createElement('div');
        card.className = 'cluster-card';
        card.innerHTML = `
            <div class="cluster-header">
                <span class="cluster-title">${cluster}</span>
                <span class="cluster-count">${count} Signals</span>
            </div>
            <div class="cluster-preview">
                <p style="color: var(--text-secondary); font-size: 0.8rem;">
                    Active topic cluster detected in current feed.
                </p>
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- Fetch & Render Table + Scatter Chart ---
async function fetchData() {
    try {
        const response = await fetch('/api/data');
        allData = await response.json();

        renderTable(allData);
        renderRawDataTable(allData);
        renderScatterChart(allData);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function renderTable(data) {
    const tbody = document.getElementById('signal-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Limit to first 50 for performance on dashboard
    data.slice(0, 50).forEach(item => {
        const tr = document.createElement('tr');

        // Impact Badge Logic
        let impactClass = 'impact-low';
        if (item.impact_level && item.impact_level.toLowerCase() === 'high') impactClass = 'impact-high';
        else if (item.impact_level && item.impact_level.toLowerCase() === 'medium') impactClass = 'impact-medium';

        // Sentiment Bar Logic
        let sentClass = 'sentiment-neu';
        let sentWidth = Math.abs(item.sentiment_score) * 100;
        if (sentWidth > 100) sentWidth = 100;

        if (item.sentiment_score > 0.1) sentClass = 'sentiment-pos';
        else if (item.sentiment_score < -0.1) sentClass = 'sentiment-neg';

        // Truncate title
        const title = item.Title && item.Title.length > 60 ? item.Title.substring(0, 60) + '...' : (item.Title || 'No Title');

        tr.innerHTML = `
            <td><span class="impact-badge ${impactClass}">${(item.impact_score || 0).toFixed(1)}</span></td>
            <td><span class="source-tag">${item.Source || 'Unknown'}</span></td>
            <td title="${item.Title || ''}">${title}</td>
            <td>
                <div class="sentiment-bar">
                    <div class="sentiment-fill ${sentClass}" style="width: ${sentWidth}%; left: ${item.sentiment_score < 0 ? 50 - sentWidth / 2 : 50}%;"></div>
                </div>
            </td>
            <td>${item.topic_cluster || 'Uncategorized'}</td>
            <td><button class="action-btn"><i class="fa-solid fa-eye"></i></button></td>
        `;
        tbody.appendChild(tr);
    });
}

function renderRawDataTable(data) {
    const tbody = document.getElementById('raw-data-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Limit to 100 for now
    data.slice(0, 100).forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.Source || 'Unknown'}</td>
            <td>${item.Title || 'No Title'}</td>
            <td>${(item.impact_score || 0).toFixed(2)}</td>
            <td>${(item.sentiment_score || 0).toFixed(2)}</td>
            <td>${item.topic_cluster || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderScatterChart(data) {
    const ctx = document.getElementById('scatterChart').getContext('2d');

    const points = data.map(item => ({
        x: item.sentiment_score || 0,
        y: item.impact_score || 0,
        title: item.Title || 'Signal'
    }));

    if (scatterChartInstance) scatterChartInstance.destroy();

    scatterChartInstance = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Signals',
                data: points,
                backgroundColor: 'rgba(56, 189, 248, 0.6)',
                borderColor: 'rgba(56, 189, 248, 1)',
                borderWidth: 1,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: { display: true, text: 'Sentiment Score', color: '#94a3b8' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8' },
                    min: -1, max: 1
                },
                y: {
                    title: { display: true, text: 'Impact Score', color: '#94a3b8' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8' },
                    beginAtZero: true
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const point = context.raw;
                            return point.title.substring(0, 30) + '...';
                        }
                    }
                }
            }
        }
    });
}

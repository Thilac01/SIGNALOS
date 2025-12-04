document.addEventListener('DOMContentLoaded', () => {
    fetchStats();
    fetchClusters();
    fetchData();
});

// --- Fetch & Update Stats ---
async function fetchStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        updateStat('avg-impact', stats.avg_impact.toFixed(2));
        updateStat('avg-sentiment', stats.avg_sentiment.toFixed(2));
        updateStat('high-impact-count', stats.high_impact_count);
        updateStat('total-sources', stats.sources_count);
    } catch (error) {
        console.error('Error fetching stats:', error);
    }
}

function updateStat(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// --- Fetch & Render Charts ---
let topicChartInstance = null;
let scatterChartInstance = null;

async function fetchClusters() {
    try {
        const response = await fetch('/api/clusters');
        const clusters = await response.json();
        
        renderTopicChart(clusters);
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

// --- Fetch & Render Table + Scatter Chart ---
async function fetchData() {
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        
        renderTable(data);
        renderScatterChart(data);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function renderTable(data) {
    const tbody = document.getElementById('signal-table-body');
    tbody.innerHTML = '';
    
    // Limit to first 50 for performance if needed, or implement pagination
    data.slice(0, 50).forEach(item => {
        const tr = document.createElement('tr');
        
        // Impact Badge Logic
        let impactClass = 'impact-low';
        if (item.impact_level && item.impact_level.toLowerCase() === 'high') impactClass = 'impact-high';
        else if (item.impact_level && item.impact_level.toLowerCase() === 'medium') impactClass = 'impact-medium';
        
        // Sentiment Bar Logic
        let sentClass = 'sentiment-neu';
        let sentWidth = Math.abs(item.sentiment_score) * 100; // Assuming -1 to 1
        if (sentWidth > 100) sentWidth = 100;
        
        if (item.sentiment_score > 0.1) sentClass = 'sentiment-pos';
        else if (item.sentiment_score < -0.1) sentClass = 'sentiment-neg';
        
        // Truncate title
        const title = item.Title.length > 60 ? item.Title.substring(0, 60) + '...' : item.Title;

        tr.innerHTML = `
            <td><span class="impact-badge ${impactClass}">${item.impact_score.toFixed(1)}</span></td>
            <td><span class="source-tag">${item.Source}</span></td>
            <td title="${item.Title}">${title}</td>
            <td>
                <div class="sentiment-bar">
                    <div class="sentiment-fill ${sentClass}" style="width: ${sentWidth}%; left: ${item.sentiment_score < 0 ? 50 - sentWidth/2 : 50}%;"></div>
                </div>
            </td>
            <td>${item.topic_cluster}</td>
            <td><button class="action-btn"><i class="fa-solid fa-eye"></i></button></td>
        `;
        tbody.appendChild(tr);
    });
}

function renderScatterChart(data) {
    const ctx = document.getElementById('scatterChart').getContext('2d');
    
    // Prepare data points: x=Sentiment, y=Impact
    const points = data.map(item => ({
        x: item.sentiment_score,
        y: item.impact_score,
        title: item.Title // Custom property for tooltip
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
                        label: function(context) {
                            const point = context.raw;
                            return point.title.substring(0, 30) + '...';
                        }
                    }
                }
            }
        }
    });
}

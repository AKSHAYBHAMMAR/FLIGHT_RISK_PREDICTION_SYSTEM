// app.js
// Main application controller

document.addEventListener('DOMContentLoaded', () => {
    // Auth Guard
    const auth = localStorage.getItem('airlytics_auth');
    if (!auth) {
        window.location.href = 'login.html';
        return;
    }
    
    // Display User
    const userDisplay = document.getElementById('user-display');
    if (userDisplay) userDisplay.textContent = auth;

    // Initialize icons
    lucide.createIcons();
    
    // Initialize chart configuration
    if (window.nexusChart) {
        window.nexusChart.initChart();
    }
    
    // Initialize Leaflet Map
    if (window.nexusMap) {
        window.nexusMap.initMap();
    }

    // Connect form handler
    const form = document.getElementById('route-form');
    form.addEventListener('submit', handleDetermineRoute);

    // Logout handler
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('airlytics_auth');
            window.location.href = 'login.html';
        });
    }

    // CSV Download handler
    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', handleDownloadCSV);
    }
});

async function handleDetermineRoute(e) {
    if (e) e.preventDefault();
    
    const departure = document.getElementById('departure').value;
    const destination = document.getElementById('destination').value;
    
    if (!departure || !destination) return;
    
    // Show loading UI
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.classList.remove('hidden');
    // small delay for css transition
    setTimeout(() => loadingOverlay.classList.remove('opacity-0'), 10);
    
    const btn = document.getElementById('analyze-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Analyzing`;
    lucide.createIcons();
    btn.disabled = true;

    try {
        // Fetch Data
        const data = await window.nexusApi.analyzeRoute(departure, destination);
        
        const emptyState = document.getElementById('empty-state');
        
        // Function to perform the actual UI update after container is ready
        const performUpdates = () => {
            window.currentAnalysisData = data; // Store for download

            if (window.nexusMap && window.nexusMap.triggerResize) {
                window.nexusMap.triggerResize();
            }
            updateDashboardState(data);
            window.nexusMap.updateMap(data);
            if (window.nexusChart) {
                window.nexusChart.updateDelayChart(data.waypoints);
                if (window.nexusChart.updateRiskPieChart) {
                    window.nexusChart.updateRiskPieChart(data.waypoints);
                }
            }
            
            // Unhide new elements
            const pieContainer = document.getElementById('pie-chart-container');
            if (pieContainer) pieContainer.classList.remove('hidden');
            
            const downloadBtn = document.getElementById('download-btn');
            if (downloadBtn) downloadBtn.classList.remove('hidden');
        };

        if (emptyState && emptyState.style.display !== 'none') {
            emptyState.style.opacity = '0';
            setTimeout(() => {
                emptyState.style.display = 'none';
                document.getElementById('dashboard-content').style.display = 'flex';
                document.getElementById('dashboard-sidebar').style.display = 'flex';
                
                setTimeout(() => {
                    document.getElementById('dashboard-content').classList.remove('opacity-0', 'translate-y-8');
                    document.getElementById('dashboard-sidebar').classList.remove('opacity-0', 'translate-y-8');
                    
                    setTimeout(performUpdates, 100); // Give CSS time to process flex before map update
                }, 50);
            }, 500);
        } else {
            performUpdates(); // Already visible, update immediately
        }

    } catch (error) {
        console.error("Analysis Failed:", error);
        alert("Failed to analyze route. Please try again.");
    } finally {
        // Hide loading UI
        loadingOverlay.classList.add('opacity-0');
        setTimeout(() => loadingOverlay.classList.add('hidden'), 300);
        
        // Reset Button
        btn.innerHTML = originalText;
        lucide.createIcons();
        btn.disabled = false;
    }
}

function updateDashboardState(data) {
    // General Stats
    document.getElementById('stat-distance').textContent = data.distanceKm.toLocaleString();
    document.getElementById('stat-delay').textContent = data.avgDelay;
    
    // Risk Card Styling
    const riskCard = document.getElementById('risk-card');
    const riskIndicator = document.getElementById('risk-indicator');
    const riskLevel = document.getElementById('risk-level');
    const riskDesc = document.getElementById('risk-desc');
    const riskGlow = document.getElementById('risk-glow');
    
    // Reset Classes
    riskIndicator.className = 'w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl border-2 shadow-inner';
    riskGlow.className = 'absolute -right-10 -top-10 w-32 h-32 rounded-full blur-2xl opacity-40';
    
    switch (data.riskScore) {
        case 1: // Low
            riskIndicator.classList.add('bg-green-500/20', 'border-green-500/50', 'text-green-400');
            riskGlow.classList.add('bg-gradient-to-br', 'from-green-500', 'to-emerald-500/0');
            riskCard.className = 'glass-panel p-6 rounded-xl border border-green-500/30 relative overflow-hidden shadow-[0_0_15px_rgba(34,197,94,0.1)] transition-all';
            riskLevel.textContent = 'Favorable Conditions';
            riskLevel.className = 'text-xl font-medium tracking-tight text-green-400';
            riskDesc.textContent = 'Route delays are expected to be minimal. Weather en route is mostly clear.';
            riskIndicator.innerHTML = '<i data-lucide="check-circle" class="w-8 h-8"></i>';
            break;
        case 2: // Moderate
            riskIndicator.classList.add('bg-yellow-500/20', 'border-yellow-500/50', 'text-yellow-400');
            riskGlow.classList.add('bg-gradient-to-br', 'from-yellow-500', 'to-orange-500/0');
            riskCard.className = 'glass-panel p-6 rounded-xl border border-yellow-500/30 relative overflow-hidden shadow-[0_0_15px_rgba(234,179,8,0.1)] transition-all';
            riskLevel.textContent = 'Moderate Delays Alert';
            riskLevel.className = 'text-xl font-medium tracking-tight text-yellow-400';
            riskDesc.textContent = 'Sector delays expected due to minor weather systems or air traffic congestion.';
            riskIndicator.innerHTML = '<i data-lucide="alert-circle" class="w-8 h-8"></i>';
            break;
        case 3: // High
        case 4: // Severe
            riskIndicator.classList.add('bg-red-500/20', 'border-red-500/50', 'text-red-400', 'animate-pulse');
            riskGlow.classList.add('bg-gradient-to-br', 'from-red-600', 'to-rose-500/0');
            riskCard.className = 'glass-panel p-6 rounded-xl border border-red-500/40 relative overflow-hidden shadow-[0_0_20px_rgba(239,68,68,0.2)] transition-all';
            riskLevel.textContent = 'High Delay Risk';
            riskLevel.className = 'text-xl font-medium tracking-tight text-red-500';
            riskDesc.textContent = `Significant disruption likely. Predicted Delay: ${data.avgDelay} minutes. Rerouting may be necessary.`;
            riskIndicator.innerHTML = '<i data-lucide="triangle-alert" class="w-8 h-8"></i>';
            break;
    }
    
    // Update Waypoint List
    const list = document.getElementById('waypoints-list');
    document.getElementById('waypoint-count').textContent = `${data.waypoints.length} Tracking Points`;
    list.innerHTML = '';
    
    data.waypoints.forEach((wp, index) => {
        const item = document.createElement('div');
        
        let colorDot = 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]';
        let badgeColor = 'bg-green-500/10 text-green-400 border border-green-500/20';
        
        if (wp.delay >= 15) {
            colorDot = 'bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.8)]';
            badgeColor = 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20';
        }
        if (wp.delay >= 35) {
            colorDot = 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]';
            badgeColor = 'bg-red-500/10 text-red-400 border border-red-500/20';
        }

        item.innerHTML = `
            <!-- Node Marker -->
            <div class="absolute -left-1.5 w-3 h-3 rounded-full ${colorDot} top-1/2 -translate-y-1/2 z-10 border border-slate-800"></div>
            
            <div class="bg-slate-800/40 rounded-lg p-3 hover:bg-slate-700/50 transition-colors border border-slate-700/50 group">
                <div class="flex justify-between items-center mb-1.5">
                    <h4 class="font-medium text-slate-200 text-sm group-hover:text-aviation-accent transition-colors">${wp.name}</h4>
                    <span class="text-[10px] px-1.5 py-0.5 rounded ${badgeColor}">+${wp.delay}m</span>
                </div>
                <div class="flex items-center gap-2 mb-2">
                     <span class="text-xs text-sky-400 font-mono tracking-wider bg-sky-400/10 px-1 rounded">${wp.distanceCovered}km</span>
                </div>
                <div class="grid grid-cols-2 gap-y-1.5 gap-x-3 text-[11px] text-slate-400">
                    <span class="flex items-center gap-1.5" title="Condition"><i data-lucide="cloud" class="w-3.5 h-3.5 text-slate-500"></i> ${wp.weather.condition}</span>
                    <span class="flex items-center gap-1.5" title="Temperature"><i data-lucide="thermometer" class="w-3.5 h-3.5 text-red-400"></i> ${wp.weather.temp}°C</span>
                    <span class="flex items-center gap-1.5" title="Wind"><i data-lucide="wind" class="w-3.5 h-3.5 text-slate-300"></i> ${wp.weather.wind} m/s</span>
                    <span class="flex items-center gap-1.5" title="Visibility"><i data-lucide="eye" class="w-3.5 h-3.5 text-blue-300"></i> ${wp.weather.visibility} km</span>
                    <span class="flex items-center gap-1.5" title="Humidity"><i data-lucide="droplets" class="w-3.5 h-3.5 text-sky-500"></i> ${wp.weather.humidity}%</span>
                </div>
            </div>
        `;
        list.appendChild(item);
    });
    
    lucide.createIcons();
}

function handleDownloadCSV() {
    if (!window.currentAnalysisData) return;
    const d = window.currentAnalysisData;
    
    let csvContent = "data:text/csv;charset=utf-8,\n";
    csvContent += "AIRLYTICS ROUTE ANALYSIS SUMMARY\n";
    csvContent += `Departure,${d.departure.name}\n`;
    csvContent += `Destination,${d.destination.name}\n`;
    csvContent += `Total Distance (km),${d.distanceKm}\n`;
    csvContent += `Average Delay (min),${d.avgDelay}\n`;
    csvContent += `Overall Risk,${d.risk}\n\n`;
    
    csvContent += "WAYPOINTS DATA\n";
    csvContent += "Name,Distance (km),Delay (min),Condition,Temp (C),Wind (m/s),Visibility (km),Humidity (%)\n";
    
    d.waypoints.forEach(wp => {
        // Strip out commas from names if any
        const safeName = wp.name.replace(/,/g, '');
        csvContent += `"${safeName}",${wp.distanceCovered},${wp.delay},"${wp.weather.condition}",${wp.weather.temp},${wp.weather.wind},${wp.weather.visibility},${wp.weather.humidity}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Airlytics_Analysis_${d.departure.name.replace(/\s+/g, '_')}_to_${d.destination.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// map.js
// Handles Leaflet.js map visualization

let mapInstance = null;
let currentPathLayer = null;
let markersLayer = null;
let planeMarker = null;

// Function to generate SVG icons
const getSvgIcon = (color, type) => {
    let svgContent = '';
    
    if (type === 'waypoint') {
        svgContent = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="${color}" stroke="#0f172a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="8"/>
            </svg>`;
    } else {
        svgContent = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${color}" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                <circle cx="12" cy="10" r="3"/>
            </svg>`;
    }
    
    return L.divIcon({
        className: type === 'waypoint' ? 'custom-div-icon waypoint' : 'custom-div-icon',
        html: svgContent,
        iconSize: type === 'waypoint' ? [16, 16] : [24, 24],
        iconAnchor: type === 'waypoint' ? [8, 8] : [12, 24],
        popupAnchor: [0, -20]
    });
};

// Plane icon for animation
const planeIconHtml = `
    <div class="plane-marker">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#38bdf8" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" transform="rotate(45)">
            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.2-1.1.7l-1.2 3.6c-.2.5.1 1.1.6 1.4l6.4 3.2-3.8 3.8-2.9-.6a1 1 0 0 0-1.1.5l-.9 1.8c-.2.4 0 .9.4 1.1l4.4 2.2 2.2 4.4c.2.4.7.6 1.1.4l1.8-.9a1 1 0 0 0 .5-1.1l-.6-2.9 3.8-3.8 3.2 6.4c.3.5.9.8 1.4.6l3.6-1.2c.5-.2.8-.6.7-1.1Z"/>
        </svg>
    </div>`;

const planeIcon = L.divIcon({
    className: 'custom-div-icon',
    html: planeIconHtml,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});

function initMap() {
    mapInstance = L.map('map', {
        zoomControl: false,
        attributionControl: false // Cleaner UI
    }).setView([20, 0], 2);

    // Light styled basemap (CartoDB Voyager)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
    }).addTo(mapInstance);

    markersLayer = L.layerGroup().addTo(mapInstance);
    
    // Custom Zoom Control at bottom right
    L.control.zoom({
        position: 'bottomright'
    }).addTo(mapInstance);
}

function updateMap(data) {
    // Clear previous layers
    if (currentPathLayer) mapInstance.removeLayer(currentPathLayer);
    markersLayer.clearLayers();
    if (planeMarker) mapInstance.removeLayer(planeMarker);

    // 1. Draw glowing polyline route
    const latlngs = data.lineCoords;
    
    // Outer glow
    L.polyline(latlngs, {
        color: '#38bdf8',
        weight: 6,
        opacity: 0.3,
        dashArray: '10, 10'
    }).addTo(markersLayer);
    
    // Inner solid line
    currentPathLayer = L.polyline(latlngs, {
        color: '#0ea5e9',
        weight: 2,
        opacity: 0.9
    }).addTo(mapInstance);

    // Fit map bounds to show full route with padding
    mapInstance.fitBounds(currentPathLayer.getBounds(), { padding: [50, 50], animate: true, duration: 1.5 });

    // 2. Add Start & End Markers
    const startColor = '#22c55e'; // green
    const endColor = '#3b82f6'; // blue
    
    L.marker(data.departure.coord, { icon: getSvgIcon(startColor, 'pin') })
        .bindPopup(`<div class="p-3"><b>Departure: ${data.departure.name}</b><br>Initial Checkpoint</div>`)
        .addTo(markersLayer);
        
    L.marker(data.destination.coord, { icon: getSvgIcon(endColor, 'pin') })
        .bindPopup(`<div class="p-3"><b>Destination: ${data.destination.name}</b><br>Final Approach</div>`)
        .addTo(markersLayer);

    // 3. Add Waypoints with Delay Info
    data.waypoints.forEach((wp, index) => {
        // Skip first and last as they overlap with main pins
        if (index === 0 || index === data.waypoints.length - 1) return;
        
        let color = '#22c55e'; // default green
        let pulseClass = 'pulse-green';
        if (wp.delay >= 15 && wp.delay < 35) { color = '#eab308'; pulseClass = 'pulse-yellow'; }
        if (wp.delay >= 35) { color = '#ef4444'; pulseClass = 'pulse-red'; }
        
        const popupContent = `
            <div class="min-w-[200px] p-1">
                <div class="font-bold border-b border-slate-700/50 pb-2 mb-2 flex justify-between items-center">
                    <span>${wp.name}</span>
                    <span class="px-2 py-0.5 rounded text-[10px] ${wp.delay >= 35 ? 'bg-red-500/20 text-red-400' : wp.delay >= 15 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-400'}">Delay: ${wp.delay}m</span>
                </div>
                <div class="mb-2 text-[10px] text-slate-400 tracking-wide">
                    Distance: <span class="text-sky-300 font-mono">${wp.distanceCovered} km</span>
                </div>
                <div class="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
                    <div class="text-slate-400 flex items-center gap-1"><i data-lucide="cloud" class="w-3 h-3"></i> Cond:</div><div class="text-right font-medium text-slate-200">${wp.weather.condition}</div>
                    <div class="text-slate-400 flex items-center gap-1"><i data-lucide="thermometer" class="w-3 h-3 text-red-400"></i> Temp:</div><div class="text-right font-medium text-slate-200">${wp.weather.temp}°C</div>
                    <div class="text-slate-400 flex items-center gap-1"><i data-lucide="wind" class="w-3 h-3 text-slate-300"></i> Wind:</div><div class="text-right font-medium text-slate-200">${wp.weather.wind}m/s</div>
                    <div class="text-slate-400 flex items-center gap-1"><i data-lucide="eye" class="w-3 h-3 text-blue-300"></i> Vis:</div><div class="text-right font-medium text-slate-200">${wp.weather.visibility}km</div>
                    <div class="text-slate-400 flex items-center gap-1"><i data-lucide="droplets" class="w-3 h-3 text-sky-500"></i> Hum:</div><div class="text-right font-medium text-slate-200">${wp.weather.humidity}%</div>
                </div>
            </div>
        `;

        const markerHtml = `<div class="w-3 h-3 rounded-full bg-[${color}] ${pulseClass}"></div>`;
        const divIcon = L.divIcon({ className: 'custom-div-icon', html: markerHtml, iconSize: [12, 12], iconAnchor: [6, 6] });

        L.marker([wp.lat, wp.lng], { icon: divIcon })
            .bindPopup(popupContent, { closeButton: false })
            .addTo(markersLayer);
    });

    // 4. Animate Plane along route
    // -- Simulation stopped per request --
    // setTimeout(() => {
    //     animatePlaneTarget(latlngs);
    // }, 1500); // Wait for bounds to finish panning
}

function animatePlaneTarget(latlngs) {
    if (planeMarker) mapInstance.removeLayer(planeMarker);
    
    // Start plane at departure
    planeMarker = L.marker(latlngs[0], { icon: planeIcon, zIndexOffset: 1000 }).addTo(mapInstance);
    
    // Animate across line - simplified for visual prototype
    let i = 0;
    const interval = setInterval(() => {
        i++;
        if (i >= latlngs.length) {
            clearInterval(interval);
            // Reached destination
            return;
        }
        
        // Update rotation based on bearing (Optional complexity, omitting to keep it simple, just translating)
        planeMarker.setLatLng(latlngs[i]);
    }, 50); // Speed of animation based on number of points
}
function triggerResize() {
    if (mapInstance) {
        mapInstance.invalidateSize();
    }
}

window.nexusMap = { initMap, updateMap, triggerResize };

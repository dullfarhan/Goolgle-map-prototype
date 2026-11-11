/* ==========================================================================
   Melbourne Sample Drop-off Centre — script
   ========================================================================== */

/* --------------------------------------------------------------------------
   CONFIGURATION — update these values when the client provides real details
   -------------------------------------------------------------------------- */

/** Display name shown on the page and in the map info window */
var DROP_OFF_NAME = "Novogene Melbourne Sample Drop-off Centre (Sample)";

/**
 * SAMPLE / EXAMPLE address for prototype demo only.
 * Replace with the real centre address when the client confirms it.
 */
var DROP_OFF_ADDRESS =
  "Level 5, 120 Collins Street, Melbourne VIC 3000 (Sample address)";

/**
 * SAMPLE / EXAMPLE coordinates for map preview (Melbourne CBD area).
 * Replace with the verified drop-off centre coordinates later.
 */
var DROP_OFF_LAT = -37.8136;
var DROP_OFF_LNG = 144.9631;

/**
 * true = showing sample/example map location for the prototype.
 * Set to false once DROP_OFF_LAT / DROP_OFF_LNG are the verified centre.
 */
var USING_TEMPORARY_PREVIEW_COORDS = true;

/**
 * Google Maps Demo API Key — keep in this ONE place only.
 */
var GOOGLE_MAPS_API_KEY = "AIzaSyDS2efroMKzMt8bOni2oOct_hwaxTsGE44";

/** Sample start points with coordinates for routing. */
var SAMPLE_ORIGINS = {
  "Flinders Street Station, Melbourne VIC": { lat: -37.8183, lng: 144.9671 },
  "Southern Cross Station, Melbourne VIC": { lat: -37.8182, lng: 144.9525 },
  "Melbourne Central, Melbourne VIC": { lat: -37.8102, lng: 144.9628 },
  "Federation Square, Melbourne VIC": { lat: -37.8182, lng: 144.9691 },
  "Melbourne Airport, VIC": { lat: -37.669, lng: 144.841 },
};

/* --------------------------------------------------------------------------
   App
   -------------------------------------------------------------------------- */

var mapInstance = null;
var mapMarker = null;
var originMarker = null;
var travelingMascot = null;
var infoWindow = null;
var demoRouteLine = null;
var routeActive = false;
var mascotAnimationId = null;
var DROPOFF_PIN_URL = "";
var TRAVEL_PIN_URL = "";

document.addEventListener("DOMContentLoaded", function () {
  setCopyrightYear();
  updateLocationCopy();
  setupSmoothScroll();
  setupDirectionsControls();
  startDrNovoTypewriter();
  loadGoogleMaps();
});

function setCopyrightYear() {
  var yearEl = document.getElementById("copyright-year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }
}

/**
 * Types Dr. Novo's greeting one letter at a time on page load.
 * Skips animation when the user prefers reduced motion.
 */
function startDrNovoTypewriter() {
  var speechEl = document.getElementById("dr-novo-speech");
  if (!speechEl) {
    return;
  }

  var fullText =
    speechEl.getAttribute("data-typewriter") ||
    "Hi! I'm Dr. Novo. Let me help you find our Melbourne sample drop-off centre.";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    speechEl.textContent = fullText;
    speechEl.classList.add("dr-novo__speech--done");
    return;
  }

  var index = 0;
  var delayMs = 36;

  speechEl.textContent = "";
  speechEl.classList.add("dr-novo__speech--typing");

  function typeNext() {
    if (index >= fullText.length) {
      speechEl.classList.remove("dr-novo__speech--typing");
      speechEl.classList.add("dr-novo__speech--done");
      return;
    }

    speechEl.textContent += fullText.charAt(index);
    index += 1;
    window.setTimeout(typeNext, delayMs);
  }

  window.setTimeout(typeNext, 400);
}

function updateLocationCopy() {
  var nameEl = document.getElementById("drop-off-name");
  var addressEl = document.getElementById("drop-off-address");
  var noteEl = document.getElementById("map-preview-note");

  if (nameEl) {
    nameEl.textContent = DROP_OFF_NAME;
  }

  if (addressEl) {
    addressEl.textContent = DROP_OFF_ADDRESS
      ? DROP_OFF_ADDRESS
      : "Drop-off centre address to be confirmed.";
  }

  if (noteEl) {
    if (USING_TEMPORARY_PREVIEW_COORDS) {
      noteEl.hidden = false;
    } else {
      noteEl.hidden = true;
    }
  }
}

function setupSmoothScroll() {
  var links = document.querySelectorAll('a[href^="#"]');

  links.forEach(function (link) {
    link.addEventListener("click", function (event) {
      var targetId = link.getAttribute("href");
      if (!targetId || targetId === "#") {
        return;
      }

      var target = document.querySelector(targetId);
      if (!target) {
        return;
      }

      event.preventDefault();
      target.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    });
  });
}

function setupDirectionsControls() {
  var btn = document.getElementById("directions-btn");
  var clearBtn = document.getElementById("clear-route-btn");

  if (btn) {
    btn.addEventListener("click", function () {
      startDirectionsFlow();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      clearRoute();
    });
  }

  setupOriginDropdown();
}

function setupOriginDropdown() {
  var dropdown = document.getElementById("origin-dropdown");
  var toggle = document.getElementById("origin-dropdown-toggle");
  var menu = document.getElementById("origin-dropdown-menu");
  var hiddenInput = document.getElementById("directions-origin");
  var labelEl = document.getElementById("origin-dropdown-text");

  if (!dropdown || !toggle || !menu || !hiddenInput || !labelEl) {
    return;
  }

  var options = Array.prototype.slice.call(menu.querySelectorAll('[role="option"]'));

  function openMenu() {
    dropdown.classList.add("is-open");
    menu.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
  }

  function closeMenu() {
    dropdown.classList.remove("is-open");
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  }

  function selectOption(option) {
    options.forEach(function (item) {
      item.setAttribute("aria-selected", item === option ? "true" : "false");
    });
    hiddenInput.value = option.getAttribute("data-value") || "";
    labelEl.textContent = option.getAttribute("data-label") || option.textContent.trim();
    setDirectionsStatus("");
    closeMenu();
    toggle.focus();

    // Like Uber/Careem cars: show Novogene mascot on the map at the chosen start
    previewMascotAtOrigin(hiddenInput.value);
  }

  toggle.addEventListener("click", function () {
    if (menu.hidden) {
      openMenu();
    } else {
      closeMenu();
    }
  });

  options.forEach(function (option) {
    option.addEventListener("click", function () {
      selectOption(option);
    });

    option.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectOption(option);
      }
    });
  });

  toggle.addEventListener("keydown", function (event) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openMenu();
      var selected = menu.querySelector('[aria-selected="true"]') || options[0];
      if (selected) {
        selected.focus();
      }
    }
    if (event.key === "Escape") {
      closeMenu();
    }
  });

  document.addEventListener("click", function (event) {
    if (!dropdown.contains(event.target)) {
      closeMenu();
    }
  });
}

function setDirectionsStatus(message, isError) {
  var statusEl = document.getElementById("directions-status");
  if (!statusEl) {
    return;
  }

  if (!message) {
    statusEl.hidden = true;
    statusEl.textContent = "";
    return;
  }

  statusEl.hidden = false;
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#8a1f1f" : "var(--color-heading)";
}

function getDirectionsDestination() {
  return {
    lat: DROP_OFF_LAT,
    lng: DROP_OFF_LNG,
  };
}

function getMascotIcon(size) {
  var w = size || 40;
  var h = Math.round(w * 1.22);
  return {
    url: DROPOFF_PIN_URL || TRAVEL_PIN_URL,
    scaledSize: new google.maps.Size(w, h),
    anchor: new google.maps.Point(w / 2, h),
  };
}

/**
 * Uber/Careem-style: when user picks a start place, drop the Novogene mascot there.
 */
function previewMascotAtOrigin(originValue) {
  if (!mapInstance || typeof google === "undefined" || !google.maps) {
    return;
  }

  if (originValue === "__gps__") {
    if (!navigator.geolocation) {
      setDirectionsStatus("GPS is not supported in this browser.", true);
      return;
    }
    setDirectionsStatus("Finding your location for Dr. Novo…");
    navigator.geolocation.getCurrentPosition(
      function (position) {
        placeStartMascot(
          {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          "Dr. Novo is at your current location (like a Careem/Uber vehicle marker)."
        );
      },
      function () {
        setDirectionsStatus("Could not access GPS. Allow location permission or pick another start.", true);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
    return;
  }

  var coords = resolveOriginCoords(originValue);
  if (!coords) {
    return;
  }

  placeStartMascot(
    coords,
    "Dr. Novo is at your start point. Click Get Directions to send him to the drop-off."
  );
}

function placeStartMascot(coords, statusMessage) {
  stopMascotAnimation();

  if (demoRouteLine) {
    demoRouteLine.setMap(null);
    demoRouteLine = null;
  }

  if (!originMarker) {
    originMarker = new google.maps.Marker({
      map: mapInstance,
      title: "Dr. Novo — start",
      optimized: false,
      zIndex: 900,
    });
  }

  originMarker.setIcon(getMascotIcon(42));
  originMarker.setPosition(coords);
  originMarker.setMap(mapInstance);
  originMarker.setAnimation(google.maps.Animation.DROP);

  if (mapMarker) {
    mapMarker.setPosition(getDirectionsDestination());
    mapMarker.setIcon(getMascotIcon(36));
    mapMarker.setMap(mapInstance);
  }

  var bounds = new google.maps.LatLngBounds();
  bounds.extend(coords);
  bounds.extend(getDirectionsDestination());
  mapInstance.fitBounds(bounds);

  routeActive = false;
  var clearBtn = document.getElementById("clear-route-btn");
  if (clearBtn) {
    clearBtn.hidden = false;
  }

  if (statusMessage) {
    setDirectionsStatus(statusMessage);
  }
}

function getSelectedOrigin() {
  var originSelect = document.getElementById("directions-origin");
  return originSelect ? originSelect.value : "";
}

function startDirectionsFlow() {
  if (!mapInstance || typeof google === "undefined" || !google.maps) {
    setDirectionsStatus("Map is still loading. Please try again in a moment.", true);
    return;
  }

  var originValue = getSelectedOrigin();
  if (!originValue) {
    setDirectionsStatus("Choose a starting location from the dropdown.", true);
    return;
  }

  if (originValue === "__gps__") {
    setDirectionsStatus("Getting your current location…");
    if (!navigator.geolocation) {
      setDirectionsStatus("GPS is not supported in this browser. Choose another start point.", true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      function (position) {
        showRouteOnMap({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      function (error) {
        console.error("Geolocation failed:", error);
        setDirectionsStatus(
          "Could not access GPS. Allow location permission, use HTTPS, or pick another start point.",
          true
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
    return;
  }

  showRouteOnMap(originValue);
}

function resolveOriginCoords(origin) {
  if (origin && typeof origin.lat === "number" && typeof origin.lng === "number") {
    return origin;
  }
  if (typeof origin === "string" && SAMPLE_ORIGINS[origin]) {
    return SAMPLE_ORIGINS[origin];
  }
  return null;
}

/** Draw route on the JS map and animate Dr. Novo (OSRM / simple path). */
function showRouteOnMap(origin) {
  var start = resolveOriginCoords(origin);
  var end = getDirectionsDestination();

  if (!start) {
    setDirectionsStatus("Could not resolve that start point. Pick another option.", true);
    return;
  }

  setDirectionsStatus("Loading route…");

  var osrmUrl =
    "https://router.project-osrm.org/route/v1/driving/" +
    start.lng +
    "," +
    start.lat +
    ";" +
    end.lng +
    "," +
    end.lat +
    "?overview=full&geometries=geojson";

  fetch(osrmUrl)
    .then(function (response) {
      if (!response.ok) {
        throw new Error("OSRM HTTP " + response.status);
      }
      return response.json();
    })
    .then(function (data) {
      if (!data.routes || !data.routes[0]) {
        throw new Error("No route");
      }

      var coords = data.routes[0].geometry.coordinates;
      var path = coords.map(function (pair) {
        return new google.maps.LatLng(pair[1], pair[0]);
      });

      var distanceKm = (data.routes[0].distance / 1000).toFixed(1);
      var durationMin = Math.round(data.routes[0].duration / 60);

      applyRoute(start, end, path, distanceKm + " km", durationMin + " min");
    })
    .catch(function (error) {
      console.warn("Route service unavailable, using simple path:", error);
      var path = buildSimplePath(start, end);
      applyRoute(start, end, path, "route", "—");
    });
}

function buildSimplePath(start, end) {
  var path = [];
  var steps = 40;
  for (var i = 0; i <= steps; i += 1) {
    var t = i / steps;
    path.push(
      new google.maps.LatLng(
        start.lat + (end.lat - start.lat) * t,
        start.lng + (end.lng - start.lng) * t
      )
    );
  }
  return path;
}

function applyRoute(start, end, path, distanceText, durationText) {
  stopMascotAnimation();

  if (demoRouteLine) {
    demoRouteLine.setMap(null);
  }

  demoRouteLine = new google.maps.Polyline({
    path: path,
    geodesic: true,
    strokeColor: "#43B149",
    strokeOpacity: 0.95,
    strokeWeight: 5,
    map: mapInstance,
  });

  if (infoWindow) {
    infoWindow.close();
  }

  if (!originMarker) {
    originMarker = new google.maps.Marker({
      map: mapInstance,
      title: "Dr. Novo — start",
      optimized: false,
      zIndex: 900,
    });
  }
  originMarker.setIcon(getMascotIcon(34));
  originMarker.setPosition(start);
  originMarker.setMap(mapInstance);

  if (mapMarker) {
    mapMarker.setIcon(getMascotIcon(36));
    mapMarker.setPosition(end);
    mapMarker.setMap(mapInstance);
  }

  var bounds = new google.maps.LatLngBounds();
  path.forEach(function (point) {
    bounds.extend(point);
  });
  mapInstance.fitBounds(bounds);

  routeActive = true;
  startMascotTravel(path);

  var clearBtn = document.getElementById("clear-route-btn");
  if (clearBtn) {
    clearBtn.hidden = false;
  }

  setDirectionsStatus(
    "Route ready: " + distanceText + ", about " + durationText + ". Dr. Novo is moving to the drop-off."
  );
}

function startMascotTravel(path) {
  stopMascotAnimation();

  if (!path || path.length < 2) {
    return;
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  if (!travelingMascot) {
    travelingMascot = new google.maps.Marker({
      map: mapInstance,
      title: "Dr. Novo travelling",
      optimized: false,
      zIndex: 999,
    });
  }

  travelingMascot.setIcon(getMascotIcon(44));
  travelingMascot.setMap(mapInstance);
  travelingMascot.setPosition(path[0]);

  // Slow travel: ~20 seconds total, capped step count for smooth motion
  var animPath = path;
  var maxSteps = 80;
  if (path.length > maxSteps) {
    var skip = Math.ceil(path.length / maxSteps);
    animPath = [];
    for (var i = 0; i < path.length; i += skip) {
      animPath.push(path[i]);
    }
    if (animPath[animPath.length - 1] !== path[path.length - 1]) {
      animPath.push(path[path.length - 1]);
    }
  }

  var index = 0;
  var stepMs = Math.max(200, Math.floor(20000 / Math.max(animPath.length - 1, 1)));

  function tick() {
    index += 1;
    if (index >= animPath.length) {
      travelingMascot.setPosition(animPath[animPath.length - 1]);
      mascotAnimationId = null;
      setDirectionsStatus(
        "Dr. Novo arrived at the Melbourne drop-off centre."
      );
      return;
    }
    travelingMascot.setPosition(animPath[index]);
    mascotAnimationId = window.setTimeout(tick, stepMs);
  }

  mascotAnimationId = window.setTimeout(tick, stepMs);
}

function stopMascotAnimation() {
  if (mascotAnimationId) {
    window.clearTimeout(mascotAnimationId);
    mascotAnimationId = null;
  }
  if (travelingMascot) {
    travelingMascot.setMap(null);
  }
}

function clearRoute() {
  stopMascotAnimation();

  if (demoRouteLine) {
    demoRouteLine.setMap(null);
    demoRouteLine = null;
  }

  if (originMarker) {
    originMarker.setMap(null);
  }

  if (mapMarker) {
    mapMarker.setPosition({ lat: DROP_OFF_LAT, lng: DROP_OFF_LNG });
    mapMarker.setMap(mapInstance);
  }

  routeActive = false;

  var clearBtn = document.getElementById("clear-route-btn");
  if (clearBtn) {
    clearBtn.hidden = true;
  }

  setDirectionsStatus("");
  if (mapInstance) {
    mapInstance.setCenter({ lat: DROP_OFF_LAT, lng: DROP_OFF_LNG });
    mapInstance.setZoom(14);
  }
}

function loadGoogleMaps() {
  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_DEMO_API_KEY") {
    showMapError(
      "Add your Google Maps Demo API key to GOOGLE_MAPS_API_KEY in script.js, then refresh."
    );
    return;
  }

  // Expose the callback for the Maps script loader
  window.initMelbourneDropOffMap = initMelbourneDropOffMap;

  var script = document.createElement("script");
  script.src =
    "https://maps.googleapis.com/maps/api/js?key=" +
    encodeURIComponent(GOOGLE_MAPS_API_KEY) +
    "&callback=initMelbourneDropOffMap";
  script.async = true;
  script.defer = true;
  script.onerror = function () {
    showMapError(
      "Google Maps could not be loaded. Check your API key and network connection, then refresh the page."
    );
  };

  document.head.appendChild(script);
}

function initMelbourneDropOffMap() {
  var mapEl = document.getElementById("map");
  if (!mapEl || typeof google === "undefined" || !google.maps) {
    showMapError(
      "Google Maps could not be initialised. Check the browser console for details."
    );
    return;
  }

  try {
    var errorEl = document.getElementById("map-error");
    if (errorEl) {
      errorEl.hidden = true;
    }

    var centre = {
      lat: DROP_OFF_LAT,
      lng: DROP_OFF_LNG,
    };

    mapInstance = new google.maps.Map(mapEl, {
      center: centre,
      zoom: 14,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      gestureHandling: "cooperative",
    });

    DROPOFF_PIN_URL = new URL("assets/dr-novo-pin.svg", window.location.href).href;
    TRAVEL_PIN_URL = DROPOFF_PIN_URL;

    mapMarker = new google.maps.Marker({
      position: centre,
      map: mapInstance,
      title: DROP_OFF_NAME,
      animation: google.maps.Animation.DROP,
      icon: {
        url: DROPOFF_PIN_URL,
        scaledSize: new google.maps.Size(36, 44),
        anchor: new google.maps.Point(18, 44),
      },
      optimized: false,
    });

    var infoContent = buildInfoWindowContent();
    infoWindow = new google.maps.InfoWindow({
      content: infoContent,
    });

    mapMarker.addListener("click", function () {
      infoWindow.open({
        anchor: mapMarker,
        map: mapInstance,
      });
    });

    infoWindow.open({
      anchor: mapMarker,
      map: mapInstance,
    });

    window.addEventListener("resize", handleMapResize);
  } catch (error) {
    console.error("Map initialisation failed:", error);
    showMapError(
      "Google Maps could not be initialised. Check the browser console for details."
    );
  }
}

function buildInfoWindowContent() {
  var addressLine = DROP_OFF_ADDRESS
    ? escapeHtml(DROP_OFF_ADDRESS)
    : "Drop-off centre address to be confirmed.";

  var previewNote = USING_TEMPORARY_PREVIEW_COORDS
    ? '<p style="margin:0.5rem 0 0;font-size:12px;color:#003366;">Sample demo location — not a verified drop-off centre.</p>'
    : "";

  return (
    '<div style="max-width:220px;font-family:Figtree,Segoe UI,sans-serif;color:#243447;">' +
    "<strong>" +
    escapeHtml(DROP_OFF_NAME) +
    "</strong>" +
    '<p style="margin:0.4rem 0 0;font-size:13px;line-height:1.4;">' +
    addressLine +
    "</p>" +
    previewNote +
    "</div>"
  );
}

function handleMapResize() {
  if (!mapInstance) {
    return;
  }
  google.maps.event.trigger(mapInstance, "resize");
  if (!routeActive) {
    mapInstance.setCenter({
      lat: DROP_OFF_LAT,
      lng: DROP_OFF_LNG,
    });
  }
}

function showMapError(message) {
  var mapEl = document.getElementById("map");
  var errorEl = document.getElementById("map-error");

  if (mapEl) {
    mapEl.setAttribute("aria-hidden", "true");
  }

  if (errorEl) {
    errorEl.hidden = false;
    var paragraph = errorEl.querySelector("p");
    if (paragraph && message) {
      paragraph.textContent = message;
    }
  }

  console.error(message || "Google Maps failed to load.");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

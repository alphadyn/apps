const SEARCH_URL = "https://nominatim.openstreetmap.org/search";

export function setupLocationSearch(onSelect) {
  const form = document.getElementById("locationSearchForm");
  const input = document.getElementById("locationSearchInput");
  const submit = document.getElementById("locationSearchSubmit");
  const status = document.getElementById("locationSearchStatus");
  const resultsList = document.getElementById("locationSearchResults");
  const cache = new Map();
  let searching = false;
  let lastRequest = 0;

  function renderResults(results) {
    resultsList.replaceChildren();
    for (const result of results) {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "location-result";
      button.textContent = result.label;
      button.addEventListener("click", () => {
        onSelect(result);
        status.textContent = `Showing ${result.label}.`;
      });
      item.appendChild(button);
      resultsList.appendChild(item);
    }
    status.textContent = results.length
      ? `${results.length} location${results.length === 1 ? "" : "s"} found. Choose a result to explore.`
      : "No locations found. Try a city, address, or landmark with its country.";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (searching) return;
    const query = input.value.trim();
    if (!query) {
      status.textContent = "Enter a location to search.";
      input.focus();
      return;
    }
    const cacheKey = query.toLocaleLowerCase();
    if (cache.has(cacheKey)) {
      renderResults(cache.get(cacheKey));
      return;
    }
    searching = true;
    submit.disabled = true;
    form.setAttribute("aria-busy", "true");
    resultsList.replaceChildren();
    status.textContent = "Searching locations...";
    try {
      // Nominatim permits submitted searches, not per-keystroke autocomplete.
      const delay = Math.max(0, 1100 - (Date.now() - lastRequest));
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      lastRequest = Date.now();
      const url = new URL(SEARCH_URL);
      url.search = new URLSearchParams({ format: "jsonv2", q: query, limit: "5" }).toString();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      let data;
      try {
        const response = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Location search returned HTTP ${response.status}.`);
        data = await response.json();
      } finally {
        clearTimeout(timeout);
      }
      if (!Array.isArray(data)) throw new Error("Location search returned an invalid response.");
      const results = data.map((entry) => {
        const lat = Number(entry?.lat);
        const lon = Number(entry?.lon);
        if (!entry || typeof entry.display_name !== "string" ||
            typeof entry.lat !== "string" || typeof entry.lon !== "string" ||
            !entry.lat.trim() || !entry.lon.trim() ||
            !Number.isFinite(lat) || !Number.isFinite(lon) ||
            Math.abs(lat) > 90 || Math.abs(lon) > 180) {
          throw new Error("Location search returned invalid coordinates.");
        }
        let bounds = null;
        if (Array.isArray(entry.boundingbox) && entry.boundingbox.length === 4) {
          const values = entry.boundingbox.map(Number);
          const [south, north, west, east] = values;
          if (values.every(Number.isFinite) && south >= -90 && north <= 90 &&
              south <= north && west >= -180 && east <= 180 && west <= east) {
            bounds = { south, north, west, east };
          }
        }
        return { lat, lon, label: entry.display_name, bounds };
      });
      if (cache.size >= 30) cache.delete(cache.keys().next().value);
      cache.set(cacheKey, results);
      renderResults(results);
    } catch (error) {
      console.error("Location search failed:", error);
      status.textContent = "Location search is unavailable. Check your connection and try again.";
    } finally {
      searching = false;
      submit.disabled = false;
      form.removeAttribute("aria-busy");
    }
  });
}

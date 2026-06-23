import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";

const PRIMARY = "#14b8a6";
const DARK = "#050810";
const J_K_CENTER = { lat: 34.0837, lng: 74.7973 };
const J_K_BOUNDS = {
  north: 35.15,
  south: 32.25,
  east: 76.95,
  west: 73.35,
};

const isInsideJammuKashmir = (location) => {
  if (!location) return false;
  const lat = Number(location.lat);
  const lng = Number(location.lng);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= J_K_BOUNDS.south &&
    lat <= J_K_BOUNDS.north &&
    lng >= J_K_BOUNDS.west &&
    lng <= J_K_BOUNDS.east
  );
};

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const buildMapHtml = ({ initialLocation, markers }) => {
  const center = isInsideJammuKashmir(initialLocation)
    ? initialLocation
    : J_K_CENTER;
  const tutorMarkers = markers
    .filter((marker) =>
      isInsideJammuKashmir({ lat: marker.lat, lng: marker.lng }),
    )
    .map((marker) => ({
      lat: Number(marker.lat),
      lng: Number(marker.lng),
      label: escapeHtml(marker.name || marker.label || "Verified tutor"),
    }));

  return `
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
          html,body,#map{height:100%;margin:0;background:#dce7e7}
          .leaflet-control-attribution{font-size:8px}
          .pin{width:22px;height:22px;border-radius:22px 22px 22px 4px;background:#14b8a6;border:3px solid white;transform:rotate(-45deg);box-shadow:0 8px 18px rgba(15,23,42,.35)}
          .tutor{width:30px;height:30px;border-radius:15px;background:#050810;color:white;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font:900 11px system-ui;box-shadow:0 8px 18px rgba(15,23,42,.28)}
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
          const map = L.map("map", { zoomControl: false, attributionControl: true })
            .setView([${center.lat}, ${center.lng}], ${initialLocation ? 14 : 7});
          L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 18,
            attribution: "© OpenStreetMap"
          }).addTo(map);
          const bounds = L.latLngBounds(
            [${J_K_BOUNDS.south}, ${J_K_BOUNDS.west}],
            [${J_K_BOUNDS.north}, ${J_K_BOUNDS.east}]
          );
          map.setMaxBounds(bounds.pad(.15));
          let selectedMarker = null;
          const pinIcon = L.divIcon({ className: "", html: '<div class="pin"></div>', iconSize:[28,38], iconAnchor:[14,34] });
          const tutorIcon = (label) => L.divIcon({
            className: "",
            html: '<div class="tutor">' + label.charAt(0).toUpperCase() + '</div>',
            iconSize:[32,32],
            iconAnchor:[16,16]
          });
          const setSelection = (lat, lng, zoom = true) => {
            if (selectedMarker) selectedMarker.remove();
            selectedMarker = L.marker([lat,lng], { icon: pinIcon }).addTo(map);
            if (zoom) map.flyTo([lat,lng], Math.max(map.getZoom(), 14), { duration:.65 });
          };
          ${initialLocation ? `setSelection(${center.lat}, ${center.lng}, false);` : ""}
          ${JSON.stringify(tutorMarkers)}.forEach((marker) => {
            L.marker([marker.lat,marker.lng], { icon: tutorIcon(marker.label) })
              .addTo(map)
              .bindPopup('<strong>' + marker.label + '</strong><br/>Verified tutor');
          });
          map.on("click", ({ latlng }) => {
            setSelection(latlng.lat, latlng.lng, false);
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type:"mapPress", lat:latlng.lat, lng:latlng.lng
            }));
          });
          const send = (payload) => window.ReactNativeWebView.postMessage(JSON.stringify(payload));
          const formatAddress = (result, fallback = "") => {
            const address = result && result.address ? result.address : {};
            const parts = [
              address.road || address.hamlet,
              address.neighbourhood || address.suburb || address.village || address.town || address.city,
              address.state_district || address.county,
              address.state,
              address.postcode
            ].filter(Boolean);
            return [...new Set(parts)].join(", ") || result.display_name || fallback;
          };
          const searchAddress = async (query) => {
            try {
              const params = new URLSearchParams({
                format:"jsonv2",
                addressdetails:"1",
                countrycodes:"in",
                bounded:"1",
                limit:"5",
                viewbox:"${J_K_BOUNDS.west},${J_K_BOUNDS.north},${J_K_BOUNDS.east},${J_K_BOUNDS.south}",
                q:query + ", Jammu and Kashmir, India"
              });
              const response = await fetch("https://nominatim.openstreetmap.org/search?" + params, {
                headers:{ Accept:"application/json" }
              });
              if (!response.ok) throw new Error("HTTP " + response.status);
              const data = await response.json();
              send({
                type:"searchResults",
                results:data.map((result) => ({
                  lat:Number(result.lat),
                  lng:Number(result.lon),
                  label:formatAddress(result, query),
                  type:result.type || result.addresstype || "place"
                }))
              });
            } catch (error) {
              send({ type:"geocodeError", mode:"search", message:String(error.message || error) });
            }
          };
          const reverseAddress = async (lat, lng) => {
            try {
              const params = new URLSearchParams({
                format:"jsonv2",
                addressdetails:"1",
                zoom:"18",
                lat:String(lat),
                lon:String(lng)
              });
              const response = await fetch("https://nominatim.openstreetmap.org/reverse?" + params, {
                headers:{ Accept:"application/json" }
              });
              if (!response.ok) throw new Error("HTTP " + response.status);
              const result = await response.json();
              send({ type:"reverseResult", lat, lng, label:formatAddress(result) });
            } catch (error) {
              send({ type:"geocodeError", mode:"reverse", message:String(error.message || error) });
            }
          };
          const handleNativeMessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data.type === "setLocation") setSelection(data.lat, data.lng, true);
              if (data.type === "searchAddress") searchAddress(data.query);
              if (data.type === "reverseAddress") reverseAddress(data.lat, data.lng);
            } catch (_) {}
          };
          document.addEventListener("message", (event) => {
            handleNativeMessage(event);
          });
          window.addEventListener("message", (event) => {
            handleNativeMessage(event);
          });
        </script>
      </body>
    </html>
  `;
};

export default function LocationMapPicker({
  value,
  locationName = "",
  onConfirm,
  markers = [],
  radius = 5,
  onRadiusChange,
  title = "Choose an exact location",
  subtitle = "Search a locality or tap the map, then confirm the pin.",
  confirmLabel = "Use this location",
  dark = false,
}) {
  const webViewRef = useRef(null);
  const [query, setQuery] = useState(locationName);
  const [results, setResults] = useState([]);
  const [pendingLocation, setPendingLocation] = useState(null);
  const [pendingName, setPendingName] = useState("");
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState("");

  const mapHtml = useMemo(
    () => buildMapHtml({ initialLocation: value, markers }),
    [markers, value],
  );

  const focusMap = (location) => {
    webViewRef.current?.postMessage(
      JSON.stringify({ type: "setLocation", ...location }),
    );
  };

  const previewLocation = (location, label = "") => {
    if (!isInsideJammuKashmir(location)) {
      setError("Please choose a location inside Jammu & Kashmir.");
      return;
    }

    setError("");
    setPendingLocation(location);
    focusMap(location);

    if (label) {
      setPendingName(label);
      setQuery(label);
      return;
    }

    setResolving(true);
    setPendingName("");
    webViewRef.current?.postMessage(
      JSON.stringify({ type: "reverseAddress", ...location }),
    );
  };

  const handleSearch = () => {
    const searchQuery = query.trim();
    if (!searchQuery) {
      setError("Enter a locality, road, landmark, or postcode.");
      return;
    }

    setSearching(true);
    setError("");
    webViewRef.current?.postMessage(
      JSON.stringify({ type: "searchAddress", query: searchQuery }),
    );
  };

  const handleMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === "mapPress") {
        setResults([]);
        previewLocation({ lat: message.lat, lng: message.lng });
      }
      if (message.type === "searchResults") {
        const matches = (message.results || []).filter(isInsideJammuKashmir);
        setSearching(false);
        setResults(matches);
        if (!matches.length) {
          setError("No matching place found in Jammu & Kashmir.");
        } else if (matches.length === 1) {
          previewLocation(matches[0], matches[0].label);
          setResults([]);
        }
      }
      if (message.type === "reverseResult") {
        setResolving(false);
        if (!message.label) {
          setError("Could not identify that address. Try a nearby road or landmark.");
          return;
        }
        setPendingName(message.label);
        setQuery(message.label);
      }
      if (message.type === "geocodeError") {
        setSearching(false);
        setResolving(false);
        setError(
          message.mode === "search"
            ? "Address search could not connect. Please retry in a moment."
            : "Could not identify that address. Try a nearby road or landmark.",
        );
      }
    } catch (_error) {
      setError("Could not read the selected map point.");
    }
  };

  const confirmSelection = () => {
    if (!pendingLocation || !pendingName) return;
    onConfirm?.(pendingLocation, pendingName);
    setPendingLocation(null);
    setResults([]);
  };

  const currentName = pendingName || locationName;
  const hasConfirmedLocation = Boolean(value && locationName && !pendingLocation);

  return (
    <View style={[styles.card, dark && styles.cardDark]}>
      <View style={styles.heading}>
        <View style={styles.headingIcon}>
          <Ionicons name="navigate-outline" size={20} color="#fff" />
        </View>
        <View style={styles.headingCopy}>
          <Text style={[styles.title, dark && styles.titleDark]}>{title}</Text>
          <Text style={[styles.subtitle, dark && styles.subtitleDark]}>
            {subtitle}
          </Text>
        </View>
        {hasConfirmedLocation && (
          <View style={styles.confirmedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#047857" />
            <Text style={styles.confirmedText}>Added</Text>
          </View>
        )}
      </View>

      <View style={[styles.searchShell, dark && styles.searchShellDark]}>
        <Ionicons name="search-outline" size={19} color="#64748b" />
        <TextInput
          style={[styles.searchInput, dark && styles.searchInputDark]}
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            setResults([]);
            setError("");
          }}
          placeholder="Rajbagh, Gandhi Nagar, Hazratbal..."
          placeholderTextColor="#94a3b8"
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
          disabled={searching}
          activeOpacity={0.86}
        >
          {searching ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="arrow-forward" size={19} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {!!results.length && (
        <View style={[styles.results, dark && styles.resultsDark]}>
          {results.map((result, index) => (
            <TouchableOpacity
              key={`${result.lat}-${result.lng}`}
              style={[
                styles.resultRow,
                index < results.length - 1 && styles.resultBorder,
              ]}
              onPress={() => {
                previewLocation(result, result.label);
                setResults([]);
              }}
              activeOpacity={0.82}
            >
              <View style={styles.resultIcon}>
                <Ionicons name="location" size={16} color={PRIMARY} />
              </View>
              <View style={styles.resultCopy}>
                <Text style={[styles.resultTitle, dark && styles.resultTitleDark]}>
                  {result.label}
                </Text>
                <Text style={styles.resultType}>
                  {index === 0 ? "Best match · " : ""}
                  {result.type.replaceAll("_", " ")}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.mapFrame}>
        <WebView
          ref={webViewRef}
          source={{ html: mapHtml }}
          style={styles.map}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={["*"]}
          scrollEnabled={false}
          nestedScrollEnabled={false}
        />
        <View pointerEvents="none" style={styles.mapPill}>
          <Ionicons name="map-outline" size={13} color="#fff" />
          <Text style={styles.mapPillText}>Jammu & Kashmir</Text>
        </View>
        {(resolving || searching) && (
          <View style={styles.mapLoading}>
            <ActivityIndicator color={PRIMARY} />
            <Text style={styles.mapLoadingText}>
              {searching ? "Searching places..." : "Finding exact address..."}
            </Text>
          </View>
        )}
      </View>

      {pendingLocation && (
        <View style={styles.pendingCard}>
          <View style={styles.pendingIcon}>
            <Ionicons name="location" size={21} color="#fff" />
          </View>
          <View style={styles.pendingCopy}>
            <Text style={styles.pendingEyebrow}>LOCATION FOUND</Text>
            <Text style={styles.pendingTitle}>
              {currentName || "Finding exact address..."}
            </Text>
            <Text style={styles.pendingHint}>
              Check the pin and address before adding it.
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              !pendingName && styles.confirmButtonDisabled,
            ]}
            onPress={confirmSelection}
            disabled={!pendingName}
            activeOpacity={0.86}
          >
            <Ionicons name="checkmark" size={18} color="#fff" />
            <Text style={styles.confirmButtonText}>{confirmLabel}</Text>
          </TouchableOpacity>
        </View>
      )}

      {hasConfirmedLocation && (
        <View style={styles.savedCard}>
          <Ionicons name="checkmark-circle" size={22} color="#047857" />
          <View style={styles.savedCopy}>
            <Text style={styles.savedLabel}>Confirmed location</Text>
            <Text style={styles.savedName}>{locationName}</Text>
          </View>
        </View>
      )}

      {!!error && (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={17} color="#b91c1c" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {typeof radius === "number" && onRadiusChange && (
        <View style={[styles.radiusCard, dark && styles.radiusCardDark]}>
          <View>
            <Text style={[styles.radiusValue, dark && styles.titleDark]}>
              {radius} km
            </Text>
            <Text style={styles.radiusLabel}>Search / travel radius</Text>
          </View>
          <View style={styles.radiusControls}>
            <TouchableOpacity
              style={styles.radiusButton}
              onPress={() => onRadiusChange(Math.max(1, radius - 1))}
            >
              <Ionicons name="remove" size={19} color="#0f172a" />
            </TouchableOpacity>
            <View style={styles.radiusTrack}>
              <View
                style={[
                  styles.radiusFill,
                  { width: `${Math.max(5, (radius / 15) * 100)}%` },
                ]}
              />
            </View>
            <TouchableOpacity
              style={styles.radiusButton}
              onPress={() => onRadiusChange(Math.min(15, radius + 1))}
            >
              <Ionicons name="add" size={19} color="#0f172a" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#dbe4ee",
    backgroundColor: "#fff",
    padding: 14,
    gap: 13,
    shadowColor: "#020617",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 7,
  },
  cardDark: {
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.055)",
  },
  heading: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  headingIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY,
  },
  headingCopy: { flex: 1 },
  title: { color: "#020617", fontSize: 17, fontWeight: "900" },
  titleDark: { color: "#fff" },
  subtitle: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 3,
  },
  subtitleDark: { color: "rgba(255,255,255,0.5)" },
  confirmedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 99,
    backgroundColor: "#d1fae5",
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  confirmedText: { color: "#047857", fontSize: 10, fontWeight: "900" },
  searchShell: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#dbe4ee",
    backgroundColor: "#f8fafc",
    paddingLeft: 14,
    paddingRight: 6,
  },
  searchShellDark: {
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  searchInput: {
    flex: 1,
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "800",
    paddingVertical: 12,
  },
  searchInputDark: { color: "#fff" },
  searchButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DARK,
  },
  results: {
    overflow: "hidden",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  resultsDark: {
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#0f172a",
  },
  resultRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  resultBorder: { borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  resultIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0fdfa",
  },
  resultCopy: { flex: 1 },
  resultTitle: {
    color: "#0f172a",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900",
  },
  resultTitleDark: { color: "#fff" },
  resultType: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "capitalize",
    marginTop: 2,
  },
  mapFrame: {
    height: 300,
    overflow: "hidden",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#dce7e7",
  },
  map: { flex: 1, backgroundColor: "#dce7e7" },
  mapPill: {
    position: "absolute",
    top: 11,
    right: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 99,
    backgroundColor: "rgba(5,8,16,.85)",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  mapPillText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  mapLoading: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,.94)",
  },
  mapLoadingText: { color: "#334155", fontSize: 11, fontWeight: "900" },
  pendingCard: {
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#99f6e4",
    backgroundColor: "#f0fdfa",
    padding: 13,
    gap: 11,
  },
  pendingIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY,
  },
  pendingCopy: { gap: 3 },
  pendingEyebrow: {
    color: "#0f766e",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  pendingTitle: {
    color: "#0f172a",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "900",
  },
  pendingHint: { color: "#64748b", fontSize: 11, fontWeight: "700" },
  confirmButton: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 14,
    backgroundColor: "#0f766e",
  },
  confirmButtonDisabled: { opacity: 0.45 },
  confirmButtonText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  savedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#a7f3d0",
    backgroundColor: "#ecfdf5",
    padding: 12,
  },
  savedCopy: { flex: 1 },
  savedLabel: {
    color: "#047857",
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  savedName: {
    color: "#064e3b",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900",
    marginTop: 2,
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
    padding: 11,
  },
  errorText: {
    flex: 1,
    color: "#b91c1c",
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "800",
  },
  radiusCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    padding: 13,
    gap: 10,
  },
  radiusCardDark: {
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  radiusValue: { color: "#0f172a", fontSize: 18, fontWeight: "900" },
  radiusLabel: { color: "#64748b", fontSize: 10, fontWeight: "800" },
  radiusControls: { flexDirection: "row", alignItems: "center", gap: 10 },
  radiusButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dbe4ee",
  },
  radiusTrack: {
    flex: 1,
    height: 7,
    overflow: "hidden",
    borderRadius: 99,
    backgroundColor: "#cbd5e1",
  },
  radiusFill: { height: "100%", borderRadius: 99, backgroundColor: PRIMARY },
});

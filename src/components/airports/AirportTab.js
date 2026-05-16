import {
  Box,
  Card,
  Collapse,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useRef, useState } from "react";
import { airportsActions } from "../../store/airports";
import {
  bearingDeg,
  detectTheater,
  distanceNm,
  etaMinutes,
  msToKnots,
  mToFt,
} from "../../utils/airportCalculations";
import AIRPORT_DATA from "../../utils/airportData";

const { ipcRenderer } = window.require("electron");

const COALITION_CYCLE = { neutral: "blue", blue: "red", red: "neutral" };
const COALITION_COLORS = { blue: "#1565c0", red: "#b71c1c", neutral: "#616161" };
const COALITION_LABELS = { blue: "BLUEFOR", red: "REDFOR", neutral: "Neutral" };
const FILTER_LABELS = { all: "All", blue: "BLUEFOR", red: "REDFOR", neutral: "Neutral" };

const fmt = (val, digits = 0) =>
  val != null ? Number(val).toFixed(digits) : "---";

const FlightDataCell = ({ label, value }) => (
  <Box sx={{ flex: 1, textAlign: "center", px: 0.5 }}>
    <Typography
      display="block"
      variant="caption"
      color="text.secondary"
      sx={{ fontSize: "0.6rem", lineHeight: 1.2, userSelect: "none" }}
    >
      {label}
    </Typography>
    <Typography
      display="block"
      variant="caption"
      sx={{ fontSize: "0.75rem", fontWeight: 600, lineHeight: 1.3 }}
    >
      {value}
    </Typography>
  </Box>
);

const FlightDataRow = ({ left, right }) => (
  <Box sx={{ display: "flex", py: 0.3 }}>
    <FlightDataCell {...left} />
    <Box sx={{ borderLeft: "1px solid", borderColor: "divider" }} />
    <FlightDataCell {...right} />
  </Box>
);

const CoalitionDot = ({ coalition, onClick }) => (
  <Tooltip title={`${COALITION_LABELS[coalition]} — click to change`} enterDelay={400}>
    <Box
      onClick={onClick}
      sx={{
        width: 18,
        height: 18,
        borderRadius: "50%",
        bgcolor: COALITION_COLORS[coalition],
        border: "2px solid",
        borderColor: `${COALITION_COLORS[coalition]}99`,
        boxShadow: `0 0 0 1px ${COALITION_COLORS[coalition]}44`,
        cursor: "pointer",
        flexShrink: 0,
        mr: 1,
        "&:hover": { opacity: 0.8, transform: "scale(1.15)" },
        "&:active": { transform: "scale(0.95)" },
        transition: "transform 0.1s, opacity 0.1s",
      }}
    />
  </Tooltip>
);

const AirportTab = () => {
  const dispatch = useDispatch();
  const { lat, long, aircraftLat, aircraftLong, elev, trueHdg, magHdg, baroAlt, ias, tas } = useSelector(
    (state) => state.dcsPoint,
  );
  const rawLat = aircraftLat ?? lat;
  const rawLong = aircraftLong ?? long;

  // Ignore position jumps > 0.5nm between 100ms updates — filters F10 camera pans.
  // At Mach 2 an aircraft moves ~0.04nm per update, so 0.5nm is safe headroom.
  const [posLat, setPosLat] = useState(null);
  const [posLong, setPosLong] = useState(null);
  const prevRaw = useRef({ lat: null, long: null });
  useEffect(() => {
    if (rawLat == null || rawLong == null) return;
    const prev = prevRaw.current;
    if (prev.lat == null) {
      prevRaw.current = { lat: rawLat, long: rawLong };
      setPosLat(rawLat);
      setPosLong(rawLong);
      return;
    }
    const delta = distanceNm(prev.lat, prev.long, rawLat, rawLong);
    prevRaw.current = { lat: rawLat, long: rawLong };
    if (delta < 0.5) {
      setPosLat(rawLat);
      setPosLong(rawLong);
    }
  }, [rawLat, rawLong]);
  const { coalitions, selectedAirport } = useSelector((state) => state.airports);
  const [coalitionFilter, setCoalitionFilter] = useState("all");

  const theater = detectTheater(posLat, posLong);
  const airports = theater ? AIRPORT_DATA[theater] ?? [] : [];

  const speedKts = tas != null ? msToKnots(tas) : null;
  const iaKts = ias != null ? msToKnots(ias) : null;
  const baroFt = baroAlt != null ? mToFt(baroAlt) : null;
  const aglFt =
    baroAlt != null && elev != null ? mToFt(baroAlt - Number(elev)) : null;

  const theaterCoalitions = coalitions[theater] ?? {};

  const enriched = airports
    .map((ap) => ({
      ...ap,
      coalition: theaterCoalitions[ap.name] ?? "neutral",
      dist:
        posLat != null && posLong != null
          ? distanceNm(posLat, posLong, ap.lat, ap.lng)
          : null,
      brng:
        posLat != null && posLong != null
          ? bearingDeg(posLat, posLong, ap.lat, ap.lng)
          : null,
    }))
    .sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity));

  const filtered = coalitionFilter === "all"
    ? enriched
    : enriched.filter((ap) => ap.coalition === coalitionFilter);

  const handleCoalitionClick = (e, ap) => {
    e.stopPropagation();
    const next = COALITION_CYCLE[ap.coalition];
    dispatch(airportsActions.setCoalition({ theater, name: ap.name, coalition: next }));
    const updated = { ...theaterCoalitions, [ap.name]: next };
    ipcRenderer.send("saveAirportCoalitions", {
      ...coalitions,
      [theater]: updated,
    });
  };

  const handleClearCoalitions = () => {
    if (!theater) return;
    dispatch(airportsActions.clearCoalitions({ theater, coalition: coalitionFilter }));
    const updatedTheater = coalitionFilter === "all"
      ? {}
      : Object.fromEntries(Object.entries(theaterCoalitions).filter(([, c]) => c !== coalitionFilter));
    ipcRenderer.send("saveAirportCoalitions", { ...coalitions, [theater]: updatedTheater });
  };

  const handleSelect = (ap) => {
    dispatch(
      airportsActions.setSelectedAirport(
        selectedAirport === ap.name ? null : ap.name,
      ),
    );
  };

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", px: 1 }}>
      {/* Flight data panel */}
      <Card sx={{ borderRadius: "8px", pt: 0.5, pb: 0.25, mb: 1, flexShrink: 0 }}>
        <FlightDataRow
          left={{ label: "MAG HDG", value: magHdg != null ? `${fmt(magHdg)}°` : "---" }}
          right={{ label: "TRUE HDG", value: trueHdg != null ? `${fmt(trueHdg)}°` : "---" }}
        />
        <Divider />
        <FlightDataRow
          left={{ label: "BARO ALT", value: baroFt != null ? `${Math.round(baroFt).toLocaleString()} ft` : "---" }}
          right={{ label: "AGL", value: aglFt != null ? `${Math.round(Math.max(0, aglFt)).toLocaleString()} ft` : "---" }}
        />
        <Divider />
        <FlightDataRow
          left={{ label: "IAS", value: iaKts != null ? `${Math.round(iaKts)} kt` : "---" }}
          right={{ label: "TAS", value: speedKts != null ? `${Math.round(speedKts)} kt` : "---" }}
        />
      </Card>

      {/* Theater label */}
      <Typography
        variant="caption"
        color={theater ? "text.secondary" : "error"}
        sx={{ px: 0.5, mb: 0.5, flexShrink: 0 }}
      >
        {theater ? `Map: ${theater}` : "Map: not detected (fly to detect)"}
      </Typography>

      {/* Coalition filter + clear */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.75, flexShrink: 0 }}>
        <ToggleButtonGroup
          value={coalitionFilter}
          exclusive
          onChange={(_, val) => { if (val) setCoalitionFilter(val); }}
          size="small"
          sx={{ flex: 1, "& .MuiToggleButton-root": { flex: 1, py: 0.25, fontSize: "0.6rem", textTransform: "none" } }}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="blue" sx={{ "&.Mui-selected": { color: COALITION_COLORS.blue, borderColor: COALITION_COLORS.blue, bgcolor: `${COALITION_COLORS.blue}18` } }}>BLUEFOR</ToggleButton>
          <ToggleButton value="red" sx={{ "&.Mui-selected": { color: COALITION_COLORS.red, borderColor: COALITION_COLORS.red, bgcolor: `${COALITION_COLORS.red}18` } }}>REDFOR</ToggleButton>
          <ToggleButton value="neutral" sx={{ "&.Mui-selected": { color: COALITION_COLORS.neutral, borderColor: COALITION_COLORS.neutral, bgcolor: `${COALITION_COLORS.neutral}18` } }}>Neutral</ToggleButton>
        </ToggleButtonGroup>
        <Tooltip title={`Clear ${FILTER_LABELS[coalitionFilter]} assignments`} enterDelay={400}>
          <span>
            <IconButton
              size="small"
              onClick={handleClearCoalitions}
              disabled={!theater}
              sx={{ border: "1px solid", borderColor: "divider", borderRadius: "4px", p: 0.5 }}
            >
              <DeleteOutlineIcon sx={{ fontSize: "1rem" }} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Airport list */}
      <Card sx={{ borderRadius: "8px", flex: 1, overflow: "hidden" }}>
        {airports.length === 0 ? (
          <Box
            sx={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography variant="overline" color="grey" sx={{ userSelect: "none" }}>
              {theater ? "No airports for this map" : "No map detected"}
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding sx={{ maxHeight: "100%", overflow: "auto" }}>
            {filtered.map((ap, i) => {
              const isSelected = selectedAirport === ap.name;
              const apEta = ap.dist != null && speedKts ? etaMinutes(ap.dist, speedKts) : null;
              return (
                <Box key={ap.name}>
                  {i > 0 && <Divider />}
                  <ListItemButton
                    selected={isSelected}
                    onClick={() => handleSelect(ap)}
                    sx={{ py: 0.4, px: 1 }}
                  >
                    <CoalitionDot
                      coalition={ap.coalition}
                      onClick={(e) => handleCoalitionClick(e, ap)}
                    />
                    <Typography variant="caption" sx={{ flex: 1, fontSize: "0.7rem" }}>
                      {ap.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: "0.65rem", whiteSpace: "nowrap" }}
                    >
                      {ap.dist != null ? `${fmt(ap.dist, 1)}nm` : "---"}
                      {ap.brng != null ? ` ${fmt(ap.brng)}°T` : ""}
                    </Typography>
                  </ListItemButton>
                  <Collapse in={isSelected} unmountOnExit>
                    <Box sx={{ px: 2, py: 0.75, bgcolor: "action.selected", display: "flex", gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography display="block" variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem" }}>DISTANCE</Typography>
                        <Typography display="block" variant="caption" sx={{ fontWeight: 600 }}>{ap.dist != null ? `${fmt(ap.dist, 1)} nm` : "---"}</Typography>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography display="block" variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem" }}>BEARING</Typography>
                        <Typography display="block" variant="caption" sx={{ fontWeight: 600 }}>{ap.brng != null ? `${fmt(ap.brng)}°T` : "---"}</Typography>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography display="block" variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem" }}>ETA</Typography>
                        <Typography display="block" variant="caption" sx={{ fontWeight: 600 }}>
                          {apEta != null ? (apEta < 1 ? "<1 min" : `~${Math.round(apEta)} min`) : speedKts ? "---" : "no speed"}
                        </Typography>
                      </Box>
                    </Box>
                    <Divider />
                  </Collapse>
                </Box>
              );
            })}
          </List>
        )}
      </Card>
    </Box>
  );
};

export default AirportTab;

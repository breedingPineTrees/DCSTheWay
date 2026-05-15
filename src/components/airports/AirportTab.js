import {
  Box,
  Card,
  Divider,
  List,
  ListItemButton,
  Tooltip,
  Typography,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
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
const COALITION_LABELS = { blue: "Friendly", red: "Hostile", neutral: "Neutral" };

const fmt = (val, digits = 0) =>
  val != null ? Number(val).toFixed(digits) : "---";

const FlightDataRow = ({ label, left, right }) => (
  <Box sx={{ display: "flex", justifyContent: "space-between", px: 1, py: 0.1 }}>
    <Typography variant="caption" color="text.secondary" sx={{ width: 32 }}>
      {label}
    </Typography>
    <Typography variant="caption" sx={{ flex: 1 }}>
      {left}
    </Typography>
    <Typography variant="caption" sx={{ flex: 1, textAlign: "right" }}>
      {right}
    </Typography>
  </Box>
);

const CoalitionDot = ({ coalition, onClick }) => (
  <Tooltip title={`${COALITION_LABELS[coalition]} — click to change`} enterDelay={400}>
    <Box
      onClick={onClick}
      sx={{
        width: 10,
        height: 10,
        borderRadius: "50%",
        bgcolor: COALITION_COLORS[coalition],
        cursor: "pointer",
        flexShrink: 0,
        mr: 1,
        "&:hover": { opacity: 0.75 },
      }}
    />
  </Tooltip>
);

const AirportTab = () => {
  const dispatch = useDispatch();
  const { lat, long, elev, trueHdg, magHdg, baroAlt, ias, tas } = useSelector(
    (state) => state.dcsPoint,
  );
  const { coalitions, selectedAirport } = useSelector((state) => state.airports);

  const theater = detectTheater(lat, long);
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
        lat != null && long != null
          ? distanceNm(lat, long, ap.lat, ap.lng)
          : null,
      brng:
        lat != null && long != null
          ? bearingDeg(lat, long, ap.lat, ap.lng)
          : null,
    }))
    .sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity));

  const selected = enriched.find((ap) => ap.name === selectedAirport);
  const eta =
    selected?.dist != null && speedKts
      ? etaMinutes(selected.dist, speedKts)
      : null;

  const handleCoalitionClick = (e, ap) => {
    e.stopPropagation();
    const next = COALITION_CYCLE[ap.coalition];
    dispatch(
      airportsActions.setCoalition({ theater, name: ap.name, coalition: next }),
    );
    const updated = { ...theaterCoalitions, [ap.name]: next };
    ipcRenderer.send("saveAirportCoalitions", {
      ...coalitions,
      [theater]: updated,
    });
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
      <Card sx={{ borderRadius: "8px", py: 0.5, mb: 1, flexShrink: 0 }}>
        <FlightDataRow
          label="HDG"
          left={magHdg != null ? `${fmt(magHdg)}°M` : "---"}
          right={trueHdg != null ? `${fmt(trueHdg)}°T` : "---"}
        />
        <FlightDataRow
          label="ALT"
          left={baroFt != null ? `${Math.round(baroFt).toLocaleString()}ft` : "---"}
          right={aglFt != null ? `${Math.round(Math.max(0, aglFt)).toLocaleString()}ft AGL` : "---"}
        />
        <FlightDataRow
          label="SPD"
          left={iaKts != null ? `${Math.round(iaKts)}kt IAS` : "---"}
          right={speedKts != null ? `${Math.round(speedKts)}kt TAS` : "---"}
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

      {/* Selected airport ETA */}
      {selected && (
        <Card sx={{ borderRadius: "8px", py: 0.5, px: 1, mb: 1, flexShrink: 0 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="caption" color="primary">
              <b>{selected.name}</b>
            </Typography>
            <Typography variant="caption">
              {selected.dist != null ? `${fmt(selected.dist, 1)}nm` : "---"}
              {" · "}
              {selected.brng != null ? `${fmt(selected.brng)}°` : "---"}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            ETA:{" "}
            {eta != null
              ? eta < 1
                ? "<1 min"
                : `~${Math.round(eta)} min`
              : speedKts
              ? "---"
              : "no speed data"}
          </Typography>
        </Card>
      )}

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
            {enriched.map((ap, i) => (
              <Box key={ap.name}>
                {i > 0 && <Divider />}
                <ListItemButton
                  selected={selectedAirport === ap.name}
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
                    {ap.brng != null ? ` ${fmt(ap.brng)}°` : ""}
                  </Typography>
                </ListItemButton>
              </Box>
            ))}
          </List>
        )}
      </Card>
    </Box>
  );
};

export default AirportTab;

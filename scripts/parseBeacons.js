const fs = require("fs");
const path = require("path");

const TERRAIN_DIR = "R:\\SteamLibrary\\steamapps\\common\\DCSWorld\\Mods\\terrains";

// Maps DCS terrain folder name -> our app key
const MAP_KEYS = {
  Caucasus: "Caucasus",
  PersianGulf: "PersianGulf",
  Syria: "Syria",
  Nevada: "Nevada",
  Sinai: "Sinai",
  MarianaIslands: "Marianas",
  Normandy: "Normandy",
  Kola: "Kola",
  Iraq: "Iraq",
  GermanyColdWar: "GermanyColdWar",
};

function parseBeacons(luaText) {
  const airports = {};

  // Match each beacon block
  const blockRe = /display_name\s*=\s*_\(['"](.+?)['"]\)[\s\S]*?positionGeo\s*=\s*\{\s*latitude\s*=\s*([-\d.]+)\s*,\s*longitude\s*=\s*([-\d.]+)\s*\}/g;
  let m;
  while ((m = blockRe.exec(luaText)) !== null) {
    const name = m[1].trim();
    const lat = parseFloat(m[2]);
    const lng = parseFloat(m[3]);
    if (!airports[name]) airports[name] = { lats: [], lngs: [] };
    airports[name].lats.push(lat);
    airports[name].lngs.push(lng);
  }

  // Average beacon positions per airport
  return Object.entries(airports)
    .map(([name, { lats, lngs }]) => ({
      name,
      lat: parseFloat((lats.reduce((a, b) => a + b, 0) / lats.length).toFixed(6)),
      lng: parseFloat((lngs.reduce((a, b) => a + b, 0) / lngs.length).toFixed(6)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const result = {};
for (const [folder, key] of Object.entries(MAP_KEYS)) {
  const filePath = path.join(TERRAIN_DIR, folder, "Beacons.lua");
  if (!fs.existsSync(filePath)) {
    console.warn(`Skipping ${folder}: Beacons.lua not found`);
    continue;
  }
  const text = fs.readFileSync(filePath, "utf8");
  const airports = parseBeacons(text);
  result[key] = airports;
  console.log(`${key}: ${airports.length} airports`);
}

// Write airportData.js
const lines = ["const AIRPORT_DATA = {"];
for (const [key, airports] of Object.entries(result)) {
  lines.push(`  ${key}: [`);
  for (const ap of airports) {
    lines.push(`    { name: "${ap.name}", lat: ${ap.lat}, lng: ${ap.lng} },`);
  }
  lines.push(`  ],`);
}
lines.push("};", "", "export default AIRPORT_DATA;", "");

const outPath = path.join(__dirname, "../src/utils/airportData.js");
fs.writeFileSync(outPath, lines.join("\n"));
console.log(`\nWrote ${outPath}`);

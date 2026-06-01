const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const srcDir = path.join(root, "data", "themes", "sources");
const outDir = path.join(root, "data", "themes");
const publicDir = path.join(root, "public");

/** id → 來源 CSV 檔名（與 sources 目錄一致） */
const THEMES = [
  { id: "theme_space_rocket", file: "太空火箭🚀.csv", label: "太空火箭🚀" },
  { id: "theme_storage", file: "存儲股💽.csv", label: "存儲股💽" },
  { id: "theme_yao", file: "妖股👻.csv", label: "妖股👻" },
  { id: "theme_magnificent7", file: "美股七王🏆.csv", label: "美股七王🏆" },
  { id: "theme_semiconductor", file: "晶片半導體.csv", label: "晶片半導體" },
  { id: "theme_rare_earth", file: "稀土.csv", label: "稀土" },
  { id: "theme_quantum", file: "量子計算🧮.csv", label: "量子計算🧮" },
  { id: "theme_ai_app", file: "Ai應用股.csv", label: "Ai應用股" },
];

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).slice(1);
  const symbols = [];
  for (const line of lines) {
    const m = line.match(/^"([^"]+)","([^"]*)"/);
    if (!m) continue;
    const code = m[1];
    const name = m[2];
    const parts = code.split(".");
    const symbol =
      parts.length >= 2 && parts[parts.length - 1] === "US"
        ? parts.slice(0, -1).join(".")
        : code;
    symbols.push({ symbol, name });
  }
  return symbols;
}

function publicName(themeId) {
  return themeId.replace(/^theme_/, "").replace(/_/g, "-");
}

fs.mkdirSync(outDir, { recursive: true });

const manifest = [];

for (const { id, file, label } of THEMES) {
  const csvPath = path.join(srcDir, file);
  if (!fs.existsSync(csvPath)) {
    console.error("missing", csvPath);
    process.exit(1);
  }
  const symbols = parseCsv(fs.readFileSync(csvPath, "utf8"));
  const payload = {
    id,
    label,
    updatedAt: new Date().toISOString().slice(0, 10),
    count: symbols.length,
    symbols,
  };
  const dataPath = path.join(outDir, `${id}.json`);
  fs.writeFileSync(dataPath, JSON.stringify(payload, null, 2));

  const pub = path.join(publicDir, `theme-${publicName(id)}-symbols.json`);
  fs.writeFileSync(
    pub,
    JSON.stringify({ count: symbols.length, symbols })
  );
  manifest.push({ id, label, count: symbols.length });
  console.log("wrote", id, symbols.length);
}

fs.writeFileSync(
  path.join(outDir, "manifest.json"),
  JSON.stringify({ themes: manifest }, null, 2)
);

console.log("done", manifest.length, "themes");

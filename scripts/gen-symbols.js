const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

for (const name of ["sp500", "nasdaq100", "hk-hsi"]) {
  const data = require(path.join(root, "data", `${name}.json`));
  const out = path.join(root, "public", `${name}-symbols.json`);
  fs.writeFileSync(
    out,
    JSON.stringify({ count: data.symbols.length, symbols: data.symbols })
  );
  console.log("wrote", out, data.symbols.length);
}

const themesDir = path.join(root, "data", "themes");
for (const file of fs.readdirSync(themesDir)) {
  if (!file.startsWith("theme_") || !file.endsWith(".json")) continue;
  const data = require(path.join(themesDir, file));
  const slug = data.id.replace(/^theme_/, "").replace(/_/g, "-");
  const out = path.join(root, "public", `theme-${slug}-symbols.json`);
  fs.writeFileSync(
    out,
    JSON.stringify({ count: data.symbols.length, symbols: data.symbols })
  );
  console.log("wrote", out, data.symbols.length);
}

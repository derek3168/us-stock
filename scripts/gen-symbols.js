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

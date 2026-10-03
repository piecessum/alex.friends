// Подхватывает .env.local для скриптов, запускаемых вне Next. Импортируется
// первым: часть модулей lib/ читает токены из process.env сразу при загрузке.
// В CI файла нет — переменные приходят из секретов окружения.

import fs from "node:fs";
import path from "node:path";

const file = path.join(process.cwd(), ".env.local");
if (fs.existsSync(file)) {
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

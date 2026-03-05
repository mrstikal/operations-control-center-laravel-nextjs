import http from "node:http";

const targets = [
  process.env.SMOKE_API_URL || "http://127.0.0.1:8000/api/me",
  process.env.SMOKE_WEB_URL || "http://127.0.0.1:3000/login",
];

function check(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve({ url, status: res.statusCode || 0 });
      res.resume();
    });
    req.on("error", () => resolve({ url, status: 0 }));
  });
}

const results = await Promise.all(targets.map(check));

for (const item of results) {
  console.log(`${item.url} -> ${item.status}`);
}

const failed = results.some((x) => x.status === 0);
if (failed) {
  process.exit(1);
}


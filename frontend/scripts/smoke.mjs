import http from "node:http";

const targets = [
  process.env.SMOKE_API_URL || "http://127.0.0.1:8000/api/me",
  process.env.SMOKE_WEB_URL || "http://127.0.0.1:3000/login",
  process.env.SMOKE_EMPLOYEES_URL || "http://127.0.0.1:3000/employees",
  process.env.SMOKE_EMPLOYEE_DETAIL_URL || "http://127.0.0.1:3000/employees/1",
  process.env.SMOKE_SHIFTS_URL || "http://127.0.0.1:3000/shifts",
  process.env.SMOKE_TIMEOFF_URL || "http://127.0.0.1:3000/time-off",
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

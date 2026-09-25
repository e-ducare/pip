const http = require("http");
const fs = require("fs");
const path = require("path");

const port = process.env.PORT || 3000;
const root = __dirname;
const dataFile = path.join(root, "submissions.json");
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function readSubmissions() {
  if (!fs.existsSync(dataFile)) return [];
  try {
    return JSON.parse(fs.readFileSync(dataFile, "utf8"));
  } catch {
    return [];
  }
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

function serveFile(request, response) {
  const requestedPath =
    request.url === "/" ? "/public/index.html" : `/public${request.url}`;
  const filePath = path.normalize(path.join(root, requestedPath));
  if (!filePath.startsWith(path.join(root, "public"))) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500);
      response.end(error.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }
    response.writeHead(200, {
      "Content-Type":
        mimeTypes[path.extname(filePath)] || "application/octet-stream",
    });
    response.end(content);
  });
}

const server = http.createServer((request, response) => {
  if (request.method === "POST" && request.url === "/api/submissions") {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) request.destroy();
    });
    request.on("end", () => {
      try {
        const submission = JSON.parse(body);
        const submissions = readSubmissions();
        submissions.push({
          id: `submission-${Date.now()}`,
          submittedAt: new Date().toISOString(),
          ...submission,
        });
        fs.writeFileSync(dataFile, `${JSON.stringify(submissions, null, 2)}\n`);
        sendJson(response, 201, { ok: true });
      } catch {
        sendJson(response, 400, {
          ok: false,
          error: "Invalid submission data.",
        });
      }
    });
    return;
  }

  if (request.method === "GET") {
    serveFile(request, response);
    return;
  }

  response.writeHead(405);
  response.end("Method not allowed");
});

server.listen(port, () => {
  console.log(`E-ducare form running at http://localhost:${port}`);
});

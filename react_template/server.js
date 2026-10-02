require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

console.log("Supabase URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log("Supabase client created", !!supabase);

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
  const pageRoutes = {
    "/": "/public/index.html",
    "/infrastructure": "/public/infrastructure.html",
    "/sponsorship": "/public/sponsorship.html",
  };
  const requestedPath = pageRoutes[request.url] || `/public${request.url}`;
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
    request.on("end", async () => {
      let submission;
      try {
        submission = JSON.parse(body);
      } catch {
        sendJson(response, 400, {
          ok: false,
          error: "Invalid submission data.",
        });
        return;
      }

      try {
        const { data: project, error: projectError } = await supabase
          .from("infrastructure_form")
          .insert({
            situation: submission.situation,
            risk: submission.risk,
            goal: submission.goal,
            educare_mission_adherence: submission.mission,
            change: submission.change,
            sustainability: submission.sustainability,
            additional_info: submission.additionalInfo,
          })
          .select("project_id")
          .single();

        if (projectError) throw projectError;

        const projectId = project.project_id;
        const beneficiaries = (Array.isArray(submission.people)
          ? submission.people
          : []
        )
          .filter(
            (person) =>
              person.name ||
              person.info ||
              person.familyMembers ||
              person.age,
          )
          .map((person) => ({
            name: person.name,
            additional_info: person.info || null,
            family_members: person.familyMembers
              ? Number(person.familyMembers)
              : null,
            age: person.age ? Number(person.age) : null,
            project_id: projectId,
          }));

        if (beneficiaries.length) {
          const { error } = await supabase
            .from("Beneficiaries")
            .insert(beneficiaries);
          if (error) throw error;
        }

        const costs = (Array.isArray(submission.costs) ? submission.costs : [])
          .filter((cost) => cost.description || cost.amount || cost.category)
          .map((cost) => ({
            desc_of_items: cost.description,
            amount: cost.amount ? Number(cost.amount) : null,
            "NRC/RC": cost.category,
            project_id: projectId,
          }));

        if (costs.length) {
          const { error } = await supabase
            .from("projected_costs")
            .insert(costs);
          if (error) throw error;
        }

        sendJson(response, 201, { ok: true });
      } catch (error) {
        console.error("Failed to save infrastructure submission:", error);
        sendJson(response, 500, {
          ok: false,
          error: "Could not save submission.",
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

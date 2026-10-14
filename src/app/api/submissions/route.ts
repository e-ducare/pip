import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

type Submission = {
  situation?: string;
  risk?: string;
  goal?: string;
  mission?: string;
  change?: string;
  sustainability?: string;
  additionalInfo?: string;
  people?: { name?: string; info?: string; familyMembers?: string; age?: string }[];
  costs?: { description?: string; amount?: string; category?: string }[];
};

const toNumber = (value?: string) => (value ? Number(value) : null);

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ ok: false, error: "Sign in to submit." }, { status: 401 });
  }

  let submission: Submission;
  try {
    submission = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid submission data." }, { status: 400 });
  }

  // Blank rows from the form's starter rows are skipped.
  const people = (Array.isArray(submission.people) ? submission.people : []).filter(
    (person) => person.name || person.info || person.familyMembers || person.age,
  );
  const costs = (Array.isArray(submission.costs) ? submission.costs : []).filter(
    (cost) => cost.description || cost.amount || cost.category,
  );

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ project_id: string }>(
      `insert into infrastructure_form
        (situation, risk, goal, educare_mission_adherence, change, sustainability, additional_info, created_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning project_id`,
      [
        submission.situation,
        submission.risk,
        submission.goal,
        submission.mission,
        submission.change,
        submission.sustainability,
        submission.additionalInfo,
        session.user.id,
      ],
    );
    const projectId = rows[0].project_id;

    for (const person of people) {
      await client.query(
        `insert into "Beneficiaries" (name, additional_info, family_members, age, project_id)
         values ($1, $2, $3, $4, $5)`,
        [
          person.name,
          person.info || null,
          toNumber(person.familyMembers),
          toNumber(person.age),
          projectId,
        ],
      );
    }

    for (const cost of costs) {
      await client.query(
        `insert into projected_costs (desc_of_items, amount, "NRC/RC", project_id)
         values ($1, $2, $3, $4)`,
        [cost.description, toNumber(cost.amount), cost.category, projectId],
      );
    }

    await client.query("COMMIT");
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to save infrastructure submission:", error);
    return Response.json({ ok: false, error: "Could not save submission." }, { status: 500 });
  } finally {
    client.release();
  }
}

import { InfrastructureForm, Role } from "../new/infrastructure-form";

// both for
// - submitter to fix/update the form
// - approver to give feedback
export default async function ProjectFormReview({
  searchParams,
  params,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const role = ((await searchParams).role as Role | undefined) || "applicant";

  // TODO: fetch project data by id

  console.log({ id, role });

  return (
    <main>
      <div className="mb-17 flex items-center gap-3.75 max-sm:mb-12">
        <InfrastructureForm role={role} isReviewing={role == "reviewer"} />
      </div>
    </main>
  );
}

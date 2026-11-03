# AGENTS.md

PIP is E-ducare's internal web app for the Project Implementation Process, the workflow that takes a charity project from request to funding, implementation and monitoring. The [glossary](#glossary) is the vocabulary for code, UI copy, docs and commits.

## Sources

- [README.md](README.md) covers setup, settings, database, running, validation and deployment. Link to it; don't copy it here.
- `.agents/notes/` holds decision records. Follow the lifecycle and class layout already in use.
- The functional requirements live in the E-ducare Google Drive folder [WebApps Educare](https://drive.google.com/drive/folders/1W3XYD60toT73i4WihnSwejgfnxWF93tH). Only e-ducare.org accounts can open it.

| Document                                                             | What it settles                                                                   |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Project Implementation Process (slides)                              | Phase order, owners and default deadlines. Newest source; it wins on phase order. |
| e-ducare Internal WebApp Brief (PDF)                                 | Roles, feedback loops, Dataroom folders, post-funding phases.                     |
| Copy of Country_Program_Project Name-Request for Funds_Year_Template | Project Request fields and the file naming convention.                            |
| Project Request Submission process                                   | How a project starts, and the two project types. Has open questions.              |
| Copy of Sponsorship Details_Canaan_2026b                             | The sponsorship spreadsheet used today for one programme.                         |
| Meeting Aug 31st                                                     | Role list and the Country > Year > Programme > Project hierarchy.                 |
| 30-60-90 Full Stack Developer plan                                   | Scope of the WebApp and who owns requirements (Operations Director).              |

Read the folder with [`gog`](https://github.com/openclaw/gogcli) through the `educare` OAuth client. That client is a Desktop OAuth client in an E-ducare Google Cloud project whose consent screen audience is Internal. A client from another organization fails with `Error 403: org_internal`.

```sh
gog --client educare -a <you>@e-ducare.org drive ls --parent 1W3XYD60toT73i4WihnSwejgfnxWF93tH
gog --client educare -a <you>@e-ducare.org drive download <fileId> --format=md --out=/tmp/<name>.md
```

Export Google Docs as `md`, Slides as `pdf`, and Sheets as `csv`; the CSV holds only the first tab.

## Current code

- `src/app/protected/projects/new/` is the Project Request form for infrastructure projects. Sponsorship is a choice on that page with no form behind it.
- `src/app/api/submissions/route.ts` saves a Project Request to `infrastructure_form`, `"Beneficiaries"` and `projected_costs`. Those tables were created outside this repository; the migrations only alter them.
- `src/app/protected/projects/[id]/upload/` and `src/lib/google-drive.ts` upload files to a `Project <id>` folder on the Shared Drive. This is the start of the Dataroom, without its subfolders.
- `Role = "applicant" | "reviewer"` in `infrastructure-form.tsx` is a placeholder. `reviewer` is not a role in the brief; the reviewing roles are the Board and the Legal & Finance Director.

## Rules

- Use glossary terms. When a concept has no term, ask instead of coining one. When the Drive documents disagree, say so and follow the precedence above.
- The repository is public. Keep secrets, staff names, and beneficiary data out of code, tests, fixtures and commits. Beneficiaries are mostly children.
- Previews use the production database, so a preview submission is a real record.
- Run `pnpm lint` and `pnpm test` before committing; run `pnpm build` when routes, config or dependencies change.

## Phases

Default deadlines repeat each year, and administrators can override them per project.

| #   | Phase                         | Owner                      | Default deadline       |
| --- | ----------------------------- | -------------------------- | ---------------------- |
| 1   | Project Request Submission    | Applicant                  | 31 July                |
| 2   | Project Approval & Milestones | Board                      | 15 August              |
| 3   | Dataroom                      | Applicant                  | 31 August              |
| 4   | Legal & Finance Check         | Legal & Finance Director   | 8 September            |
| 5   | Project Sign-off              | Board                      | 15 September           |
| 6   | Marketing Activities          | Marketing Director         | 30 September           |
| 7   | Fundraising Activities        | Fundraising Director       | 15 October             |
| 8   | End of Fundraising            | Fundraising Director       | 30 December, next year |
| 9   | Send Money to Beneficiaries   | Fundraising Director       | none                   |
| 10  | Project Implementation        | Applicant                  | none                   |
| 11  | Monitoring & Evaluation       | Board and Department Heads | none                   |
| 12  | Communicate to Stakeholders   | Marketing Director         | none                   |

The brief puts the Dataroom (15 August) before Project Approval (31 August). The slides are newer and put approval first.

Two feedback loops send a project back:

- Loop A. The Legal & Finance Director rejects the documents with notes. The project becomes `Needs Revision` and the Applicant gets an email.
- Loop B. At End of Fundraising, money raised doesn't cover the milestone budget. The project becomes `Needs Milestone Revision` and the Board gets an email.

## Glossary

Spellings the sources mix:

- The charity writes its own name "e-ducare" (full name "e-ducare for Youth"); the app UI uses "E-ducare". Keep the UI form in UI copy.
- The sources use both "Programme" and "Program". The code doesn't use either yet; ask before picking one.
- The brief writes "Dataroom" and the 30-60-90 plan "Data Room". Use "Dataroom".

### Organization and people

| Term                                    | Meaning                                                                                                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| E-ducare                                | The charity. Its mission is the education of vulnerable children, including their well-being: water, health, meals, clothing.                          |
| PIP                                     | Project Implementation Process: the workflow in [Phases](#phases), and this app. Not "Process Implementation Plan", which appears only in a file name. |
| Applicant                               | The role that submits a Project Request, uploads Dataroom files and runs implementation. Sees only their own projects.                                 |
| Program Manager (PM)                    | Manager of the partner organization in the field. Usually the person in the Applicant role. Not an E-ducare volunteer.                                 |
| E-ducare PM                             | E-ducare staff assigned to one or more projects. Can create a project on an Applicant's behalf.                                                        |
| Board, Board of Directors               | Approves or rejects projects, defines milestones, signs off. Sees all projects.                                                                        |
| Legal & Finance Director (L&F Director) | Runs the Legal & Finance Check on Dataroom files.                                                                                                      |
| Marketing Director                      | Owns marketing activities and stakeholder communication.                                                                                               |
| Fundraising Director                    | Owns fundraising, checks financial coverage, sends money to beneficiaries.                                                                             |
| Department Heads                        | The brief's name for the directors below the Board. It calls the Marketing and Fundraising Directors department heads.                                 |
| Operations Director                     | Owns the WebApp's requirements.                                                                                                                        |
| Sponsor                                 | Usually an individual who funds a named child through a sponsorship project.                                                                           |
| Donor                                   | Anyone who gives during fundraising.                                                                                                                   |

### Projects

| Term                   | Meaning                                                                                                                                       | In code                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Country                | Tanzania or Vietnam today.                                                                                                                    |                                 |
| Programme              | A named group of projects in a country, such as Lengiloriti in Tanzania or Canaan.                                                            |                                 |
| Project                | One funding request and the work it pays for. Belongs to Country > Year > Programme.                                                          | `project_id`                    |
| Project type           | Infrastructure or Sponsorship.                                                                                                                | `infrastructure`, `sponsorship` |
| Infrastructure project | Building, such as houses, schools, a classroom, a teacher's house, a lab. Can run several years.                                              | `infrastructure_form`           |
| Sponsorship project    | Pays for named children's schooling and well-being over several school years. About a year from request to funds, then a yearly reminder.     |                                 |
| Milestone              | A target with a budget that the Board defines at approval. Fundraising is measured against milestone budgets.                                 |                                 |
| Financial coverage     | Money raised compared with the milestone budget, checked at End of Fundraising.                                                               |                                 |
| Dataroom               | The project's Google Drive folder for documents. Planned layout `/Projects/<Project name>/` with `Legal`, `Finance` and `Implementation`.     | `findOrCreateProjectFolder`     |
| Status                 | Where a project is in the process. Named so far: `Draft`, `Needs Revision`, `Needs Milestone Revision`, `In Progress`. The full list is open. |                                 |

### Project Request

| Term                               | Meaning                                                                                                                  | In code                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| Project Request, Request for Funds | The form an Applicant submits in phase 1. The Word template is titled "Request for Project".                             | `InfrastructureForm`, `infrastructure_form` |
| Request file name                  | `Country_Programme_Project Name-Request for Funds_Year`, e.g. `Tanzania_Lengiloriti_High School-Request for Funds_2026`. |                                             |
| The situation                      | Why funds are needed.                                                                                                    | `situation`                                 |
| The risk                           | What happens if the project doesn't go ahead.                                                                            | `risk`                                      |
| The goal                           | What the project aims to achieve.                                                                                        | `goal`                                      |
| Mission adherence                  | How the project fits E-ducare's mission.                                                                                 | `educare_mission_adherence`                 |
| What are we changing               | The impact the project creates.                                                                                          | `change`                                    |
| Sustainability / compliance        | How the project lasts and complies with E-ducare's mission and national rules.                                           | `sustainability`                            |
| Beneficiary                        | A person the project helps: name, family members, age, notes. A large group can be a single row with its size.           | `"Beneficiaries"`                           |
| Projected costs                    | The budget lines: description, amount in local currency, NRC or RC.                                                      | `projected_costs`                           |
| NRC                                | Non-recurrent cost, paid once.                                                                                           | `"NRC/RC" = 'NRC'`                          |
| RC                                 | Recurrent cost, paid repeatedly.                                                                                         | `"NRC/RC" = 'RC'`                           |
| Sponsorship details sheet          | Today's spreadsheet per sponsorship programme, with tabs such as Running Costs, Public School and Special Needs.         |                                             |

const form = document.querySelector("#funding-form");
const confirmation = document.querySelector("#confirmation");
const errorMessage = document.querySelector("#error-message");
const peopleRows = document.querySelector("#people-rows");
const costRows = document.querySelector("#cost-rows");

function addPersonRow(values = {}) {
  const row = document.createElement("tr");
  row.innerHTML = `<td><input name="personName" placeholder="Name" value="${values.name || ""}" /></td><td><input name="personInfo" placeholder="Additional info" value="${values.info || ""}" /></td><td><input name="familyMembers" type="number" min="1" placeholder="0" value="${values.familyMembers || ""}" /></td><td><input name="personAge" type="number" min="0" placeholder="Age" value="${values.age || ""}" /></td><td class="action-column"><button class="remove-row" type="button" aria-label="Remove person">×</button></td>`;
  peopleRows.append(row);
}

function addCostRow(values = {}) {
  const row = document.createElement("tr");
  row.innerHTML = `<td><input name="costDescription" placeholder="Item description" value="${values.description || ""}" /></td><td><input name="costAmount" type="number" min="0" step="0.01" placeholder="$ 0.00" value="${values.amount || ""}" /></td><td><select name="costCategory" aria-label="NRC or RC"><option value="">Select</option><option value="NRC" ${!values.category || values.category === "NRC" ? "selected" : ""}>NRC</option><option value="RC" ${values.category === "RC" ? "selected" : ""}>RC</option></select></td><td class="action-column"><button class="remove-row" type="button" aria-label="Remove cost item">×</button></td>`;
  costRows.append(row);
}

function collectRows(container, fields) {
  return [...container.querySelectorAll("tr")].map((row) => {
    const inputs = row.querySelectorAll("input, select");
    return fields.reduce(
      (result, field, index) => ({
        ...result,
        [field]: inputs[index].value.trim(),
      }),
      {},
    );
  });
}

addPersonRow();
addPersonRow();
addPersonRow();
addCostRow();
addCostRow();
addCostRow();

document.addEventListener("click", (event) => {
  if (event.target.matches(".remove-row")) {
    const row = event.target.closest("tr");
    const tableBody = row.parentElement;
    if (tableBody.children.length > 1) row.remove();
  }
  if (event.target.matches(".add-row")) {
    if (event.target.dataset.table === "people") addPersonRow();
    else addCostRow();
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorMessage.textContent = "";
  if (!form.reportValidity()) return;

  const submitButton = form.querySelector(".submit-button");
  submitButton.disabled = true;
  submitButton.querySelector("span").textContent = "Submitting...";
  const formData = new FormData(form);
  const payload = {
    situation: formData.get("situation"),
    risk: formData.get("risk"),
    goal: formData.get("goal"),
    mission: formData.get("mission"),
    change: formData.get("change"),
    sustainability: formData.get("sustainability"),
    people: collectRows(peopleRows, ["name", "info", "familyMembers", "age"]),
    costs: collectRows(costRows, ["description", "amount", "category"]),
    additionalInfo: formData.get("additionalInfo") || "",
  };

  try {
    const response = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("Submission failed");
    form.hidden = true;
    confirmation.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch {
    errorMessage.textContent =
      "We could not save your request. Please try again.";
    submitButton.disabled = false;
    submitButton.querySelector("span").textContent = "Submit request";
  }
});

document.querySelector("#new-request").addEventListener("click", () => {
  form.reset();
  form.hidden = false;
  confirmation.hidden = true;
  window.scrollTo({ top: 0, behavior: "smooth" });
});

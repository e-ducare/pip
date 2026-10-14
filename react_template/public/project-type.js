const form = document.querySelector("#project-type-form");
const confirmButton = form.querySelector(".project-confirm");
const options = form.querySelectorAll('input[name="projectType"]');

options.forEach((option) => {
  option.addEventListener("change", () => {
    confirmButton.disabled = false;
  });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const projectType = new FormData(form).get("projectType");
  if (projectType === "infrastructure") {
    window.location.assign("/infrastructure");
  } else if (projectType === "sponsorship") {
    window.location.assign("/sponsorship");
  }
});

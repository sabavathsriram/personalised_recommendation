// Email validation feedback for login/signup forms
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function showError(input, message) {
  input.classList.add("invalid");
  input.classList.remove("valid");
  let errorElement = input.parentElement.querySelector(".error-message");
  if (!errorElement) {
    errorElement = document.createElement("div");
    errorElement.className = "error-message";
    input.parentElement.appendChild(errorElement);
  }
  errorElement.textContent = message;
  errorElement.classList.add("show");
}

function showSuccess(input) {
  input.classList.add("valid");
  input.classList.remove("invalid");
  const errorElement = input.parentElement.querySelector(".error-message");
  if (errorElement) {
    errorElement.classList.remove("show");
  }
}

document.querySelectorAll('input[type="email"]').forEach((input) => {
  input.addEventListener("blur", function () {
    if (this.value && !validateEmail(this.value)) {
      showError(this, "Please enter a valid email address");
    } else if (this.value) {
      showSuccess(this);
    }
  });
});

// Debug form submission
document.getElementById("signinForm")?.addEventListener("submit", (e) => {
  console.log("[DEBUG] Login form submitted");
  const email = document.getElementById("signinEmail").value;
  const password = document.getElementById("signinPassword").value;
  console.log("[DEBUG] Form data:", { email, password });
});
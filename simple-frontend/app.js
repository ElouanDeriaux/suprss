document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const formData = new URLSearchParams();
  formData.append("username", username);
  formData.append("password", password);

  try {
    const res = await fetch("http://localhost:8000/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: formData
    });

    if (!res.ok) throw new Error("Échec de connexion");

    const data = await res.json();
    localStorage.setItem("token", data.access_token);
    window.location.href = "dashboard.html";
  } catch (err) {
    document.getElementById("error").classList.remove("hidden");
  }
});

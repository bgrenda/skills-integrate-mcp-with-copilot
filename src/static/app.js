document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const signupContainer = document.getElementById("signup-container");
  const messageDiv = document.getElementById("message");
  const teacherStatus = document.getElementById("teacher-status");
  const loginButton = document.getElementById("teacher-login-button");
  const logoutButton = document.getElementById("teacher-logout-button");
  const loginDialog = document.getElementById("teacher-login-dialog");
  const loginForm = document.getElementById("teacher-login-form");
  const loginError = document.getElementById("teacher-login-error");
  let accessToken = sessionStorage.getItem("teacherAccessToken");
  let currentTeacher = null;

  function apiFetch(url, options = {}) {
    const headers = new Headers(options.headers || {});
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
    return fetch(url, { ...options, headers });
  }

  function renderTeacherControls() {
    const isTeacher = Boolean(currentTeacher);
    teacherStatus.textContent = isTeacher
      ? `Signed in: ${currentTeacher.name}`
      : "Public view";
    loginButton.classList.toggle("hidden", isTeacher);
    logoutButton.classList.toggle("hidden", !isTeacher);
    signupContainer.classList.toggle("hidden", !isTeacher);
  }

  function showMessage(text, className) {
    messageDiv.textContent = text;
    messageDiv.className = className;
    window.setTimeout(() => messageDiv.classList.add("hidden"), 5000);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      if (!response.ok) {
        throw new Error("Activities request failed");
      }
      const activities = await response.json();

      activitiesList.replaceChildren();
      while (activitySelect.options.length > 1) {
        activitySelect.remove(1);
      }

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;
        const title = document.createElement("h4");
        title.textContent = name;
        activityCard.appendChild(title);

        const description = document.createElement("p");
        description.textContent = details.description;
        activityCard.appendChild(description);

        const schedule = document.createElement("p");
        schedule.innerHTML = `<strong>Schedule:</strong> ${details.schedule}`;
        activityCard.appendChild(schedule);

        const availability = document.createElement("p");
        availability.innerHTML = `<strong>Availability:</strong> ${spotsLeft} spots left`;
        activityCard.appendChild(availability);

        const participantsContainer = document.createElement("div");
        participantsContainer.className = "participants-container";
        if (details.participants.length > 0) {
          const participantsHeading = document.createElement("h5");
          participantsHeading.textContent = "Participants:";
          participantsContainer.appendChild(participantsHeading);

          const participantsList = document.createElement("ul");
          participantsList.className = "participants-list";
          details.participants.forEach((email) => {
            const listItem = document.createElement("li");
            const participantEmail = document.createElement("span");
            participantEmail.className = "participant-email";
            participantEmail.textContent = email;
            listItem.appendChild(participantEmail);

            if (currentTeacher) {
              const unregisterButton = document.createElement("button");
              unregisterButton.className = "delete-btn";
              unregisterButton.type = "button";
              unregisterButton.textContent = "Unregister";
              unregisterButton.setAttribute("aria-label", `Unregister ${email}`);
              unregisterButton.dataset.activity = name;
              unregisterButton.dataset.email = email;
              unregisterButton.addEventListener("click", handleUnregister);
              listItem.appendChild(unregisterButton);
            }

            participantsList.appendChild(listItem);
          });
          participantsContainer.appendChild(participantsList);
        } else {
          const emptyState = document.createElement("p");
          emptyState.innerHTML = "<em>No participants yet</em>";
          participantsContainer.appendChild(emptyState);
        }
        activityCard.appendChild(participantsContainer);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await apiFetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await apiFetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  loginButton.addEventListener("click", () => loginDialog.showModal());
  document.getElementById("close-login-button").addEventListener("click", () => {
    loginDialog.close();
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginError.textContent = "";
    loginError.classList.add("hidden");

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: document.getElementById("teacher-email").value,
          password: document.getElementById("teacher-password").value,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.detail || "Sign-in failed");
      }

      accessToken = result.access_token;
      sessionStorage.setItem("teacherAccessToken", accessToken);
      currentTeacher = result.teacher;
      loginForm.reset();
      loginDialog.close();
      renderTeacherControls();
      showMessage(`Signed in as ${currentTeacher.name}.`, "success");
      await fetchActivities();
    } catch (error) {
      loginError.textContent = error.message;
      loginError.classList.remove("hidden");
    }
  });

  logoutButton.addEventListener("click", async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } finally {
      sessionStorage.removeItem("teacherAccessToken");
      accessToken = null;
      currentTeacher = null;
      renderTeacherControls();
      await fetchActivities();
      showMessage("Signed out.", "info");
    }
  });

  // Initialize app
  async function initialize() {
    if (accessToken) {
      try {
        const response = await apiFetch("/auth/me");
        if (response.ok) {
          const result = await response.json();
          currentTeacher = result.teacher;
        } else {
          sessionStorage.removeItem("teacherAccessToken");
          accessToken = null;
        }
      } catch (error) {
        sessionStorage.removeItem("teacherAccessToken");
        accessToken = null;
      }
    }
    renderTeacherControls();
    await fetchActivities();
  }

  initialize();
});

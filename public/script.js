// Function to toggle between login and registration forms
function setupFormToggle() {
  const loginSection = document.getElementById("loginSection");
  const registerSection = document.getElementById("registerSection");
  const showRegister = document.getElementById("showRegister");
  const showLogin = document.getElementById("showLogin");

  if (!showRegister || !showLogin || !loginSection || !registerSection) {
    console.error("One or more elements are missing in the DOM.");
    return;
  }

  // Toggle to registration form
  showRegister.addEventListener("click", (e) => {
    e.preventDefault();
    loginSection.style.display = "none";
    registerSection.style.display = "block";
  });

  // Toggle to login form
  showLogin.addEventListener("click", (e) => {
    e.preventDefault();
    registerSection.style.display = "none";
    loginSection.style.display = "block";
  });
}

// Function to handle login form submission
async function handleLoginFormSubmit(e) {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  console.log("Login form submitted:", { email, password });

  try {
    const response = await fetch("http://localhost:5000/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    console.log("Response data:", data);

    if (response.ok) {
      console.log("Login successful:", data);
      localStorage.setItem("token", data.token);
      window.location.href = "http://127.0.0.1:5500/public/dashboard.html";
    } else {
      console.error("Login failed:", data.error);
      alert(data.error);
    }
  } catch (err) {
    console.error("Error logging in:", err);
  }
}

// Function to handle registration form submission
async function handleRegisterFormSubmit(e) {
  e.preventDefault();

  const name = document.getElementById("registerName").value;
  const email = document.getElementById("registerEmail").value;
  const password = document.getElementById("registerPassword").value;

  try {
    const response = await fetch("http://localhost:5000/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      alert("Registration successful! Please log in.");
      document.getElementById("loginSection").style.display = "block";
      document.getElementById("registerSection").style.display = "none";
    } else {
      alert(data.error);
    }
  } catch (err) {
    console.error("Error registering:", err);
  }
}

// Function to initialize the form functionalities
function initializeForms() {
  // Check if the page is index.html
  if (window.location.pathname.endsWith("index.html")) {
    setupFormToggle();

    document
      .getElementById("loginForm")
      .addEventListener("submit", handleLoginFormSubmit);
    document
      .getElementById("registerForm")
      .addEventListener("submit", handleRegisterFormSubmit);
  }
}

// Run the initialization function when DOM is fully loaded
document.addEventListener("DOMContentLoaded", initializeForms);

// Function to fetch and display projects
function fetchAndDisplayProjects() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "http://127.0.0.1:5500/public/index.html";
    return;
  }

  fetch("http://localhost:5000/api/projects", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => response.json())
    .then((projects) => {
      if (projects) {
        const projectsContainer = document.getElementById("projects");
        projects.forEach((project) => {
          const projectElement = document.createElement("div");
          projectElement.classList.add("project");
          projectElement.innerHTML = `<h2>${project.name}</h2><p>${project.description}</p>`;
          projectElement.style.cursor = "pointer";

          // Add click event to redirect to project.html with project ID
          projectElement.addEventListener("click", () => {
            window.location.href = `project.html?id=${project._id}`;
          });

          projectsContainer.appendChild(projectElement);
        });
      } else {
        console.error("Failed to load projects.");
      }
    })
    .catch((err) => {
      console.error("Error fetching projects:", err);
    });
}

async function initializeDashboard() {
  const addProjectBtn = document.getElementById("addProjectBtn");
  const projectFormContainer = document.getElementById("projectFormContainer");

  // Fetch users and populate the user selection field
  async function fetchUsers() {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch("http://localhost:5000/api/users", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        return await response.json();
      } else {
        console.error("Failed to fetch users");
        return [];
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      return [];
    }
  }

  // Toggle the project form visibility
  addProjectBtn.addEventListener("click", async () => {
    projectFormContainer.style.display =
      projectFormContainer.style.display === "none" ? "block" : "none";

    // If the form is not already present, create and append it
    if (!projectFormContainer.innerHTML) {
      const users = await fetchUsers();
      const userOptions = users
        .map(
          (user) => `
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" value="${user._id}" id="user-${user._id}">
                    <label class="form-check-label" for="user-${user._id}">
                        ${user.name}
                    </label>
                </div>
            `
        )
        .join("");

      const formHtml = `
    <form id="projectForm" class="styled-form">
        <div class="form-group">
            <label for="projectName">Project Name:</label>
            <input type="text" id="projectName" required>
        </div>
        
        <div class="form-group">
            <label for="projectDescription">Project Description:</label>
            <input type="text" id="projectDescription" required>
        </div>

        <div class="form-group">
            <label>Assign Users:</label>
            <div id="userListContainer">
                ${userOptions}
            </div>
        </div>
        
        <button type="submit" class="submit-btn">Create Project</button>
    </form>
`;

      projectFormContainer.innerHTML = formHtml;
    }
  });

  // Handle logout button click
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "http://127.0.0.1:5500/public/index.html";
  });

  // Handle the form submission to create a new project
  projectFormContainer.addEventListener("submit", async (e) => {
    e.preventDefault();

    const projectName = document.getElementById("projectName").value;
    const projectDescription =
      document.getElementById("projectDescription").value;
    const projectUsers = Array.from(
      document.querySelectorAll("#userListContainer .form-check-input:checked")
    ).map((checkbox) => checkbox.value);
    const token = localStorage.getItem("token");

    try {
      const response = await fetch("http://localhost:5000/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: projectName,
          description: projectDescription,
          users: [...projectUsers, req.user.id],
        }),
      });

      if (response.ok) {
        alert("Project created successfully!");
        window.location.reload();
      } else {
        const data = await response.json();
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project. Please try again.");
    }
  });
}

async function fetchProjectDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get("id");
  const token = localStorage.getItem("token");

  try {
    const response = await fetch(
      `http://localhost:5000/api/projects/${projectId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const project = await response.json();

    if (response.ok) {
      displayProjectDetails(project);
      displayTasks(project.tasks || []);
      displayComments(project.comments || []);
    } else {
      console.error("Failed to load project:", project.error);
    }
  } catch (err) {
    console.error("Error fetching project details:", err);
  }
}

function displayProjectDetails(project) {
  const projectDetails = document.getElementById("projectDetails");

  const assignedUsers = Array.isArray(project.users)
    ? project.users
        .map((user) => `<li><div class="user-avatar">${user.name}</div></li>`)
        .join("")
    : "<li>No users assigned</li>";

  projectDetails.innerHTML = `
        <div class="status-badge">${project.status}</div>
        <h1>${project.name}</h1>
        <p>${project.description}</p>
        <h3>Assigned Users:</h3>
        <ul>${assignedUsers}</ul>
    `;
}

async function displayTasks(tasks) {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get("id");
  const token = localStorage.getItem("token");
  const tasksContainer = document.getElementById("tasks");
  tasksContainer.innerHTML = "<h2>Tasks</h2>";

  console.log("Project ID:", projectId);

  // Add a form to add new tasks
  tasksContainer.innerHTML += `
      <form id="taskForm">
          <input type="text" id="taskTitle" placeholder="Task Title" required>
          <input type="text" id="taskDescription" placeholder="Task Description" required>
          <button type="submit">Add Task</button>
      </form>
  `;

  // Ensure tasks is an array
  (tasks || []).forEach((task) => {
    const taskElement = document.createElement("div");
    taskElement.classList.add("task");
    taskElement.setAttribute("data-id", task._id);

    // Add task details, status update dropdown, and delete button
    taskElement.innerHTML = `
            <h3>${task.title}</h3>
            <p>${task.description}</p>
            <p>Status: <span class="task-status">${task.status}</span></p>
            <select class="status-update">
                <option value="Not Started" ${
                  task.status === "Not Started" ? "selected" : ""
                }>Not Started</option>
                <option value="In Progress" ${
                  task.status === "In Progress" ? "selected" : ""
                }>In Progress</option>
                <option value="Completed" ${
                  task.status === "Completed" ? "selected" : ""
                }>Completed</option>
            </select>
            <button class="delete-task-btn">Delete</button>
        `;

    // Append the task element to the container
    tasksContainer.appendChild(taskElement);
  });

  // Event listener for adding a new task
  document.getElementById("taskForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const taskTitle = document.getElementById("taskTitle").value;
    const taskDescription = document.getElementById("taskDescription").value;

    try {
      const response = await fetch(
        `http://localhost:5000/api/projects/${projectId}/tasks`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: taskTitle,
            description: taskDescription,
          }),
        }
      );

      if (response.ok) {
        alert("Task added successfully!");
        window.location.reload();
      } else {
        const data = await response.json();
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error adding task:", error);
    }
  });

  // Event Delegation for delete buttons
  tasksContainer.addEventListener("click", async (e) => {
    if (e.target.classList.contains("delete-task-btn")) {
      const taskElement = e.target.closest(".task");
      const taskId = taskElement.getAttribute("data-id");
      if (confirm("Are you sure you want to delete this task?")) {
        await deleteTask(taskId);
      }
    }
  });

  // Event Delegation for status update dropdown
  tasksContainer.addEventListener("change", async (e) => {
    if (e.target.classList.contains("status-update")) {
      const taskElement = e.target.closest(".task");
      const taskId = taskElement.getAttribute("data-id");
      const newStatus = e.target.value;
      await updateTaskStatus(taskId, newStatus);
    }
  });
}
async function updateTaskStatus(taskId, newStatus) {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get("id");
  const token = localStorage.getItem("token");

  try {
    const response = await fetch(`http://localhost:5000/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: newStatus }),
    });

    if (response.ok) {
      alert("Task status updated successfully!");
      window.location.reload();
    } else {
      const data = await response.json();
      alert(`Error: ${data.error}`);
    }
  } catch (error) {
    console.error("Error updating task status:", error);
  }
}

// Function to delete a task
async function deleteTask(taskId) {
  const token = localStorage.getItem("token");
  try {
    const response = await fetch(`http://localhost:5000/api/tasks/${taskId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      alert("Task deleted successfully!");
      removeTaskFromDOM(taskId);
    } else {
      const data = await response.json();
      alert(`Error: ${data.error}`);
    }
  } catch (error) {
    console.error("Error deleting task:", error);
  }
}

// Function to remove the task element from the DOM
function removeTaskFromDOM(taskId) {
  const taskElement = document.querySelector(`.task[data-id="${taskId}"]`);
  if (taskElement) {
    taskElement.remove();
  }
}

async function displayComments() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get("id");
  const token = localStorage.getItem("token");
  const commentsContainer = document.getElementById("comments");
  commentsContainer.innerHTML = "<h2>Comments</h2>";

  try {
    const response = await fetch(
      `http://localhost:5000/api/projects/${projectId}/comments`
    );
    if (response.ok) {
      const comments = await response.json();
      // Add a form to add new comments
      commentsContainer.innerHTML += `
    <form id="commentForm">
        <textarea id="commentText" placeholder="Add a comment" required></textarea>
        <button type="submit">Add Comment</button>
    </form>
`;

      renderComments(comments, commentsContainer);
    } else {
      console.error("Failed to load comments:", response.statusText);
      commentsContainer.innerHTML += "<p>Failed to load comments.</p>";
    }
  } catch (error) {
    console.error("Error loading comments:", error);
    commentsContainer.innerHTML += "<p>Error loading comments.</p>";
  }

  document
    .getElementById("commentForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const commentText = document.getElementById("commentText").value.trim();
      if (!commentText) {
        alert("Comment cannot be empty");
        return;
      }

      try {
        const response = await fetch(
          `http://localhost:5000/api/projects/${projectId}/comments`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ text: commentText }),
          }
        );

        if (response.ok) {
          alert("Comment added successfully!");
          window.location.reload();
        } else {
          const data = await response.json();
          alert(`Error: ${data.error}`);
        }
      } catch (error) {
        console.error("Error adding comment:", error);
      }
    });
}

function renderComments(commentList, container) {
  commentList.forEach((comment) => {
    const commentElement = document.createElement("div");
    commentElement.classList.add("comment");
    commentElement.innerHTML = `
            <strong>${comment.username || "Anonymous"}</strong>
            <p>${comment.text}</p>
            <button class="reply-btn" data-id="${comment._id}">Reply</button>
            <div class="replies"></div>
        `;
    container.appendChild(commentElement);

    // Recursively render replies, if any
    if (comment.replies && comment.replies.length) {
      const repliesContainer = commentElement.querySelector(".replies");
      renderComments(comment.replies, repliesContainer);
    }
  });

  // Event delegation: Attach one event listener to the comments container
  container.addEventListener("click", (event) => {
    if (event.target && event.target.classList.contains("reply-btn")) {
      const commentId = event.target.getAttribute("data-id");
      const replyText = prompt("Enter your reply:");
      if (replyText) {
        const projectId = new URLSearchParams(window.location.search).get("id");
        const token = localStorage.getItem("token");
        addReply(projectId, commentId, replyText, token);
      }
    }
  });
}

// Function to handle adding replies
async function addReply(projectId, parentCommentId, replyText, token) {
  try {
    const response = await fetch(
      `http://localhost:5000/api/projects/${projectId}/comments`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: replyText, parentCommentId }),
      }
    );

    if (response.ok) {
      alert("Reply added successfully!");
      window.location.reload();
    } else {
      const data = await response.json();
      alert(`Error: ${data.error}`);
    }
  } catch (error) {
    console.error("Error adding reply:", error);
  }
}

if (window.location.pathname.endsWith("dashboard.html")) {
  fetchAndDisplayProjects();
  initializeDashboard();
}

if (window.location.pathname.endsWith("project.html")) {
  fetchProjectDetails();
  // displayTasks();
  // displayComments();
}

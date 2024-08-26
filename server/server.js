const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const User = require("./models/User");
const Project = require("./models/Project");
const Task = require("./models/Task");
const Comment = require("./models/Comment");
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(express.static("public"));

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error(err));

// Routes
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

const auth = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).json({ error: "Invalid token" });
  }
};

// Example of a protected route
app.get("/api/dashboard", auth, (req, res) => {
  res.json({ message: `Welcome to your dashboard, user ${req.user.id}` });
});

// Registration Route
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = new User({ name, email, password });
    await user.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(400).json({ error: "Error registering user", details: err });
  }
});

// Login Route
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Login attempt with:", email);

    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found");
      return res.status(400).json({ error: "User not found" });
    }

    console.log("User found:", user.name);

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log("Invalid credentials");
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    console.log("Token generated:", token);

    res.json({ token });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error", details: err });
  }
});

// Create a new project
app.post("/api/projects", auth, async (req, res) => {
  try {
    const { name, description, users } = req.body;

    const validUsers = await User.find({ _id: { $in: users } });

    if (validUsers.length !== users.length) {
      return res
        .status(400)
        .json({ error: "One or more user IDs are invalid" });
    }

    const project = new Project({
      name,
      description,
      userId: req.user.id,
      users,
    });

    await project.save();
    res.status(201).json(project);
  } catch (err) {
    res.status(400).json({ error: "Error creating project", details: err });
  }
});

// Get All Users Route
app.get("/api/users", auth, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Error fetching users", details: err });
  }
});

// Get all projects for the logged-in user
app.get("/api/projects", auth, async (req, res) => {
  try {
    // Find projects where the logged-in user is either the owner or assigned
    const projects = await Project.find({
      $or: [{ userId: req.user.id }, { users: req.user.id }],
    }).populate("tasks");

    res.json(projects);
  } catch (err) {
    res.status(400).json({ error: "Error fetching projects", details: err });
  }
});

// Get a specific project by ID
app.get("/api/projects/:id", auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("tasks")
      .populate("users", "name email");

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Check if the logged-in user is either the owner or an assigned user
    const isOwner = project.userId.toString() === req.user.id;
    const isAssignedUser = project.users.some(
      (user) => user._id.toString() === req.user.id
    );

    if (!isOwner && !isAssignedUser) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(project);
  } catch (err) {
    res.status(400).json({ error: "Error fetching project", details: err });
  }
});

// // Update a project
// app.put('/api/projects/:id', auth, async (req, res) => {
//   try {
//     const { name, description } = req.body;
//     const project = await Project.findByIdAndUpdate(req.params.id, { name, description }, { new: true });
//     if (!project || project.userId.toString() !== req.user.id) {
//       return res.status(404).json({ error: 'Project not found' });
//     }
//     res.json(project);
//   } catch (err) {
//     res.status(400).json({ error: 'Error updating project', details: err });
//   }
// });

// // Delete a project
// app.delete('/api/projects/:id', auth, async (req, res) => {
//   try {
//     const project = await Project.findByIdAndDelete(req.params.id);
//     if (!project || project.userId.toString() !== req.user.id) {
//       return res.status(404).json({ error: 'Project not found' });
//     }
//     await Task.deleteMany({ _id: { $in: project.tasks } });
//     res.json({ message: 'Project deleted successfully' });
//   } catch (err) {
//     res.status(400).json({ error: 'Error deleting project', details: err });
//   }
// });

// Create a new task
app.post("/api/tasks", auth, async (req, res) => {
  try {
    const { title, description, projectId } = req.body;
    const task = new Task({
      title,
      description,
      projectId,
    });
    await task.save();

    // Add task ID to the project
    await Project.findByIdAndUpdate(projectId, { $push: { tasks: task._id } });

    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: "Error creating task", details: err });
  }
});

// Add a new task to a specific project
app.post("/api/projects/:id/tasks", auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project || project.userId.toString() !== req.user.id) {
      return res.status(404).json({ error: "Project not found" });
    }

    const newTask = new Task({
      title: req.body.title,
      description: req.body.description,
      status: "In Progress",
      projectId: project._id,
    });
    await newTask.save();

    project.tasks.push(newTask._id);
    await project.save();

    res.status(201).json(newTask);
  } catch (err) {
    res.status(400).json({ error: "Error adding task", details: err });
  }
});

// Get tasks for a specific project
app.get("/api/projects/:projectId/tasks", auth, async (req, res) => {
  try {
    const tasks = await Task.find({ projectId: req.params.projectId });
    res.json(tasks);
  } catch (err) {
    res.status(400).json({ error: "Error fetching tasks", details: err });
  }
});

// Helper function to update project status
async function updateProjectStatus(projectId) {
  try {
    // Fetch the project and its tasks
    const project = await Project.findById(projectId).populate("tasks");
    if (!project) {
      throw new Error("Project not found");
    }

    // Check if all tasks are completed
    const allTasksCompleted = project.tasks.every(
      (task) => task.status === "Completed"
    );

    // Update project status based on task completion
    const newStatus = allTasksCompleted ? "Done" : "In Progress";
    await Project.findByIdAndUpdate(projectId, { status: newStatus });
  } catch (error) {
    console.error("Error updating project status:", error);
  }
}

// Update a task (for example, when changing its status)
app.patch("/api/tasks/:id", auth, async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Update project status based on task completion
    await updateProjectStatus(task.projectId);

    res.json(task);
  } catch (err) {
    res
      .status(400)
      .json({ error: "Error updating task", details: err.message });
  }
});

// Delete a task
app.delete("/api/tasks/:id", auth, async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Remove task ID from the project
    await Project.findByIdAndUpdate(task.projectId, {
      $pull: { tasks: task._id },
    });

    // Update project status based on task completion
    await updateProjectStatus(task.projectId);

    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    res
      .status(400)
      .json({ error: "Error deleting task", details: err.message });
  }
});

// Add a new comment or reply to a specific project
app.post("/api/projects/:id/comments", auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const newComment = new Comment({
      text: req.body.text,
      userId: req.user.id,
      username: user.name || "Anonymous",
      projectId: project._id,
      parentCommentId: req.body.parentCommentId || null,
    });

    await newComment.save();

    project.comments.push(newComment._id);
    await project.save();

    res.status(201).json(newComment);
  } catch (err) {
    console.error("Error adding comment:", err);
    res
      .status(400)
      .json({ error: "Error adding comment", details: err.message });
  }
});

// Get all comments for a specific project
app.get("/api/projects/:id/comments", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Fetch top-level comments and their replies
    const comments = await Comment.find({
      projectId: project._id,
      parentCommentId: null,
    })
      .populate("userId", "name")
      .populate({
        path: "replies",
        populate: {
          path: "userId",
          select: "name",
        },
      })
      .exec();

    res.status(200).json(comments);
  } catch (err) {
    console.error("Error fetching comments:", err);
    res
      .status(400)
      .json({ error: "Error fetching comments", details: err.message });
  }
});

// Start the Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

document.addEventListener("DOMContentLoaded", function () {
  const taskList = document.getElementById("taskList")
  const completedTaskList = document.getElementById("completedTaskList")
  const newTaskInput = document.getElementById("newTaskInput")
  const addTaskButton = document.getElementById("addTaskButton")
  const addIcon = document.getElementById("addIcon")

  let tasks = []
  let completedTasks = []
  let taskCounter = 1

  initApp()

  newTaskInput.addEventListener("input", handleInputChange)
  addTaskButton.addEventListener("click", addTask)

  async function initApp() {
    await loadTasksFromCache()
    renderTasks()
  }

  async function loadTasksFromCache() {
    try {
      const response = await fetch("/api/tasks")
      const data = await response.json()
      tasks = data.tasks || []
      completedTasks = data.completedTasks || []

      if (tasks.length > 0 || completedTasks.length > 0) {
        const allTasks = [...tasks, ...completedTasks]
        taskCounter = Math.max(...allTasks.map((task) => task.id)) + 1
      }
    } catch (error) {}
  }

  async function saveTasksToCache() {
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tasks, completedTasks }),
      })
    } catch (error) {}
  }

  function handleInputChange(e) {
    addIcon.style.display = e.target.value ? "none" : "block"
  }

  async function addTask() {
    const taskText = newTaskInput.value.trim()
    if (!taskText) return

    const task = {
      id: taskCounter++,
      text: taskText,
      completed: false,
    }

    tasks.push(task)
    newTaskInput.value = ""
    addIcon.style.display = "block"
    await saveTasksToCache()
    renderTasks()
  }

  async function toggleTaskCompletion(id) {
    const taskIndex = tasks.findIndex((task) => task.id === id)
    if (taskIndex === -1) return

    const task = tasks[taskIndex]
    task.completed = true
    completedTasks.push(task)
    tasks.splice(taskIndex, 1)
    await saveTasksToCache()
    renderTasks()
  }

  async function handleReaddTask(id) {
    const taskIndex = completedTasks.findIndex((task) => task.id === id)
    if (taskIndex === -1) return

    const task = completedTasks[taskIndex]
    task.completed = false
    tasks.push(task)
    completedTasks.splice(taskIndex, 1)
    await saveTasksToCache()
    renderTasks()
  }

  async function handleDeleteTask(id, fromCompleted) {
    if (fromCompleted) {
      completedTasks = completedTasks.filter((task) => task.id !== id)
    } else {
      tasks = tasks.filter((task) => task.id !== id)
    }
    await saveTasksToCache()
    renderTasks()
  }

  function renderTasks() {
    taskList.innerHTML = ""
    if (tasks.length === 0) {
      taskList.innerHTML =
        '<li class="empty-list-message">No tasks added to do yet!</li>'
    } else {
      tasks.forEach((task, index) => {
        const taskItem = document.createElement("li")
        taskItem.className = "task-item"
        taskItem.innerHTML = `
          <div class="left-container" id="task-${task.id}">
            <input type="checkbox" class="checkbox">
            <span class="task-text">${index + 1}, ${task.text}</span>
          </div>
          <button class="action-button" id="delete-${task.id}">
            <img src="assets/images/delete.svg" alt="Revert" class="action-icon">
          </button>
        `
        taskList.appendChild(taskItem)

        document
          .getElementById(`task-${task.id}`)
          .addEventListener("click", () => toggleTaskCompletion(task.id))
        document
          .getElementById(`delete-${task.id}`)
          .addEventListener("click", () => handleDeleteTask(task.id, false))
      })
    }

    completedTaskList.innerHTML = ""
    if (completedTasks.length === 0) {
      completedTaskList.innerHTML =
        '<li class="empty-list-message">No completed tasks yet!</li>'
    } else {
      completedTasks.forEach((task, index) => {
        const taskItem = document.createElement("li")
        taskItem.className = "task-item"
        taskItem.innerHTML = `
          <input type="checkbox" class="checkbox" checked disabled>
          <span class="task-text completed">${index + 1}, ${task.text}</span>
          <button class="action-button readd-button" id="readd-${task.id}">
            <img src="assets/images/revert.svg" alt="Revert" class="action-icon revert">
          </button>
          <button class="action-button" id="delete-completed-${task.id}">
            <img src="assets/images/delete.svg" alt="Revert" class="action-icon">
          </button>
        `
        completedTaskList.appendChild(taskItem)

        document
          .getElementById(`readd-${task.id}`)
          .addEventListener("click", () => handleReaddTask(task.id))
        document
          .getElementById(`delete-completed-${task.id}`)
          .addEventListener("click", () => handleDeleteTask(task.id, true))
      })
    }
  }
})

document
  .querySelector(".theme-checkbox")
  .addEventListener("change", function () {
    document.body.classList.toggle("dark-mode", this.checked)
    localStorage.setItem("theme", this.checked ? "dark" : "light")
  })

const themeCheckbox = document.querySelector(".theme-checkbox")
themeCheckbox.checked = localStorage.getItem("theme") === "dark"
document.body.classList.toggle("dark-mode", themeCheckbox.checked)

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/organizee/sw.js")
}

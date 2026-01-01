document.addEventListener("DOMContentLoaded", function () {
  const taskList = document.getElementById("taskList")
  const completedTaskList = document.getElementById("completedTaskList")
  const newTaskInput = document.getElementById("newTaskInput")
  const addTaskButton = document.getElementById("addTaskButton")
  const addIcon = document.getElementById("addIcon")

  let tasks = []
  let completedTasks = []
  let taskCounter = 1
  let currentlyEditingId = null
  let draggedItem = null

  initApp()

  newTaskInput.addEventListener("input", handleInputChange)
  addTaskButton.addEventListener("click", addTask)

  async function initApp() {
    await loadTasksFromCache()
    renderTasks()
  }

  async function loadTasksFromCache() {
    try {
      const response = await fetch("/organizee/api/tasks")
      const data = await response.json()
      tasks = data.tasks || []
      completedTasks = data.completedTasks || []

      if (tasks.length > 0 || completedTasks.length > 0) {
        const allTasks = [...tasks, ...completedTasks]
        taskCounter = Math.max(...allTasks.map((task) => task.id)) + 1
      }
    } catch (error) { }
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
    } catch (error) { }
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
    if (currentlyEditingId === id) return

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

  function enableTaskClick(id) {
    const taskItem = document.getElementById(`task-item-${id}`)
    if (taskItem) {
      const leftContainer = taskItem.querySelector(".left-container")
      if (leftContainer) {
        leftContainer.addEventListener("click", handleLeftContainerClick)
        leftContainer.classList.remove("editing")
      }
    }
  }

  function disableTaskClick(id) {
    const taskItem = document.getElementById(`task-item-${id}`)
    if (taskItem) {
      const leftContainer = taskItem.querySelector(".left-container")
      if (leftContainer) {
        leftContainer.removeEventListener("click", handleLeftContainerClick)
        leftContainer.classList.add("editing")
      }
    }
  }

  function handleLeftContainerClick(e) {
    if (
      !e.target.classList.contains("drag-handle") &&
      !e.target.classList.contains("drag-icon")
    ) {
      const taskItemId = e.currentTarget.id.split("-")[1]
      toggleTaskCompletion(parseInt(taskItemId))
    }
  }

  async function handleRenameTask(id) {
    if (currentlyEditingId !== null) {
      renderTasks()
    }

    const taskItem = document.querySelector(`#task-item-${id}`)
    const taskTextSpan = taskItem.querySelector(".task-text")
    const originalText = taskTextSpan.textContent.split(", ")[1]
    const leftContainer = taskItem.querySelector(".left-container")
    const actionsContainer = taskItem.querySelector(".task-item-actions")

    disableTaskClick(id)
    currentlyEditingId = id

    leftContainer.innerHTML = `
            <div class="drag-handle">
                <img src="assets/images/rearrange.svg" alt="Rearrange" class="drag-icon">
            </div>
            <input type="text" class="rename-input" value="${originalText}">
        `

    actionsContainer.innerHTML = `
        <button class="action-button done-button">
            <img src="assets/images/done.svg" alt="Done" class="action-icon done">
        </button>
        <button class="action-button cancel-button">
            <img src="assets/images/cancel.svg" alt="Cancel" class="action-icon">
        </button>
    `

    const renameInput = leftContainer.querySelector(".rename-input")
    const doneButton = actionsContainer.querySelector(".done-button")
    const cancelButton = actionsContainer.querySelector(".cancel-button")

    renameInput.focus()

    function saveRename() {
      const newText = renameInput.value.trim()
      if (newText) {
        const taskIndex = tasks.findIndex((task) => task.id === id)
        if (taskIndex !== -1) {
          tasks[taskIndex].text = newText
          saveTasksToCache().then(renderTasks)
        }
      } else {
        renderTasks()
      }
      currentlyEditingId = null
      enableTaskClick(id)
    }

    function cancelRename() {
      currentlyEditingId = null
      renderTasks()
    }

    doneButton.addEventListener("click", saveRename)
    cancelButton.addEventListener("click", cancelRename)
    renameInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") saveRename()
    })
  }

  function handleDragStart(e) {
    draggedItem = e.target.closest(".task-item")
    if (draggedItem) {
      draggedItem.classList.add("dragging")
      e.dataTransfer.setData("text/html", draggedItem.innerHTML)
      const dragHandleElement = draggedItem.querySelector(".drag-handle")
      if (dragHandleElement) {
        dragHandleElement.classList.add("dragging-handle")
      }
    }
  }

  function handleDragOver(e) {
    e.preventDefault()
    const afterElement = getDragAfterElement(this, e.clientY)
    const draggable = document.querySelector(".dragging")
    if (draggable && afterElement == null) {
      this.appendChild(draggable)
    } else if (draggable && afterElement) {
      this.insertBefore(draggable, afterElement)
    }
  }

  function handleTouchMove(e) {
    e.preventDefault()
    const touch = e.touches[0]
    const container = document.getElementById("taskList")
    const afterElement = getDragAfterElement(container, touch.clientY)
    const draggable = document.querySelector(".dragging")
    if (draggable) {
      if (afterElement == null) {
        container.appendChild(draggable)
      } else {
        container.insertBefore(draggable, afterElement)
      }
    }
  }

  function handleDragEnd() {
    if (draggedItem) {
      draggedItem.classList.remove("dragging")
      updateTaskOrder()
      draggedItem = null
      const draggingHandle = document.querySelector(".dragging-handle")
      if (draggingHandle) {
        draggingHandle.classList.remove("dragging-handle")
      }
    }
  }

  function getDragAfterElement(container, y) {
    const draggableElements = [
      ...container.querySelectorAll(".task-item:not(.dragging)"),
    ]

    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect()
        const offset = y - box.top - box.height / 2
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child }
        } else {
          return closest
        }
      },
      { offset: Number.NEGATIVE_INFINITY }
    ).element
  }

  function updateTaskOrder() {
    const newTaskOrder = Array.from(taskList.querySelectorAll(".task-item"))
      .map((item) => {
        const idMatch = item.id.match(/task-item-(\d+)/)
        return idMatch ? parseInt(idMatch[1]) : null
      })
      .filter((id) => id !== null)

    const newTasks = newTaskOrder
      .map((id) => tasks.find((task) => task.id === id))
      .filter((task) => task !== undefined)
    tasks = newTasks
    saveTasksToCache().then(renderTasks)
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
        taskItem.id = `task-item-${task.id}`
        taskItem.draggable = true
        taskItem.innerHTML = `
                    <div class="left-container" id="task-${task.id}">
                        <div class="drag-handle">
                            <img src="assets/images/rearrange.svg" alt="Rearrange" class="drag-icon">
                        </div>
                        <input type="checkbox" class="checkbox">
                        <span class="task-text">${index + 1}, ${task.text}</span>
                    </div>
                    <div class="task-item-actions">
                        <button class="action-button rename-button" data-task-id="${task.id}">
                            <img src="assets/images/rename.svg" alt="Rename" class="action-icon">
                        </button>
                        <button class="action-button delete-button" id="delete-${task.id}">
                            <img src="assets/images/delete.svg" alt="Delete" class="action-icon">
                        </button>
                    </div>
                `
        taskList.appendChild(taskItem)

        const leftContainer = taskItem.querySelector(".left-container")
        const dragHandle = leftContainer.querySelector(".drag-handle")
        if (dragHandle) {
          dragHandle.style.cursor = "grab"
          dragHandle.addEventListener("mousedown", (e) => {
            const taskItemDrag = e.target.closest(".task-item")
            if (taskItemDrag) {
              taskItemDrag.draggable = true
              draggedItem = taskItemDrag
              taskItemDrag.classList.add("dragging")
              dragHandle.classList.add("dragging-handle")
            }
          })
          dragHandle.addEventListener("mouseup", () => {
            const taskItemDrag = document.querySelector(".dragging")
            if (taskItemDrag) taskItemDrag.draggable = false
            dragHandle.classList.remove("dragging-handle")
          })
          dragHandle.addEventListener("touchstart", (e) => {
            const taskItemTouch = e.target.closest(".task-item")
            if (taskItemTouch) {
              draggedItem = taskItemTouch
              taskItemTouch.classList.add("dragging")
              dragHandle.classList.add("dragging-handle")
            }
          }, { passive: false })
          dragHandle.addEventListener("touchmove", handleTouchMove, { passive: false })
          dragHandle.addEventListener("touchend", () => handleDragEnd())
        }

        if (leftContainer && !currentlyEditingId) {
          leftContainer.addEventListener("click", handleLeftContainerClick)
          leftContainer.classList.remove("editing")
        } else if (leftContainer && currentlyEditingId === task.id) {
          leftContainer.classList.add("editing")
          leftContainer.removeEventListener("click", handleLeftContainerClick)
        }

        const renameButton = taskItem.querySelector(`.rename-button[data-task-id="${task.id}"]`)
        if (renameButton) {
          renameButton.addEventListener("click", () => handleRenameTask(task.id))
        }

        const deleteButton = document.getElementById(`delete-${task.id}`)
        if (deleteButton) {
          deleteButton.addEventListener("click", () => handleDeleteTask(task.id, false))
        }
      })
    }

    completedTaskList.innerHTML = ""
    if (completedTasks.length === 0) {
      completedTaskList.innerHTML = '<li class="empty-list-message">No completed tasks yet!</li>'
    } else {
      completedTasks.forEach((task, index) => {
        const taskItem = document.createElement("li")
        taskItem.className = "task-item"
        taskItem.innerHTML = `
                    <input type="checkbox" class="checkbox" checked disabled>
                    <span class="task-text completed">${index + 1}, ${task.text}</span>
                    <div class="task-item-actions">
                        <button class="action-button readd-button" id="readd-${task.id}">
                            <img src="assets/images/revert.svg" alt="Revert" class="action-icon revert">
                        </button>
                        <button class="action-button" id="delete-completed-${task.id}">
                            <img src="assets/images/delete.svg" alt="Delete" class="action-icon">
                        </button>
                    </div>
                `
        completedTaskList.appendChild(taskItem)
        document.getElementById(`readd-${task.id}`).addEventListener("click", () => handleReaddTask(task.id))
        document.getElementById(`delete-completed-${task.id}`).addEventListener("click", () => handleDeleteTask(task.id, true))
      })
    }

    taskList.addEventListener("dragover", handleDragOver)
    taskList.addEventListener("dragend", handleDragEnd)
  }
})

document.querySelector(".theme-checkbox").addEventListener("change", function () {
  document.body.classList.toggle("dark-mode", this.checked)
  localStorage.setItem("theme", this.checked ? "dark" : "light")
})

const themeCheckbox = document.querySelector(".theme-checkbox")
themeCheckbox.checked = localStorage.getItem("theme") === "dark"
document.body.classList.toggle("dark-mode", themeCheckbox.checked)

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/organizee/sw.js")
}
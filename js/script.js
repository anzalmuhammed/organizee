document.addEventListener("DOMContentLoaded", function () {
  const taskList = document.getElementById("taskList");
  const completedTaskList = document.getElementById("completedTaskList");
  const newTaskInput = document.getElementById("newTaskInput");
  const addTaskButton = document.getElementById("addTaskButton");
  const addIcon = document.getElementById("addIcon");
  const alarmSound = document.getElementById("alarmSound");

  const modal = document.getElementById("taskSettingsModal");
  const editTaskName = document.getElementById("editTaskName");
  const alarmEnabledToggle = document.getElementById("alarmEnabledToggle");
  const alarmSettingsFields = document.getElementById("alarmSettingsFields");
  const editTaskDate = document.getElementById("editTaskDate");
  const editTaskTime = document.getElementById("editTaskTime");
  const editAlertMode = document.getElementById("editAlertMode");
  const repeatEveryday = document.getElementById("repeatEveryday");
  const dayCheckboxes = document.querySelectorAll(".day-checkbox");
  const saveTaskSettings = document.getElementById("saveTaskSettings");
  const closeModal = document.getElementById("closeModal");

  let tasks = [];
  let completedTasks = [];
  let taskCounter = 1;
  let currentlyEditingId = null;
  let draggedItem = null;
  let activeAlarmTimeout = null;

  initApp();

  // --- WAKE UP LOGIC ---
  // If the tablet screen turns back on or user returns to tab, check alarms immediately
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      console.log("App resumed: Checking for missed alarms...");
      triggerAlarmsNow();
      scheduleNextAlarm();
    }
  });

  // --- UI Interactions ---
  newTaskInput.addEventListener("input", (e) => {
    addIcon.style.display = e.target.value ? "none" : "block";
  });

  alarmEnabledToggle.addEventListener("change", function () {
    if (this.checked) alarmSettingsFields.classList.remove("disabled-opacity");
    else alarmSettingsFields.classList.add("disabled-opacity");
  });

  repeatEveryday.addEventListener("change", (e) => {
    dayCheckboxes.forEach(cb => {
      cb.disabled = e.target.checked;
      if (e.target.checked) cb.checked = true;
    });
  });

  addTaskButton.addEventListener("click", addTask);
  newTaskInput.addEventListener("keypress", (e) => { if (e.key === "Enter") addTask(); });

  async function initApp() {
    loadTasksFromLocalStorage();
    renderTasks();
    scheduleNextAlarm();
  }

  function loadTasksFromLocalStorage() {
    const savedData = localStorage.getItem("organizee_tasks");
    if (savedData) {
      const data = JSON.parse(savedData);
      tasks = data.tasks || [];
      completedTasks = data.completedTasks || [];
      const allTasks = [...tasks, ...completedTasks];
      if (allTasks.length > 0) {
        taskCounter = Math.max(...allTasks.map(t => t.id)) + 1;
      }
    }
  }

  function saveTasksToLocalStorage() {
    localStorage.setItem("organizee_tasks", JSON.stringify({ tasks, completedTasks }));
  }

  function addTask() {
    const text = newTaskInput.value.trim();
    if (!text) return;
    tasks.push({
      id: taskCounter++,
      text: text,
      completed: false,
      alarmEnabled: false,
      reminderDate: null,
      reminderTime: null,
      alertMode: "ring",
      repeatEveryday: false,
      repeatDays: [],
      oneTimeDone: false
    });
    newTaskInput.value = "";
    addIcon.style.display = "block";
    saveTasksToLocalStorage();
    renderTasks();
  }

  function openTaskSettings(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    currentlyEditingId = id;
    editTaskName.value = task.text;
    alarmEnabledToggle.checked = task.alarmEnabled || false;
    editTaskDate.value = task.reminderDate || "";
    editTaskTime.value = task.reminderTime || "";
    editAlertMode.value = task.alertMode || "ring";
    repeatEveryday.checked = task.repeatEveryday || false;

    if (task.alarmEnabled) alarmSettingsFields.classList.remove("disabled-opacity");
    else alarmSettingsFields.classList.add("disabled-opacity");

    dayCheckboxes.forEach(cb => {
      cb.checked = task.repeatEveryday || (task.repeatDays && task.repeatDays.includes(cb.value));
      cb.disabled = task.repeatEveryday;
    });
    modal.style.display = "flex";
  }

  saveTaskSettings.addEventListener("click", async () => {
    const idx = tasks.findIndex(t => t.id === currentlyEditingId);
    if (idx === -1) return;

    if (alarmEnabledToggle.checked) {
      if (!editTaskTime.value) {
        alert("Please set a time.");
        return;
      }
      if ("Notification" in window && Notification.permission !== "granted") {
        await Notification.requestPermission();
      }
    }

    tasks[idx].text = editTaskName.value;
    tasks[idx].alarmEnabled = alarmEnabledToggle.checked;
    tasks[idx].reminderDate = alarmEnabledToggle.checked ? editTaskDate.value : null;
    tasks[idx].reminderTime = alarmEnabledToggle.checked ? editTaskTime.value : null;
    tasks[idx].alertMode = alarmEnabledToggle.checked ? editAlertMode.value : "ring";
    tasks[idx].repeatEveryday = alarmEnabledToggle.checked ? repeatEveryday.checked : false;

    let days = [];
    if (alarmEnabledToggle.checked) {
      dayCheckboxes.forEach(cb => { if (cb.checked) days.push(cb.value); });
    }
    tasks[idx].repeatDays = days;
    tasks[idx].oneTimeDone = false;

    saveTasksToLocalStorage();
    renderTasks();
    scheduleNextAlarm();
    modal.style.display = "none";
  });

  closeModal.addEventListener("click", () => modal.style.display = "none");

  // --- ALARM ENGINE ---
  function scheduleNextAlarm() {
    if (activeAlarmTimeout) clearTimeout(activeAlarmTimeout);

    const now = new Date();
    let nextTriggerTime = null;

    tasks.forEach(task => {
      if (!task.alarmEnabled || !task.reminderTime || task.oneTimeDone) return;

      const [hours, minutes] = task.reminderTime.split(':').map(Number);
      let targetDate = new Date();
      targetDate.setHours(hours, minutes, 0, 0);

      if (task.reminderDate) {
        const [y, m, d] = task.reminderDate.split('-').map(Number);
        targetDate.setFullYear(y, m - 1, d);
      }

      // If time passed, move to tomorrow (for repeating)
      if (targetDate <= now && !task.reminderDate) {
        targetDate.setDate(targetDate.getDate() + 1);
      }

      if (targetDate > now) {
        if (!nextTriggerTime || targetDate < nextTriggerTime) nextTriggerTime = targetDate;
      }
    });

    if (nextTriggerTime) {
      const delay = nextTriggerTime.getTime() - now.getTime();
      activeAlarmTimeout = setTimeout(() => {
        triggerAlarmsNow();
        scheduleNextAlarm();
      }, delay);
    }
  }

  function triggerAlarmsNow() {
    const now = new Date();
    const curTime = now.toTimeString().slice(0, 5);
    const curDate = now.toISOString().split('T')[0];
    const curDay = now.getDay().toString();

    tasks.forEach(task => {
      if (!task.alarmEnabled || task.oneTimeDone) return;

      let isTime = task.reminderTime === curTime;
      // Also trigger if we "just missed" it while the tablet was asleep (within 5 mins)
      if (!isTime && task.reminderTime < curTime) {
        const [th, tm] = task.reminderTime.split(':').map(Number);
        const taskDate = new Date();
        taskDate.setHours(th, tm, 0, 0);
        const diff = (now - taskDate) / 1000 / 60;
        if (diff > 0 && diff < 10) isTime = true; // Trigger if missed by less than 10 mins
      }

      if (isTime) {
        let trigger = false;
        if (!task.reminderDate && (!task.repeatDays.length || task.repeatEveryday || task.repeatDays.includes(curDay))) trigger = true;
        else if (task.reminderDate === curDate) trigger = true;

        if (trigger) {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Organizee", { body: task.text, icon: "assets/images/logo.png" });
          }
          if (task.alertMode === "vibrate" && "vibrate" in navigator) navigator.vibrate([500, 200, 500]);
          else alarmSound.play().catch(() => { });

          if (task.reminderDate || (!task.repeatEveryday && !task.repeatDays.length)) task.oneTimeDone = true;

          saveTasksToLocalStorage();
          renderTasks();
        }
      }
    });
  }

  function renderTasks() {
    taskList.innerHTML = "";
    if (tasks.length === 0) taskList.innerHTML = '<p style="text-align:center; opacity:0.5; padding:20px;">No tasks!</p>';

    tasks.forEach((task, index) => {
      const li = document.createElement("li");
      li.className = "task-item";
      li.id = `task-item-${task.id}`;
      li.draggable = true;
      const icon = (task.alarmEnabled && !task.oneTimeDone) ? `<img src="assets/images/alarm.svg" class="task-alarm-icon">` : '';

      li.innerHTML = `
        <div class="left-container">
          <div class="drag-handle"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
          <input type="checkbox" class="checkbox">
          <span class="task-text">${index + 1}. ${task.text} ${icon}</span>
        </div>
        <div class="task-item-actions">
          <button class="action-button more-btn"><img src="assets/images/more.svg" class="action-icon"></button>
          <button class="action-button del-btn"><img src="assets/images/delete.svg" class="action-icon delete-icon"></button>
        </div>`;

      li.addEventListener("dragstart", function () { this.classList.add("dragging"); draggedItem = this; });
      li.addEventListener("dragend", function () {
        this.classList.remove("dragging");
        const ids = Array.from(taskList.querySelectorAll(".task-item")).map(l => parseInt(l.id.replace("task-item-", "")));
        tasks = ids.map(id => tasks.find(t => t.id === id)).filter(Boolean);
        saveTasksToLocalStorage();
        renderTasks();
      });

      li.querySelector(".checkbox").addEventListener("change", () => {
        const t = tasks.splice(tasks.indexOf(task), 1)[0];
        t.completed = true;
        completedTasks.push(t);
        saveTasksToLocalStorage();
        renderTasks();
        scheduleNextAlarm();
      });
      li.querySelector(".more-btn").addEventListener("click", () => openTaskSettings(task.id));
      li.querySelector(".del-btn").addEventListener("click", () => {
        tasks = tasks.filter(t => t.id !== task.id);
        saveTasksToLocalStorage();
        renderTasks();
        scheduleNextAlarm();
      });
      taskList.appendChild(li);
    });

    completedTaskList.innerHTML = "";
    completedTasks.forEach((task, index) => {
      const li = document.createElement("li");
      li.className = "task-item";
      li.innerHTML = `
        <div class="left-container">
          <input type="checkbox" class="checkbox" checked disabled style="margin-left:30px">
          <span class="task-text completed">${index + 1}. ${task.text}</span>
        </div>
        <div class="task-item-actions">
          <button class="action-button rev-btn"><img src="assets/images/revert.svg" class="action-icon"></button>
          <button class="action-button del-btn"><img src="assets/images/delete.svg" class="action-icon delete-icon"></button>
        </div>`;

      li.querySelector(".rev-btn").addEventListener("click", () => {
        const t = completedTasks.splice(completedTasks.indexOf(task), 1)[0];
        t.completed = false;
        tasks.push(t);
        saveTasksToLocalStorage();
        renderTasks();
        scheduleNextAlarm();
      });
      li.querySelector(".del-btn").addEventListener("click", () => {
        completedTasks = completedTasks.filter(t => t.id !== task.id);
        saveTasksToLocalStorage();
        renderTasks();
      });
      completedTaskList.appendChild(li);
    });
  }

  taskList.addEventListener("dragover", (e) => {
    e.preventDefault();
    const after = [...taskList.querySelectorAll(".task-item:not(.dragging)")].reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = e.clientY - box.top - box.height / 2;
      return offset < 0 && offset > closest.offset ? { offset, element: child } : closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
    if (after == null) taskList.appendChild(draggedItem);
    else taskList.insertBefore(draggedItem, after);
  });
});

// Theme & SW Registration
const themeToggle = document.querySelector(".theme-checkbox");
themeToggle.addEventListener("change", function () {
  document.body.classList.toggle("dark-mode", this.checked);
  localStorage.setItem("theme", this.checked ? "dark" : "light");
});
if (localStorage.getItem("theme") === "dark") {
  themeToggle.checked = true;
  document.body.classList.add("dark-mode");
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/organizee/sw.js").catch(() => { });
  });
}
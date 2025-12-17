// **STATUS: In Progress
// **NOTE: make sure not to oversaturate updateProgressRing()
// -------------------------------------

// ---------------
// --- imports ---
// ---------------

import { ui } from './window-controls.js';
import { saveToDoList, loadToDoPage } from './firebase.js';

// ------------------------------
// --- DOM element references ---
// ------------------------------
const dom = {
  todo: {
    container: document.querySelector('.todo-tasks'),
    wrapper: document.querySelector('.task-list-wrapper'),
    placeholder: document.querySelector('.placeholder-container'),
    tasks: [],
  },

  goals: {
    wrapper: document.querySelector('.goal-wrapper'),
    containers: document.querySelectorAll('.goal-container'),
    inputs: document.querySelectorAll('.goal-input'),
  },

  note: {
    container: document.querySelector('.notes-container'),
    textArea: document.getElementById('notes-area'),
  },

  page: {
    clearButton: document.querySelector('.clear-page'),
  },
};

// --- state variables ---
let state = {
  allData: [],
  hoverTimer: null,
  isHovered: false,
  isDirty: false,
  currentDate: null, // safe format: YYYY-MM-DD
  prettyDate: null, // pretty format: e.g. "tue, aug 12"
  mostRecentContainer: null,
  textInput: null,
  mostRecentBox: null,
  firstTaskCreated: false,
  clickedOutside: false,
  numOfTasks: 0,
  undoTimer: null,
  tempPageData: [],
};

// -----------------
// --- functions ---
// -----------------

function setDate() {
  const today = new Date();
  state.prettyDate = ui.formatDate(today);
  document.querySelector('.date h4').textContent = state.prettyDate;
  state.currentDate = ui.formatDateToYYYYMMDD(today);
}

function resetHover(height = null) {
  if (height) {
    ui.changeStyle(dom.todo.wrapper, 'height', height);
    return;
  }
  if (state.firstTaskCreated) ui.changeStyle(dom.todo.wrapper, 'height', 'auto');
  else ui.changeStyle(dom.todo.wrapper, 'height', '100%');
}

// --- save to-do, goals, and notes to firebase ---
function triggerAutoSave(force = false) {
  if (!force && !state.isDirty) return;

  const tasksToSave = Array.from(dom.todo.wrapper.querySelectorAll('.task-container'))
    .map(container => {
      const input = container.querySelector('.task-input');
      const task = dom.todo.tasks.find(t => t.container === container);
      return {
        id: container.dataset.id,
        text: input.value.trim(),
        check: task?.check || false,
      };
    })
    .filter(t => t.text !== '');

  const goalsToSave = Array.from(dom.goals.inputs).map((input, index) => {
    const container = input.closest('.goal-container');
    const checked = container?.classList.contains('checked-container') || false;
    return {
      id: `goal-${index + 1}`,
      text: input.value.trim(),
      check: checked,
    };
  });

  const text = dom.note.textArea.innerText.trim();

  if (state.currentDate) {
    state.allData[state.currentDate] = { tasks: tasksToSave, goals: goalsToSave, text };
    saveToDoList({ tasks: tasksToSave, goals: goalsToSave, text, day: state.currentDate });
    state.isDirty = false;
  } else console.warn('Error: Current date not found.');
}

function saveTask(id, container, input, check) {
  const existingTask = dom.todo.tasks.find(t => t.id === id);
  if (existingTask) {
    existingTask.text = input.value.trim();
    if (typeof check === 'boolean') existingTask.check = check;
  } else {
    dom.todo.tasks.push({ id, container, input, text: input.value.trim(), check });
  }
  updateProgressRing();
  state.isDirty = true;
}

function clearPage() {
  state.tempPageData = {
    tasks: dom.todo.tasks.map(task => ({
      id: task.id,
      text: task.input.value.trim(),
      check: task.check,
    })),
    goals: Array.from(dom.goals.inputs).map((input, index) => {
      const container = input.closest('.goal-container');
      return {
        id: `goal-${index + 1}`,
        text: input.value.trim(),
        check: container?.classList.contains('checked-container') || false,
      };
    }),
    text: dom.note.textArea.innerText.trim(),
  };

  dom.todo.wrapper.querySelectorAll('.task-container').forEach(c => c.remove());
  dom.todo.tasks = [];
  state.numOfTasks = 0;
  dom.goals.inputs.forEach(input => {
    input.value = '';
    const container = input.closest('.goal-container');
    container?.classList.remove('checked-container');
  });
  dom.note.textArea.innerHTML = '';
  state.firstTaskCreated = false;

  updateProgressRing();
  updateGoalsProgress();
  resetHover();
}

function restorePageFromTemp() {
  if (!state.tempPageData) return console.warn('**LOG: no temp page data to restore');
  if (state.tempPageData.tasks?.length) {
    loadTasksFromData(state.tempPageData.tasks);
    state.firstTaskCreated = true;
  }
  if (state.tempPageData.goals?.length) loadGoalsFromData(state.tempPageData.goals);
  if (state.tempPageData.text) loadNotes(state.tempPageData.text);
}

// --- task creation ---
function createTaskElement(id = null) {
  const container = document.createElement('div');
  container.classList.add('task-container');
  const box = document.createElement('div');
  box.classList.add('todo-box', 'checkbox');
  ui.changeStyle(box, 'border', '1px solid var(--border)');
  const input = document.createElement('input');
  input.type = 'text';
  input.classList.add('task-input');
  const taskId = id ?? crypto.randomUUID();
  container.dataset.id = taskId;
  container.append(box, input);
  return { container, input, box, id: taskId };
}

// --- keyboard logic ---
function handleTaskKeydown(e, container, input) {
  state.isDirty = true;
  if (!e.target?.classList?.contains('task-input')) return;

  const current = e.target.closest('.task-container');
  if (!current) return;

  const isEmpty = input.value.trim() === '';

  if (e.key === 'Enter') {
    e.preventDefault();
    if (!isEmpty) {
      input.blur();
      createTaskContainer(true, current.nextElementSibling);
    } else {
      input.blur();
      deleteTask(container, input);
    }
    return;
  }

  if (e.key === 'Backspace' && isEmpty) {
    e.preventDefault();
    const prevInput = current.previousElementSibling?.querySelector('.task-input');
    deleteTask(current);
    (prevInput || dom.todo.container.querySelector('.task-container .task-input'))?.focus();
  }

  updateProgressRing();
}

// --- create new task ---
function createTaskContainer(middleInsert = false, insertBeforeEl = null) {
  const { container, input, box, id } = createTaskElement();

  if (middleInsert && insertBeforeEl) dom.todo.wrapper.insertBefore(container, insertBeforeEl);
  else dom.todo.wrapper.insertBefore(container, dom.todo.placeholder);

  enableTaskDragAndDrop();

  state.mostRecentContainer = container;
  state.textInput = input;
  state.mostRecentBox = box;
  state.isDirty = true;
  state.numOfTasks++;
  saveTask(id, container, input);

  input.focus();

  input.addEventListener('blur', () => {
    if (input.value.trim() === '') deleteTask(container);
  });

  box.addEventListener('click', () => {
    box.classList.toggle('checked');
    container.classList.toggle('checked-container');
    box.innerHTML = box.classList.contains('checked') ? '&#10003;' : '';
    const task = dom.todo.tasks.find(t => t.id === id);
    if (task) {
      task.check = !task.check;
      state.isDirty = true;
      updateProgressRing();
    }
  });

  input.addEventListener('blur', () => {
    if (input.value.trim() !== '') saveTask(container.dataset.id, container, input);
  });

  input.addEventListener('keydown', e => handleTaskKeydown(e, container, input));

  state.clickedOutside = true;
  state.isDirty = true;
}

// --- load tasks ---
function loadTasksFromData(tasks) {
  const taskDataArray = Array.isArray(tasks)
    ? tasks
    : Object.values(tasks || {}).filter(task => task.text && task.text.trim() !== '');

  clearPage();
  if (taskDataArray) {
    state.firstTaskCreated = true;
    resetHover('auto');
  }

  taskDataArray.forEach(taskData => {
    const { container, input, box, id } = createTaskElement(taskData.id);
    if (taskData.check) {
      box.classList.add('checked');
      container.classList.add('checked-container');
      box.innerHTML = '&#10003;';
    }
    input.value = taskData.text;
    saveTask(id, container, input, !!taskData.check);
    dom.todo.wrapper.insertBefore(container, dom.todo.placeholder);

    box.addEventListener('click', () => {
      box.classList.toggle('checked');
      container.classList.toggle('checked-container');
      box.innerHTML = box.classList.contains('checked') ? '&#10003;' : '';
      const task = dom.todo.tasks.find(t => t.id === taskData.id);
      if (task) {
        task.check = !task.check;
        state.isDirty = true;
        updateProgressRing();
      }
    });

    input.addEventListener('blur', () => {
      if (input.value.trim() !== '') saveTask(container.dataset.id, container, input);
    });

    input.addEventListener('keydown', e => handleTaskKeydown(e, container, input));
  });

  updateProgressRing();
  enableTaskDragAndDrop();
}

// --- drag and drop ---
function enableTaskDragAndDrop() {
  const taskContainers = dom.todo.wrapper.querySelectorAll('.task-container');

  taskContainers.forEach(task => {
    const checkbox = task.querySelector('.todo-box');
    task.draggable = false;

    checkbox.addEventListener('mousedown', () => (task.draggable = true));
    checkbox.addEventListener('mouseup', () => (task.draggable = false));

    task.addEventListener('dragstart', e => {
      if (!task.draggable) return e.preventDefault();
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', task.dataset.id);
      task.classList.add('dragging');
    });

    task.addEventListener('dragend', () => {
      task.classList.remove('dragging');
      task.draggable = false;
    });
  });

  dom.todo.wrapper.addEventListener('dragover', e => {
    e.preventDefault();
    const draggingEl = dom.todo.wrapper.querySelector('.dragging');
    const afterElement = getDragAfterElement(dom.todo.wrapper, e.clientY);
    if (afterElement == null) dom.todo.wrapper.insertBefore(draggingEl, dom.todo.placeholder);
    else dom.todo.wrapper.insertBefore(draggingEl, afterElement);
  });

  dom.todo.wrapper.addEventListener('drop', () => {
    const reorderedTasks = Array.from(dom.todo.wrapper.querySelectorAll('.task-container'))
      .map(container => dom.todo.tasks.find(t => t.id === container.dataset.id))
      .filter(Boolean);
    dom.todo.tasks = reorderedTasks;
    state.isDirty = true;
    triggerAutoSave();
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [
    ...container.querySelectorAll('.task-container:not(.dragging):not(.placeholder)'),
  ];

  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      return offset < 0 && offset > closest.offset
        ? { offset: offset, element: child }
        : closest;
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}

// --- navigation ---
function goToNextDay() {
  triggerAutoSave();
  resetHover();
  let dateObj = ui.formatStringToDate(state.currentDate);
  dateObj.setDate(dateObj.getDate() + 1);
  state.currentDate = ui.formatDateToYYYYMMDD(dateObj);
  state.prettyDate = ui.formatDate(dateObj);
  document.querySelector('.date h4').textContent = state.prettyDate;
  clearPage();
  const pageData = state.allData[state.currentDate];
  if (pageData) {
    if (pageData.tasks) loadTasksFromData(pageData.tasks);
    if (pageData.goals) loadGoalsFromData(pageData.goals);
    if (pageData.text) loadNotes(pageData.text);
  }
}

function goToPrevDay() {
  triggerAutoSave();
  resetHover();
  let dateObj = ui.formatStringToDate(state.currentDate);
  dateObj.setDate(dateObj.getDate() - 1);
  state.currentDate = ui.formatDateToYYYYMMDD(dateObj);
  state.prettyDate = ui.formatDate(dateObj);
  document.querySelector('.date h4').textContent = state.prettyDate;
  clearPage();
  const pageData = state.allData[state.currentDate];
  if (pageData) {
    if (pageData.tasks) loadTasksFromData(pageData.tasks);
    if (pageData.goals) loadGoalsFromData(pageData.goals);
    if (pageData.text) loadNotes(pageData.text);
  }
}

// --- event listeners ---
document.getElementById('next-page').addEventListener('click', goToNextDay);
document.getElementById('prev-page').addEventListener('click', goToPrevDay);
window.addEventListener('beforeunload', triggerAutoSave);

dom.todo.wrapper.addEventListener('click', e => {
  if (e.target !== dom.todo.wrapper) return;
  const hasNoTasks = state.numOfTasks === 0;
  const lastTask = dom.todo.tasks[dom.todo.tasks.length - 1];
  const lastTaskFilled = lastTask && lastTask.input.value.trim() !== '';
  if (hasNoTasks || lastTaskFilled) {
    if (hasNoTasks) {
      state.clickedOutside = false;
      state.firstTaskCreated = true;
      resetHover('auto');
    }
    createTaskContainer();
  }
});

dom.page.clearButton.addEventListener('click', () => {
  if (dom.page.clearButton.classList.contains('undo-button')) {
    dom.page.clearButton.classList.remove('undo-button');
    dom.page.clearButton.textContent = 'clear';
    clearTimeout(state.undoTimer);
    restorePageFromTemp();
    return;
  }
  clearTimeout(state.undoTimer);
  dom.page.clearButton.classList.remove('undo-button');
  void dom.page.clearButton.offsetWidth;
  dom.page.clearButton.classList.add('undo-button');
  dom.page.clearButton.textContent = 'undo';
  clearPage();
  state.undoTimer = setTimeout(() => {
    dom.page.clearButton.classList.remove('undo-button');
    dom.page.clearButton.textContent = 'clear';
    state.isDirty = true;
    triggerAutoSave(true);
  }, 30000);
});

window.onload = () => {
  setDate();
  loadToDoPage()
    .then(data => {
      state.allData = data;
      const pageData = data[state.currentDate];
      if (!pageData) {
        state.firstTaskCreated = true;
        return;
      }
      if (pageData.tasks) loadTasksFromData(pageData.tasks);
      if (pageData.goals) loadGoalsFromData(pageData.goals);
      if (pageData.text) loadNotes(pageData.text);
    })
    .catch(err => console.error('Failed to load to-do page:', err));
  resetHover();
  
  // add input listeners to all goal inputs to uncheck if emptied
  dom.goals.inputs.forEach(input => {
    input.addEventListener('input', () => {
      const container = input.closest('.goal-container');
      // if input is empty and was checked, uncheck it
      if (input.value.trim() === '' && container.classList.contains('checked-container')) {
        container.classList.remove('checked-container');
        state.isDirty = true;
        updateGoalsProgress();
      }
    });
    
    // trigger on blur to catch any changes
    input.addEventListener('blur', () => {
      state.isDirty = true;
      triggerAutoSave(true);
    });
  });
};

// --- goals checkboxes + progress ---
document.querySelectorAll('.goal-box').forEach(box => {
  const container = box.closest('.goal-container');
  const input = container.querySelector('.goal-input');
  box.addEventListener('click', () => {
    // only allow toggle if there's text in the goal input
    if (input.value.trim() === '') return;

    container.classList.toggle('checked-container');
    // css handles the checkmark with ::after pseudo-element
    state.isDirty = true;
    updateGoalsProgress();
    triggerAutoSave(true);
  });
});

function loadGoalsFromData(goalDataArray) {
  // first, clear all goals
  dom.goals.inputs.forEach(input => {
    input.value = '';
    const container = input.closest('.goal-container');
    container?.classList.remove('checked-container');
  });
  
  // then load the goal data
  dom.goals.inputs.forEach((input, index) => {
    const goal = goalDataArray[index];
    const container = input.closest('.goal-container');
    if (goal) {
      input.value = goal.text || '';
      if (goal.check) {
        container.classList.add('checked-container');
        // css handles the checkmark with ::after pseudo-element
      } else {
        container.classList.remove('checked-container');
      }
    }
  });
  updateGoalsProgress();
}

// --- misc helpers ---
function updateProgressRing() {
  const img = document.querySelector('.donut-progress');
  const total = dom.todo.tasks.length;
  const completed = dom.todo.tasks.filter(task => task.check).length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  const rounded = Math.round(percentage / 5) * 5;
  img.src = `../assets/donut-chart/themes/default/progress-${rounded}.png`;
}

function loadNotes(text) {
  const formatted = text.replace(/\n/g, '<br>');
  dom.note.textArea.innerHTML = formatted || '';
}

function updateGoalsProgress() {
  const filledGoals = Array.from(dom.goals.inputs).filter(
    input => input.value.trim() !== ''
  );

  const completedGoals = filledGoals.filter(input =>
    input.closest('.goal-container').classList.contains('checked-container')
  ).length;

  const progressBar = document.querySelector('.goals-progress-bar-fill');
  const progressLabel = document.querySelector('.goals-percent');

  const percent =
    filledGoals.length === 0
      ? 0
      : Math.round((completedGoals / filledGoals.length) * 100);

  if (progressBar) progressBar.style.width = `${percent}%`;
  if (progressLabel) progressLabel.textContent = `${percent}%`;
}
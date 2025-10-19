// NOT FINISHED
// **NOTE: make sure not to oversaturate updateProgressRing()

// -------------------------------------
// -------------- Imports --------------
// -------------------------------------

import { ui } from './window-controls.js';
import { saveToDoList, loadToDoPage } from './firebase.js';

// -------------------------------------
// ------- DOM Element References ------
// -------------------------------------

// keep all UI hooks in one structed object
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
    inputs: document.querySelectorAll('.goal-input')
  },

  note: {
    container: document.querySelector('.notes-container'),
    textArea: document.getElementById('notes-area')
  },

  page: {
    clearButton: document.querySelector('.clear-page'),
  }
}

// -------------------------------------
// ----------- State Variables ---------
// -------------------------------------

// all mutable values that control ap behavior
// **TODO: ensure all variables are being used & necessary
let state = {
  allData: [],
  hoverTimer: null,
  isHovered: false,
  isDirty: false,
  currentDate: null,  // safe format: YYYY-MM-DD
  prettyDate: null,   // pretty format: e.g. "tue, aug 12"
  mostRecentContainer: null,
  textInput: null,
  mostRecentBox: null,
  firstTaskCreated: false,
  clickedOutside: false,
  numOfTasks: 0,
  undoTimer: null,
  tempPageData: [],
}

// -------------------------------------
// -------------- Functions ------------
// -------------------------------------

/**
 * Sets the current date for the to-do page.
 * - Updates the UI with a pretty date
 * - Updates `state.currentDate` with a safe YYYY-MM-DD string for saving to the database
 */
function setDate() {
  // create a Date object for today
  const today = new Date();

  // pretty format for display in the UI
  state.prettyDate = ui.formatDate(today);
  document.querySelector('.date h4').textContent = state.prettyDate;

  // store the safe date format for backend / storage
  state.currentDate = ui.formatDateToYYYYMMDD(today); // passing Date
}

/**
 * Resets the to-do wrapper's height based on whether it's the first task or not
 * - If height is given: Set given height
 * - If no first task yet: Fill the container height (100%)
 * - If tasks already exist: Let height auto-adjust to content]
 */
function resetHover(height = null) {
  // if a specific height is given, set it as that height
  if (height) {
    ui.changeStyle(dom.todo.wrapper, 'height', height);
    return;
  }

  // else decide based on state
  if (state.firstTaskCreated) {
    ui.changeStyle(dom.todo.wrapper, 'height', 'auto');
  } else {
    ui.changeStyle(dom.todo.wrapper, 'height', '100%');
  }
}

/**
 * Saves current page data to firebase if changes exist, or if forced.
 * - Gathers tasks, goals, and notes
 * - Sends data for the current date to `saveToDoList()`
 * - Resets `isDirty` after saving
 * 
 * @param {boolean} force - if true, saves even if no changes are detected
 */
function triggerAutoSave(force = false) {
  // --- skip if no changes and not forced ---
  if (!force && !state.isDirty) return;

  // --- prepare tasks ---
  const tasksToSave = Array.from(dom.todo.wrapper.querySelectorAll('.task-container'))
    .map(container => {
      const input = container.querySelector('.task-input');
      const task = dom.todo.tasks.find(t => t.container === container);
      return {
        id: container.dataset.id,
        text: input.value.trim(),
        check: task?.check || false
      };
    })
    .filter(t => t.text !== '');

  // --- prepare goals ---
  const goalsToSave = Array.from(dom.goals.inputs).map((input, index) => {
    const container = input.closest('.goal-container');
    const checked = container?.classList.contains('checked-container') || false;
    return {
      id: `goal-${index + 1}`,
      text: input.value.trim(),
      check: checked
    };
  });

  // --- prepare notes ---
  const text = dom.note.textArea.innerText.trim();

  // --- save to local memory ---
  if (state.currentDate) {
    state.allData[state.currentDate] = {
      tasks: tasksToSave,
      goals: goalsToSave,
      text: text
    };

    // --- save to backend ---
    saveToDoList({
      tasks: tasksToSave,
      goals: goalsToSave,
      text: text,
      day: state.currentDate
    });

    state.isDirty = false;
  } else {
    console.warn('Error: Current date not found.');
  }
}

/**
 * Saves or updates a task in `dom.todo.tasks`
 * @param {string} id - unique id for the task
 * @param {HTMLElement} container - the task's container element
 * @param {HTMLInputElement} input - the task's text input
 * @param {boolean} [check = false ] - whether the task is checked 
 */
function saveTask(id, container, input, check) {
  // if task already exists in `dom.todo.tasks`, update it, else add it
  const existingTask = dom.todo.tasks.find(t => t.id === id);

  if (existingTask) {
    existingTask.text = input.value.trim();
    if (typeof check === 'boolean') {
      existingTask.check = check;
    }
  }
  else {
    dom.todo.tasks.push({
      id: id,
      container: container,
      input: input,
      text: input.value.trim(),
      check: check
    });
  }
  updateProgressRing();
  state.isDirty = true;
}

/**
 * Clears all UI elements (tasks, goals, notes) 
 * and resets related state values to their defaults.
 * Saves current page data into `state.tempPageData` before clearing.
 */
function clearPage() {
  // --- store current page data before clearing ---
  state.tempPageData = {
    tasks: dom.todo.tasks.map(task => ({
      id: task.id,
      text: task.input.value.trim(),
      check: task.check
    })),
    goals: Array.from(dom.goals.inputs).map((input, index) => ({
      id: `goal-${index + 1}`,
      text: input.value.trim()
    })),
    text: dom.note.textArea.innerText.trim()
  };

  // --- clear tasks --- 
  dom.todo.wrapper.querySelectorAll('.task-container')
    .forEach(c => c.remove());
  dom.todo.tasks = [];
  state.numOfTasks = 0;

  // --- clear goals ---
  dom.goals.inputs.forEach(input => input.value = '');

  // --- clear notes ---
  dom.note.textArea.innerHTML = '';

  state.firstTaskCreated = false;
  // --- reset progress ring ---
  updateProgressRing();
  resetHover();
}

/**
 * Restores page data from `state.tempPageData` if it exists.
 * Reloads tasks, goals, and notes exactly as they were before clearPage().
 */
function restorePageFromTemp() {
  if (!state.tempPageData) {
    console.warn('**LOG: no temp page data to restore');
    return;
  }

  // restore tasks and state
  if (state.tempPageData.tasks?.length) {
    loadTasksFromData(state.tempPageData.tasks);
    state.firstTaskCreated = true;
  }

  // restore goals
  if (state.tempPageData.goals?.length) {
    loadGoalsFromData(state.tempPageData.goals);
  }

  // restore notes
  if (state.tempPageData.text) {
    loadNotes(state.tempPageData.text);
  }

}

/**
 * Creates the base DOM structure for a new task
 * - Container: Wrapper div for the task
 * - Box: visual checkbox element
 * - Input: text input for the task description
 * 
 * @returns {{container: HTMLElement, input: HTMLInputElement, box: HTMLDivElement}}
 */
function createTaskElement(id = null) {
  // create container element
  const container = document.createElement('div');
  container.classList.add('task-container');

  // create checkbox element
  const box = document.createElement('div');
  box.classList.add('todo-box', 'checkbox');
  ui.changeStyle(box, 'border', '1px solid var(--border)');

  // create text input element
  const input = document.createElement('input');
  input.type = 'text';
  input.classList.add('task-input');

  // use id from firebase if it exists, otherwise make a new one
  const taskId = id ?? crypto.randomUUID();
  container.dataset.id = taskId;

  // append elements to container
  container.append(box, input);

  return { container, input, box, id: taskId };
}

/**
 * Handles keyboard actions for a single task input.
 * - Enter: saves current task and inserts a new one (if not empty),
 *          or deletes the task if empty
 * - Backspace: deletes empty task and focues the previous/next task
 * - Updates the progress ring after changes
 * @param {KeyboardEvent} e - the keydown event 
 * @param {HTMLElement} container - the task container element
 * @param {HTMLInputElement} input - the task's text input element
 * @returns 
 */
function handleTaskKeydown(e, container, input) {
  // mark page as having unsaved changes
  state.isDirty = true;

  // only respond to key events from task inputs
  if (!e.target?.classList?.contains('task-input')) return;

  const current = e.target.closest('.task-container');
  if (!current) return;

  const isEmpty = input.value.trim() === '';

  // --- enter ---
  // save + add new, or delete if empty
  if (e.key === 'Enter') {
    e.preventDefault();
    if (!isEmpty) {
      input.blur(); // triggers blur logic to save
      createTaskContainer(true, current.nextElementSibling);
    } else {
      input.blur();
      deleteTask(container, input);
    }
    return;
  }

  // --- backspace ---
  // delete + focus prev if empty
  if (e.key === 'Backspace' && isEmpty) {
    e.preventDefault();

    const prevInput = current.previousElementSibling?.querySelector('.task-input');
    deleteTask(current) // remove it from dom and state

    if (prevInput) {
      prevInput.focus();
    } else {
      const nextInput = dom.todo.container.querySelector('.task-container .task-input');
      nextInput?.focus();
    }
  }

  // --- update UI ---
  updateProgressRing();
}

/**
 * Creates and inserts a new task container into the to-do list
 * - Builds the DOM elements for a task (checkbox + text input)
 * - Inserts it either before a given element (middle insert) 
 *   or before the placeholder at the end
 * - Updates state + saves the task
 * - Wires event listeners: blur (delete/save), checkbox toggle, keydown
 */
function createTaskContainer(middleInsert = false, insertBeforeEl = null) {
  // --- create new task elements (container, input, checkbox, id) ---
  const { container, input, box, id } = createTaskElement();

  // --- insert into DOM ---
  if (middleInsert && insertBeforeEl) {
    dom.todo.wrapper.insertBefore(container, insertBeforeEl);
  } else {
    dom.todo.wrapper.insertBefore(container, dom.todo.placeholder);
  }

  // --- enable drag/drop for reordering ---
  enableTaskDragAndDrop();

  // --- update state with this new task ---
  state.mostRecentContainer = container;
  state.textInput = input;
  state.mostRecentBox = box;
  state.isDirty = true;
  state.numOfTasks++;

  // --- save new task to memory ---
  saveTask(id, container, input);

  // --- focus input ---
  input.focus()

  // --- event: delete empty task on blur ---
  input.addEventListener('blur', () => {
    if (input.value.trim() === '') {
      deleteTask(container);
    }
  })

  // --- toggle checkbox ---
  box.addEventListener('click', () => {
    box.classList.toggle('checked');
    container.classList.toggle('checked-container');

    // toggle checkmark
    if (box.classList.contains('checked')) {
      box.innerHTML = '&#10003;';
    } else {
      box.innerHTML = ''; // empty when unchecked
    }

    const task = dom.todo.tasks.find(t => t.id === id);
    if (task) {
      task.check = !task.check;
      state.isDirty = true;
      updateProgressRing();
    }
  });

  // --- event: save/update task on blur ---
  input.addEventListener('blur', () => {
    if (input.value.trim() !== '') {
      saveTask(container.dataset.id, container, input);
    }
  });

  // --- event: handle keyboard actions ---
  input.addEventListener('keydown', (e) => handleTaskKeydown(e, container, input));

  // --- final state update ---
  state.clickedOutside = true;
  state.isDirty = true;
}

/**
 * Loads tasks into the UI from saved data.
 * - Ensures only valid (non-empty) tasks are loaded
 * - Clears the current page before inserting tasks
 * - Wires up all necessary events for each task (checkbox, blur, keyboard)
 * - Updates the progress ring after all tasks are loaded
 * 
 * @param {Array|Object} tasks - saved tasks from backend (array or object)
 */
function loadTasksFromData(tasks) {
  // ensure we have an array of tasks and filter out any with empty text
  const taskDataArray = Array.isArray(tasks)
    ? tasks
    : Object.values(tasks || {})
      .filter(task => task.text && task.text.trim() !== '');

  // clear any existing tasks/goals/notes from the page
  clearPage()

  if (taskDataArray) {
    state.firstTaskCreated = true;
    resetHover('auto');
  }

  taskDataArray.forEach(taskData => {
    // --- build task element ---
    const { container, input, box, id } = createTaskElement(taskData.id);

    // restore checkbox state
    if (taskData.check) {
      box.classList.add('checked');
      container.classList.add('checked-container');
      box.innerHTML = '&#10003;';
    }

    // restore input text
    input.value = taskData.text;

    // save task to state
    saveTask(id, container, input, !!taskData.check)

    // insert task into the DOM before the placeholder
    dom.todo.wrapper.insertBefore(container, dom.todo.placeholder);

    // --- event: checkbox toggle ---
    box.addEventListener('click', () => {
      box.classList.toggle('checked');
      container.classList.toggle('checked-container');
      if (box.classList.contains('checked')) {
        box.innerHTML = '&#10003;';
      } else {
        box.innerHTML = '';
      }

      const task = dom.todo.tasks.find(t => t.id === taskData.id);
      if (task) {
        task.check = !task.check;
        state.isDirty = true;
        updateProgressRing();
      }
    });

    // --- event: save on blur ---
    input.addEventListener('blur', () => {
      if (input.value.trim() !== '') {
        saveTask(container.dataset.id, container, input);
      }
    });

    // --- event: handle keyboard actions ---
    input.addEventListener('keydown', (e) => handleTaskKeydown(e, container, input));
  });

  // update progress display after loading all tasks
  updateProgressRing();
  enableTaskDragAndDrop();
}

/**
 * Enables drag-and-drop reordering for all task containers
 * - Only draggable by clicking the checkbox
 * - Preserves checked state when reordering
 * - Prevents dropping after the placeholder
 */
function enableTaskDragAndDrop() {
  const taskContainers = dom.todo.wrapper.querySelectorAll('.task-container');

  taskContainers.forEach(task => {
    const checkbox = task.querySelector('.todo-box'); 
    task.draggable = false; // default: not draggable

    // --- enable drag only when checkbox is held ---
    checkbox.addEventListener('mousedown', () => {
      task.draggable = true;
    });

    checkbox.addEventListener('mouseup', () => {
      task.draggable = false;
    });

    // --- drag events ---
    task.addEventListener('dragstart', e => {
      if (!task.draggable) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', task.dataset.id);
      task.classList.add('dragging');
    });

    task.addEventListener('dragend', () => {
      task.classList.remove('dragging');
      task.draggable = false; // reset state
    });
  });

  // --- container handles positioning ---
  dom.todo.wrapper.addEventListener('dragover', e => {
    e.preventDefault();
    const draggingEl = dom.todo.wrapper.querySelector('.dragging');
    const afterElement = getDragAfterElement(dom.todo.wrapper, e.clientY);

    if (afterElement == null) {
      // default: insert before placeholder, never after
      dom.todo.wrapper.insertBefore(draggingEl, dom.todo.placeholder);
    } else {
      dom.todo.wrapper.insertBefore(draggingEl, afterElement);
    }
  });

  // --- finalize order on drop ---
  dom.todo.wrapper.addEventListener('drop', () => {
    const reorderedTasks = Array.from(dom.todo.wrapper.querySelectorAll('.task-container'))
      .map(container => dom.todo.tasks.find(t => t.id === container.dataset.id))
      .filter(Boolean);

    dom.todo.tasks = reorderedTasks;
    state.isDirty = true;
    triggerAutoSave();
  });
}

/**
 * Helper — figure out where to drop based on mouse Y
 * - Ignores placeholder element
 */
function getDragAfterElement(container, y) {
  const draggableElements = [
    ...container.querySelectorAll('.task-container:not(.dragging):not(.placeholder)')
  ];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

/**
 * Moves forward one day in the planner
 * - Saves the current page (triggerAutoSave)
 * - Updates `state.currentDate` and `state.prettyDate`
 * - Clears current UI (clearPage)
 * - Loads tasks, goals, and notes from `state.allData` if available
 */
function goToNextDay() {
  triggerAutoSave();
  resetHover();

  // --- update date state ---
  let dateObj = ui.formatStringToDate(state.currentDate);
  dateObj.setDate(dateObj.getDate() + 1);
  state.currentDate = ui.formatDateToYYYYMMDD(dateObj);

  // --- update pretty date + UI ---
  state.prettyDate = ui.formatDate(dateObj);
  document.querySelector('.date h4').textContent = state.prettyDate;

  // --- clear current page ---
  clearPage();

  // --- load data for new date if it exists ---
  if (state.allData[state.currentDate]) {
    const pageData = state.allData[state.currentDate];

    if (pageData.tasks) loadTasksFromData(pageData.tasks);
    if (pageData.goals) loadGoalsFromData(pageData.goals);
    if (pageData.text) loadNotes(pageData.text);
  }

}

/**
 * Moves backward one day in the planner
 * - Saves current page (triggerAutoSave)
 * - Updates `state.currentDate` and `state.prettyDate`
 * - Clears current UI (clearPage)
 * - Loads tasks, goals, and notes from `state.allData` if available
 */
function goToPrevDay() {
  triggerAutoSave();
  resetHover();

  // --- update date state ---
  let dateObj = ui.formatStringToDate(state.currentDate);
  dateObj.setDate(dateObj.getDate() - 1);
  state.currentDate = ui.formatDateToYYYYMMDD(dateObj);

 // --- update pretty date + UI ---
  state.prettyDate = ui.formatDate(dateObj);
  document.querySelector('.date h4').textContent = state.prettyDate;

  // --- clear current page ---
  clearPage();

  // --- load data for new date if it exists ---
  if (state.allData[state.currentDate]) {
    const pageData = state.allData[state.currentDate];

    if (pageData.tasks) loadTasksFromData(pageData.tasks);
    if (pageData.goals) loadGoalsFromData(pageData.goals);
    if (pageData.text) loadNotes(pageData.text);
  }
}

// -------------------------------------
// ---------- Event Listeners ----------
// -------------------------------------
document.getElementById('next-page').addEventListener('click', goToNextDay);
document.getElementById('prev-page').addEventListener('click', goToPrevDay);
window.addEventListener('beforeunload', triggerAutoSave);

/**
 * Handles clicks directly on the to-do container
 * - If first task: create it and set state
 * - If last task is filled: create another task
 */
dom.todo.wrapper.addEventListener('click', (e) => {
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

/**
 * Handles clear page button clicks.
 * - If undo mode is active: restores temp page data and exits undo mode
 * - If undo mode is not active: stores current data, clears page, enters undo mode
 * - Undo mode lasts 30 seconds, with animated background timer
 */
dom.page.clearButton.addEventListener('click', () => {
  // --- undo mode active: restore data and exit ---
  if (dom.page.clearButton.classList.contains('undo-button')) {
    dom.page.clearButton.classList.remove('undo-button');
    dom.page.clearButton.textContent = 'clear';
    clearTimeout(state.undoTimer);
    restorePageFromTemp();
    return;
  }

  // --- normal click: enter undo mode ---
  clearTimeout(state.undoTimer);

  // reset animation so it restarts each time
  dom.page.clearButton.classList.remove('undo-button');
  void dom.page.clearButton.offsetWidth; // force reflow

  // start animation + set text
  dom.page.clearButton.classList.add('undo-button');
  dom.page.clearButton.textContent = 'undo';

  // --- store current data + clear page ---
  clearPage();

  // --- auto-expire undo mode after 30s ---
  state.undoTimer = setTimeout(() => {
    dom.page.clearButton.classList.remove('undo-button');
    dom.page.clearButton.textContent = 'clear';

    // mark dirty + save to backend
    state.isDirty = true;
    triggerAutoSave(true);
  }, 30000);
});

/**
 * Initializes the to-do page when the window finishes loading
 * - Sets today's date in the the UI and state
 * - Fetches saved to-do data for the current date from the backend
 * - If data is found, loads tasks, goals, and notes into the UI
 */
window.onload = () => {
  // set today's date in the UI and state
  setDate();

  // loading saved data for today's date (if any)
  loadToDoPage()
    .then(data => {
      state.allData = data;
      const pageData = data[state.currentDate];

      // stops if no data exists for this date
      if (!pageData) {
        state.firstTaskCreated = true;
        return;
      }

      // populate the page with saved content
      if (pageData.tasks) loadTasksFromData(pageData.tasks);
      if (pageData.goals) loadGoalsFromData(pageData.goals);
      if (pageData.text) loadNotes(pageData.text);
    })
    .catch(err => {
      console.error('Failed to load to-do page:', err);
    });

  resetHover();
};

// -------------------------------------
// -------------------------------------
// -------------------------------------
// -------------------------------------
// -------- CURRENTLY WORKING ON -------
// -------------------------------------
// -------------------------------------
// -------------------------------------
// -------------------------------------


document.querySelectorAll('.goal-box').forEach((box, index) => {
  const container = box.closest('.goal-container');
  const input = container.querySelector('.goal-input');

  box.addEventListener('click', () => {
    container.classList.toggle('checked');
    if (container.classList.contains('checked')) {
      box.innerHTML = '&#10003;';
    } else {
      box.innerHTML = '';
    }
    state.isDirty = true;
    updateGoalsProgress();
  });
});




// NOT FINISHED
function loadGoalsFromData(goalDataArray) {
  dom.goals.inputs.forEach((input, index) => {
    const goal = goalDataArray[index];
    const container = input.closest('.goal-container');
    const box = container.querySelector('.goal-box');

    if (goal) {
      input.value = goal.text;

      // restore check state
      if (goal.check) {
        container.classList.add('checked-container');
        box.innerHTML = '&#10003;';
      } else {
        container.classList.remove('checked-container');
        box.innerHTML = '';
      }
    }
  });

  updateGoalsProgress();
}


// -------------------------------------
// -------------------------------------
// -------------------------------------
// -------------------------------------
// ------------ NOT FINISHED -----------
// -------------------------------------
// -------------------------------------
// -------------------------------------
// -------------------------------------

// NOT FINISHED
function deleteMostRecentTask() {
  const container = state.mostRecentContainer;

  if (container) {
    container.remove();

    dom.todo.tasks = dom.todo.tasks.filter(task => task.container !== container);

    state.mostRecentContainer = null;
    state.textInput = null;
    state.mostRecentBox = null;
    state.numOfTasks--;
  }
}

// NOT FINISHED
function deleteTask(container) {
  const id = container.dataset.id;
  dom.todo.tasks = dom.todo.tasks.filter(t => t.id !== id);
  container.remove();

  state.numOfTasks = Math.max(0, state.numOfTasks - 1);
  state.isDirty = true;
  updateProgressRing?.();
}

// NOT FINISHED
dom.todo.container.addEventListener('mouseenter', () => {
  state.isHovered = true;
  resetHover();

  // start watching for stillness
  state.hoverTimer = setTimeout(() => {
    if (state.isHovered) {
      dom.todo.container.classList.add('mouse-still');
    }
  }, 3000); // 3 seconds of no movement
});

// NOT FINISHED
dom.todo.container.addEventListener('mousemove', () => {
  clearTimeout(state.hoverTimer);
  dom.todo.container.classList.remove('mouse-still');

  // restart timer on movement
  state.hoverTimer = setTimeout(() => {
    if (state.isHovered) {
      dom.todo.container.classList.add('mouse-still');
    }
  }, 3000);
});

// NOT FINISHED
dom.todo.container.addEventListener('mouseleave', () => {
  state.isHovered = false;
  clearTimeout(state.hoverTimer);
  dom.todo.container.classList.remove('mouse-still');
});

// NOT FINISHED
document.querySelector('.to-do-body').addEventListener('mouseleave', () => {
  triggerAutoSave();
})

// NOT FINISHED
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    triggerAutoSave();
  }
});

// NOT FINISHED
dom.goals.inputs.forEach((input, index) => {
  input.addEventListener('keydown', (e) => {
    state.isDirty = true;
    if (e.key === 'Enter') {
      e.preventDefault(); // prevent accidental form submit or newline

      const next = dom.goals.inputs[index + 1];
      if (next) {
        next.focus();
      } else {
        input.blur(); // if it's the last input
      }
    }
  });
});

// NOT FINISHED
dom.note.textArea.addEventListener('keydown', (e) => {
  state.isDirty = true;
})

// NOT FINISHED
function updateProgressRing() {
  const img = document.querySelector('.donut-progress');

  const total = dom.todo.tasks.length;
  const completed = dom.todo.tasks.filter(task => task.check).length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  // round to nearest 5
  const rounded = Math.round(percentage / 5) * 5;

  img.src = `../assets/donut-chart/themes/default/progress-${rounded}.png`;
}

// NOT FINISHED
function loadNotes(text) {
  const formatted = text.replace(/\n/g, '<br>');
  dom.note.textArea.innerHTML = formatted || '';
}

// NOT FINISHED
function updateGoalsProgress() {
  const goals = Array.from(dom.goals.inputs);
  const totalGoals = goals.length;
  const completedGoals = goals.filter(input => 
    input.closest('.goal-container').classList.contains('checked-container')
  ).length;

  const progressBar = document.querySelector('.goal-progress-bar');
  const progressLabel = document.querySelector('.goal-progress-label');

  const percent = totalGoals === 0 ? 0 : Math.round((completedGoals / totalGoals) * 100);

  if (progressBar) {
    progressBar.style.width = `${percent}%`;
  }

  if (progressLabel) {
    progressLabel.textContent = `${percent}%`;
  }
}
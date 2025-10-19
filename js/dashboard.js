// import './firebase.js';

// window.electron.onAuthStateChanged((user) => {
//   if (user) {
//     console.log('User is logged in:', user);
//   } else {
//     console.log('User is logged out');
//   }
// });

// document.querySelector('.habit-tracker-icon').addEventListener('click', () => {
//   window.location.href = '../html/habits-page.html';
// });

document.querySelector('.to-do-list-icon').addEventListener('click', () => {
  window.location.href = '../html/to-do-list.html';
});

// document.querySelector('.journal-icon').addEventListener('click', () => {
//   window.location.href = '../html/journal.html';
// });

document.querySelectorAll(".habit-text").forEach(el => {
  if (el.scrollHeight > el.clientHeight) {
      el.style.fontSize = "12px"; // shrink font if overflowing
  } else {
      el.style.fontSize = "16px"; // keep default size
  }
});

document.querySelector('.settings').addEventListener('click', () => {
  window.location.href='../html/account-info.html';
})

console.log("🧪 window.electronAPI:", window.electronAPI);
window.electronAPI?.showWindow?.(); // try calling it directly
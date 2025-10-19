// --------------------------------------------------
// firebase setup
// --------------------------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { getDatabase, ref, set, get, remove } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-storage.js";

// --------------------------------------------------
// config
// --------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyB_9gMECHz4Td3wiKBUkYl-4VUfos5reCE",
  authDomain: "daily-planner-58515.firebaseapp.com",
  projectId: "daily-planner-58515",
  storageBucket: "daily-planner-58515.firebasestorage.app",
  messagingSenderId: "527322893154",
  appId: "1:527322893154:web:0f175de294b7d63d29ba3b",
  measurementId: "G-Z4DCZ3XQCQ",
};

// --------------------------------------------------
// initialize
// --------------------------------------------------
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

// --------------------------------------------------
// auth redirect handling
// --------------------------------------------------
let redirectInProgress = false;

onAuthStateChanged(auth, async (user) => {
  if (redirectInProgress) return;

  const currentPath = window.location.pathname;
  console.log("👤 user:", user);
  console.log("📍 path:", currentPath);

  const isAuthPage =
    currentPath.includes("login.html") ||
    currentPath.includes("signup.html") ||
    currentPath.includes("auth-check.html");

  if (user && isAuthPage) {
    // logged in → go to dashboard
    redirectInProgress = true;
    window.location.replace("../dashboard.html");
  }

  if (!user && !isAuthPage) {
    // logged out → go to login page
    redirectInProgress = true;
    window.location.replace("./auth/login.html");
  }
});

// --------------------------------------------------
// helper: get current user email for db paths
// --------------------------------------------------
function getUserEmail() {
  const user = auth.currentUser;
  if (!user) {
    console.error("User not authenticated");
    return;
  }
  return user.email.replace(/\./g, ",");
}

// --------------------------------------------------
// auth actions
// --------------------------------------------------
export function signUpUser(email, password) {
  createUserWithEmailAndPassword(auth, email, password)
    .then(() => {
      alert("account created successfully!");
      window.location.replace("../dashboard.html");
    })
    .catch((error) => {
      alert(error.message);
    });
}

export function logInUser(email, password) {
  setPersistence(auth, browserLocalPersistence)
    .then(() => signInWithEmailAndPassword(auth, email, password))
    .then(() => {
      window.location.replace("../dashboard.html");
    })
    .catch(() => {
      document.getElementById("login-error").style.display = "block";
    });
}

export function logoutUser() {
  signOut(auth)
    .then(() => {
      sessionStorage.removeItem("authStateHandled");
      window.location.replace("./auth/login.html");
    })
    .catch((error) => console.error("logout error:", error));
}

// --------------------------------------------------
// journal + to-do + pixel functions
// --------------------------------------------------
export function saveToDoList({ tasks, goals, text, day }) {
  const refPath = setRefPath("DailyTasks", day);
  set(refPath, { tasks, goals, text });
}

export function loadToDoPage() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        reject("User not authenticated");
        return;
      }
      const refPath = getRefPath("DailyTasks");
      get(refPath)
        .then((snapshot) => resolve(snapshot.exists() ? snapshot.val() : []))
        .catch(reject);
    });
  });
}

// --- (keep your journal + pixel logic here unchanged) ---

// --------------------------------------------------
// internal ref helpers
// --------------------------------------------------
function setRefPath(path, day) {
  const user = auth.currentUser;
  if (!user) {
    console.error("User not authenticated");
    return;
  }
  const emailPath = getUserEmail();
  return ref(db, `Users/${emailPath}/${path}/${day}`);
}

function getRefPath(path) {
  const user = auth.currentUser;
  if (!user) {
    console.error("User not authenticated");
    return;
  }
  const emailPath = getUserEmail();
  return ref(db, `Users/${emailPath}/${path}/`);
}

// --------------------------------------------------
// exports
// --------------------------------------------------
export { app, auth, db, storage };
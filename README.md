# My Daily  
**A cross-platform personal productivity desktop app built with Electron and Firebase**  
> “organization, reflection, and accountability — all in one place.”  

---

## Overview  
**My Daily** is a modular productivity app that unites your *to-do list*, *habit tracker*, and *digital journal* into one interactive dashboard. The goal was to create something more mindful and visually personal than the typical planner: a space that feels handmade, cozy, and intentional.  

Each day’s data (tasks, goals, moods, and journal entries) is dynamically stored, displayed, and synced through **Firebase Realtime Database**. The interface is built entirely with **HTML, CSS, and vanilla JavaScript**, wrapped in **Electron** to run as a desktop app on mac and windows.  

The project began as a lightweight daily planner and evolved into a full ecosystem — with authentication, custom themes, data visualization, and dozens of handcrafted UI elements.  

---
<p align="center">
  <img width="763px" height="612" src="https://github.com/user-attachments/assets/b375526e-f9c6-44c5-adce-9e2114e5546a" />
</p>

<p align="center">
  <img width="812" height="612" alt="image" src="https://github.com/user-attachments/assets/b2edcfcf-84a9-443e-9820-15512defd653" />
</p>

<p align="center">
  <img width="812" height="612" alt="image" src="https://github.com/user-attachments/assets/c04f3fac-7bfc-4d99-b455-eb3a8ded9641" />
</p>




## Motivation  
I wanted to build a digital space that balances structure with creativity. So many productivity tools feel sterile; I wanted *My Daily* to feel like opening a notebook, where every page is a hand-drawn, responsive, and personalized.

This project became a deep dive into front-end architecture, data management, and UI design, helping me connect code logic with visual storytelling.  

---

## Tech Stack  
| Category | Technology |
|-----------|-------------|
| **Framework** | Electron |
| **Frontend** | HTML, CSS, JavaScript |
| **Database** | Firebase Realtime Database |
| **Auth** | Firebase Authentication |
| **Storage** | Firebase Storage |
| **Design** | Custom hand-drawn pixel assets |
| **Version Control** | Git + GitHub |

---

## Core Features  
### 🗒️ Dashboard  
- central hub that links to to-do list, habit tracker, and journal  
- dynamic elements update automatically based on date and data state  

### ✅ To-Do List  
- add, check, and delete tasks inline  
- auto-save to Firebase on blur, exit, or page change  
- progress ring animation that updates in **5% increments**  
- daily navigation (previous / next day) with stored goals and notes  

### 🌱 Habit Tracker  
- create habits with custom **icons** and **color bars**  
- visual weekly tracking grid with checkboxes for each day  
- supports automatic reset every 7 days  
- designed with over **20+ color palettes** and subtle motion  

### 📖 Journal  
- create daily entries with mood tracking, text editor, and image uploads  
- supports **up to 4 photos per entry** with Firebase Storage integration  
- swipe between past entries or jump using the built-in calendar  
- built-in confirmation alerts to prevent accidental data loss  

### 💫 Mood Calendar  
- a year-at-a-glance color grid that visualizes emotional trends  
- double-click any cell to record or edit your daily mood  
- fully synced with journal data in Firebase  

### 🎨 Themes & Aesthetic  
- 7+ visual themes (default, cozy, forest, ocean, strawberry blossom, etc.)  
- all color palettes hand-picked and defined via CSS variables  
- unique pixel and ink-styled UI with 100+ custom assets  

---

## 🔐 Firebase Integration  
- **Authentication:** email/password login and signup, with validation & error handling  
- **Realtime Database:** stores user-specific data structures like:
```
Users/
└── user@email,com/
├── JournalEntries/
├── PixelColors/
└── DailyTasks/
```

- **Storage:** saves uploaded images, linked automatically to journal entries  
- **Persistence:** uses `browserLocalPersistence` so users stay logged in after closing  

---

## ⚙️ How to Run Locally  

### 1. Clone the Repository + Install Dependencies
```bash
git clone https://github.com/zainab-kho/my-daily.git
cd my-daily
npm install
```

### 2. Start the App
```bash
npm start
```
or for dev mode with hot reload:
```bash
npm run dev
```

#### 3. Firebase Setup
1.	Create a firebase project
2.	Enable authentication (email/password)
3.	Enable realtime database and storage
4.	Copy your firebase config into /src/js/firebase.js

---
## Contributing

Feedback and collaboration are welcome. feel free to open an issue or submit a pull request to suggest improvements, report bugs, or add new features.

---

## Author

Zainab Khoshnaw
- Developer & Designer
- Focus: full-stack development, UI design, and mindful tech

---

## License

Licensed under the MIT License. see LICENSE for details.

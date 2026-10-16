/* =========================================================
   TASKFLOW
   PURE HTML + CSS + JS
   localStorage based
========================================================= */

(() => {

    "use strict";

    /* =====================================================
       STORAGE
    ===================================================== */

    const STORAGE = {
        users: "taskflow_users_v3",
        session: "taskflow_session_v3",
        tasks: "taskflow_tasks_v3",
        projects: "taskflow_projects_v3",
        reminders: "taskflow_reminders_v3",
        settings: "taskflow_settings_v3",
        mode: "taskflow_mode_v3"
    };

    /* =====================================================
       HELPERS
    ===================================================== */

    const $ = selector => document.querySelector(selector);

    const getData = (key, fallback = []) => {
        try {
            return JSON.parse(localStorage.getItem(key)) ?? fallback;
        } catch {
            return fallback;
        }
    };

    const setData = (key, value) => {
        localStorage.setItem(key, JSON.stringify(value));
    };

    const uid = prefix =>
        `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const todayISO = () => {
        const d = new Date();

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    };

    const escapeHTML = value => {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    };

    const formatDate = date => {
        if (!date) return "-";

        return new Date(`${date}T00:00:00`)
            .toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric"
            });
    };

    const showToast = (message, type = "") => {

        const toast = document.createElement("div");

        toast.className = `toast ${type}`;

        toast.textContent = message;

        $("#toastContainer").appendChild(toast);

        setTimeout(() => toast.remove(), 3000);
    };

    const currentUser = () => {

        const session = getData(STORAGE.session, null);

        if (!session) return null;

        const users = getData(STORAGE.users);

        return users.find(user => user.id === session.userId) || null;
    };

    const isAdmin = () => currentUser()?.role === "admin";

    /* =====================================================
       DATA
    ===================================================== */

    let users = getData(STORAGE.users);
    let tasks = getData(STORAGE.tasks);
    let projects = getData(STORAGE.projects);
    let reminders = getData(STORAGE.reminders);

    let currentPage = "dashboard";
    let calendarDate = new Date();

    /* =====================================================
       SAVE
    ===================================================== */

    function saveAll() {

        users = getData(STORAGE.users);
        tasks = getData(STORAGE.tasks);
        projects = getData(STORAGE.projects);
        reminders = getData(STORAGE.reminders);

        render();
    }

    /* =====================================================
       INITIALIZE
    ===================================================== */

    function init() {

        if (!localStorage.getItem(STORAGE.settings)) {

            setData(STORAGE.settings, {
                theme: "light",
                notifications: false
            });

        }

        render();

        startReminderChecker();
    }

    /* =====================================================
       ENTRY PAGE
    ===================================================== */

    function renderEntry() {

        $("#app").innerHTML = `
            <div class="entry-page">

                <div class="entry-card">

                    <div class="entry-brand">

                        <h1>TaskFlow</h1>

                        <p>
                            Organize your work, manage your tasks,
                            collaborate with your team and never
                            miss an important reminder.
                        </p>

                    </div>

                    <div class="entry-content">

                        <div>
                            <h2>How will you use TaskFlow?</h2>
                            <p style="color:#64748b;margin-top:8px;">
                                Choose the workspace that matches your purpose.
                            </p>
                        </div>

                        <div class="entry-options">

                            <button
                                class="entry-option"
                                data-entry="individual">

                                <h3>👤 Individual</h3>

                                <p>
                                    Personal tasks, projects,
                                    reminders and calendar.
                                </p>

                            </button>

                            <button
                                class="entry-option"
                                data-entry="team">

                                <h3>👥 Team / Work</h3>

                                <p>
                                    Manage team projects,
                                    assignments and progress.
                                </p>

                            </button>

                        </div>

                    </div>

                </div>

            </div>
        `;

        document.querySelectorAll("[data-entry]").forEach(button => {

            button.addEventListener("click", () => {

                const mode = button.dataset.entry;

                setData(STORAGE.mode, mode);

                renderAuthChoice(mode);

            });

        });

    }

    /* =====================================================
       AUTH CHOICE
    ===================================================== */

    function renderAuthChoice(mode) {

        const title =
            mode === "individual"
                ? "Individual Workspace"
                : "Team / Work Workspace";

        $("#app").innerHTML = `
            <div class="entry-page">

                <div class="entry-card">

                    <div class="entry-brand">

                        <h1>TaskFlow</h1>

                        <p>${title}</p>

                    </div>

                    <div class="entry-content">

                        <div class="page-header">

                            <div>
                                <h2>Continue</h2>
                                <p>
                                    Choose whether you already have
                                    an account.
                                </p>
                            </div>

                            <button
                                class="btn btn-secondary"
                                id="backEntry">
                                Back
                            </button>

                        </div>

                        <div class="entry-options">

                            <button
                                class="entry-option"
                                id="loginChoice">

                                <h3>🔐 Login</h3>

                                <p>
                                    Use your existing credentials.
                                </p>

                            </button>

                            <button
                                class="entry-option"
                                id="registerChoice">

                                <h3>📝 Register</h3>

                                <p>
                                    Create a new account.
                                </p>

                            </button>

                        </div>

                    </div>

                </div>

            </div>
        `;

        $("#backEntry").onclick = renderEntry;

        $("#loginChoice").onclick = () => {

            if (mode === "team") {
                renderTeamLogin();
            } else {
                renderLogin("individual");
            }

        };

        $("#registerChoice").onclick = () => {

            if (mode === "team") {
                renderTeamRoleChoice();
            } else {
                renderIndividualRegister();
            }

        };

    }

    /* =====================================================
       TEAM ROLE CHOICE
    ===================================================== */

    function renderTeamRoleChoice() {

        $("#app").innerHTML = `
            <div class="entry-page">

                <div class="entry-card">

                    <div class="entry-brand">
                        <h1>TaskFlow</h1>
                        <p>Team / Work Registration</p>
                    </div>

                    <div class="entry-content">

                        <div class="page-header">

                            <div>
                                <h2>Choose your role</h2>
                            </div>

                            <button
                                class="btn btn-secondary"
                                id="backAuth">
                                Back
                            </button>

                        </div>

                        <div class="entry-options">

                            <button
                                class="entry-option"
                                id="adminRegister">

                                <h3>👑 Admin</h3>

                                <p>
                                    Create and manage the entire team.
                                </p>

                            </button>

                            <button
                                class="entry-option"
                                id="userRegister">

                                <h3>👤 User</h3>

                                <p>
                                    Users must receive credentials
                                    from the team admin.
                                </p>

                            </button>

                        </div>

                    </div>

                </div>

            </div>
        `;

        $("#backAuth").onclick =
            () => renderAuthChoice("team");

        $("#adminRegister").onclick =
            renderAdminRegister;

        $("#userRegister").onclick = () => {

            showToast(
                "Team users must receive credentials from their admin.",
                "error"
            );

        };

    }

    /* =====================================================
       INDIVIDUAL REGISTER
    ===================================================== */

    function renderIndividualRegister() {

        $("#app").innerHTML = `
            <div class="entry-page">

                <div class="entry-card">

                    <div class="entry-brand">

                        <h1>TaskFlow</h1>

                        <p>
                            Create your personal workspace.
                        </p>

                    </div>

                    <div class="entry-content">

                        <div class="page-header">

                            <div>
                                <h2>Individual Registration</h2>
                            </div>

                            <button
                                class="btn btn-secondary"
                                id="backBtn">
                                Back
                            </button>

                        </div>

                        <form id="individualRegisterForm" class="form">

                            <div class="form-row">

                                <div class="form-group">
                                    <label>Full Name</label>
                                    <input
                                        class="input"
                                        name="name"
                                        required>
                                </div>

                                <div class="form-group">
                                    <label>Username</label>
                                    <input
                                        class="input"
                                        name="username"
                                        required>
                                </div>

                            </div>

                            <div class="form-group">
                                <label>Email</label>
                                <input
                                    class="input"
                                    type="email"
                                    name="email"
                                    required>
                            </div>

                            <div class="form-group">
                                <label>Password</label>
                                <input
                                    class="input"
                                    type="password"
                                    name="password"
                                    required
                                    minlength="4">
                            </div>

                            <button class="btn btn-primary">
                                Create Account
                            </button>

                        </form>

                    </div>

                </div>

            </div>
        `;

        $("#backBtn").onclick =
            () => renderAuthChoice("individual");

        $("#individualRegisterForm").onsubmit = e => {

            e.preventDefault();

            const form = new FormData(e.target);

            const username =
                form.get("username").trim();

            if (users.some(u =>
                u.username.toLowerCase() === username.toLowerCase()
            )) {

                showToast(
                    "Username already exists.",
                    "error"
                );

                return;
            }

            const user = {

                id: uid("user"),

                name: form.get("name").trim(),

                username,

                email: form.get("email").trim(),

                password: form.get("password"),

                role: "user",

                mode: "individual",

                createdAt: new Date().toISOString()

            };

            users.push(user);

            setData(STORAGE.users, users);

            showToast(
                "Account created successfully.",
                "success"
            );

            renderLogin("individual");

        };

    }

    /* =====================================================
       ADMIN REGISTER
    ===================================================== */

    function renderAdminRegister() {

        $("#app").innerHTML = `
            <div class="entry-page">

                <div class="entry-card">

                    <div class="entry-brand">

                        <h1>TaskFlow</h1>

                        <p>
                            Create your team workspace.
                        </p>

                    </div>

                    <div class="entry-content">

                        <div class="page-header">

                            <div>
                                <h2>Admin Registration</h2>
                                <p>
                                    Create your admin account first.
                                </p>
                            </div>

                            <button
                                class="btn btn-secondary"
                                id="backBtn">
                                Back
                            </button>

                        </div>

                        <form id="adminRegisterForm" class="form">

                            <div class="form-row">

                                <div class="form-group">
                                    <label>Admin Name</label>
                                    <input
                                        class="input"
                                        name="name"
                                        required>
                                </div>

                                <div class="form-group">
                                    <label>Admin Username</label>
                                    <input
                                        class="input"
                                        name="username"
                                        required>
                                </div>

                            </div>

                            <div class="form-group">
                                <label>Email</label>
                                <input
                                    class="input"
                                    type="email"
                                    name="email"
                                    required>
                            </div>

                            <div class="form-group">
                                <label>Password</label>
                                <input
                                    class="input"
                                    type="password"
                                    name="password"
                                    minlength="4"
                                    required>
                            </div>

                            <div class="form-group">
                                <label>
                                    Number of team members
                                </label>

                                <input
                                    class="input"
                                    id="teamCount"
                                    type="number"
                                    min="1"
                                    max="50"
                                    value="1"
                                    required>
                            </div>

                            <button class="btn btn-primary">
                                Continue
                            </button>

                        </form>

                    </div>

                </div>

            </div>
        `;

        $("#backBtn").onclick =
            () => renderTeamRoleChoice();

        $("#adminRegisterForm").onsubmit = e => {

            e.preventDefault();

            const form = new FormData(e.target);

            const count =
                Number($("#teamCount").value);

            const admin = {

                id: uid("user"),

                name: form.get("name").trim(),

                username: form.get("username").trim(),

                email: form.get("email").trim(),

                password: form.get("password"),

                role: "admin",

                mode: "team",

                createdAt: new Date().toISOString()

            };

            if (users.some(u =>
                u.username.toLowerCase() ===
                admin.username.toLowerCase()
            )) {

                showToast(
                    "Admin username already exists.",
                    "error"
                );

                return;
            }

            users.push(admin);

            setData(STORAGE.users, users);

            renderTeamMemberCreation(admin.id, count);

        };

    }

    /* =====================================================
       TEAM MEMBER CREATION
    ===================================================== */

    function renderTeamMemberCreation(adminId, count) {

        let fields = "";

        for (let i = 1; i <= count; i++) {

            fields += `

                <div class="panel">

                    <h3>Team Member ${i}</h3>

                    <div class="form-row">

                        <div class="form-group">
                            <label>Full Name</label>
                            <input
                                class="input"
                                name="name_${i}"
                                required>
                        </div>

                        <div class="form-group">
                            <label>Username</label>
                            <input
                                class="input"
                                name="username_${i}"
                                required>
                        </div>

                    </div>

                    <div class="form-row">

                        <div class="form-group">
                            <label>Email</label>
                            <input
                                class="input"
                                type="email"
                                name="email_${i}"
                                required>
                        </div>

                        <div class="form-group">
                            <label>Password</label>
                            <input
                                class="input"
                                type="password"
                                name="password_${i}"
                                required
                                minlength="4">
                        </div>

                    </div>

                </div>
            `;
        }

        $("#app").innerHTML = `

            <div class="entry-page">

                <div class="entry-card">

                    <div class="entry-brand">

                        <h1>TaskFlow</h1>

                        <p>
                            Add your team members.
                        </p>

                    </div>

                    <div class="entry-content">

                        <h2>Create Team Credentials</h2>

                        <form id="teamCreationForm" class="form">

                            ${fields}

                            <button class="btn btn-primary">
                                Create Team
                            </button>

                        </form>

                    </div>

                </div>

            </div>
        `;

        $("#teamCreationForm").onsubmit = e => {

            e.preventDefault();

            const form = new FormData(e.target);

            const newUsers = [];

            for (let i = 1; i <= count; i++) {

                const username =
                    form.get(`username_${i}`).trim();

                if (
                    users.some(u =>
                        u.username.toLowerCase() ===
                        username.toLowerCase()
                    ) ||
                    newUsers.some(u =>
                        u.username.toLowerCase() ===
                        username.toLowerCase()
                    )
                ) {

                    showToast(
                        `Username ${username} already exists.`,
                        "error"
                    );

                    return;
                }

                newUsers.push({

                    id: uid("user"),

                    name:
                        form.get(`name_${i}`).trim(),

                    username,

                    email:
                        form.get(`email_${i}`).trim(),

                    password:
                        form.get(`password_${i}`),

                    role: "user",

                    mode: "team",

                    adminId,

                    createdAt:
                        new Date().toISOString()

                });

            }

            users.push(...newUsers);

            setData(STORAGE.users, users);

            showToast(
                "Team created successfully.",
                "success"
            );

            renderLogin("team");

        };

    }

    /* =====================================================
       LOGIN
    ===================================================== */

    function renderTeamLogin() {

        renderLogin("team");

    }

    function renderLogin(mode) {

        $("#app").innerHTML = `

            <div class="entry-page">

                <div class="entry-card">

                    <div class="entry-brand">

                        <h1>TaskFlow</h1>

                        <p>
                            ${mode === "team"
                                ? "Team / Work Login"
                                : "Individual Login"}
                        </p>

                    </div>

                    <div class="entry-content">

                        <div class="page-header">

                            <div>
                                <h2>Login</h2>
                                <p>
                                    Enter your TaskFlow credentials.
                                </p>
                            </div>

                            <button
                                class="btn btn-secondary"
                                id="backBtn">
                                Back
                            </button>

                        </div>

                        <form id="loginForm" class="form">

                            <div class="form-group">

                                <label>Username</label>

                                <input
                                    class="input"
                                    name="username"
                                    required
                                    autocomplete="username">

                            </div>

                            <div class="form-group">

                                <label>Password</label>

                                <input
                                    class="input"
                                    type="password"
                                    name="password"
                                    required
                                    autocomplete="current-password">

                            </div>

                            <p
                                id="loginError"
                                style="color:#dc2626;">
                            </p>

                            <button class="btn btn-primary">
                                Login
                            </button>

                        </form>

                    </div>

                </div>

            </div>
        `;

        $("#backBtn").onclick =
            () => renderAuthChoice(mode);

        $("#loginForm").onsubmit = e => {

            e.preventDefault();

            const form = new FormData(e.target);

            const username =
                form.get("username").trim();

            const password =
                form.get("password");

            const user = users.find(u =>

                u.username.toLowerCase() ===
                username.toLowerCase() &&

                u.password === password &&

                (
                    mode === "individual"
                        ? u.mode === "individual"
                        : u.mode === "team"
                )

            );

            if (!user) {

                $("#loginError").textContent =
                    "Incorrect username or password.";

                return;
            }

            setData(STORAGE.session, {
                userId: user.id
            });

            currentPage = "dashboard";

            render();

        };

    }

    /* =====================================================
       APP LAYOUT
    ===================================================== */

    function render() {

        const user = currentUser();

        if (!user) {

            renderEntry();

            return;
        }

        renderApp();

    }

    /* =====================================================
       APP
    ===================================================== */

    function renderApp() {

        const user = currentUser();

        const initials =
            user.name
                .split(" ")
                .map(x => x[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

        $("#app").innerHTML = `

            <div class="app-layout">

                <aside class="sidebar">

                    <div class="brand">
                        <h2>Task<span>Flow</span></h2>
                    </div>

                    <div class="user-mini">

                        <div class="avatar">
                            ${escapeHTML(initials)}
                        </div>

                        <div>

                            <strong>
                                ${escapeHTML(user.name)}
                            </strong>

                            <br>

                            <small>
                                ${user.role === "admin"
                                    ? "Administrator"
                                    : "User"}
                            </small>

                        </div>

                    </div>

                    <nav class="nav">

                        ${navButton("dashboard","🏠","Dashboard")}

                        ${navButton("tasks","✓","My Tasks")}

                        ${navButton("projects","📁","Projects")}

                        ${user.mode === "team"
                            ? navButton("team","👥","Team")
                            : ""}

                        ${navButton("calendar","📅","Calendar")}

                        ${navButton("reminders","🔔","Reminders")}

                        ${navButton("favorites","⭐","Favorites")}

                        ${navButton("settings","⚙️","Settings")}

                    </nav>

                    <div class="sidebar-bottom">

                        <button
                            class="btn btn-secondary"
                            id="notificationBtn">
                            🔔 Notifications
                        </button>

                        <button
                            class="btn btn-danger"
                            id="logoutBtn">
                            Logout
                        </button>

                    </div>

                </aside>

                <main class="main">

                    <header class="topbar">

                        <h1>
                            ${pageTitle()}
                        </h1>

                        <div class="search-box">

                            <input
                                id="globalSearch"
                                placeholder="Search tasks, projects, reminders...">

                        </div>

                        <div class="top-actions">

                            <button
                                class="btn btn-secondary"
                                id="quickAdd">
                                + Add
                            </button>

                        </div>

                    </header>

                    <section class="content" id="pageContent"></section>

                </main>

            </div>
        `;

        bindGlobalEvents();

        renderCurrentPage();

    }

    function navButton(page, icon, label) {

        return `
            <button
                class="${currentPage === page ? "active" : ""}"
                data-page="${page}">

                <span>${icon}</span>

                <span>${label}</span>

            </button>
        `;

    }

    function pageTitle() {

        const titles = {

            dashboard: "Dashboard",
            tasks: "My Tasks",
            projects: "Projects",
            team: "Team",
            calendar: "Calendar",
            reminders: "Reminders",
            favorites: "Favorites",
            settings: "Settings"

        };

        return titles[currentPage] || "TaskFlow";

    }

    /* =====================================================
       GLOBAL EVENTS
    ===================================================== */

    function bindGlobalEvents() {

        document.querySelectorAll("[data-page]")
            .forEach(button => {

                button.onclick = () => {

                    currentPage =
                        button.dataset.page;

                    render();

                };

            });

        $("#logoutBtn").onclick = () => {

            localStorage.removeItem(
                STORAGE.session
            );

            render();

        };

        $("#quickAdd").onclick = () => {

            if (currentPage === "tasks") {

                openTaskModal();

            } else if (currentPage === "projects") {

                openProjectModal();

            } else if (currentPage === "reminders") {

                openReminderModal();

            } else {

                openQuickMenu();

            }

        };

        $("#globalSearch").oninput = e => {

            const query =
                e.target.value.trim().toLowerCase();

            if (!query) {

                renderCurrentPage();

                return;
            }

            renderSearchResults(query);

        };

        $("#notificationBtn").onclick =
            requestNotifications;

    }

    /* =====================================================
       CURRENT PAGE
    ===================================================== */

    function renderCurrentPage() {

        switch (currentPage) {

            case "dashboard":
                renderDashboard();
                break;

            case "tasks":
                renderTasks();
                break;

            case "projects":
                renderProjects();
                break;

            case "team":
                renderTeam();
                break;

            case "calendar":
                renderCalendar();
                break;

            case "reminders":
                renderReminders();
                break;

            case "favorites":
                renderFavorites();
                break;

            case "settings":
                renderSettings();
                break;

            default:
                renderDashboard();

        }

    }

    /* =====================================================
       DASHBOARD
    ===================================================== */

    function renderDashboard() {

        const user = currentUser();

        const myTasks = visibleTasksForUser(user);

        const completed =
            myTasks.filter(task =>
                isTaskCompletedForUser(task, user.id)
            ).length;

        const active =
            myTasks.length - completed;

        const myProjects =
            projects.filter(project =>
                projectForUser(project, user)
            );

        const upcoming =
            visibleReminders()
                .filter(r => !r.completed)
                .sort((a,b) =>
                    reminderTimestamp(a) -
                    reminderTimestamp(b)
                )
                .slice(0, 5);

        $("#pageContent").innerHTML = `

            <div class="page">

                <div class="stats-grid">

                    ${statCard(
                        "📋",
                        "My Tasks",
                        myTasks.length
                    )}

                    ${statCard(
                        "✓",
                        "Completed",
                        completed
                    )}

                    ${statCard(
                        "⏳",
                        "Pending",
                        active
                    )}

                    ${statCard(
                        "📁",
                        "Projects",
                        myProjects.length
                    )}

                </div>

                <div class="dashboard-grid">

                    <div class="panel">

                        <div class="panel-header">

                            <h3>My Tasks</h3>

                            <button
                                class="btn btn-small btn-secondary"
                                data-page="tasks">
                                View All
                            </button>

                        </div>

                        ${renderTaskListHTML(
                            myTasks.slice(0, 5)
                        )}

                    </div>

                    <div class="panel">

                        <div class="panel-header">

                            <h3>🔔 Upcoming Reminders</h3>

                            <button
                                class="btn btn-small btn-secondary"
                                data-page="reminders">
                                View All
                            </button>

                        </div>

                        ${renderReminderListHTML(upcoming)}

                    </div>

                </div>

                ${
                    isAdmin()
                        ? renderAdminOverview()
                        : ""
                }

            </div>
        `;

        bindDynamicPageEvents();

    }

    function statCard(icon, label, value) {

        return `

            <div class="stat-card">

                <div class="stat-icon">
                    ${icon}
                </div>

                <div>

                    <small>${label}</small>

                    <strong>${value}</strong>

                </div>

            </div>
        `;

    }

    function renderAdminOverview() {

        const teamUsers =
            users.filter(u =>
                u.mode === "team" &&
                u.role === "user"
            );

        return `

            <div class="panel">

                <div class="panel-header">

                    <h3>Team Progress</h3>

                    <button
                        class="btn btn-small btn-secondary"
                        data-page="team">
                        Manage Team
                    </button>

                </div>

                <div class="team-grid">

                    ${teamUsers.slice(0,6).map(member => {

                        const memberTasks =
                            tasks.filter(task =>
                                taskHasUser(task, member.id)
                            );

                        const done =
                            memberTasks.filter(task =>
                                isTaskCompletedForUser(
                                    task,
                                    member.id
                                )
                            ).length;

                        const percent =
                            memberTasks.length
                                ? Math.round(
                                    done /
                                    memberTasks.length *
                                    100
                                )
                                : 0;

                        return `

                            <div class="member-card">

                                <div class="member-top">

                                    <div class="avatar">
                                        ${escapeHTML(
                                            member.name
                                                .split(" ")
                                                .map(x=>x[0])
                                                .join("")
                                                .slice(0,2)
                                                .toUpperCase()
                                        )}
                                    </div>

                                    <div>

                                        <strong>
                                            ${escapeHTML(member.name)}
                                        </strong>

                                        <br>

                                        <small>
                                            @${escapeHTML(member.username)}
                                        </small>

                                    </div>

                                </div>

                                <div class="progress">
                                    <div
                                        class="progress-bar"
                                        style="width:${percent}%">
                                    </div>
                                </div>

                                <span class="progress-label">
                                    ${done}/${memberTasks.length}
                                    tasks completed
                                </span>

                            </div>

                        `;

                    }).join("")}

                </div>

            </div>
        `;

    }

    /* =====================================================
       TASKS
    ===================================================== */

    function visibleTasksForUser(user) {

        if (!user) return [];

        if (user.role === "admin") {

            return tasks;

        }

        return tasks.filter(task =>
            taskHasUser(task, user.id)
        );

    }

    function taskHasUser(task, userId) {

        return Array.isArray(task.assignments) &&
            task.assignments.some(
                a => a.userId === userId
            );

    }

    function getAssignment(task, userId) {

        return task.assignments?.find(
            a => a.userId === userId
        );

    }

    function isTaskCompletedForUser(task, userId) {

        const assignment =
            getAssignment(task, userId);

        return assignment?.completed === true;

    }

    function taskProgress(task) {

        if (!task.assignments?.length)
            return 0;

        const completed =
            task.assignments.filter(
                a => a.completed
            ).length;

        return Math.round(
            completed /
            task.assignments.length *
            100
        );

    }

    function projectProgress(projectId) {

        const projectTasks =
            tasks.filter(
                task =>
                    task.projectId === projectId
            );

        let totalAssignments = 0;
        let completedAssignments = 0;

        projectTasks.forEach(task => {

            task.assignments?.forEach(a => {

                totalAssignments++;

                if (a.completed)
                    completedAssignments++;

            });

        });

        if (!totalAssignments)
            return 0;

        return Math.round(
            completedAssignments /
            totalAssignments *
            100
        );

    }

    function renderTasks() {

        const user = currentUser();

        const myTasks =
            visibleTasksForUser(user);

        $("#pageContent").innerHTML = `

            <div class="page">

                <div class="page-header">

                    <div>

                        <h2>My Tasks</h2>

                        <p>
                            ${isAdmin()
                                ? "Manage all team tasks."
                                : "Tasks assigned to you."}
                        </p>

                    </div>

                    <div class="page-actions">

                        <button
                            class="btn btn-primary"
                            id="addTaskBtn">
                            + New Task
                        </button>

                    </div>

                </div>

                <div class="filters">

                    <input
                        class="input"
                        id="taskSearch"
                        placeholder="Search tasks...">

                    <select
                        class="select"
                        id="taskStatus">

                        <option value="all">
                            All Status
                        </option>

                        <option value="pending">
                            Pending
                        </option>

                        <option value="completed">
                            Completed
                        </option>

                    </select>

                    <select
                        class="select"
                        id="taskPriority">

                        <option value="all">
                            All Priority
                        </option>

                        <option value="high">
                            High
                        </option>

                        <option value="medium">
                            Medium
                        </option>

                        <option value="low">
                            Low
                        </option>

                    </select>

                    <select
                        class="select"
                        id="taskProject">

                        <option value="all">
                            All Projects
                        </option>

                        ${projects.map(project => `

                            <option value="${project.id}">
                                ${escapeHTML(project.name)}
                            </option>

                        `).join("")}

                    </select>

                </div>

                <div id="taskList" class="task-list">

                    ${renderTaskListHTML(myTasks)}

                </div>

            </div>
        `;

        $("#addTaskBtn").onclick =
            openTaskModal;

        const filterTasks = () => {

            let filtered = [...myTasks];

            const search =
                $("#taskSearch").value
                    .toLowerCase();

            const status =
                $("#taskStatus").value;

            const priority =
                $("#taskPriority").value;

            const project =
                $("#taskProject").value;

            if (search) {

                filtered =
                    filtered.filter(task =>
                        task.title
                            .toLowerCase()
                            .includes(search)
                    );

            }

            if (status === "completed") {

                filtered =
                    filtered.filter(task =>
                        isTaskCompletedForUser(
                            task,
                            user.id
                        )
                    );

            }

            if (status === "pending") {

                filtered =
                    filtered.filter(task =>
                        !isTaskCompletedForUser(
                            task,
                            user.id
                        )
                    );

            }

            if (priority !== "all") {

                filtered =
                    filtered.filter(task =>
                        task.priority === priority
                    );

            }

            if (project !== "all") {

                filtered =
                    filtered.filter(task =>
                        task.projectId === project
                    );

            }

            $("#taskList").innerHTML =
                renderTaskListHTML(filtered);

            bindDynamicPageEvents();

        };

        [
            "taskSearch",
            "taskStatus",
            "taskPriority",
            "taskProject"
        ].forEach(id => {

            $(`#${id}`).oninput =
                filterTasks;

            $(`#${id}`).onchange =
                filterTasks;

        });

        bindDynamicPageEvents();

    }

    function renderTaskListHTML(taskList) {

        if (!taskList.length) {

            return `
                <div class="empty">
                    No tasks found.
                </div>
            `;

        }

        const user = currentUser();

        return taskList.map(task => {

            const project =
                projects.find(
                    p => p.id === task.projectId
                );

            const completed =
                user
                    ? isTaskCompletedForUser(
                        task,
                        user.id
                    )
                    : false;

            const progress =
                taskProgress(task);

            return `

                <div
                    class="task-card
                    ${completed ? "completed" : ""}">

                    ${
                        user?.role !== "admin"
                            ? `
                                <input
                                    type="checkbox"
                                    class="task-check"
                                    data-task-toggle="${task.id}"
                                    ${completed ? "checked" : ""}
                                >
                            `
                            : `
                                <div>
                                    ✓
                                </div>
                            `
                    }

                    <div class="task-info">

                        <h4>
                            ${escapeHTML(task.title)}
                        </h4>

                        <p>
                            ${escapeHTML(
                                task.description || "No description"
                            )}
                        </p>

                        <div style="margin-top:10px">

                            <span class="badge badge-${task.priority}">
                                ${escapeHTML(task.priority)}
                            </span>

                            <span class="badge">
                                ${project
                                    ? escapeHTML(project.name)
                                    : "No project"}
                            </span>

                            <span class="badge">
                                Due:
                                ${formatDate(task.dueDate)}
                            </span>

                        </div>

                        <div style="margin-top:10px">

                            <div class="progress">

                                <div
                                    class="progress-bar"
                                    style="width:${progress}%">
                                </div>

                            </div>

                            <span class="progress-label">
                                Team progress: ${progress}%
                            </span>

                        </div>

                    </div>

                    <div class="task-meta">

                        <button
                            class="btn btn-small btn-secondary"
                            data-favorite-task="${task.id}">
                            ${task.favorite ? "★" : "☆"}
                        </button>

                        ${
                            isAdmin()
                                ? `
                                    <button
                                        class="btn btn-small btn-secondary"
                                        data-edit-task="${task.id}">
                                        Edit
                                    </button>

                                    <button
                                        class="btn btn-small btn-danger"
                                        data-delete-task="${task.id}">
                                        Delete
                                    </button>
                                `
                                : ""
                        }

                    </div>

                </div>
            `;

        }).join("");

    }

    /* =====================================================
       TASK MODAL
    ===================================================== */

    function openTaskModal(taskId = null) {

        if (!isAdmin()) {

            showToast(
                "Only the admin can create or edit team tasks.",
                "error"
            );

            return;
        }

        const task =
            tasks.find(t => t.id === taskId);

        const teamUsers =
            users.filter(
                u =>
                    u.mode === "team" &&
                    u.role === "user"
            );

        const selectedUsers =
            task?.assignments?.map(
                a => a.userId
            ) || [];

        openModal(`

            <div class="modal-header">

                <h2>
                    ${task ? "Edit Task" : "Create Task"}
                </h2>

                <button
                    class="btn btn-secondary"
                    data-close-modal>
                    ✕
                </button>

            </div>

            <form id="taskForm" class="form">

                <div class="form-group">

                    <label>Task Title</label>

                    <input
                        class="input"
                        name="title"
                        value="${escapeHTML(task?.title || "")}"
                        required>

                </div>

                <div class="form-group">

                    <label>Description</label>

                    <textarea
                        class="textarea"
                        name="description">${escapeHTML(
                            task?.description || ""
                        )}</textarea>

                </div>

                <div class="form-row">

                    <div class="form-group">

                        <label>Project</label>

                        <select
                            class="select"
                            name="projectId"
                            required>

                            <option value="">
                                Select Project
                            </option>

                            ${projects.map(project => `

                                <option
                                    value="${project.id}"
                                    ${task?.projectId === project.id
                                        ? "selected"
                                        : ""}>

                                    ${escapeHTML(project.name)}

                                </option>

                            `).join("")}

                        </select>

                    </div>

                    <div class="form-group">

                        <label>Priority</label>

                        <select
                            class="select"
                            name="priority">

                            ${["high","medium","low"]
                                .map(p => `

                                <option
                                    value="${p}"
                                    ${task?.priority === p
                                        ? "selected"
                                        : ""}>

                                    ${p.toUpperCase()}

                                </option>

                            `).join("")}

                        </select>

                    </div>

                </div>

                <div class="form-group">

                    <label>Due Date</label>

                    <input
                        class="input"
                        type="date"
                        name="dueDate"
                        value="${task?.dueDate || ""}"
                        required>

                </div>

                ${
                    currentUser()?.mode === "team"
                        ? `
                            <div class="form-group">

                                <label>
                                    Assign Team Members
                                </label>

                                <div class="checkbox-grid">

                                    ${teamUsers.map(member => `

                                        <label
                                            class="checkbox-item">

                                            <input
                                                type="checkbox"
                                                name="assignedUsers"
                                                value="${member.id}"
                                                ${selectedUsers.includes(member.id)
                                                    ? "checked"
                                                    : ""}>

                                            <span>
                                                ${escapeHTML(member.name)}
                                            </span>

                                        </label>

                                    `).join("")}

                                </div>

                            </div>
                        `
                        : ""
                }

                <div class="modal-actions">

                    <button
                        type="button"
                        class="btn btn-secondary"
                        data-close-modal>
                        Cancel
                    </button>

                    <button
                        class="btn btn-primary">
                        ${task ? "Save Changes" : "Create Task"}
                    </button>

                </div>

            </form>
        `);

        $("#taskForm").onsubmit = e => {

            e.preventDefault();

            const form =
                new FormData(e.target);

            const assignedUsers =
                [...document.querySelectorAll(
                    'input[name="assignedUsers"]:checked'
                )].map(input => input.value);

            if (
                currentUser()?.mode === "team" &&
                assignedUsers.length === 0
            ) {

                showToast(
                    "Select at least one team member.",
                    "error"
                );

                return;
            }

            const assignments =
                assignedUsers.map(userId => {

                    const old =
                        task?.assignments?.find(
                            a => a.userId === userId
                        );

                    return old || {

                        userId,

                        completed: false,

                        completedAt: null

                    };

                });

            if (task) {

                task.title =
                    form.get("title").trim();

                task.description =
                    form.get("description").trim();

                task.projectId =
                    form.get("projectId");

                task.priority =
                    form.get("priority");

                task.dueDate =
                    form.get("dueDate");

                task.assignments =
                    assignments;

            } else {

                tasks.push({

                    id: uid("task"),

                    title:
                        form.get("title").trim(),

                    description:
                        form.get("description").trim(),

                    projectId:
                        form.get("projectId"),

                    priority:
                        form.get("priority"),

                    dueDate:
                        form.get("dueDate"),

                    assignments,

                    favorite: false,

                    createdBy:
                        currentUser().id,

                    createdAt:
                        new Date().toISOString()

                });

            }

            setData(STORAGE.tasks, tasks);

            closeModal();

            showToast(
                task
                    ? "Task updated."
                    : "Task created.",
                "success"
            );

            render();

        };

    }

    /* =====================================================
       TASK ACTIONS
    ===================================================== */

    function toggleTask(taskId) {

        const user =
            currentUser();

        const task =
            tasks.find(t => t.id === taskId);

        if (!task) return;

        const assignment =
            getAssignment(task, user.id);

        if (!assignment) return;

        assignment.completed =
            !assignment.completed;

        assignment.completedAt =
            assignment.completed
                ? new Date().toISOString()
                : null;

        setData(STORAGE.tasks, tasks);

        showToast(
            assignment.completed
                ? "Task marked complete."
                : "Task reopened.",
            "success"
        );

        render();

    }

    /* =====================================================
       PROJECTS
    ===================================================== */

    function projectForUser(project, user) {

        if (user.role === "admin")
            return true;

        if (user.mode === "individual")
            return true;

        return tasks.some(task =>
            task.projectId === project.id &&
            taskHasUser(task, user.id)
        );

    }

    function renderProjects() {

        const user = currentUser();

        const visible =
            projects.filter(
                p => projectForUser(p, user)
            );

        $("#pageContent").innerHTML = `

            <div class="page">

                <div class="page-header">

                    <div>

                        <h2>Projects</h2>

                        <p>
                            Track project progress.
                        </p>

                    </div>

                    <div class="page-actions">

                        <button
                            class="btn btn-primary"
                            id="newProjectBtn">
                            + New Project
                        </button>

                    </div>

                </div>

                <div class="projects-grid">

                    ${
                        visible.length
                            ? visible.map(renderProjectCard).join("")
                            : `
                                <div class="empty">
                                    No projects available.
                                </div>
                            `
                    }

                </div>

            </div>
        `;

        $("#newProjectBtn").onclick =
            openProjectModal;

        bindDynamicPageEvents();

    }

    function renderProjectCard(project) {

        const projectTasks =
            tasks.filter(
                task =>
                    task.projectId === project.id
            );

        const progress =
            projectProgress(project.id);

        return `

            <div class="project-card">

                <div class="project-header">

                    <h3>
                        ${escapeHTML(project.name)}
                    </h3>

                    <button
                        class="btn btn-small btn-secondary"
                        data-favorite-project="${project.id}">
                        ${project.favorite ? "★" : "☆"}
                    </button>

                </div>

                <p>
                    ${escapeHTML(
                        project.description ||
                        "No description."
                    )}
                </p>

                <div class="progress">

                    <div
                        class="progress-bar"
                        style="width:${progress}%">
                    </div>

                </div>

                <strong>
                    ${progress}% complete
                </strong>

                <div class="project-stats">

                    <div class="project-stat">

                        <small>Tasks</small>

                        <strong>
                            ${projectTasks.length}
                        </strong>

                    </div>

                    <div class="project-stat">

                        <small>Members</small>

                        <strong>
                            ${new Set(
                                projectTasks.flatMap(
                                    t =>
                                        t.assignments?.map(
                                            a => a.userId
                                        ) || []
                                )
                            ).size}
                        </strong>

                    </div>

                </div>

                <div class="page-actions">

                    <button
                        class="btn btn-small btn-secondary"
                        data-project-tasks="${project.id}">
                        View Tasks
                    </button>

                    ${
                        isAdmin()
                            ? `
                                <button
                                    class="btn btn-small btn-danger"
                                    data-delete-project="${project.id}">
                                    Delete
                                </button>
                            `
                            : ""
                    }

                </div>

            </div>
        `;

    }

    function openProjectModal() {

        if (!isAdmin()) {

            showToast(
                "Only the admin can create projects.",
                "error"
            );

            return;
        }

        openModal(`

            <div class="modal-header">

                <h2>Create Project</h2>

                <button
                    class="btn btn-secondary"
                    data-close-modal>
                    ✕
                </button>

            </div>

            <form id="projectForm" class="form">

                <div class="form-group">

                    <label>Project Name</label>

                    <input
                        class="input"
                        name="name"
                        required>

                </div>

                <div class="form-group">

                    <label>Description</label>

                    <textarea
                        class="textarea"
                        name="description"></textarea>

                </div>

                <div class="modal-actions">

                    <button
                        type="button"
                        class="btn btn-secondary"
                        data-close-modal>
                        Cancel
                    </button>

                    <button
                        class="btn btn-primary">
                        Create Project
                    </button>

                </div>

            </form>
        `);

        $("#projectForm").onsubmit = e => {

            e.preventDefault();

            const form =
                new FormData(e.target);

            projects.push({

                id: uid("project"),

                name:
                    form.get("name").trim(),

                description:
                    form.get("description").trim(),

                favorite: false,

                createdBy:
                    currentUser().id,

                createdAt:
                    new Date().toISOString()

            });

            setData(
                STORAGE.projects,
                projects
            );

            closeModal();

            showToast(
                "Project created.",
                "success"
            );

            render();

        };

    }

    /* =====================================================
       TEAM
    ===================================================== */

    function renderTeam() {

        if (!isAdmin()) {

            $("#pageContent").innerHTML = `

                <div class="page">

                    <div class="empty">
                        Team management is available only to admins.
                    </div>

                </div>
            `;

            return;
        }

        const team =
            users.filter(
                u =>
                    u.mode === "team" &&
                    (
                        u.role === "user" ||
                        u.role === "admin"
                    )
            );

        $("#pageContent").innerHTML = `

            <div class="page">

                <div class="page-header">

                    <div>

                        <h2>Team</h2>

                        <p>
                            Manage team members and credentials.
                        </p>

                    </div>

                    <button
                        class="btn btn-primary"
                        id="addMemberBtn">
                        + Add Member
                    </button>

                </div>

                <div class="team-grid">

                    ${team.map(member => {

                        const memberTasks =
                            tasks.filter(task =>
                                taskHasUser(
                                    task,
                                    member.id
                                )
                            );

                        const done =
                            memberTasks.filter(task =>
                                isTaskCompletedForUser(
                                    task,
                                    member.id
                                )
                            ).length;

                        return `

                            <div class="member-card">

                                <div class="member-top">

                                    <div class="avatar">
                                        ${escapeHTML(
                                            member.name
                                                .split(" ")
                                                .map(x=>x[0])
                                                .join("")
                                                .slice(0,2)
                                                .toUpperCase()
                                        )}
                                    </div>

                                    <div>

                                        <strong>
                                            ${escapeHTML(member.name)}
                                        </strong>

                                        <br>

                                        <small>
                                            @${escapeHTML(
                                                member.username
                                            )}
                                        </small>

                                    </div>

                                    <span class="badge">
                                        ${member.role}
                                    </span>

                                </div>

                                <p>
                                    ${escapeHTML(member.email)}
                                </p>

                                <div class="member-stats">

                                    <div class="member-stat">

                                        <small>Tasks</small>

                                        <strong>
                                            ${memberTasks.length}
                                        </strong>

                                    </div>

                                    <div class="member-stat">

                                        <small>Done</small>

                                        <strong>
                                            ${done}
                                        </strong>

                                    </div>

                                </div>

                                <div class="page-actions">

                                    <button
                                        class="btn btn-small btn-secondary"
                                        data-show-credentials="${member.id}">
                                        Credentials
                                    </button>

                                    ${
                                        member.role !== "admin"
                                            ? `
                                                <button
                                                    class="btn btn-small btn-danger"
                                                    data-delete-user="${member.id}">
                                                    Remove
                                                </button>
                                            `
                                            : ""
                                    }

                                </div>

                            </div>

                        `;

                    }).join("")}

                </div>

            </div>
        `;

        $("#addMemberBtn").onclick =
            () => renderAddMemberModal();

        bindDynamicPageEvents();

    }

    function renderAddMemberModal() {

        openModal(`

            <div class="modal-header">

                <h2>Add Team Member</h2>

                <button
                    class="btn btn-secondary"
                    data-close-modal>
                    ✕
                </button>

            </div>

            <form id="addMemberForm" class="form">

                <div class="form-group">
                    <label>Full Name</label>
                    <input
                        class="input"
                        name="name"
                        required>
                </div>

                <div class="form-group">
                    <label>Username</label>
                    <input
                        class="input"
                        name="username"
                        required>
                </div>

                <div class="form-group">
                    <label>Email</label>
                    <input
                        class="input"
                        type="email"
                        name="email"
                        required>
                </div>

                <div class="form-group">
                    <label>Password</label>
                    <input
                        class="input"
                        type="password"
                        name="password"
                        required>
                </div>

                <div class="modal-actions">

                    <button
                        type="button"
                        class="btn btn-secondary"
                        data-close-modal>
                        Cancel
                    </button>

                    <button class="btn btn-primary">
                        Add Member
                    </button>

                </div>

            </form>

        `);

        $("#addMemberForm").onsubmit = e => {

            e.preventDefault();

            const form =
                new FormData(e.target);

            const username =
                form.get("username").trim();

            if (
                users.some(
                    u =>
                        u.username.toLowerCase() ===
                        username.toLowerCase()
                )
            ) {

                showToast(
                    "Username already exists.",
                    "error"
                );

                return;
            }

            users.push({

                id: uid("user"),

                name:
                    form.get("name").trim(),

                username,

                email:
                    form.get("email").trim(),

                password:
                    form.get("password"),

                role: "user",

                mode: "team",

                adminId:
                    currentUser().id,

                createdAt:
                    new Date().toISOString()

            });

            setData(STORAGE.users, users);

            closeModal();

            showToast(
                "Team member added.",
                "success"
            );

            render();

        };

    }

    /* =====================================================
       CALENDAR
    ===================================================== */

    function renderCalendar() {

        const year =
            calendarDate.getFullYear();

        const month =
            calendarDate.getMonth();

        const firstDay =
            new Date(year, month, 1).getDay();

        const days =
            new Date(year, month + 1, 0).getDate();

        const previousDays =
            new Date(year, month, 0).getDate();

        const cells = [];

        for (let i = firstDay - 1; i >= 0; i--) {

            cells.push({
                day: previousDays - i,
                date: new Date(
                    year,
                    month - 1,
                    previousDays - i
                ),
                other: true
            });

        }

        for (let day = 1; day <= days; day++) {

            cells.push({
                day,
                date: new Date(year, month, day),
                other: false
            });

        }

        while (cells.length < 42) {

            const nextDay =
                cells.length -
                (firstDay + days) +
                1;

            cells.push({

                day: nextDay,

                date: new Date(
                    year,
                    month + 1,
                    nextDay
                ),

                other: true

            });

        }

        $("#pageContent").innerHTML = `

            <div class="page">

                <div class="calendar-wrapper">

                    <div class="calendar-header">

                        <button
                            class="btn btn-secondary"
                            id="prevMonth">
                            ←
                        </button>

                        <div class="calendar-title">

                            ${calendarDate.toLocaleDateString(
                                "en-IN",
                                {
                                    month: "long",
                                    year: "numeric"
                                }
                            )}

                        </div>

                        <button
                            class="btn btn-secondary"
                            id="nextMonth">
                            →
                        </button>

                    </div>

                    <div class="calendar-grid">

                        ${[
                            "Sun",
                            "Mon",
                            "Tue",
                            "Wed",
                            "Thu",
                            "Fri",
                            "Sat"
                        ].map(day => `

                            <div class="calendar-day-name">
                                ${day}
                            </div>

                        `).join("")}

                        ${cells.map(cell => {

                            const iso =
                                `${cell.date.getFullYear()}-${String(
                                    cell.date.getMonth()+1
                                ).padStart(2,"0")}-${String(
                                    cell.date.getDate()
                                ).padStart(2,"0")}`;

                            const today =
                                iso === todayISO();

                            const dayTasks =
                                visibleTasksForUser(
                                    currentUser()
                                ).filter(
                                    task =>
                                        task.dueDate === iso
                                );

                            const dayReminders =
                                visibleReminders()
                                    .filter(
                                        r =>
                                            r.date === iso
                                    );

                            return `

                                <div
                                    class="calendar-cell
                                    ${cell.other ? "other-month" : ""}
                                    ${today ? "today" : ""}">

                                    <div class="calendar-date">
                                        ${cell.day}
                                    </div>

                                    <div class="calendar-items">

                                        ${dayTasks
                                            .slice(0,3)
                                            .map(task => `

                                                <div
                                                    class="calendar-item">
                                                    ✓ ${escapeHTML(
                                                        task.title
                                                    )}
                                                </div>

                                            `).join("")}

                                        ${dayReminders
                                            .slice(0,3)
                                            .map(reminder => `

                                                <div
                                                    class="calendar-item">
                                                    🔔 ${escapeHTML(
                                                        reminder.title
                                                    )}
                                                </div>

                                            `).join("")}

                                    </div>

                                </div>
                            `;

                        }).join("")}

                    </div>

                </div>

            </div>
        `;

        $("#prevMonth").onclick = () => {

            calendarDate =
                new Date(
                    year,
                    month - 1,
                    1
                );

            renderCalendar();

        };

        $("#nextMonth").onclick = () => {

            calendarDate =
                new Date(
                    year,
                    month + 1,
                    1
                );

            renderCalendar();

        };

    }

    /* =====================================================
       REMINDERS
    ===================================================== */

    function visibleReminders() {

        const user =
            currentUser();

        return reminders.filter(reminder => {

            if (user.role === "admin")
                return true;

            return (
                reminder.createdBy === user.id ||
                reminder.userIds?.includes(user.id)
            );

        });

    }

    function renderReminders() {

        const visible =
            visibleReminders();

        $("#pageContent").innerHTML = `

            <div class="page">

                <div class="page-header">

                    <div>

                        <h2>Reminders</h2>

                        <p>
                            Reminders appear in TaskFlow
                            and can trigger browser notifications.
                        </p>

                    </div>

                    <div class="page-actions">

                        <button
                            class="btn btn-secondary"
                            id="requestNotification">
                            Enable Notifications
                        </button>

                        <button
                            class="btn btn-primary"
                            id="newReminder">
                            + New Reminder
                        </button>

                    </div>

                </div>

                <div class="filters">

                    <input
                        class="input"
                        id="reminderSearch"
                        placeholder="Search reminders...">

                    <select
                        class="select"
                        id="reminderFilter">

                        <option value="all">
                            All
                        </option>

                        <option value="upcoming">
                            Upcoming
                        </option>

                        <option value="overdue">
                            Overdue
                        </option>

                        <option value="completed">
                            Completed
                        </option>

                    </select>

                </div>

                <div
                    class="reminder-grid"
                    id="reminderList">

                    ${renderReminderListHTML(visible)}

                </div>

            </div>
        `;

        $("#newReminder").onclick =
            () => openReminderModal();

        $("#requestNotification").onclick =
            requestNotifications;

        const filter = () => {

            const search =
                $("#reminderSearch")
                    .value
                    .toLowerCase();

            const type =
                $("#reminderFilter").value;

            let result =
                visibleReminders();

            if (search) {

                result =
                    result.filter(r =>
                        r.title
                            .toLowerCase()
                            .includes(search)
                    );

            }

            const today =
                todayISO();

            if (type === "completed") {

                result =
                    result.filter(r => r.completed);

            } else if (type === "overdue") {

                result =
                    result.filter(r =>
                        !r.completed &&
                        `${r.date}T${r.time}` <
                        new Date().toISOString()
                );

            } else if (type === "upcoming") {

                result =
                    result.filter(r =>
                        !r.completed &&
                        `${r.date}T${r.time}` >=
                        new Date().toISOString()
                    );

            }

            $("#reminderList").innerHTML =
                renderReminderListHTML(result);

            bindDynamicPageEvents();

        };

        $("#reminderSearch").oninput = filter;

        $("#reminderFilter").onchange = filter;

        bindDynamicPageEvents();

    }

    function renderReminderListHTML(list) {

        if (!list.length) {

            return `
                <div class="empty">
                    No reminders found.
                </div>
            `;

        }

        return list.map(reminder => {

            return `

                <div
                    class="reminder-card"
                    style="${
                        reminder.completed
                            ? "opacity:.6"
                            : ""
                    }">

                    <div class="reminder-top">

                        <div>

                            <h3>
                                ${escapeHTML(reminder.title)}
                            </h3>

                            <span class="badge">
                                ${escapeHTML(reminder.type)}
                            </span>

                        </div>

                        <button
                            class="btn btn-small btn-secondary"
                            data-favorite-reminder="${reminder.id}">
                            ${reminder.favorite ? "★" : "☆"}
                        </button>

                    </div>

                    <p>
                        ${escapeHTML(
                            reminder.description || ""
                        )}
                    </p>

                    <div class="reminder-meta">

                        <span>
                            📅 ${formatDate(reminder.date)}
                        </span>

                        <span>
                            ⏰ ${reminder.time}
                        </span>

                    </div>

                    ${
                        reminder.completed
                            ? `
                                <span class="badge">
                                    Completed
                                </span>
                            `
                            : `
                                <span class="badge badge-medium">
                                    Reminder:
                                    1 day before
                                </span>
                            `
                    }

                    <div class="page-actions">

                        ${
                            reminder.completed
                                ? `
                                    <button
                                        class="btn btn-small btn-secondary"
                                        data-reopen-reminder="${reminder.id}">
                                        Reopen
                                    </button>
                                `
                                : `
                                    <button
                                        class="btn btn-small btn-success"
                                        data-complete-reminder="${reminder.id}">
                                        Done
                                    </button>
                                `
                        }

                        <button
                            class="btn btn-small btn-secondary"
                            data-edit-reminder="${reminder.id}">
                            Edit
                        </button>

                        <button
                            class="btn btn-small btn-danger"
                            data-delete-reminder="${reminder.id}">
                            Delete
                        </button>

                    </div>

                </div>
            `;

        }).join("");

    }

    function openReminderModal(reminderId = null) {

        const reminder =
            reminders.find(
                r => r.id === reminderId
            );

        const user =
            currentUser();

        let recipientHTML = "";

        if (user.role === "admin" &&
            user.mode === "team") {

            const team =
                users.filter(
                    u =>
                        u.mode === "team" &&
                        u.role === "user"
                );

            recipientHTML = `

                <div class="form-group">

                    <label>Recipients</label>

                    <div class="checkbox-grid">

                        <label class="checkbox-item">

                            <input
                                type="checkbox"
                                id="allTeam">

                            <span>
                                Entire Team
                            </span>

                        </label>

                        ${team.map(member => `

                            <label
                                class="checkbox-item">

                                <input
                                    type="checkbox"
                                    name="reminderUsers"
                                    value="${member.id}"
                                    ${reminder?.userIds?.includes(
                                        member.id
                                    )
                                        ? "checked"
                                        : ""}>

                                <span>
                                    ${escapeHTML(
                                        member.name
                                    )}
                                </span>

                            </label>

                        `).join("")}

                    </div>

                </div>
            `;

        }

        openModal(`

            <div class="modal-header">

                <h2>
                    ${reminder
                        ? "Edit Reminder"
                        : "Create Reminder"}
                </h2>

                <button
                    class="btn btn-secondary"
                    data-close-modal>
                    ✕
                </button>

            </div>

            <form id="reminderForm" class="form">

                <div class="form-group">

                    <label>Title</label>

                    <input
                        class="input"
                        name="title"
                        value="${escapeHTML(
                            reminder?.title || ""
                        )}"
                        required>

                </div>

                <div class="form-group">

                    <label>Description</label>

                    <textarea
                        class="textarea"
                        name="description">${escapeHTML(
                            reminder?.description || ""
                        )}</textarea>

                </div>

                <div class="form-row">

                    <div class="form-group">

                        <label>Date</label>

                        <input
                            class="input"
                            type="date"
                            name="date"
                            value="${
                                reminder?.date ||
                                todayISO()
                            }"
                            required>

                    </div>

                    <div class="form-group">

                        <label>Time</label>

                        <input
                            class="input"
                            type="time"
                            name="time"
                            value="${
                                reminder?.time ||
                                "09:00"
                            }"
                            required>

                    </div>

                </div>

                <div class="form-group">

                    <label>Type</label>

                    <select
                        class="select"
                        name="type">

                        ${[
                            "Task",
                            "Meeting",
                            "Deadline",
                            "Team Event",
                            "Personal",
                            "Custom"
                        ].map(type => `

                            <option
                                value="${type}"
                                ${reminder?.type === type
                                    ? "selected"
                                    : ""}>
                                ${type}
                            </option>

                        `).join("")}

                    </select>

                </div>

                <div class="form-group">

                    <label>Reminder Timing</label>

                    <select
                        class="select"
                        name="offset">

                        <option value="1440">
                            1 day before
                        </option>

                    </select>

                </div>

                ${recipientHTML}

                <div class="modal-actions">

                    <button
                        type="button"
                        class="btn btn-secondary"
                        data-close-modal>
                        Cancel
                    </button>

                    <button
                        class="btn btn-primary">
                        ${reminder
                            ? "Save Changes"
                            : "Create Reminder"}
                    </button>

                </div>

            </form>
        `);

        $("#reminderForm").onsubmit = e => {

            e.preventDefault();

            const form =
                new FormData(e.target);

            let userIds = [];

            if (user.role === "admin" &&
                user.mode === "team") {

                const allTeam =
                    $("#allTeam")?.checked;

                const team =
                    users.filter(
                        u =>
                            u.mode === "team" &&
                            u.role === "user"
                    );

                userIds = allTeam
                    ? team.map(u => u.id)
                    : [
                        ...document.querySelectorAll(
                            'input[name="reminderUsers"]:checked'
                        )
                    ].map(
                        input => input.value
                    );

            } else {

                userIds = [user.id];

            }

            if (
                user.role === "admin" &&
                user.mode === "team" &&
                !userIds.length
            ) {

                showToast(
                    "Select at least one recipient.",
                    "error"
                );

                return;
            }

            if (reminder) {

                reminder.title =
                    form.get("title").trim();

                reminder.description =
                    form.get("description").trim();

                reminder.date =
                    form.get("date");

                reminder.time =
                    form.get("time");

                reminder.type =
                    form.get("type");

                reminder.userIds =
                    userIds;

            } else {

                reminders.push({

                    id: uid("reminder"),

                    title:
                        form.get("title").trim(),

                    description:
                        form.get("description").trim(),

                    date:
                        form.get("date"),

                    time:
                        form.get("time"),

                    type:
                        form.get("type"),

                    offsetMinutes:
                        1440,

                    userIds,

                    createdBy:
                        user.id,

                    completed: false,

                    favorite: false,

                    notified: false,

                    createdAt:
                        new Date().toISOString()

                });

            }

            setData(
                STORAGE.reminders,
                reminders
            );

            closeModal();

            showToast(
                reminder
                    ? "Reminder updated."
                    : "Reminder created.",
                "success"
            );

            render();

        };

    }

    /* =====================================================
       FAVORITES
    ===================================================== */

    function renderFavorites() {

        const favoriteTasks =
            visibleTasksForUser(currentUser())
                .filter(t => t.favorite);

        const favoriteProjects =
            projects.filter(
                p =>
                    p.favorite &&
                    projectForUser(
                        p,
                        currentUser()
                    )
            );

        const favoriteReminders =
            visibleReminders()
                .filter(r => r.favorite);

        $("#pageContent").innerHTML = `

            <div class="page">

                <div class="panel">

                    <div class="panel-header">
                        <h3>⭐ Favorite Tasks</h3>
                    </div>

                    ${renderTaskListHTML(
                        favoriteTasks
                    )}

                </div>

                <div class="panel">

                    <div class="panel-header">
                        <h3>⭐ Favorite Projects</h3>
                    </div>

                    <div class="projects-grid">

                        ${
                            favoriteProjects.length
                                ? favoriteProjects
                                    .map(
                                        renderProjectCard
                                    )
                                    .join("")
                                : `
                                    <div class="empty">
                                        No favorite projects.
                                    </div>
                                `
                        }

                    </div>

                </div>

                <div class="panel">

                    <div class="panel-header">
                        <h3>⭐ Favorite Reminders</h3>
                    </div>

                    ${renderReminderListHTML(
                        favoriteReminders
                    )}

                </div>

            </div>
        `;

        bindDynamicPageEvents();

    }

    /* =====================================================
       SETTINGS
    ===================================================== */

    function renderSettings() {

        const user =
            currentUser();

        const settings =
            getData(
                STORAGE.settings,
                {
                    theme: "light",
                    notifications: false
                }
            );

        $("#pageContent").innerHTML = `

            <div class="page">

                <div class="settings-grid">

                    <div class="setting-card">

                        <h3>Profile</h3>

                        <form id="profileForm" class="form">

                            <div class="form-group">

                                <label>Name</label>

                                <input
                                    class="input"
                                    name="name"
                                    value="${escapeHTML(
                                        user.name
                                    )}"
                                    required>

                            </div>

                            <div class="form-group">

                                <label>Email</label>

                                <input
                                    class="input"
                                    type="email"
                                    name="email"
                                    value="${escapeHTML(
                                        user.email
                                    )}"
                                    required>

                            </div>

                            <button class="btn btn-primary">
                                Save Profile
                            </button>

                        </form>

                    </div>

                    <div class="setting-card">

                        <h3>Appearance</h3>

                        <button
                            class="btn btn-secondary"
                            id="themeBtn">
                            Toggle Theme
                        </button>

                        <button
                            class="btn btn-secondary"
                            id="exportBtn">
                            Export TaskFlow Data
                        </button>

                    </div>

                    <div class="setting-card">

                        <h3>Notifications</h3>

                        <p>
                            Browser notifications are optional.
                            TaskFlow reminders still appear
                            inside the portal.
                        </p>

                        <button
                            class="btn btn-primary"
                            id="enableNotifications">
                            Enable Browser Notifications
                        </button>

                    </div>

                    <div class="setting-card">

                        <h3>Danger Zone</h3>

                        <button
                            class="btn btn-danger"
                            id="clearData">
                            Clear All TaskFlow Data
                        </button>

                    </div>

                </div>

            </div>
        `;

        $("#profileForm").onsubmit = e => {

            e.preventDefault();

            const form =
                new FormData(e.target);

            user.name =
                form.get("name").trim();

            user.email =
                form.get("email").trim();

            setData(STORAGE.users, users);

            showToast(
                "Profile updated.",
                "success"
            );

            render();

        };

        $("#themeBtn").onclick = () => {

            const current =
                getData(STORAGE.settings);

            current.theme =
                current.theme === "dark"
                    ? "light"
                    : "dark";

            setData(
                STORAGE.settings,
                current
            );

            applyTheme();

        };

        $("#exportBtn").onclick =
            exportData;

        $("#enableNotifications").onclick =
            requestNotifications;

        $("#clearData").onclick = () => {

            if (
                !confirm(
                    "This will delete all TaskFlow data. Continue?"
                )
            )
                return;

            Object.values(STORAGE)
                .forEach(key =>
                    localStorage.removeItem(key)
                );

            location.reload();

        };

    }

    /* =====================================================
       SEARCH
    ===================================================== */

    function renderSearchResults(query) {

        const user =
            currentUser();

        const taskResults =
            visibleTasksForUser(user)
                .filter(task =>
                    task.title
                        .toLowerCase()
                        .includes(query)
                );

        const projectResults =
            projects.filter(project =>
                projectForUser(project, user) &&
                project.name
                    .toLowerCase()
                    .includes(query)
            );

        const reminderResults =
            visibleReminders()
                .filter(reminder =>
                    reminder.title
                        .toLowerCase()
                        .includes(query)
                );

        $("#pageContent").innerHTML = `

            <div class="page">

                <div class="panel">

                    <h3>Search Results</h3>

                    <p style="color:#64748b;">
                        Results for:
                        <strong>${escapeHTML(query)}</strong>
                    </p>

                </div>

                <div class="panel">

                    <h3>Tasks</h3>

                    ${renderTaskListHTML(taskResults)}

                </div>

                <div class="panel">

                    <h3>Projects</h3>

                    <div class="projects-grid">

                        ${
                            projectResults.length
                                ? projectResults
                                    .map(
                                        renderProjectCard
                                    )
                                    .join("")
                                : `
                                    <div class="empty">
                                        No projects found.
                                    </div>
                                `
                        }

                    </div>

                </div>

                <div class="panel">

                    <h3>Reminders</h3>

                    ${renderReminderListHTML(
                        reminderResults
                    )}

                </div>

            </div>
        `;

        bindDynamicPageEvents();

    }

    /* =====================================================
       QUICK ADD
    ===================================================== */

    function openQuickMenu() {

        openModal(`

            <div class="modal-header">

                <h2>Quick Add</h2>

                <button
                    class="btn btn-secondary"
                    data-close-modal>
                    ✕
                </button>

            </div>

            <div class="entry-options">

                <button
                    class="entry-option"
                    id="quickTask">

                    <h3>✓ Task</h3>

                    <p>
                        Create a new task.
                    </p>

                </button>

                <button
                    class="entry-option"
                    id="quickReminder">

                    <h3>🔔 Reminder</h3>

                    <p>
                        Create a reminder.
                    </p>

                </button>

                ${
                    isAdmin()
                        ? `
                            <button
                                class="entry-option"
                                id="quickProject">

                                <h3>📁 Project</h3>

                                <p>
                                    Create a project.
                                </p>

                            </button>
                        `
                        : ""
                }

            </div>
        `);

        $("#quickTask").onclick = () => {

            closeModal();
            openTaskModal();

        };

        $("#quickReminder").onclick = () => {

            closeModal();
            openReminderModal();

        };

        $("#quickProject")?.addEventListener(
            "click",
            () => {

                closeModal();
                openProjectModal();

            }
        );

    }

    /* =====================================================
       DYNAMIC EVENTS
    ===================================================== */

    function bindDynamicPageEvents() {

        document
            .querySelectorAll("[data-page]")
            .forEach(button => {

                button.onclick = () => {

                    currentPage =
                        button.dataset.page;

                    render();

                };

            });

        document
            .querySelectorAll("[data-task-toggle]")
            .forEach(input => {

                input.onchange = () => {

                    toggleTask(
                        input.dataset.taskToggle
                    );

                };

            });

        document
            .querySelectorAll("[data-edit-task]")
            .forEach(button => {

                button.onclick = () =>
                    openTaskModal(
                        button.dataset.editTask
                    );

            });

        document
            .querySelectorAll("[data-delete-task]")
            .forEach(button => {

                button.onclick = () => {

                    if (
                        !confirm(
                            "Delete this task?"
                        )
                    )
                        return;

                    tasks =
                        tasks.filter(
                            t =>
                                t.id !==
                                button.dataset.deleteTask
                        );

                    setData(
                        STORAGE.tasks,
                        tasks
                    );

                    showToast(
                        "Task deleted.",
                        "success"
                    );

                    render();

                };

            });

        document
            .querySelectorAll("[data-favorite-task]")
            .forEach(button => {

                button.onclick = () => {

                    const task =
                        tasks.find(
                            t =>
                                t.id ===
                                button.dataset.favoriteTask
                        );

                    if (!task) return;

                    task.favorite =
                        !task.favorite;

                    setData(
                        STORAGE.tasks,
                        tasks
                    );

                    render();

                };

            });

        document
            .querySelectorAll("[data-favorite-project]")
            .forEach(button => {

                button.onclick = () => {

                    const project =
                        projects.find(
                            p =>
                                p.id ===
                                button.dataset.favoriteProject
                        );

                    if (!project) return;

                    project.favorite =
                        !project.favorite;

                    setData(
                        STORAGE.projects,
                        projects
                    );

                    render();

                };

            });

        document
            .querySelectorAll("[data-delete-project]")
            .forEach(button => {

                button.onclick = () => {

                    if (
                        !confirm(
                            "Delete this project?"
                        )
                    )
                        return;

                    const id =
                        button.dataset.deleteProject;

                    projects =
                        projects.filter(
                            p => p.id !== id
                        );

                    tasks =
                        tasks.filter(
                            t => t.projectId !== id
                        );

                    setData(
                        STORAGE.projects,
                        projects
                    );

                    setData(
                        STORAGE.tasks,
                        tasks
                    );

                    showToast(
                        "Project deleted.",
                        "success"
                    );

                    render();

                };

            });

        document
            .querySelectorAll("[data-project-tasks]")
            .forEach(button => {

                button.onclick = () => {

                    currentPage = "tasks";

                    render();

                    setTimeout(() => {

                        const select =
                            $("#taskProject");

                        if (select) {

                            select.value =
                                button.dataset.projectTasks;

                            select.dispatchEvent(
                                new Event("change")
                            );

                        }

                    }, 50);

                };

            });

        document
            .querySelectorAll("[data-show-credentials]")
            .forEach(button => {

                button.onclick = () => {

                    const user =
                        users.find(
                            u =>
                                u.id ===
                                button.dataset.showCredentials
                        );

                    if (!user) return;

                    openModal(`

                        <div class="modal-header">

                            <h2>User Credentials</h2>

                            <button
                                class="btn btn-secondary"
                                data-close-modal>
                                ✕
                            </button>

                        </div>

                        <div class="panel">

                            <p>
                                <strong>Name:</strong>
                                ${escapeHTML(user.name)}
                            </p>

                            <p>
                                <strong>Username:</strong>
                                ${escapeHTML(user.username)}
                            </p>

                            <p>
                                <strong>Email:</strong>
                                ${escapeHTML(user.email)}
                            </p>

                            <p>
                                <strong>Password:</strong>
                                ${escapeHTML(user.password)}
                            </p>

                        </div>

                    `);

                };

            });

        document
            .querySelectorAll("[data-delete-user]")
            .forEach(button => {

                button.onclick = () => {

                    if (
                        !confirm(
                            "Remove this user from the team?"
                        )
                    )
                        return;

                    const id =
                        button.dataset.deleteUser;

                    users =
                        users.filter(
                            u => u.id !== id
                        );

                    tasks.forEach(task => {

                        task.assignments =
                            task.assignments?.filter(
                                a =>
                                    a.userId !== id
                            ) || [];

                    });

                    reminders.forEach(reminder => {

                        reminder.userIds =
                            reminder.userIds?.filter(
                                userId =>
                                    userId !== id
                            ) || [];

                    });

                    setData(
                        STORAGE.users,
                        users
                    );

                    setData(
                        STORAGE.tasks,
                        tasks
                    );

                    setData(
                        STORAGE.reminders,
                        reminders
                    );

                    showToast(
                        "User removed.",
                        "success"
                    );

                    render();

                };

            });

        document
            .querySelectorAll("[data-complete-reminder]")
            .forEach(button => {

                button.onclick = () => {

                    const reminder =
                        reminders.find(
                            r =>
                                r.id ===
                                button.dataset.completeReminder
                        );

                    if (!reminder) return;

                    reminder.completed = true;

                    setData(
                        STORAGE.reminders,
                        reminders
                    );

                    render();

                };

            });

        document
            .querySelectorAll("[data-reopen-reminder]")
            .forEach(button => {

                button.onclick = () => {

                    const reminder =
                        reminders.find(
                            r =>
                                r.id ===
                                button.dataset.reopenReminder
                        );

                    if (!reminder) return;

                    reminder.completed = false;
                    reminder.notified = false;

                    setData(
                        STORAGE.reminders,
                        reminders
                    );

                    render();

                };

            });

        document
            .querySelectorAll("[data-delete-reminder]")
            .forEach(button => {

                button.onclick = () => {

                    if (
                        !confirm(
                            "Delete this reminder?"
                        )
                    )
                        return;

                    reminders =
                        reminders.filter(
                            r =>
                                r.id !==
                                button.dataset.deleteReminder
                        );

                    setData(
                        STORAGE.reminders,
                        reminders
                    );

                    render();

                };

            });

        document
            .querySelectorAll("[data-edit-reminder]")
            .forEach(button => {

                button.onclick = () =>
                    openReminderModal(
                        button.dataset.editReminder
                    );

            });

        document
            .querySelectorAll("[data-favorite-reminder]")
            .forEach(button => {

                button.onclick = () => {

                    const reminder =
                        reminders.find(
                            r =>
                                r.id ===
                                button.dataset.favoriteReminder
                        );

                    if (!reminder) return;

                    reminder.favorite =
                        !reminder.favorite;

                    setData(
                        STORAGE.reminders,
                        reminders
                    );

                    render();

                };

            });

    }

    /* =====================================================
       MODALS
    ===================================================== */

    function openModal(html) {

        $("#modalOverlay")
            .classList.remove("hidden");

        $("#modalBox").innerHTML = html;

        document
            .querySelectorAll("[data-close-modal]")
            .forEach(button =>
                button.onclick = closeModal
            );

    }

    function closeModal() {

        $("#modalOverlay")
            .classList.add("hidden");

        $("#modalBox").innerHTML = "";

    }

    $("#modalOverlay").addEventListener(
        "click",
        e => {

            if (
                e.target.id ===
                "modalOverlay"
            ) {

                closeModal();

            }

        }
    );

    document.addEventListener(
        "keydown",
        e => {

            if (e.key === "Escape") {

                closeModal();

            }

        }
    );

    /* =====================================================
       NOTIFICATIONS
    ===================================================== */

    async function requestNotifications() {

        if (!("Notification" in window)) {

            showToast(
                "This browser does not support notifications.",
                "error"
            );

            return;

        }

        const permission =
            await Notification.requestPermission();

        const settings =
            getData(STORAGE.settings);

        settings.notifications =
            permission === "granted";

        setData(
            STORAGE.settings,
            settings
        );

        if (permission === "granted") {

            showToast(
                "Browser notifications enabled.",
                "success"
            );

        } else {

            showToast(
                "Notification permission was not granted.",
                "error"
            );

        }

    }

    /* =====================================================
       REMINDER CHECKER
    ===================================================== */

    function reminderTimestamp(reminder) {

        return new Date(
            `${reminder.date}T${reminder.time}`
        ).getTime();

    }

    function startReminderChecker() {

        checkReminders();

        setInterval(
            checkReminders,
            60000
        );

    }

    function checkReminders() {

        const user =
            currentUser();

        if (!user) return;

        const settings =
            getData(STORAGE.settings);

        const now =
            Date.now();

        let changed = false;

        reminders.forEach(reminder => {

            if (reminder.completed)
                return;

            if (
                !reminder.userIds?.includes(
                    user.id
                )
            )
                return;

            const due =
                reminderTimestamp(reminder);

            const reminderTime =
                due -
                (
                    reminder.offsetMinutes *
                    60 *
                    1000
                );

            if (
                now >= reminderTime &&
                !reminder.notified
            ) {

                if (
                    settings.notifications &&
                    "Notification" in window &&
                    Notification.permission ===
                    "granted"
                ) {

                    new Notification(
                        "TaskFlow Reminder",
                        {
                            body:
                                `${reminder.title} — due ${formatDate(reminder.date)} at ${reminder.time}`
                        }
                    );

                }

                reminder.notified = true;

                changed = true;

                showToast(
                    `Reminder: ${reminder.title}`,
                    "success"
                );

            }

        });

        if (changed) {

            setData(
                STORAGE.reminders,
                reminders
            );

        }

    }

    /* =====================================================
       EXPORT
    ===================================================== */

    function exportData() {

        const data = {

            users,

            tasks,

            projects,

            reminders,

            exportedAt:
                new Date().toISOString()

        };

        const blob =
            new Blob(
                [JSON.stringify(data, null, 2)],
                {
                    type: "application/json"
                }
            );

        const url =
            URL.createObjectURL(blob);

        const a =
            document.createElement("a");

        a.href = url;

        a.download =
            "taskflow-backup.json";

        a.click();

        URL.revokeObjectURL(url);

        showToast(
            "TaskFlow data exported.",
            "success"
        );

    }

    /* =====================================================
       THEME
    ===================================================== */

    function applyTheme() {

        const settings =
            getData(
                STORAGE.settings,
                { theme: "light" }
            );

        if (settings.theme === "dark") {

            document.documentElement.style.setProperty(
                "--bg",
                "#0f172a"
            );

            document.documentElement.style.setProperty(
                "--surface",
                "#1e293b"
            );

            document.documentElement.style.setProperty(
                "--surface-2",
                "#334155"
            );

            document.documentElement.style.setProperty(
                "--text",
                "#f8fafc"
            );

            document.documentElement.style.setProperty(
                "--muted",
                "#cbd5e1"
            );

            document.documentElement.style.setProperty(
                "--border",
                "#475569"
            );

        } else {

            document.documentElement.style.setProperty(
                "--bg",
                "#f1f5f9"
            );

            document.documentElement.style.setProperty(
                "--surface",
                "#ffffff"
            );

            document.documentElement.style.setProperty(
                "--surface-2",
                "#f8fafc"
            );

            document.documentElement.style.setProperty(
                "--text",
                "#0f172a"
            );

            document.documentElement.style.setProperty(
                "--muted",
                "#64748b"
            );

            document.documentElement.style.setProperty(
                "--border",
                "#e2e8f0"
            );

        }

    }

    /* =====================================================
       START
    ===================================================== */

    applyTheme();

    init();

})();
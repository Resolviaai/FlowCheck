  // Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyDoa8YzQ707xRs1IGD3AqdXNMgPwPM2FWA",
    authDomain: "flowcheck-a4412.firebaseapp.com",
    projectId: "flowcheck-a4412",
    storageBucket: "flowcheck-a4412.firebasestorage.app",
    messagingSenderId: "450070719140",
    appId: "1:450070719140:web:52df78d02e59a45ba2d431"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// App state
let currentUser = null;
let sessions = [];
let timerInterval = null;
let startTime = null;
let nextCheckTime = null;
let inactivityTimeout = null;
let isTimerRunning = false;

// DOM elements
const loadingEl = document.getElementById('loading');
const landingEl = document.getElementById('landing');
const loginEl = document.getElementById('login');
const signupEl = document.getElementById('signup');
const dashboardEl = document.getElementById('dashboard');
const inactivityModalEl = document.getElementById('inactivity-modal');
const forgotPasswordModalEl = document.getElementById('forgot-password-modal');

// Initialize app
auth.onAuthStateChanged((user) => {
    currentUser = user;
    if (user) {
        showPage('dashboard');
        loadSessions();
    } else {
        showPage('landing');
    }
    loadingEl.classList.add('hidden');
});

// Theme management
function toggleTheme() {
    const body = document.body;
    const themeToggles = [
        document.getElementById('theme-toggle'),
        document.getElementById('theme-toggle-landing'),
        document.getElementById('theme-toggle-login'),
        document.getElementById('theme-toggle-signup')
    ];
    
    if (body.classList.contains('light-theme')) {
        body.classList.remove('light-theme');
        themeToggles.forEach(toggle => {
            if (toggle) toggle.textContent = '🌙';
        });
        localStorage.setItem('theme', 'dark');
    } else {
        body.classList.add('light-theme');
        themeToggles.forEach(toggle => {
            if (toggle) toggle.textContent = '☀️';
        });
        localStorage.setItem('theme', 'light');
    }
    
    // Update charts when theme changes
    if (currentUser) {
        updateCharts();
    }
}

// Load saved theme
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    const themeToggles = [
        document.getElementById('theme-toggle'),
        document.getElementById('theme-toggle-landing'),
        document.getElementById('theme-toggle-login'),
        document.getElementById('theme-toggle-signup')
    ];
    
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeToggles.forEach(toggle => {
            if (toggle) toggle.textContent = '☀️';
        });
    }
}

// Initialize theme
loadTheme();

// Load saved theme
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    const themeToggle = document.getElementById('theme-toggle');
    
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeToggle.textContent = '☀️';
    }
}

// Initialize theme
loadTheme();

// Navigation
function showPage(pageName) {
    [landingEl, loginEl, signupEl, dashboardEl].forEach(el => el.classList.add('hidden'));
    document.getElementById(pageName).classList.remove('hidden');
}

// Authentication
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
}

async function handleSignup(event) {
    event.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    
    try {
        const result = await auth.createUserWithEmailAndPassword(email, password);
        await db.collection('users').doc(result.user.uid).set({
            uid: result.user.uid,
            email: result.user.email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        alert('Sign up failed: ' + error.message);
    }
}

function handleLogout() {
    auth.signOut();
}

// Forgot password functions
function showForgotPassword() {
    forgotPasswordModalEl.classList.remove('hidden');
    // Pre-fill email if available
    const loginEmail = document.getElementById('login-email').value;
    if (loginEmail) {
        document.getElementById('reset-email').value = loginEmail;
    }
}

function hideForgotPassword() {
    forgotPasswordModalEl.classList.add('hidden');
    document.getElementById('reset-email').value = '';
}

async function handleForgotPassword(event) {
    event.preventDefault();
    const email = document.getElementById('reset-email').value;
    
    try {
        await auth.sendPasswordResetEmail(email);
        alert('Password reset email sent! Check your inbox for the reset link.');
        hideForgotPassword();
    } catch (error) {
        alert('Failed to send reset email: ' + error.message);
    }
}

// Timer functions
function toggleTimer() {
    if (isTimerRunning) {
        stopTimer();
    } else {
        startTimer();
    }
}

function startTimer() {
    const description = document.getElementById('session-description').value || 'Focus session';
    startTime = Date.now();
    isTimerRunning = true;
    nextCheckTime = startTime + (45 * 60 * 1000); // 45 minutes
    
    document.getElementById('timer-btn').textContent = 'Stop';
    document.getElementById('session-description').disabled = true;
    
    timerInterval = setInterval(updateTimer, 1000);
    updateTimerInfo();
}

function stopTimer(commit = true) {
    if (!isTimerRunning) return;
    
    isTimerRunning = false;
    if (timerInterval) clearInterval(timerInterval);
    
    document.getElementById('timer-btn').textContent = 'Start';
    document.getElementById('session-description').disabled = false;
    document.getElementById('timer-display').textContent = '00:00:00';
    document.getElementById('timer-info').textContent = '';
    
    if (commit && startTime) {
        const endTime = Date.now();
        saveSession({
            description: document.getElementById('session-description').value || 'Focus session',
            start: startTime,
            end: endTime,
            durationMs: endTime - startTime
        });
        document.getElementById('session-description').value = '';
    }
    
    startTime = null;
    nextCheckTime = null;
    if (inactivityTimeout) clearTimeout(inactivityTimeout);
}

function updateTimer() {
    if (!startTime) return;
    
    const elapsed = Date.now() - startTime;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    document.getElementById('timer-display').textContent = 
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Check for inactivity
    if (nextCheckTime && Date.now() >= nextCheckTime) {
        promptInactivity();
    }
}

function updateTimerInfo() {
    if (!nextCheckTime) return;
    
    const timeUntilCheck = Math.ceil((nextCheckTime - Date.now()) / 60000);
    const isFirstCheck = nextCheckTime - startTime === 45 * 60 * 1000;
    const interval = isFirstCheck ? 45 : 30;
    
    document.getElementById('timer-info').textContent = 
        `Inactivity check in ${timeUntilCheck} minutes (then every ${interval} minutes)`;
}

function promptInactivity() {
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Still working?', { body: 'Confirm to keep tracking.' });
    }
    
    // Show modal
    inactivityModalEl.classList.remove('hidden');
    
    // Auto-discard after 5 minutes
    inactivityTimeout = setTimeout(() => {
        inactivityModalEl.classList.add('hidden');
        stopTimer(false);
        alert('Session discarded due to inactivity');
    }, 5 * 60 * 1000);
}

function confirmStillWorking() {
    inactivityModalEl.classList.add('hidden');
    if (inactivityTimeout) clearTimeout(inactivityTimeout);
    
    const now = Date.now();
    nextCheckTime = now + (30 * 60 * 1000); // 30 minutes
    updateTimerInfo();
}

function discardSession() {
    inactivityModalEl.classList.add('hidden');
    stopTimer(false);
}

// Session management
async function saveSession(sessionData) {
    try {
        await db.collection('users').doc(currentUser.uid).collection('sessions').add({
            ...sessionData,
            userId: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert('Session saved!');
        loadSessions();
    } catch (error) {
        alert('Failed to save session: ' + error.message);
    }
}

async function loadSessions() {
    if (!currentUser) return;
    
    try {
        const snapshot = await db.collection('users').doc(currentUser.uid)
            .collection('sessions')
            .orderBy('start', 'desc')
            .limit(50)
            .get();
        
        sessions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        updateSessionsList();
        updateStats();
    } catch (error) {
        console.error('Error loading sessions:', error);
    }
}

function updateSessionsList() {
    const container = document.getElementById('sessions-list');
    
    if (sessions.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #6b7280; padding: 2rem;">No sessions yet</div>';
        return;
    }
    
    const header = `
        <div class="session-header">
            <div>Description</div>
            <div>Start Time</div>
            <div>End Time</div>
            <div>Duration</div>
        </div>
    `;
    
    const sessionsHtml = sessions.map(session => `
        <div class="session-item">
            <div style="font-weight: 500;">${session.description}</div>
            <div>${formatDateTime(session.start)}</div>
            <div>${formatDateTime(session.end)}</div>
            <div style="font-weight: 600; color: #4f46e5;">${formatDuration(session.durationMs)}</div>
        </div>
    `).join('');
    
    container.innerHTML = header + sessionsHtml;
}

function updateStats() {
    const now = Date.now();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const todayTotal = sessions
        .filter(s => s.start >= today.getTime())
        .reduce((sum, s) => sum + s.durationMs, 0);
    
    const weekTotal = sessions
        .filter(s => s.start >= weekStart.getTime())
        .reduce((sum, s) => sum + s.durationMs, 0);
    
    const monthTotal = sessions
        .filter(s => s.start >= monthStart.getTime())
        .reduce((sum, s) => sum + s.durationMs, 0);
    
    const totalSessions = sessions.length;
    const avgSession = totalSessions > 0 ? sessions.reduce((sum, s) => sum + s.durationMs, 0) / totalSessions : 0;
    const longestSession = totalSessions > 0 ? Math.max(...sessions.map(s => s.durationMs)) : 0;
    
    document.getElementById('today-total').textContent = formatDuration(todayTotal);
    document.getElementById('week-total').textContent = formatDuration(weekTotal);
    document.getElementById('month-total').textContent = formatDuration(monthTotal);
    document.getElementById('total-sessions').textContent = totalSessions;
    document.getElementById('avg-session').textContent = formatDuration(avgSession);
    document.getElementById('longest-session').textContent = formatDuration(longestSession);
    
    updateCharts();
}

// Utility functions
function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function formatDuration(ms) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    } else {
        return `${seconds}s`;
    }
}

// Chart variables
let weeklyChart = null;
let dailyChart = null;

function updateCharts() {
    updateWeeklyChart();
    updateDailyChart();
}

function updateWeeklyChart() {
    const ctx = document.getElementById('weeklyChart');
    if (!ctx) return;

    if (weeklyChart) {
        weeklyChart.destroy();
    }

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekData = days.map((day, index) => {
        const dayStart = new Date();
        dayStart.setDate(dayStart.getDate() - dayStart.getDay() + index);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        
        const dayTotal = sessions
            .filter(s => s.start >= dayStart.getTime() && s.start < dayEnd.getTime())
            .reduce((sum, s) => sum + s.durationMs, 0);
        
        return Math.round(dayTotal / 60000); // Convert to minutes
    });

    // Determine text color based on theme
    const textColor = document.body.classList.contains('light-theme') ? '#374151' : '#e5e7eb';
    const gridColor = document.body.classList.contains('light-theme') ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';

    weeklyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: days,
            datasets: [{
                label: 'Minutes',
                data: weekData,
                backgroundColor: 'rgba(0, 212, 255, 0.8)',
                borderColor: 'rgba(0, 212, 255, 1)',
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor
                    }
                },
                x: {
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor
                    }
                }
            }
        }
    });
}

function updateDailyChart() {
    const ctx = document.getElementById('dailyChart');
    if (!ctx) return;

    if (dailyChart) {
        dailyChart.destroy();
    }

    const hours = Array.from({length: 24}, (_, i) => i);
    const hourData = hours.map(hour => {
        const hourTotal = sessions
            .filter(s => {
                const sessionHour = new Date(s.start).getHours();
                return sessionHour === hour;
            })
            .reduce((sum, s) => sum + s.durationMs, 0);
        
        return Math.round(hourTotal / 60000); // Convert to minutes
    });

    // Determine text color based on theme
    const textColor = document.body.classList.contains('light-theme') ? '#374151' : '#e5e7eb';
    const gridColor = document.body.classList.contains('light-theme') ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';

    dailyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hours.map(h => `${h}:00`),
            datasets: [{
                label: 'Minutes',
                data: hourData,
                borderColor: 'rgba(0, 212, 255, 1)',
                backgroundColor: 'rgba(0, 212, 255, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: 'rgba(0, 212, 255, 1)',
                pointBorderColor: document.body.classList.contains('light-theme') ? '#ffffff' : '#1a1a1a',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor
                    }
                },
                x: {
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor
                    }
                }
            }
        }
    });
}

function exportCSV() {
    if (sessions.length === 0) {
        alert('No sessions to export');
        return;
    }
    
    const headers = ['Description', 'Start', 'End', 'Duration (seconds)', 'Duration (formatted)'];
    const rows = sessions.map(s => [
        s.description,
        new Date(s.start).toISOString(),
        new Date(s.end).toISOString(),
        Math.round(s.durationMs / 1000),
        formatDuration(s.durationMs)
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flowcheck_sessions.csv';
    a.click();
    URL.revokeObjectURL(url);
}

// Detect touch device and add appropriate class
function detectTouchDevice() {
    if (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) {
        document.body.classList.add('touch-device');
    } else {
        document.body.classList.add('no-touch-device');
    }
}

// Initialize on load
window.addEventListener('DOMContentLoaded', function() {
    detectTouchDevice();
    
    // Handle viewport height on mobile
    function setVH() {
        let vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    
    setVH();
    window.addEventListener('resize', setVH);
});

// Toggle mobile menu
function toggleMobileMenu() {
    const mobileNav = document.querySelector('.mobile-nav');
    const menuBtn = document.querySelector('.mobile-menu-btn');
    
    mobileNav.classList.toggle('hidden');
    
    // Animate hamburger icon
    if (!mobileNav.classList.contains('hidden')) {
        menuBtn.classList.add('active');
    } else {
        menuBtn.classList.remove('active');
    }
}

// Close mobile menu when clicking outside
document.addEventListener('click', function(event) {
    const mobileNav = document.querySelector('.mobile-nav');
    const menuBtn = document.querySelector('.mobile-menu-btn');
    
    if (!mobileNav.classList.contains('hidden') && 
        !event.target.closest('.mobile-nav') && 
        !event.target.closest('.mobile-menu-btn')) {
        mobileNav.classList.add('hidden');
        menuBtn.classList.remove('active');
    }
});

// Add animation to hamburger icon
const style = document.createElement('style');
style.textContent = `
    .mobile-menu-btn.active span:nth-child(1) {
        transform: rotate(45deg) translate(5px, 5px);
    }
    
    .mobile-menu-btn.active span:nth-child(2) {
        opacity: 0;
    }
    
    .mobile-menu-btn.active span:nth-child(3) {
        transform: rotate(-45deg) translate(7px, -6px);
    }
`;
document.head.appendChild(style);
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
function initApp() {
    // Set up auth state listener
    auth.onAuthStateChanged((user) => {
        currentUser = user;
        if (user) {
            showPage('dashboard');
            loadSessions();
            // Load any saved timer state after a short delay
            setTimeout(loadTimerState, 500);
        } else {
            showPage('landing');
            // Clear any orphaned timer state if user is not logged in
            localStorage.removeItem('flowcheck_timer_state');
        }
        loadingEl.classList.add('hidden');
    });
    
    // Load saved theme
    loadTheme();
    
    // Set up mobile viewport height
    setVH();
    window.addEventListener('resize', setVH);
    
    // Detect touch device
    detectTouchDevice();
    
    // Set up event listeners
    setupEventListeners();
}

// Theme management
function toggleTheme() {
    const body = document.body;
    const themeToggles = [
        document.getElementById('theme-toggle'),
        document.getElementById('theme-toggle-landing'),
        document.getElementById('theme-toggle-login'),
        document.getElementById('theme-toggle-signup'),
        document.getElementById('theme-toggle-mobile')
    ].filter(toggle => toggle !== null);
    
    if (body.classList.contains('light-theme')) {
        body.classList.remove('light-theme');
        themeToggles.forEach(toggle => {
            toggle.textContent = '🌙';
        });
        localStorage.setItem('theme', 'dark');
    } else {
        body.classList.add('light-theme');
        themeToggles.forEach(toggle => {
            toggle.textContent = '☀️';
        });
        localStorage.setItem('theme', 'light');
    }
    
    // Update charts when theme changes
    if (currentUser) {
        updateCharts();
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    const themeToggles = [
        document.getElementById('theme-toggle'),
        document.getElementById('theme-toggle-landing'),
        document.getElementById('theme-toggle-login'),
        document.getElementById('theme-toggle-signup'),
        document.getElementById('theme-toggle-mobile')
    ].filter(toggle => toggle !== null);
    
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeToggles.forEach(toggle => {
            toggle.textContent = '☀️';
        });
    }
}

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
    // Clear any timer state on logout
    localStorage.removeItem('flowcheck_timer_state');
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

// Timer functions with persistence
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
    
    // Clear any existing timeouts
    if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = null;
    }
    
    document.getElementById('timer-btn').textContent = 'Stop';
    document.getElementById('session-description').disabled = true;
    
    // Clear any existing interval
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(updateTimer, 1000);
    updateTimerInfo();
    
    // Save timer state
    saveTimerState();
    
    // Request notification permission if not already granted
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function isModalVisible() {
    return !inactivityModalEl.classList.contains('hidden');
}

// Update the updateTimer function to check modal visibility
function updateTimer() {
    if (!startTime) return;
    
    const elapsed = Date.now() - startTime;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    document.getElementById('timer-display').textContent = 
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Check for inactivity (only if modal is not already visible)
    if (nextCheckTime && Date.now() >= nextCheckTime && !isModalVisible()) {
        promptInactivity();
    }
    
    // Save timer state every 30 seconds
    if (elapsed % 30000 < 1000) {
        saveTimerState();
    }
}

// Add debug logging to key functions
const originalConfirmStillWorking = confirmStillWorking;
confirmStillWorking = function() {
    console.log('confirmStillWorking called');
    console.log('inactivityTimeout before clear:', inactivityTimeout);
    return originalConfirmStillWorking.apply(this, arguments);
};

const originalPromptInactivity = promptInactivity;
promptInactivity = function() {
    console.log('promptInactivity called');
    console.log('nextCheckTime:', nextCheckTime);
    console.log('currentTime:', Date.now());
    return originalPromptInactivity.apply(this, arguments);
};

// Log timer state regularly
setInterval(() => {
    if (isTimerRunning) {
        console.log('Timer state:', {
            isRunning: isTimerRunning,
            startTime: startTime,
            nextCheckTime: nextCheckTime,
            timeUntilCheck: nextCheckTime ? Math.ceil((nextCheckTime - Date.now()) / 60000) : null,
            modalVisible: isModalVisible()
        });
    }
}, 30000);

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
    
    // Clear saved timer state
    localStorage.removeItem('flowcheck_timer_state');
    document.getElementById('timer-section').classList.remove('timer-persistent');
}

function updateTimer() {
    if (!startTime) return;
    
    const elapsed = Date.now() - startTime;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    document.getElementById('timer-display').textContent = 
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Check for inactivity (only if we haven't already prompted)
    if (nextCheckTime && Date.now() >= nextCheckTime && !inactivityModalEl.classList.contains('hidden')) {
        promptInactivity();
    }
    
    // Save timer state every 30 seconds
    if (elapsed % 30000 < 1000) {
        saveTimerState();
    }
}

function updateTimerInfo() {
    if (!nextCheckTime) {
        document.getElementById('timer-info').textContent = '';
        return;
    }
    
    const timeUntilCheck = Math.ceil((nextCheckTime - Date.now()) / 60000);
    
    if (timeUntilCheck <= 0) {
        document.getElementById('timer-info').textContent = 'Checking for activity...';
        document.getElementById('timer-info').style.color = 'var(--accent-primary)';
    } else {
        const isFirstCheck = nextCheckTime - startTime === 45 * 60 * 1000;
        const interval = isFirstCheck ? 45 : 30;
        
        document.getElementById('timer-info').textContent = 
            `Inactivity check in ${timeUntilCheck} minutes (then every ${interval} minutes)`;
        document.getElementById('timer-info').style.color = '';
    }
}

function promptInactivity() {
    // Clear any existing timeout first
    if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = null;
    }
    
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Still working?', { 
            body: 'Confirm within 5 minutes to keep tracking. Otherwise, this session will be discarded.',
            tag: 'flowcheck-inactivity'
        });
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
    // Clear the inactivity timeout first
    if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = null;
    }
    
    // Hide the modal
    inactivityModalEl.classList.add('hidden');
    
    // Set next check time to 30 minutes from now
    const now = Date.now();
    nextCheckTime = now + (30 * 60 * 1000); // 30 minutes
    
    // Update timer info
    updateTimerInfo();
    
    // Save updated timer state
    saveTimerState();
    
    // Show confirmation message
    const timerInfo = document.getElementById('timer-info');
    timerInfo.textContent = 'Activity confirmed! Next check in 30 minutes.';
    timerInfo.style.color = 'var(--accent-primary)';
    
    // Reset to normal color after 3 seconds
    setTimeout(() => {
        timerInfo.style.color = '';
        updateTimerInfo();
    }, 3000);
}

function discardSession() {
    // Clear the inactivity timeout
    if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = null;
    }
    
    // Hide the modal
    inactivityModalEl.classList.add('hidden');
    
    // Stop the timer without saving
    stopTimer(false);
    
    // Show message
    alert('Session discarded');
}

// Timer state persistence
function saveTimerState() {
    if (isTimerRunning && startTime) {
        const timerState = {
            isRunning: isTimerRunning,
            startTime: startTime,
            nextCheckTime: nextCheckTime,
            description: document.getElementById('session-description').value || 'Focus session'
        };
        localStorage.setItem('flowcheck_timer_state', JSON.stringify(timerState));
        document.getElementById('timer-section').classList.add('timer-persistent');
    }
}

function loadTimerState() {
    const savedState = localStorage.getItem('flowcheck_timer_state');
    if (savedState && currentUser) {
        const state = JSON.parse(savedState);
        
        // Check if the timer was running and we have a valid start time
        if (state.isRunning && state.startTime) {
            const now = Date.now();
            const elapsed = now - state.startTime;
            
            // Ask user if they want to resume the session
            if (confirm('You have an unfinished session. Would you like to resume it?')) {
                startTime = state.startTime;
                isTimerRunning = true;
                nextCheckTime = state.nextCheckTime;
                
                document.getElementById('session-description').value = state.description;
                document.getElementById('session-description').disabled = true;
                document.getElementById('timer-btn').textContent = 'Stop';
                
                timerInterval = setInterval(updateTimer, 1000);
                updateTimerInfo();
                document.getElementById('timer-section').classList.add('timer-persistent');
                
                // Adjust next check time based on elapsed time
                const timeSinceLastCheck = now - (nextCheckTime - (state.nextCheckTime - state.startTime > 45*60*1000 ? 45*60*1000 : 30*60*1000));
                if (timeSinceLastCheck > 5*60*1000) {
                    promptInactivity();
                }
            } else {
                // User doesn't want to resume, so save the session as is
                saveSession({
                    description: state.description,
                    start: state.startTime,
                    end: now,
                    durationMs: elapsed
                });
                localStorage.removeItem('flowcheck_timer_state');
            }
        }
    }
}

// Session management
async function saveSession(sessionData) {
    try {
        await db.collection('users').doc(currentUser.uid).collection('sessions').add({
            ...sessionData,
            userId: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Clear timer state after successful save
        localStorage.removeItem('flowcheck_timer_state');
        document.getElementById('timer-section').classList.remove('timer-persistent');
        
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
        container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">No sessions yet</div>';
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
            <div style="font-weight: 600; color: var(--accent-primary);">${formatDuration(session.durationMs)}</div>
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

// Chart functions
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
    
    // Initialize hourData with zeros for all hours
    const hourData = new Array(24).fill(0);
    
    // Calculate totals for each local hour
    sessions.forEach(session => {
        const sessionDate = new Date(session.start);
        const localHour = sessionDate.getHours(); // This now gets local hour
        const durationMinutes = Math.round(session.durationMs / 60000);
        
        hourData[localHour] += durationMinutes;
    });

    // Determine text color based on theme
    const textColor = document.body.classList.contains('light-theme') ? '#374151' : '#e5e7eb';
    const gridColor = document.body.classList.contains('light-theme') ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';

    dailyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hours.map(h => {
                // Format hours in 12-hour format with AM/PM
                const period = h >= 12 ? 'PM' : 'AM';
                const hour12 = h % 12 || 12; // Convert 0 to 12 for midnight
                return `${hour12} ${period}`;
            }),
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
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Minutes: ${context.raw}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor,
                        callback: function(value) {
                            return value + 'm';
                        }
                    },
                    title: {
                        display: true,
                        text: 'Minutes',
                        color: textColor
                    }
                },
                x: {
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor,
                        maxRotation: 45,
                        minRotation: 45
                    },
                    title: {
                        display: true,
                        text: 'Time of Day',
                        color: textColor
                    }
                }
            }
        }
    });
}
function displayTimezoneInfo() {
    // Get user's timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezoneOffset = new Date().getTimezoneOffset();
    const offsetHours = Math.abs(Math.floor(timezoneOffset / 60));
    const offsetMinutes = Math.abs(timezoneOffset % 60);
    const offsetSign = timezoneOffset <= 0 ? '+' : '-';
    
    console.log(`User's timezone: ${timezone} (GMT${offsetSign}${offsetHours}:${offsetMinutes.toString().padStart(2, '0')})`);
    
    // Optional: Display this info somewhere in your UI
    // const timezoneInfoEl = document.getElementById('timezone-info');
    // if (timezoneInfoEl) {
    //     timezoneInfoEl.textContent = `Timezone: ${timezone}`;
    // }
}

// Call this function when the app loads
displayTimezoneInfo();

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

// Mobile menu functions
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

// Utility functions
function detectTouchDevice() {
    if (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) {
        document.body.classList.add('touch-device');
    } else {
        document.body.classList.add('no-touch-device');
    }
}

function setVH() {
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

function setupEventListeners() {
    // Handle page visibility changes
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden' && isTimerRunning) {
            // Page is being hidden, save timer state
            saveTimerState();
        }
    });
    
    // Handle beforeunload event
    window.addEventListener('beforeunload', function(e) {
        if (isTimerRunning) {
            // Save timer state when page is about to be unloaded
            saveTimerState();
            
            // Optional: Show confirmation message (may be blocked by browsers)
            const message = 'You have an active timer. Are you sure you want to leave?';
            e.returnValue = message;
            return message;
        }
    });
    
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
}

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

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
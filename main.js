// --- Constants & State ---
const APP_DATA_KEY = 'pomodoro_timer_with_task_data';

let state = {
    tasks: [],
    logs: [],
    activeTaskId: null,
    timer: {
        secondsRemaining: 1500, // 25 mins default
        isRunning: false,
        mode: 'work', // 'work' or 'break'
        intervalId: null,
        startTime: null,
        initialSeconds: 1500
    },
    settings: {
        workDuration: 25,
        breakDuration: 5,
        soundEnabled: true
    }
};

// --- DOM Elements ---
const timerDisplay = document.getElementById('timer-display');
const currentTaskDisplay = document.getElementById('current-task-display');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const resetBtn = document.getElementById('reset-btn');
const taskInput = document.getElementById('task-input');
const addTaskBtn = document.getElementById('add-task-btn');
const taskList = document.getElementById('task-list');
const workDurationInput = document.getElementById('work-duration');
const breakDurationInput = document.getElementById('break-duration');
const totalWorkedDisplay = document.getElementById('total-worked-time');
const soundEnabledToggle = document.getElementById('sound-enabled');
const tabButtons = document.querySelectorAll('.tab-btn');

let chart = null;

// --- Initialization ---
function init() {
    loadData();
    setupEventListeners();
    updateUI();
    renderChart('today');
}

// --- Data Management ---
function loadData() {
    const saved = localStorage.getItem(APP_DATA_KEY);
    if (saved) {
        const parsed = JSON.parse(saved);
        state.tasks = parsed.tasks || [];
        state.logs = parsed.logs || [];
        state.settings = parsed.settings || state.settings;
    }

    // Set inputs from saved settings
    workDurationInput.value = state.settings.workDuration;
    breakDurationInput.value = state.settings.breakDuration;
    soundEnabledToggle.checked = state.settings.soundEnabled;

    state.timer.secondsRemaining = state.settings.workDuration * 60;
    state.timer.initialSeconds = state.timer.secondsRemaining;
}

function saveData() {
    localStorage.setItem(APP_DATA_KEY, JSON.stringify({
        tasks: state.tasks,
        logs: state.logs,
        settings: state.settings
    }));
}

// --- Timer Logic ---
function startTimer() {
    if (!state.activeTaskId && state.timer.mode === 'work') {
        alert('タスクを選択または追加してから開始してください。');
        return;
    }

    if (state.timer.isRunning) return;

    state.timer.isRunning = true;
    state.timer.startTime = Date.now();

    startBtn.disabled = true;
    stopBtn.disabled = false;
    workDurationInput.disabled = true;
    breakDurationInput.disabled = true;

    state.timer.intervalId = setInterval(updateTimer, 1000);
}

function stopTimer() {
    if (!state.timer.isRunning) return;

    clearInterval(state.timer.intervalId);
    state.timer.isRunning = false;

    startBtn.disabled = false;
    stopBtn.disabled = true;
}

function resetTimer() {
    stopTimer();
    state.timer.mode = 'work';
    state.timer.secondsRemaining = state.settings.workDuration * 60;
    state.timer.initialSeconds = state.timer.secondsRemaining;

    workDurationInput.disabled = false;
    breakDurationInput.disabled = false;

    updateUI();
}

function updateTimer() {
    if (state.timer.secondsRemaining > 0) {
        state.timer.secondsRemaining--;

        // Accumulate work time if in work mode
        if (state.timer.mode === 'work' && state.activeTaskId) {
            logTime(state.activeTaskId, 1);
        }
    } else {
        // Phase switch
        playNotification();
        if (state.timer.mode === 'work') {
            state.timer.mode = 'break';
            state.timer.secondsRemaining = state.settings.breakDuration * 60;
        } else {
            state.timer.mode = 'work';
            state.timer.secondsRemaining = state.settings.workDuration * 60;
        }
        state.timer.initialSeconds = state.timer.secondsRemaining;
    }
    updateUI();
}

function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// --- Task Management ---
function addTask() {
    const name = taskInput.value.trim();
    if (!name) return;

    const newTask = {
        id: 'task-' + Date.now(),
        name: name,
        totalTime: 0,
        createdAt: new Date().toISOString()
    };

    state.tasks.push(newTask);
    taskInput.value = '';
    saveData();
    updateUI();
}

function deleteTask(id, event) {
    event.stopPropagation();
    state.tasks = state.tasks.filter(t => t.id !== id);
    if (state.activeTaskId === id) {
        state.activeTaskId = null;
        if (state.timer.isRunning) stopTimer();
    }
    saveData();
    updateUI();
    renderChart(document.querySelector('.tab-btn.active').dataset.range);
}

function selectTask(id) {
    if (state.timer.isRunning && state.timer.mode === 'work') {
        if (confirm('別のタスクに切り替えますか？現在のタイマーは継続されます。')) {
            state.activeTaskId = id;
        }
    } else {
        state.activeTaskId = id;
    }
    updateUI();
}

function logTime(taskId, seconds) {
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
        task.totalTime += seconds;
    }

    const today = new Date().toISOString().split('T')[0];
    let logEntry = state.logs.find(l => l.date === today && l.taskId === taskId);

    if (logEntry) {
        logEntry.duration += seconds;
    } else {
        state.logs.push({
            taskId: taskId,
            date: today,
            duration: seconds
        });
    }

    // Save every 10 seconds to reduce IO, or on stop
    if (seconds % 10 === 0) saveData();
}

// --- Notification Logic ---
function playNotification() {
    if (!state.settings.soundEnabled) return;

    const month = new Date().getMonth() + 1; // 1-12
    let soundUrl = '';

    // 春 (3-5), 夏 (6-8), 秋 (9-11), 冬 (12, 1, 2)
    if (month >= 3 && month <= 5) {
        // ヒヨドリ (Brown-eared bulbul)
        soundUrl = 'ヒヨドリ.wav';
    } else if (month >= 6 && month <= 8) {
        // ヒグラシ (Evening cicada)
        soundUrl = 'ヒグラシ.wav';
    } else if (month >= 9 && month <= 11) {
        // エンマコオロギ (Field cricket)
        soundUrl = 'エンマコオロギ.wav';
    } else {
        // シジュウカラ (Great tit)
        soundUrl = 'シジュウカラ.wav';
    }

    const audio = new Audio(soundUrl);
    audio.play().catch(e => console.log('Audio play failed:', e));
}

// --- UI Updates ---
function updateUI() {
    timerDisplay.textContent = formatTime(state.timer.secondsRemaining);

    const activeTask = state.tasks.find(t => t.id === state.activeTaskId);
    currentTaskDisplay.textContent = activeTask ? activeTask.name.toUpperCase() : 'NO ACTIVE TASK';

    if (state.timer.mode === 'break') {
        timerDisplay.style.color = 'var(--accent-pink)';
        document.body.style.borderTop = '5px solid var(--accent-pink)';
    } else {
        timerDisplay.style.color = 'var(--accent-cyan)';
        document.body.style.borderTop = 'none';
    }

    renderTaskList();
    updateTotalWorked();
}

function renderTaskList() {
    taskList.innerHTML = '';
    state.tasks.forEach(task => {
        const item = document.createElement('div');
        item.className = `task-item ${state.activeTaskId === task.id ? 'active' : ''}`;
        item.onclick = () => selectTask(task.id);

        item.innerHTML = `
            <span>${task.name}</span>
            <button class="btn-delete-task" onclick="deleteTask('${task.id}', event)">×</button>
        `;
        taskList.appendChild(item);
    });
}

function updateTotalWorked() {
    let totalSeconds = 0;
    state.tasks.forEach(t => totalSeconds += t.totalTime);

    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    totalWorkedDisplay.textContent = `${hrs}時間 ${mins}分`;
}

// --- Charting ---
function renderChart(range) {
    const ctx = document.getElementById('timeChart').getContext('2d');

    const dataMap = new Map();
    const now = new Date();

    state.logs.forEach(log => {
        const logDate = new Date(log.date);
        let match = false;

        if (range === 'today') {
            match = log.date === now.toISOString().split('T')[0];
        } else if (range === 'week') {
            const diff = (now - logDate) / (1000 * 60 * 60 * 24);
            match = diff <= 7;
        } else if (range === 'month') {
            match = logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
        } else if (range === 'year') {
            match = logDate.getFullYear() === now.getFullYear();
        } else {
            match = true;
        }

        if (match) {
            const task = state.tasks.find(t => t.id === log.taskId);
            const name = task ? task.name : 'Unknown';
            dataMap.set(name, (dataMap.get(name) || 0) + log.duration);
        }
    });

    const labels = Array.from(dataMap.keys());
    const data = Array.from(dataMap.values()).map(s => Math.round(s / 60)); // Convert to mins

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#b162ff', '#00f2fe', '#ff6b81', '#FFCE56', '#4BC0C0', '#9966FF'
                ],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#a0a0a0', font: { family: 'Outfit' } }
                }
            },
            cutout: '70%'
        }
    });
}

// --- Event Listeners ---
function setupEventListeners() {
    startBtn.onclick = startTimer;
    stopBtn.onclick = stopTimer;
    resetBtn.onclick = resetTimer;
    addTaskBtn.onclick = addTask;

    taskInput.onkeypress = (e) => {
        if (e.key === 'Enter') addTask();
    };

    workDurationInput.onchange = () => {
        state.settings.workDuration = parseInt(workDurationInput.value) || 25;
        if (!state.timer.isRunning) resetTimer();
        saveData();
    };

    breakDurationInput.onchange = () => {
        state.settings.breakDuration = parseInt(breakDurationInput.value) || 5;
        if (!state.timer.isRunning) resetTimer();
        saveData();
    };

    soundEnabledToggle.onchange = () => {
        state.settings.soundEnabled = soundEnabledToggle.checked;
        saveData();
    };

    tabButtons.forEach(btn => {
        btn.onclick = () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderChart(btn.dataset.range);
        };
    });
}

// --- Start App ---
window.onload = init;

// script.js

// Motivational Quotes Database
const quotes = [
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
    { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
    { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
    { text: "Your future is created by what you do today, not tomorrow.", author: "Anonymous" },
    { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" }
];

// Initialize UI & Defaults
document.addEventListener('DOMContentLoaded', () => {
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 14);
    const examDefault = nextMonth.toISOString().split('T')[0];

    document.getElementById('startDate').value = today;
    document.getElementById('examDate').value = examDefault;

    // Load Random Quote
    loadRandomQuote();

    // Event Listeners
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('studyForm').addEventListener('submit', generateStudyPlan);
    document.getElementById('printBtn').addEventListener('click', () => window.print());
    document.getElementById('pdfBtn').addEventListener('click', exportToPDF);

    // Timer setup
    initTimer();
});

// Load Random Quote
function loadRandomQuote() {
    const random = quotes[Math.floor(Math.random() * quotes.length)];
    document.getElementById('quoteText').textContent = `"${random.text}"`;
    document.getElementById('quoteAuthor').textContent = `- ${random.author}`;
}

// Theme Toggle
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    
    const icon = document.querySelector('#themeToggle i');
    icon.className = newTheme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
}

// Global Schedule State
let masterSchedule = [];

// Generate Study Plan Logic
function generateStudyPlan(e) {
    e.preventDefault();

    const startDateStr = document.getElementById('startDate').value;
    const examDateStr = document.getElementById('examDate').value;
    const dailyHours = parseFloat(document.getElementById('dailyHours').value);
    const rawTopics = document.getElementById('topics').value.trim().split('\n').filter(t => t.trim() !== '');
    
    const weakTopicsInput = document.getElementById('weakTopics').value.toLowerCase();
    const strongTopicsInput = document.getElementById('strongTopics').value.toLowerCase();

    const weakTopics = weakTopicsInput.split(',').map(t => t.trim()).filter(Boolean);
    const strongTopics = strongTopicsInput.split(',').map(t => t.trim()).filter(Boolean);

    if (rawTopics.length === 0) {
        alert('Please enter at least one topic.');
        return;
    }

    const start = new Date(startDateStr);
    const exam = new Date(examDateStr);
    const diffTime = exam - start;
    const daysAvailable = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysAvailable <= 0) {
        alert('Exam date must be after today\'s date.');
        return;
    }

    const totalAvailableHours = daysAvailable * dailyHours;

    // Categorize topics & apply priority weights
    let weightedTopics = rawTopics.map(topic => {
        let weight = 1.0;
        const lowerTopic = topic.toLowerCase();
        if (weakTopics.some(w => lowerTopic.includes(w))) {
            weight = 1.8; // Give extra time/weight to weak topics
        } else if (strongTopics.some(s => lowerTopic.includes(s))) {
            weight = 0.7; // Reduce relative weight for strong topics
        }
        return { name: topic.trim(), weight };
    });

    // Reserve last 20% of days for revision (at least 1 day if time permits)
    const revisionDaysCount = Math.max(1, Math.floor(daysAvailable * 0.2));
    const studyDaysCount = daysAvailable - revisionDaysCount;

    // Distribute topics across study days
    masterSchedule = [];
    let currentDate = new Date(start);

    // Create a pool of sessions based on weights
    let totalWeight = weightedTopics.reduce((sum, t) => sum + t.weight, 0);
    
    let currentDayIndex = 0;
    
    // Assign regular study tasks
    for (let i = 0; i < studyDaysCount; i++) {
        let dateStr = new Date(currentDate).toISOString().split('T')[0];
        
        // Pick a topic sequentially or cyclically weighted
        let topicObj = weightedTopics[i % weightedTopics.length];
        let assignedHours = Math.min(dailyHours, (topicObj.weight / totalWeight) * totalAvailableHours);
        assignedHours = Math.max(1, parseFloat(assignedHours.toFixed(1)));

        // Mock test every 7 days
        let taskDesc = `Deep dive and practice exercises for ${topicObj.name}.`;
        if ((i + 1) % 7 === 0) {
            taskDesc += ` 📝 [Mock Test Day!]`;
        }

        masterSchedule.push({
            id: i,
            date: dateStr,
            topic: topicObj.name,
            hours: assignedHours,
            task: taskDesc,
            revision: 'Regular Study',
            completed: false
        });

        currentDate.setDate(currentDate.getDate() + 1);
    }

    // Assign revision & final mock test days for the remaining 20%
    for (let r = 0; r < revisionDaysCount; r++) {
        let dateStr = new Date(currentDate).toISOString().split('T')[0];
        let isFinalMock = (r === revisionDaysCount - 1);

        masterSchedule.push({
            id: studyDaysCount + r,
            date: dateStr,
            topic: isFinalMock ? 'Full Syllabus' : 'Core Concepts Review',
            hours: dailyHours,
            task: isFinalMock ? 'Full-length Mock Exam & Final Review' : 'Comprehensive Revision of Weak Areas',
            revision: 'Revision Phase',
            completed: false
        });

        currentDate.setDate(currentDate.getDate() + 1);
    }

    // Render Dashboard & Table
    renderDashboard(daysAvailable, totalAvailableHours);
    renderTable();

    // Show Dashboard with Smooth Scroll
    const dashboard = document.getElementById('dashboardSection');
    dashboard.classList.remove('hidden');
    dashboard.scrollIntoView({ behavior: 'smooth' });

    // Confetti Animation Effect
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
    });
}

// Render Dashboard Metrics
function renderDashboard(days, totalHours) {
    document.getElementById('statDays').textContent = days;
    document.getElementById('statHours').textContent = totalHours;
    updateProgressMetrics();
}

// Render Master Schedule Table
function renderTable() {
    const tbody = document.getElementById('scheduleBody');
    tbody.innerHTML = '';

    masterSchedule.forEach(item => {
        const tr = document.createElement('tr');
        if (item.completed) tr.classList.add('completed-row');

        tr.innerHTML = `
            <td><input type="checkbox" class="task-checkbox" data-id="${item.id}" ${item.completed ? 'checked' : ''}></td>
            <td>${item.date}</td>
            <td><strong>${item.topic}</strong></td>
            <td>${item.hours} hrs</td>
            <td>${item.task}</td>
            <td><span class="badge ${item.revision === 'Revision Phase' ? 'rev-badge' : ''}">${item.revision}</span></td>
        `;
        tbody.appendChild(tr);
    });

    // Add checkbox event listeners
    document.querySelectorAll('.task-checkbox').forEach(chk => {
        chk.addEventListener('change', (e) => {
            const id = parseInt(e.target.getAttribute('data-id'));
            const task = masterSchedule.find(t => t.id === id);
            if (task) {
                task.completed = e.target.checked;
                renderTable();
                updateProgressMetrics();
            }
        });
    });
}

// Update Progress Bar & Counts
function updateProgressMetrics() {
    const totalTasks = masterSchedule.length;
    const completedTasks = masterSchedule.filter(t => t.completed).length;
    const leftTasks = totalTasks - completedTasks;
    const percent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    document.getElementById('statCompleted').textContent = completedTasks;
    document.getElementById('statLeft').textContent = leftTasks;
    document.getElementById('progressPercent').textContent = `${percent}%`;
    document.getElementById('progressBarFill').style.width = `${percent}%`;
}

// Pomodoro Focus Timer Logic
let timerInterval = null;
let timeLeft = 25 * 60;
let isRunning = false;

function initTimer() {
    updateTimerDisplay();
    document.getElementById('timerStart').addEventListener('click', startTimer);
    document.getElementById('timerPause').addEventListener('click', pauseTimer);
    document.getElementById('timerReset').addEventListener('click', resetTimer);
}

function startTimer() {
    if (isRunning) return;
    isRunning = true;
    document.getElementById('timerStart').disabled = true;
    document.getElementById('timerPause').disabled = false;
    document.getElementById('timerStatus').textContent = 'Focus Session Active 🎯';

    timerInterval = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateTimerDisplay();
        } else {
            clearInterval(timerInterval);
            isRunning = false;
            alert('Pomodoro session completed! Take a 5-minute break.');
            timeLeft = 5 * 60; // 5 min break default
            document.getElementById('timerStatus').textContent = 'Break Time ☕';
            document.getElementById('timerStart').disabled = false;
            document.getElementById('timerPause').disabled = true;
            updateTimerDisplay();
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    document.getElementById('timerStart').disabled = false;
    document.getElementById('timerPause').disabled = true;
    document.getElementById('timerStatus').textContent = 'Timer Paused ⏸️';
}

function resetTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    timeLeft = 25 * 60;
    document.getElementById('timerStart').disabled = false;
    document.getElementById('timerPause').disabled = true;
    document.getElementById('timerStatus').textContent = 'Ready to Focus';
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('timerDisplay').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Export to PDF using jsPDF
function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFont("Outfit", "normal");
    doc.setFontSize(20);
    doc.text("AI Study Planner - Master Schedule", 14, 20);

    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

    const tableData = masterSchedule.map(item => [
        item.date,
        item.topic,
        `${item.hours} hrs`,
        item.task,
        item.revision
    ]);

    doc.autoTable({
        startY: 35,
        head: [['Date', 'Topic', 'Study Hours', 'Task', 'Phase']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241] }
    });

    doc.save("AI_Study_Planner_Schedule.pdf");
}

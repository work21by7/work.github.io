document.addEventListener("DOMContentLoaded", function() {
    try {
        VANTA.NET({
            el: "#vanta-canvas",
            mouseControls: true, touchControls: true, gyroControls: false,
            minHeight: 200.00, minWidth: 200.00, scale: 1.00, scaleMobile: 1.00,
            backgroundAlpha: 0.0, color: 0xffffff, points: 11.00, maxDistance: 22.00, spacing: 18.00, showDots: true
        });
    } catch (e) { console.log("Vanta JS offline"); }

    const bg = document.getElementById('bg-image');
    if(bg) {
        document.addEventListener('mousemove', (e) => {
            const x = (window.innerWidth - e.pageX) / 25;
            const y = (window.innerHeight - e.pageY) / 25;
            bg.style.transform = `translate(${x}px, ${y}px)`;
        });
    }
});

function getLocalISOString() {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
}

class StudyPlanner {
    constructor() {
        const defaultPrefs = { darkMode: true, animation: true, sound: true, compact: false };
        this.state = {
            currentDate: getLocalISOString(),
            streak: JSON.parse(localStorage.getItem('streak')) || { count: 0, lastDate: null },
            prefs: JSON.parse(localStorage.getItem('prefs')) || defaultPrefs
        };
        
        this.parts = [
            { name: 'Morning', icon: '#fbbf24', path: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>' },
            { name: 'Afternoon', icon: '#60a5fa', path: '<path d="M12 10V2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M12 22v-2"/><path d="m8 12 4 4 4-4"/>' },
            { name: 'Evening', icon: '#818cf8', path: '<path d="M12 3a6 6 0 0 0 9 9 9 0 1 1-9-9Z"/>' }
        ];
        this.init();
    }

    init() {
        this.applyPrefs();
        this.render();
        const picker = document.getElementById('date-picker');
        if(picker) {
            picker.addEventListener('change', (e) => {
                this.state.currentDate = e.target.value;
                this.render();
            });
        }
    }

    toggleSettings() {
        const planner = document.getElementById('view-planner');
        const settings = document.getElementById('view-settings');
        if (planner.style.display === 'none') {
            planner.style.display = 'block';
            settings.style.display = 'none';
        } else {
            planner.style.display = 'none';
            settings.style.display = 'block';
        }
    }

    applyPrefs() {
        if (!this.state.prefs.darkMode) {
            document.body.classList.add('light-mode');
            document.getElementById('toggle-theme').checked = false;
        } else {
            document.body.classList.remove('light-mode');
            document.getElementById('toggle-theme').checked = true;
        }
        const vanta = document.getElementById('vanta-canvas');
        if (vanta) vanta.style.opacity = this.state.prefs.animation ? '1' : '0';
        document.getElementById('toggle-anim').checked = this.state.prefs.animation;

        if (this.state.prefs.compact) {
            document.body.classList.add('compact-mode');
            document.getElementById('toggle-compact').checked = true;
        } else {
            document.body.classList.remove('compact-mode');
            document.getElementById('toggle-compact').checked = false;
        }
        document.getElementById('toggle-sound').checked = this.state.prefs.sound;
    }

    savePrefs() { localStorage.setItem('prefs', JSON.stringify(this.state.prefs)); }
    toggleTheme() { this.state.prefs.darkMode = !this.state.prefs.darkMode; this.savePrefs(); this.applyPrefs(); }
    toggleAnimation() { this.state.prefs.animation = !this.state.prefs.animation; this.savePrefs(); this.applyPrefs(); }
    toggleCompact() { this.state.prefs.compact = !this.state.prefs.compact; this.savePrefs(); this.applyPrefs(); }
    toggleSound() { this.state.prefs.sound = !this.state.prefs.sound; this.savePrefs(); this.applyPrefs(); }

    clearAllData() { if(confirm("Are you sure?")) { localStorage.clear(); location.reload(); } }

    exportData() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(localStorage));
        const node = document.createElement('a');
        node.setAttribute("href", dataStr);
        node.setAttribute("download", "daily_focus_backup.json");
        document.body.appendChild(node);
        node.click();
        node.remove();
    }

    changeDate(offset) {
        const current = new Date(this.state.currentDate + "T00:00:00");
        current.setDate(current.getDate() + offset);
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const day = String(current.getDate()).padStart(2, '0');
        this.state.currentDate = `${year}-${month}-${day}`;
        this.render();
    }

    getTasks(date) { return JSON.parse(localStorage.getItem(`tasks_${date}`)) || []; }

    saveTasks(date, tasks) {
        localStorage.setItem(`tasks_${date}`, JSON.stringify(tasks));
        this.updateProgress(tasks);
        this.checkStreak(date, tasks);
    }

    addTask(part, formId) {
        const title = document.getElementById(`title-${formId}`).value;
        if (!title) return alert("Title is required");
        const time = document.getElementById(`time-${formId}`).value;
        const priority = document.getElementById(`prio-${formId}`).value;
        const required = document.getElementById(`req-${formId}`).checked;

        const tasks = this.getTasks(this.state.currentDate);
        tasks.push({ id: Date.now(), title, part, time, priority, required, done: false });
        this.saveTasks(this.state.currentDate, tasks);
        this.render();
    }

    toggleTask(id) {
        const tasks = this.getTasks(this.state.currentDate);
        const task = tasks.find(t => t.id == id);
        if (task) {
            task.done = !task.done;
            if(task.done && this.state.prefs.sound) this.playSound();
            this.saveTasks(this.state.currentDate, tasks);
            this.render();
        }
    }

    deleteTask(id, confirmDel = true) {
        if(confirmDel && !confirm("Delete this task?")) return;
        let tasks = this.getTasks(this.state.currentDate);
        tasks = tasks.filter(t => t.id != id);
        this.saveTasks(this.state.currentDate, tasks);
        this.render();
    }

    editTask(id) {
        const tasks = this.getTasks(this.state.currentDate);
        const task = tasks.find(t => t.id == id);
        if (!task) return;
        const formId = `form-${task.part}`;
        
        this.deleteTask(id, false);

        setTimeout(() => {
            const tInput = document.getElementById(`title-${formId}`);
            if(tInput) {
                tInput.value = task.title;
                document.getElementById(`time-${formId}`).value = task.time;
                document.getElementById(`prio-${formId}`).value = task.priority;
                document.getElementById(`req-${formId}`).checked = task.required;
                this.toggleForm(formId);
                this.showToast("Task moved to edit");
            }
        }, 50);
    }

    toggleForm(id) {
        const form = document.getElementById(id);
        if(form) form.style.display = form.style.display === 'block' ? 'none' : 'block';
    }

    showToast(msg) {
        const t = document.getElementById('toast');
        t.innerText = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 3000);
    }

    playSound() {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const playTone = (freq, startTime, duration, type = 'triangle') => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = type;
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.2, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
            osc.start(startTime);
            osc.stop(startTime + duration);
        };
        const now = ctx.currentTime;
        playTone(523.25, now, 0.6);       
        playTone(659.25, now + 0.1, 0.6); 
        playTone(783.99, now + 0.2, 0.6); 
        playTone(1046.50, now + 0.3, 0.8, 'square'); 
    }

    checkStreak(date, tasks) {
        const requiredTasks = tasks.filter(t => t.required);
        const todayStr = getLocalISOString();
        if (date !== todayStr) return;
        if (requiredTasks.length === 0) return;
        const allDone = requiredTasks.every(t => t.done);

        if (allDone) {
            if (this.state.streak.lastDate === todayStr) return;
            const yesterdayObj = new Date();
            yesterdayObj.setDate(yesterdayObj.getDate() - 1);
            const offset = yesterdayObj.getTimezoneOffset() * 60000;
            const yesterdayStr = new Date(yesterdayObj.getTime() - offset).toISOString().split('T')[0];

            if (this.state.streak.lastDate === yesterdayStr) {
                this.state.streak.count++;
            } else {
                this.state.streak.count = 1;
            }
            this.state.streak.lastDate = todayStr;
            localStorage.setItem('streak', JSON.stringify(this.state.streak));
            if(this.state.prefs.sound) this.playSound();
            this.showToast("Streak Increased! 🔥");
            this.renderStreak();
        }
    }

    resetStreak() {
        if(confirm('Reset streak to 0?')) {
            this.state.streak = { count: 0, lastDate: null };
            localStorage.setItem('streak', JSON.stringify(this.state.streak));
            this.renderStreak();
        }
    }

    render() {
        const datePicker = document.getElementById('date-picker');
        if(datePicker) datePicker.value = this.state.currentDate;

        const [y, m, d] = this.state.currentDate.split('-').map(Number);
        const userDate = new Date(y, m - 1, d);
        const weekdayElem = document.getElementById('weekday-display');
        if(weekdayElem) weekdayElem.innerText = userDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const tasks = this.getTasks(this.state.currentDate);
        const container = document.getElementById('main-content');
        if(container) {
            container.innerHTML = '';
            this.parts.forEach(part => {
                const partTasks = tasks.filter(t => t.part === part.name);
                const formId = `form-${part.name}`;
                let tasksHtml = partTasks.map(task => `
                    <li class="task-item ${task.done ? 'done' : ''}">
                        <div class="task-left">
                            <input type="checkbox" class="task-checkbox" ${task.done ? 'checked' : ''} onchange="window.app.toggleTask(${task.id})">
                            <div class="task-content">
                                <span class="task-title">${task.title}</span>
                                <div style="display:flex; gap:5px; margin-top:2px;">
                                    ${task.required ? '<span class="badge badge-req">REQ</span>' : ''}
                                    ${task.time ? `<span class="badge badge-time">${task.time}</span>` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="task-right">
                            <span class="badge priority-${task.priority}">${task.priority}</span>
                            <button class="action-btn btn-edit" onclick="window.app.editTask(${task.id})">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                            </button>
                            <button class="action-btn btn-delete" onclick="window.app.deleteTask(${task.id})">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </li>
                `).join('');

                const sectionHtml = `
                    <div class="section-header">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${part.icon}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${part.path}</svg>
                        <span class="section-title">${part.name}</span>
                    </div>
                    <ul class="task-list">${tasksHtml}</ul>
                    <div class="add-form" id="${formId}">
                        <div style="display:flex; gap:8px; margin-bottom:8px"><input type="text" id="title-${formId}" class="form-input" style="flex:1; padding:8px; border-radius:6px" placeholder="Task name..."></div>
                        <div style="display:flex; gap:8px; margin-bottom:8px">
                            <input type="time" id="time-${formId}" class="form-input" style="padding:6px; border-radius:6px">
                            <select id="prio-${formId}" class="form-input" style="padding:6px; border-radius:6px; flex:1"><option value="Medium">Medium Prio</option><option value="High">High Prio</option><option value="Low">Low Prio</option></select>
                        </div>
                        <div style="display:flex; align-items:center; justify-content:space-between">
                            <div style="display:flex; align-items:center; gap:5px"><input type="checkbox" id="req-${formId}" style="width:16px; height:16px"> <label for="req-${formId}" style="font-size:0.85rem; color:var(--text-main)">Required for Streak</label></div>
                            <div style="display:flex; gap:5px"><button type="button" onclick="window.app.toggleForm('${formId}')" style="padding:6px 12px; background:none; border:1px solid #ccc; border-radius:6px; cursor:pointer; color:var(--text-main)">Cancel</button><button type="button" onclick="window.app.addTask('${part.name}', '${formId}')" style="padding:6px 12px; background:var(--primary); color:white; border:none; border-radius:6px; cursor:pointer">Save</button></div>
                        </div>
                    </div>
                    <button class="add-trigger-btn" onclick="window.app.toggleForm('${formId}')"><span>+</span> Add Task</button>
                `;
                container.innerHTML += sectionHtml;
            });
        }
        this.updateProgress(tasks);
        this.renderStreak();
    }
}

window.app = new StudyPlanner();

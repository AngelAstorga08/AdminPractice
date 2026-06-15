// ========== DASHBOARD.JS - GESTIONAR TAREAS ==========
// TaskManager Pro - Gestión de tareas
// Versión: 2.3.0

let tasks = [];
let editingTaskId = null;
let categoryChart = null;

// ========== CONSTANTES ==========

const CATEGORY_NAMES = {
    personal: 'Personal',
    trabajo: 'Trabajo',
    estudio: 'Estudio',
    hogar: 'Hogar',
    proyecto: 'Proyecto'
};

const PRIORITY_NAMES = {
    baja: 'Baja',
    media: 'Media',
    alta: 'Alta',
    urgente: 'Urgente'
};

const CATEGORY_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

// ========== UTILIDADES ==========

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[m]));
}

function formatDate(dateStr) {
    if (!dateStr) return { text: 'Sin fecha', class: '' };
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const formatted = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

    if (dateStr === today) return { text: '📅 Hoy', class: 'today' };
    if (dateStr === tomorrowStr) return { text: '📅 Mañana', class: '' };
    if (dateStr < today) return { text: `⚠️ ${formatted}`, class: 'overdue' };
    return { text: formatted, class: '' };
}

// ========== ALMACENAMIENTO ==========

function loadTasks() {
    try {
        const saved = localStorage.getItem('taskmanager_tasks_pro');
        tasks = saved ? JSON.parse(saved) : [];
    } catch (e) {
        console.error('Error al leer tareas del localStorage:', e);
        tasks = [];
    }
    renderAll();
}

function saveTasks() {
    try {
        localStorage.setItem('taskmanager_tasks_pro', JSON.stringify(tasks));
    } catch (e) {
        console.error('Error al guardar tareas:', e);
    }
    renderAll();
}

function addActivity(action, taskTitle) {
    try {
        const activities = JSON.parse(localStorage.getItem('taskmanager_activity') || '[]');
        activities.unshift({
            id: Date.now(),
            action: action,
            taskTitle: taskTitle,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('taskmanager_activity', JSON.stringify(activities.slice(0, 50)));
    } catch (e) {
        console.error('Error al registrar actividad:', e);
    }
}

// ========== CRUD OPERACIONES ==========

function toggleTaskStatus(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        addActivity(task.completed ? 'completed' : 'pending', task.title);
        saveTasks();
    }
}

function deleteTask(id) {
    if (confirm('¿Eliminar esta tarea permanentemente?')) {
        const task = tasks.find(t => t.id === id);
        if (task) addActivity('deleted', task.title);
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
    }
}

function updateTask(id, updatedData) {
    const index = tasks.findIndex(t => t.id === id);
    if (index !== -1) {
        tasks[index] = { ...tasks[index], ...updatedData };
        addActivity('updated', tasks[index].title);
        saveTasks();
        closeEditModal();
    }
}

// ========== ESTADÍSTICAS ==========

function getStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const today = new Date().toISOString().split('T')[0];
    const overdue = tasks.filter(t => !t.completed && t.dueDate && t.dueDate < today).length;
    return { total, completed, pending, overdue };
}

function getCategoryStats() {
    const categories = { personal: 0, trabajo: 0, estudio: 0, hogar: 0, proyecto: 0 };
    tasks.forEach(task => {
        if (categories[task.category] !== undefined) {
            categories[task.category]++;
        }
    });
    return categories;
}

// ========== RENDERIZADO ==========

function renderStats() {
    const stats = getStats();
    document.getElementById('totalTasks').textContent = stats.total;
    document.getElementById('completedTasks').textContent = stats.completed;
    document.getElementById('pendingTasks').textContent = stats.pending;
    document.getElementById('overdueTasks').textContent = stats.overdue;
}

function renderChart() {
    const categories = getCategoryStats();
    const catCtx = document.getElementById('categoryChart')?.getContext('2d');
    if (!catCtx) return;

    if (categoryChart) categoryChart.destroy();

    const categoryData = Object.values(categories);
    const categoryLabels = Object.keys(categories).map(k => CATEGORY_NAMES[k]);

    categoryChart = new Chart(catCtx, {
        type: 'doughnut',
        data: {
            labels: categoryLabels,
            datasets: [{
                data: categoryData,
                backgroundColor: CATEGORY_COLORS,
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const total = categoryData.reduce((a, b) => a + b, 0);
                            const percentage = total === 0 ? 0 : ((context.raw / total) * 100).toFixed(1);
                            return `${context.label}: ${context.raw} tareas (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function renderTasks() {
    const container = document.getElementById('tasksList');
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('categoryFilter')?.value || 'all';
    const priorityFilter = document.getElementById('priorityFilter')?.value || 'all';
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';

    let filtered = [...tasks];

    if (searchTerm) {
        filtered = filtered.filter(t =>
            t.title.toLowerCase().includes(searchTerm) ||
            (t.description && t.description.toLowerCase().includes(searchTerm))
        );
    }
    if (categoryFilter !== 'all') filtered = filtered.filter(t => t.category === categoryFilter);
    if (priorityFilter !== 'all') filtered = filtered.filter(t => t.priority === priorityFilter);
    if (statusFilter === 'pending') filtered = filtered.filter(t => !t.completed);
    else if (statusFilter === 'completed') filtered = filtered.filter(t => t.completed);

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-message">
                <i class="fas fa-check-circle" style="font-size: 48px; margin-bottom: 16px; display: block;"></i>
                No hay tareas que coincidan con los filtros
            </div>`;
        return;
    }

    container.innerHTML = filtered.map(task => {
        const dateInfo = formatDate(task.dueDate);
        const descHtml = task.description
            ? `<div class="task-desc">${escapeHtml(task.description.substring(0, 80))}${task.description.length > 80 ? '...' : ''}</div>`
            : '';

        return `
            <div class="task-item">
                <div class="task-checkbox ${task.completed ? 'completed' : ''}" onclick="toggleTaskStatus(${task.id})">
                    ${task.completed ? '<i class="fas fa-check"></i>' : ''}
                </div>
                <div class="task-info">
                    <div class="task-title ${task.completed ? 'completed' : ''}">${escapeHtml(task.title)}</div>
                    ${descHtml}
                </div>
                <div><span class="category-badge ${task.category}">${CATEGORY_NAMES[task.category] || task.category}</span></div>
                <div><span class="priority-badge ${task.priority}">${PRIORITY_NAMES[task.priority] || task.priority}</span></div>
                <div><span class="due-date ${dateInfo.class}"><i class="far fa-calendar"></i> ${dateInfo.text}</span></div>
                <div class="status-badge">
                    <span style="background: ${task.completed ? '#D1FAE5' : '#FEF3C7'}; padding: 4px 12px; border-radius: 20px; font-size: 11px;">
                        ${task.completed ? '✅ Completada' : '⏳ Pendiente'}
                    </span>
                </div>
                <div class="actions">
                    <button class="edit-btn" onclick="openEditModal(${task.id})"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn" onclick="deleteTask(${task.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    }).join('');
}

function renderAll() {
    renderStats();
    renderTasks();
    renderChart();
}

// ========== MODAL EDITAR ==========

function openEditModal(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    editingTaskId = id;
    document.getElementById('editTitle').value = task.title;
    document.getElementById('editDesc').value = task.description || '';
    document.getElementById('editCategory').value = task.category;
    document.getElementById('editPriority').value = task.priority;
    document.getElementById('editDueDate').value = task.dueDate || '';
    document.getElementById('editModal').classList.add('active');
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
    editingTaskId = null;
}

function saveEdit() {
    if (!editingTaskId) return;
    const newTitle = document.getElementById('editTitle').value.trim();
    if (!newTitle) {
        alert('El título es obligatorio');
        return;
    }
    updateTask(editingTaskId, {
        title: newTitle,
        description: document.getElementById('editDesc').value.trim(),
        category: document.getElementById('editCategory').value,
        priority: document.getElementById('editPriority').value,
        dueDate: document.getElementById('editDueDate').value
    });
}

// ========== FILTROS ==========

function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('categoryFilter').value = 'all';
    document.getElementById('priorityFilter').value = 'all';
    document.getElementById('statusFilter').value = 'all';
    renderTasks();
}

// ========== EVENTOS ==========

document.addEventListener('DOMContentLoaded', function () {
    loadTasks();

    document.getElementById('searchInput')?.addEventListener('input', () => renderTasks());
    document.getElementById('categoryFilter')?.addEventListener('change', () => renderTasks());
    document.getElementById('priorityFilter')?.addEventListener('change', () => renderTasks());
    document.getElementById('statusFilter')?.addEventListener('change', () => renderTasks());
    document.getElementById('resetFiltersBtn')?.addEventListener('click', resetFilters);

    document.getElementById('closeModalBtn')?.addEventListener('click', closeEditModal);
    document.getElementById('cancelEditBtn')?.addEventListener('click', closeEditModal);
    document.getElementById('saveEditBtn')?.addEventListener('click', saveEdit);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.getElementById('editModal').classList.contains('active')) {
            closeEditModal();
        }
    });

    document.getElementById('editModal')?.addEventListener('click', function (e) {
        if (e.target === this) closeEditModal();
    });
});

// Exponer funciones usadas desde el HTML inline (onclick)
window.toggleTaskStatus = toggleTaskStatus;
window.deleteTask = deleteTask;
window.openEditModal = openEditModal;

// Sincronizar si index.html está abierto en otra pestaña
window.addEventListener('storage', (e) => {
    if (e.key === 'taskmanager_tasks_pro') {
        tasks = JSON.parse(e.newValue || '[]');
        renderAll();
    }
});
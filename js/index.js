// ========== INDEX.JS - AGREGAR TAREAS ==========
// TaskManager Pro - Gestión de tareas
// Versión: 1.2.0

// Función para obtener la fecha de mañana (por defecto)
function getTomorrowDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
}

// Función para cargar tareas existentes
function loadTasks() {
    const saved = localStorage.getItem('taskmanager_tasks_pro');
    return saved ? JSON.parse(saved) : [];
}

// Función para guardar tareas
function saveTasks(tasks) {
    localStorage.setItem('taskmanager_tasks_pro', JSON.stringify(tasks));
}

// Función para registrar actividad
function addActivity(action, taskTitle) {
    const activities = JSON.parse(localStorage.getItem('taskmanager_activity') || '[]');
    activities.unshift({
        id: Date.now(),
        action: action,
        taskTitle: taskTitle,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem('taskmanager_activity', JSON.stringify(activities.slice(0, 50)));
}

// Función para mostrar mensaje de éxito
function showSuccessMessage() {
    const msg = document.getElementById('successMsg');
    if (msg) {
        msg.classList.add('show');
        setTimeout(() => {
            msg.classList.remove('show');
        }, 2000);
    }
}

// Función principal para guardar la tarea
function saveTask() {
    // Obtener valores del formulario
    const title = document.getElementById('taskTitle').value.trim();
    
    // Validar título
    if (!title) {
        alert('⚠️ El título es obligatorio');
        return;
    }
    
    // Crear objeto de tarea
    const newTask = {
        id: Date.now(),
        title: title,
        description: document.getElementById('taskDesc').value.trim(),
        category: document.getElementById('taskCategory').value,
        priority: document.getElementById('taskPriority').value,
        dueDate: document.getElementById('taskDueDate').value || getTomorrowDate(),
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    // Guardar en localStorage
    const tasks = loadTasks();
    tasks.unshift(newTask);
    saveTasks(tasks);
    
    // Registrar actividad
    addActivity('created', newTask.title);
    
    // Limpiar formulario
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDesc').value = '';
    document.getElementById('taskCategory').value = 'personal';
    document.getElementById('taskPriority').value = 'media';
    document.getElementById('taskDueDate').value = getTomorrowDate();
    
    // Mostrar mensaje de éxito
    showSuccessMessage();
}

// Función para limpiar el formulario
function clearForm() {
    if (confirm('¿Limpiar todos los campos del formulario?')) {
        document.getElementById('taskTitle').value = '';
        document.getElementById('taskDesc').value = '';
        document.getElementById('taskCategory').value = 'personal';
        document.getElementById('taskPriority').value = 'media';
        document.getElementById('taskDueDate').value = getTomorrowDate();
    }
}

// Configurar fecha por defecto al cargar la página
function setDefaultDate() {
    const dueDateInput = document.getElementById('taskDueDate');
    if (dueDateInput && !dueDateInput.value) {
        dueDateInput.value = getTomorrowDate();
    }
}

// Eventos al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    // Configurar fecha por defecto
    setDefaultDate();
    
    // Botón guardar
    const saveBtn = document.getElementById('saveTaskBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveTask);
    }
    
    // Permitir guardar con Enter (desde el título)
    const titleInput = document.getElementById('taskTitle');
    if (titleInput) {
        titleInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveTask();
            }
        });
    }
});

// Exponer función para pruebas (opcional)
window.saveTask = saveTask;
window.clearForm = clearForm;
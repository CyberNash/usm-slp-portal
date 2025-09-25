// js/admin-dashboard.js

// This is the main entry point for the page.
document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. Securely validate the user's session token with the backend.
    const currentUser = await validateSession();

    // 2. If validation fails, the user is redirected and the script stops.
    if (!currentUser) return;

    // 3. Check if the validated user has the correct 'Admin' role for this page.
    if (currentUser.role !== 'Admin') {
        alert('Access Denied. You do not have permission to view this page.');
        window.location.href = 'index.html';
        return;
    }

    // 4. If all checks pass, initialize the admin page with the secure user data.
    initAdminView(currentUser);
});


// === ALL HELPER FUNCTIONS ARE NOW OUTSIDE THE DOMContentLoaded BLOCK ===


/**
 * Initializes all elements and event listeners for the dashboard.
 * @param {object} currentUser The validated user data object.
 */
function initAdminView(currentUser) {
    // --- Get Elements ---
    const resourceForm = document.getElementById('resource-form');
    const resourcesListContainer = document.getElementById('existing-resources-list');
    const usersViewContainer = document.getElementById('users-view');
    const editUserForm = document.getElementById('edit-user-form');
    const modalBackdrop = document.getElementById('modal-backdrop');

    // --- Initialize UI ---
    document.getElementById('welcome-message').textContent = `Welcome, ${currentUser.fullName}!`;
    loadExistingResources(currentUser);
    loadAllUsers(currentUser);

    // --- Setup Event Listeners, passing currentUser where needed ---
    resourceForm.addEventListener('submit', (e) => handleResourceSubmit(e, currentUser));
    resourcesListContainer.addEventListener('click', (e) => handleResourceListClick(e, currentUser));
    usersViewContainer.addEventListener('click', (e) => handleUserListClick(e, currentUser));
    editUserForm.addEventListener('submit', (e) => handleEditUserSubmit(e, currentUser));
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // Modal close listeners
    modalBackdrop.addEventListener('click', (e) => {
        if (e.target.matches('.close-btn') || e.target === modalBackdrop) hideModals();
    });

    // Sidebar View Switching Logic
    const navLinks = document.querySelectorAll('.admin-nav-link');
    const views = document.querySelectorAll('.admin-view');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = link.dataset.view;
            navLinks.forEach(item => item.classList.remove('active'));
            link.classList.add('active');
            views.forEach(view => {
                view.style.display = view.id === viewId ? 'block' : 'none';
            });
        });
    });
}

// --- Modal Helpers (Generic) ---
function showModal(modalId) {
    document.getElementById('modal-backdrop').style.display = 'flex';
    document.getElementById(modalId).style.display = 'block';
}
function hideModals() {
    const modalBackdrop = document.getElementById('modal-backdrop');
    modalBackdrop.style.display = 'none';
    modalBackdrop.querySelectorAll('.modal-content').forEach(modal => modal.style.display = 'none');
}

// --- User Management ---
async function loadAllUsers(currentUser) { // <-- Accepts currentUser for token
    const supervisorsListContainer = document.getElementById('supervisors-list');
    const studentsListContainer = document.getElementById('students-list');
    supervisorsListContainer.innerHTML = "<p>Loading supervisors...</p>";
    studentsListContainer.innerHTML = "<p>Loading students...</p>";
    try {
        // This is a GET request, so we can pass the token in the URL for simplicity
        const response = await fetch(`${API_URL}?action=getAllUsers&userId=${currentUser.userId}&token=${currentUser.token}`);
        const result = await response.json();

        if (result.status === 'success') {
            let supHtml = `<div class="user-list"><div class="user-list__header"><div>Name</div><div>Email</div><div>Employee ID</div><div>Action</div></div>`; 
            result.data.supervisors.forEach(sup => {
                supHtml += `<div class="user-list__item"><div>${sup.name}</div><div>${sup.email}</div><div>${sup.specificId}</div><div class="actions"><button class="btn-admin-edit" data-id="${sup.id}" data-role="Supervisor">Edit</button><button class="btn-admin-delete" data-id="${sup.id}" data-role="Supervisor">Delete</button></div></div>`;
            });
            supHtml += '</div>';
            supervisorsListContainer.innerHTML = supHtml;
            
            let stuHtml = `<div class="user-list"><div class="user-list__header"><div>Name</div><div>Email</div><div>Matric Number</div><div>Action</div></div>`;
            result.data.students.forEach(stu => {
                stuHtml += `<div class="user-list__item"><div>${stu.name}</div><div>${stu.email}</div><div>${stu.specificId}</div><div class="actions"><button class="btn-admin-edit" data-id="${stu.id}" data-role="Student">Edit</button><button class="btn-admin-delete" data-id="${stu.id}" data-role="Student">Delete</button></div></div>`;
            });
            stuHtml += '</div>';
            studentsListContainer.innerHTML = stuHtml;
        } else {
             throw new Error(result.message || 'Failed to fetch users.');
        }
    } catch (e) {
        supervisorsListContainer.innerHTML = `<p style='color:red;'>Failed to load supervisors: ${e.message}</p>`;
        studentsListContainer.innerHTML = `<p style='color:red;'>Failed to load students: ${e.message}</p>`;
    }
}

async function handleUserListClick(event, currentUser) { // <-- Accepts currentUser
    const target = event.target;
    const editBtn = target.closest('.btn-admin-edit');
    const deleteBtn = target.closest('.btn-admin-delete');

    if (editBtn) {
        const userId = editBtn.dataset.id;
        const userRole = editBtn.dataset.role;
        try {
            const response = await fetch(`${API_URL}?action=getUserById&id=${userId}&role=${userRole}&token=${currentUser.token}`); // Secure this GET request
            const result = await response.json();
            if (result.status === 'success') {
                document.getElementById('edit-user-id').value = result.data.id;
                document.getElementById('edit-user-role').value = userRole;
                document.getElementById('edit-user-name').textContent = result.data.name;
                document.getElementById('edit-user-email').value = result.data.email;
                document.getElementById('edit-user-password').value = '';
                showModal('edit-user-modal');
            } else { alert('Error: ' + result.message); }
        } catch(e) { alert('A network error occurred.'); }
    }

    if (deleteBtn) {
        const userIdToDelete = deleteBtn.dataset.id;
        const userRole = deleteBtn.dataset.role;
        if (confirm(`Are you sure you want to permanently delete this ${userRole}? This is irreversible.`)) {
            const payload = { 
                action: 'deleteUser',
                // --- Security Upgrade ---
                userId: currentUser.userId, // The Admin's ID
                token: currentUser.token,   // The Admin's token
                // --- Data ---
                userIdToDelete: userIdToDelete,
                role: userRole 
            };
            try {
                const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
                const result = await response.json();
                alert(result.message);
                if (result.status === 'success') loadAllUsers(currentUser);
            } catch(e) { alert('A network error occurred.'); }
        }
    }
}

async function handleEditUserSubmit(e, currentUser) { // <-- Accepts currentUser
    e.preventDefault();
    const payload = {
        action: 'updateUser',
        // --- Security Upgrade ---
        userId: currentUser.userId, // The Admin's ID
        token: currentUser.token,   // The Admin's token
        // --- Data ---
        userIdToUpdate: document.getElementById('edit-user-id').value,
        role: document.getElementById('edit-user-role').value,
        email: document.getElementById('edit-user-email').value,
        newPassword: document.getElementById('edit-user-password').value
    };
    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        alert(result.message);
        if (result.status === 'success') {
            hideModals();
            loadAllUsers(currentUser);
        }
    } catch(e) { alert('A network error occurred.'); }
}
    
// --- Resource Management ---
async function loadExistingResources(currentUser) { // <-- Accepts currentUser
    const resourcesListContainer = document.getElementById('existing-resources-list');
    resourcesListContainer.innerHTML = "<p>Loading resources...</p>";
    try {
        const response = await fetch(`${API_URL}?action=getAllResources&token=${currentUser.token}`); // Secure the GET request
        const result = await response.json();
        if(result.status === 'success' && result.data.length > 0) {
            let html = '<ul class="resource-list">';
            result.data.forEach(res => {
                html += `<li><span>${res.title} (${res.category})</span><button class="btn-admin-delete" data-id="${res.id}">Delete</button></li>`;
            });
            html += '</ul>';
            resourcesListContainer.innerHTML = html;
        } else {
            resourcesListContainer.innerHTML = '<p>No resources found.</p>';
        }
    } catch(e) { resourcesListContainer.innerHTML = '<p style="color:red;">Failed to load resources.</p>'; }
}
    
async function handleResourceListClick(event, currentUser) { // <-- Accepts currentUser
    if (event.target.matches('.btn-admin-delete')) {
        const resourceId = event.target.dataset.id;
        if (confirm('Are you sure you want to delete this resource?')) {
            const payload = { 
                action: 'deleteResource',
                // --- Security Upgrade ---
                userId: currentUser.userId,
                token: currentUser.token,
                // --- Data ---
                resourceId: resourceId 
            };
            try {
                const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
                const result = await response.json();
                alert(result.message);
                if (result.status === 'success') loadExistingResources(currentUser);
            } catch(e) { alert('A network error occurred.'); }
        }
    }
}
    
async function handleResourceSubmit(e, currentUser) { // <-- Accepts currentUser
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    const file = document.getElementById('res-file').files[0];
    if (!file) {
        alert('Please select a file to upload.');
        submitBtn.disabled = false;
        return;
    }
    try {
        submitBtn.textContent = 'Uploading...';
        const fileUrl = await uploadFile(file, currentUser); // Pass currentUser for token
        submitBtn.textContent = 'Saving...';
        const payload = {
             action: 'addResource',
            // --- Security Upgrade ---
            userId: currentUser.userId,
            token: currentUser.token,
            // --- Data ---
            title: document.getElementById('res-title').value,
            description: document.getElementById('res-desc').value,
            category: document.getElementById('res-category').value,
            fileUrl: fileUrl,
            uploaderId: currentUser.userId // Keep this for the sheet data
        };
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        alert(result.message);
        if(result.status === 'success') {
            e.target.closest('form').reset();
            loadExistingResources(currentUser);
        }
    } catch(error) {
        alert('Error: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Upload & Add Resource';
    }
}
    
function uploadFile(file, currentUser) { // <-- Accepts currentUser
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const payload = { 
                action: 'handleFileUpload',
                // --- Security Upgrade (Optional but good) ---
                userId: currentUser.userId,
                token: currentUser.token,
                // --- Data ---
                fileName: file.name,
                mimeType: file.type,
                fileData: reader.result.split(',')[1],
                uploadContext: 'resource'
            };
            try {
                const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
                const result = await response.json();
                if (result.status === 'success') resolve(result.fileUrl); else reject(new Error(result.message));
            } catch(e) {
                reject(new Error("Network error during file upload."));
            }
        };
        reader.onerror = error => reject(error);
    });
}

// --- Generic ---
function handleLogout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}
//js/admin-dashboard.js
document.addEventListener('DOMContentLoaded',async () => {
    const currentUser = await validateSession();
    if (!currentUser) return;
    if (currentUser.role !== 'Admin') {
        alert('Access Denied. You do not have permission to view this page.');
        window.location.href = 'index.html';
        return;
    }
    // --- 2. GET ALL NECESSARY ELEMENTS ---
    const resourceForm = document.getElementById('resource-form');
    const resourcesListContainer = document.getElementById('existing-resources-list');
    const supervisorsListContainer = document.getElementById('supervisors-list');
    const studentsListContainer = document.getElementById('students-list');
    const editUserForm = document.getElementById('edit-user-form');
    const modalBackdrop = document.getElementById('modal-backdrop');
    document.getElementById('welcome-message').textContent = `Welcome, ${currentUser.fullName}!`;
    // --- 3. MAIN INITIALIZER ---
    function initAdminView(currentUser) {
        // Load initial data for the default view
        loadExistingResources();
        loadAllUsers();

        // Setup all event listeners for the page
        resourceForm.addEventListener('submit', handleResourceSubmit);
        resourcesListContainer.addEventListener('click', handleResourceListClick);
        document.getElementById('logout-btn').addEventListener('click', handleLogout);
        document.getElementById('users-view').addEventListener('click', handleUserListClick);
        editUserForm.addEventListener('submit', handleEditUserSubmit);
        modalBackdrop.addEventListener('click', (e) => {
            if (e.target.matches('.close-btn') || e.target === modalBackdrop) {
                hideModals();
            }
        });
        
        // Setup View Switching Logic for the sidebar
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

    // --- 4. MODAL HELPER FUNCTIONS ---
    function showModal(modalId) {
        modalBackdrop.style.display = 'flex';
        document.getElementById(modalId).style.display = 'block';
    }
    function hideModals() {
        modalBackdrop.style.display = 'none';
        modalBackdrop.querySelectorAll('.modal-content').forEach(modal => modal.style.display = 'none');
    }

    // --- 5. USER MANAGEMENT FUNCTIONS ---
    async function loadAllUsers() {
        supervisorsListContainer.innerHTML = "<p>Loading supervisors...</p>";
        studentsListContainer.innerHTML = "<p>Loading students...</p>";
        try {
            const response = await fetch(`${API_URL}?action=getAllUsers`);
            const result = await response.json();

            if (result.status === 'success') {
                // --- Render Supervisors ---
                let supHtml = `
                    <div class="user-list">
                        <div class="user-list__header">
                            <div>Name</div>
                            <div>Email</div>
                            <div>Employee ID</div>
                            <div>Action</div>
                        </div>`; 
                
                result.data.supervisors.forEach(sup => {
                    supHtml += `
                        <div class="user-list__item">
                            <div>${sup.name}</div>
                            <div>${sup.email}</div>
                            <div>${sup.specificId}</div>
                            <div class="actios">
                            <button class="btn-admin-edit" data-id="${sup.id}" data-role="Supervisor">Edit</button>
                            <button class="btn-admin-delete" data-id="${sup.id}" data-role="Supervisor">Delete</button>
                            </div>
                        </div>`;
                });
                supHtml += '</div>';
                supervisorsListContainer.innerHTML = supHtml;
                
                // --- Render Students ---
                let stuHtml = `
                    <div class="user-list">
                        <div class="user-list__header">
                            <div>Name</div>
                            <div>Email</div>
                            <div>Matric Number</div>
                            <div>Action</div>
                        </div>`;
                
                result.data.students.forEach(stu => {
                    stuHtml += `
                        <div class="user-list__item">
                            <div>${stu.name}</div>
                            <div>${stu.email}</div>
                            <div>${stu.specificId}</div>
                            <div class="actios">
                                <button class="btn-admin-edit" data-id="${stu.id}" data-role="Student">Edit</button>
                                <button class="btn-admin-delete" data-id="${stu.id}" data-role="Student">Delete</button>
                            </div>
                        </div>`;
                });
                stuHtml += '</div>';
                studentsListContainer.innerHTML = stuHtml;
            }
        } catch (e) {
            supervisorsListContainer.innerHTML = "<p style='color:red;'>Failed to load supervisors.</p>";
            studentsListContainer.innerHTML = "<p style='color:red;'>Failed to load students.</p>";
        }
    }

    async function handleUserListClick(event) {
        const target = event.target;
        const editBtn = target.closest('.btn-admin-edit');
        const deleteBtn = target.closest('.btn-admin-delete');

        if (editBtn) {
            const userId = editBtn.dataset.id;
            const userRole = editBtn.dataset.role;
            const response = await fetch(`${API_URL}?action=getUserById&id=${userId}&role=${userRole}`);
            const result = await response.json();
            if (result.status === 'success') {
                document.getElementById('edit-user-id').value = result.data.id;
                document.getElementById('edit-user-role').value = userRole;
                document.getElementById('edit-user-name').textContent = result.data.name;
                document.getElementById('edit-user-email').value = result.data.email;
                document.getElementById('edit-user-password').value = '';
                showModal('edit-user-modal');
            } else { alert('Error: ' + result.message); }
        }

        if (deleteBtn) {
            const userId = deleteBtn.dataset.id;
            const userRole = deleteBtn.dataset.role;
            if (confirm(`Are you sure you want to permanently delete this ${userRole}? This is irreversible.`)) {
                const payload = { action: 'deleteUser', userId, role: userRole };
                try {
                    const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
                    const result = JSON.parse(await response.text());
                    alert(result.message);
                    if (result.status === 'success') loadAllUsers();
                } catch(e) { alert('A network error occurred.'); }
            }
        }
    }

    async function handleEditUserSubmit(e) {
        e.preventDefault();
        const payload = {
            action: 'updateUser',
            userId: document.getElementById('edit-user-id').value,
            role: document.getElementById('edit-user-role').value,
            email: document.getElementById('edit-user-email').value,
            newPassword: document.getElementById('edit-user-password').value
        };
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = JSON.parse(await response.text());
        alert(result.message);
        if (result.status === 'success') {
            hideModals();
            loadAllUsers();
        }
    }
    
    // --- 6. RESOURCE MANAGEMENT FUNCTIONS ---
    async function loadExistingResources() {
        resourcesListContainer.innerHTML = "<p>Loading resources...</p>";
        try {
            const response = await fetch(`${API_URL}?action=getAllResources`);
            const result = await response.json();
            if(result.status === 'success' && result.data.length > 0) {
                let html = '<ul class="resource-list">';
                result.data.forEach(res => {
                    html += `<li><span>${res.title} (${res.category})</span><button class="btn-delete" data-id="${res.id}">Delete</button></li>`;
                });
                html += '</ul>';
                resourcesListContainer.innerHTML = html;
            } else {
                resourcesListContainer.innerHTML = '<p>No resources found.</p>';
            }
        } catch(e) { resourcesListContainer.innerHTML = '<p style="color:red;">Failed to load resources.</p>'; }
    }
    
    async function handleResourceListClick(event) {
        if (event.target.matches('.btn-admin-delete')) {
            const resourceId = event.target.dataset.id;
            if (confirm('Are you sure you want to delete this resource?')) {
                const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteResource', resourceId }) });
                const result = JSON.parse(await response.text());
                alert(result.message);
                if (result.status === 'success') loadExistingResources();
            }
        }
    }
    
    async function handleResourceSubmit(e) {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        const fileInput = document.getElementById('res-file');
        const file = fileInput.files[0];
        if (!file) {
            alert('Please select a file to upload.');
            submitBtn.disabled = false;
            return;
        }
        try {
            submitBtn.textContent = 'Uploading...';
            const fileUrl = await uploadFile(file);
            submitBtn.textContent = 'Saving...';
            const payload = { action: 'addResource', title: document.getElementById('res-title').value, description: document.getElementById('res-desc').value, category: document.getElementById('res-category').value, fileUrl: fileUrl, uploaderId: currentUser.userId };
            const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
            const result = JSON.parse(await response.text());
            alert(result.message);
            if(result.status === 'success') {
                resourceForm.reset();
                loadExistingResources();
            }
        } catch(error) {
            alert('Error: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Upload & Add Resource';
        }
    }
    
    function uploadFile(file) {
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const payload = { action: 'handleFileUpload', fileName: file.name, mimeType: file.type, fileData: reader.result.split(',')[1], uploadContext: 'resource' };
                const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
                const result = JSON.parse(await response.text());
                if (result.status === 'success') resolve(result.fileUrl); else reject(new Error(result.message));
            };
            reader.onerror = error => reject(error);
        });
    }

    function handleLogout() {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }

    // --- 7. INITIAL EXECUTION ---
    initAdminView();
});
// js/student-dashboard.js

document.addEventListener('DOMContentLoaded', async () => {
    const currentUser = await validateSession();
    if (!currentUser) return;
    if (currentUser.role !== 'Student') {
        alert('Access Denied. You do not have permission to view this page.');
        window.location.href = 'index.html';
        return;
    }
});
    
let selectedFile = null;

function initStudentView(currentUser) {
    // --- Get page elements ---
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutBtn = document.getElementById('logout-btn');
    const fileInput = document.getElementById('absence-file');
    const removeFileBtn = document.getElementById('remove-file-btn');
    const absenceForm = document.getElementById('absence-form');
    
    // --- Initialize UI components ---
    welcomeMessage.textContent = `Welcome, ${currentUser.fullName}!`;
    populateStudentProfile(currentUser);        // <-- CHANGED: Pass currentUser
    populateSupervisorsDropdown();            // This one doesn't need user data
    loadAbsenceHistory(currentUser);          // <-- CHANGED: Pass currentUser
    
    // --- Set up event listeners ---
    absenceForm.addEventListener('submit', (e) => handleAbsenceSubmit(e, currentUser)); // <-- CHANGED: Pass currentUser
    fileInput.addEventListener('change', handleFileSelect);
    removeFileBtn.addEventListener('click', handleRemoveFile);
    logoutBtn.addEventListener('click', handleLogout);
}

function handleFileSelect(e) {
    selectedFile = e.target.files[0];
    const fileStatusText = document.getElementById('file-upload-status');
    const removeFileBtn = document.getElementById('remove-file-btn');
    if (selectedFile) {
        fileStatusText.textContent = `Selected: ${selectedFile.name}`;
        removeFileBtn.style.display = 'inline-block';
    } else {
        handleRemoveFile();
    }
}

function handleRemoveFile() {
    selectedFile = null;
    document.getElementById('absence-file').value = '';
    document.getElementById('file-upload-status').textContent = '';
    document.getElementById('remove-file-btn').style.display = 'none';
}

function populateStudentProfile(currentUser) { // <-- CHANGED: Accepts currentUser
    const profileCard = document.getElementById('student-profile-card');
    profileCard.innerHTML = `
        <div class="profile-card__header">
            <div class="profile-card__avatar"><i class="fas fa-user-graduate"></i></div>
            <h3 class="profile-card__name">${currentUser.fullName}</h3>
            <p class="profile-card__title">Student</p>
        </div>
        <div class="profile-card__body">
            <div class="profile-card__item">
                <i class="fas fa-id-card profile-card__icon"></i>
                <span class="profile-card__label">Matric Number</span>
                <span class="profile-card__value">${currentUser.matricNumber}</span>
            </div>
            <div class="profile-card__item">
                <i class="fas fa-envelope profile-card__icon"></i>
                <span class="profile-card__label">Email</span>
                <span class="profile-card__value">${currentUser.email}</span>
            </div>
            <div class="profile-card__item">
                <i class="fas fa-phone profile-card__icon"></i>
                <span class="profile-card__label">Phone</span>
                <span class="profile-card__value">+60 ${currentUser.phoneNumber}</span>
            </div>
            <div class="profile-card__item">
                <i class="fas fa-book-open profile-card__icon"></i>
                <span class="profile-card__label">Year & Course</span>
                <span class="profile-card__value">${currentUser.yearCourse}</span>
            </div>
        </div>`;
}

async function populateSupervisorsDropdown() {
    const select = document.getElementById('supervisor-select');
    try {
        const response = await fetch(`${API_URL}?action=getSupervisors`); // Note: Doesn't need a token yet, but could be added for security
        const result = await response.json();
        if (result.status === 'success') {
            select.innerHTML = '<option value="">-- Select a Supervisor --</option>';
            result.data.forEach(supervisor => {
                select.innerHTML += `<option value="${supervisor.id}">${supervisor.name}</option>`;
            });
        }
    } catch (error) { console.error('Error fetching supervisors:', error); }
}

async function handleAbsenceSubmit(e, currentUser) { // <-- CHANGED: Accepts currentUser
    e.preventDefault();
    const submitBtn = document.getElementById('absence-submit-btn');
    submitBtn.disabled = true;

    let fileUrl = '';
    if (selectedFile) {
        submitBtn.textContent = 'Uploading File...';
        try { fileUrl = await uploadFile(selectedFile); } 
        catch (error) {
            alert(`File upload failed: ${error.message}`);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Request';
            return;
        }
    }
    
    submitBtn.textContent = 'Saving Request...';
    // This is where we secure the request
    const payload = {
        action: 'submitAbsence',
        // --- SECURITY UPGRADE ---
        userId: currentUser.userId,     // Use the validated ID
        token: currentUser.token,       // Send the token for verification
        // -----------------------
        supervisorId: document.getElementById('supervisor-select').value,
        absenceDate: document.getElementById('absence-date').value,
        reason: document.getElementById('absence-reason').value,
        fileUrl: fileUrl
    };

    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = JSON.parse(await response.text()); // Can also use response.json()
        alert(result.message);
        
        if(result.status === 'success') {
            e.target.reset();
            handleRemoveFile();
            loadAbsenceHistory(currentUser); // <-- CHANGED: Pass currentUser to refresh the list
        }
    } catch (error) { 
        alert('A network error occurred.');
    } finally { 
        submitBtn.disabled = false; 
        submitBtn.textContent = 'Submit Request'; 
    }
}

async function loadAbsenceHistory(currentUser) { // <-- CHANGED: Accepts currentUser
    const tbody = document.getElementById('absence-history-body');
    const studentId = currentUser.userId;

    tbody.innerHTML = '<tr><td colspan="5">Loading your history...</td></tr>';
    try {
        // Here we can also secure the request with a token in the future
        const response = await fetch(`${API_URL}?action=getStudentAbsenceHistory&studentId=${studentId}`);
        const result = await response.json();
        if (result.status === 'success' && result.data.length > 0) {
            tbody.innerHTML = '';
            result.data.forEach(item => {
                const row = document.createElement('tr');
                const documentLink = item.fileUrl
                    ? `<a href="${item.fileUrl}" target="_blank" class="table-icon-link" title="View Document"><i class="fas fa-file-alt"></i></a>`
                    : 'N/A';
                const statusPill = `<span class="status-pill ${item.status.toLowerCase()}">${item.status}</span>`;
                row.innerHTML = `
                    <td>${new Date(item.absenceDate).toLocaleDateString()}</td>
                    <td class="supervisor-name-cell">${item.supervisorName}</td>
                    <td>${statusPill}</td>
                    <td class="reason-cell">${item.reason}</td>
                    <td>${documentLink}</td>
                `;
                tbody.appendChild(row);
});
        } else {
            tbody.innerHTML = '<tr><td colspan="5">No absence history found.</td></tr>';
        }
    } catch (error) {
        console.error("Failed to load absence history:", error);
        tbody.innerHTML = '<tr><td colspan="5" style="color: red;">Could not load history. Please try again later.</td></tr>';
    }
}

function uploadFile(file) {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const payload = {
                action: 'handleFileUpload', 
                fileName: file.name, 
                mimeType: file.type, 
                fileData: reader.result.split(',')[1],
                uploadContext: 'absence'
            };
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

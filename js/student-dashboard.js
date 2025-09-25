// js/student-dashboard.js

document.addEventListener('DOMContentLoaded', async () => {
    // CRITICAL: Make sure this is your correct API URL    
    // --- 1. AUTHENTICATION & DATA RETRIEVAL ---
    const currentUser = await validateSession();
    if (!currentUser) return;
    if (currentUser.role !== 'Student') {
        alert('Access Denied. You do not have permission to view this page.');
        window.location.href = 'index.html';
        return;
    }
    
    let selectedFile = null; // Variable to hold the file for upload

    // --- 2. GET PAGE ELEMENTS ---
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutBtn = document.getElementById('logout-btn');
    const fileInput = document.getElementById('absence-file');
    const fileStatusText = document.getElementById('file-upload-status');
    const removeFileBtn = document.getElementById('remove-file-btn');
    
    // --- 3. INITIALIZE THE STUDENT VIEW ---
    function initStudentView(currentUser) {
        // Populate header and profile card with the student's specific data
        welcomeMessage.textContent = `Welcome, ${currentUser.fullName}!`;
        populateStudentProfile();
        loadAbsenceHistory();
        // Prepare the absence form
        populateSupervisorsDropdown();
        document.getElementById('absence-file').addEventListener('change', (e) => {
            selectedFile = e.target.files[0];
            document.getElementById('file-upload-status').textContent = selectedFile ? `Selected: ${selectedFile.name}` : '';
        });
        document.getElementById('absence-form').addEventListener('submit', handleAbsenceSubmit);
        fileInput.addEventListener('change', handleFileSelect);
        removeFileBtn.addEventListener('click', handleRemoveFile);
        
    }
    
    function handleFileSelect(e) {
        selectedFile = e.target.files[0];
        if (selectedFile) {
            fileStatusText.textContent = `Selected: ${selectedFile.name}`;
            removeFileBtn.style.display = 'inline-block'; // Show the 'X' button
        } else {
            handleRemoveFile(); // If user cancels selection, clear it
        }
    }

    function handleRemoveFile() {
    selectedFile = null;
    fileInput.value = ''; // This is the most important step to clear the file input
    fileStatusText.textContent = '';
    removeFileBtn.style.display = 'none'; // Hide the 'X' button
    }
    
function populateStudentProfile() {
    // Target the main profile card container
    const profileCard = document.getElementById('student-profile-card');

    // THE FIX: This new HTML structure removes the extra <div> and places the
    // label and value side-by-side.
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
            const response = await fetch(`${API_URL}?action=getSupervisors`);
            const result = await response.json();
            if (result.status === 'success') {
                select.innerHTML = '<option value="">-- Select a Supervisor --</option>';
                result.data.forEach(supervisor => {
                    select.innerHTML += `<option value="${supervisor.id}">${supervisor.name}</option>`;
                });
            }
        } catch (error) { console.error('Error fetching supervisors:', error); }
    }
    
    async function handleAbsenceSubmit(e) {
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
        const payload = {
            action: 'submitAbsence', studentId: currentUser.userId, supervisorId: document.getElementById('supervisor-select').value,
            absenceDate: document.getElementById('absence-date').value, reason: document.getElementById('absence-reason').value, fileUrl: fileUrl,
        };

        try {
            const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
            const result = JSON.parse(await response.text());
            alert(result.message);
            
            if(result.status === 'success') {
                e.target.reset();    // Clears text fields
                handleRemoveFile();  // Our new function clears the file input and state
                loadAbsenceHistory(); 
            }
        } catch (error) { 
            alert('A network error occurred.');
        } finally { 
            submitBtn.disabled = false; 
            submitBtn.textContent = 'Submit Request'; 
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

async function loadAbsenceHistory() {
    const tbody = document.getElementById('absence-history-body');
    const studentId = currentUser.userId;

    // Show a loading state
    tbody.innerHTML = '<tr><td colspan="5">Loading your history...</td></tr>';

    try {
        // Call our NEW API endpoint
        const response = await fetch(`${API_URL}?action=getStudentAbsenceHistory&studentId=${studentId}`);
        const result = await response.json();

        if (result.status === 'success' && result.data.length > 0) {
            tbody.innerHTML = ''; // Clear the loading message
            result.data.forEach(item => {
                // Create a table row for each history item
                const row = document.createElement('tr');
                
                // Use a conditional (ternary) operator for the document link
                const documentLink = item.fileUrl
                    ? `<a href="${item.fileUrl}" target="_blank" class="table-icon-link" title="View Document"><i class="fas fa-file-alt"></i></a>`
                    : 'N/A';
                
                // Use the item status to apply a CSS class for styling
                const statusPill = `<span class="status-pill ${item.status.toLowerCase()}">${item.status}</span>`;

                row.innerHTML = `
                    <td>${new Date(item.absenceDate).toLocaleDateString()}</td>
                    <td>${item.supervisorName}</td>
                    <td>${statusPill}</td>
                    <td>${item.reason}</td>
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

    // --- 5. LOGOUT & INITIAL EXECUTION ---
    function handleLogout() {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
    logoutBtn.addEventListener('click', handleLogout);
    
    // Start the student dashboard
    initStudentView();
});
// js/student-dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    // CRITICAL: Make sure this is your correct API URL    
    // --- 1. AUTHENTICATION & DATA RETRIEVAL ---
    // This is our security guard. It ensures only a logged-in Student can see this page.
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || currentUser.role !== 'Student') {
        alert('Access Denied. You are not authorized to view this page.');
        // Redirect non-students or logged-out users away.
        window.location.href = 'index.html'; 
        return; // Stop the rest of the script from running
    }
    
    let selectedFile = null; // Variable to hold the file for upload

    // --- 2. GET PAGE ELEMENTS ---
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutBtn = document.getElementById('logout-btn');
    const fileInput = document.getElementById('absence-file');
    const fileStatusText = document.getElementById('file-upload-status');
    const removeFileBtn = document.getElementById('remove-file-btn');
    
    // --- 3. INITIALIZE THE STUDENT VIEW ---
    function initStudentView() {
        // Populate header and profile card with the student's specific data
        welcomeMessage.textContent = `Welcome, ${currentUser.fullName}!`;
        populateStudentProfile();
        
        // Prepare the absence form
        populateSupervisorsDropdown();
        document.getElementById('absence-file').addEventListener('change', (e) => {
            selectedFile = e.target.files[0];
            document.getElementById('file-upload-status').textContent = selectedFile ? `Selected: ${selectedFile.name}` : '';
        });
        document.getElementById('absence-form').addEventListener('submit', handleAbsenceSubmit);
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

    // --- 5. LOGOUT & INITIAL EXECUTION ---
    function handleLogout() {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
    logoutBtn.addEventListener('click', handleLogout);
    
    // Start the student dashboard
    initStudentView();
});
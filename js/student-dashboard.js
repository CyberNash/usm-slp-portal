// js/student-dashboard.js

document.addEventListener('DOMContentLoaded', () => {
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
    const submitAttendanceBtn = document.getElementById('submit-attendance-btn');
    const passcode_input = document.getElementById('passcode-input');
    const attendanceFeedback = document.getElementById('attendance-feedback');
    
    // --- 3. INITIALIZE THE STUDENT VIEW ---
    function initStudentView() {
        // Populate header and profile card with the student's specific data
        welcomeMessage.textContent = `Welcome, ${currentUser.fullName}!`;
        populateStudentProfile();
        loadAbsenceHistory();
        loadStudentAttendanceLog();
        // Prepare the absence form
        populateSupervisorsDropdown();
        document.getElementById('absence-file').addEventListener('change', (e) => {
            selectedFile = e.target.files[0];
            document.getElementById('file-upload-status').textContent = selectedFile ? `Selected: ${selectedFile.name}` : '';
        });
        document.getElementById('absence-form').addEventListener('submit', handleAbsenceSubmit);
        fileInput.addEventListener('change', handleFileSelect);
        removeFileBtn.addEventListener('click', handleRemoveFile);
        submitAttendanceBtn.addEventListener('click', handleSubmitAttendance);

        
    }

    async function loadStudentAttendanceLog() {
        const tbody = document.getElementById('student-attendance-log-body');
        tbody.innerHTML = '<tr><td colspan="3">Loading attendance log...</td></tr>'; // Use colspan="3" now

        try {
            const response = await fetch(`${API_URL}?action=getStudentAttendanceHistory&studentId=${currentUser.userId}`);
            const result = await response.json();

            if (result.status === 'success' && result.data.length > 0) {
                tbody.innerHTML = '';
                result.data.forEach(item => {
                    const row = `
                        <tr>
                            <td>${item.sessionName}</td>
                            <td>${new Date(item.timestamp).toLocaleString()}</td>
                            <td>${item.issuedBy}</td> <!-- Display the new issuedBy field -->
                        </tr>`;
                    tbody.innerHTML += row;
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="3">No attendance records found.</td></tr>'; // Use colspan="3"
            }
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="3" style="color:red;">Failed to load attendance log.</td></tr>'; // Use colspan="3"
        }
    }
    
    async function handleSubmitAttendance() {
        const passcode = passcode_input.value.trim();

        // Basic validation
        if (passcode.length !== 6 || !/^\d+$/.test(passcode)) {
            attendanceFeedback.textContent = 'Please enter a valid 6-digit numeric passcode.';
            attendanceFeedback.className = 'feedback-message error';
            return;
        }

        // Set loading state
        submitAttendanceBtn.disabled = true;
        submitAttendanceBtn.textContent = 'Submitting...';
        attendanceFeedback.textContent = ''; // Clear previous messages

        const payload = {
            action: 'submitAttendance',
            passcode: passcode,
            studentId: currentUser.userId // The logged-in student's unique ID
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            // Display feedback based on success or error
            if (result.status === 'success') {
                attendanceFeedback.textContent = result.message;
                attendanceFeedback.className = 'feedback-message success';
                passcode_input.value = ''; // Clear input field on success
            } else {
                throw new Error(result.message || 'An unknown error occurred.');
            }
        } catch (error) {
            attendanceFeedback.textContent = error.message;
            attendanceFeedback.className = 'feedback-message error';
        } finally {
            // Re-enable button
            submitAttendanceBtn.disabled = false;
            submitAttendanceBtn.textContent = 'Submit Passcode';
        }
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

    // We now have 7 columns, so update the colspan
    tbody.innerHTML = '<tr><td colspan="7">Loading your history...</td></tr>';

    try {
        const response = await fetch(`${API_URL}?action=getStudentAbsenceHistory&studentId=${studentId}`);
        const result = await response.json();

        if (result.status === 'success' && result.data.length > 0) {
            tbody.innerHTML = '';
            result.data.forEach(item => {
                const requestStatusPill = `<span class="status-pill ${item.status.toLowerCase()}">${item.status}</span>`;

                let loggedStatusPill = 'N/A';
                if (item.status === 'Approved') {
                    const pillClass = item.loggedStatus === 'Present' ? 'present' : 'absent';
                    loggedStatusPill = `<span class="status-pill ${pillClass}">${item.loggedStatus}</span>`;
                }

                const documentLink = item.fileUrl
                    ? `<a href="${item.fileUrl}" target="_blank" class="doc-link">
                        📄 View Document
                    </a>`
                    : 'N/A';
                
                // This now renders all 7 columns, including the new Supervisor Notes.
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${new Date(item.absenceDate).toLocaleDateString()}</td>
                    <td>${item.supervisorName}</td>
                    <td>${requestStatusPill}</td>
                    <td>${loggedStatusPill}</td>
                    <td>${item.reason}</td>
                    <!-- ADD THE NEW CELL FOR NOTES -->
                    <!-- The '|| "-"' shows a hyphen if the notes are empty, which looks cleaner -->
                    <td>${item.supervisorNotes || '-'}</td>
                    <td>${documentLink}</td>
                `;
                tbody.appendChild(row);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="7">No absence history found.</td></tr>'; // Update colspan
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="7" style="color: red;">Could not load history.</td></tr>'; // Update colspan
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
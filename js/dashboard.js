/**
 * =================================================================================
 * Dashboard Logic for USM SLP Website
 * =================================================================================
 */
    document.addEventListener('DOMContentLoaded', () => {    
    // --- 1. AUTH GUARD & DATA ---
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }
    let selectedFile = null;

    // --- 2. ELEMENTS ---
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutBtn = document.getElementById('logout-btn');
    const studentDashboard = document.getElementById('student-dashboard');
    const supervisorDashboard = document.getElementById('supervisor-dashboard');

    // --- 3. INITIALIZATION ---
    function initializeDashboard() {
        welcomeMessage.textContent = `Welcome, ${currentUser.fullName}!`;
        if (currentUser.role === 'Student') {
            studentDashboard.style.display = 'block';
            initStudentView();
        } else if (currentUser.role === 'Supervisor') {
            supervisorDashboard.style.display = 'block';
            initSupervisorView();
        }
    }

    // --- 4. STUDENT VIEW ---
    function initStudentView() {
        populateStudentProfile();
        populateSupervisorsDropdown();

        document.getElementById('absence-file').addEventListener('change', (e) => {
            selectedFile = e.target.files[0];
            document.getElementById('file-upload-status').textContent = selectedFile ? `Selected: ${selectedFile.name}` : '';
        });

        document.getElementById('absence-form').addEventListener('submit', handleAbsenceSubmit);
    }

    function populateStudentProfile() {
        const profileDisplay = document.getElementById('student-profile-display');
        profileDisplay.innerHTML = `
            <li><span class="icon"><i class="fas fa-user"></i></span> ${currentUser.fullName}</li>
            <li><span class="icon"><i class="fas fa-id-card"></i></span> ${currentUser.matricNumber}</li>
            <li><span class="icon"><i class="fas fa-envelope"></i></span> ${currentUser.email}</li>
            <li><span class="icon"><i class="fas fa-phone"></i></span> ${currentUser.phoneNumber}</li>
            <li><span class="icon"><i class="fas fa-book-open"></i></span> ${currentUser.yearCourse}</li>
        `;
    }

    async function populateSupervisorsDropdown() {
        const select = document.getElementById('supervisor-select');
        try {
            const response = await fetch(`${API_URL}?action=getSupervisors`);
            const result = await response.json();
            if (result.status === 'success') {
                select.innerHTML = '<option value="">-- Select a Supervisor --</option>'; // Default option
                result.data.forEach(supervisor => {
                    const option = document.createElement('option');
                    option.value = supervisor.id;
                    option.textContent = supervisor.name;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            select.innerHTML = '<option value="">Could not load supervisors</option>';
            console.error('Error fetching supervisors:', error);
        }
    }
    
    async function handleAbsenceSubmit(e) {
        e.preventDefault();
        const submitBtn = document.getElementById('absence-submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        let fileUrl = '';
        if (selectedFile) {
            submitBtn.textContent = 'Uploading File...';
            try {
                fileUrl = await uploadFile(selectedFile);
            } catch (error) {
                alert(`File upload failed: ${error.message}`);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Request';
                return;
            }
        }
        
        submitButton.textContent = 'Submitting...';

        const payload = {
            action: 'submitAbsence',
            studentId: currentUser.userId,
            supervisorId: document.getElementById('supervisor-select').value,
            absenceDate: document.getElementById('absence-date').value,
            reason: document.getElementById('absence-reason').value
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST', mode: 'cors', headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: JSON.stringify(payload)
            });
            const result = JSON.parse(await response.text());
            
            if (result.status === 'success') {
                alert('Request submitted successfully!');
                e.target.reset(); // Clear the form
            } else {
                alert(`Error: ${result.message}`);
            }
        } catch (error) {
            alert('A network error occurred. Please try again.');
            console.error('Submission error:', error);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Submit Request';
        }
    }
    function uploadFile(file) {
    const fileReader = new FileReader();
    return new Promise((resolve, reject) => {
        fileReader.readAsDataURL(file);
        fileReader.onload = async () => {
            const base64Data = fileReader.result.split(',')[1];
            const payload = {
                action: 'handleFileUpload', fileName: file.name, mimeType: file.type, fileData: base64Data,
            };
            const response = await fetch(API_URL, {
                method: 'POST', mode: 'cors', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: JSON.stringify(payload)
            });
            const result = JSON.parse(await response.text());
            if (result.status === 'success') resolve(result.fileUrl);
            else reject(new Error(result.message));
        };
        fileReader.onerror = (error) => reject(error);
    });
    }

    // --- 5. SUPERVISOR VIEW ---
    async function initSupervisorView() {
        await loadAbsenceRequests();
    }

    async function loadAbsenceRequests() {
        const listContainer = document.getElementById('absence-requests-list');
        listContainer.innerHTML = '<p>Loading pending requests...</p>';
        try {
            const response = await fetch(`${API_URL}?action=getAbsenceRequests&supervisorId=${currentUser.userId}`);
            const result = await response.json();
            
            if (result.status === 'success' && result.data.length > 0) {
                listContainer.innerHTML = ''; // Clear loading message
                result.data.forEach(req => {
                    const requestEl = document.createElement('div');
                    requestEl.className = 'absence-request-item';
                    requestEl.innerHTML = `
                        <strong>Student:</strong> ${req.studentName}<br>
                        <strong>Date:</strong> ${new Date(req.absenceDate).toLocaleDateString()}<br>
                        <strong>Reason:</strong> ${req.reason}<br>
                        <div class="actions">
                            <button class="btn-approve" data-request-id="${req.requestId}">Approve</button>
                            <button class="btn-reject" data-request-id="${req.requestId}">Reject</button>
                        </div>
                    `;
                    listContainer.appendChild(requestEl);
                });
            } else {
                listContainer.innerHTML = '<p>No pending absence requests found.</p>';
            }
        } catch (error) {
            listContainer.innerHTML = '<p style="color:red;">Failed to load requests.</p>';
            console.error('Error loading requests:', error);
        }
    }

    // --- 6. EVENT HANDLERS & INITIALIZATION ---
    function handleLogout() { localStorage.removeItem('currentUser'); window.location.href = 'index.html'; }
    logoutBtn.addEventListener('click', handleLogout);
    
    initializeDashboard();
});
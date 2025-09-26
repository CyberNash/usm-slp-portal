document.addEventListener('DOMContentLoaded', () => {
    // API_URL is from config.js
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    if (!currentUser || currentUser.role !== 'Supervisor') {
        window.location.href = 'index.html';
        return;
    }

    // --- Get Elements ---
    const studentSelectionArea = document.getElementById('student-selection-area');
    const generateCodeBtn = document.getElementById('generate-code-btn');
    const sessionNameInput = document.getElementById('session-name-input');
    const codeDisplayArea = document.getElementById('code-display-area');
    const passcodeDisplay = document.getElementById('passcode-display');
    const expiryTimerDisplay = document.getElementById('expiry-timer');
    const generatorFeedback = document.getElementById('generator-feedback');
    let timerInterval;
    const historyTbody = document.getElementById('attendance-history-body');
    const modalBackdrop = document.getElementById('modal-backdrop');
    let sessionHistoryData = []; // To store fetched data and avoid re-fetching

async function loadAttendanceHistory() {
    historyTbody.innerHTML = '<tr><td colspan="5">Loading history...</td></tr>';
    try {
        const response = await fetch(`${API_URL}?action=getSupervisorAttendanceHistory&supervisorId=${currentUser.userId}`);
        const result = await response.json();

        if (result.status === 'success' && result.data.length > 0) {
            sessionHistoryData = result.data; // Store data globally
            historyTbody.innerHTML = '';
            result.data.forEach((session, index) => {
                const statusPill = session.submittedCount === session.totalAssigned ? 'bg-success' : 'bg-warning';
                const row = `
                    <tr>
                        <td>${session.sessionName}</td>
                        <td>${new Date(session.issuedDate).toLocaleString()}</td>
                        <td>${session.passcode}</td>
                        <td><span class="status-pill ${statusPill}">${session.submittedCount} of ${session.totalAssigned} responded</span></td>
                        <td>
                            <button class="btn-sm btn-info" data-index="${index}" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                        </td>
                    </tr>`;
                historyTbody.innerHTML += row;
            });
        } else {
            historyTbody.innerHTML = '<tr><td colspan="5">No history found.</td></tr>';
        }
    } catch(e) {
        historyTbody.innerHTML = '<tr><td colspan="5" style="color:red">Failed to load history.</td></tr>';
    }
}

// --- New function to show the details modal ---
    function showDetailsModal(index) {
        const session = sessionHistoryData[index];
        if (!session) return;
        
        document.getElementById('modal-session-name').textContent = session.sessionName;
        const modalTbody = document.getElementById('modal-student-list-body');
        
        modalTbody.innerHTML = ''; // Clear previous content
        session.studentResponses.forEach(student => {
            const statusClass = student.status === 'Submitted' ? 'status-pill submitted' : 'status-pill pending';
            const timestamp = student.timestamp ? new Date(student.timestamp).toLocaleTimeString() : 'N/A';
            const row = `
                <tr>
                    <td>${student.studentName}</td>
                    <td><span class="${statusClass}">${student.status}</span></td>
                    <td>${timestamp}</td>
                </tr>`;
            modalTbody.innerHTML += row;
        });
        
        modalBackdrop.style.display = 'flex';
        document.getElementById('attendance-details-modal').style.display = 'block';
    }

    // --- Add event listeners at the end of the script ---
    historyTbody.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (btn) {
            showDetailsModal(btn.dataset.index);
        }
    });
    modalBackdrop.addEventListener('click', (e) => {
        if (e.target.matches('.close-btn') || e.target === modalBackdrop) {
            modalBackdrop.style.display = 'none';
        }
    });
    async function loadStudents() {
        studentSelectionArea.innerHTML = '<p>Loading student list...</p>';
        try {
            const response = await fetch(`${API_URL}?action=getAllStudents`);
            const result = await response.json();
            if (result.status === 'success') {
                let studentHtml = '<h3>Select Students for this Session</h3><div class="student-list">';
                result.data.forEach(student => {
                    studentHtml += `
                        <div class="student-checkbox">
                            <input type="checkbox" id="${student.id}" value="${student.id}" name="students">
                            <label for="${student.id}">${student.name} (${student.matric})</label>
                        </div>`;
                });
                studentHtml += '</div>';
                studentSelectionArea.innerHTML = studentHtml;
            } else {
                studentSelectionArea.innerHTML = '<p style="color:red;">Could not load students.</p>';
            }
        } catch (error) {
            studentSelectionArea.innerHTML = '<p style="color:red;">Error loading students.</p>';
        }
    }
    
    function displayCode(passcode, expiryString) {
        passcodeDisplay.textContent = passcode;
        codeDisplayArea.style.display = 'block';
        const expiryTime = new Date(expiryString);
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            const diff = expiryTime - new Date();
            if (diff <= 0) {
                clearInterval(timerInterval);
                expiryTimerDisplay.textContent = "Code has expired.";
                passcodeDisplay.style.textDecoration = 'line-through';
                sessionStorage.removeItem('lastGeneratedCode');
                return;
            }
            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            expiryTimerDisplay.textContent = `Expires in: ${minutes}m ${seconds.toString().padStart(2, '0')}s`;
        }, 1000);
        passcodeDisplay.style.textDecoration = 'none';
    }
    
    function loadLastGeneratedCode() {
        const storedCodeData = sessionStorage.getItem('lastGeneratedCode');
        if (storedCodeData) {
            const { passcode, expires } = JSON.parse(storedCodeData);
            if (new Date(expires) > new Date()) {
                displayCode(passcode, expires);
            } else {
                sessionStorage.removeItem('lastGeneratedCode');
            }
        }
    }
    
    async function handleGenerateCode() {
        const sessionName = sessionNameInput.value.trim();
        const selectedStudents = Array.from(document.querySelectorAll('input[name="students"]:checked'))
                                     .map(cb => cb.value);

        if (!sessionName) {
            alert('Please enter a session name.');
            return;
        }
        if (selectedStudents.length === 0) {
            alert('Please select at least one student.');
            return;
        }

        // --- FIX #1: Add back the button disabling for better UX ---
        generateCodeBtn.disabled = true;
        generateCodeBtn.textContent = 'Generating...';
        generatorFeedback.textContent = ''; // Clear previous feedback

        // --- FIX #2: Add the selected student IDs to the payload ---
        const payload = {
            action: 'generateAttendanceCode',
            sessionName: sessionName,
            supervisorId: currentUser.userId,
            studentIds: selectedStudents // This key was missing
        };

        try {
            const response = await fetch(API_URL, { 
                method: 'POST', 
                body: JSON.stringify(payload) 
            });
            const result = JSON.parse(await response.text());

            if (result.status === 'success') {
                sessionStorage.setItem('lastGeneratedCode', JSON.stringify(result.data));
                displayCode(result.data.passcode, result.data.expires);
                sessionNameInput.value = ''; // Clear input
            } else {
                throw new Error(result.message || 'Failed to generate code from backend.');
            }
        } catch (error) {
            generatorFeedback.textContent = error.message;
            generatorFeedback.className = 'feedback-message error'; // Assumes you have styling for this
        } finally {
            generateCodeBtn.disabled = false;
            generateCodeBtn.textContent = 'Generate Code';
        }
    }

    // --- Link the event listener ---
    generateCodeBtn.addEventListener('click', handleGenerateCode);
    
    // --- Initial function calls when the page loads ---
    loadAttendanceHistory(); // Add this next to your other initial function calls
    loadLastGeneratedCode(); 
    loadStudents(); // --- FIX #3: Call the function to load the student list! ---
});
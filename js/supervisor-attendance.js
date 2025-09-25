// js/supervisor-attendance.js
document.addEventListener('DOMContentLoaded', () => {
    // API_URL is from config.js
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    if (!currentUser || currentUser.role !== 'Supervisor') {
        window.location.href = 'index.html';
        return;
    }
    const studentSelectionArea = document.getElementById('student-selection-area');
    const generateCodeBtn = document.getElementById('generate-code-btn');
    const sessionNameInput = document.getElementById('session-name-input');
    const codeDisplayArea = document.getElementById('code-display-area');
    const passcodeDisplay = document.getElementById('passcode-display');
    const expiryTimerDisplay = document.getElementById('expiry-timer');
    const generatorFeedback = document.getElementById('generator-feedback');
    let timerInterval;

 
    async function loadStudents() {
        try {
            const response = await fetch(`${API_URL}?action=getAllStudents`);
            const result = await response.json();
            if (result.status === 'success') {
                let studentHtml = '<h3>Select Students</h3><div class="student-list">';
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
                studentSelectionArea.innerHTML = '<p>Could not load students.</p>';
            }
        } catch (error) {
            studentSelectionArea.innerHTML = '<p>Error loading students.</p>';
        }
    }
    
   // --- NEW: Function to display code and start timer ---
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
                sessionStorage.removeItem('lastGeneratedCode'); // Clear when expired
                return;
            }
            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            expiryTimerDisplay.textContent = `Expires in: ${minutes}m ${seconds.toString().padStart(2, '0')}s`;
        }, 1000);
        passcodeDisplay.style.textDecoration = 'none';
    }
    
    // --- NEW: Check session storage on page load ---
    function loadLastGeneratedCode() {
        const storedCodeData = sessionStorage.getItem('lastGeneratedCode');
        if (storedCodeData) {
            const { passcode, expires } = JSON.parse(storedCodeData);
            // If the stored code is not yet expired, display it
            if (new Date(expires) > new Date()) {
                displayCode(passcode, expires);
            } else {
                sessionStorage.removeItem('lastGeneratedCode'); // Clean up expired code
            }
        }
    }
    
    async function handleGenerateCode() {
    const selectedStudents = Array.from(document.querySelectorAll('input[name="students"]:checked'))
                                 .map(cb => cb.value);

    if (selectedStudents.length === 0) {
        alert('Please select at least one student.');
        return;
    }
        // ... (Button disabling logic remains the same)
        const sessionName = sessionNameInput.value.trim();
        const payload = {
            action: 'generateAttendanceCode',
            sessionName: sessionName,
            supervisorId: currentUser.userId
        };

        try {
            const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
            const result = JSON.parse(await response.text());

            if (result.status === 'success') {
                // --- Store and Display the new code ---
                sessionStorage.setItem('lastGeneratedCode', JSON.stringify(result.data));
                displayCode(result.data.passcode, result.data.expires);
                sessionNameInput.value = '';
            } else {
                throw new Error(result.message || 'Failed to generate code.');
            }
        } catch (error) {
            generatorFeedback.textContent = error.message;
            generatorFeedback.className = 'feedback-message error';
        } finally {
            generateCodeBtn.disabled = false;
            generateCodeBtn.textContent = 'Generate Code';
        }
    }

    generateCodeBtn.addEventListener('click', handleGenerateCode);
    loadLastGeneratedCode(); // --- Load the code when the page starts! ---
});
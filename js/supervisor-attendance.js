document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || currentUser.role !== 'Supervisor') {
        window.location.href = 'index.html';
        return;
    }

    // --- Get New Elements ---
    const dateInput = document.getElementById('report-date-input');
    const getReportBtn = document.getElementById('get-report-btn');
    const reportTbody = document.getElementById('attendance-report-body');

    // --- Main Report Fetching Function ---
    async function fetchAttendanceReport() {
        const selectedDate = dateInput.value;
        if (!selectedDate) {
            alert('Please select a date.');
            return;
        }

        reportTbody.innerHTML = '<tr><td colspan="4">Loading report...</td></tr>';
        getReportBtn.disabled = true;

        try {
            const response = await fetch(`${API_URL}?action=getAttendanceReport&date=${selectedDate}`);
            const result = await response.json();

            if (result.status === 'success') {
                if (result.data.length > 0) {
                    reportTbody.innerHTML = ''; // Clear loading
                    result.data.forEach(record => {
                        const statusPillClass = record.status.toLowerCase(); // Will be 'present', 'late', or 'absent'
                        const submissionTime = record.submissionTime ? new Date(record.submissionTime).toLocaleTimeString() : 'N/A';
                        
                        const row = `
                            <tr>
                                <td>${record.studentName}</td>
                                <td>${record.matricNumber}</td>
                                <td><span class="status-pill ${statusPillClass}">${record.status}</span></td>
                                <td>${submissionTime}</td>
                            </tr>`;
                        reportTbody.innerHTML += row;
                    });
                } else {
                    reportTbody.innerHTML = '<tr><td colspan="4">No attendance session was scheduled for this day or no students were found.</td></tr>';
                }
            } else {
                throw new Error(result.message);
            }


        } catch (error) {
            reportTbody.innerHTML = `<tr><td colspan="4" style="color:red;">Error: ${error.message}</td></tr>`;
        } finally {
            getReportBtn.disabled = false;
        }
    }
    
    // --- Initializer ---
    function initReportView() {
        // Set the date input to today by default
        dateInput.value = new Date().toISOString().split('T')[0];
        
        // Add event listener
        getReportBtn.addEventListener('click', fetchAttendanceReport);
        
        // Fetch today's report on page load
        fetchAttendanceReport();
    }
    
    initReportView();
});
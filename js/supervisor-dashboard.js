   // ---/js/supervisor-dashboard.js ---
document.addEventListener('DOMContentLoaded', async() => {
    const currentUser = await validateSession();
    if (!currentUser) return;
    if (currentUser.role !== 'Supervisor') {
        alert('Access Denied. You do not have permission to view this page.');
        window.location.href = 'index.html';
        return;
    }

    // --- Get Elements ---
    const modalBackdrop = document.getElementById('modal-backdrop');
    const announcementsListContainer = document.getElementById('announcements-list');

    // --- Main Initializer ---
    function initSupervisorView(currentUser) {
        document.getElementById('welcome-message').textContent = `Welcome, ${currentUser.fullName}!`;
        populateSupervisorProfile();
        loadPendingRequests();
        loadRequestHistory();
        loadAnnouncements();

        // All Event Listeners
        document.getElementById('add-announcement-btn').addEventListener('click', () => showModal('add-announcement-modal'));
        document.getElementById('pending-requests-list').addEventListener('click', handleRequestAction);
        document.getElementById('history-table-body').addEventListener('click', handleHistoryEditClick);
        document.getElementById('response-form').addEventListener('submit', handleResponseSubmit);
        document.getElementById('response-cancel-btn').addEventListener('click', hideModals);
        document.getElementById('logout-btn').addEventListener('click', handleLogout);
        document.getElementById('delete-announcement-btn').addEventListener('click', handleDeleteAnnouncementClick);
        modalBackdrop.addEventListener('click', (e) => { if (e.target.matches('.close-btn') || e.target === modalBackdrop) hideModals(); });
        document.getElementById('announcement-form').addEventListener('submit', handleAnnouncementSubmit);
        document.getElementById('edit-announcement-form').addEventListener('submit', handleEditAnnouncementSubmit);
        announcementsListContainer.addEventListener('click', handleAnnouncementsListClick);
    }

    // --- Modal Helpers ---
    function showModal(modalId) { modalBackdrop.style.display = 'flex'; document.getElementById(modalId).style.display = 'block'; }
    function hideModals() { modalBackdrop.style.display = 'none'; modalBackdrop.querySelectorAll('.modal-content').forEach(modal => modal.style.display = 'none'); }
    // --- Data Display Functions ---

     async function handleDeleteAnnouncementClick() {
        const announcementId = document.getElementById('edit-ann-id').value;
        if (!announcementId) {
            alert('Could not identify the announcement to delete.');
            return;
        }

        // CRITICAL: Always ask for confirmation before deleting!
        const isConfirmed = confirm('Are you sure you want to permanently delete this announcement? This action cannot be undone.');

        if (isConfirmed) {
            const deleteBtn = document.getElementById('delete-announcement-btn');
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';

            const payload = {
                action: 'deleteAnnouncement',
                announcementId: announcementId
            };
            
            try {
                const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
                const result = JSON.parse(await response.text());
                alert(result.message);

                if (result.status === 'success') {
                    hideModals();
                    loadAnnouncements(); // Refresh the list
                }
            } catch(error) {
                alert('A network error occurred during deletion.');
            } finally {
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Delete';
            }
        }
    }
    async function loadAnnouncements() {
        announcementsListContainer.innerHTML = "<p>Loading...</p>";
        try {
            const response = await fetch(`${API_URL}?action=getAllAnnouncements`);
            const result = await response.json();
            if (result.status === 'success' && result.data.length > 0) {
                announcementsListContainer.innerHTML = '';
                result.data.forEach(ann => {
                    announcementsListContainer.innerHTML += `
                        <div class="announcement-item">
                            <div class="announcement-item__header">
                                <strong class="announcement-item__title">${ann.title}</strong>
                                <button class="btn-edit" data-id="${ann.id}" title="Edit"><i class="fas fa-pencil-alt"></i></button>
                            </div>
                            <!-- THE FIX: Displays the 'ann.content' -->
                            <p class="announcement-item__content">${ann.content}</p> 
                            <div>
                                <span class="announcement-item__category">${ann.category}</span> - 
                                <span class="announcement-item__date">${new Date(ann.date).toLocaleDateString()}</span>
                            </div>
                        </div>`;
                });
            } else { announcementsListContainer.innerHTML = "<p>No announcements found.</p>"; }
        } catch(e) { announcementsListContainer.innerHTML = "<p style='color:red;'>Failed to load announcements.</p>"; }
    }

    async function loadRequestHistory() {
        const tbody = document.getElementById('history-table-body');
        tbody.innerHTML = `<tr><td colspan="6">Loading...</td></tr>`; 
        try {
            const response = await fetch(`${API_URL}?action=getAbsenceHistory&supervisorId=${currentUser.userId}`);
            const result = await response.json();
            if (result.status === 'success' && result.data.length > 0) {
                tbody.innerHTML = '';
                result.data.forEach(item => {
                    tbody.innerHTML += `
                        <tr>
                            <td>${item.studentName}</td>
                            <td>${new Date(item.absenceDate).toLocaleDateString()}</td>
                            <td><span class="status-pill ${item.status.toLowerCase()}">${item.status}</span></td>
                            <td>${item.reason || '-'}</td>
                            <td>${item.notes || '-'}</td> 
                            <td>
                                <button class="btn-edit" data-request-id="${item.requestId}" title="Edit this entry">
                                    <i class="fas fa-pencil-alt"></i>
                                </button>
                            </td>
                        </tr>`;
                });
            } else { tbody.innerHTML = `<tr><td colspan="6">No history found.</td></tr>`; } 
        } catch(e){ tbody.innerHTML = `<tr><td colspan="6" style="color:red">Failed to load history.</td></tr>`; }
    }

    // --- Action Handlers ---
    async function handleAnnouncementSubmit(e) {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true; // <<< THE FIX: Disable button on click
        submitBtn.textContent = 'Posting...';

        const payload = {
            action: 'addAnnouncement',
            title: document.getElementById('add-ann-title').value,
            category: document.getElementById('add-ann-category').value,
            content: document.getElementById('add-ann-content').value,
            authorId: currentUser.userId
        };

        try {
            const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
            const result = JSON.parse(await response.text());
            alert(result.message);
            if (result.status === 'success') {
                e.target.reset();
                hideModals();
                loadAnnouncements();
            }
        } catch (error) {
            alert('A network error occurred.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Post Announcement';
        }
    }

    async function handleAnnouncementsListClick(event) {
        const editBtn = event.target.closest('.btn-edit');
        if (editBtn) { 
            const announcementId = editBtn.dataset.id;
            const response = await fetch(`${API_URL}?action=getAnnouncementById&id=${announcementId}`);
            const result = await response.json();
            if (result.status === 'success') {
                document.getElementById('edit-ann-id').value = result.data.id;
                document.getElementById('edit-ann-title').value = result.data.title;
                document.getElementById('edit-ann-content').value = result.data.content;
                document.getElementById('edit-ann-category').value = result.data.category;
                showModal('edit-announcement-modal');
            } else { alert(`Error fetching details: ${result.message}`); }
        }
    }

async function handleHistoryEditClick(event) {
    const editBtn = event.target.closest('.btn-edit');
    if (!editBtn) return; 

    // === FIX #1 is HERE ===
    // It should be 'requestId' (camelCase) to match 'data-request-id'
    const requestId = editBtn.dataset.requestId; 
    
    if (!requestId) {
        console.error("Could not find requestId on the button.", editBtn);
        return;
    }

    // === PROACTIVE FIX: Clear the hidden status field from the other workflow ===
    document.getElementById('response-new-status').value = ''; 

    try {
        const response = await fetch(`${API_URL}?action=getAbsenceRequestById&id=${requestId}`);
        const result = await response.json();

        if (result.status !== 'success') {
            alert(`Error: ${result.message}`);
            return;
        }

        const { status, notes } = result.data;
        document.getElementById('response-request-id').value = requestId;
        document.getElementById('response-status').value = status; 
        document.getElementById('response-notes').value = notes; 
        document.getElementById('response-modal-header').textContent = 'Edit Absence Entry';
        const confirmBtn = document.getElementById('response-confirm-btn');
        confirmBtn.textContent = 'Save Changes';
        confirmBtn.className = 'btn-gold'; 
        showModal('response-modal');

    } catch (error) {
        alert('A network error occurred while fetching request details.');
    }
}

    function populateSupervisorProfile() {
    const profileCard = document.getElementById('supervisor-profile-card');
    profileCard.innerHTML = `
        <div class="profile-card__header">
            <div class="profile-card__avatar"><i class="fas fa-user-tie"></i></div>
            <h3 class="profile-card__name">${currentUser.fullName}</h3>
            <p class="profile-card__title">Supervisor</p>
        </div>
        <div class="profile-card__body">
            <div class="profile-card__item">
                <i class="fas fa-id-badge profile-card__icon"></i>
                <div>
                    <p class="profile-card__label">Employee ID</p>
                    <p class="profile-card__value">${currentUser.employeeId}</p>
                </div>
            </div>
            <div class="profile-card__item">
                <i class="fas fa-envelope profile-card__icon"></i>
                <div>
                    <p class="profile-card__label">Email</p>
                    <p class="profile-card__value">${currentUser.email}</p>
                </div>
            </div>
            <div class="profile-card__item">
                <i class="fas fa-phone profile-card__icon"></i>
                <div>
                    <p class="profile-card__label">Phone</p>
                    <p class="profile-card__value">+60 ${currentUser.phoneNumber}</p>
                </div>
            </div>
        </div>`;
    }
    
    async function loadPendingRequests() {
        const list = document.getElementById('pending-requests-list');
        list.innerHTML = '<p>Loading requests...</p>';
        try {
            const response = await fetch(`${API_URL}?action=getAbsenceRequests&supervisorId=${currentUser.userId}`);
            const result = await response.json();
            if (result.status === 'success' && result.data.length > 0) {
                list.innerHTML = '';
                result.data.forEach(req => {
                    const fileLinkHTML = req.fileUrl ? `<div class="attachment-link"><a href="${req.fileUrl}" target="_blank"><i class="fas fa-paperclip"></i> View Attachment</a></div>` : '';
                    list.innerHTML += `<div class="request-item"><div class="request-item__header"><span><i class="fas fa-user"></i> ${req.studentName}</span><span class="status-pill pending">pending</span></div><div class="request-item__meta"><i class="fas fa-calendar-alt"></i> ${new Date(req.absenceDate).toLocaleDateString()}</div><p class="request-item__reason">${req.reason}</p>${fileLinkHTML}<div class="request-item__actions"><button class="btn-approve" data-request-id="${req.requestId}"><i class="fas fa-check"></i> Approve</button><button class="btn-reject" data-request-id="${req.requestId}"><i class="fas fa-times"></i> Reject</button></div></div>`;
                });
            } else { list.innerHTML = '<p>No pending absence requests.</p>'; }
        } catch(e){ list.innerHTML = '<p style="color:red">Failed to load requests.</p>'; }
    }
    
    function handleRequestAction(event) {
        const target = event.target.closest('.btn-approve, .btn-reject');
        if (!target) return;

        const requestId = target.dataset.requestId;
        const newStatus = target.classList.contains('btn-approve') ? 'Approved' : 'Rejected';

        // --- Configure and show the new modal ---
        document.getElementById('response-request-id').value = requestId;
        document.getElementById('response-new-status').value = newStatus;
        
        const modalHeader = document.getElementById('response-modal-header');
        const confirmBtn = document.getElementById('response-confirm-btn');

        // Dynamically change modal text/colors based on action
        if (newStatus === 'Approved') {
            modalHeader.textContent = 'Approve Absence Request';
            confirmBtn.textContent = 'Confirm Approval';
            confirmBtn.className = 'btn-approve'; // Green button
        } else {
            modalHeader.textContent = 'Reject Absence Request';
            confirmBtn.textContent = 'Confirm Rejection';
            confirmBtn.className = 'btn-reject'; // Red button
        }

        document.getElementById('response-form').reset(); // Clear any old text
        showModal('response-modal');
    }

    async function handleResponseSubmit(event) {
        event.preventDefault(); 

        const requestId = document.getElementById('response-request-id').value;
        const newStatus = document.getElementById('response-new-status').value || document.getElementById('response-status').value;
        const notes = document.getElementById('response-notes').value;
        const button = document.querySelector(`.request-item__actions button[data-request-id="${requestId}"]`);

        await updateRequestStatus(button, requestId, newStatus, notes);
        
        hideModals();
    }
    async function updateRequestStatus(button, requestId, newStatus, notes) {
        // --- Start: Added to make the button temporarily disabled in history edits too ---
        const editButtonInHistory = document.querySelector(`#history-table-body .btn-edit[data-request-id="${requestId}"]`);
        if (button) button.disabled = true;
        if (editButtonInHistory) editButtonInHistory.disabled = true;
        // --- End: Added section ---

        try {
            const payload = { action: 'updateAbsenceStatus', requestId, newStatus, notes };
            const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
            const result = JSON.parse(await response.text());
            
            if (result.status === 'success') {
                // === FIX #2 is HERE ===
                // ONLY try to remove the item if it came from the pending list (where `button` exists).
                // This prevents the code from crashing when we edit from the history table.
                if (button) {
                    button.closest('.request-item').remove();
                }
                
                // ALWAYS refresh the history table to show the latest changes.
                loadRequestHistory(); 

            } else { 
                alert(`Error: ${result.message}`); 
                if (button) button.disabled = false; // Re-enable on error
            }

        } catch(error) {
            alert('A network error has occurred.');
        } finally {
            // --- Added a finally block to re-enable the history button no matter what ---
            if (editButtonInHistory) editButtonInHistory.disabled = false;
        }
    }

    async function handleEditAnnouncementSubmit(e) {
        e.preventDefault();
        const payload = { action: 'updateAnnouncement', announcementId: document.getElementById('edit-ann-id').value, title: document.getElementById('edit-ann-title').value, content: document.getElementById('edit-ann-content').value, category: document.getElementById('edit-ann-category').value };
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = JSON.parse(await response.text());
        alert(result.message);
        if (result.status === 'success') { hideModals(); loadAnnouncements(); }
    }

    function handleLogout() { localStorage.removeItem('currentUser'); window.location.href = 'index.html'; }
    
    // --- Initial Execution ---
    initSupervisorView();
});
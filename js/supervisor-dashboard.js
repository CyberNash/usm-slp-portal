// js/supervisor-dashboard.js

// This is the main entry point for the page.
document.addEventListener('DOMContentLoaded', async () => {

    // 1. Securely validate the user's session token with the backend.
    const currentUser = await validateSession();

    // 2. If validation fails (returns null), the script is stopped and the user is redirected.
    if (!currentUser) return;

    // 3. Check if the validated user has the correct role for this page.
    if (currentUser.role !== 'Supervisor') {
        alert('Access Denied. You do not have permission to view this page.');
        window.location.href = 'index.html';
        return;
    }

    // 4. If validation and role check pass, initialize the page with the secure user data.
    initSupervisorView(currentUser);
});


// === ALL HELPER FUNCTIONS ARE NOW OUTSIDE THE DOMContentLoaded BLOCK ===
function initSupervisorView(currentUser) { // <-- Accepts currentUser
    // --- Get shared elements ---
    const modalBackdrop = document.getElementById('modal-backdrop');
    const announcementsListContainer = document.getElementById('announcements-list');

    // --- Initialize UI components, PASSING currentUser where needed ---
    document.getElementById('welcome-message').textContent = `Welcome, ${currentUser.fullName}!`;
    populateSupervisorProfile(currentUser);
    loadPendingRequests(currentUser);
    loadRequestHistory(currentUser);
    loadAnnouncements(); // Announcements are public, no need for user data

    // --- Set up all Event Listeners ---
    document.getElementById('add-announcement-btn').addEventListener('click', () => showModal('add-announcement-modal'));
    document.getElementById('pending-requests-list').addEventListener('click', handleRequestAction);
    document.getElementById('history-table-body').addEventListener('click', handleHistoryEditClick);
    document.getElementById('response-form').addEventListener('submit', (e) => handleResponseSubmit(e, currentUser)); // <-- Pass currentUser for refreshes
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Announcement listeners
    document.getElementById('announcement-form').addEventListener('submit', (e) => handleAnnouncementSubmit(e, currentUser)); // <-- Pass currentUser for authorId
    document.getElementById('edit-announcement-form').addEventListener('submit', handleEditAnnouncementSubmit);
    announcementsListContainer.addEventListener('click', handleAnnouncementsListClick);
    document.getElementById('delete-announcement-btn').addEventListener('click', handleDeleteAnnouncementClick);

    // Modal listeners
    modalBackdrop.addEventListener('click', (e) => { 
        if (e.target.matches('.close-btn') || e.target === modalBackdrop) hideModals(); 
    });
    document.getElementById('response-cancel-btn').addEventListener('click', hideModals);
}

// --- Modal Helpers (these are generic) ---
function showModal(modalId) {
    const modalBackdrop = document.getElementById('modal-backdrop');
    modalBackdrop.style.display = 'flex';
    document.getElementById(modalId).style.display = 'block';
}
function hideModals() {
    const modalBackdrop = document.getElementById('modal-backdrop');
    modalBackdrop.style.display = 'none';
    modalBackdrop.querySelectorAll('.modal-content').forEach(modal => modal.style.display = 'none');
}

// --- Profile Card ---
function populateSupervisorProfile(currentUser) { // <-- Accepts currentUser
    const profileCard = document.getElementById('supervisor-profile-card');
    profileCard.innerHTML = `
        <div class="profile-card__header">
            <div class="profile-card__avatar"><i class="fas fa-user-tie"></i></div>
            <h3 class="profile-card__name">${currentUser.fullName}</h3>
            <p class="profile-card__title">Supervisor</p>
        </div>
        <div class="profile-card__body">
            <div class="profile-card__item"><i class="fas fa-id-badge profile-card__icon"></i><div><p class="profile-card__label">Employee ID</p><p class="profile-card__value">${currentUser.employeeId}</p></div></div>
            <div class="profile-card__item"><i class="fas fa-envelope profile-card__icon"></i><div><p class="profile-card__label">Email</p><p class="profile-card__value">${currentUser.email}</p></div></div>
            <div class="profile-card__item"><i class="fas fa-phone profile-card__icon"></i><div><p class="profile-card__label">Phone</p><p class="profile-card__value">+60 ${currentUser.phoneNumber}</p></div></div>
        </div>`;
}

// --- Absence Requests and History ---
async function loadPendingRequests(currentUser) { // <-- Accepts currentUser
    const list = document.getElementById('pending-requests-list');
    list.innerHTML = '<p>Loading requests...</p>';
    try {
        // Here you will add `&token=${currentUser.token}` to the URL in the future
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

async function loadRequestHistory(currentUser) { // <-- Accepts currentUser
    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = `<tr><td colspan="6">Loading...</td></tr>`; 
    try {
        const response = await fetch(`${API_URL}?action=getAbsenceHistory&supervisorId=${currentUser.userId}`);
        const result = await response.json();
        if (result.status === 'success' && result.data.length > 0) {
            tbody.innerHTML = '';
            result.data.forEach(item => {
                tbody.innerHTML += `<tr><td>${item.studentName}</td><td>${new Date(item.absenceDate).toLocaleDateString()}</td><td><span class="status-pill ${item.status.toLowerCase()}">${item.status}</span></td><td class="reason-cell">${item.reason || '-'}</td><td>${item.notes || '-'}</td><td><button class="btn-edit" data-request-id="${item.requestId}" title="Edit this entry"><i class="fas fa-pencil-alt"></i></button></td></tr>`;
            });
        } else { tbody.innerHTML = `<tr><td colspan="6">No history found.</td></tr>`; } 
    } catch(e){ tbody.innerHTML = `<tr><td colspan="6" style="color:red">Failed to load history.</td></tr>`; }
}

function handleRequestAction(event) {
    const target = event.target.closest('.btn-approve, .btn-reject');
    if (!target) return;
    const requestId = target.dataset.requestId;
    const newStatus = target.classList.contains('btn-approve') ? 'Approved' : 'Rejected';
    document.getElementById('response-request-id').value = requestId;
    document.getElementById('response-new-status').value = newStatus;
    const modalHeader = document.getElementById('response-modal-header');
    const confirmBtn = document.getElementById('response-confirm-btn');
    if (newStatus === 'Approved') {
        modalHeader.textContent = 'Approve Absence Request';
        confirmBtn.textContent = 'Confirm Approval';
        confirmBtn.className = 'btn-approve';
    } else {
        modalHeader.textContent = 'Reject Absence Request';
        confirmBtn.textContent = 'Confirm Rejection';
        confirmBtn.className = 'btn-reject';
    }
    document.getElementById('response-form').reset();
    showModal('response-modal');
}

async function handleResponseSubmit(event, currentUser) { // <-- Accepts currentUser
    event.preventDefault(); 
    const requestId = document.getElementById('response-request-id').value;
    const newStatus = document.getElementById('response-new-status').value || document.getElementById('response-status').value;
    const notes = document.getElementById('response-notes').value;
    
    // This is a secure action, so we create the payload with the token
    const payload = { 
        action: 'updateAbsenceStatus', 
        requestId, 
        newStatus, 
        notes,
        userId: currentUser.userId, // Send user info for server-side validation
        token: currentUser.token
    };

    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if (result.status === 'success') {
            loadPendingRequests(currentUser); // Refresh both lists
            loadRequestHistory(currentUser);
        } else { 
            alert(`Error: ${result.message}`);
        }
    } catch(error) {
        alert('A network error has occurred.');
    } finally {
        hideModals();
    }
}

async function handleHistoryEditClick(event) {
    const editBtn = event.target.closest('.btn-edit');
    if (!editBtn) return;
    const requestId = editBtn.dataset.requestId;
    if (!requestId) return;

    document.getElementById('response-new-status').value = '';
    try {
        const response = await fetch(`${API_URL}?action=getAbsenceRequestById&id=${requestId}`); // This could also be secured with a token
        const result = await response.json();
        if (result.status === 'success') {
            const { status, notes } = result.data;
            document.getElementById('response-request-id').value = requestId;
            document.getElementById('response-status').value = status; 
            document.getElementById('response-notes').value = notes; 
            document.getElementById('response-modal-header').textContent = 'Edit Absence Entry';
            const confirmBtn = document.getElementById('response-confirm-btn');
            confirmBtn.textContent = 'Save Changes';
            confirmBtn.className = 'btn-gold';
            showModal('response-modal');
        } else {
            alert(`Error: ${result.message}`);
        }
    } catch (error) {
        alert('A network error occurred.');
    }
}

// --- Announcements ---
async function loadAnnouncements() {
    const announcementsListContainer = document.getElementById('announcements-list');
    announcementsListContainer.innerHTML = "<p>Loading...</p>";
    try {
        const response = await fetch(`${API_URL}?action=getAllAnnouncements`);
        const result = await response.json();
        if (result.status === 'success' && result.data.length > 0) {
            announcementsListContainer.innerHTML = '';
            result.data.forEach(ann => {
                announcementsListContainer.innerHTML += `<div class="announcement-item"><div class="announcement-item__header"><strong class="announcement-item__title">${ann.title}</strong><button class="btn-edit" data-id="${ann.id}" title="Edit"><i class="fas fa-pencil-alt"></i></button></div><p class="announcement-item__content">${ann.content}</p><div><span class="announcement-item__category">${ann.category}</span> - <span class="announcement-item__date">${new Date(ann.date).toLocaleDateString()}</span></div></div>`;
            });
        } else { announcementsListContainer.innerHTML = "<p>No announcements found.</p>"; }
    } catch(e) { announcementsListContainer.innerHTML = "<p style='color:red;'>Failed to load announcements.</p>"; }
}

async function handleAnnouncementSubmit(e, currentUser) { // <-- Accepts currentUser
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';

    const payload = {
        action: 'addAnnouncement',
        // --- Security Upgrade ---
        userId: currentUser.userId,
        token: currentUser.token,
        // -----------------------
        title: document.getElementById('add-ann-title').value,
        category: document.getElementById('add-ann-category').value,
        content: document.getElementById('add-ann-content').value,
        authorId: currentUser.userId // authorId is still useful for the sheet
    };

    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
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
    if (!editBtn) return;
    const announcementId = editBtn.dataset.id;
    try {
        const response = await fetch(`${API_-URL}?action=getAnnouncementById&id=${announcementId}`);
        const result = await response.json();
        if (result.status === 'success') {
            document.getElementById('edit-ann-id').value = result.data.id;
            document.getElementById('edit-ann-title').value = result.data.title;
            document.getElementById('edit-ann-content').value = result.data.content;
            document.getElementById('edit-ann-category').value = result.data.category;
            showModal('edit-announcement-modal');
        } else { alert(`Error fetching details: ${result.message}`); }
    } catch(e) { alert('An error occurred.'); }
}

async function handleEditAnnouncementSubmit(e) {
    e.preventDefault();
    const currentUser = JSON.parse(localStorage.getItem('currentUser')); // Quick fetch for this one action
    if (!currentUser) { alert('You are not logged in!'); return; }
    
    const payload = { 
        action: 'updateAnnouncement',
        // --- Security Upgrade ---
        userId: currentUser.userId,
        token: currentUser.token,
        // -----------------------
        announcementId: document.getElementById('edit-ann-id').value, 
        title: document.getElementById('edit-ann-title').value, 
        content: document.getElementById('edit-ann-content').value, 
        category: document.getElementById('edit-ann-category').value 
    };
    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        alert(result.message);
        if (result.status === 'success') { hideModals(); loadAnnouncements(); }
    } catch(e) { alert('An error occurred.'); }
}

async function handleDeleteAnnouncementClick() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser')); // Quick fetch for this one action
    if (!currentUser) { alert('You are not logged in!'); return; }

    const announcementId = document.getElementById('edit-ann-id').value;
    if (!announcementId) return;

    if (confirm('Are you sure you want to permanently delete this announcement?')) {
        const deleteBtn = document.getElementById('delete-announcement-btn');
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';

        const payload = {
            action: 'deleteAnnouncement',
            // --- Security Upgrade ---
            userId: currentUser.userId,
            token: currentUser.token,
            // -----------------------
            announcementId: announcementId
        };
        
        try {
            const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
            const result = await response.json();
            alert(result.message);
            if (result.status === 'success') {
                hideModals();
                loadAnnouncements();
            }
        } catch(error) {
            alert('A network error occurred during deletion.');
        } finally {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Delete';
        }
    }
}


// --- Generic ---
function handleLogout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}
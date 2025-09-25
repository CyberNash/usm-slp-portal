document.addEventListener('DOMContentLoaded', () => {
    // API_URL and currentUser should be available from config.js and localStorage
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    if (!currentUser || currentUser.role !== 'Supervisor') {
        alert('Access Denied.');
        window.location.href = 'index.html';
        return;
    }

    // --- Get Elements ---
    const modalBackdrop = document.getElementById('modal-backdrop');
    const announcementsListContainer = document.getElementById('announcements-list');

    // --- Main Initializer ---
    function initAnnouncementsView() {
        document.getElementById('welcome-message').textContent = `Welcome, ${currentUser.fullName}!`;
        loadAnnouncements();

        // All Event Listeners for this page
        document.getElementById('add-announcement-btn').addEventListener('click', () => showModal('add-announcement-modal'));
        modalBackdrop.addEventListener('click', (e) => {
            if (e.target.matches('.close-btn') || e.target === modalBackdrop) hideModals();
        });
        document.getElementById('announcement-form').addEventListener('submit', handleAnnouncementSubmit);
        document.getElementById('edit-announcement-form').addEventListener('submit', handleEditAnnouncementSubmit);
        document.getElementById('delete-announcement-btn').addEventListener('click', handleDeleteAnnouncementClick);
        announcementsListContainer.addEventListener('click', handleAnnouncementsListClick);
    }

    // --- Modal Helpers ---
    function showModal(modalId) {
        modalBackdrop.style.display = 'flex';
        document.getElementById(modalId).style.display = 'block';
    }
    function hideModals() {
        modalBackdrop.style.display = 'none';
        modalBackdrop.querySelectorAll('.modal-content').forEach(modal => modal.style.display = 'none');
    }

    // --- ALL ANNOUNCEMENT-RELATED FUNCTIONS MOVED HERE ---
    async function handleDeleteAnnouncementClick() {
        const announcementId = document.getElementById('edit-ann-id').value;
        if (!announcementId || !confirm('Are you sure you want to permanently delete this announcement?')) return;
        
        const deleteBtn = document.getElementById('delete-announcement-btn');
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';

        const payload = { action: 'deleteAnnouncement', announcementId };
        
        try {
            const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
            const result = JSON.parse(await response.text());
            alert(result.message);
            if (result.status === 'success') {
                hideModals();
                loadAnnouncements();
            }
        } catch(error) {
            alert('A network error occurred.');
        } finally {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Delete';
        }
    }

    async function loadAnnouncements() {
        announcementsListContainer.innerHTML = "<p>Loading...</p>";
        try {
            const response = await fetch(`${API_URL}?action=getAllAnnouncements`);
            const result = await response.json();
            if (result.status === 'success' && result.data.length > 0) {
                announcementsListContainer.innerHTML = result.data.map(ann => `
                    <div class="announcement-item">
                        <div class="announcement-item__header">
                            <strong class="announcement-item__title">${ann.title}</strong>
                            <button class="btn-edit" data-id="${ann.id}" title="Edit"><i class="fas fa-pencil-alt"></i></button>
                        </div>
                        <p class="announcement-item__content">${ann.content}</p> 
                        <div>
                            <span class="announcement-item__category">${ann.category}</span> - 
                            <span class="announcement-item__date">${new Date(ann.date).toLocaleDateString()}</span>
                        </div>
                    </div>`).join('');
            } else { announcementsListContainer.innerHTML = "<p>No announcements found.</p>"; }
        } catch(e) { announcementsListContainer.innerHTML = "<p style='color:red;'>Failed to load announcements.</p>"; }
    }
    
    async function handleAnnouncementSubmit(e) {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
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
        if (!editBtn) return;
        
        const announcementId = editBtn.dataset.id;
        const response = await fetch(`${API_URL}?action=getAnnouncementById&id=${announcementId}`);
        const result = await response.json();
        
        if (result.status === 'success') {
            document.getElementById('edit-ann-id').value = result.data.id;
            document.getElementById('edit-ann-title').value = result.data.title;
            document.getElementById('edit-ann-content').value = result.data.content;
            document.getElementById('edit-ann-category').value = result.data.category;
            showModal('edit-announcement-modal');
        } else {
            alert(`Error fetching details: ${result.message}`);
        }
    }
    
    async function handleEditAnnouncementSubmit(e) {
        e.preventDefault();
        const payload = {
            action: 'updateAnnouncement',
            announcementId: document.getElementById('edit-ann-id').value,
            title: document.getElementById('edit-ann-title').value,
            content: document.getElementById('edit-ann-content').value,
            category: document.getElementById('edit-ann-category').value
        };
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = JSON.parse(await response.text());
        alert(result.message);
        if (result.status === 'success') {
            hideModals();
            loadAnnouncements();
        }
    }
    
    // --- Initial Execution ---
    initAnnouncementsView();
});
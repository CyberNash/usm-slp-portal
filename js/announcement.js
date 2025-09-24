// js/announcement.js
document.addEventListener('DOMContentLoaded', () => {
    // You must re-declare this, as it's a separate page
    const announcementContentContainer = document.getElementById('announcement-content');

    // --- 1. Get the Announcement ID from the URL ---
    // This is the key part: it reads the '?id=...' from the page's address
    const params = new URLSearchParams(window.location.search);
    const announcementId = params.get('id');

    if (!announcementId) {
        announcementContentContainer.innerHTML = '<h2>Error</h2><p>No announcement ID was provided.</p>';
        return;
    }

    // --- 2. Fetch the Specific Announcement Data ---
    async function fetchSingleAnnouncement() {
        try {
            // We can reuse the same 'getAnnouncementById' function from the supervisor dashboard!
            const response = await fetch(`${API_URL}?action=getAnnouncementById&id=${announcementId}`);
            const result = await response.json();

            if (result.status === 'success') {
                renderAnnouncement(result.data);
            } else {
                announcementContentContainer.innerHTML = `<h2>Error</h2><p>${result.message}</p>`;
            }
        } catch (error) {
            console.error('Failed to fetch announcement:', error);
            announcementContentContainer.innerHTML = '<h2>Error</h2><p>Could not connect to the server to load the announcement.</p>';
        }
    }

    // --- 3. Display the Announcement ---
    function renderAnnouncement(data) {
        // Change the page title to match the announcement
        document.title = `${data.title} - USM SLP`;

        // Create the full HTML for the announcement details
        announcementContentContainer.innerHTML = `
            <h1>${data.title}</h1>
            <p class="announcement-meta" style="color: #6c757d; border-bottom: 1px solid #eee; padding-bottom: 15px;">
                <strong>Category:</strong> ${data.category}
            </p>
            <div style="margin-top: 20px; font-size: 1.1em; line-height: 1.7;">
                ${data.content.replace(/\n/g, '<br>')}
            </div>
        `;
    }

    // --- 4. Run the function ---
    fetchSingleAnnouncement();
});
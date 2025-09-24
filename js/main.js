/**
 * =================================================================================
 * Main JavaScript for USM SLP Website (Landing Page)
 * =================================================================================
 * This script handles fetching and displaying dynamic content on the index.html page.
 */

// IMPORTANT: Replace this with the actual Web App URL you got from deploying your Google Apps Script.
let autoplayInterval = null; // A variable to hold our autoplay timer
const categoryStyles = {
    'Achievement': { icon: 'fas fa-trophy', color: '#FFC107' }, // Gold
    'Event':       { icon: 'fas fa-calendar-alt', color: '#00BCD4' }, // Teal
    'Update':      { icon: 'fas fa-bullhorn', color: '#6A0DAD' }, // Purple
    'default':     { icon: 'fas fa-info-circle', color: '#6c757d' } // Muted Gray for any other category
};


// --- 2. FUNCTION DEFINITIONS ---
    async function fetchAnnouncements() {
        const container = document.getElementById('announcements-container');
        container.innerHTML = '<p>Loading latest announcements...</p>';

        try {
            const response = await fetch(`${API_URL}?action=getAnnouncements`);
            const result = await response.json();

            if (result.status === 'success' && result.data.length > 0) {
                container.innerHTML = '';
                result.data.forEach(ann => {
                    // ... your card creation logic is perfect and does not need to change ...
                    const card = document.createElement('div');
                    card.className = 'announcement-card';
                    const style = categoryStyles[ann.category] || categoryStyles['default'];
                    const postDate = new Date(ann.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                    const shortContent = ann.content.length > 150 ? ann.content.substring(0, 150) + '...' : ann.content;
                    card.innerHTML = `<div class="image-box" style="background-color: ${style.color};"><i class="${style.icon}"></i><span class="category">${ann.category || 'News'}</span></div><div class="content-box"><h3>${ann.title}</h3><p class="date">${postDate}</p><p>${shortContent}</p><a href="announcement.html?id=${ann.id}" class="btn-teal">Read More</a></div>`;
                    container.appendChild(card);
                });

                // THE FIX #1: Defer the initialization to let the browser render first.
                setTimeout(initializeSlider, 100);

            } else {
                container.innerHTML = '<p>No recent announcements found.</p>';
            }
        } catch (error) {
            console.error('Error fetching announcements:', error);
            container.innerHTML = '<p style="color: red;">Could not load announcements at this time.</p>';
        }
    }

    function initializeSlider() {
        console.log("Attempting to initialize slider..."); // For debugging

        const track = document.getElementById('announcements-container');
        const leftBtn = document.getElementById('slider-btn-left');
        const rightBtn = document.getElementById('slider-btn-right');

        // More robust check: Are all the essential parts here?
        if (!track || !leftBtn || !rightBtn) {
            console.error("Slider initialization failed: Could not find track or buttons.");
            return; // Stop if the core HTML is missing
        }

        // Is there anything to slide?
        if (track.children.length <= 1) {
            console.log("Slider not needed: 1 or fewer announcements found.");
            // Hide the buttons if there's nothing to slide to
            leftBtn.style.display = 'none';
            rightBtn.style.display = 'none';
            return; // Stop if there's no need for a slider
        }
        
        // If we get here, the buttons should be visible
        leftBtn.style.display = 'block';
        rightBtn.style.display = 'block';

        function updateSlider() {
            // THIS IS THE CRITICAL CHECK
            if (track.children.length === 0) {
                console.error("updateSlider failed: No announcement cards exist in the track.");
                return;
            }

            // Now it's safe to measure the first child
            const scrollDistance = track.clientWidth;
            console.log(`Slider updated. Scroll distance per slide: ${scrollDistance}px`);
            
            const slideRight = () => {
                // Using a buffer (10px) to handle rounding issues
                if (track.scrollLeft >= track.scrollWidth - scrollDistance - 10) {
                    track.scrollLeft = 0; // Loop to start
                } else {
                    track.scrollLeft += scrollDistance;
                }
            };
            
            const slideLeft = () => {
                if (track.scrollLeft < scrollDistance) {
                    track.scrollLeft = track.scrollWidth; // Loop to end
                } else {
                    track.scrollLeft -= scrollDistance;
                }
            };

            // --- Event Listener Management ---
            if (autoplayInterval) clearInterval(autoplayInterval);
            
            leftBtn.onclick = null;
            rightBtn.onclick = null;
            
            leftBtn.onclick = () => { clearInterval(autoplayInterval); slideLeft(); };
            rightBtn.onclick = () => { clearInterval(autoplayInterval); slideRight(); };
            
            autoplayInterval = setInterval(slideRight, 4000);
            console.log("Slider autoplay started.");
        }

        // Run the setup and listen for window resizing
        updateSlider();
        window.addEventListener('resize', updateSlider);
    }
    
/**
 * Fetches resources from the backend and builds a clickable accordion.
 */
async function fetchResources() {
    const container = document.getElementById('resources-accordion-container');
    try {
        const response = await fetch(`${API_URL}?action=getResources`);
        const result = await response.json();

        if (result.status === 'success' && result.data.length > 0) {
            container.innerHTML = '';
            const categories = {};
            result.data.forEach(res => {
                if (!categories[res.category]) categories[res.category] = [];
                categories[res.category].push(res);
            });

            for (const category in categories) {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'accordion-item';
                const header = document.createElement('button');
                header.className = 'accordion-header';
                header.innerHTML = `<span><i class="fas fa-folder"></i> ${category}</span>`;
                const body = document.createElement('div');
                body.className = 'accordion-body';
                categories[category].forEach(resource => {
                    body.innerHTML += `<a href="${resource.fileUrl}" target="_blank" download>${resource.title}</a>`;
                });
                itemDiv.appendChild(header);
                itemDiv.appendChild(body);
                container.appendChild(itemDiv);
            }
            initializeAccordion();
        } else {
            container.innerHTML = '<p>No resources available.</p>';
        }
    } catch (error) {
        console.error("Error fetching resources:", error);
        container.innerHTML = '<p>Failed to load resources.</p>';
    }
}

/**
 * Adds click event listeners to make the resource accordion interactive.
 */
function initializeAccordion() {
    const headers = document.querySelectorAll('.accordion-header');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            header.classList.toggle('active');
            const body = header.nextElementSibling;
            if (body.style.maxHeight) {
                body.style.maxHeight = null;
            } else {
                body.style.maxHeight = body.scrollHeight + "px";
            }
        });
    });
}


// --- 3. MAIN EXECUTION ---
// This runs after the entire HTML page has been loaded.
document.addEventListener('DOMContentLoaded', () => {
    fetchAnnouncements();
    fetchResources();
});
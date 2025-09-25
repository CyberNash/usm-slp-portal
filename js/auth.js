/**auth.js
 * =================================================================================
 * Authentication JavaScript for USM SLP Website
 * =================================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
 // --- Get all the necessary DOM elements ---
    const loginNavBtn = document.getElementById('login-nav-btn');
    const signupNavBtn = document.getElementById('signup-nav-btn');
    const modalBackdrop = document.getElementById('auth-modal-backdrop');
    const loginModal = document.getElementById('login-modal');
    const signupModal = document.getElementById('signup-modal');
    const closeButtons = document.querySelectorAll('.close-btn');

    // Forms
    const loginForm = document.getElementById('login-form');
    const studentSignupForm = document.getElementById('student-signup-form');
    const supervisorSignupForm = document.getElementById('supervisor-signup-form');
    const tabLinks = document.querySelectorAll('.tab-link');
    const signupForms = document.querySelectorAll('.signup-form');

    async function validateSession() {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));

        // Check 1: Is there a user object and a token in localStorage?
        if (!currentUser || !currentUser.userId || !currentUser.token) {
            console.log("No user or token found. Redirecting to login.");
            localStorage.removeItem('currentUser'); // Clean up partial data
            window.location.href = 'index.html';
            return null;
        }

        // Check 2: Ask the backend if this token is still valid.
        try {
            const payload = {
                action: 'validateToken', // We will create this action on the backend
                userId: currentUser.userId,
                token: currentUser.token
            };

            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.status !== 'success' || result.isValid !== true) {
                console.log("Session token is invalid or expired. Logging out.");
                localStorage.removeItem('currentUser');
                alert('Your session has expired. Please log in again.');
                window.location.href = 'index.html';
                return null;
            }

            // If we get here, the token is valid!
            console.log("Session token is valid.");
            return currentUser;

        } catch (error) {
            console.error("Error during session validation:", error);
            alert('Could not verify session. Please check your internet connection and try again.');
            window.location.href = 'index.html'; // Redirect on error
            return null;
        }
    }

    // --- Functions to control modals ---
    function showModal(modalElement) {
        modalBackdrop.classList.add('active');
        modalElement.style.display = 'block';
    }

    function hideModals() {
        modalBackdrop.classList.remove('active');
        loginModal.style.display = 'none';
        signupModal.style.display = 'none';
    }

    // --- Event Listeners for showing/hiding modals ---
    loginNavBtn.addEventListener('click', () => {
        signupModal.style.display = 'none';
        showModal(loginModal);
    });

    signupNavBtn.addEventListener('click', () => {
        loginModal.style.display = 'none';
        showModal(signupModal);
    });

    closeButtons.forEach(button => button.addEventListener('click', hideModals));
    modalBackdrop.addEventListener('click', (event) => {
        if (event.target === modalBackdrop) hideModals();
    });

    // --- Logic for Sign-up Form Tabs ---
    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            tabLinks.forEach(item => item.classList.remove('active'));
            signupForms.forEach(form => form.style.display = 'none');
            link.classList.add('active');
            const formId = link.getAttribute('data-form');
            document.getElementById(formId).style.display = 'block';
        });
    });

    async function handleFormSubmit(formElement, url, payload) {
        const submitButton = formElement.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Processing...';

        try {
            const response = await fetch(url, {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: JSON.stringify(payload)
            });

            const result = JSON.parse(await response.text());

            if (result.status === 'success') {
                if (payload.action === 'login') {
                    localStorage.setItem('currentUser', JSON.stringify(result.userData));
                    // --- NEW: Redirect based on user role ---
                    switch(result.userData.role) {
                        case 'Student':
                            window.location.href = 'student-dashboard.html';
                            break;
                        case 'Supervisor':
                            window.location.href = 'supervisor-dashboard.html';
                            break;
                        case 'Admin':
                            window.location.href = 'admin-dashboard.html';
                            break;
                        default:
                            alert('Unknown user role. Cannot log in.');
                    }
                } else { // Handle successful sign-up
                    alert(result.message);
                    formElement.reset(); // Clear the form fields
                    hideModals();
                }
            } else {
                alert(`Error: ${result.message}`);
            }
        } catch (error) {
            console.error('Submission Error:', error);
            alert('A critical error occurred. Please try again.');
        } finally {
            // Re-enable the button after the process is complete
            submitButton.disabled = false;
            // You can customize this text if needed, e.g., using a data-attribute on the button
            submitButton.textContent = formElement.id.includes('login') ? 'Login' : 'Sign Up';
        }
    }
    
    // --- Login Form Submission Listener ---
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const payload = {
            action: 'login',
            email: document.getElementById('login-email').value,
            password: document.getElementById('login-password').value
        };
        handleFormSubmit(loginForm, API_URL, payload);
    });

    // --- Student Sign-Up Form Submission Listener ---
    studentSignupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const payload = {
            action: 'signUp',
            role: 'Student',
            fullName: document.getElementById('student-name').value,
            matricNumber: document.getElementById('student-id').value,
            year: document.getElementById('student-year').value,
            course: document.getElementById('student-course').value,
            email: document.getElementById('student-email').value,
            phoneNumber: document.getElementById('student-phone').value,
            password: document.getElementById('student-password').value
        };
        
        // Use this console log to debug: Check the browser console (F12) to see exactly what is being sent.
        console.log("Submitting Student Payload:", payload); 

        handleFormSubmit(studentSignupForm, API_URL, payload);
    });

    // --- Supervisor Sign-Up Form Submission Listener ---
    supervisorSignupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const payload = {
            action: 'signUp',
            role: 'Supervisor',
            fullName: document.getElementById('supervisor-name').value,
            employeeID: document.getElementById('supervisor-id').value,
            email: document.getElementById('supervisor-email').value,
            phoneNumber: document.getElementById('supervisor-phone').value,
            password: document.getElementById('supervisor-password').value
        };

        // Use this console log to debug
        console.log("Submitting Supervisor Payload:", payload);
        
        handleFormSubmit(supervisorSignupForm, API_URL, payload);
    });
});
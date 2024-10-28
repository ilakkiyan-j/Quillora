const signupForm = document.getElementById('signup-form');
const signupNext = document.getElementById('signup-next');
let currentStep = 0;

signupNext.addEventListener('click', async () => {
    const inputGroups = signupForm.querySelectorAll('.input-group');
    if (currentStep < inputGroups.length - 1) {
        inputGroups[currentStep].style.display = 'none';
        currentStep++;
        inputGroups[currentStep].style.display = 'block';
        if (currentStep === inputGroups.length - 1) {
            signupNext.innerHTML = 'Start Your Journey <i class="fas fa-arrow-right button-icon"></i>';
        }
    } else {
        const name = document.getElementById('name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        try {
            const response = await fetch('/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password }),
            });

            if (response.ok) {
                const message = await response.text();
                alert(message);
                window.location.href = '/signin';
                // Optionally redirect to another page or reset form
            } else {
                const errorMessage = await response.text();
                alert(`Error: ${errorMessage}`);
            }
        } catch (error) {
            console.error("Error during signup:", error);
            alert("An error occurred. Please try again.");
        }
    }
});

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('errorMessage').style.display = 'none';

    document.getElementById("loginForm").addEventListener("submit", function (e) {
        e.preventDefault();

        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        fetch("https://raspi5-mese-iot.mesebilisim.com/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Login failed');
            }
            return response.json();
        })
        .then(data => {
            console.log('Login successful:', data);
            localStorage.setItem('token', data.token);
            localStorage.setItem('refreshToken', data.refreshToken);
            window.location.href = 'cihazlar.html';
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('errorMessage').style.display = 'block';
        });
    });
});

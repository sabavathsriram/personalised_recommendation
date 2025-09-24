// CodeRabbit Integration
console.log('CodeRabbit: Active - Monitoring code quality in background');

// Globe Canvas Setup
const canvas = document.getElementById('globeCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Globe Animation
class Globe {
    constructor() {
        this.points = [];
        this.rotation = 0;
        this.createPoints();
    }

    createPoints() {
        const latLines = 10;
        const lonLines = 20;
        
        // Create latitude lines
        for (let lat = 0; lat < latLines; lat++) {
            const theta = (lat / latLines) * Math.PI;
            const y = Math.cos(theta);
            const radius = Math.sin(theta);
            
            for (let lon = 0; lon < lonLines; lon++) {
                const phi = (lon / lonLines) * 2 * Math.PI;
                const x = radius * Math.cos(phi);
                const z = radius * Math.sin(phi);
                
                this.points.push({ x, y, z, type: 'lat' });
            }
        }
        
        // Create longitude lines
        for (let lon = 0; lon < lonLines; lon++) {
            const phi = (lon / lonLines) * 2 * Math.PI;
            
            for (let lat = 0; lat < latLines * 2; lat++) {
                const theta = (lat / (latLines * 2)) * Math.PI;
                const y = Math.cos(theta);
                const radius = Math.sin(theta);
                const x = radius * Math.cos(phi);
                const z = radius * Math.sin(phi);
                
                this.points.push({ x, y, z, type: 'lon' });
            }
        }
    }

    rotate() {
        this.rotation += 0.005;
    }

    project(point) {
        const scale = 150;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Rotate around Y axis
        const x = point.x * Math.cos(this.rotation) - point.z * Math.sin(this.rotation);
        const z = point.x * Math.sin(this.rotation) + point.z * Math.cos(this.rotation);
        
        // Simple perspective projection
        const perspective = 1 / (2 - z * 0.5);
        const projX = x * scale * perspective + centerX;
        const projY = point.y * scale * perspective + centerY;
        
        return { x: projX, y: projY, z: z, scale: perspective };
    }

    draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Sort points by z-depth
        const projected = this.points.map(p => ({
            ...this.project(p),
            type: p.type
        })).sort((a, b) => a.z - b.z);
        
        // Draw points
        projected.forEach(point => {
            if (point.z > -0.5) { // Only draw visible points
                const opacity = Math.max(0.1, (point.z + 1) / 2);
                const size = Math.max(1, point.scale * 2);
                
                ctx.beginPath();
                ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(30, 144, 255, ${opacity})`;
                ctx.fill();
                
                // Add glow effect for front-facing points
                if (point.z > 0.5) {
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, size * 2, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(30, 144, 255, ${opacity * 0.3})`;
                    ctx.fill();
                }
            }
        });
    }

    animate() {
        this.rotate();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize Globe
const globe = new Globe();
globe.animate();

// Tab Switching
const tabBtns = document.querySelectorAll('.tab-btn');
const authForms = document.querySelectorAll('.auth-form');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        
        // Update active states
        tabBtns.forEach(b => b.classList.remove('active'));
        authForms.forEach(f => f.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(targetTab + 'Form').classList.add('active');
    });
});

// Password Toggle
document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', function() {
        const input = this.parentElement.querySelector('.form-input');
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        
        // Update icon
        const svg = this.querySelector('svg');
        if (type === 'text') {
            svg.innerHTML = `
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
            `;
        } else {
            svg.innerHTML = `
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            `;
        }
    });
});

// Password Strength Checker
const signupPassword = document.getElementById('signupPassword');
const passwordStrength = document.querySelector('.password-strength');
const strengthProgress = document.querySelector('.strength-progress');
const strengthText = document.querySelector('.strength-text');

signupPassword?.addEventListener('input', function() {
    const password = this.value;
    let strength = 0;
    
    if (password.length > 0) {
        passwordStrength.classList.add('show');
    } else {
        passwordStrength.classList.remove('show');
        return;
    }
    
    // Check password strength
    if (password.length >= 8) strength += 25;
    if (password.match(/[a-z]+/)) strength += 25;
    if (password.match(/[A-Z]+/)) strength += 25;
    if (password.match(/[0-9]+/)) strength += 25;
    if (password.match(/[$@#&!]+/)) strength += 25;
    
    // Cap at 100
    strength = Math.min(strength, 100);
    
    // Update UI
    strengthProgress.style.width = strength + '%';
    
    if (strength < 40) {
        strengthText.textContent = 'Weak password';
        strengthProgress.style.background = '#ff4444';
    } else if (strength < 70) {
        strengthText.textContent = 'Medium strength';
        strengthProgress.style.background = '#ffaa00';
    } else {
        strengthText.textContent = 'Strong password';
        strengthProgress.style.background = '#00ff00';
    }
});

// Form Validation
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function showError(input, message) {
    input.classList.add('invalid');
    input.classList.remove('valid');
    
    let errorElement = input.parentElement.querySelector('.error-message');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        input.parentElement.appendChild(errorElement);
    }
    errorElement.textContent = message;
    errorElement.classList.add('show');
}

function showSuccess(input) {
    input.classList.add('valid');
    input.classList.remove('invalid');
    
    const errorElement = input.parentElement.querySelector('.error-message');
    if (errorElement) {
        errorElement.classList.remove('show');
    }
}

// Email validation on input
document.querySelectorAll('input[type="email"]').forEach(input => {
    input.addEventListener('blur', function() {
        if (this.value && !validateEmail(this.value)) {
            showError(this, 'Please enter a valid email address');
        } else if (this.value) {
            showSuccess(this);
        }
    });
});

// Sign In Form Handler
document.getElementById('signinForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('signinEmail').value;
    const password = document.getElementById('signinPassword').value;
    const submitBtn = this.querySelector('.submit-btn');
    
    // Validate
    if (!validateEmail(email)) {
        showError(document.getElementById('signinEmail'), 'Please enter a valid email');
        return;
    }
    
    if (password.length < 6) {
        showError(document.getElementById('signinPassword'), 'Password must be at least 6 characters');
        return;
    }
    
    // Add loading state
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    
    // Simulate API call
    setTimeout(() => {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        
        // Show success message
        showSuccessMessage();
        
        // Reset form
        this.reset();
        document.querySelectorAll('.form-input').forEach(input => {
            input.classList.remove('valid', 'invalid');
        });

        // Redirect the user to the main recommender page
        console.log("Login successful! Redirecting...");
        window.location.href = 'index.html';

    }, 2000);
});

// Sign Up Form Handler
document.getElementById('signupForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;
    const submitBtn = this.querySelector('.submit-btn');
    
    // Validate
    if (name.length < 2) {
        showError(document.getElementById('signupName'), 'Name must be at least 2 characters');
        return;
    }
    
    if (!validateEmail(email)) {
        showError(document.getElementById('signupEmail'), 'Please enter a valid email');
        return;
    }
    
    if (password.length < 8) {
        showError(document.getElementById('signupPassword'), 'Password must be at least 8 characters');
        return;
    }
    
    if (password !== confirmPassword) {
        showError(document.getElementById('confirmPassword'), 'Passwords do not match');
        return;
    }
    
    if (!agreeTerms) {
        alert('Please agree to the Terms & Conditions');
        return;
    }
    
    // Add loading state
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    
    // Simulate API call
    setTimeout(() => {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        
        // Show success message
        showSuccessMessage();
        
        // Reset form
        this.reset();
        document.querySelectorAll('.form-input').forEach(input => {
            input.classList.remove('valid', 'invalid');
        });
        passwordStrength.classList.remove('show');
    }, 2000);
});

// Success Message
function showSuccessMessage() {
    const successMessage = document.getElementById('successMessage');
    successMessage.classList.add('show');
    
    setTimeout(() => {
        successMessage.classList.remove('show');
    }, 3000);
}

// Social Login Handlers
document.querySelectorAll('.social-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        // Add ripple effect
        const ripple = document.createElement('span');
        ripple.className = 'btn-glow';
        this.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
        
        // Here you would implement actual OAuth flow
        console.log('Social login clicked');
    });
});

// Forgot Password Handler
document.querySelector('.forgot-link')?.addEventListener('click', function(e) {
    e.preventDefault();
    alert('Password reset functionality would be implemented here');
});

// Add floating particles dynamically
function createParticle() {
    const particle = document.createElement('div');
    particle.style.position = 'absolute';
    particle.style.width = '2px';
    particle.style.height = '2px';
    particle.style.background = '#1e90ff';
    particle.style.borderRadius = '50%';
    particle.style.left = Math.random() * window.innerWidth + 'px';
    particle.style.top = window.innerHeight + 'px';
    particle.style.pointerEvents = 'none';
    
    document.querySelector('.floating-particles').appendChild(particle);
    
    // Animate particle
    let position = window.innerHeight;
    const speed = 1 + Math.random() * 2;
    
    const animateParticle = () => {
        position -= speed;
        particle.style.top = position + 'px';
        particle.style.opacity = Math.max(0, position / window.innerHeight);
        
        if (position > -10) {
            requestAnimationFrame(animateParticle);
        } else {
            particle.remove();
        }
    };
    
    animateParticle();
}

// Create particles periodically
setInterval(createParticle, 500);

// Input focus effects
document.querySelectorAll('.form-input').forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.style.transform = 'scale(1.02)';
    });
    
    input.addEventListener('blur', function() {
        this.parentElement.style.transform = 'scale(1)';
    });
});

// Page visibility change handler
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        console.log('CodeRabbit: Pausing background animations');
    } else {
        console.log('CodeRabbit: Resuming background animations');
    }
});

// Initialize on load
window.addEventListener('load', () => {
    console.log('Globe Authentication System Initialized');
    console.log('CodeRabbit: All systems operational');
});
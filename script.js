// Handle scroll-based animations
let lastScrollY = 0;
const pigContainer = document.querySelector('.pig-container');
const pig = document.querySelector('.pig');
const scrollIndicator = document.querySelector('.scroll-indicator');
const layers = document.querySelectorAll('.layer');

// Update pig position based on scroll
window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollPercent = scrollY / (documentHeight - windowHeight);

    // Move pig down as user scrolls
    const pigTopPercent = 10 + (scrollPercent * 70);

    // Check if we're in the landing section
    const landingSection = document.getElementById('landing');
    const landingRect = landingSection.getBoundingClientRect();

    if (landingRect.top <= windowHeight && landingRect.bottom >= 0) {
        // Hide the floating pig when in landing section
        pigContainer.style.opacity = '0';
        scrollIndicator.style.opacity = '0';
    } else {
        pigContainer.style.opacity = '1';
        pigContainer.style.top = pigTopPercent + '%';

        // Hide scroll indicator at the bottom
        if (scrollPercent > 0.9) {
            scrollIndicator.style.opacity = '0';
        } else {
            scrollIndicator.style.opacity = '1';
        }
    }

    // Add rotation based on scroll direction
    if (scrollY > lastScrollY) {
        pig.style.transform = 'rotate(10deg)';
    } else {
        pig.style.transform = 'rotate(-10deg)';
    }

    lastScrollY = scrollY;

    // Add parallax effect to layers
    layers.forEach((layer, index) => {
        const rect = layer.getBoundingClientRect();
        const offset = (windowHeight - rect.top) / windowHeight;

        if (offset > 0 && offset < 1) {
            const parallaxSpeed = 0.5;
            layer.style.transform = `translateY(${offset * 50 * parallaxSpeed}px)`;
        }
    });
});

// Add smooth scroll behavior
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Auto-scroll feature (optional - can be triggered on load)
function autoScroll() {
    const scrollDuration = 30000; // 30 seconds to scroll through all layers
    const scrollStep = (document.documentElement.scrollHeight - window.innerHeight) / (scrollDuration / 16);

    let currentScroll = 0;
    const autoScrollInterval = setInterval(() => {
        currentScroll += scrollStep;
        window.scrollTo(0, currentScroll);

        if (currentScroll >= document.documentElement.scrollHeight - window.innerHeight) {
            clearInterval(autoScrollInterval);
        }
    }, 16);
}

// Uncomment the line below to enable auto-scroll on page load
// setTimeout(autoScroll, 1000);

// Add balloons dynamically
function createBalloons() {
    const colors = ['🎈', '🎈', '🎈'];
    const pigElement = document.querySelector('.pig-container .pig');

    // Create balloon effect
    const balloonsHTML = colors.map((balloon, i) =>
        `<span class="balloon" style="
            position: absolute;
            top: -${20 + i * 15}px;
            left: ${-10 + i * 15}px;
            font-size: 30px;
            animation: balloon-float 3s ease-in-out infinite;
            animation-delay: ${i * 0.2}s;
        ">${balloon}</span>`
    ).join('');

    pigElement.innerHTML = balloonsHTML + pigElement.innerHTML;
}

// Add balloon CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes balloon-float {
        0%, 100% { transform: translateY(0) rotate(-5deg); }
        50% { transform: translateY(-10px) rotate(5deg); }
    }
`;
document.head.appendChild(style);

// Initialize balloons
createBalloons();

// Add sparkle effect to pig
function createSparkle(x, y) {
    const sparkle = document.createElement('div');
    sparkle.style.position = 'fixed';
    sparkle.style.left = x + 'px';
    sparkle.style.top = y + 'px';
    sparkle.style.width = '10px';
    sparkle.style.height = '10px';
    sparkle.style.borderRadius = '50%';
    sparkle.style.background = 'radial-gradient(circle, #fff, #ffd700)';
    sparkle.style.pointerEvents = 'none';
    sparkle.style.animation = 'sparkle-fade 1s ease-out forwards';
    sparkle.style.zIndex = '1000';

    document.body.appendChild(sparkle);

    setTimeout(() => sparkle.remove(), 1000);
}

const sparkleStyle = document.createElement('style');
sparkleStyle.textContent = `
    @keyframes sparkle-fade {
        0% {
            opacity: 1;
            transform: scale(0) rotate(0deg);
        }
        100% {
            opacity: 0;
            transform: scale(2) rotate(180deg);
        }
    }
`;
document.head.appendChild(sparkleStyle);

// Add sparkles periodically
setInterval(() => {
    const pigRect = pigContainer.getBoundingClientRect();
    if (pigContainer.style.opacity !== '0') {
        const x = pigRect.left + pigRect.width * Math.random();
        const y = pigRect.top + pigRect.height * Math.random();
        createSparkle(x, y);
    }
}, 500);

// Add welcome message
console.log('🎈🐷 Welcome to the Pig\'s Atmospheric Journey! 🌍✨');
console.log('Scroll down to follow the whimsical pig through the layers of Earth\'s atmosphere!');

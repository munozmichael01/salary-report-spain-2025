// Main - Initialize and orchestrate the dashboard

class Dashboard {
    constructor() {
        this.initialized = false;
    }

    async init() {
        try {
            console.log('Initializing dashboard...');

            // Show loading state
            this.showLoading();

            // Load all data
            const data = await window.dataLoader.loadAllData();

            // Initialize components
            window.chartManager.createAll(data);
            window.tableManager.populateAll(data);
            window.explorerManager.init(data);

            // Setup navigation
            this.setupNavigation();

            // Setup scroll animations
            this.setupScrollAnimations();

            this.hideLoading();
            this.initialized = true;

            console.log('Dashboard initialized successfully!');
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            this.showError(error);
        }
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const targetId = link.getAttribute('href');

                // Only handle internal anchor links (starting with #)
                // Allow external page links to navigate normally
                if (!targetId || !targetId.startsWith('#')) {
                    return; // Let the browser handle normal navigation
                }

                e.preventDefault();

                // Update active state
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                // Smooth scroll to section
                const targetSection = document.querySelector(targetId);

                if (targetSection) {
                    const navHeight = document.querySelector('.navbar').offsetHeight;
                    const targetPosition = targetSection.offsetTop - navHeight - 20;

                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });

        // Update active nav on scroll
        window.addEventListener('scroll', () => {
            const sections = document.querySelectorAll('.section[id]');
            const navHeight = document.querySelector('.navbar').offsetHeight;

            let current = '';

            sections.forEach(section => {
                const sectionTop = section.offsetTop - navHeight - 100;
                const sectionHeight = section.offsetHeight;

                if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
                    current = section.getAttribute('id');
                }
            });

            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${current}`) {
                    link.classList.add('active');
                }
            });
        });
    }

    setupScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        // Observe all sections
        document.querySelectorAll('.section').forEach(section => {
            section.style.opacity = '0';
            section.style.transform = 'translateY(20px)';
            section.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
            observer.observe(section);
        });
    }

    showLoading() {
        const body = document.body;
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loadingOverlay';
        loadingOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(26, 58, 82, 0.95);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            color: white;
        `;

        loadingOverlay.innerHTML = `
            <div style="text-align: center;">
                <div class="loading-spinner" style="
                    width: 60px;
                    height: 60px;
                    border: 4px solid rgba(255,255,255,0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                "></div>
                <h2 style="margin: 0; font-size: 1.5em;">Cargando Dashboard</h2>
                <p style="margin: 10px 0 0; opacity: 0.9;">Procesando 10.134 ofertas...</p>
            </div>
            <style>
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            </style>
        `;

        body.appendChild(loadingOverlay);
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            loadingOverlay.style.transition = 'opacity 0.5s ease-out';

            setTimeout(() => {
                loadingOverlay.remove();
            }, 500);
        }
    }

    showError(error) {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.innerHTML = `
                <div style="text-align: center; max-width: 600px; padding: 40px;">
                    <div style="font-size: 4em; margin-bottom: 20px;">⚠️</div>
                    <h2 style="margin: 0 0 20px; color: #e74c3c;">Error al Cargar el Dashboard</h2>
                    <p style="margin: 0 0 10px; opacity: 0.9;">No se pudieron cargar los datos. Por favor, verifica:</p>
                    <ul style="text-align: left; opacity: 0.9; line-height: 1.8;">
                        <li>Que los archivos CSV estén en la carpeta <code>data/</code></li>
                        <li>Que estés ejecutando el dashboard desde un servidor web (no file://)</li>
                        <li>Que los nombres de archivo coincidan con los esperados</li>
                    </ul>
                    <p style="margin: 20px 0 0; font-size: 0.9em; opacity: 0.7;">
                        Error técnico: ${error.message}
                    </p>
                    <button onclick="location.reload()" style="
                        margin-top: 20px;
                        padding: 12px 30px;
                        background: white;
                        color: #1a3a52;
                        border: none;
                        border-radius: 6px;
                        font-size: 1em;
                        font-weight: 600;
                        cursor: pointer;
                    ">Reintentar</button>
                </div>
            `;
        }
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new Dashboard();
    dashboard.init();
});

// Export for debugging
window.dashboard = Dashboard;

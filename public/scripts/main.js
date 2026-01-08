// Wait until the entire HTML document is loaded before trying to access the elements.
document.addEventListener('DOMContentLoaded', function() {
    
    // 1. Get references to the necessary HTML elements
    const themeToggleBtn = document.getElementById('theme-toggle');
    const bodyElement = document.body;
    const themeIcon = document.getElementById('theme-icon'); 
    
    // 🛑 CRITICAL CHECK: Ensure the button exists before attaching the listener
    if (!themeToggleBtn || !themeIcon) {
        console.error("Theme toggle button or icon not found. Check your HTML IDs.");
        return; 
    }

    // Define the sequence of themes to cycle through
    const themeSequence = ['dark', 'light', 'StarSafe'];

    /**
     * Function to set the icon based on the current theme
     * @param {string} theme - The current theme name ('dark', 'light', or 'StarSafe').
     */
    function updateThemeIcon(theme) {
        
        // --- CRITICAL FIX: Remove previous icons ---
        themeIcon.classList.remove('fa-moon', 'fa-sun', 'fa-star');
        
        // Add the base class for Font Awesome icons
        themeIcon.classList.add('fa-solid'); 
        
        // Add the new icon class
        if (theme === 'dark') {
            themeIcon.classList.add('fa-moon'); 
        } else if (theme === 'light') {
            themeIcon.classList.add('fa-sun'); 
        } else if (theme === 'StarSafe') {
            // Star icon for the StarSafe theme
            themeIcon.classList.add('fa-star'); 
        }
    }
    
    /**
     * Function to set the data-theme attribute on the body and save to localStorage.
     * @param {string} themeName - The name of the theme to apply.
     */
    function applyAndSaveTheme(themeName) {
        // 1. Apply the theme to the body
        bodyElement.setAttribute('data-theme', themeName);
        
        // 2. SAVE the theme preference to the browser's local storage
        localStorage.setItem('theme', themeName);
        
        // 3. Update the button icon
        updateThemeIcon(themeName);
        console.log(`Theme switched to and saved as ${themeName}`);
    }


    // 3. Add an event listener to the button
    themeToggleBtn.addEventListener('click', function() {
        // Read the currently active theme (uses the fallback logic if attribute is missing)
        const currentTheme = bodyElement.getAttribute('data-theme') || themeSequence[0];
        
        // Find the index of the current theme
        const currentIndex = themeSequence.indexOf(currentTheme);
        
        // Calculate the index of the next theme (cycles back to 0 if it hits the end)
        const nextIndex = (currentIndex + 1) % themeSequence.length;
        
        const newTheme = themeSequence[nextIndex];
        
        // Apply the new theme and save it
        applyAndSaveTheme(newTheme);
    });


    // --- 4. INITIALIZATION LOGIC (The Persistence Part) ---
    
    // Check if a theme is saved in local storage
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme) {
        // If a theme is found, apply it immediately on load
        applyAndSaveTheme(savedTheme);
    } else {
        // If no theme is saved, apply the default theme from the body attribute (or 'dark')
        applyAndSaveTheme(bodyElement.getAttribute('data-theme') || 'dark');
    }

});

// --- Mobile Menu Logic ---
const openBtn = document.getElementById('menu-open-btn');
const closeBtn = document.getElementById('menu-close-btn');
const mobileMenu = document.getElementById('mobile-menu');
const activeClass = 'is-active'; 
openBtn.addEventListener('click', function() {
    mobileMenu.classList.add(activeClass);
    openBtn.style.display = 'none'; 
});

closeBtn.addEventListener('click', function() {
    mobileMenu.classList.remove(activeClass);
    openBtn.style.display = 'block'; 
});

// Optional: Close the menu if a link is clicked
// mobileMenu.querySelectorAll('a').forEach(link => {
//    link.addEventListener('click', function() {
//        mobileMenu.classList.remove(activeClass);
//        openBtn.style.display = 'block'; 
//    });
//});


async function handleSearch() {
    const userId = document.getElementById('searchInput').value;
    const modal = document.getElementById('searchModal');
    const modalBody = document.getElementById('modalBody');

    if (!userId) return alert("Please enter a User ID");

    try {
        const response = await fetch(`/api/search/${userId}`);
        const data = await response.json();

        modal.style.display = "block";
        
        if (data.blacklisted) {
            modalBody.innerHTML = `
                <div class="result-card">
                    <h3 class="status-blacklisted">⚠️ USER BLACKLISTED</h3>
                    <div class="result-id-badge">${userId}</div>
                    <p><strong>Reason:</strong> ${data.reason}</p>
                    <p><strong>Date:</strong> ${new Date(data.date).toLocaleDateString()}</p>
                </div>
            `;
        } else {
            modalBody.innerHTML = `
                <div class="result-card">
                    <h3 class="status-clean">✅ USER CLEAN</h3>
                    <div class="result-id-badge">${userId}</div>
                    <p>This user is not in the global blacklist database.</p>
                </div>
            `;
        }
    } catch (err) {
        console.error("Search failed:", err);
    }
}

function closeModal() {
    document.getElementById('searchModal').style.display = "none";
}

// Close if they click outside the box
window.onclick = function(event) {
    const modal = document.getElementById('searchModal');
    if (event.target == modal) closeModal();
}

// Mobile menu toggle
function toggleMenu() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('active');
}

// Optional: Close menu if user clicks outside of it
document.addEventListener('click', function(event) {
    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.querySelector('.mobile-menu-toggle');
    
    if (!sidebar.contains(event.target) && !toggleBtn.contains(event.target) && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
    }
});

// Overlay functionality
function toggleMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar.classList.toggle('active');
    
    // Toggle the overlay visibility
    if (sidebar.classList.contains('active')) {
        overlay.style.display = 'block';
        // Small timeout to allow the opacity transition to trigger
        setTimeout(() => { overlay.style.opacity = '1'; }, 10);
    } else {
        overlay.style.opacity = '0';
        // Wait for transition to finish before hiding
        setTimeout(() => { overlay.style.display = 'none'; }, 300);
    }
}
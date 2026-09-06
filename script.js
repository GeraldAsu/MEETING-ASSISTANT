document.addEventListener('DOMContentLoaded', () => {
    // State
    let decisions = JSON.parse(localStorage.getItem('meeting_decisions')) || [];

    // DOM Elements
    const form = document.getElementById('decision-form');
    const decisionsContainer = document.getElementById('decisions-container');
    
    // Modal Elements
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnCancelEdit = document.getElementById('btn-cancel-edit');
    
    // Export Elements
    const btnExportJson = document.getElementById('btn-export-json');
    const btnExportCsv = document.getElementById('btn-export-csv');

    // Utility: Generate a unique ID
    const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

    // Save to localStorage
    const saveDecisions = () => {
        localStorage.setItem('meeting_decisions', JSON.stringify(decisions));
    };

    // Render decisions to DOM
    const renderDecisions = () => {
        decisionsContainer.innerHTML = '';

        if (decisions.length === 0) {
            decisionsContainer.innerHTML = `
                <div class="empty-state">
                    <p>No decisions recorded yet. Fill out the form to add one.</p>
                </div>
            `;
            return;
        }

        // Sort by date descending
        const sortedDecisions = [...decisions].sort((a, b) => new Date(b.date) - new Date(a.date));

        sortedDecisions.forEach(decision => {
            const dateStr = new Date(decision.date).toLocaleDateString(undefined, { 
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            const card = document.createElement('article');
            card.className = 'decision-card';
            
            // Build the HTML
            let html = `
                <div class="decision-header">
                    <h3 class="decision-title">${escapeHTML(decision.title)}</h3>
                    <div class="decision-actions">
                        <button class="btn btn-secondary btn-sm" aria-label="Edit decision" onclick="openEditModal('${decision.id}')">Edit</button>
                        <button class="btn btn-danger btn-sm" aria-label="Delete decision" onclick="deleteDecision('${decision.id}')">Delete</button>
                    </div>
                </div>
                <div class="decision-meta">
                    <span aria-label="Date recorded">🗓️ ${dateStr}</span>
            `;

            if (decision.participants) {
                html += `<span aria-label="Participants">👥 ${escapeHTML(decision.participants)}</span>`;
            }
            if (decision.category) {
                html += `<span class="tag" aria-label="Category">${escapeHTML(decision.category)}</span>`;
            }

            html += `
                </div>
                <div class="decision-rationale">${escapeHTML(decision.rationale)}</div>
            `;

            card.innerHTML = html;
            decisionsContainer.appendChild(card);
        });
    };

    // Basic HTML escaping to prevent XSS
    const escapeHTML = (str) => {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    };

    // Handle new decision submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const newDecision = {
            id: generateId(),
            title: document.getElementById('title').value.trim(),
            rationale: document.getElementById('rationale').value.trim(),
            participants: document.getElementById('participants').value.trim(),
            category: document.getElementById('category').value.trim(),
            date: new Date().toISOString()
        };

        decisions.push(newDecision);
        saveDecisions();
        renderDecisions();
        
        form.reset();
        
        // Announce to screen readers (optional but good for a11y)
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.className = 'sr-only';
        announcement.textContent = 'Decision saved successfully.';
        document.body.appendChild(announcement);
        setTimeout(() => announcement.remove(), 3000);
    });

    // Delete Decision (Exposed to window for inline onclick)
    window.deleteDecision = (id) => {
        if (confirm('Are you sure you want to delete this decision?')) {
            decisions = decisions.filter(d => d.id !== id);
            saveDecisions();
            renderDecisions();
        }
    };

    // Open Edit Modal (Exposed to window for inline onclick)
    window.openEditModal = (id) => {
        const decision = decisions.find(d => d.id === id);
        if (!decision) return;

        document.getElementById('edit-id').value = decision.id;
        document.getElementById('edit-title').value = decision.title;
        document.getElementById('edit-rationale').value = decision.rationale;
        document.getElementById('edit-participants').value = decision.participants || '';
        document.getElementById('edit-category').value = decision.category || '';

        editModal.showModal();
    };

    // Close Modal
    const closeModal = () => {
        editModal.close();
        editForm.reset();
    };

    btnCloseModal.addEventListener('click', closeModal);
    btnCancelEdit.addEventListener('click', closeModal);

    // Handle Edit Submission
    editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const id = document.getElementById('edit-id').value;
        const index = decisions.findIndex(d => d.id === id);
        
        if (index !== -1) {
            decisions[index] = {
                ...decisions[index],
                title: document.getElementById('edit-title').value.trim(),
                rationale: document.getElementById('edit-rationale').value.trim(),
                participants: document.getElementById('edit-participants').value.trim(),
                category: document.getElementById('edit-category').value.trim(),
                // Keeping the original date
            };
            
            saveDecisions();
            renderDecisions();
            closeModal();
        }
    });

    // Export to JSON
    btnExportJson.addEventListener('click', () => {
        if (decisions.length === 0) return alert('No decisions to export.');
        
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(decisions, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "meeting-decisions.json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });

    // Export to CSV
    btnExportCsv.addEventListener('click', () => {
        if (decisions.length === 0) return alert('No decisions to export.');

        // CSV Header
        const headers = ['Date', 'Title', 'Category', 'Participants', 'Rationale'];
        
        // Escape CSV values
        const escapeCSV = (str) => {
            if (!str) return '""';
            let result = str.replace(/"/g, '""'); // Escape double quotes
            return `"${result}"`; // Wrap in quotes to handle commas and newlines
        };

        const rows = decisions.map(d => {
            return [
                escapeCSV(new Date(d.date).toLocaleString()),
                escapeCSV(d.title),
                escapeCSV(d.category),
                escapeCSV(d.participants),
                escapeCSV(d.rationale)
            ].join(',');
        });

        const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
        
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", encodeURI(csvContent));
        downloadAnchorNode.setAttribute("download", "meeting-decisions.csv");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });

    // Initial render
    renderDecisions();
});

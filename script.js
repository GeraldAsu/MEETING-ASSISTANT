document.addEventListener('DOMContentLoaded', () => {
    // --- Data Definitions ---
    // Replace with your actual team roster.
    const COMPANY_PEOPLE = [
        "Alice Johnson", "Bob Smith", "Charlie Lee", "Diana Prince", 
        "Evan Wright", "Fiona Gallagher", "George Costanza", 
        "Hannah Abbott", "Ian Malcolm", "Julia Roberts"
    ];

    const DEFAULT_CATEGORIES = [
        "Engineering", "Product", "Design", "Hiring", "Process", 
        "Finance", "Marketing", "Sales", "Operations", "Other"
    ];

    const TITLE_TEMPLATES = [
        "Switch to a new UI library", "Adopt [tool] for [process]",
        "Postpone [feature] to next quarter", "Change on-call rotation schedule",
        "Deprecate [old system]", "Hire additional [role]",
        "Change pricing model for [product]", "Migrate to [cloud provider]",
        "Update security policy for [system]", "Launch new marketing campaign",
        "Refactor [module] for performance", "Select vendor for [service]",
        "Cancel [project] due to [reason]", "Standardize on [technology] across teams",
        "Adjust Q4 goals for [department]"
    ];

    const RATIONALE_TEMPLATES = [
        "We chose this because [reason], which outweighs [tradeoff].",
        "After comparing [option A] and [option B], we selected this due to [factor].",
        "This was necessary due to [constraint/deadline/risk].",
        "The team agreed this reduces [risk/cost/complexity] compared to the current approach.",
        "This decision was driven by feedback from [stakeholder/customer].",
        "To align with our company OKRs, we decided to prioritize [initiative].",
        "Given the budget constraints, this provides the best ROI.",
        "This unblocks the [team name] team by resolving [bottleneck]."
    ];

    // Utilities
    const generateId = () => '_' + Math.random().toString(36).substr(2, 9);
    const escapeHTML = (str) => !str ? '' : str.replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t));
    const normalizeString = (str) => str.trim();
    
    // Toast
    const showToast = (message) => {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    };

    // State Migration
    let rawDecisions = JSON.parse(localStorage.getItem('meeting_decisions')) || [];
    let decisions = rawDecisions.map(d => {
        let timestamp = d.timestamp || d.date || new Date().toISOString();
        let participants = Array.isArray(d.participants) ? d.participants : [];
        let category = d.category ? normalizeString(d.category) : "";
        let status = d.status || "Active";
        let supersededBy = d.supersededBy || null;
        let supersedes = d.supersedes || null;
        const { date, ...rest } = d;
        return { ...rest, timestamp, participants, category, status, supersededBy, supersedes };
    });
    localStorage.setItem('meeting_decisions', JSON.stringify(decisions));

    // Participants State for Forms
    let mainParticipants = [];
    let editParticipants = [];
    let supParticipants = [];

    // DOM Elements
    const form = document.getElementById('decision-form');
    const decisionsContainer = document.getElementById('decisions-container');
    const searchInput = document.getElementById('search-input');
    const filterStatus = document.getElementById('filter-status');
    const filterCategory = document.getElementById('filter-category');
    
    const supersedeModal = document.getElementById('supersede-modal');
    const supersedeForm = document.getElementById('supersede-form');
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');

    const saveDecisions = () => localStorage.setItem('meeting_decisions', JSON.stringify(decisions));

    const populateCategories = () => {
        // Collect default plus any historical categories not in default
        const historical = decisions.map(d => d.category).filter(Boolean);
        const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...historical])].sort();
        
        const optionsHtml = allCategories.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');
        
        const catSelects = ['category', 'sup-category', 'edit-category'];
        catSelects.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const current = el.value;
                el.innerHTML = optionsHtml;
                if (current && allCategories.includes(current)) el.value = current;
            }
        });

        // Update category filter
        const currentFilter = filterCategory.value;
        filterCategory.innerHTML = `<option value="All">All Categories</option>` + optionsHtml;
        if (allCategories.includes(currentFilter)) filterCategory.value = currentFilter;
    };

    const validateForm = (formEl, prefix) => {
        let isValid = true;
        let firstInvalid = null;
        
        const titleInput = formEl.querySelector(`[name="title"]`);
        const rationaleInput = formEl.querySelector(`[name="rationale"]`);
        const titleError = document.getElementById(`${prefix}title-error`);
        const rationaleError = document.getElementById(`${prefix}rationale-error`);

        if (!titleInput.value.trim()) {
            titleInput.parentElement.parentElement.classList.add('has-error');
            titleError.textContent = "Title is required.";
            isValid = false;
            if (!firstInvalid) firstInvalid = titleInput;
        } else {
            titleInput.parentElement.parentElement.classList.remove('has-error');
        }

        if (!rationaleInput.value.trim()) {
            rationaleInput.parentElement.parentElement.classList.add('has-error');
            rationaleError.textContent = "Rationale is required.";
            isValid = false;
            if (!firstInvalid) firstInvalid = rationaleInput;
        } else {
            rationaleInput.parentElement.parentElement.classList.remove('has-error');
        }

        if (firstInvalid) firstInvalid.focus();
        return isValid;
    };

    const formatDate = (isoString) => {
        const d = new Date(isoString);
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    };

    window.jumpToDecision = (id) => {
        const el = document.getElementById(`decision-${id}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.focus();
            el.style.transition = 'box-shadow 0.3s';
            el.style.boxShadow = '0 0 0 4px var(--primary-color)';
            setTimeout(() => el.style.boxShadow = 'var(--shadow)', 1500);
        }
    };

    const renderDecisions = () => {
        populateCategories();
        const term = searchInput.value.toLowerCase();
        const statusF = filterStatus.value;
        const catF = filterCategory.value;

        let filtered = decisions.filter(d => {
            if (statusF !== "All" && d.status !== statusF) return false;
            if (catF !== "All" && d.category !== catF) return false;
            if (term) {
                const searchStr = `${d.title} ${d.rationale} ${d.category} ${d.participants.join(' ')}`.toLowerCase();
                if (!searchStr.includes(term)) return false;
            }
            return true;
        });

        filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        decisionsContainer.innerHTML = '';

        if (decisions.length === 0) {
            decisionsContainer.innerHTML = `<div class="empty-state"><p>No decisions recorded yet. Fill out the form to add one.</p></div>`;
            return;
        }
        if (filtered.length === 0) {
            decisionsContainer.innerHTML = `
                <div class="empty-state">
                    <p>No decisions match your filters.</p>
                    <button class="btn btn-secondary" onclick="document.getElementById('search-input').value=''; document.getElementById('filter-status').value='All'; document.getElementById('filter-category').value='All'; document.getElementById('search-input').dispatchEvent(new Event('input'));">Clear filters</button>
                </div>
            `;
            return;
        }

        filtered.forEach(d => {
            const card = document.createElement('article');
            card.className = `decision-card ${d.status === 'Superseded' ? 'superseded' : ''}`;
            card.id = `decision-${d.id}`;
            card.setAttribute('tabindex', '-1');

            let tagsHtml = d.category ? `<span class="tag" aria-label="Category: ${escapeHTML(d.category)}">${escapeHTML(d.category)}</span>` : '';
            d.participants.forEach(p => tagsHtml += `<span class="tag" aria-label="Participant: ${escapeHTML(p)}">👥 ${escapeHTML(p)}</span>`);

            let supersedeLink = '';
            if (d.status === 'Superseded' && d.supersededBy) {
                const newDec = decisions.find(x => x.id === d.supersededBy);
                if (newDec) {
                    supersedeLink = `<button class="superseded-link" onclick="jumpToDecision('${newDec.id}')" aria-label="Jump to new decision">Superseded by: ${escapeHTML(newDec.title)} &rarr;</button>`;
                }
            }

            card.innerHTML = `
                <div class="decision-header">
                    <div class="decision-title-area">
                        <h3 class="decision-title">${escapeHTML(d.title)}</h3>
                        <div class="decision-meta">
                            <span class="status-badge ${d.status === 'Active' ? 'status-active' : 'status-superseded'}" aria-label="Status: ${d.status}">${d.status}</span>
                            <span aria-label="Timestamp: ${formatDate(d.timestamp)}">${formatDate(d.timestamp)}</span>
                        </div>
                    </div>
                    <div class="decision-actions">
                        ${d.status === 'Active' ? `<button class="btn btn-secondary btn-sm" aria-label="Supersede decision" onclick="openSupersede('${d.id}')">Supersede</button>` : ''}
                        <button class="btn btn-secondary btn-sm" aria-label="Edit decision" onclick="openEdit('${d.id}')">Edit</button>
                        <button class="btn btn-danger btn-sm" aria-label="Delete decision" onclick="deleteDecision('${d.id}')">Delete</button>
                    </div>
                </div>
                ${supersedeLink}
                ${tagsHtml ? `<div class="decision-meta">${tagsHtml}</div>` : ''}
                <div class="decision-rationale-container">
                    <div class="decision-rationale rationale-collapsed" id="rat-${d.id}">${escapeHTML(d.rationale)}</div>
                    <button class="btn-toggle-rationale" aria-expanded="false" aria-controls="rat-${d.id}" onclick="toggleRationale('${d.id}', this)">Show more</button>
                </div>
            `;
            decisionsContainer.appendChild(card);

            setTimeout(() => {
                const ratEl = document.getElementById(`rat-${d.id}`);
                if (ratEl && ratEl.scrollHeight <= ratEl.clientHeight + 2) {
                    ratEl.nextElementSibling.style.display = 'none';
                }
            }, 0);
        });
    };

    window.toggleRationale = (id, btn) => {
        const el = document.getElementById(`rat-${id}`);
        if (el.classList.contains('rationale-collapsed')) {
            el.classList.remove('rationale-collapsed');
            btn.textContent = 'Show less';
            btn.setAttribute('aria-expanded', 'true');
        } else {
            el.classList.add('rationale-collapsed');
            btn.textContent = 'Show more';
            btn.setAttribute('aria-expanded', 'false');
        }
    };

    window.deleteDecision = (id) => {
        if (confirm("Delete this decision? This cannot be undone.")) {
            // Clear references
            decisions.forEach(d => {
                if (d.supersededBy === id) d.supersededBy = null;
                if (d.supersedes === id) d.supersedes = null;
            });
            // Remove
            decisions = decisions.filter(d => d.id !== id);
            saveDecisions();
            renderDecisions();
            showToast("Decision deleted.");
        }
    };

    searchInput.addEventListener('input', renderDecisions);
    filterStatus.addEventListener('change', renderDecisions);
    filterCategory.addEventListener('change', renderDecisions);

    // Form submit
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-submit');
        if (!validateForm(form, '')) return;
        
        btn.disabled = true;
        const newDecision = {
            id: generateId(),
            title: form.title.value.trim(),
            rationale: form.rationale.value.trim(),
            participants: [...mainParticipants],
            category: normalizeString(form.category.value),
            timestamp: new Date().toISOString(),
            status: "Active",
            supersededBy: null,
            supersedes: null
        };

        decisions.push(newDecision);
        saveDecisions();
        
        form.reset();
        mainParticipants = [];
        window.dispatchEvent(new Event('mainParticipantsChanged')); // trigger re-render of chips
        
        filterStatus.value = 'All';
        filterCategory.value = 'All';
        searchInput.value = '';
        renderDecisions();
        
        showToast("Decision saved.");
        btn.disabled = false;
    });

    // Edit logic
    window.openEdit = (id) => {
        const d = decisions.find(x => x.id === id);
        if (!d) return;
        document.getElementById('edit-id').value = d.id;
        editForm.title.value = d.title;
        editForm.rationale.value = d.rationale;
        editForm.category.value = d.category;
        
        editParticipants = [...d.participants];
        window.dispatchEvent(new Event('editParticipantsChanged'));
        
        editForm.querySelectorAll('.has-error').forEach(e => e.classList.remove('has-error'));
        editModal.showModal();
    };

    document.getElementById('btn-close-modal').addEventListener('click', () => editModal.close());
    document.getElementById('btn-cancel-edit').addEventListener('click', () => editModal.close());

    editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-submit-edit');
        if (!validateForm(editForm, 'edit-')) return;
        
        btn.disabled = true;
        const id = document.getElementById('edit-id').value;
        const idx = decisions.findIndex(x => x.id === id);
        
        if (idx !== -1) {
            decisions[idx] = {
                ...decisions[idx],
                title: editForm.title.value.trim(),
                rationale: editForm.rationale.value.trim(),
                participants: [...editParticipants],
                category: normalizeString(editForm.category.value)
            };
            saveDecisions();
            renderDecisions();
            editModal.close();
            showToast("Decision updated.");
        }
        btn.disabled = false;
    });

    // Supersede logic
    window.openSupersede = (id) => {
        const d = decisions.find(x => x.id === id);
        if (!d) return;
        document.getElementById('supersede-target-id').value = d.id;
        supersedeForm.title.value = "";
        supersedeForm.rationale.value = "";
        supersedeForm.category.value = d.category;
        
        supParticipants = [...d.participants];
        window.dispatchEvent(new Event('supParticipantsChanged'));
        
        supersedeForm.querySelectorAll('.has-error').forEach(e => e.classList.remove('has-error'));
        supersedeModal.showModal();
    };

    document.getElementById('btn-close-supersede').addEventListener('click', () => supersedeModal.close());
    document.getElementById('btn-cancel-supersede').addEventListener('click', () => supersedeModal.close());

    supersedeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-submit-supersede');
        if (!validateForm(supersedeForm, 'sup-')) return;

        btn.disabled = true;
        const targetId = document.getElementById('supersede-target-id').value;
        const targetIdx = decisions.findIndex(x => x.id === targetId);

        if (targetIdx !== -1) {
            const newId = generateId();
            
            decisions[targetIdx].status = "Superseded";
            decisions[targetIdx].supersededBy = newId;

            const newDecision = {
                id: newId,
                title: supersedeForm.title.value.trim(),
                rationale: supersedeForm.rationale.value.trim(),
                participants: [...supParticipants],
                category: normalizeString(supersedeForm.category.value),
                timestamp: new Date().toISOString(),
                status: "Active",
                supersededBy: null,
                supersedes: targetId
            };

            decisions.push(newDecision);
            saveDecisions();
            
            filterStatus.value = 'All';
            searchInput.value = '';
            renderDecisions();
            
            supersedeModal.close();
            showToast("Decision superseded.");
            
            setTimeout(() => jumpToDecision(newId), 100);
        }
        btn.disabled = false;
    });

    // Exports
    const triggerDownload = (content, filename, type) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    document.getElementById('btn-export-json').addEventListener('click', () => {
        if (!decisions.length) return alert('No decisions to export.');
        triggerDownload(JSON.stringify(decisions, null, 2), "meeting-decisions.json", "application/json");
    });

    document.getElementById('btn-export-csv').addEventListener('click', () => {
        if (!decisions.length) return alert('No decisions to export.');
        const headers = ['ID', 'Timestamp', 'Title', 'Status', 'Category', 'Participants', 'Rationale', 'Supersedes', 'SupersededBy'];
        const escapeCSV = (str) => `"${(str || '').toString().replace(/"/g, '""')}"`;
        
        const rows = decisions.map(d => [
            escapeCSV(d.id),
            escapeCSV(d.timestamp),
            escapeCSV(d.title),
            escapeCSV(d.status),
            escapeCSV(d.category),
            escapeCSV(d.participants.join(', ')),
            escapeCSV(d.rationale),
            escapeCSV(d.supersedes),
            escapeCSV(d.supersededBy)
        ].join(','));

        triggerDownload(headers.join(',') + '\n' + rows.join('\n'), "meeting-decisions.csv", "text/csv");
    });

    // --- Autosuggest Combobox Implementation ---

    const setupCombobox = (inputId, listboxId, getSuggestions, onSelect) => {
        const input = document.getElementById(inputId);
        const listbox = document.getElementById(listboxId);
        if (!input || !listbox) return;

        let activeIndex = -1;
        let currentSuggestions = [];

        const closeListbox = () => {
            listbox.hidden = true;
            input.setAttribute('aria-expanded', 'false');
            input.removeAttribute('aria-activedescendant');
            activeIndex = -1;
        };

        const renderListbox = () => {
            listbox.innerHTML = '';
            if (currentSuggestions.length === 0) {
                closeListbox();
                return;
            }
            
            currentSuggestions.forEach((sug, i) => {
                const li = document.createElement('li');
                li.className = 'suggestion-item';
                li.role = 'option';
                li.id = `${listboxId}-opt-${i}`;
                li.textContent = sug;
                li.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    onSelect(input, sug);
                    closeListbox();
                });
                listbox.appendChild(li);
            });

            listbox.hidden = false;
            input.setAttribute('aria-expanded', 'true');
        };

        const updateSuggestions = () => {
            currentSuggestions = getSuggestions(input.value);
            renderListbox();
        };

        input.addEventListener('focus', updateSuggestions);
        input.addEventListener('input', updateSuggestions);
        input.addEventListener('blur', () => { setTimeout(closeListbox, 150); });

        input.addEventListener('keydown', (e) => {
            if (listbox.hidden) return;
            const options = listbox.querySelectorAll('[role="option"]');
            if (options.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeIndex = (activeIndex + 1) % options.length;
                updateActiveOption(options);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeIndex = (activeIndex - 1 + options.length) % options.length;
                updateActiveOption(options);
            } else if (e.key === 'Enter' && activeIndex >= 0) {
                e.preventDefault();
                onSelect(input, currentSuggestions[activeIndex]);
                closeListbox();
            } else if (e.key === 'Escape') {
                closeListbox();
            }
        });

        const updateActiveOption = (options) => {
            options.forEach((opt, i) => {
                if (i === activeIndex) {
                    opt.setAttribute('aria-selected', 'true');
                    input.setAttribute('aria-activedescendant', opt.id);
                    opt.scrollIntoView({ block: 'nearest' });
                } else {
                    opt.setAttribute('aria-selected', 'false');
                }
            });
        };
    };

    const getTitleSuggestions = (query) => {
        const q = query.toLowerCase();
        const historyTitles = decisions.map(d => d.title);
        const allTitles = [...new Set([...TITLE_TEMPLATES, ...historyTitles])];
        return allTitles.filter(t => t.toLowerCase().includes(q)).slice(0, 15);
    };

    const getRationaleSuggestions = (query) => {
        if (query.trim() === '') return RATIONALE_TEMPLATES;
        return RATIONALE_TEMPLATES.filter(p => p.toLowerCase().includes(query.toLowerCase()));
    };

    const selectTitle = (input, text) => {
        input.value = text;
        input.dispatchEvent(new Event('input'));
    };

    const selectRationale = (input, text) => {
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const val = input.value;
        input.value = val.substring(0, start) + text + val.substring(end);
        input.selectionStart = input.selectionEnd = start + text.length;
        input.dispatchEvent(new Event('input'));
    };

    ['title', 'sup-title', 'edit-title'].forEach(id => setupCombobox(id, `${id}-listbox`, getTitleSuggestions, selectTitle));
    ['rationale', 'sup-rationale', 'edit-rationale'].forEach(id => setupCombobox(id, `${id}-listbox`, getRationaleSuggestions, selectRationale));


    // --- Participant Picker Multi-Select ---
    const setupParticipantPicker = (inputId, listboxId, chipsId, eventName, getSelectedArray, setSelectedArray) => {
        const input = document.getElementById(inputId);
        const listbox = document.getElementById(listboxId);
        const chipsCont = document.getElementById(chipsId);
        if (!input || !listbox || !chipsCont) return;

        let activeIndex = -1;
        let currentSuggestions = [];

        const closeListbox = () => {
            listbox.hidden = true;
            input.setAttribute('aria-expanded', 'false');
            input.removeAttribute('aria-activedescendant');
            activeIndex = -1;
        };

        const renderChips = () => {
            chipsCont.innerHTML = '';
            getSelectedArray().forEach(name => {
                const chip = document.createElement('span');
                chip.className = 'chip';
                chip.innerHTML = `<span>${escapeHTML(name)}</span> <button type="button" aria-label="Remove ${escapeHTML(name)}">&times;</button>`;
                chip.querySelector('button').addEventListener('click', () => {
                    setSelectedArray(getSelectedArray().filter(n => n !== name));
                    renderChips();
                    input.focus();
                });
                chipsCont.appendChild(chip);
            });
        };

        window.addEventListener(eventName, renderChips);

        const renderListbox = () => {
            listbox.innerHTML = '';
            if (currentSuggestions.length === 0) {
                closeListbox();
                return;
            }
            
            currentSuggestions.forEach((sug, i) => {
                const li = document.createElement('li');
                li.className = 'suggestion-item';
                li.role = 'option';
                li.id = `${listboxId}-opt-${i}`;
                
                const isSelected = getSelectedArray().includes(sug);
                li.innerHTML = isSelected ? `<b>✓</b> ${escapeHTML(sug)}` : escapeHTML(sug);
                if (isSelected) li.style.opacity = '0.5';

                li.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    let arr = getSelectedArray();
                    if (arr.includes(sug)) {
                        arr = arr.filter(n => n !== sug);
                    } else {
                        arr.push(sug);
                    }
                    setSelectedArray(arr);
                    renderChips();
                    input.value = '';
                    updateSuggestions(); // Keep open and refresh list
                });
                listbox.appendChild(li);
            });

            listbox.hidden = false;
            input.setAttribute('aria-expanded', 'true');
        };

        const updateSuggestions = () => {
            const query = input.value.toLowerCase().trim();
            currentSuggestions = COMPANY_PEOPLE.filter(p => p.toLowerCase().includes(query));
            renderListbox();
        };

        input.addEventListener('focus', updateSuggestions);
        input.addEventListener('input', updateSuggestions);
        input.addEventListener('blur', () => { setTimeout(closeListbox, 150); });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && input.value === '') {
                const arr = getSelectedArray();
                if (arr.length > 0) {
                    arr.pop();
                    setSelectedArray(arr);
                    renderChips();
                    updateSuggestions();
                }
            }
            if (listbox.hidden) return;
            const options = listbox.querySelectorAll('[role="option"]');
            if (options.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeIndex = (activeIndex + 1) % options.length;
                updateActiveOption(options);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeIndex = (activeIndex - 1 + options.length) % options.length;
                updateActiveOption(options);
            } else if (e.key === 'Enter' && activeIndex >= 0) {
                e.preventDefault();
                const sug = currentSuggestions[activeIndex];
                let arr = getSelectedArray();
                if (arr.includes(sug)) {
                    arr = arr.filter(n => n !== sug);
                } else {
                    arr.push(sug);
                }
                setSelectedArray(arr);
                renderChips();
                input.value = '';
                updateSuggestions();
            } else if (e.key === 'Escape') {
                closeListbox();
            }
        });

        const updateActiveOption = (options) => {
            options.forEach((opt, i) => {
                if (i === activeIndex) {
                    opt.setAttribute('aria-selected', 'true');
                    input.setAttribute('aria-activedescendant', opt.id);
                    opt.scrollIntoView({ block: 'nearest' });
                } else {
                    opt.setAttribute('aria-selected', 'false');
                }
            });
        };

        renderChips();
    };

    setupParticipantPicker('part-input-main', 'part-listbox-main', 'chips-main', 'mainParticipantsChanged', () => mainParticipants, (val) => mainParticipants = val);
    setupParticipantPicker('part-input-edit', 'part-listbox-edit', 'chips-edit', 'editParticipantsChanged', () => editParticipants, (val) => editParticipants = val);
    setupParticipantPicker('part-input-sup', 'part-listbox-sup', 'chips-sup', 'supParticipantsChanged', () => supParticipants, (val) => supParticipants = val);

    // Init display
    filterStatus.value = "Active"; 
    renderDecisions();
});

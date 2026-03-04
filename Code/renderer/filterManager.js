/**
 * filterManager.js
 * Handles extension filter chips, suggestions, and tree filtering.
 */

const filterInput = document.getElementById('filterInput');
const activeFiltersEl = document.getElementById('activeFilters');
const extSuggestionsEl = document.getElementById('extSuggestions');

export const activeExtensions = new Set(); // empty = show all

// displayTree reference injected via setupFilterInput, stored so
// renderFilterChips() can call it with no args — same as the original.
let _displayTree = null;

/**
 * Collect all unique file extensions from a tree
 */
export function collectExtensions(tree, exts = new Set()) {
    for (const node of tree) {
        if (node.type === 'file') {
            const ext = node.name.includes('.') ? node.name.split('.').pop().toLowerCase() : '';
            if (ext) exts.add(ext);
        }
        if (node.children?.length) collectExtensions(node.children, exts);
    }
    return exts;
}

/**
 * Filter tree nodes by active extensions (returns filtered copy)
 */
export function filterTree(tree) {
    if (activeExtensions.size === 0) return tree;

    function filterNode(node) {
        if (node.type === 'file') {
            const ext = node.name.includes('.') ? node.name.split('.').pop().toLowerCase() : '';
            return activeExtensions.has(ext) ? node : null;
        }
        if (node.type === 'folder') {
            const filteredChildren = (node.children || []).map(filterNode).filter(Boolean);
            if (filteredChildren.length === 0) return null;
            return { ...node, children: filteredChildren };
        }
        return node;
    }

    return tree.map(filterNode).filter(Boolean);
}

export function renderFilterChips() {
    activeFiltersEl.innerHTML = '';

    activeExtensions.forEach(ext => {
        const chip = document.createElement('div');
        chip.className = 'filter-chip active';
        chip.innerHTML = `<span>.${ext}</span><button class="chip-remove" data-ext="${ext}">✕</button>`;
        chip.querySelector('.chip-remove').addEventListener('click', () => {
            activeExtensions.delete(ext);
            renderFilterChips();
            _displayTree();
        });
        activeFiltersEl.appendChild(chip);
    });

    if (activeExtensions.size > 0) {
        const clearChip = document.createElement('div');
        clearChip.className = 'filter-chip clear-all';
        clearChip.textContent = 'Clear filters';
        clearChip.addEventListener('click', () => {
            activeExtensions.clear();
            renderFilterChips();
            _displayTree();
        });
        activeFiltersEl.appendChild(clearChip);
    }
}

function showExtSuggestions(allExts, query) {
    const filtered = allExts.filter(e => e.includes(query) && !activeExtensions.has(e));
    extSuggestionsEl.innerHTML = '';
    if (!filtered.length) { extSuggestionsEl.style.display = 'none'; return; }

    filtered.slice(0, 8).forEach(ext => {
        const li = document.createElement('li');
        li.textContent = `.${ext}`;
        li.addEventListener('click', () => {
            activeExtensions.add(ext);
            filterInput.value = '';
            hideExtSuggestions();
            renderFilterChips();
            _displayTree();
        });
        extSuggestionsEl.appendChild(li);
    });
    extSuggestionsEl.style.display = 'block';
}

function hideExtSuggestions() {
    extSuggestionsEl.style.display = 'none';
}

export function setupFilterInput(getCachedTree, displayTree) {
    _displayTree = displayTree;

    filterInput.addEventListener('focus', () => {
        if (!getCachedTree()) return;
        const allExts = [...collectExtensions(getCachedTree())].sort();
        showExtSuggestions(allExts, filterInput.value.trim());
    });

    filterInput.addEventListener('input', () => {
        if (!getCachedTree()) return;
        const allExts = [...collectExtensions(getCachedTree())].sort();
        showExtSuggestions(allExts, filterInput.value.trim().toLowerCase());
    });

    filterInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const val = filterInput.value.trim().replace(/^\./, '').toLowerCase();
            if (val) {
                activeExtensions.add(val);
                filterInput.value = '';
                hideExtSuggestions();
                renderFilterChips();
                _displayTree();
            }
        }
        if (e.key === 'Escape') hideExtSuggestions();
    });

    filterInput.addEventListener('blur', () => {
        setTimeout(hideExtSuggestions, 200);
    });
}
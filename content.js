

class FloatingDiffChecker {
    constructor() {
        this.floatingWindow = null;
        this.isPinned = false;
        this.init();
    }

    init() {
        // Check if we should create floating window
        chrome.storage.local.get(['pinnedState'], (result) => {
            if (result.pinnedState && result.pinnedState.timestamp > Date.now() - 1000) {
                this.createFloatingWindow(result.pinnedState);
            }
        });
    }

    createFloatingWindow(pinnedState = null) {
        if (this.floatingWindow) {
            this.floatingWindow.remove();
        }

        this.floatingWindow = document.createElement('div');
        this.floatingWindow.id = 'diff-checker-floating';
        this.floatingWindow.innerHTML = `
            <div class="diff-checker-popup">
                <div class="popup-header">
                    <h3>Diff Checker Pro</h3>
                    <button class="close-btn" title="Close">✕</button>
                </div>
                <div class="popup-content">
                    <div class="text-inputs">
                        <div class="input-group">
                            <label>Old Text</label>
                            <textarea id="floating-oldText" placeholder="Paste or select text..."></textarea>
                        </div>
                        <div class="input-group">
                            <label>New Text</label>
                            <textarea id="floating-newText" placeholder="Paste or select text..."></textarea>
                        </div>
                    </div>
                    <div class="popup-actions">
                        <button class="compare-btn">Compare</button>
                        <button class="clear-btn">Clear</button>
                        <button class="save-btn">Save to History</button>
                    </div>
                    <div id="floating-diffResult" class="diff-result hidden">
                        <div class="diff-stats">
                            <span class="added-count">0 additions</span>
                            <span class="removed-count">0 removals</span>
                        </div>
                        <div class="diff-content"></div>
                    </div>
                    <div class="history-section">
                        <h3>Recent Comparisons</h3>
                        <div id="floating-historyList" class="history-list"></div>
                    </div>
                </div>
            </div>
        `;

        this.addStyles();
        document.body.appendChild(this.floatingWindow);
        this.attachEventListeners();
        
        // Load initial data
        if (pinnedState) {
            document.getElementById('floating-oldText').value = pinnedState.oldText || '';
            document.getElementById('floating-newText').value = pinnedState.newText || '';
        } else {
            this.loadStoredTexts();
        }
        
        this.loadHistory();
        this.makeDraggable();
    }

    addStyles() {
        if (document.getElementById('diff-checker-styles')) return;

        const style = document.createElement('style');
        style.id = 'diff-checker-styles';
        style.textContent = `
            #diff-checker-floating {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 450px;
                max-height: 600px;
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .diff-checker-popup {
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                overflow: hidden;
                border: 1px solid #e1e5e9;
            }

            .popup-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 12px 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
            }

            .popup-header h3 {
                margin: 0;
                font-size: 14px;
                font-weight: 600;
            }

            .close-btn {
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
            }

            .close-btn:hover {
                background: rgba(255, 255, 255, 0.2);
            }

            .popup-content {
                padding: 16px;
                max-height: 550px;
                overflow-y: auto;
            }

            .text-inputs {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
                margin-bottom: 12px;
            }

            .input-group {
                display: flex;
                flex-direction: column;
            }

            .input-group label {
                font-size: 11px;
                font-weight: 600;
                color: #666;
                margin-bottom: 4px;
                text-transform: uppercase;
            }

            .input-group textarea {
                border: 1px solid #e1e5e9;
                border-radius: 6px;
                padding: 8px;
                font-size: 12px;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                resize: vertical;
                min-height: 80px;
            }

            .input-group textarea:focus {
                outline: none;
                border-color: #667eea;
            }

            .popup-actions {
                display: flex;
                gap: 8px;
                margin-bottom: 12px;
            }

            .popup-actions button {
                padding: 8px 12px;
                border: none;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                flex: 1;
            }

            .compare-btn {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }

            .clear-btn, .save-btn {
                background: #f8f9fa;
                color: #666;
                border: 1px solid #e1e5e9;
            }

            .popup-actions button:hover {
                opacity: 0.8;
            }

            .diff-result.hidden {
                display: none;
            }

            .diff-result {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 12px;
            }

            .diff-stats {
                display: flex;
                gap: 12px;
                margin-bottom: 8px;
                font-size: 11px;
            }

            .added-count {
                background: #d4edda;
                color: #155724;
                padding: 2px 6px;
                border-radius: 4px;
            }

            .removed-count {
                background: #f8d7da;
                color: #721c24;
                padding: 2px 6px;
                border-radius: 4px;
            }

            .diff-content {
                background: white;
                border: 1px solid #e1e5e9;
                border-radius: 6px;
                padding: 8px;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                font-size: 11px;
                line-height: 1.3;
                max-height: 150px;
                overflow-y: auto;
            }

            .diff-line {
                white-space: pre-wrap;
                word-break: break-word;
                padding: 1px 0;
                display: block;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            }

            .diff-line.added {
                background: #d4edda;
                color: #155724;
                border-left: 2px solid #28a745;
                padding-left: 4px;
            }

            .diff-line.removed {
                background: #f8d7da;
                color: #721c24;
                border-left: 2px solid #dc3545;
                padding-left: 4px;
            }

            .diff-line.modified {
                background: #fff3cd;
                color: #856404;
                border-left: 2px solid #ffc107;
                padding-left: 4px;
            }

            .diff-line.unchanged {
                color: #666;
            }

            .added-char {
                background: #d4edda;
                color: #155724;
                padding: 1px;
                border-radius: 2px;
            }

            .removed-char {
                background: #f8d7da;
                color: #721c24;
                padding: 1px;
                border-radius: 2px;
                text-decoration: line-through;
            }

            .history-section {
                background: #f8f9fa;
                padding: 12px;
                border-radius: 8px;
            }

            .history-section h3 {
                font-size: 12px;
                font-weight: 600;
                margin: 0 0 8px 0;
                color: #333;
            }

            .history-list {
                max-height: 120px;
                overflow-y: auto;
            }

            .history-item {
                background: white;
                border: 1px solid #e1e5e9;
                border-radius: 6px;
                padding: 8px;
                margin-bottom: 6px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .history-item:hover {
                border-color: #667eea;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }

            .history-item-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 4px;
            }

            .delete-btn {
                background: none;
                border: none;
                cursor: pointer;
                font-size: 12px;
                padding: 2px;
                border-radius: 4px;
                transition: all 0.2s;
            }

            .delete-btn:hover {
                background: #f8d7da;
                transform: scale(1.1);
            }

            .history-item-preview {
                font-size: 11px;
                color: #666;
                display: flex;
                gap: 6px;
            }

            .history-preview {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                max-width: 160px;
            }

            .empty-history {
                text-align: center;
                color: #999;
                font-size: 11px;
                padding: 12px;
            }
        `;
        document.head.appendChild(style);
    }

    attachEventListeners() {
        const closeBtn = this.floatingWindow.querySelector('.close-btn');
        const compareBtn = this.floatingWindow.querySelector('.compare-btn');
        const clearBtn = this.floatingWindow.querySelector('.clear-btn');
        const saveBtn = this.floatingWindow.querySelector('.save-btn');

        closeBtn.addEventListener('click', () => this.closeFloatingWindow());
        compareBtn.addEventListener('click', () => this.compareFloatingTexts());
        clearBtn.addEventListener('click', () => this.clearFloatingTexts());
        saveBtn.addEventListener('click', () => this.saveToHistory());

        // Auto-save on input
        const oldTextEl = document.getElementById('floating-oldText');
        const newTextEl = document.getElementById('floating-newText');
        oldTextEl.addEventListener('input', () => this.saveToStorage());
        newTextEl.addEventListener('input', () => this.saveToStorage());
    }

    makeDraggable() {
        const header = this.floatingWindow.querySelector('.popup-header');
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        header.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);

        function dragStart(e) {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;

            if (e.target === header) {
                isDragging = true;
            }
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                xOffset = currentX;
                yOffset = currentY;

                const popup = document.getElementById('diff-checker-floating');
                popup.style.transform = `translate(${currentX}px, ${currentY}px)`;
            }
        }

        function dragEnd() {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
        }
    }

    async loadStoredTexts() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'getDiff' });
            if (response.oldText) document.getElementById('floating-oldText').value = response.oldText;
            if (response.newText) document.getElementById('floating-newText').value = response.newText;
        } catch (error) {
            console.error('Error loading stored texts:', error);
        }
    }

    async saveToStorage() {
        try {
            const oldText = document.getElementById('floating-oldText').value;
            const newText = document.getElementById('floating-newText').value;
            await chrome.storage.local.set({ oldText, newText });
        } catch (error) {
            console.error('Error saving to storage:', error);
        }
    }

    async loadHistory() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'getHistory' });
            this.renderHistory(response.history || []);
        } catch (error) {
            console.error('Error loading history:', error);
        }
    }

    renderHistory(history) {
        const historyList = document.getElementById('floating-historyList');
        if (history.length === 0) {
            historyList.innerHTML = '<div class="empty-history">No comparison history yet</div>';
            return;
        }

        historyList.innerHTML = history.map(item => `
            <div class="history-item" data-id="${item.id}">
                <div class="history-item-header">
                    <span>${this.formatDateTime(item.timestamp)}</span>
                    <button class="delete-btn" data-id="${item.id}" title="Delete">🗑️</button>
                </div>
                <div class="history-item-preview">
                    <div class="history-preview">Old: ${this.truncateText(item.oldText)}</div>
                    <div class="history-preview">New: ${this.truncateText(item.newText)}</div>
                </div>
            </div>
        `).join('');

        // Add click handlers
        historyList.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-btn')) return;
                
                const id = parseInt(item.dataset.id);
                const historyItem = history.find(h => h.id === id);
                if (historyItem) {
                    document.getElementById('floating-oldText').value = historyItem.oldText;
                    document.getElementById('floating-newText').value = historyItem.newText;
                    this.saveToStorage();
                }
            });
        });

        historyList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.id);
                this.deleteFromHistory(id);
            });
        });
    }

    formatDateTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
        
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    truncateText(text, maxLength = 25) {
        if (!text) return 'Empty';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    async deleteFromHistory(id) {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'getHistory' });
            const history = response.history || [];
            const updatedHistory = history.filter(item => item.id !== id);
            
            await chrome.storage.local.set({ history: updatedHistory });
            this.loadHistory();
        } catch (error) {
            console.error('Error deleting from history:', error);
        }
    }

    compareFloatingTexts() {
        const oldText = document.getElementById('floating-oldText').value;
        const newText = document.getElementById('floating-newText').value;

        if (!oldText && !newText) return;

        const diff = this.calculateDiff(oldText, newText);
        this.renderDiff(diff);
    }

    calculateDiff(oldText, newText) {
        const oldLines = oldText.split('\n');
        const newLines = newText.split('\n');
        
        const matrix = this.createLCSMatrix(oldLines, newLines);
        const lcs = this.extractLCS(oldLines, newLines, matrix);
        
        return this.createInlineDiffResult(oldLines, newLines, lcs);
    }

    createLCSMatrix(oldLines, newLines) {
        const matrix = Array(oldLines.length + 1).fill(null).map(() => 
            Array(newLines.length + 1).fill(0)
        );

        for (let i = 1; i <= oldLines.length; i++) {
            for (let j = 1; j <= newLines.length; j++) {
                if (oldLines[i - 1] === newLines[j - 1]) {
                    matrix[i][j] = matrix[i - 1][j - 1] + 1;
                } else {
                    matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
                }
            }
        }

        return matrix;
    }

    extractLCS(oldLines, newLines, matrix) {
        const lcs = [];
        let i = oldLines.length;
        let j = newLines.length;

        while (i > 0 && j > 0) {
            if (oldLines[i - 1] === newLines[j - 1]) {
                lcs.unshift(oldLines[i - 1]);
                i--;
                j--;
            } else if (matrix[i - 1][j] > matrix[i][j - 1]) {
                i--;
            } else {
                j--;
            }
        }

        return lcs;
    }

    createInlineDiffResult(oldLines, newLines, lcs) {
        const result = [];
        let oldIndex = 0;
        let newIndex = 0;
        let lcsIndex = 0;

        while (oldIndex < oldLines.length || newIndex < newLines.length) {
            if (lcsIndex < lcs.length && 
                oldIndex < oldLines.length && 
                newIndex < newLines.length && 
                oldLines[oldIndex] === newLines[newIndex] && 
                newLines[newIndex] === lcs[lcsIndex]) {
                
                result.push({
                    type: 'unchanged',
                    content: oldLines[oldIndex]
                });
                oldIndex++;
                newIndex++;
                lcsIndex++;
            } else {
                while (oldIndex < oldLines.length && 
                       (lcsIndex >= lcs.length || oldLines[oldIndex] !== lcs[lcsIndex])) {
                    
                    let bestMatch = null;
                    let bestMatchIndex = -1;
                    let bestSimilarity = 0;
                    
                    for (let i = newIndex; i < newLines.length; i++) {
                        const similarity = this.calculateSimilarity(oldLines[oldIndex], newLines[i]);
                        if (similarity > bestSimilarity && similarity > 0.3) {
                            bestSimilarity = similarity;
                            bestMatch = newLines[i];
                            bestMatchIndex = i;
                        }
                    }
                    
                    if (bestMatch) {
                        const inlineDiff = this.createInlineCharacterDiff(oldLines[oldIndex], bestMatch);
                        result.push({
                            type: 'modified',
                            content: inlineDiff
                        });
                        
                        for (let i = newIndex; i <= bestMatchIndex; i++) {
                            if (i < newLines.length && newLines[i] !== bestMatch) {
                                result.push({
                                    type: 'added',
                                    content: newLines[i]
                                });
                            }
                        }
                        newIndex = bestMatchIndex + 1;
                    } else {
                        result.push({
                            type: 'removed',
                            content: oldLines[oldIndex]
                        });
                    }
                    oldIndex++;
                }

                while (newIndex < newLines.length && 
                       (lcsIndex >= lcs.length || newLines[newIndex] !== lcs[lcsIndex])) {
                    result.push({
                        type: 'added',
                        content: newLines[newIndex]
                    });
                    newIndex++;
                }
            }
        }

        return result;
    }

    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }
    
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    createInlineCharacterDiff(oldLine, newLine) {
        const oldChars = oldLine.split('');
        const newChars = newLine.split('');
        
        const matrix = this.createLCSMatrix(oldChars, newChars);
        const lcs = this.extractLCS(oldChars, newChars, matrix);
        
        let result = '';
        let oldIndex = 0;
        let newIndex = 0;
        let lcsIndex = 0;
        
        while (oldIndex < oldChars.length || newIndex < newChars.length) {
            if (lcsIndex < lcs.length && 
                oldIndex < oldChars.length && 
                newIndex < newChars.length && 
                oldChars[oldIndex] === newChars[newIndex] && 
                newChars[newIndex] === lcs[lcsIndex]) {
                
                result += this.escapeHtml(oldChars[oldIndex]);
                oldIndex++;
                newIndex++;
                lcsIndex++;
            } else {
                while (oldIndex < oldChars.length && 
                       (lcsIndex >= lcs.length || oldChars[oldIndex] !== lcs[lcsIndex])) {
                    result += `<span class="removed-char">${this.escapeHtml(oldChars[oldIndex])}</span>`;
                    oldIndex++;
                }
                
                while (newIndex < newChars.length && 
                       (lcsIndex >= lcs.length || newChars[newIndex] !== lcs[lcsIndex])) {
                    result += `<span class="added-char">${this.escapeHtml(newChars[newIndex])}</span>`;
                    newIndex++;
                }
            }
        }
        
        return result;
    }

    renderDiff(diff) {
        const diffResult = document.getElementById('floating-diffResult');
        const diffContent = diffResult.querySelector('.diff-content');
        const addedCount = diffResult.querySelector('.added-count');
        const removedCount = diffResult.querySelector('.removed-count');
        
        diffResult.classList.remove('hidden');
        
        let additions = 0;
        let removals = 0;
        let html = '';

        diff.forEach(item => {
            if (item.type === 'added') {
                additions++;
                html += `<div class="diff-line added">+${this.escapeHtml(item.content)}</div>`;
            } else if (item.type === 'removed') {
                removals++;
                html += `<div class="diff-line removed">-${this.escapeHtml(item.content)}</div>`;
            } else if (item.type === 'modified') {
                const addedMatches = item.content.match(/<span class="added-char">(.*?)<\/span>/g);
                const removedMatches = item.content.match(/<span class="removed-char">(.*?)<\/span>/g);
                
                if (addedMatches) additions += addedMatches.length;
                if (removedMatches) removals += removedMatches.length;
                
                html += `<div class="diff-line modified">±${item.content}</div>`;
            } else {
                html += `<div class="diff-line unchanged"> ${this.escapeHtml(item.content)}</div>`;
            }
        });

        diffContent.innerHTML = html;
        addedCount.textContent = `${additions} additions`;
        removedCount.textContent = `${removals} removals`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    clearFloatingTexts() {
        document.getElementById('floating-oldText').value = '';
        document.getElementById('floating-newText').value = '';
        document.getElementById('floating-diffResult').classList.add('hidden');
        this.saveToStorage();
    }

    async saveToHistory() {
        const oldText = document.getElementById('floating-oldText').value;
        const newText = document.getElementById('floating-newText').value;

        if (!oldText && !newText) return;

        try {
            await chrome.runtime.sendMessage({
                action: 'saveToHistory',
                oldText: oldText,
                newText: newText
            });
            
            this.loadHistory();
        } catch (error) {
            console.error('Error saving to history:', error);
        }
    }

    closeFloatingWindow() {
        if (this.floatingWindow) {
            this.floatingWindow.remove();
            this.floatingWindow = null;
        }
    }
}

// Initialize only once
if (!window.diffCheckerFloating) {
    window.diffCheckerFloating = new FloatingDiffChecker();
}

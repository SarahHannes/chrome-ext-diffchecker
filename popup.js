


class DiffChecker {

    
    constructor() {
        this.initializeElements();
        this.attachEventListeners();
        this.loadStoredTexts();
        this.loadHistory();
    }

    initializeElements() {
        this.oldTextEl = document.getElementById('oldText');
        this.newTextEl = document.getElementById('newText');
        this.compareBtn = document.getElementById('compareBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.saveBtn = document.getElementById('saveBtn');
        this.closeBtn = document.getElementById('closeBtn');
        this.diffResult = document.getElementById('diffResult');
        this.diffContent = document.getElementById('diffContent');
        this.addedCount = document.getElementById('addedCount');
        this.removedCount = document.getElementById('removedCount');
        this.historyList = document.getElementById('historyList');
    }

    attachEventListeners() {
        this.compareBtn.addEventListener('click', () => this.compareTexts());
        this.clearBtn.addEventListener('click', () => this.clearTexts());
        this.saveBtn.addEventListener('click', () => this.saveToHistory());
        this.closeBtn.addEventListener('click', () => window.close());
        
        this.oldTextEl.addEventListener('input', () => this.saveToStorage());
        this.newTextEl.addEventListener('input', () => this.saveToStorage());
    }

    async loadStoredTexts() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'getDiff' });
            if (response.oldText) this.oldTextEl.value = response.oldText;
            if (response.newText) this.newTextEl.value = response.newText;
        } catch (error) {
            console.error('Error loading stored texts:', error);
        }
    }

    async saveToStorage() {
        try {
            await chrome.storage.local.set({
                oldText: this.oldTextEl.value,
                newText: this.newTextEl.value
            });
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
        if (history.length === 0) {
            this.historyList.innerHTML = '<div class="empty-history">No comparison history yet</div>';
            return;
        }

        this.historyList.innerHTML = history.map(item => `
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

        // Add click handlers for history items
        this.historyList.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't trigger if clicking on delete button
                if (e.target.classList.contains('delete-btn')) return;
                
                const id = parseInt(item.dataset.id);
                const historyItem = history.find(h => h.id === id);
                if (historyItem) {
                    this.oldTextEl.value = historyItem.oldText;
                    this.newTextEl.value = historyItem.newText;
                    this.saveToStorage();
                }
            });
        });

        // Add click handlers for delete buttons
        this.historyList.querySelectorAll('.delete-btn').forEach(btn => {
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
        
        // For older items, show actual date
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
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

    truncateText(text, maxLength = 30) {
        if (!text) return 'Empty';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    compareTexts() {
        const oldText = this.oldTextEl.value;
        const newText = this.newTextEl.value;

        if (!oldText && !newText) {
            return;
        }

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
                // Handle removed lines
                while (oldIndex < oldLines.length && 
                       (lcsIndex >= lcs.length || oldLines[oldIndex] !== lcs[lcsIndex])) {
                    
                    // Check if there's a similar line in new text for inline diff
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
                        // Show inline diff
                        const inlineDiff = this.createInlineCharacterDiff(oldLines[oldIndex], bestMatch);
                        result.push({
                            type: 'modified',
                            content: inlineDiff
                        });
                        
                        // Skip the matched line in new text
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

                // Handle added lines
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

    splitIntoUnicodeChars(text) {
        // Use spread operator to properly handle Unicode characters including emojis
        return [...text];
    }
    
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }
    
    levenshteinDistance(str1, str2) {
        const chars1 = this.splitIntoUnicodeChars(str1);
        const chars2 = this.splitIntoUnicodeChars(str2);
        const matrix = [];
        
        for (let i = 0; i <= chars2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= chars1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= chars2.length; i++) {
            for (let j = 1; j <= chars1.length; j++) {
                if (chars2[i - 1] === chars1[j - 1]) {
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
        
        return matrix[chars2.length][chars1.length];
    }
    
    createInlineCharacterDiff(oldLine, newLine) {
        const oldChars = this.splitIntoUnicodeChars(oldLine);
        const newChars = this.splitIntoUnicodeChars(newLine);
        
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
        this.diffResult.classList.remove('hidden');
        
        let addedCount = 0;
        let removedCount = 0;
        let html = '';

        diff.forEach(item => {
            if (item.type === 'added') {
                addedCount++;
                html += `<div class="diff-line added">+${this.escapeHtml(item.content)}</div>`;
            } else if (item.type === 'removed') {
                removedCount++;
                html += `<div class="diff-line removed">-${this.escapeHtml(item.content)}</div>`;
            } else if (item.type === 'modified') {
                // Count characters in modified lines
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = item.content;
                const text = tempDiv.textContent;
                
                // Count added and removed characters from inline diff
                const addedMatches = item.content.match(/<span class="added-char">(.*?)<\/span>/g);
                const removedMatches = item.content.match(/<span class="removed-char">(.*?)<\/span>/g);
                
                if (addedMatches) addedCount += addedMatches.length;
                if (removedMatches) removedCount += removedMatches.length;
                
                html += `<div class="diff-line modified">±${item.content}</div>`;
            } else {
                html += `<div class="diff-line unchanged"> ${this.escapeHtml(item.content)}</div>`;
            }
        });

        this.diffContent.innerHTML = html;
        this.addedCount.textContent = `${addedCount} additions`;
        this.removedCount.textContent = `${removedCount} removals`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    clearTexts() {
        this.oldTextEl.value = '';
        this.newTextEl.value = '';
        this.diffResult.classList.add('hidden');
        this.saveToStorage();
    }

    async saveToHistory() {
        const oldText = this.oldTextEl.value;
        const newText = this.newTextEl.value;

        if (!oldText && !newText) {
            return;
        }

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
}

document.addEventListener('DOMContentLoaded', () => {
    
        
    new DiffChecker();
});



chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'diff-checker-old',
    title: 'Diff Checker (Old Text)',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'diff-checker-new',
    title: 'Diff Checker (New Text)',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const selectedText = info.selectionText;
  const action = info.menuItemId;
  
  chrome.storage.local.get(['oldText', 'newText'], (result) => {
    let data = { ...result };
    
    if (action === 'diff-checker-old') {
      data.oldText = selectedText;
    } else if (action === 'diff-checker-new') {
      data.newText = selectedText;
    }
    
    chrome.storage.local.set(data, () => {
      chrome.action.openPopup();
    });
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getDiff') {
    chrome.storage.local.get(['oldText', 'newText'], (result) => {
      sendResponse(result);
    });
    return true;
  }
  
  if (request.action === 'saveToHistory') {
    chrome.storage.local.get(['history'], (result) => {
      const history = result.history || [];
      const newEntry = {
        id: Date.now(),
        oldText: request.oldText,
        newText: request.newText,
        timestamp: new Date().toISOString()
      };
      
      history.unshift(newEntry);
      if (history.length > 7) {
        history.pop();
      }
      
      chrome.storage.local.set({ history: history }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }
  
  if (request.action === 'getHistory') {
    chrome.storage.local.get(['history'], (result) => {
      sendResponse({ history: result.history || [] });
    });
    return true;
  }
  
  if (request.action === 'keepPopupOpen') {
    // This prevents the popup from closing when clicking outside
    chrome.action.openPopup();
    return true;
  }
});

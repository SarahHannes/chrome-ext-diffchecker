# ☑️ Diff Checker Pro - Chrome Extension

A professional text comparison tool with character-level diff support and history tracking for Chrome.

## Features

- **Context Menu Integration**: Right-click on any text to send it to Diff Checker as "Old Text" or "New Text"
- **Modern UI**: Clean, gradient-based design with smooth animations
- **Character-Level Diff**: Supports all languages including Japanese, Chinese, and Korean
- **History Tracking**: Stores last 7 comparisons in browser local storage
- **Floating Popup**: Pin the diff checker to any webpage for continuous use
- **Real-time Comparison**: Instant diff highlighting with additions/removals count

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension will appear in your toolbar


## Test Cases

### Basic Functionality
1. **Empty Text Comparison**
   - Old: "" (empty)
   - New: "" (empty)
   - Expected: No differences shown

2. **Simple Text Addition**
   - Old: "Hello"
   - New: "Hello World"
   - Expected: " World" highlighted as added

3. **Simple Text Removal**
   - Old: "Hello World"
   - New: "Hello"
   - Expected: " World" highlighted as removed

4. **Text Replacement**
   - Old: "Hello World"
   - New: "Hi Universe"
   - Expected: "Hello" removed, "Hi" added, "World" removed, "Universe" added

### Character-Level Support
5. **Japanese Characters**
   - Old: "こんにちは世界"
   - New: "こんにちは世界！"
   - Expected: "！" highlighted as added

6. **Chinese Characters**
   - Old: "你好世界"
   - New: "你好世界！"
   - Expected: "！" highlighted as added

7. **Korean Characters**
   - Old: "안녕하세요 세계"
   - New: "안녕하세요 월드"
   - Expected: "세계" removed, "월드" added

### Edge Cases
8. **Whitespace Differences**
   - Old: "Hello World"
   - New: "Hello   World" (multiple spaces)
   - Expected: Extra spaces highlighted

9. **Line Breaks**
   - Old: "Line1\nLine2"
   - New: "Line1\n\nLine2" (extra line break)
   - Expected: Extra line break highlighted

10. **Special Characters**
    - Old: "Hello@world.com"
    - New: "Hello+world.com"
    - Expected: "@" removed, "+" added

11. **Unicode Emojis**
    - Old: "Hello 👋"
    - New: "Hello 🌟"
    - Expected: "👋" removed, "🌟" added

12. **Mixed Content**
    - Old: "Price: $19.99 🇺🇸"
    - New: "Price: €19.99 🇪🇺"
    - Expected: "$" removed, "€" added, "🇺🇸" removed, "🇪🇺" added

### Performance Testing
13. **Large Text Comparison**
    - Old: 10,000 character text
    - New: 10,000 character text with minor changes
    - Expected: Comparison completes within 2 seconds

14. **History Management**
    - Create 8 different comparisons
    - Expected: Only last 7 saved, oldest removed

## Technical Implementation

### Architecture
- **Manifest V3**: Latest Chrome extension standards
- **Service Worker**: Background script for context menus and storage
- **Local Storage**: History persistence (browser-based, not extension)

### Diff Algorithm
- **Longest Common Subsequence (LCS)**: Character-level comparison
- **Unicode Support**: Proper handling of multi-byte characters
- **Performance**: Optimized for texts up to 10,000 characters

### Storage Strategy
- **Active Text**: Current old/new text in chrome.storage.local
- **History**: Last 7 comparisons with timestamps
- **Privacy**: All data stored locally, no external servers

## Development

### File Structure
```
diff-checker-pro/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for context menus
├── popup.html            # Extension popup UI
├── popup.css             # Popup styling
├── popup.js              # Popup functionality
├── content.js            # Floating popup logic
├── screenshots/          # Demo screenshots
├── icons/                # Extension icons
└── README.md             # This file
```

### Building for Production
1. Test all functionality in Chrome Developer Mode
2. Verify performance with large texts
3. Test character-level diff with various languages
4. Validate history management
5. Prepare screenshots for Chrome Web Store
6. Create compelling store listing with pricing

## License

Commercial - One-time purchase required for continued use.

## Support

For issues or feature requests, please contact through the Chrome Web Store.

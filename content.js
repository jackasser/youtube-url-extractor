// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getURLs") {
    const urls = extractVideoURLs();
    sendResponse({ urls: urls });
  }
});

function extractVideoURLs() {
  const videoMap = new Map();

  // Specific selectors for Video Item Components
  const itemSelectors = [
    'ytd-rich-item-renderer',      // Channel Videos (Grid view)
    'ytd-video-renderer',          // Search Results
    'ytd-grid-video-renderer',     // Old Grid layouts
    'ytd-playlist-video-renderer', // Playlist items
    'ytd-compact-video-renderer'   // Sidebar suggestions
  ];

  const items = document.querySelectorAll(itemSelectors.join(','));

  items.forEach(item => {
    // Title and Link
    const link = item.querySelector('a#video-title-link, a#video-title');

    if (link && link.href) {
      try {
        const urlObj = new URL(link.href);
        if (urlObj.searchParams.has('v')) {
          const videoId = urlObj.searchParams.get('v');
          const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;

          // Avoid duplicates
          if (!videoMap.has(cleanUrl)) {
            // Extract Title
            const title = link.getAttribute('title') || link.innerText.trim();

            // Construct Thumbnail URL (safer than scraping img src which might be lazy-loaded)
            // mqdefault (320x180) is usually available and good enough for list
            const thumbnail = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;

            // Extract Date
            // Usually in #metadata-line span. often the second span, but sometimes different.
            // We'll grab the last span which usually has the date (e.g. "1 day ago", "2 years ago")
            // Or combine them.
            let dateText = "";
            const metadataLine = item.querySelector('#metadata-line, .ytd-video-meta-block');
            if (metadataLine) {
              const spans = metadataLine.querySelectorAll('span.ytd-video-meta-block');
              if (spans.length >= 2) {
                // Usually index 1 is date (index 0 is views)
                dateText = spans[1].innerText;
              } else if (spans.length === 1) {
                // Sometimes only date or only views?
                // Let's check text content to guess? 
                // Or just grab all text
                dateText = spans[0].innerText; // Fallback
              }

              // If spans are not found with class (sometimes just span inline-block)
              if (!dateText && metadataLine.children.length > 0) {
                // Fallback to text content of spans
                const allSpans = metadataLine.querySelectorAll('span');
                if (allSpans.length >= 2) {
                  dateText = allSpans[1].innerText;
                }
              }
            }

            videoMap.set(cleanUrl, {
              url: cleanUrl,
              title: title,
              thumbnail: thumbnail,
              date: dateText
            });
          }
        }
      } catch (e) {
        console.error("Invalid URL:", link.href);
      }
    }
  });

  return Array.from(videoMap.values());
}

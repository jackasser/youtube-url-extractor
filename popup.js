document.addEventListener('DOMContentLoaded', () => {
    const statusDiv = document.getElementById('status');
    const urlList = document.getElementById('urlList');
    const copyBtn = document.getElementById('copyBtn');
    const selectAllBtn = document.getElementById('selectAllBtn');
    const deselectAllBtn = document.getElementById('deselectAllBtn');

    let allVideos = [];

    // Render list items
    function renderList(videos) {
        urlList.innerHTML = '';
        if (videos.length === 0) {
            urlList.innerHTML = '<li class="empty-message">No videos found. Try scrolling the page.</li>';
            statusDiv.textContent = '0 videos found';
            updateButtonState();
            return;
        }

        videos.forEach((video, index) => {
            const li = document.createElement('li');
            li.className = 'video-item';

            // Checkbox
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'video-checkbox';
            checkbox.checked = true; // Default selected
            checkbox.dataset.index = index;
            checkbox.addEventListener('change', updateButtonState);

            // Thumbnail
            const img = document.createElement('img');
            img.className = 'video-thumb';
            img.src = video.thumbnail;
            img.alt = 'thumb';
            // Fallback for broken image
            img.onerror = () => { img.src = 'images/icon48.png'; }; // simple fallback

            // Info (Title + URL)
            const infoDiv = document.createElement('div');
            infoDiv.className = 'video-info';

            const titleDiv = document.createElement('div');
            titleDiv.className = 'video-title';
            titleDiv.textContent = video.title;
            titleDiv.title = video.title;

            const urlDiv = document.createElement('div');
            urlDiv.className = 'video-url';
            urlDiv.textContent = video.url;

            const dateDiv = document.createElement('div');
            dateDiv.className = 'video-date';
            dateDiv.textContent = video.date || '';

            infoDiv.appendChild(titleDiv);
            infoDiv.appendChild(urlDiv);
            if (video.date) {
                infoDiv.appendChild(dateDiv);
            }

            li.appendChild(checkbox);
            li.appendChild(img);
            li.appendChild(infoDiv);

            // Allow clicking row to toggle checkbox
            li.addEventListener('click', (e) => {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                    updateButtonState();
                }
            });

            urlList.appendChild(li);
        });

        statusDiv.textContent = `${videos.length} videos found`;
        allVideos = videos;
        updateButtonState();
    }

    function updateButtonState() {
        const checkboxes = document.querySelectorAll('.video-checkbox');
        const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;

        if (allVideos.length === 0) {
            copyBtn.textContent = 'Copy Selected';
            copyBtn.disabled = true;
            return;
        }

        copyBtn.textContent = `Copy Selected (${checkedCount})`;
        copyBtn.disabled = checkedCount === 0;
    }

    // Communication with Content Script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]?.id) return;

        chrome.tabs.sendMessage(tabs[0].id, { action: "getURLs" }, (response) => {
            if (chrome.runtime.lastError) {
                statusDiv.textContent = "Please reload the page.";
                urlList.innerHTML = '<li class="empty-message">Error connecting. Reload page.</li>';
                return;
            }

            if (response && response.urls) {
                // Determine if we got objects or just strings (fallback for old content.js if not reloaded)
                const data = response.urls;
                if (data.length > 0 && typeof data[0] === 'string') {
                    // Convert old string format to object format temporarily
                    const converted = data.map(url => ({
                        url: url,
                        title: "Reload page for title",
                        thumbnail: ""
                    }));
                    renderList(converted);
                } else {
                    renderList(data);
                }
            }
        });
    });

    // Button Listeners
    selectAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.video-checkbox').forEach(cb => cb.checked = true);
        updateButtonState();
    });

    deselectAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.video-checkbox').forEach(cb => cb.checked = false);
        updateButtonState();
    });

    copyBtn.addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('.video-checkbox');
        const selectedUrls = [];

        checkboxes.forEach((cb, index) => {
            if (cb.checked) {
                selectedUrls.push(allVideos[index].url);
            }
        });

        if (selectedUrls.length === 0) return;

        const textToCopy = selectedUrls.join('\n');
        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            copyBtn.style.backgroundColor = '#28a745';
            setTimeout(() => {
                updateButtonState(); // Restore text
                copyBtn.style.backgroundColor = '#007bff';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            statusDiv.textContent = 'Failed to copy';
        });
    });
});

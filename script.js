document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. INITIALIZE SPLIDE (REELS GALLERY)
    // ==========================================
    const splideElement = document.querySelector('.splide');
    if (splideElement) {
        new Splide('.splide', {
            type: 'loop',
            perPage: 3,
            perMove: 1,
            gap: '2rem',
            pagination: false, // Cleaner look for tech style
            arrows: true,
            breakpoints: {
                1100: { perPage: 2 },
                768: { perPage: 1 }
            }
        }).mount();
    }

    // ==========================================
    // 2. FOOTER YEAR UPDATE
    // ==========================================
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // ==========================================
    // 3. PROJECT SYSTEM CONFIGURATION
    // ==========================================
    const demoGrid = document.getElementById('project-grid-demo');
    const collabGrid = document.getElementById('project-grid-collab');
    const commissionsGrid = document.getElementById('project-grid-commissions');
    const modal = document.getElementById('project-modal');

    // DOM Elements for Modal
    if (!modal) return; // Safety check
    const modalOverlay = modal.querySelector('.modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalVideoContainer = document.getElementById('modal-video');
    const modalImageContainer = document.getElementById('modal-images');
    const modalDescription = document.getElementById('modal-description');
    const modalAudioContainer = document.getElementById('modal-audio');
    const modalTagsContainer = document.getElementById('modal-tags');
    const closeButton = modal.querySelector('.close-button');

    // State Variables
    let projectsData = [];
    let currentModalPlyrInstance = null;

    // ==========================================
    // 4. FETCH DATA & RENDER
    // ==========================================
    fetch('projects.json')
        .then(response => {
            if (!response.ok) throw new Error("Failed to load projects.json");
            return response.json();
        })
        .then(data => {
            projectsData = data;
            
            // Render specific categories
            renderProjects(projectsData.filter(p => p.category === 'demo'), demoGrid);
            renderProjects(projectsData.filter(p => p.category === 'collab'), collabGrid);
            renderProjects(projectsData.filter(p => p.category === 'commission'), commissionsGrid);

            // Cleanup loading messages
            document.querySelectorAll('.loading-message').forEach(el => el.remove());
        })
        .catch(err => {
            console.error("Error loading projects:", err);
            const msg = '<p style="text-align:center; color:red;">[SYSTEM_ERROR]: FAILED_TO_LOAD_DATA</p>';
            if (demoGrid) demoGrid.innerHTML = msg;
        });


    // Helper: Render Grid
    function renderProjects(projects, gridElement) {
        if (!gridElement) return;
        gridElement.innerHTML = ''; // Clear existing content

        if (projects.length === 0) {
            gridElement.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:#888;">NO_DATA_AVAILABLE</p>';
            return;
        }

        projects.forEach(project => {
            // Create Card Element
            const card = document.createElement('div');
            card.className = 'project-card';
            card.dataset.id = project.id;

            // Thumbnail Logic (Use placeholder if missing)
            const thumbUrl = (project.thumbnails && project.thumbnails[0]) 
                ? project.thumbnails[0] 
                : 'assets/placeholder.jpg';

            // Generate Tags HTML
            let tagsHtml = '';
            if (project.tags && project.tags.length > 0) {
                tagsHtml = `<div class="card-tags">
                    ${project.tags.slice(0, 3).map(tag => `<span>${tag}</span>`).join('')}
                </div>`;
            }

            // Build Card HTML
            card.innerHTML = `
                <div class="card-thumbnail-container">
                    <img src="${thumbUrl}" alt="${project.title}" loading="lazy">
                </div>
                <div class="card-content">
                    <h3>${project.title}</h3>
                    <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom:0.5rem;">
                        ${project.short_description || ''}
                    </p>
                    ${tagsHtml}
                </div>
            `;

            // Attach Click Event
            card.addEventListener('click', () => openModal(project.id));
            
            // Append to Grid
            gridElement.appendChild(card);
        });
    }

    // ==========================================
    // 5. MODAL LOGIC
    // ==========================================
    
    function openModal(projectId) {
        const project = projectsData.find(p => p.id === projectId);
        if (!project) return;

        // --- RESET CONTENT ---
        modalTitle.textContent = project.title;
        modalDescription.innerHTML = '<p>ACCESSING_DATABASE...</p>';
        
        // Hide/Clear all containers
        modalVideoContainer.style.display = 'none';
        modalVideoContainer.innerHTML = '';
        modalImageContainer.style.display = 'none';
        modalImageContainer.innerHTML = '';
        modalAudioContainer.style.display = 'none';
        modalAudioContainer.innerHTML = '';
        modalTagsContainer.innerHTML = '';

        // Remove old External Link Buttons
        const oldLinks = modal.querySelector('.external-links-container');
        if (oldLinks) oldLinks.remove();

        // --- A. EXTERNAL LINKS ---
        if (project.externalLinks && project.externalLinks.length > 0) {
            const linkContainer = document.createElement('div');
            linkContainer.className = 'external-links-container';
            
            project.externalLinks.forEach(link => {
                const btn = document.createElement('a');
                btn.className = 'external-link-button';
                btn.href = link.url;
                btn.target = '_blank';
                btn.textContent = link.label || 'VIEW PROJECT';
                // Add specific class for icons if needed (e.g. .link-spotify)
                if(link.platform) btn.classList.add(`link-${link.platform.toLowerCase()}`);
                linkContainer.appendChild(btn);
            });
            // Insert after H2 title
            modalTitle.after(linkContainer);
        }

        // --- B. VIDEO LOGIC (PLYR) ---
        const hasVideo = project.showVideo !== false; // Default to true if undefined
        
        if (hasVideo) {
            // Attempt to fetch video.txt
            fetch(`${project.folder}video.txt`)
                .then(res => {
                    if (!res.ok) throw new Error("Video file missing");
                    return res.text();
                })
                .then(videoId => {
                    const cleanId = videoId.trim();
                    if (cleanId) {
                        modalVideoContainer.style.display = 'block';
                        const playerDiv = document.createElement('div');
                        playerDiv.className = 'plyr__video-embed';
                        // Use plyr-compliant embed code
                        playerDiv.innerHTML = `<iframe 
                            src="https://www.youtube.com/embed/${cleanId}?origin=${location.origin}&amp;iv_load_policy=3&amp;modestbranding=1&amp;playsinline=1&amp;showinfo=0&amp;rel=0&amp;enablejsapi=1" 
                            allowfullscreen 
                            allowtransparency 
                            allow="autoplay">
                        </iframe>`;
                        
                        modalVideoContainer.appendChild(playerDiv);
                        // Init Plyr
                        currentModalPlyrInstance = new Plyr(playerDiv);
                    } else {
                        // File exists but is empty -> fallback
                        loadImages(project);
                    }
                })
                .catch(() => {
                    // Fetch failed -> fallback to images
                    loadImages(project);
                });
        } else {
            // Explicitly no video -> load images
            loadImages(project);
        }

        // --- C. DESCRIPTION (MARKDOWN) ---
        fetch(`${project.folder}details.md`)
            .then(res => res.text())
            .then(text => {
                // Parse markdown if marked.js is loaded, else plain text
                modalDescription.innerHTML = (typeof marked !== 'undefined') 
                    ? marked.parse(text) 
                    : `<p>${text}</p>`;
            })
            .catch(() => {
                modalDescription.innerHTML = `<p>${project.short_description || "No details available."}</p>`;
            });

        // --- D. AUDIO ---
        if (project.audioFiles && project.audioFiles.length > 0) {
            modalAudioContainer.style.display = 'block';
            modalAudioContainer.innerHTML = '<h4>// AUDIO_LOGS</h4>';
            
            project.audioFiles.forEach(track => {
                const wrapper = document.createElement('div');
                wrapper.style.marginBottom = '1rem';
                
                const title = document.createElement('div');
                title.textContent = track.title || 'Untitled Track';
                title.style.fontWeight = 'bold';
                title.style.marginBottom = '0.3rem';
                title.style.fontSize = '0.9rem';

                const audio = document.createElement('audio');
                audio.controls = true;
                audio.src = `${project.folder}audio/${track.filename}`;
                audio.style.width = '100%';

                wrapper.appendChild(title);
                wrapper.appendChild(audio);
                modalAudioContainer.appendChild(wrapper);
            });
        }

        // --- E. TAGS ---
        if (project.tags && project.tags.length > 0) {
            project.tags.forEach(tag => {
                const span = document.createElement('span');
                span.textContent = tag;
                modalTagsContainer.appendChild(span);
            });
        }

        // --- SHOW MODAL ---
        modal.classList.remove('hidden');
        modal.classList.add('visible');
        document.body.style.overflow = 'hidden'; // Lock scroll
    }

    // Helper: Load Image Carousel
    function loadImages(project) {
        if (project.imageFiles && project.imageFiles.length > 0) {
            modalImageContainer.style.display = 'block';
            project.imageFiles.forEach(imgData => {
                const img = document.createElement('img');
                img.src = `${project.folder}images/${imgData.filename}`;
                img.alt = imgData.alt || 'Project Image';
                // Style overrides for modal images
                img.style.width = '100%';
                img.style.marginBottom = '1rem';
                img.style.border = '1px solid #ddd';
                modalImageContainer.appendChild(img);
            });
        }
    }

    function closeModal() {
        modal.classList.remove('visible');
        modal.classList.add('hidden');
        document.body.style.overflow = ''; // Unlock scroll

        // Destroy Video Player
        if (currentModalPlyrInstance) {
            currentModalPlyrInstance.destroy();
            currentModalPlyrInstance = null;
        }

        // Stop Audio Players
        const audios = modalAudioContainer.querySelectorAll('audio');
        audios.forEach(a => {
            a.pause();
            a.currentTime = 0;
        });
    }

    // ==========================================
    // 6. EVENT LISTENERS
    // ==========================================
    if (closeButton) closeButton.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', closeModal);
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('visible')) {
            closeModal();
        }
    });

});

// ==========================================
    // AUDIO TERMINAL LOGIC
    // ==========================================
    const trackItems = document.querySelectorAll('.track-item');
    const scPlayer = document.getElementById('sc-player');
    
    // Base SoundCloud Embed URL options
    // visual=true makes it the big album art player
    // auto_play=true makes it start when clicked
    const scBaseUrl = "https://w.soundcloud.com/player/?url=";
    const scOptions = "&color=%23ff2a2a&auto_play=true&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true";

    if (scPlayer && trackItems.length > 0) {
        trackItems.forEach(item => {
            item.addEventListener('click', function() {
                // 1. Remove active class from all
                trackItems.forEach(t => t.classList.remove('active'));
                
                // 2. Add active class to clicked
                this.classList.add('active');
                
                // 3. Get the SoundCloud URL from data attribute
                const trackUrl = this.getAttribute('data-url');
                
                // 4. Update iframe src
                // encodeURIComponent is important for URL parameters
                scPlayer.src = scBaseUrl + encodeURIComponent(trackUrl) + scOptions;
            });
        });
    }
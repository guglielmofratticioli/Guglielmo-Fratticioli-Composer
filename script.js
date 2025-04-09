document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM Elements ---
    const mainGrid = document.getElementById('project-grid-main');
    const coversGrid = document.getElementById('project-grid-covers');
    const commissionsGrid = document.getElementById('project-grid-commissions');
    const modal = document.getElementById('project-modal');
    const modalOverlay = modal.querySelector('.modal-overlay');
    const modalContent = modal.querySelector('.modal-content');
    const modalTitle = document.getElementById('modal-title');
    const modalVideoContainer = document.getElementById('modal-video');
    const modalImageContainer = document.getElementById('modal-images');
    const modalDescription = document.getElementById('modal-description');
    const modalAudioContainer = document.getElementById('modal-audio');
    const modalTagsContainer = document.getElementById('modal-tags');
    const closeButton = modal.querySelector('.close-button');
    const currentYearSpan = document.getElementById('current-year');

    // --- State ---
    let projectsData = [];
    let currentModalPlyrInstance = null; // To hold the active Plyr instance

    // --- Initialization ---
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    } else {
        console.error("Element with ID 'current-year' not found.");
    }

    // --- Fetch Project Data (Manifest) ---
    fetch('projects.json')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (!Array.isArray(data)) throw new Error("projects.json is not a valid JSON array.");
            projectsData = data;

            const mainProjects = projectsData.filter(p => p.category === 'main');
            const coverProjects = projectsData.filter(p => p.category === 'cover');
            const commissionProjects = projectsData.filter(p => p.category === 'commission');

            renderProjects(mainProjects, mainGrid);
            renderProjects(coverProjects, coversGrid);
            renderProjects(commissionProjects, commissionsGrid);

            document.querySelectorAll('.loading-message').forEach(el => el.remove());
        })
        .catch(error => {
            console.error("Error fetching or parsing projects.json:", error);
            const errorMessage = `<p class="error-message">Could not load projects: ${error.message}. Please check console and projects.json.</p>`;
            if (mainGrid) mainGrid.innerHTML = errorMessage;
            if (coversGrid) coversGrid.innerHTML = errorMessage;
            if (commissionsGrid) commissionsGrid.innerHTML = errorMessage;
             document.querySelectorAll('.loading-message').forEach(el => el.remove());
        });

    // --- Render Project Cards Function (Static Thumbnail) ---
    function renderProjects(projects, gridElement) {
        if (!gridElement) {
             console.error("Target grid element not found for rendering");
             return;
        }
        gridElement.innerHTML = ''; // Clear grid

        if (!projects || projects.length === 0) {
            // Optional: display message if no projects in category
            // gridElement.innerHTML = '<p style="text-align: center; color: var(--text-medium-emphasis);">No projects here yet.</p>';
            return;
        }

        projects.forEach(project => {
            if (!project || !project.id || !project.folder || !project.title) {
                 console.warn("Skipping invalid project object in projects.json:", project);
                 return;
            }

            const card = document.createElement('div');
            card.className = 'project-card';
            card.dataset.projectId = project.id;

            // Card Thumbnail Container
            const thumbnailContainer = document.createElement('div');
            thumbnailContainer.className = 'card-thumbnail-container';

            const thumbnailUrl = (project.thumbnails && project.thumbnails.length > 0)
                                  ? project.thumbnails[0]
                                  : 'assets/placeholder.jpg'; // Ensure you have this placeholder

            const img = document.createElement('img');
            img.src = thumbnailUrl;
            img.alt = `${project.title} thumbnail`;
            img.loading = 'lazy';
            img.onerror = () => {
                console.warn(`Failed to load thumbnail: ${thumbnailUrl}. Using placeholder.`);
                img.src = 'assets/placeholder.jpg';
                img.alt = `Placeholder for ${project.title}`;
             };

            thumbnailContainer.appendChild(img);

            // Card Content
            const contentDiv = document.createElement('div');
            contentDiv.className = 'card-content';
            const title = document.createElement('h3');
            title.textContent = project.title;
            const description = document.createElement('p');
            description.className = 'card-description';
            description.textContent = project.short_description || 'No description available.';
            const tagsDiv = document.createElement('div');
            tagsDiv.className = 'card-tags';
            if (project.tags && Array.isArray(project.tags) && project.tags.length > 0) {
                project.tags.forEach(tag => {
                    if (typeof tag === 'string' && tag.trim() !== '') {
                        const tagSpan = document.createElement('span');
                        tagSpan.textContent = tag;
                        tagsDiv.appendChild(tagSpan);
                    }
                });
            }
            contentDiv.appendChild(title);
            contentDiv.appendChild(description);
            contentDiv.appendChild(tagsDiv);

            // Assemble Card
            card.appendChild(thumbnailContainer);
            card.appendChild(contentDiv);

            // Add click listener
            card.addEventListener('click', () => openModal(project.id));

            gridElement.appendChild(card);
        });
    }

    // --- MODAL Carousel Initialization Function ---
    function initializeModalCarousel(carouselContainer) {
        if (!carouselContainer) return;
        const track = carouselContainer.querySelector('.modal-carousel-track');
        const slides = track ? Array.from(track.children) : [];
        const dotsContainer = carouselContainer.querySelector('.modal-carousel-dots');
        const dots = dotsContainer ? Array.from(dotsContainer.children) : [];
        const nextButton = carouselContainer.querySelector('.modal-carousel-arrow.next');
        const prevButton = carouselContainer.querySelector('.modal-carousel-arrow.prev');
        const slideCount = slides.length;
        let currentIndex = 0;

        // --- Event Handlers (Define them here to potentially remove later) ---
        const nextSlideHandler = () => goToSlide(currentIndex + 1);
        const prevSlideHandler = () => goToSlide(currentIndex - 1);
        const dotClickHandlers = []; // Store dot handlers

        // --- Clear Previous Listeners (More robust attempt) ---
        if (nextButton && nextButton.handler) nextButton.removeEventListener('click', nextButton.handler);
        if (prevButton && prevButton.handler) prevButton.removeEventListener('click', prevButton.handler);
        if (dotsContainer && dotsContainer.dotHandlers) {
            dots.forEach((dot, index) => {
                if (dotsContainer.dotHandlers[index]) {
                    dot.removeEventListener('click', dotsContainer.dotHandlers[index]);
                }
            });
        }

        // --- Logic for Single vs Multiple Slides ---
        if (!track || slideCount <= 1) {
            carouselContainer.setAttribute('data-single-image', 'true');
            if(track) track.style.transform = 'translateX(0%)';
            return; // No carousel needed
        }
        carouselContainer.removeAttribute('data-single-image');

        // --- Go To Slide Function ---
        const goToSlide = (index) => {
            currentIndex = (index + slideCount) % slideCount;
            if (track) {
                 track.style.transform = `translateX(-${currentIndex * 100}%)`;
            }
            if (dots.length > 0) {
                dots.forEach((dot, i) => dot.classList.toggle('active', i === currentIndex));
            }
        };

        // --- Attach New Listeners ---
        if (nextButton) {
             nextButton.handler = nextSlideHandler; // Store handler reference
             nextButton.addEventListener('click', nextButton.handler);
        }
        if (prevButton) {
             prevButton.handler = prevSlideHandler; // Store handler reference
             prevButton.addEventListener('click', prevButton.handler);
        }
        if (dots.length > 0) {
            dotsContainer.dotHandlers = []; // Reset stored handlers
            dots.forEach((dot, index) => {
                const handler = () => goToSlide(index);
                dotClickHandlers[index] = handler; // Store handler
                dotsContainer.dotHandlers[index] = handler; // Store on container too
                dot.addEventListener('click', handler);
            });
        }

        goToSlide(0); // Set initial slide
    }


    // Helper function to populate image carousel
    function populateImageCarousel(project) {
        if (!modalImageContainer) return;
        modalImageContainer.innerHTML = ''; // Clear previous

        if (!project.imageFiles || !Array.isArray(project.imageFiles) || project.imageFiles.length === 0) {
            modalImageContainer.style.display = 'none';
            return; // Exit if no images to show
        }

        const imageTrack = document.createElement('div');
        imageTrack.className = 'modal-carousel-track';
        let validImagesFound = 0;

        project.imageFiles.forEach(imageInfo => {
            if (!imageInfo || typeof imageInfo.filename !== 'string' || imageInfo.filename.trim() === '') return;

            const slide = document.createElement('div');
            slide.className = 'modal-carousel-slide';
            const img = document.createElement('img');
            const imgSrc = `${project.folder}images/${imageInfo.filename}`;
            img.src = imgSrc;
            img.alt = imageInfo.alt || `${project.title} image`;
            img.loading = 'lazy';
            img.onerror = () => { console.warn(`Failed to load modal image: ${imgSrc}`); img.alt = `Failed to load: ${imageInfo.filename}`; };
            img.onload = () => { validImagesFound++; };
            slide.appendChild(img);
            imageTrack.appendChild(slide);
        });

        // Only proceed if images were actually added
        if (imageTrack.children.length > 0) {
            modalImageContainer.appendChild(imageTrack);
            modalImageContainer.style.display = 'block'; // Show container

            // Add dots/arrows only if more than one image
            if(imageTrack.children.length > 1) {
                const dotsContainer = document.createElement('div');
                dotsContainer.className = 'modal-carousel-dots';
                Array.from(imageTrack.children).forEach((_, index) => {
                    const dot = document.createElement('button');
                    dot.className = 'modal-carousel-dot';
                    dot.dataset.index = index;
                    if (index === 0) dot.classList.add('active');
                    dot.setAttribute('aria-label', `Go to image ${index + 1}`);
                    dotsContainer.appendChild(dot);
                 });
                modalImageContainer.appendChild(dotsContainer);

                const prevArrow = document.createElement('button');
                prevArrow.className = 'modal-carousel-arrow prev';
                prevArrow.innerHTML = '❮';
                prevArrow.setAttribute('aria-label', 'Previous image');
                modalImageContainer.appendChild(prevArrow);

                const nextArrow = document.createElement('button');
                nextArrow.className = 'modal-carousel-arrow next';
                nextArrow.innerHTML = '❯';
                nextArrow.setAttribute('aria-label', 'Next image');
                modalImageContainer.appendChild(nextArrow);
            }
        } else {
            // If loop finished but no valid images added, hide container
            modalImageContainer.style.display = 'none';
        }
    }


    // --- Modal Logic ---
    function openModal(projectId) {
        const project = projectsData.find(p => p.id === projectId);
        if (!project) {
             console.error(`Project with ID ${projectId} not found.`);
             return;
        }

        // Destroy previous Plyr instance if it exists
        if (currentModalPlyrInstance) {
            try {
                currentModalPlyrInstance.destroy();
            } catch (e) { console.error("Error destroying previous Plyr instance:", e); }
            currentModalPlyrInstance = null;
        }

        // --- Populate Basic Info ---
        modalTitle.textContent = project.title;

        // --- Reset Content Areas ---
        modalVideoContainer.innerHTML = '';
        modalVideoContainer.style.display = 'none';
        modalImageContainer.innerHTML = '';
        modalImageContainer.style.display = 'none';
        modalDescription.innerHTML = '<p>Loading details...</p>';
        modalAudioContainer.innerHTML = '';
        modalAudioContainer.style.display = 'none';
        modalTagsContainer.innerHTML = '';
        modalTagsContainer.style.display = 'none';
        // Remove any previous external link container/buttons
        const existingLinksContainer = modalContent.querySelector('.external-links-container');
        if (existingLinksContainer) {
            existingLinksContainer.remove();
        }

        // --- Determine Content Type ---
        const shouldShowVideo = project.showVideo !== false; // True if showVideo is true or undefined

        // --- A. HANDLE YOUTUBE VIDEO (Primary Display if showVideo is true) ---
        if (shouldShowVideo) {
            modalVideoContainer.style.display = 'block';
            modalImageContainer.style.display = 'none'; // Hide image carousel if video is showing
            modalVideoContainer.innerHTML = '<p>Loading video...</p>';

            fetch(`${project.folder}video.txt`)
                .then(response => {
                    if (!response.ok) throw new Error(`video.txt not found (status ${response.status})`);
                    return response.text();
                })
                .then(videoId => {
                    videoId = videoId.trim();
                    if (videoId && typeof Plyr !== 'undefined') {
                        const playerDiv = document.createElement('div');
                        playerDiv.dataset.plyrProvider = 'youtube';
                        playerDiv.dataset.plyrEmbedId = videoId;
                        modalVideoContainer.innerHTML = '';
                        modalVideoContainer.appendChild(playerDiv);
                        try {
                            currentModalPlyrInstance = new Plyr(playerDiv, {
                                tooltips: { controls: true, seek: true },
                                keyboard: { focused: true, global: false }
                            });
                        } catch (e) {
                            console.error("Failed to initialize Plyr:", e);
                            modalVideoContainer.innerHTML = '<p>Error initializing video player.</p>';
                        }
                    } else if (!videoId) {
                         throw new Error("video.txt is empty");
                    } else {
                         throw new Error("Plyr library not loaded.");
                    }
                })
                .catch(error => {
                    console.warn(`Could not load video for ${project.title}:`, error);
                    modalVideoContainer.innerHTML = `<p>Video not available. (${error.message})</p>`;
                });

        // --- B. HANDLE NO VIDEO CASE (Check for External Links and/or Images) ---
        } else {
            modalVideoContainer.style.display = 'none'; // Keep video area hidden

            // Check and Populate External Links Container
            if (project.externalLinks && Array.isArray(project.externalLinks) && project.externalLinks.length > 0) {
                const linksContainer = document.createElement('div');
                linksContainer.className = 'external-links-container';

                project.externalLinks.forEach(link => {
                    if (link && typeof link.url === 'string' && link.url.trim() !== '' && typeof link.label === 'string' && link.label.trim() !== '') {
                        const linkButton = document.createElement('a');
                        linkButton.href = link.url;
                        linkButton.textContent = link.label;
                        linkButton.className = `external-link-button link-${(link.platform || 'generic').toLowerCase()}`;
                        linkButton.target = '_blank';
                        linkButton.rel = 'noopener noreferrer';
                        linksContainer.appendChild(linkButton);
                    } else {
                        console.warn("Skipping invalid external link object:", link, "for project:", project.id);
                    }
                });

                if (linksContainer.children.length > 0) {
                     if (modalTitle) {
                        modalTitle.insertAdjacentElement('afterend', linksContainer);
                     } else {
                          modalContent.insertBefore(linksContainer, modalContent.firstChild);
                     }
                }
            }

            // Check and Populate Images (runs regardless of external links)
            populateImageCarousel(project);
            if (modalImageContainer && modalImageContainer.innerHTML !== '') {
                initializeModalCarousel(modalImageContainer);
                // Add margin between links and images if both exist
                if (project.externalLinks && project.externalLinks.length > 0) {
                     modalImageContainer.style.marginTop = '1.5rem';
                } else {
                     modalImageContainer.style.marginTop = '0';
                }
            }
        }
        // --- END OF VIDEO/IMAGE/LINK HANDLING ---


        // --- Fetch and Populate Details ---
        fetch(`${project.folder}details.md`)
           .then(response => {
                if (!response.ok) throw new Error(`details.md not found (status ${response.status})`);
                return response.text();
           })
           .then(markdown => {
                if (typeof marked !== 'undefined') {
                   const dirtyHtml = marked.parse(markdown);
                   modalDescription.innerHTML = dirtyHtml;
                } else {
                    console.error("Marked.js library not loaded."); // Use console.error
                    modalDescription.innerHTML = `<p>${project.short_description || 'No details available.'}</p>`;
                }
           })
           .catch(error => {
               console.warn(`Could not load or parse details.md for ${project.title}:`, error);
               modalDescription.innerHTML = `<p>${project.short_description || 'No details available.'}</p>`;
           });

        // --- Populate Audio ---
        if (project.audioFiles && Array.isArray(project.audioFiles) && project.audioFiles.length > 0) {
            modalAudioContainer.innerHTML = '';
            const audioHeading = document.createElement('h4');
            audioHeading.textContent = 'Audio Snippets';
            modalAudioContainer.appendChild(audioHeading);
            let validAudioFound = 0;

            project.audioFiles.forEach(audioFile => {
                if (!audioFile || typeof audioFile.filename !== 'string' || audioFile.filename.trim() === '') return;

                const audioItemDiv = document.createElement('div');
                audioItemDiv.className = 'audio-item';
                const audioTitle = document.createElement('p');
                audioTitle.className = 'audio-title';
                audioTitle.textContent = audioFile.title || 'Audio Track';
                const audioPlayer = document.createElement('audio');
                audioPlayer.controls = true;
                const audioSrc = `${project.folder}audio/${audioFile.filename}`;
                audioPlayer.src = audioSrc;
                audioPlayer.preload = 'none';
                audioPlayer.addEventListener('error', (e) => {
                    console.warn(`Failed to load audio: ${audioSrc}`, e);
                    audioItemDiv.innerHTML = `<p class="audio-title error-text">${audioTitle.textContent} (Error loading)</p>`;
                });
                audioItemDiv.appendChild(audioTitle);
                audioItemDiv.appendChild(audioPlayer);
                modalAudioContainer.appendChild(audioItemDiv);
                validAudioFound++;
            });

             if (validAudioFound > 0) {
                 modalAudioContainer.style.display = 'block';
             } else {
                 modalAudioContainer.style.display = 'none'; // Ensure hidden if loop finishes with no valid audio
             }
        } else {
             modalAudioContainer.style.display = 'none'; // Hide if no audio files defined
        }

        // --- Populate Tags ---
        if (project.tags && Array.isArray(project.tags) && project.tags.length > 0) {
            let tagsAdded = false;
            modalTagsContainer.innerHTML = ''; // Clear previous tags
            project.tags.forEach(tag => {
                if (typeof tag === 'string' && tag.trim() !== '') {
                   const tagSpan = document.createElement('span');
                   tagSpan.textContent = tag;
                   modalTagsContainer.appendChild(tagSpan);
                   tagsAdded = true;
                }
            });
            if (tagsAdded) {
                modalTagsContainer.style.display = 'flex';
            } else {
                 modalTagsContainer.style.display = 'none'; // Hide if no valid tags added
            }
        } else {
             modalTagsContainer.style.display = 'none'; // Hide if no tags defined
        }

        // --- Show Modal ---
        modal.classList.remove('hidden');
        modal.classList.add('visible');
        document.body.style.overflow = 'hidden';
        if (modalContent) modalContent.scrollTop = 0; // Scroll modal content to top
    } // --- END of openModal function ---


    // --- closeModal Function ---
    function closeModal() {
        if (!modal) return; // Guard against modal element not found
        modal.classList.remove('visible');
        modal.classList.add('hidden');
        document.body.style.overflow = '';

        // Destroy Plyr instance if it exists
        if (currentModalPlyrInstance) {
             try {
                currentModalPlyrInstance.destroy();
             } catch (e) { console.error("Error destroying Plyr instance:", e); }
             currentModalPlyrInstance = null;
        }
        // Clear the video container
        if(modalVideoContainer) modalVideoContainer.innerHTML = '';
        if(modalVideoContainer) modalVideoContainer.style.display = 'none'; // Ensure hidden


        // Stop all audio players
        if (modalAudioContainer) {
            const audioPlayers = modalAudioContainer.querySelectorAll('audio');
            audioPlayers.forEach(player => {
                try {
                    if (!player.paused) {
                        player.pause();
                    }
                    player.currentTime = 0;
                    // Detaching source can prevent issues on some browsers
                    let currentSrc = player.src; // Store src before clearing
                    player.src = ''; // Detach source
                    player.removeAttribute('src'); // Fully remove attribute
                    // Optional: If needed later, reattach: player.src = currentSrc;
                 } catch (e) { console.warn("Error stopping audio player:", e); }
            });
        }
    }

    // --- Event Listeners for Modal ---
    if(closeButton) closeButton.addEventListener('click', closeModal);
    if(modalOverlay) modalOverlay.addEventListener('click', closeModal);
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal && modal.classList.contains('visible')) {
            closeModal();
        }
    });

    // Add specific error class for styling audio load errors
    const style = document.createElement('style');
    style.textContent = '.error-text { color: #ff6b6b; font-style: italic; }';
    document.head.appendChild(style);

}); // End DOMContentLoaded
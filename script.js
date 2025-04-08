document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM Elements (remain the same) ---
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

    // --- Initialization (remains the same) ---
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    } else {
        console.error("Element with ID 'current-year' not found.");
    }

    // --- Fetch Project Data (remains the same) ---
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

    // --- Render Project Cards Function (remains the same) ---
    function renderProjects(projects, gridElement) {
        if (!gridElement) {
             console.error("Target grid element not found for rendering");
             return;
        }
        gridElement.innerHTML = '';

        if (!projects || projects.length === 0) {
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

            const thumbnailContainer = document.createElement('div');
            thumbnailContainer.className = 'card-thumbnail-container';

            const thumbnailUrl = (project.thumbnails && project.thumbnails.length > 0)
                                  ? project.thumbnails[0]
                                  : 'assets/placeholder.jpg';

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

            card.appendChild(thumbnailContainer);
            card.appendChild(contentDiv);

            card.addEventListener('click', () => openModal(project.id));

            gridElement.appendChild(card);
        });
    }

    // --- MODAL Carousel Initialization Function (remains the same) ---
    function initializeModalCarousel(carouselContainer) {
        const track = carouselContainer.querySelector('.modal-carousel-track');
        const slides = track ? Array.from(track.children) : [];
        const dotsContainer = carouselContainer.querySelector('.modal-carousel-dots');
        const dots = dotsContainer ? Array.from(dotsContainer.children) : [];
        const nextButton = carouselContainer.querySelector('.modal-carousel-arrow.next');
        const prevButton = carouselContainer.querySelector('.modal-carousel-arrow.prev');
        const slideCount = slides.length;
        let currentIndex = 0;

        if (!track || slideCount <= 1) {
            carouselContainer.setAttribute('data-single-image', 'true');
            if(track) track.style.transform = 'translateX(0%)';
            return;
        }
        carouselContainer.removeAttribute('data-single-image');

        const goToSlide = (index) => {
            currentIndex = (index + slideCount) % slideCount;
            track.style.transform = `translateX(-${currentIndex * 100}%)`;
            if (dots.length > 0) {
                dots.forEach((dot, i) => dot.classList.toggle('active', i === currentIndex));
            }
        };

        const nextSlide = () => goToSlide(currentIndex + 1);
        const prevSlide = () => goToSlide(currentIndex - 1);

        if (nextButton) nextButton.addEventListener('click', nextSlide);
        if (prevButton) prevButton.addEventListener('click', prevSlide);
        if (dots.length > 0) {
            dots.forEach(dot => {
                dot.addEventListener('click', () => goToSlide(parseInt(dot.dataset.index)));
            });
        }
        goToSlide(0);
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
        modalTagsContainer.innerHTML = '';


        // --- Determine Video/Image Visibility ---
        const shouldShowVideo = project.showVideo !== false;

        if (shouldShowVideo) {
            // --- SHOW VIDEO, HIDE IMAGES ---
            modalVideoContainer.style.display = 'block';
            modalImageContainer.style.display = 'none';
            modalVideoContainer.innerHTML = '<p>Loading video...</p>'; // Loading state

            fetch(`${project.folder}video.txt`)
                .then(response => {
                    if (!response.ok) throw new Error(`video.txt not found (status ${response.status})`);
                    return response.text();
                    })
                .then(videoId => {
                    videoId = videoId.trim();
                    if (videoId && typeof Plyr !== 'undefined') {
                        // Create the div for Plyr to attach to
                        const playerDiv = document.createElement('div');
                        playerDiv.dataset.plyrProvider = 'youtube';
                        playerDiv.dataset.plyrEmbedId = videoId;
                        modalVideoContainer.innerHTML = ''; // Clear loading message
                        modalVideoContainer.appendChild(playerDiv);

                        // Initialize Plyr
                        try {
                            currentModalPlyrInstance = new Plyr(playerDiv, {
                                // Plyr options can go here, e.g.:
                                // controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
                                tooltips: { controls: true, seek: true },
                                keyboard: { focused: true, global: false } // Only control when focused
                            });

                            // Optional: Add event listener if needed
                            // currentModalPlyrInstance.on('ready', event => {
                            //     console.log('Plyr Ready');
                            // });
                            // currentModalPlyrInstance.on('error', event => {
                            //     console.error("Plyr Error:", event.detail.plyr.source);
                            //     modalVideoContainer.innerHTML = '<p>Error loading video player.</p>';
                            // });

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
                    modalVideoContainer.innerHTML = `<p>Video not available for this project. (${error.message})</p>`;
                });

        } else {
            // --- HIDE VIDEO, SHOW IMAGES (if they exist) ---
            modalVideoContainer.style.display = 'none';

            if (project.imageFiles && Array.isArray(project.imageFiles) && project.imageFiles.length > 0) {
                modalImageContainer.innerHTML = '';
                const imageTrack = document.createElement('div');
                imageTrack.className = 'modal-carousel-track';
                // ... (image creation loop remains the same) ...
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
                    slide.appendChild(img);
                    imageTrack.appendChild(slide);
                 });


                if (imageTrack.children.length > 0) {
                    modalImageContainer.appendChild(imageTrack);
                    modalImageContainer.style.display = 'block'; // SHOW the image container

                    if(imageTrack.children.length > 1) {
                         // ... (dots/arrows creation remains the same) ...
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
                    initializeModalCarousel(modalImageContainer);
                } else {
                     modalImageContainer.style.display = 'none';
                }
            } else {
                 modalImageContainer.style.display = 'none';
            }
        }


        // --- Fetch and Populate Details (from details.md) ---
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
                     throw new Error("Marked.js library not loaded.");
                 }
            })
            .catch(error => {
                console.warn(`Could not load or parse details.md for ${project.title}:`, error);
                modalDescription.innerHTML = `<p>${project.short_description || 'No details available.'}</p>`;
            });

        // --- Populate Audio (from audioFiles in JSON) ---
        modalAudioContainer.style.display = 'none';
        if (project.audioFiles && Array.isArray(project.audioFiles) && project.audioFiles.length > 0) {
            modalAudioContainer.innerHTML = '';
            const audioHeading = document.createElement('h4');
            audioHeading.textContent = 'Audio Snippets';
            modalAudioContainer.appendChild(audioHeading);
            // ... (audio item creation loop remains the same) ...
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
            });

            if (modalAudioContainer.children.length > 1) {
                 modalAudioContainer.style.display = 'block';
             }
        }

        // --- Populate Tags ---
        modalTagsContainer.innerHTML = '';
        modalTagsContainer.style.display = 'none';
        if (project.tags && Array.isArray(project.tags) && project.tags.length > 0) {
            let tagsAdded = false;
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
            }
        }


        // --- Show Modal ---
        modal.classList.remove('hidden');
        modal.classList.add('visible');
        document.body.style.overflow = 'hidden';
        modalContent.scrollTop = 0;
    }

    // --- closeModal Function ---
    function closeModal() {
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
         // Clear the video container after destroying
        modalVideoContainer.innerHTML = '';


        // Stop all audio players
        const audioPlayers = modalAudioContainer.querySelectorAll('audio');
        audioPlayers.forEach(player => {
             player.pause();
             player.currentTime = 0;
             player.src = ''; // Stop loading/streaming
        });
    }

    // --- Event Listeners for Modal ---
    closeButton.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.classList.contains('visible')) {
            closeModal();
        }
    });

    // Add specific error class for styling audio load errors (remains the same)
    const style = document.createElement('style');
    style.textContent = '.error-text { color: #ff6b6b; font-style: italic; }';
    document.head.appendChild(style);

}); // End DOMContentLoaded
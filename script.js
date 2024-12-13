document.addEventListener('DOMContentLoaded', function() {
    /**
     * Cache DOM elements for better performance and organization
     */
    const elements = {
        audio: {
            player: document.getElementById('bgMusic'),
            playPauseBtn: document.getElementById('playPauseBtn'),
            muteBtn: document.getElementById('muteBtn'),
            progressBar: document.querySelector('.progress-bar'),
            progress: document.querySelector('.progress'),
            timeDisplay: document.querySelector('.time')
        },
        screens: {
            welcome: document.getElementById('welcomeScreen'),
            game: document.getElementById('gameContent'),
            gameOver: document.getElementById('gameOverModal')
        },
        game: {
            heading: document.getElementById('mainTitle'),
            paragraph: document.getElementById('mainText'),
            target: document.getElementById('target'),
            startButton: document.getElementById('startGame'),
            clicks: document.getElementById('clicks'),
            targetClicks: document.getElementById('target-clicks'),
            clickLimit: document.getElementById('clickLimit'),
            avgTime: document.getElementById('avgTime'),
            accuracy: document.getElementById('accuracy'),
            container: document.getElementById('gameContainer'),
            stats: document.getElementById('stats'),
            settings: document.getElementById('settings')
        },
        finalStats: {
            accuracy: document.getElementById('finalAccuracy'),
            time: document.getElementById('finalTime')
        }
    };

    /**
     * Application state management
     */
    const state = {
        audio: {
            isPlaying: false,
            isDragging: false,
            dragPosition: 0
        },
        game: {
            clicks: 0,
            active: false,
            maxClicks: 10,
            lastClickTime: 0,
            totalTime: 0,
            totalAttempts: 0
        }
    };

    /**
     * Audio Controller
     * Handles all audio-related functionality
     */
    const audio = {
        init() {
            elements.audio.player.volume = 0.5;
            this._bindMethods();
            this.attachListeners();
        },

        _bindMethods() {
            // Bind methods to maintain 'this' context
            this.updateProgress = this.updateProgress.bind(this);
            this.startDragging = this.startDragging.bind(this);
            this.stopDragging = this.stopDragging.bind(this);
            this.drag = this.drag.bind(this);
            this.updateProgressDisplay = this.updateProgressDisplay.bind(this);
        },

        attachListeners() {
            elements.audio.playPauseBtn.addEventListener('click', this.togglePlay);
            elements.audio.muteBtn.addEventListener('click', this.toggleMute);
            elements.audio.player.addEventListener('timeupdate', this.updateProgress);
            elements.audio.progressBar.addEventListener('click', this.handleProgressClick);
            elements.audio.progressBar.addEventListener('mousedown', this.startDragging);
            document.addEventListener('mousemove', this.drag);
            document.addEventListener('mouseup', this.stopDragging);
            
            elements.audio.player.addEventListener('loadeddata', () => {
                const minutes = Math.floor(elements.audio.player.duration / 60);
                const seconds = Math.floor(elements.audio.player.duration % 60).toString().padStart(2, '0');
                elements.audio.timeDisplay.textContent = `0:00 / ${minutes}:${seconds}`;
            });

            elements.audio.player.addEventListener('play', () => {
                elements.audio.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
                state.audio.isPlaying = true;
            });

            elements.audio.player.addEventListener('pause', () => {
                elements.audio.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
                state.audio.isPlaying = false;
            });
        },

        togglePlay() {
            if (elements.audio.player.paused) {
                elements.audio.player.play();
            } else {
                elements.audio.player.pause();
            }
        },

        toggleMute() {
            elements.audio.player.muted = !elements.audio.player.muted;
            elements.audio.muteBtn.innerHTML = elements.audio.player.muted ? 
                '<i class="fas fa-volume-mute"></i>' : 
                '<i class="fas fa-volume-up"></i>';
        },

        updateProgress() {
            if (!state.audio.isDragging) {
                const { duration, currentTime } = elements.audio.player;
                const progressPercent = (currentTime / duration) * 100;
                elements.audio.progress.style.width = `${progressPercent}%`;
                
                const minutes = Math.floor(currentTime / 60);
                const seconds = Math.floor(currentTime % 60).toString().padStart(2, '0');
                elements.audio.timeDisplay.textContent = `${minutes}:${seconds}`;
            }
        },

        startDragging(e) {
            state.audio.isDragging = true;
            document.body.style.userSelect = 'none';
            this.updateProgressDisplay(e);
        },

        stopDragging() {
            if (state.audio.isDragging) {
                state.audio.isDragging = false;
                document.body.style.userSelect = '';
                // Update audio position only when drag ends
                elements.audio.player.currentTime = state.audio.dragPosition * elements.audio.player.duration;
            }
        },

        drag(e) {
            if (state.audio.isDragging) {
                this.updateProgressDisplay(e);
            }
        },

        handleProgressClick(e) {
            const rect = elements.audio.progressBar.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / elements.audio.progressBar.offsetWidth;
            elements.audio.player.currentTime = pos * elements.audio.player.duration;
        },

        updateProgressDisplay(e) {
            const rect = elements.audio.progressBar.getBoundingClientRect();
            state.audio.dragPosition = Math.min(Math.max((e.clientX - rect.left) / elements.audio.progressBar.offsetWidth, 0), 1);
            
            // Only update visual elements while dragging
            elements.audio.progress.style.width = `${state.audio.dragPosition * 100}%`;
            
            // Calculate time for display
            const time = state.audio.dragPosition * elements.audio.player.duration;
            const minutes = Math.floor(time / 60);
            const seconds = Math.floor(time % 60).toString().padStart(2, '0');
            elements.audio.timeDisplay.textContent = `${minutes}:${seconds}`;
        }
    };

    /**
     * Function to save game results to CSV file
     */
    function saveResultsToCSV(accuracy, avgTime) {
        const data = `Accuracy,Average Time\n${accuracy},${avgTime}\n`;
        const blob = new Blob([data], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'data.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    /**
     * Function to save game results to the server
     */
    function saveResultsToServer(accuracy, avgTime) {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', './save_results.php', true); // Ensure the path is correct
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                console.log('Results saved:', xhr.responseText);
            } else if (xhr.readyState === 4) {
                console.error('Error saving results:', xhr.status, xhr.statusText);
            }
        };
        xhr.send(`accuracy=${accuracy}&avgTime=${avgTime}`);
    }

    /**
     * Game Controller
     * Handles core game mechanics and UI updates
     */
    const game = {
        init() {
            this.attachListeners();
            this.initializeUI();
        },

        attachListeners() {
            // Fix bindings for event handlers
            elements.game.startButton.addEventListener('click', () => this.startGame());
            elements.game.target.addEventListener('click', () => this.handleTargetClick());
            elements.game.container.addEventListener('click', (e) => this.handleContainerClick(e));
            document.getElementById('restartGame').addEventListener('click', () => this.handleRestart());
            
            // Add slider value update
            elements.game.clickLimit.addEventListener('input', (e) => {
                const value = e.target.value;
                document.getElementById('clickLimitValue').textContent = value;
                const percent = ((value - e.target.min) / (e.target.max - e.target.min)) * 100;
                e.target.style.setProperty('--progress', `${percent}%`);
            });

            // Initialize slider value
            const initialValue = elements.game.clickLimit.value;
            const min = elements.game.clickLimit.min;
            const max = elements.game.clickLimit.max;
            const initialPercent = ((initialValue - min) / (max - min)) * 100;
            elements.game.clickLimit.style.setProperty('--progress', `${initialPercent}%`);
        },

        initializeUI() {
            this.fadeIn(elements.game.heading, 500);
            this.fadeIn(elements.game.paragraph, 1000);
        },

        startGame() {
            Object.assign(state.game, {
                active: true,
                clicks: 0,
                maxClicks: parseInt(elements.game.clickLimit.value) || 10,
                totalTime: 0,
                lastClickTime: Date.now(),
                totalAttempts: 0,
                settingsHeight: elements.game.settings.offsetHeight
            });

            elements.game.clicks.textContent = '0';
            elements.game.targetClicks.textContent = state.game.maxClicks;
            elements.game.startButton.style.display = 'none';
            elements.game.clickLimit.disabled = true;
            elements.game.avgTime.textContent = '0';
            elements.game.accuracy.textContent = '100';
            elements.game.settings.classList.add('hidden');
            
            elements.game.target.style.transition = 'none';
            game.moveTarget();
            
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    elements.game.target.style.transition = 'transform 0.1s ease, left 0.1s ease-out, top 0.1s ease-out';
                });
            });
        },

        handleTargetClick() {
            if (!state.game.active) return;

            const currentTime = Date.now();
            state.game.totalAttempts++;

            if (state.game.clicks > 0) {
                state.game.totalTime += currentTime - state.game.lastClickTime;
                elements.game.avgTime.textContent = Math.round(state.game.totalTime / state.game.clicks);
            }

            state.game.lastClickTime = currentTime;
            state.game.clicks++;
            
            game.updateDisplay();

            if (state.game.clicks >= state.game.maxClicks) {
                game.endGame();
                return;
            }
            
            game.moveTarget();
        },

        handleContainerClick(e) {
            if (!state.game.active || e.target !== elements.game.container) return;
            state.game.totalAttempts++;
            game.updateDisplay();
        },

        updateDisplay() {
            elements.game.clicks.textContent = state.game.clicks;
            elements.game.accuracy.textContent = Math.round((state.game.clicks / state.game.totalAttempts) * 100);
        },

        endGame() {
            state.game.active = false;
            elements.game.target.style.display = 'none';
            elements.game.startButton.style.display = 'block';
            elements.game.clickLimit.disabled = false;

            const accuracy = Math.round((state.game.clicks / state.game.totalAttempts) * 100);
            const avgTime = Math.round(state.game.totalTime / state.game.clicks);
            elements.finalStats.accuracy.textContent = accuracy;
            elements.finalStats.time.textContent = avgTime;

            // Save results to server
            saveResultsToServer(accuracy, avgTime);

            elements.screens.gameOver.style.display = 'flex';
            requestAnimationFrame(() => {
                elements.screens.gameOver.classList.add('active');
            });
        },

        handleRestart() {
            elements.screens.gameOver.classList.remove('active');
            setTimeout(() => {
                elements.screens.gameOver.style.display = 'none';
                
                // Reset game state
                state.game.clicks = 0;
                state.game.active = false;
                state.game.totalTime = 0;
                state.game.totalAttempts = 0;
                
                // Reset UI
                elements.game.clicks.textContent = '0';
                elements.game.avgTime.textContent = '0';
                elements.game.accuracy.textContent = '100';
                elements.game.target.style.display = 'none';
                elements.game.startButton.style.display = 'block';
                elements.game.clickLimit.disabled = false;
                elements.game.settings.classList.remove('hidden');
            }, 300);
        },

        moveTarget() {
            elements.game.target.style.display = 'block';
            
            const containerRect = elements.game.container.getBoundingClientRect();
            const padding = 40;
            const targetWidth = elements.game.target.offsetWidth;
            const targetHeight = elements.game.target.offsetHeight;
            
            const statsHeight = elements.game.stats.offsetHeight;
            // Use 0 for settings height when hidden
            const settingsHeight = elements.game.settings.classList.contains('hidden') ? 0 : state.game.settingsHeight;
            const topOffset = statsHeight + padding;
            
            const bounds = {
                minX: padding,
                maxX: containerRect.width - targetWidth - padding,
                minY: topOffset,
                maxY: containerRect.height - targetHeight - padding
            };

            if (bounds.maxX < bounds.minX) bounds.maxX = bounds.minX;
            if (bounds.maxY < bounds.minY) bounds.maxY = bounds.minY;

            const newX = Math.max(bounds.minX, Math.floor(Math.random() * bounds.maxX));
            const newY = Math.max(bounds.minY, Math.floor(Math.random() * bounds.maxY));

            Object.assign(elements.game.target.style, {
                position: 'absolute',
                left: `${newX}px`,
                top: `${newY}px`,
                display: 'block'
            });
        },

        fadeIn(element, delay) {
            element.style.opacity = '0';
            setTimeout(() => {
                element.style.transition = 'opacity 1s ease-in';
                element.style.opacity = '1';
            }, delay);
        }
    };

    /**
     * Screen Manager
     * Handles transitions between different game screens
     */
    const screens = {
        init() {
            this._bindEvents();
        },

        _bindEvents() {
            document.getElementById('enterGame').addEventListener('click', () => {
                this.transition(elements.screens.welcome, elements.screens.game);
            });
        },

        transition(from, to) {
            from.classList.add('screen-transition-exit');
            to.style.display = 'block';
            to.classList.add('screen-transition-enter');
            
            setTimeout(() => {
                from.style.display = 'none';
                from.classList.remove('screen-transition-exit');
                to.classList.remove('screen-transition-enter');
                elements.audio.player.volume = 0.5;
                elements.audio.player.play().catch(console.error);
            }, 500);
        }
    };

    // Initialize all components
    audio.init();
    game.init();
    screens.init();
});
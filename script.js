// Add this at the beginning of script.js
class LoginManager {
    constructor() {
        // Replace with the hash you just generated
        this.hashedPassword = '20dd4228d8d162ed9c61dbc181ff8dbfbbc1aa5f650a3b0b9a656c41ac677138';
        this.isLoggedIn = false;
        
        // Check if already logged in
        this.checkLoginStatus();
    }
    
    // Add this new method to hash passwords
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }
    
    checkLoginStatus() {
        this.isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
        if (this.isLoggedIn) {
            this.showApp();
        } else {
            this.showLoginScreen();
        }
    }
    
    showLoginScreen() {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app-content').style.display = 'none';
        
        // Add login form listener
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
    }
    
    showApp() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
    }
    
    async handleLogin() {
        const enteredPassword = document.getElementById('password-input').value;
        const hashedInput = await this.hashPassword(enteredPassword);
        
        if (hashedInput === this.hashedPassword) {
            this.isLoggedIn = true;
            sessionStorage.setItem('isLoggedIn', 'true');
            
            // Show access animation
            await this.showAccessAnimation();
            
            // After animation completes, show the app
            this.showApp();
            const app = new FlashcardsManager();
        } else {
            this.showToast('Falsches Passwort!');
        }
    }
    
    async showAccessAnimation() {
        const animation = document.getElementById('access-animation');
        const terminal = animation.querySelector('.terminal-text');
        const accessGranted = animation.querySelector('.access-granted');
        
        document.getElementById('login-screen').style.display = 'none';
        animation.style.display = 'flex';
        
        const lines = [
            'INITIATING SECURE CONNECTION...',
            'VERIFYING CREDENTIALS...',
            'DECRYPTING DATABASE...',
            'LOADING FLASHCARDS...',
            'ESTABLISHING SECURE SESSION...',
            'INITIALIZING INTERFACE...'
        ];
        
        // Speed up the typing (reduced from 50ms to 12ms per character)
        for (let line of lines) {
            const lineElement = document.createElement('div');
            lineElement.className = 'terminal-line';
            terminal.appendChild(lineElement);
            
            for (let char of line) {
                lineElement.textContent += char;
                await new Promise(r => setTimeout(r, 12));
            }
            lineElement.style.opacity = '1';
            // Reduced wait between lines from 500ms to 125ms
            await new Promise(r => setTimeout(r, 125));
        }
        
        // Reduced wait before "ACCESS GRANTED" from 1000ms to 250ms
        await new Promise(r => setTimeout(r, 250));
        accessGranted.style.animation = 'accessGranted 0.5s forwards';
        
        // Reduced final wait from 2000ms to 500ms
        await new Promise(r => setTimeout(r, 500));
        
        // Add a cool transition to reveal the app
        const appContent = document.getElementById('app-content');
        appContent.style.display = 'block';
        appContent.style.opacity = '0';
        appContent.style.transform = 'scale(0.9) translateY(20px)';
        
        animation.style.animation = 'fadeOut 0.5s forwards';
        await new Promise(r => setTimeout(r, 500));
        animation.style.display = 'none';
        
        // Reveal the app with a cool animation
        appContent.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        appContent.style.opacity = '1';
        appContent.style.transform = 'scale(1) translateY(0)';
    }
    
    showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }
}

// Card class to manage each flashcard with spaced repetition
class Card {
    constructor(german, french) {
        this.german = german;
        this.french = french;
        this.box = 0; // Box 0 = new/difficult, Box 4 = easy/well-known
        this.nextReviewDate = new Date();
    }
    
    // Mark card as correct and move to next box
    markCorrect() {
        this.box = Math.min(4, this.box + 1);
        this.scheduleNextReview();
    }
    
    // Mark card as incorrect and move to box 0
    markIncorrect() {
        this.box = 0;
        this.scheduleNextReview();
    }
    
    // Schedule next review based on current box
    scheduleNextReview() {
        const now = new Date();
        switch(this.box) {
            case 0: // Review immediately
                this.nextReviewDate = now;
                break;
            case 1: // Review in 1 day
                this.nextReviewDate = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
                break;
            case 2: // Review in 3 days
                this.nextReviewDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
                break;
            case 3: // Review in 7 days
                this.nextReviewDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                break;
            case 4: // Review in 14 days
                this.nextReviewDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
                break;
        }
    }
    
    // Check if card is due for review
    isDue() {
        // For testing: return true if the card isn't mastered (box 4)
        return this.box < 4;
        // Original time-based check:
        // return new Date() >= this.nextReviewDate;
    }
}

// Flashcards manager
class FlashcardsManager {
    constructor() {
        this.cards = [];
        this.currentCardIndex = 0;
        this.correctCount = 0;
        this.wrongCount = 0;
        
        // DOM elements
        this.questionElement = document.getElementById('question');
        this.answerElement = document.getElementById('answer');
        this.flipBtn = document.getElementById('flip-btn');
        this.correctBtn = document.getElementById('correct-btn');
        this.wrongBtn = document.getElementById('wrong-btn');
        this.cardElement = document.querySelector('.card');
        this.cardsRemainingElement = document.getElementById('cards-remaining');
        this.correctCountElement = document.getElementById('correct-count');
        this.wrongCountElement = document.getElementById('wrong-count');
        
        // Add new elements for adding cards
        this.addCardForm = document.getElementById('add-card-form');
        this.germanInput = document.getElementById('german-input');
        this.frenchInput = document.getElementById('french-input');
        this.addBtn = document.getElementById('add-btn');
        this.exportBtn = document.getElementById('export-btn');
        this.importBtn = document.getElementById('import-btn');
        this.fileInput = document.getElementById('file-input');
        
        // Initialize event listeners
        this.initEventListeners();
        
        // Load cards from localStorage or use example cards if none exist
        this.loadCards();
        
        // Start the session
        this.startSession();
    }
    
    // Initialize event listeners
    initEventListeners() {
        this.flipBtn.addEventListener('click', () => this.flipCard());
        this.correctBtn.addEventListener('click', () => this.handleAnswer(true));
        this.wrongBtn.addEventListener('click', () => this.handleAnswer(false));
        
        // Add new event listeners for adding cards
        this.addCardForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addNewCard();
        });
        
        this.exportBtn.addEventListener('click', () => this.exportCards());
        this.importBtn.addEventListener('click', () => this.fileInput.click());
        
        // Update file input to work better with iOS
        this.fileInput.accept = '.json,application/json';
        this.fileInput.addEventListener('change', (e) => this.importCards(e));
    }
    
    // Load cards from localStorage
    loadCards() {
        const savedCards = localStorage.getItem('flashcards');
        
        if (savedCards) {
            // Parse the saved cards and convert dates back to Date objects
            const parsedCards = JSON.parse(savedCards);
            
            this.cards = parsedCards.map(card => {
                const newCard = new Card(card.german, card.french);
                newCard.box = card.box;
                newCard.nextReviewDate = new Date(card.nextReviewDate);
                return newCard;
            });
            
            console.log(`Loaded ${this.cards.length} cards from localStorage`);
        } else {
            // No saved cards, use example cards
            this.addExampleCards();
            console.log('No saved cards found, loaded example cards');
        }
    }
    
    // Save cards to localStorage
    saveCards() {
        localStorage.setItem('flashcards', JSON.stringify(this.cards));
        console.log(`Saved ${this.cards.length} cards to localStorage`);
    }
    
    // Add a new card from the form
    addNewCard() {
        const german = this.germanInput.value.trim();
        const french = this.frenchInput.value.trim();
        
        if (german && french) {
            const newCard = new Card(german, french);
            this.cards.push(newCard);
            
            // Save cards to localStorage
            this.saveCards();
            
            // Reset form
            this.germanInput.value = '';
            this.frenchInput.value = '';
            
            // Refresh the session to include the new card
            this.startSession();
            
            // Show toast instead of alert
            this.showToast('Karte hinzugefügt!');
        } else {
            this.showToast('Bitte füllen Sie beide Felder aus!');
        }
    }
    
    // Export cards as JSON file
    exportCards() {
        const data = JSON.stringify(this.cards, null, 2);
        
        // Create blob and URL
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = 'flashcards.json';
        a.style.display = 'none';
        
        // For iOS Safari, we need to use a different approach
        if (navigator.userAgent.match(/iPhone|iPad|iPod/i)) {
            // Open in new tab which allows saving to Files
            window.open(url, '_blank');
            URL.revokeObjectURL(url);
            this.showToast('Datei öffnen und "Auf iPhone/iPad speichern" wählen');
        } else {
            // Normal download for other browsers
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }
    
    // Import cards from JSON file
    importCards(e) {
        const file = e.target.files[0];
        
        if (file) {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const importedCards = JSON.parse(event.target.result);
                    
                    this.cards = importedCards.map(card => {
                        const newCard = new Card(card.german, card.french);
                        newCard.box = card.box;
                        newCard.nextReviewDate = new Date(card.nextReviewDate);
                        return newCard;
                    });
                    
                    // Save to localStorage
                    this.saveCards();
                    
                    // Refresh the session
                    this.startSession();
                    
                    alert(`${this.cards.length} Karten importiert!`);
                } catch (error) {
                    alert('Fehler beim Importieren: ' + error.message);
                }
            };
            
            reader.readAsText(file);
        }
    }
    
    // Start a new review session
    startSession() {
        // Filter cards that are due for review
        this.dueCards = this.cards.filter(card => card.isDue());
        this.shuffleCards();
        this.updateStats();
        
        if (this.dueCards.length > 0) {
            this.showCard();
        } else {
            this.questionElement.textContent = "Keine Karten zur Wiederholung";
            this.flipBtn.disabled = true;
        }
    }
    
    // Shuffle the due cards
    shuffleCards() {
        for (let i = this.dueCards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.dueCards[i], this.dueCards[j]] = [this.dueCards[j], this.dueCards[i]];
        }
        this.currentCardIndex = 0;
    }
    
    // Show the current card
    showCard() {
        if (this.currentCardIndex < this.dueCards.length) {
            const currentCard = this.dueCards[this.currentCardIndex];
            
            // Only update content when card is not flipped
            if (!this.cardElement.classList.contains('flipped')) {
                this.questionElement.textContent = currentCard.german;
                this.answerElement.textContent = currentCard.french;
            }
            
            this.flipBtn.disabled = false;
            this.correctBtn.disabled = false;
            this.wrongBtn.disabled = false;
        } else {
            // No more cards to review
            this.questionElement.textContent = "Keine weiteren Karten";
            this.answerElement.textContent = "";
            this.flipBtn.disabled = true;
            this.correctBtn.disabled = true;
            this.wrongBtn.disabled = true;
        }
    }
    
    // Flip the card to show answer
    flipCard() {
        this.cardElement.classList.add('flipped');
    }
    
    // Handle user's answer
    handleAnswer(isCorrect) {
        const currentCard = this.dueCards[this.currentCardIndex];
        
        if (isCorrect) {
            currentCard.markCorrect();
            this.correctCount++;
        } else {
            currentCard.markIncorrect();
            this.wrongCount++;
        }
        
        // Save changes to localStorage
        this.saveCards();
        
        this.currentCardIndex++;
        this.updateStats();
        
        // Add transition for smooth card flip back
        this.cardElement.classList.remove('flipped');
        
        // Wait for the flip animation to complete before showing next card
        setTimeout(() => {
            const nextCard = this.dueCards[this.currentCardIndex];
            if (nextCard) {
                this.questionElement.textContent = nextCard.german;
                this.answerElement.textContent = nextCard.french;
            }
            this.showCard();
        }, 300); // Half of the flip animation duration (0.6s)
    }
    
    // Update statistics display
    updateStats() {
        this.cardsRemainingElement.textContent = this.dueCards.length - this.currentCardIndex;
        this.correctCountElement.textContent = this.correctCount;
        this.wrongCountElement.textContent = this.wrongCount;
    }
    
    // Add example German-French word pairs
    addExampleCards() {
        const wordPairs = [
            { german: "der Hund", french: "le chien" },
            { german: "die Katze", french: "le chat" },
            { german: "das Haus", french: "la maison" },
            { german: "der Tisch", french: "la table" },
            { german: "die Tür", french: "la porte" },
            { german: "das Fenster", french: "la fenêtre" },
            { german: "der Stuhl", french: "la chaise" },
            { german: "die Schule", french: "l'école" },
            { german: "das Buch", french: "le livre" },
            { german: "der Computer", french: "l'ordinateur" }
        ];
        
        wordPairs.forEach(pair => {
            this.cards.push(new Card(pair.german, pair.french));
        });
    }

    // Add this method to the FlashcardsManager class
    showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        
        // Hide toast after 2 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }
}

// Modify the initialization at the bottom of script.js
document.addEventListener('DOMContentLoaded', () => {
    const loginManager = new LoginManager();
}); 
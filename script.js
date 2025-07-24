/**
 * ==========================================================================
 * PILOUNE - SCRIPT JAVASCRIPT
 * Application fantôme de compagnie - Logique principale
 * ==========================================================================
 */

'use strict';

// ==========================================================================
// ÉTAT GLOBAL DE PILOUNE
// ==========================================================================

/**
 * État principal de Piloune
 * Contient toutes les statistiques et informations sur l'état du fantôme
 */
let piloune = {
    // Stats principales (0-100)
    bonheur: 50,
    vitalite: 50,
    repos: 50,
    proprete: 50,
    psy: 50,
    
    // États spéciaux
    isRonron: false,
    ronronModeUnlocked: false,
    
    // Système d'actions en mode ronron
    actionCount: 0,
    currentAction: null,
    
    // Message affiché à l'utilisateur
    message: "Coucou ! Je suis Piloune ! 👻",
    
    // Timestamp de la dernière action
    lastAction: Date.now()
};

/**
 * Configuration du jeu
 */
const CONFIG = {
    // Probabilités des événements aléatoires
    PROBABILITY_DANIEL_REVEILLE: 0.1,    // 1/10 pour dormir
    PROBABILITY_WATER_EAR_DOUCHE: 0.1,   // 1/10 pour douche
    PROBABILITY_WATER_EAR_SPA: 0.2,      // 1/5 pour spa
    PROBABILITY_ATECO: 0.1,              // 1/10 pour coco pops
    PROBABILITY_DANIEL_SE_BARRE: 0.1,    // 1/10 pour actions psy
    
    // Seuils de gameplay
    THRESHOLD_RONRON: 20,                // Seuil pour devenir ronron
    THRESHOLD_SORTIE_RONRON: 40,         // Seuil pour sortir du mode ronron
    ACTIONS_REQUISES_RONRON: 3,          // Nombre d'actions répétées en mode ronron
    
    // Timing
    DEGRADATION_INTERVAL: 60000,         // 1 minute en millisecondes
    ANIMATION_DURATION: 1500,            // Durée des animations
    WATER_MESSAGE_DURATION: 3000         // Durée du message d'eau dans l'oreille
};

// ==========================================================================
// ÉLÉMENTS DU DOM
// ==========================================================================

/**
 * Cache des éléments DOM pour optimiser les performances
 */
const elements = {
    // Affichage principal
    character: null,
    message: null,
    ronronIndicator: null,
    waterMessage: null,
    animationOverlay: null,
    
    // Interface
    modeIndicator: null,
    modeCounter: null,
    achievement: null,
    
    // Stats - Valeurs
    bonheurValue: null,
    vitaliteValue: null,
    reposValue: null,
    propreteValue: null,
    psyValue: null,
    
    // Stats - Barres
    bonheurBar: null,
    vitaliteBar: null,
    reposBar: null,
    propreteBar: null,
    psyBar: null
};

/**
 * Initialise la cache des éléments DOM
 */
function initElements() {
    // Affichage principal
    elements.character = document.getElementById('piloune-character');
    elements.message = document.getElementById('piloune-message');
    elements.ronronIndicator = document.getElementById('ronron-indicator');
    elements.waterMessage = document.getElementById('water-message');
    elements.animationOverlay = document.getElementById('animation-overlay');
    
    // Interface
    elements.modeIndicator = document.getElementById('mode-indicator');
    elements.modeCounter = document.getElementById('mode-counter');
    elements.achievement = document.getElementById('achievement');
    
    // Stats - Valeurs
    elements.bonheurValue = document.getElementById('bonheur-value');
    elements.vitaliteValue = document.getElementById('vitalite-value');
    elements.reposValue = document.getElementById('repos-value');
    elements.propreteValue = document.getElementById('proprete-value');
    elements.psyValue = document.getElementById('psy-value');
    
    // Stats - Barres
    elements.bonheurBar = document.getElementById('bonheur-bar');
    elements.vitaliteBar = document.getElementById('vitalite-bar');
    elements.reposBar = document.getElementById('repos-bar');
    elements.propreteBar = document.getElementById('proprete-bar');
    elements.psyBar = document.getElementById('psy-bar');
}

// ==========================================================================
// UTILITAIRES
// ==========================================================================

/**
 * Limite une valeur entre 0 et 100
 * @param {number} value - Valeur à limiter
 * @returns {number} Valeur limitée
 */
function clampStat(value) {
    return Math.min(100, Math.max(0, value));
}

/**
 * Génère un nombre aléatoire avec une probabilité donnée
 * @param {number} probability - Probabilité (0-1)
 * @returns {boolean} Résultat du tirage
 */
function randomChance(probability) {
    return Math.random() < probability;
}

/**
 * Logs avec emoji pour le debug
 * @param {string} message - Message à logger
 * @param {string} emoji - Emoji à afficher
 */
function logPiloune(message, emoji = '👻') {
    console.log(`${emoji} Piloune: ${message}`);
}

// ==========================================================================
// GESTION DE L'INTERFACE
// ==========================================================================

/**
 * Met à jour l'expression de Piloune selon son bonheur et son état
 * @returns {string} Expression emoji
 */
function getPilouneExpression() {
    if (piloune.isRonron) return '😾';
    if (piloune.bonheur >= 80) return '😄';
    if (piloune.bonheur >= 60) return '😊';
    if (piloune.bonheur >= 40) return '😐';
    return '😔';
}

/**
 * Met à jour une statistique dans l'interface
 * @param {string} statName - Nom de la statistique
 * @param {number} value - Valeur de la statistique
 */
function updateStat(statName, value) {
    const valueElement = elements[statName + 'Value'];
    const barElement = elements[statName + 'Bar'];
    
    if (!valueElement || !barElement) return;
    
    // Mise à jour de la valeur
    valueElement.textContent = `${value}/100`;
    
    // Mise à jour de la barre
    barElement.style.width = `${value}%`;
    
    // Couleur selon la valeur
    barElement.className = 'stat-fill ';
    if (value >= 70) {
        barElement.className += 'stat-green';
    } else if (value >= 40) {
        barElement.className += 'stat-yellow';
    } else {
        barElement.className += 'stat-red';
    }
}

/**
 * Met à jour l'interface complète
 */
function updateUI() {
    // Expression de Piloune
    const expression = getPilouneExpression();
    if (elements.character) {
        elements.character.textContent = '👻' + expression;
    }
    
    // Message
    if (elements.message) {
        elements.message.textContent = piloune.message;
    }
    
    // Indicateur ronron
    if (elements.ronronIndicator) {
        elements.ronronIndicator.style.display = piloune.isRonron ? 'block' : 'none';
    }
    
    // Achievement
    if (elements.achievement && piloune.ronronModeUnlocked) {
        elements.achievement.textContent = '🏆 Mode Ronron débloqué !';
    }
    
    // Indicateur de mode
    if (elements.modeIndicator) {
        if (piloune.isRonron) {
            elements.modeIndicator.style.display = 'block';
            if (elements.modeCounter) {
                if (piloune.currentAction) {
                    elements.modeCounter.textContent = `${piloune.currentAction}: ${piloune.actionCount}/3`;
                } else {
                    elements.modeCounter.textContent = '';
                }
            }
        } else {
            elements.modeIndicator.style.display = 'none';
        }
    }
    
    // Mise à jour des stats
    updateStat('bonheur', piloune.bonheur);
    updateStat('vitalite', piloune.vitalite);
    updateStat('repos', piloune.repos);
    updateStat('proprete', piloune.proprete);
    updateStat('psy', piloune.psy);
    
    logPiloune(`UI mise à jour - ${expression} - ${piloune.message.substring(0, 30)}...`);
}

// ==========================================================================
// SYSTÈME D'ANIMATIONS
// ==========================================================================

/**
 * Joue une animation sur le personnage
 * @param {string} type - Type d'animation (eating, happy, music, sleeping, love, shower)
 */
function playAnimation(type) {
    if (!elements.character) return;
    
    // Appliquer la classe d'animation
    elements.character.className = 'piloune-character ' + type;
    
    // Overlay d'animation si nécessaire
    let overlayContent = '';
    switch(type) {
        case 'eating': overlayContent = '🍭'; break;
        case 'music': overlayContent = '📺'; break;
        case 'love': overlayContent = '✨'; break;
    }
    
    if (overlayContent && elements.animationOverlay) {
        elements.animationOverlay.textContent = overlayContent;
        elements.animationOverlay.style.display = 'block';
        
        setTimeout(() => {
            elements.animationOverlay.style.display = 'none';
        }, CONFIG.ANIMATION_DURATION);
    }
    
    // Retirer l'animation après la durée
    setTimeout(() => {
        if (elements.character) {
            elements.character.className = 'piloune-character';
        }
    }, CONFIG.ANIMATION_DURATION);
    
    logPiloune(`Animation ${type} jouée`);
}

/**
 * Affiche le message d'eau dans l'oreille
 */
function showWaterMessage() {
    if (!elements.waterMessage) return;
    
    elements.waterMessage.style.display = 'flex';
    
    setTimeout(() => {
        if (elements.waterMessage) {
            elements.waterMessage.style.display = 'none';
        }
    }, CONFIG.WATER_MESSAGE_DURATION);
    
    logPiloune('Message eau dans l\'oreille affiché', '💧');
}

// ==========================================================================
// SYSTÈME D'ACTIONS
// ==========================================================================

/**
 * Exécute une action sur Piloune
 * @param {string} action - Nom de l'action
 * @param {string|string[]} statsToIncrease - Stat(s) à augmenter
 * @param {number|number[]} amounts - Montant(s) d'augmentation
 * @param {string} successMessage - Message de succès
 */
function performAction(action, statsToIncrease, amounts, successMessage) {
    const requiredActions = piloune.isRonron ? CONFIG.ACTIONS_REQUISES_RONRON : 1;
    
    logPiloune(`Action: ${action} (${piloune.isRonron ? 'Mode ronron' : 'Mode normal'})`);
    
    if (piloune.isRonron) {
        // Mode ronron - actions multiples requises
        if (piloune.currentAction !== action) {
            // Nouvelle action
            piloune.currentAction = action;
            piloune.actionCount = 1;
            piloune.message = `${action} 1/3... Continue !`;
            logPiloune(`Nouvelle action en mode ronron: ${action}`);
        } else {
            // Même action, on incrémente
            piloune.actionCount++;
            
            if (piloune.actionCount >= requiredActions) {
                // Action réussie !
                applyStatChanges(statsToIncrease, amounts);
                
                piloune.actionCount = 0;
                piloune.currentAction = null;
                piloune.message = successMessage;
                
                // Vérifier si on sort du mode ronron
                checkExitRonronMode();
                
                logPiloune(`Action ${action} complétée en mode ronron`);
            } else {
                piloune.message = `${action} ${piloune.actionCount}/3... Continue !`;
                logPiloune(`Progression mode ronron: ${piloune.actionCount}/3`);
            }
        }
    } else {
        // Mode normal - action immédiate
        applyStatChanges(statsToIncrease, amounts);
        piloune.message = successMessage;
        logPiloune(`Action ${action} complétée en mode normal`);
    }
    
    piloune.lastAction = Date.now();
    updateUI();
}

/**
 * Applique les changements de statistiques
 * @param {string|string[]} statsToIncrease - Stat(s) à modifier
 * @param {number|number[]} amounts - Montant(s) de modification
 */
function applyStatChanges(statsToIncrease, amounts) {
    if (Array.isArray(statsToIncrease)) {
        statsToIncrease.forEach((stat, index) => {
            const amount = Array.isArray(amounts) ? amounts[index] : amounts;
            piloune[stat] = clampStat(piloune[stat] + amount);
        });
    } else {
        piloune[statsToIncrease] = clampStat(piloune[statsToIncrease] + amounts);
    }
}

/**
 * Vérifie si Piloune peut sortir du mode ronron
 */
function checkExitRonronMode() {
    if (piloune.isRonron && 
        piloune.bonheur >= CONFIG.THRESHOLD_SORTIE_RONRON && 
        piloune.vitalite >= CONFIG.THRESHOLD_SORTIE_RONRON && 
        piloune.repos >= CONFIG.THRESHOLD_SORTIE_RONRON && 
        piloune.proprete >= CONFIG.THRESHOLD_SORTIE_RONRON && 
        piloune.psy >= CONFIG.THRESHOLD_SORTIE_RONRON) {
        
        piloune.isRonron = false;
        piloune.message = "Je ne suis plus ronron ! Merci ! 😊";
        logPiloune('Sortie du mode ronron', '😊');
    }
}

/**
 * Vérifie si Piloune doit entrer en mode ronron
 */
function checkEnterRonronMode() {
    if (!piloune.isRonron && 
        (piloune.bonheur < CONFIG.THRESHOLD_RONRON || 
         piloune.vitalite < CONFIG.THRESHOLD_RONRON || 
         piloune.repos < CONFIG.THRESHOLD_RONRON || 
         piloune.proprete < CONFIG.THRESHOLD_RONRON || 
         piloune.psy < CONFIG.THRESHOLD_RONRON)) {
        
        piloune.isRonron = true;
        piloune.ronronModeUnlocked = true;
        piloune.message = "Je suis ronron... 😾 Il faut faire les actions 3 fois !";
        piloune.actionCount = 0;
        piloune.currentAction = null;
        logPiloune('Entrée en mode ronron', '😾');
    }
}

// ==========================================================================
// ACTIONS SPÉCIFIQUES DE PILOUNE
// ==========================================================================

/**
 * Action: Donner du sucre
 */
function donnerSucre() {
    playAnimation('eating');
    performAction('Miam sucré', 'vitalite', 25, 'Mmmh délicieux ! 🍭');
}

/**
 * Action: Donner des iris
 */
function donnerIris() {
    playAnimation('happy');
    performAction('Iris', 'bonheur', 20, 'Que ces iris sont belles ! 🌸');
}

/**
 * Action: Regarder Twitch
 */
function regarderTwitch() {
    playAnimation('music');
    performAction('Twitch', 'bonheur', 15, 'Ah, du bon stream ! 📺');
}

/**
 * Action: Prendre sa pétée
 */
function prendrePetee() {
    playAnimation('sleeping');
    performAction('Pétée', ['repos', 'bonheur'], [30, 10], 'Ma pétée me fait du bien ! 😴💨');
}

/**
 * Action: Dormir 15h (avec risque Daniel)
 */
function dormir15h() {
    const isDanielReveille = randomChance(CONFIG.PROBABILITY_DANIEL_REVEILLE);
    
    if (isDanielReveille) {
        playAnimation('sleeping');
        
        // Daniel réveille = tout à zéro + ronron
        piloune.bonheur = 0;
        piloune.vitalite = 0;
        piloune.repos = 0;
        piloune.proprete = 0;
        piloune.psy = 0;
        piloune.isRonron = true;
        piloune.ronronModeUnlocked = true;
        piloune.message = "Daniel vous réveille après 3h de sommeil ! Tout à zéro ! 😾";
        piloune.actionCount = 0;
        piloune.currentAction = null;
        
        logPiloune('Daniel a réveillé Piloune !', '🏃‍♂️');
        updateUI();
    } else {
        playAnimation('sleeping');
        performAction('Dormir 15h', 'repos', 50, 'Quel bon sommeil ! 😴💤');
    }
}

/**
 * Action: Boire du café
 */
function boireCafe() {
    playAnimation('eating');
    performAction('Café', 'vitalite', 35, 'Ça réveille ! ☕');
}

/**
 * Action: Faire un câlin
 */
function faireCalin() {
    playAnimation('love');
    performAction('Câlin', ['bonheur', 'repos'], [10, 15], 'J\'adore les câlins ! 💕');
}

/**
 * Action: Donner des Coco Pops (avec risque "À téco")
 */
function donnerCocoPops() {
    const isAteco = randomChance(CONFIG.PROBABILITY_ATECO);
    
    if (isAteco) {
        playAnimation('eating');
        
        // À téco = tout à 100 sauf propreté
        piloune.bonheur = 100;
        piloune.vitalite = 100;
        piloune.repos = 100;
        // piloune.proprete reste inchangée
        piloune.psy = 100;
        piloune.message = "À téco ! 🌟";
        piloune.actionCount = 0;
        piloune.currentAction = null;
        
        logPiloune('À téco !', '🌟');
        updateUI();
    } else {
        playAnimation('eating');
        performAction('Coco Pops', 'proprete', 20, 'Coco Pops pour être propre ! 🥣');
    }
}

/**
 * Action: Inventer TDAH (avec risque Daniel se barre)
 */
function inventerTDAH() {
    const isDanielSeBarre = randomChance(CONFIG.PROBABILITY_DANIEL_SE_BARRE);
    
    if (isDanielSeBarre) {
        playAnimation('music');
        
        piloune.psy = 100;
        piloune.message = "Daniel se barre ! 🏃‍♂️";
        piloune.actionCount = 0;
        piloune.currentAction = null;
        
        logPiloune('Daniel se barre !', '🏃‍♂️');
        updateUI();
    } else {
        playAnimation('music');
        performAction('Inventer TDAH', 'psy', 30, 'Quelle créativité ! 🧠✨');
    }
}

/**
 * Action: Tu ressens quoi ? (avec risque Daniel se barre)
 */
function tuRessensQuoi() {
    const isDanielSeBarre = randomChance(CONFIG.PROBABILITY_DANIEL_SE_BARRE);
    
    if (isDanielSeBarre) {
        playAnimation('happy');
        
        piloune.psy = 100;
        piloune.message = "Daniel se barre ! 🏃‍♂️";
        piloune.actionCount = 0;
        piloune.currentAction = null;
        
        logPiloune('Daniel se barre !', '🏃‍♂️');
        updateUI();
    } else {
        playAnimation('happy');
        performAction('Tu ressens quoi ?', 'psy', 25, 'Ça fait du bien de parler ! 💭');
    }
}

/**
 * Action: Prendre une douche (avec risque eau dans l'oreille)
 */
function prendreDouche() {
    const hasWaterInEar = randomChance(CONFIG.PROBABILITY_WATER_EAR_DOUCHE);
    
    if (hasWaterInEar) {
        playAnimation('shower');
        showWaterMessage();
        
        // Eau dans l'oreille = tout à zéro + ronron
        piloune.bonheur = 0;
        piloune.vitalite = 0;
        piloune.repos = 0;
        piloune.proprete = 0;
        piloune.psy = 0;
        piloune.isRonron = true;
        piloune.ronronModeUnlocked = true;
        piloune.message = "Toutes mes barres sont à zéro ! Je suis ronron ! 😾";
        piloune.actionCount = 0;
        piloune.currentAction = null;
        
        logPiloune('Eau dans l\'oreille à la douche !', '💧');
        updateUI();
    } else {
        playAnimation('shower');
        performAction('Douche', ['bonheur', 'proprete'], [8, 30], 'Toute propre ! ✨');
    }
}

/**
 * Action: Aller au spa (avec risque eau dans l'oreille)
 */
function allerSpa() {
    const hasWaterInEar = randomChance(CONFIG.PROBABILITY_WATER_EAR_SPA);
    
    if (hasWaterInEar) {
        playAnimation('love');
        showWaterMessage();
        
        // Eau dans l'oreille = tout à zéro + ronron
        piloune.bonheur = 0;
        piloune.vitalite = 0;
        piloune.repos = 0;
        piloune.proprete = 0;
        piloune.psy = 0;
        piloune.isRonron = true;
        piloune.ronronModeUnlocked = true;
        piloune.message = "Eau dans l'oreille au spa ! Toutes mes barres sont à zéro ! Je suis ronron ! 😾";
        piloune.actionCount = 0;
        piloune.currentAction = null;
        
        logPiloune('Eau dans l\'oreille au spa !', '💧');
        updateUI();
    } else {
        playAnimation('love');
        performAction('Spa', ['bonheur', 'vitalite', 'repos', 'proprete', 'psy'], [25, 25, 25, 25, 25], 'Que du bonheur au spa ! 🧖‍♀️✨');
    }
}

// ==========================================================================
// SYSTÈME DE DÉGRADATION
// ==========================================================================

/**
 * Dégrade les statistiques de Piloune avec le temps
 */
function degradeStats() {
    logPiloune('Dégradation des stats...', '⏰');
    
    // Réduire toutes les stats de 1
    piloune.bonheur = clampStat(piloune.bonheur - 1);
    piloune.vitalite = clampStat(piloune.vitalite - 1);
    piloune.repos = clampStat(piloune.repos - 1);
    piloune.proprete = clampStat(piloune.proprete - 1);
    piloune.psy = clampStat(piloune.psy - 1);
    
    // Vérifier si on entre en mode ronron
    checkEnterRonronMode();
    
    updateUI();
    
    logPiloune(`Stats après dégradation: B${piloune.bonheur} V${piloune.vitalite} R${piloune.repos} P${piloune.proprete} Psy${piloune.psy}`);
}

// ==========================================================================
// SERVICE WORKER ET PWA
// ==========================================================================

/**
 * Enregistre le service worker pour les fonctionnalités PWA
 */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then((registration) => {
                    logPiloune('Service Worker enregistré avec succès', '⚙️');
                    console.log('SW registration successful: ', registration);
                })
                .catch((registrationError) => {
                    logPiloune('Échec de l\'enregistrement du Service Worker', '❌');
                    console.log('SW registration failed: ', registrationError);
                });
        });
    } else {
        logPiloune('Service Worker non supporté', '⚠️');
    }
}

// ==========================================================================
// GESTION DES PARAMÈTRES URL
// ==========================================================================

/**
 * Gère les raccourcis depuis les paramètres URL
 */
function handleURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    
    if (action) {
        logPiloune(`Action depuis URL: ${action}`, '🔗');
        
        // Exécuter l'action après un délai pour laisser le temps à l'interface de se charger
        setTimeout(() => {
            switch(action) {
                case 'feed':
                    donnerSucre();
                    break;
                case 'spa':
                    allerSpa();
                    break;
                default:
                    logPiloune(`Action URL inconnue: ${action}`, '❓');
            }
        }, 1000);
    }
}

// ==========================================================================
// SAUVEGARDE ET CHARGEMENT (LOCALSTORAGE)
// ==========================================================================

/**
 * Sauvegarde l'état de Piloune dans le localStorage
 */
function saveGame() {
    try {
        const saveData = {
            ...piloune,
            version: '1.0.0',
            savedAt: Date.now()
        };
        localStorage.setItem('piloune-save', JSON.stringify(saveData));
        logPiloune('Jeu sauvegardé', '💾');
    } catch (error) {
        logPiloune('Erreur de sauvegarde: ' + error.message, '❌');
    }
}

/**
 * Charge l'état de Piloune depuis le localStorage
 */
function loadGame() {
    try {
        const saveData = localStorage.getItem('piloune-save');
        if (saveData) {
            const parsed = JSON.parse(saveData);
            
            // Vérifier que la sauvegarde n'est pas trop ancienne (24h max)
            const maxAge = 24 * 60 * 60 * 1000; // 24 heures
            if (Date.now() - parsed.savedAt < maxAge) {
                // Restaurer les stats
                piloune.bonheur = parsed.bonheur || 50;
                piloune.vitalite = parsed.vitalite || 50;
                piloune.repos = parsed.repos || 50;
                piloune.proprete = parsed.proprete || 50;
                piloune.psy = parsed.psy || 50;
                piloune.isRonron = parsed.isRonron || false;
                piloune.ronronModeUnlocked = parsed.ronronModeUnlocked || false;
                
                logPiloune('Jeu chargé depuis la sauvegarde', '📁');
                return true;
            } else {
                logPiloune('Sauvegarde trop ancienne, nouveau jeu', '🗑️');
                localStorage.removeItem('piloune-save');
            }
        }
    } catch (error) {
        logPiloune('Erreur de chargement: ' + error.message, '❌');
    }
    return false;
}

/**
 * Sauvegarde automatique toutes les 30 secondes
 */
function startAutoSave() {
    setInterval(saveGame, 30000); // 30 secondes
    logPiloune('Sauvegarde automatique activée', '🔄');
}

// ==========================================================================
// EASTER EGGS ET SECRETS
// ==========================================================================

/**
 * Konami code pour débloquer des fonctionnalités secrètes
 */
function initKonamiCode() {
    const konamiCode = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65]; // ↑↑↓↓←→←→BA
    let konamiIndex = 0;
    
    document.addEventListener('keydown', (e) => {
        if (e.keyCode === konamiCode[konamiIndex]) {
            konamiIndex++;
            if (konamiIndex === konamiCode.length) {
                // Code secret activé !
                piloune.bonheur = 100;
                piloune.vitalite = 100;
                piloune.repos = 100;
                piloune.proprete = 100;
                piloune.psy = 100;
                piloune.message = "Code secret activé ! Toutes les stats sont au maximum ! 🎉";
                updateUI();
                logPiloune('Code Konami activé !', '🎮');
                konamiIndex = 0;
            }
        } else {
            konamiIndex = 0;
        }
    });
}

// ==========================================================================
// INITIALISATION PRINCIPALE
// ==========================================================================

/**
 * Initialise l'application Piloune
 */
function initPiloune() {
    logPiloune('Initialisation de Piloune...', '🚀');
    
    // Initialiser les éléments DOM
    initElements();
    
    // Charger la sauvegarde si elle existe
    loadGame();
    
    // Mettre à jour l'interface
    updateUI();
    
    // Gérer les paramètres URL
    handleURLParams();
    
    // Démarrer la dégradation des stats
    setInterval(degradeStats, CONFIG.DEGRADATION_INTERVAL);
    
    // Démarrer la sauvegarde automatique
    startAutoSave();
    
    // Enregistrer le service worker
    registerServiceWorker();
    
    // Initialiser les easter eggs
    initKonamiCode();
    
    logPiloune('Piloune est prête ! Amusez-vous bien !', '✨');
}

// ==========================================================================
// ÉVÉNEMENTS ET DÉMARRAGE
// ==========================================================================

// Attendre que le DOM soit chargé
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPiloune);
} else {
    // DOM déjà chargé
    initPiloune();
}

// Sauvegarder avant de quitter la page
window.addEventListener('beforeunload', saveGame);

// Gestion de la visibilité de la page (pause/reprise)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        logPiloune('Application mise en pause', '⏸️');
        saveGame();
    } else {
        logPiloune('Application reprise', '▶️');
        updateUI();
    }
});

// Exposer les fonctions globalement pour les boutons HTML
window.donnerSucre = donnerSucre;
window.donnerIris = donnerIris;
window.regarderTwitch = regarderTwitch;
window.prendrePetee = prendrePetee;
window.dormir15h = dormir15h;
window.boireCafe = boireCafe;
window.faireCalin = faireCalin;
window.donnerCocoPops = donnerCocoPops;
window.inventerTDAH = inventerTDAH;
window.tuRessensQuoi = tuRessensQuoi;
window.prendreDouche = prendreDouche;
window.allerSpa = allerSpa;

// Exposer l'état pour le debug (en développement)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.piloune = piloune;
    window.debugPiloune = {
        resetStats: () => {
            piloune.bonheur = 50;
            piloune.vitalite = 50;
            piloune.repos = 50;
            piloune.proprete = 50;
            piloune.psy = 50;
            piloune.isRonron = false;
            updateUI();
            logPiloune('Stats réinitialisées', '🔄');
        },
        maxStats: () => {
            piloune.bonheur = 100;
            piloune.vitalite = 100;
            piloune.repos = 100;
            piloune.proprete = 100;
            piloune.psy = 100;
            updateUI();
            logPiloune('Stats maximisées', '⬆️');
        },
        forceRonron: () => {
            piloune.isRonron = true;
            piloune.ronronModeUnlocked = true;
            piloune.message = "Mode ronron forcé pour le debug";
            updateUI();
            logPiloune('Mode ronron forcé', '🔧');
        }
    };
    logPiloune('Fonctions de debug disponibles dans window.debugPiloune', '🐛');
}

logPiloune('Script chargé avec succès !', '✅');
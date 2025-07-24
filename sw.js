/**
 * ==========================================================================
 * PILOUNE - SERVICE WORKER
 * PWA Service Worker pour fonctionnalités offline et notifications
 * ==========================================================================
 */

'use strict';

// ==========================================================================
// CONFIGURATION
// ==========================================================================

/**
 * Version du cache - Incrémenter pour forcer la mise à jour
 */
const CACHE_VERSION = 'v1.2.0';
const CACHE_NAME = `piloune-${CACHE_VERSION}`;

/**
 * Nom du cache pour les données dynamiques
 */
const DYNAMIC_CACHE_NAME = `piloune-dynamic-${CACHE_VERSION}`;

/**
 * Fichiers à mettre en cache (Core App Shell)
 * Ces fichiers sont essentiels pour que l'app fonctionne offline
 */
const urlsToCache = [
  // Pages principales
  './',
  './index.html',
  
  // Assets CSS/JS
  './style.css',
  './script.js',
  './manifest.json',
  
  // Icônes PWA
  './favicon.ico',
  './icon-72x72.png',
  './icon-96x96.png',
  './icon-128x128.png',
  './icon-144x144.png',
  './icon-152x152.png',
  './icon-192x192.png',
  './icon-384x384.png',
  './icon-512x512.png',
  
  // Screenshots (optionnel)
  './screenshot-mobile.png',
  './screenshot-desktop.png'
];

/**
 * Ressources externes à mettre en cache
 */
const externalResources = [
  // Ajouter ici des CDN si nécessaire
  // 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

/**
 * Configuration des stratégies de cache
 */
const CACHE_STRATEGIES = {
  // Durée de vie du cache dynamique (7 jours)
  DYNAMIC_CACHE_LIFETIME: 7 * 24 * 60 * 60 * 1000,
  
  // Nombre maximum d'éléments en cache dynamique
  DYNAMIC_CACHE_MAX_ITEMS: 50,
  
  // Timeout pour les requêtes réseau (5 secondes)
  NETWORK_TIMEOUT: 5000
};

// ==========================================================================
// UTILITAIRES
// ==========================================================================

/**
 * Logs avec emoji pour le service worker
 * @param {string} message - Message à logger
 * @param {string} emoji - Emoji à afficher
 */
function logSW(message, emoji = '👻') {
  console.log(`${emoji} SW Piloune: ${message}`);
}

/**
 * Nettoie les anciens caches
 * @returns {Promise} Promise de nettoyage
 */
async function cleanOldCaches() {
  const cacheNames = await caches.keys();
  const oldCaches = cacheNames.filter(name => 
    name.startsWith('piloune-') && name !== CACHE_NAME && name !== DYNAMIC_CACHE_NAME
  );
  
  if (oldCaches.length > 0) {
    logSW(`Suppression de ${oldCaches.length} ancien(s) cache(s)`, '🗑️');
    return Promise.all(oldCaches.map(name => caches.delete(name)));
  }
}

/**
 * Vérifie si une URL doit être mise en cache dynamiquement
 * @param {string} url - URL à vérifier
 * @returns {boolean} True si doit être cachée
 */
function shouldCacheDynamically(url) {
  const urlObj = new URL(url);
  
  // Ne pas cacher les URLs avec des paramètres de debug
  if (urlObj.searchParams.has('debug') || urlObj.searchParams.has('nocache')) {
    return false;
  }
  
  // Cacher les images et fonts
  if (url.match(/\.(png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf)$/i)) {
    return true;
  }
  
  // Cacher les pages HTML
  if (url.includes('.html') || urlObj.pathname === '/') {
    return true;
  }
  
  return false;
}

/**
 * Stratégie Cache First avec fallback réseau
 * @param {Request} request - Requête à traiter
 * @returns {Promise<Response>} Réponse cachée ou réseau
 */
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      logSW(`Cache hit: ${request.url}`, '💾');
      return cachedResponse;
    }
    
    // Si pas en cache, aller sur le réseau
    const networkResponse = await fetch(request);
    
    // Mettre en cache si approprié
    if (networkResponse.ok && shouldCacheDynamically(request.url)) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
      logSW(`Mise en cache dynamique: ${request.url}`, '📥');
    }
    
    return networkResponse;
  } catch (error) {
    logSW(`Erreur cache first: ${error.message}`, '❌');
    
    // Fallback pour les pages HTML
    if (request.destination === 'document') {
      const fallback = await caches.match('./index.html');
      if (fallback) {
        logSW('Fallback vers index.html', '🔄');
        return fallback;
      }
    }
    
    throw error;
  }
}

/**
 * Stratégie Network First avec fallback cache
 * @param {Request} request - Requête à traiter
 * @returns {Promise<Response>} Réponse réseau ou cachée
 */
async function networkFirst(request) {
  try {
    // Essayer le réseau d'abord avec timeout
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), CACHE_STRATEGIES.NETWORK_TIMEOUT)
      )
    ]);
    
    // Mettre en cache si succès
    if (networkResponse.ok && shouldCacheDynamically(request.url)) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    logSW(`Network first fallback to cache: ${request.url}`, '📡');
    
    // Fallback vers le cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// ==========================================================================
// ÉVÉNEMENTS DU SERVICE WORKER
// ==========================================================================

/**
 * Installation du Service Worker
 */
self.addEventListener('install', (event) => {
  logSW('Installation en cours...', '⚙️');
  
  event.waitUntil(
    (async () => {
      try {
        // Ouvrir le cache principal
        const cache = await caches.open(CACHE_NAME);
        logSW('Cache principal ouvert', '📦');
        
        // Mettre en cache les fichiers essentiels
        await cache.addAll(urlsToCache);
        logSW(`${urlsToCache.length} fichiers mis en cache`, '✅');
        
        // Mettre en cache les ressources externes si nécessaire
        if (externalResources.length > 0) {
          try {
            await cache.addAll(externalResources);
            logSW(`${externalResources.length} ressources externes cachées`, '🌐');
          } catch (error) {
            logSW(`Erreur cache ressources externes: ${error.message}`, '⚠️');
          }
        }
        
        // Forcer l'activation immédiate
        await self.skipWaiting();
        logSW('Installation terminée avec succès', '🎉');
        
      } catch (error) {
        logSW(`Erreur installation: ${error.message}`, '❌');
        throw error;
      }
    })()
  );
});

/**
 * Activation du Service Worker
 */
self.addEventListener('activate', (event) => {
  logSW('Activation en cours...', '🚀');
  
  event.waitUntil(
    (async () => {
      try {
        // Nettoyer les anciens caches
        await cleanOldCaches();
        
        // Prendre le contrôle de tous les clients
        await self.clients.claim();
        
        logSW('Activation terminée - SW actif', '✨');
        
        // Notifier tous les clients de la mise à jour
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_UPDATED',
            version: CACHE_VERSION
          });
        });
        
      } catch (error) {
        logSW(`Erreur activation: ${error.message}`, '❌');
      }
    })()
  );
});

/**
 * Interception des requêtes réseau
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return;
  }
  
  // Ignorer les requêtes de debug/dev
  if (url.pathname.includes('hot-update') || url.pathname.includes('sockjs')) {
    return;
  }
  
  // Stratégie selon le type de ressource
  if (urlsToCache.some(cachedUrl => request.url.includes(cachedUrl))) {
    // Fichiers essentiels : Cache First
    event.respondWith(cacheFirst(request));
  } else if (request.destination === 'document') {
    // Pages HTML : Network First
    event.respondWith(networkFirst(request));
  } else {
    // Autres ressources : Cache First
    event.respondWith(cacheFirst(request));
  }
});

// ==========================================================================
// NOTIFICATIONS PUSH
// ==========================================================================

/**
 * Réception d'une notification push
 */
self.addEventListener('push', (event) => {
  logSW('Notification push reçue', '🔔');
  
  let data = {
    title: 'Piloune vous appelle ! 👻',
    body: 'Votre fantôme de compagnie a besoin de vous !',
    icon: './icon-192x192.png',
    badge: './icon-72x72.png',
    data: { url: './' }
  };
  
  // Parser les données si disponibles
  if (event.data) {
    try {
      const pushData = event.data.json();
      data = { ...data, ...pushData };
    } catch (error) {
      logSW(`Erreur parsing push data: ${error.message}`, '⚠️');
    }
  }
  
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [100, 50, 100, 50, 100],
    data: data.data,
    actions: [
      {
        action: 'open',
        title: 'Voir Piloune 👻',
        icon: './icon-192x192.png'
      },
      {
        action: 'feed',
        title: 'Nourrir 🍭',
        icon: './icon-192x192.png'
      },
      {
        action: 'dismiss',
        title: 'Plus tard ⏰',
        icon: './icon-192x192.png'
      }
    ],
    requireInteraction: false,
    tag: 'piloune-care',
    renotify: true,
    silent: false
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

/**
 * Clic sur une notification
 */
self.addEventListener('notificationclick', (event) => {
  const { action, notification } = event;
  
  logSW(`Clic notification - Action: ${action || 'default'}`, '👆');
  
  // Fermer la notification
  notification.close();
  
  // Actions selon le bouton cliqué
  let urlToOpen = './';
  
  switch (action) {
    case 'open':
      urlToOpen = './';
      break;
    case 'feed':
      urlToOpen = './?action=feed';
      break;
    case 'dismiss':
      return; // Ne rien faire
    default:
      urlToOpen = notification.data?.url || './';
  }
  
  // Ouvrir ou focuser l'application
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });
      
      // Chercher une fenêtre ouverte
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          await client.focus();
          client.navigate(urlToOpen);
          logSW('Fenêtre existante focusée', '🪟');
          return;
        }
      }
      
      // Ouvrir une nouvelle fenêtre
      await self.clients.openWindow(urlToOpen);
      logSW('Nouvelle fenêtre ouverte', '🆕');
    })()
  );
});

/**
 * Fermeture d'une notification
 */
self.addEventListener('notificationclose', (event) => {
  logSW('Notification fermée', '❌');
  
  // Analytics ou tracking si nécessaire
  // sendAnalytics('notification_closed', { tag: event.notification.tag });
});

// ==========================================================================
// SYNCHRONISATION EN ARRIÈRE-PLAN
// ==========================================================================

/**
 * Synchronisation en arrière-plan
 */
self.addEventListener('sync', (event) => {
  logSW(`Sync en arrière-plan: ${event.tag}`, '🔄');
  
  if (event.tag === 'piloune-sync') {
    event.waitUntil(syncPilouneData());
  } else if (event.tag === 'piloune-stats-backup') {
    event.waitUntil(backupStats());
  }
});

/**
 * Synchronise les données de Piloune
 */
async function syncPilouneData() {
  try {
    logSW('Synchronisation des données Piloune...', '📊');
    
    // Ici on pourrait synchroniser avec un serveur
    // Pour l'instant, on se contente de vérifier le localStorage
    
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        timestamp: Date.now()
      });
    });
    
    logSW('Synchronisation terminée', '✅');
  } catch (error) {
    logSW(`Erreur synchronisation: ${error.message}`, '❌');
  }
}

/**
 * Sauvegarde les statistiques
 */
async function backupStats() {
  try {
    logSW('Sauvegarde des stats en cours...', '💾');
    
    // Ici on pourrait envoyer les stats vers un serveur cloud
    // Pour l'instant, on simule juste la sauvegarde
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    logSW('Sauvegarde terminée', '☁️');
  } catch (error) {
    logSW(`Erreur sauvegarde: ${error.message}`, '❌');
  }
}

// ==========================================================================
// GESTION DES MESSAGES
// ==========================================================================

/**
 * Messages depuis l'application principale
 */
self.addEventListener('message', (event) => {
  const { data } = event;
  
  logSW(`Message reçu: ${data.type}`, '💬');
  
  switch (data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({
        type: 'VERSION_RESPONSE',
        version: CACHE_VERSION
      });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({
          type: 'CACHE_CLEARED'
        });
      });
      break;
      
    case 'PILOUNE_STATS_UPDATE':
      // Déclencher une sauvegarde si nécessaire
      if (data.stats && data.stats.isRonron) {
        scheduleNotification('Piloune est ronron ! Elle a besoin de vous ! 😾');
      }
      break;
      
    default:
      logSW(`Type de message non géré: ${data.type}`, '❓');
  }
});

/**
 * Vide tous les caches
 */
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    logSW('Tous les caches supprimés', '🗑️');
  } catch (error) {
    logSW(`Erreur suppression caches: ${error.message}`, '❌');
  }
}

/**
 * Programme une notification différée
 */
function scheduleNotification(message, delay = 300000) { // 5 minutes par défaut
  setTimeout(() => {
    self.registration.showNotification('Piloune 👻', {
      body: message,
      icon: './icon-192x192.png',
      badge: './icon-72x72.png',
      tag: 'piloune-reminder'
    });
  }, delay);
}

// ==========================================================================
// GESTION DES ERREURS GLOBALES
// ==========================================================================

/**
 * Gestion des erreurs non capturées
 */
self.addEventListener('error', (event) => {
  logSW(`Erreur globale: ${event.error?.message || event.message}`, '💥');
});

/**
 * Gestion des promesses rejetées
 */
self.addEventListener('unhandledrejection', (event) => {
  logSW(`Promise rejetée: ${event.reason}`, '⚠️');
  event.preventDefault(); // Empêcher l'affichage dans la console
});

// ==========================================================================
// PÉRIODIC BACKGROUND SYNC (Expérimental)
// ==========================================================================

/**
 * Synchronisation périodique (si supportée)
 */
self.addEventListener('periodicsync', (event) => {
  logSW(`Sync périodique: ${event.tag}`, '🔄');
  
  if (event.tag === 'piloune-daily-reminder') {
    event.waitUntil(sendDailyReminder());
  }
});

/**
 * Envoie un rappel quotidien
 */
async function sendDailyReminder() {
  try {
    // Vérifier si l'utilisateur a visité l'app récemment
    const lastVisit = await getLastVisitTime();
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    if (lastVisit < oneDayAgo) {
      await self.registration.showNotification('Piloune s\'ennuie ! 👻', {
        body: 'Votre fantôme de compagnie ne vous a pas vu aujourd\'hui...',
        icon: './icon-192x192.png',
        badge: './icon-72x72.png',
        tag: 'piloune-daily-reminder',
        actions: [
          {
            action: 'open',
            title: 'Voir Piloune',
            icon: './icon-192x192.png'
          }
        ]
      });
      
      logSW('Rappel quotidien envoyé', '📅');
    }
  } catch (error) {
    logSW(`Erreur rappel quotidien: ${error.message}`, '❌');
  }
}

/**
 * Récupère le timestamp de la dernière visite
 */
async function getLastVisitTime() {
  // Ici on pourrait récupérer depuis IndexedDB ou un autre storage
  // Pour l'instant on retourne la date actuelle
  return Date.now();
}

// ==========================================================================
// INITIALISATION
// ==========================================================================

logSW(`Service Worker Piloune ${CACHE_VERSION} chargé`, '🚀');

// Log de démarrage avec informations utiles
logSW(`Cache principal: ${CACHE_NAME}`, '📦');
logSW(`Cache dynamique: ${DYNAMIC_CACHE_NAME}`, '🔄');
logSW(`Fichiers à cacher: ${urlsToCache.length}`, '📁');

// Déclaration que le SW est prêt
logSW('Service Worker prêt et en attente d\'événements', '✨');
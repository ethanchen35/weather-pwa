var cacheName = 'weatherPWA-step-6-1';
var dataCacheName = 'weatherData-v1';
var filesToCache = [
    '/',
    '/manifest.json',
    '/favicon.ico',
    '/index.html',
    '/scripts/app.js',
    '/scripts/initialData.js',
    '/scripts/accuWeatherApiKey.js',
    '/styles/inline.css',
    '/images/clear.png',
    '/images/cloudy-scattered-showers.png',
    '/images/cloudy.png',
    '/images/fog.png',
    '/images/ic_add_white_24px.svg',
    '/images/ic_refresh_white_24px.svg',
    '/images/partly-cloudy.png',
    '/images/rain.png',
    '/images/scattered-showers.png',
    '/images/sleet.png',
    '/images/snow.png',
    '/images/thunderstorm.png',
    '/images/wind.png',
  ];

self.addEventListener('install', function(e) {
  console.log('[ServiceWorker] Install');
  e.waitUntil(
    caches.open(cacheName).then(function(cache) {
      console.log('[ServiceWorker] Caching app shell');
      return cache.addAll(filesToCache);
    }).catch(function(err) {
      return new Error(err);
    })
  );
});

self.addEventListener('activate', function(e) {
  console.log('[ServiceWorker] Activate');
  e.waitUntil(
    caches.keys()
      .then(function(keyList) {
        return Promise.all(
          keyList.filter(function(key) {
            return key != cacheName && key != dataCacheName;
          }).map(function(key) {
            console.log('[ServiceWorker] Removing old cache', key);
            return caches.delete(key);
          })
        );
      }).catch(function(err) {
        return new Error(err);
      })
  );
  return self.clients.claim();
});
/*
  * When the request URL contains dataUrl, the app is asking for fresh
  * weather data. In this case, the service worker always goes to the
  * network and then caches the response. This is called the "Cache then
  * network" strategy:
  * https://jakearchibald.com/2014/offline-cookbook/#cache-then-network
*/

self.addEventListener('fetch', function(e) {
  // console.log('[ServiceWorker] Fetch', e.request.url);
  var dataUrl = 'https://dataservice.accuweather.com/forecasts/v1/daily/5day/';

  // For weather data fetches
  if (e.request.url.indexOf(dataUrl) > -1) {
    // "Cache everything" strategy:
    // Save all data to cache
    
    // e.respondWith(
    //   caches.open(dataCacheName).then(async function(cache) {
    //     return fetch(e.request).then(function(response) {
    //       cache.put(e.request.url, response.clone());
    //       return response;
    //     });
    //   }).catch(function(err) {
    //     return new Error(err);
    //   })
    // )
  
    // Stale-while-revalidate cache strategy:
    // If cache exists, use it first, but also fetch an update for next time.
    e.respondWith(async function() {
      // Start fetch asynchronously
      let fetchResponse = fetch(e.request);

      // Keep Service Worker alive to cache fetched results
      e.waitUntil(
        Promise.all([fetchResponse, caches.open(dataCacheName)])
        .then(function(arr) {
          [response, cache] = arr;
          cache.put(e.request, response.clone());
          // console.log('fetch results saved to cache'); 
          return response;
        })
        .catch(function(err) {
          console.log(new Error(err)); 
        })
      )

      // Check cache first, if no match, wait for fetched results
      return caches.match(e.request)
        .then(function(response) {
          return response || fetchResponse;
        })
        .catch(function(err) {
          console.log(new Error(err)); 
        })
    }())
      
  // For static assets (e.g. app shell data) fetches
  } else {
    // "Cache, falling back to network" strategy:
    // If matching cache, return cache, otherwise fetch
    e.respondWith(
      caches.match(e.request)
        .then(function(response) {
          return response || fetch(e.request);
        }).catch(function(err) {
          return new Error(err);
        })
    );
  }
});
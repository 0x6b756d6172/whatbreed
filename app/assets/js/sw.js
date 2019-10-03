//cache-first network
const CACHE = "precache";
const precacheFiles = [
    "/",
    "/assets/images/figjack.jpg",
    "/assets/images/jack.jpg",
    "/assets/images/fig.jpg",
    "/assets/images/icons/external-link-alt.svg",
    "/assets/js/app.js",
    "/assets/css/styles.less",
    "/assets/data/cat-rankings-source.csv",
    "/assets/data/dog-rankings-source.csv",
    "https://cdnjs.cloudflare.com/ajax/libs/less.js/3.9.0/less.min.js",
    "https://cdn.jsdelivr.net/npm/vue",
    "https://cdn.jsdelivr.net/npm/exif-js",
    "https://unpkg.com/axios/dist/axios.min.js"
];

self.addEventListener("install", function (event) {
    //cache all on install
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE).then(function (cache) {
            return cache.addAll(precacheFiles);
        })
    );
});

self.addEventListener("activate", function (event) {
    event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", function (event) {
    if (event.request.method !== "GET") return;

    event.respondWith(

        //find in cache and respond
        fromCache(event.request).then(

            //if found in cache, update cache
            function (response) {

                //after response, get latest version from server
                event.waitUntil(
                    fetch(event.request).then(function (response) {
                        return updateCache(event.request, response);
                    })
                );

                return response;
            },

            //if not found in cache, check server
            function () {
                return fetch(event.request)

                    // found on server, update cache
                    .then(function (response) {
                        event.waitUntil(updateCache(event.request, response.clone()));
                        return response;
                    })

                    // not in cache, can't get from server
                    .catch(function (error) {
                        console.log("[PWA] - network request failed and no cache." + error);
                    });
            }
        )
    );
});

function fromCache(request) {
    //check cache, return response, else return 
    return caches.open(CACHE).then(function (cache) {
        return cache.match(request).then(function (matching) {
            if (!matching || matching.status === 404) {
                return Promise.reject("no-match");
            }

            return matching;
        });
    });
}

function updateCache(request, response) {
    return caches.open(CACHE).then(function (cache) {
        return cache.put(request, response);
    });
}


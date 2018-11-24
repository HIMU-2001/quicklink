// Inspired by the prefetching logic in Gatsby.js

const support = function (feature) {
  if (typeof document === `undefined`) {
    return false;
  }
  const fakeLink = document.createElement(`link`);
  try {
    if (fakeLink.relList && typeof fakeLink.relList.supports === `function`) {
      return fakeLink.relList.supports(feature);
    }
  } catch (err) {
    return false;
  }
};

const linkPrefetchStrategy = function (url) {
  return new Promise((resolve, reject) => {
    if (typeof document === `undefined`) {
      reject();
      return;
    }

    const link = document.createElement(`link`);
    link.setAttribute(`rel`, `prefetch`);
    link.setAttribute(`href`, url);

    link.onload = resolve;
    link.onerror = reject;

    const parentElement =
      document.getElementsByTagName(`head`)[0] ||
      document.getElementsByName(`script`)[0].parentNode;
    parentElement.appendChild(link);
  });
};

const xhrPrefetchStrategy = function (url) {
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest();
    req.open(`GET`, url, true);
    req.withCredentials = true;

    req.onload = () => {
      if (req.status === 200) {
        resolve();
      } else {
        reject();
      }
    };

    req.send(null);
  });
};

const highPriFetchStrategy = function (url) {
  return new Promise((resolve, reject) => {
    // TODO: Investigate using preload for high-priority
    // fetches. May have to sniff file-extension to provide
    // valid 'as' values. In the future, we may be able to
    // use Priority Hints here.
    if (self.fetch === undefined) {
      xhrPrefetchStrategy(url)
          .then(() => {
            resolve();
          });
    } else {
      // As of 2018, fetch() is high-priority in Chrome
      // and medium-priority in Safari.
      fetch(url, {credentials: `include`})
          .then(() => {
            resolve();
          });
    }
  });
};

const supportedPrefetchStrategy = support(`prefetch`)
  ? linkPrefetchStrategy
  : xhrPrefetchStrategy;

const preFetched = {};

const prefetch = function (url, priority) {
  return new Promise(resolve => {
    if (preFetched[url]) {
      resolve();
      return;
    }

    if (priority && priority === `high`) {
      highPriFetchStrategy(url);
    } else {
      supportedPrefetchStrategy(url)
          .then(() => {
            resolve();
            preFetched[url] = true;
          })
          .catch(() => { });
    };
  });
};

/**
 * Prefetch an array of URLs using rel=prefetch
 * if supported. Falls back to XHR otherwise.
 * @param {Array} urls - Array of URLs to prefetch
 * @param {string} priority - "priority" of the request
 */
const prefetchLinks = function (urls, priority) {
  urls.forEach(url => {
    prefetch(url, priority);
  });
};

export default prefetchLinks;
console.log('\n\n\n\n\n');

function log(message) {
  console.log(`[AudioSelector] ${message}`);
}

const _audioSelector = {
  enabled: true,
  logger: function (message) {
    if (this.enabled) {
      log(message);
    }
  }
};
// --- Intercept XMLHttpRequest constructor to modify response ---
(function () {
  try {
    window.XMLHttpRequest = new Proxy(window.XMLHttpRequest, {
      construct(target, args) {
        if (_audioSelector.enabled === false) {
          return new target(...args);
        }
        _audioSelector.logger('Intercepting XMLHttpRequest constructor');
        const xhr = new target(...args);
        const onloadHandler = [];
        let intercept = false;
        let targetUrl = null;

        const xhrProxy = new Proxy(xhr, {
          get(target, prop) {
            log(`Accessing XMLHttpRequest property: ${prop} of ${targetUrl}`);
            if (target[prop] && typeof target[prop] !== 'function') {
              log(`Property ${prop} is not a function, returning value`);
              return target[prop];
            }
            if (prop === 'open') {
              return function (...args) {
                log(`open method called with args: ${args}`);
                targetUrl = args[1];
                if (args[1] && args[1].includes('/todos/1')) {
                  _audioSelector.logger('Intercepting XMLHttpRequest for URL: ' + args[1]);
                  intercept = true;
                  xhr.addEventListener('load', function () {
                    //_audioSelector.logger('Intercepted XMLHttpRequest response');
                    const final = () => {
                      // we dont care about error handling here, the caller should handle it
                      _audioSelector.logger('Executing onload handlers');
                      onloadHandler.forEach((handler) => handler.call(this));
                    };

                    const responseModifyHandler = (response) => {
                      return response;
                    };
                    // this.responseText and this.response are not writable, so we use Object.defineProperty
                    if (!responseModifyHandler) {
                      _audioSelector.logger('No responseModifyHandler provided, skipping modification');
                      final();
                      return;
                    }
                    Object.defineProperty(this, 'responseText', {
                      value: responseModifyHandler(this.responseText),
                    });
                    Object.defineProperty(this, 'response', {
                      value: responseModifyHandler(this.response),
                    });
                    _audioSelector.logger('Modified XMLHttpRequest response');
                    final();
                    return;
                  });
                }
                log(`calling original open with URL: ${args[1]}`);
                return target[prop].apply(xhr, args);
              };
            }
            if (prop === 'addEventListener') {
              return function (...args) {
                if (args[0] === 'load' && intercept) {
                  onloadHandler.push(args[1]);
                  return;
                }
                return target[prop].apply(xhr, args);
              };
            }
            return target[prop].bind(xhr);
          },
          set(target, prop, value) {
            if (prop === 'onload' && intercept) {
              log(`intercepting onload handler for ${targetUrl}`);
              onloadHandler.push(value);
              return true;
            }
            log(`Setting XMLHttpRequest property: ${prop} to ${value} of ${targetUrl}`);
            target[prop] = value;
            return true;
          },
        });

        return xhrProxy;
      },
    });
  } catch (e) {
    console.error('Error intercepting XMLHttpRequest:', e);
  }
})();

// --- Test Cases to demonstrate the interception ---

console.log('\n--- Testing XHR open and onload ---');
const xhr1 = new XMLHttpRequest();
xhr1.open('GET', 'https://jsonplaceholder.typicode.com/todos/1');
xhr1.onload = function () {
  console.log(
    'Original onload for xhr1 executed. Response (first 50 chars):',
    this.responseText.substring(0, 50) + '...'
  );
};
xhr1.send();

console.log('\n--- Testing XHR addEventListener ---');
const xhr2 = new XMLHttpRequest();
xhr2.open('GET', 'https://jsonplaceholder.typicode.com/posts/1');
xhr2.addEventListener('load', function () {
  console.log(
    'Original load listener for xhr2 executed. Response (first 50 chars):',
    this.responseText.substring(0, 50) + '...'
  );
});
xhr2.send();

console.log('\n--- Testing another XHR open and onload ---');
const xhr3 = new XMLHttpRequest();
xhr3.open('POST', 'https://jsonplaceholder.typicode.com/posts');
xhr3.onload = function () {
  console.log('Original onload for xhr3 executed. Status:', this.status);
};
xhr3.send(JSON.stringify({ title: 'foo', body: 'bar', userId: 1 }));

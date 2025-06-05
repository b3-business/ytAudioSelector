console.log('\n\n\n\n\n');

// --- Intercept only XMLHttpRequest constructor ---
(function () {
  try {
    window.XMLHttpRequest = new Proxy(window.XMLHttpRequest, {
      construct(target, args) {
        const xhr = new target(...args);
        const onloadHandler = [];
        let intercept = false;

        const xhrProxy = new Proxy(xhr, {
          get(target, prop) {
            if (target[prop] && typeof target[prop] === 'function') {
              // Intercept methods like open, send, onload, etc.
              console.log(`Intercepted method call: ${prop}`);
              return function (...args) {
                if (prop === 'open') {
                  // check url for path "todos/1"
                  if (args[1] && args[1].includes('todos/1')) {
                    intercept = true;
                    xhr.addEventListener('load', function () {
                      // this.responseText and this.response are not writable, so we use Object.defineProperty
                      Object.defineProperty(this, 'responseText', {
                        value: 'Intercepted response text',
                      });
                      Object.defineProperty(this, 'response', {
                        value: 'Intercepted response object',
                      });
                      // we dont care about error handling here, the executor should handle it
                      onloadHandler.forEach((handler) => handler.call(this));
                    });
                  }
                }
                if (prop === 'addEventListener' && args[0] === 'load' && intercept) {
                  onloadHandler.push(args[1]);
                  return;
                }
                return target[prop].apply(xhr, args);
              };
            }
            return target[prop];
          },
          set(target, prop, value) {
            if (prop === 'onload' && intercept) {
              onloadHandler.push(value);
              return true;
            }

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

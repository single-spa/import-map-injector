# import-map-injector

import-map-injector is a browser library that adds a couple features to browser-native import maps:

1. Support for multiple import maps on one page (by combining them into a single import map)
1. Support for external import maps

The way this is accomplished is by combining multiple `<script type="injector-importmap"></script>` elements into a final `<script type="importmap"></script>`.

## Installation

The import-map-injector.js file must execute before any ES module is loaded by the browser. Therefore, it's encouraged to load import-map-injector.js via `<script>` rather than install it as an npm package and then bundle it.

### Via `<script>`

It's easiest to get best performance with import-map-injector by directly loading the import-map-injector.js file

### Via npm

As noted above, it's often easier to install import-map-injector via script rather than npm. Be aware that you might need to bundle/import import-map-injector separately from any web app you're trying to load, since import map installation is required before loading ES modules.

With those caviats in mind, import-map-injector is also available on npm:

```sh
npm install import-map-injector
```

#### When bundling

The following information only applies if you're trying to bundle import-map-injector via webpack, rollup, esbuild, etc. It doesn't apply in other contexts:

Then it should just be included in your browser bundle with the following import.

```js
import "import-map-injector";
```

It's better for performance to put the import statement at the top of your bundler's main entry file, since import map installation is crucial to page load times.

## Usage

import-map-injector combines multiple `<script type="injector-importmap"></script>` elements into a final `<script type="importmap"></script>` element, which is injected into the `<head>` element of the web page. The browser spec for import maps requires the `<script type="importmap"></script>` to be injected before any ES modules are loaded via `<script type="module">`, and import-map-injector currently cannot complete import map installation synchronously (See #1).

In your HTML page, add the following:

```html
<html>
  <head>
    <script type="injector-importmap">
      {
        "imports": {
          "module1": "./module1.js"
        }
      }
    </script>
    <script type="injector-importmap">
      {
        "imports": {
          "module1": "./module1.js"
        }
      }
    </script>
    <script src="./import-map-injector.js"></script>
  </head>
  <body></body>
</html>
```

After import map installation finishes, your HTML page will have an additional `<script type="module">` script appended to the `<head>`.

```html
<html>
  <head>
    <script type="injector-importmap">
      {
        "imports": {
          "module1": "./module1.js"
        }
      }
    </script>
    <script type="injector-importmap">
      {
        "imports": {
          "module2": "./module1.js"
        }
      }
    </script>
    <script src="./import-map-injector.js"></script>
    <script type="importmap">
      {
        "imports": {
          "module1": "./module1.js",
          "module2": "./module2.js"
        }
      }
    </script>
  </head>
  <body></body>
</html>
```

Once import map installation has finished, you can proceed with loading modules via `import()`.

### Detecting when import map installation is complete

```html
<script>
  window.importMapInjector.importMapReady.then(() => {
    console.log("Ready to dynamically import modules");
  });
</script>
```

### `<script type="module">`

Currently, `<script type="module">` elements in the initial HTML page are not supported, but they will be after #1 is implemented.

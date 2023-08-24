# import-map-injector

import-map-injector is a browser library that adds a couple features to browser-native import maps:

1. Support for multiple import maps on one page (by combining them into a single import map)
1. Support for external import maps

The way this is accomplished is by combining multiple `<script type="injector-importmap"></script>` elements into a final `<script type="importmap"></script>`.

## Installation

The import-map-injector.js file must execute before any ES module is loaded by the browser. Therefore, it's encouraged to load import-map-injector.js via `<script>` rather than install it as an npm package and then bundle it.

### Via `<script>`

It's easiest to get best performance with import-map-injector by directly loading the import-map-injector.js file into your HTML page via `<script type="text/javascript" src="./import-map-injector.js">`. It is important to place the `<script>` element after any `<script type="injector-importmap">` elements, but before any `<script type="module">` or `<script>import()</script>` elements.

```html
<!-- If you wish to auto-upgrade to latest import-map-injector versions, use the following URLs -->
<script src="https://cdn.jsdelivr.net/npm/import-map-injector"></script>
<script src="https://unpkg.com/import-map-injector"></script>

<!-- If you wish to pin to a specific version, swap VERSION with the version you're using -->
<script src="https://cdn.jsdelivr.net/npm/import-map-injector@VERSION"></script>
<script src="https://unpkg.com/import-map-injector@VERSION"></script>

<!-- If you wish to self host, that's possible too -->
<script src="./node_modules/import-map-injector/lib/import-map-injector.js"></script>
```

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

import-map-injector combines multiple `<script type="injector-importmap"></script>` elements into a final `<script type="importmap"></script>` element, which is injected into the `<head>` element of the web page. The browser spec for import maps requires the `<script type="importmap"></script>` to be injected before any ES modules are loaded via `<script type="module">` or `import()`.

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

As per the [Import Maps spec](https://github.com/WICG/import-maps), no ES modules can be loaded until import map installation is completed. This means that you cannot use `<script type="module">` or `import()` until after import map installation completes.

Note that the import map spec currently does not provide a way to use import map specifiers inside of `<script type="module">` elements. However, it is still possible to load modules in your import map via `<script type="module">` if you use a URL path rather than the import map specifier.

#### Synchronous import map installation

If you're not using external import maps (`<script type="injector-importmap" src="./external-url.importmap">`), import map installation occurs synchronously once the import-map-injector.js file is executed. This means you can use `<script type="module">` and `import()` in your HTML file, so long as they are after the `import-map-injector.js` file is executed.

**Example:**

```html
<script type="injector-importmap">
  {
    "imports": {
      "my-module": "./hello-world.js"
    }
  }
</script>
<script type="injector-importmap">
  {
    "imports": {
      "my-module2": "./hello-world2.js"
    }
  }
</script>
<script src="./import-map-injector.js"></script>
<!-- Since there are no external import maps, the import map is installed synchronously and we can immediately load modules -->
<script type="module" src="./hello-world.js"></script>
<script type="module" src="./hello-world2.js"></script>
```

#### Asynchronous import map installation

When using external import maps, import-map-injector must wait for the network request(s) loading external import map(s) to complete before it can install the browser-native import map. This means you cannot use `<script type="module">` and `import()` in your HTML file until after the import-map-injector's `importMapReady` Promise has been resolved:

**Example:**

```html
<script type="injector-importmap">
  {
    "imports": {
      "my-module": "./hello-world.js"
    }
  }
</script>
<script type="injector-importmap" src="external-url.importmap">
</script>
<script src="./import-map-injector.js"></script>
<!--
  Since there is an external import map, the import map is installed asynchronously and so we must wait for import map installation
  before loading modules with <script type="module"> or import()
-->
<script>
  window.importMapInjector.importMapReady.then(() => {
    console.log("Ready to dynamically import modules");
    import("my-module");
  });
</script>
```

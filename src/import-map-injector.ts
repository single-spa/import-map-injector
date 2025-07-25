interface ImportMap {
  imports?: SpecifierMap;
  scopes?: Record<string, SpecifierMap>;
}

type SpecifierMap = Record<string, string>;

const importMapJsons: (Promise<ImportMap> | ImportMap)[] = [];

const errPrefix = "import-map-injector:";

const injectorImportMaps = document.querySelectorAll<HTMLScriptElement>(
  "script[type=injector-importmap]",
);

injectorImportMaps.forEach((scriptEl) => {
  if (scriptEl.src) {
    importMapJsons.push(
      fetch(scriptEl.src)
        .then((r: Response) => {
          if (r.ok) {
            let contentType = r.headers.get("content-type").toLowerCase();
            if (contentType.includes(";")) {
              contentType = contentType.slice(0, contentType.indexOf(";"));
            }
            if (contentType !== "application/importmap+json") {
              throw Error(
                `${errPrefix} Import map at url '${scriptEl.src}' does not have the required content-type http response header. Must be 'application/importmap+json'`,
              );
            }

            return r.json();
          } else {
            throw Error(
              `${errPrefix} import map at url '${scriptEl.src}' must respond with a success HTTP status, but responded with HTTP ${r.status} ${r.statusText}`,
            );
          }
        })
        .then((json) => {
          // https://github.com/single-spa/import-map-injector/issues/17
          remapExternalAddresses(json.imports ?? {}, scriptEl.src);
          for (let scope in json.scopes ?? {}) {
            remapExternalAddresses(json.scopes[scope], scriptEl.src);
            if (["/", "./", "../"].some((prefix) => scope.startsWith(prefix))) {
              json.scopes[new URL(scope, scriptEl.src).href] =
                json.scopes[scope];
              delete json.scopes[scope];
            }
          }
          return json;
        })
        .catch((err) => {
          console.error(
            `${errPrefix} Error loading import map from URL '${scriptEl.src}'`,
          );
          throw err;
        }),
    );
  } else if (scriptEl.textContent.length > 0) {
    let json;
    try {
      json = JSON.parse(scriptEl.textContent);
    } catch (err) {
      console.error(err);
      throw Error(
        `${errPrefix} A <script type="injector-importmap"> element contains invalid JSON`,
      );
    }

    importMapJsons.push(json);
  } else {
    throw Error(
      `${errPrefix} Script with type "injector-importmap" does not contain an importmap`,
    );
  }
});

if (window["importMapOverrides"]) {
  importMapJsons.push(window["importMapOverrides"].getOverrideMap());
  importMapJsons.push(window["importMapOverrides"].getOverrideScopes());
  importMapJsons.push(window["importMapOverrides"].getExternalOverrideMap());
}

const requiresMicroTick = importMapJsons.some(
  (json) => json instanceof Promise,
);

if (requiresMicroTick) {
  window.importMapInjector = {
    initPromise: Promise.all(importMapJsons)
      .then((importMaps) => {
        injectImportMap(importMaps);
      })
      .catch((err) => {
        console.error(
          `${errPrefix}: Unable to generate and inject final import map`,
          err,
        );
        throw err;
      }),
  };
} else {
  injectImportMap(importMapJsons as ImportMap[]);
  window.importMapInjector = {
    // Import map was injected synchronously, so there's nothing to wait on
    initPromise: Promise.resolve(),
  };
}

function injectImportMap(importMaps: ImportMap[]): void {
  const finalImportMap = { imports: {}, scopes: {} };
  for (const importMap of importMaps) {
    if (importMap.imports) {
      for (let key in importMap.imports) {
        finalImportMap.imports[key] = importMap.imports[key];
      }
    }

    if (importMap.scopes) {
      for (let key in importMap.scopes) {
        finalImportMap.scopes[key] = importMap.scopes[key];
      }
    }
  }

  const finalImportMapScriptEl = document.createElement("script");
  finalImportMapScriptEl.type = "importmap";
  finalImportMapScriptEl.textContent = JSON.stringify(finalImportMap);
  document.head.appendChild(finalImportMapScriptEl);

  if (window["importMapOverrides"]) {
    // import-map-overrides caches the import maps when it initially loads,
    // so it needs to be instructed to clear that cache
    window["importMapOverrides"].resetDefaultMap();
  }
}

declare var importMapInjector: {
  initPromise: Promise<void>;
};

interface ModuleMap {
  [specifer: string]: string;
}

function remapExternalAddresses(
  moduleMap: ModuleMap,
  externalUrl: string,
): void {
  for (const specifier in moduleMap) {
    const address = moduleMap[specifier];
    if (["/", "./", "../"].some((prefix) => address.startsWith(prefix))) {
      moduleMap[specifier] = new URL(address, externalUrl).href;
    }
  }
}

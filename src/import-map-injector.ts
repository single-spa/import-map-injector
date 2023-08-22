interface ImportMap {
  imports?: SpecifierMap;
  scopes?: Record<string, SpecifierMap>;
}

type SpecifierMap = Record<string, string>;

const jsonPromises: Promise<ImportMap>[] = [];

const errPrefix = "import-map-injector:";

document
  .querySelectorAll<HTMLScriptElement>("script[type=injector-importmap]")
  .forEach((scriptEl) => {
    if (scriptEl.src) {
      jsonPromises.push(
        fetch(scriptEl.src)
          .then((r: Response) => {
            if (r.ok) {
              if (
                r.headers.get("content-type").toLowerCase() !==
                "application/importmap+json"
              ) {
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

            return r.json();
          })
          .catch((err) => {
            console.error(
              `${errPrefix} Error loading import map from URL '${scriptEl.src}'`,
            );
            throw err;
          }),
      );
    } else if (scriptEl.textContent.length > 0) {
      jsonPromises.push(
        Promise.resolve().then(() => JSON.parse(scriptEl.textContent)),
      );
    } else {
      throw Error(
        `${errPrefix} Script with type "injector-importmap" does not contain an importmap`,
      );
    }
  });

declare var importMapInjector: {
  initPromise: Promise<void>;
};

window.importMapInjector = {
  initPromise: Promise.all(jsonPromises)
    .then((importMaps) => {
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
    })
    .catch((err) => {
      console.error(
        `${errPrefix}: Unable to generate and inject final import map`,
        err,
      );
      throw err;
    }),
};

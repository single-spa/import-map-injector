const globalWindow = window as typeof window & {
  importMapInjector: {
    initPromise: Promise<void>;
  };
};

describe("import-map-injector", () => {
  const setDocumentAndLoadScript = (maps: string[]) => {
    document.head.innerHTML = `${maps.map((map) => map || "").join("\n")}`;
    return import("./import-map-injector");
  };

  beforeEach(() => {
    jest.resetModules();
    fetchMock.resetMocks();
  });

  it("should inject an inline import map", async () => {
    const importmap = {
      imports: {
        package1: "https://cdn.skypack.dev/package1",
        package2: "https://cdn.skypack.dev/package2",
        package3: "https://cdn.skypack.dev/package3",
      },
      scopes: {
        "/scope1": {
          package1: "https://cdn.skypack.org/package1",
        },
      },
    };

    const importmapScript = `<script type="injector-importmap">
      ${JSON.stringify(importmap)}
    </script>`;

    await setDocumentAndLoadScript([importmapScript]);

    await globalWindow.importMapInjector.initPromise;
    const resultingImportMap = JSON.parse(
      document.querySelector("script[type=importmap]")?.textContent || "",
    );
    expect(resultingImportMap).toStrictEqual(importmap);
  });

  it("should inject an external import map", async () => {
    const importmap = {
      imports: {
        package4: "https://cdn.skypack.dev/package4",
        package5: "https://cdn.skypack.dev/package5",
      },
      scopes: {
        "/scope1": {
          package4: "https://cdn.skypack.org/package4",
        },
        "/scope2": {
          package4: "https://cdn.skypack.net/package4",
        },
      },
    };

    fetchMock.mockResponseOnce(JSON.stringify(importmap), {
      headers: {
        "Content-Type": "application/importmap+json",
      },
    });

    const importmapScript =
      '<script src="https://example.com/importmap.json" type="injector-importmap"></script>';

    await setDocumentAndLoadScript([importmapScript]);

    await globalWindow.importMapInjector.initPromise;
    const resultingImportMap = JSON.parse(
      document.querySelector("script[type=importmap]")?.textContent || "",
    );
    expect(resultingImportMap).toStrictEqual(importmap);
  });

  it("should inject multiple import maps", async () => {
    const importmap1 = {
      imports: {
        package1: "https://cdn.skypack.dev/package1",
        package2: "https://cdn.skypack.dev/package2",
      },
      scopes: {
        "/scope1": {
          package1: "https://cdn.skypack.org/package1",
        },
        "/scope2": {
          package4: "https://cdn.skypack.org/package4",
        },
      },
    };

    const importmap2 = {
      imports: {
        package1: "https://cdn.skypack.net/package1",
        package3: "https://cdn.skypack.dev/package3",
        package4: "https://cdn.skypack.dev/package4",
      },
      scopes: {
        "/scope2": {
          package4: "https://cdn.skypack.net/package4",
        },
      },
    };

    const importmap3 = {
      scopes: {
        "/scope3": {
          package5: "https://cdn.skypack.net/package5",
        },
      },
    };

    const importmap4 = {
      imports: {
        package6: "https://cdn.skypack.net/package6",
      },
    };

    fetchMock.mockResponseOnce(JSON.stringify(importmap2), {
      headers: {
        "Content-Type": "application/importmap+json",
      },
    });

    const importmapScript1 = `<script type="injector-importmap">
      ${JSON.stringify(importmap1)}
    </script>`;

    const importmapScript2 =
      '<script src="https://example.com/importmap.json" type="injector-importmap"></script>';

    const importmapScript3 = `<script type="injector-importmap">
      ${JSON.stringify(importmap3)}
    </script>`;

    const importmapScript4 = `<script type="injector-importmap">
      ${JSON.stringify(importmap4)}
    </script>`;

    await setDocumentAndLoadScript([
      importmapScript1,
      importmapScript2,
      importmapScript3,
      importmapScript4,
    ]);

    await globalWindow.importMapInjector.initPromise;
    const resultingImportMap = JSON.parse(
      document.querySelector("script[type=importmap]")?.textContent || "",
    );
    expect(resultingImportMap).toStrictEqual({
      imports: {
        ...importmap1.imports,
        ...importmap2.imports,
        ...importmap4.imports,
      },
      scopes: {
        ...importmap1.scopes,
        ...importmap2.scopes,
        ...importmap3.scopes,
      },
    });
  });

  it("should throw an error if an import map script does not contain valid JSON", async () => {
    const importmapScript = `<script type="injector-importmap">
      console.log("Hello world");
    </script>`;
    jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(setDocumentAndLoadScript([importmapScript])).rejects.toThrow(
      'import-map-injector: A <script type="injector-importmap"> element contains invalid JSON',
    );
  });

  it("should throw an error if an import map script does not contain an import map", async () => {
    const importmapScript = `<script type="injector-importmap"></script>`;
    jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(setDocumentAndLoadScript([importmapScript])).rejects.toThrow(
      'import-map-injector: Script with type "injector-importmap" does not contain an importmap',
    );
  });

  it("should throw an error if a request for an external import map returns invalid JSON", async () => {
    const importmapScript =
      '<script src="https://example.com/importmap.json" type="injector-importmap"></script>';
    jest.spyOn(console, "error").mockImplementation(() => {});

    fetchMock.mockResponseOnce("Hello world", {
      headers: {
        "Content-Type": "application/importmap+json",
      },
    });

    await setDocumentAndLoadScript([importmapScript]);

    await expect(globalWindow.importMapInjector.initPromise).rejects.toThrow();
  });

  it("should throw an error if a request for an external import map returns a response with an invalid content type", async () => {
    const importmapScript =
      '<script src="https://example.com/importmap.json" type="injector-importmap"></script>';
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    fetchMock.mockResponseOnce("Hello world", {
      headers: {
        "Content-Type": "text/html",
      },
    });

    await setDocumentAndLoadScript([importmapScript]);

    const expectedError = Error(
      "import-map-injector: Import map at url 'https://example.com/importmap.json' does not have the required content-type http response header. Must be 'application/importmap+json'",
    );

    await expect(globalWindow.importMapInjector.initPromise).rejects.toThrow(
      expectedError,
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "import-map-injector:: Unable to generate and inject final import map",
      expectedError,
    );
  });

  it("should throw an error if a request for an external import map returns a non-200 status code", async () => {
    const importmapScript =
      '<script src="https://example.com/importmap.json" type="injector-importmap"></script>';
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    fetchMock.mockResponseOnce("Hello world", {
      status: 500,
      headers: {
        "Content-Type": "application/importmap+json",
      },
    });

    await setDocumentAndLoadScript([importmapScript]);

    const expectedError = Error(
      "import-map-injector: Import map at url 'https://example.com/importmap.json' must respond with a success HTTP status, but responded with HTTP 500 Internal Server Error",
    );

    await expect(globalWindow.importMapInjector.initPromise).rejects.toThrow(
      expectedError,
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "import-map-injector:: Unable to generate and inject final import map",
      expectedError,
    );
  });

  it("should throw an error if a request for an external import map fails", async () => {
    const importmapScript =
      '<script src="https://example.com/importmap.json" type="injector-importmap"></script>';
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    fetchMock.mockRejectOnce(Error("404 Not Found"));

    await setDocumentAndLoadScript([importmapScript]);

    await expect(globalWindow.importMapInjector.initPromise).rejects.toThrow(
      "404 Not Found",
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "import-map-injector: Error loading import map from URL 'https://example.com/importmap.json'",
    );
  });
});

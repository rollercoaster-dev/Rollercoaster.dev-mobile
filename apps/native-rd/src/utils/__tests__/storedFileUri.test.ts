import {
  APP_DOCUMENT_URI_PREFIX,
  resolveStoredFileUri,
  storedFileExists,
  toStoredFileUri,
} from "../storedFileUri";

const IOS_OLD = "file:///var/mobile/Containers/Data/Application/OLD-UUID-1111/";
const IOS_NEW = "file:///var/mobile/Containers/Data/Application/NEW-UUID-2222/";
const ANDROID_DOCS = "file:///data/user/0/dev.rollercoaster.app/files/";
const ANDROID_CACHE = "file:///data/user/0/dev.rollercoaster.app/cache/";

const mockDirs: { document: string | null; cache: string | null } = {
  document: `${IOS_NEW}Documents/`,
  cache: `${IOS_NEW}Library/Caches/`,
};

const mockExists = jest.fn<boolean, [string]>();

// jest.config maps `expo-file-system` and `expo-file-system/legacy` to the
// same mock file, so one factory serves both specifiers.
jest.mock("expo-file-system", () => ({
  get documentDirectory() {
    return mockDirs.document;
  },
  get cacheDirectory() {
    return mockDirs.cache;
  },
  File: jest.fn().mockImplementation((uri: string) => ({
    get exists() {
      return mockExists(uri);
    },
  })),
}));

function useIos() {
  mockDirs.document = `${IOS_NEW}Documents/`;
  mockDirs.cache = `${IOS_NEW}Library/Caches/`;
}

function useAndroid() {
  mockDirs.document = ANDROID_DOCS;
  mockDirs.cache = ANDROID_CACHE;
}

beforeEach(() => {
  useIos();
  mockExists.mockReset();
});

describe("resolveStoredFileUri", () => {
  it("resolves a relative appdoc: value against the current Documents dir", () => {
    expect(resolveStoredFileUri("appdoc:evidence/photos/a.jpg")).toBe(
      `${IOS_NEW}Documents/evidence/photos/a.jpg`,
    );
  });

  it.each([
    ["photo", "evidence/photos/abc-123.jpg"],
    ["video", "evidence/videos/abc-123.mov"],
    ["file", "evidence/files/abc-123.pdf"],
    ["badge PNG", "badges/my-badge-abc-123.png"],
  ])(
    "rebases an old absolute %s URI from a different container UUID",
    (_kind, rel) => {
      expect(resolveStoredFileUri(`${IOS_OLD}Documents/${rel}`)).toBe(
        `${IOS_NEW}Documents/${rel}`,
      );
    },
  );

  it("rebases an old Caches voice memo onto the current cache dir", () => {
    expect(
      resolveStoredFileUri(`${IOS_OLD}Library/Caches/ExpoAudio/rec.m4a`),
    ).toBe(`${IOS_NEW}Library/Caches/ExpoAudio/rec.m4a`);
  });

  it("rebases a simulator container path", () => {
    const sim =
      "file:///Users/me/Library/Developer/CoreSimulator/Devices/DEV-1/data/Containers/Data/Application/SIM-UUID/Documents/evidence/photos/x.jpg";
    expect(resolveStoredFileUri(sim)).toBe(
      `${IOS_NEW}Documents/evidence/photos/x.jpg`,
    );
  });

  it("returns a current-container absolute URI unchanged", () => {
    const current = `${IOS_NEW}Documents/evidence/photos/a.jpg`;
    expect(resolveStoredFileUri(current)).toBe(current);
  });

  describe("on Android", () => {
    beforeEach(useAndroid);

    it("resolves appdoc: against the Android files dir", () => {
      expect(resolveStoredFileUri("appdoc:evidence/videos/v.mp4")).toBe(
        `${ANDROID_DOCS}evidence/videos/v.mp4`,
      );
    });

    it("rebases an app-managed path from another data root", () => {
      expect(
        resolveStoredFileUri(
          "file:///data/data/dev.rollercoaster.app/files/badges/b.png",
        ),
      ).toBe(`${ANDROID_DOCS}badges/b.png`);
    });

    it("leaves a non-managed files/ path alone", () => {
      const other = "file:///storage/emulated/0/files/Download/report.pdf";
      expect(resolveStoredFileUri(other)).toBe(other);
    });
  });

  it.each([
    ["text note", "content:text;Note with /Documents/evidence/ inside"],
    ["https link", "https://example.com/Documents/evidence/x.jpg"],
    ["badge placeholder", "pending:baked-image"],
    ["foreign file URI", "file:///tmp/somewhere/else.jpg"],
  ])("passes a %s through untouched", (_kind, value) => {
    expect(resolveStoredFileUri(value)).toBe(value);
  });
});

describe("toStoredFileUri", () => {
  it("stores a current Documents URI as appdoc: relative", () => {
    expect(toStoredFileUri(`${IOS_NEW}Documents/evidence/audio/r.m4a`)).toBe(
      `${APP_DOCUMENT_URI_PREFIX}evidence/audio/r.m4a`,
    );
  });

  it("normalises a stale-container Documents URI to appdoc:", () => {
    expect(toStoredFileUri(`${IOS_OLD}Documents/badges/b.png`)).toBe(
      "appdoc:badges/b.png",
    );
  });

  it("stores an Android Documents URI as appdoc:", () => {
    useAndroid();
    expect(toStoredFileUri(`${ANDROID_DOCS}evidence/files/f.pdf`)).toBe(
      "appdoc:evidence/files/f.pdf",
    );
  });

  it("is idempotent on an already-stored value", () => {
    expect(toStoredFileUri("appdoc:evidence/photos/a.jpg")).toBe(
      "appdoc:evidence/photos/a.jpg",
    );
  });

  it.each([
    ["text note", "content:text;hello"],
    ["https link", "https://example.com/a"],
    ["badge placeholder", "pending:baked-image"],
    ["Caches recording", `${IOS_NEW}Library/Caches/ExpoAudio/rec.m4a`],
  ])("leaves a %s unchanged", (_kind, value) => {
    expect(toStoredFileUri(value)).toBe(value);
  });

  it("round-trips through resolve to the current absolute URI", () => {
    const abs = `${IOS_NEW}Documents/evidence/videos/v.mov`;
    expect(resolveStoredFileUri(toStoredFileUri(abs))).toBe(abs);
  });
});

describe("storedFileExists", () => {
  it("checks the resolved path, not the stored one", () => {
    mockExists.mockReturnValue(false);
    expect(storedFileExists(`${IOS_OLD}Documents/evidence/audio/r.m4a`)).toBe(
      false,
    );
    expect(mockExists).toHaveBeenCalledWith(
      `${IOS_NEW}Documents/evidence/audio/r.m4a`,
    );
  });

  it("assumes present when the probe throws", () => {
    mockExists.mockImplementation(() => {
      throw new Error("native module unavailable");
    });
    expect(storedFileExists("appdoc:evidence/audio/r.m4a")).toBe(true);
  });
});

/**
 * Tests for the reporting surface (sentry-report.ts).
 *
 * Mocks @sentry/react-native to assert what `reportError` ends up passing to
 * the SDK without pulling the real native module. Per Jest's hoisting rules,
 * variables referenced inside `jest.mock` factories must be prefixed `mock*`.
 */
import {
  breadcrumb,
  reportError,
  reportLoggerError,
  type ReportContext,
} from "../sentry-report";

type CapturedScope = {
  tags: Record<string, string>;
  extras: Record<string, unknown>;
  contexts: Record<string, unknown>;
};
type CapturedEvent = { error: unknown; scope: CapturedScope };
type CapturedBreadcrumb = {
  category?: string;
  message?: string;
  level?: string;
  data?: Record<string, unknown>;
};

const mockState: {
  captured: CapturedEvent[];
  pending: CapturedScope | null;
  breadcrumbs: CapturedBreadcrumb[];
  setUserCalls: number;
} = {
  captured: [],
  pending: null,
  breadcrumbs: [],
  setUserCalls: 0,
};

jest.mock("@sentry/react-native", () => ({
  withScope: (
    cb: (scope: {
      setTag: (k: string, v: string) => void;
      setExtra: (k: string, v: unknown) => void;
      setContext: (k: string, v: unknown) => void;
    }) => void,
  ) => {
    mockState.pending = { tags: {}, extras: {}, contexts: {} };
    cb({
      setTag: (k, v) => {
        if (mockState.pending) mockState.pending.tags[k] = v;
      },
      setExtra: (k, v) => {
        if (mockState.pending) mockState.pending.extras[k] = v;
      },
      setContext: (k, v) => {
        if (mockState.pending) mockState.pending.contexts[k] = v;
      },
    });
  },
  captureException: (error: unknown) => {
    mockState.captured.push({
      error,
      scope: mockState.pending ?? { tags: {}, extras: {}, contexts: {} },
    });
    mockState.pending = null;
  },
  addBreadcrumb: (b: CapturedBreadcrumb) => {
    mockState.breadcrumbs.push(b);
  },
  setUser: () => {
    mockState.setUserCalls += 1;
  },
}));

beforeEach(() => {
  mockState.captured = [];
  mockState.pending = null;
  mockState.breadcrumbs = [];
  mockState.setUserCalls = 0;
});

describe("reportError", () => {
  it("forwards the error to captureException", () => {
    const err = new Error("boom");
    reportError(err, { area: "render" });
    expect(mockState.captured).toHaveLength(1);
    expect(mockState.captured[0].error).toBe(err);
  });

  it("tags events with `area`", () => {
    reportError(new Error("x"), { area: "key.generate" });
    expect(mockState.captured[0].scope.tags.area).toBe("key.generate");
  });

  it("tags events with `kind` when present", () => {
    reportError(new Error("x"), {
      area: "evidence.capture",
      kind: "video",
    });
    expect(mockState.captured[0].scope.tags.area).toBe("evidence.capture");
    expect(mockState.captured[0].scope.tags.kind).toBe("video");
  });

  it("omits the kind tag when no kind is supplied", () => {
    reportError(new Error("x"), { area: "key.verify" });
    expect(mockState.captured[0].scope.tags.area).toBe("key.verify");
    expect(mockState.captured[0].scope.tags.kind).toBeUndefined();
  });

  it("opens a fresh scope per call", () => {
    reportError(new Error("first"), {
      area: "goal.mutate",
      kind: "create",
    });
    reportError(new Error("second"), { area: "render" });
    expect(mockState.captured).toHaveLength(2);
    expect(mockState.captured[0].scope.tags).toEqual({
      area: "goal.mutate",
      kind: "create",
    });
    expect(mockState.captured[1].scope.tags).toEqual({ area: "render" });
  });

  it("accepts non-Error values (string, object) like captureException would", () => {
    const ctx: ReportContext = { area: "navigation" };
    reportError("not an error", ctx);
    reportError({ message: "object" }, ctx);
    expect(mockState.captured).toHaveLength(2);
    expect(mockState.captured[0].error).toBe("not an error");
    expect(mockState.captured[1].error).toEqual({ message: "object" });
  });

  // The privacy invariant: free-text payloads must not reach Sentry. A future
  // refactor that adds setExtra/setContext/setUser calls would silently leak
  // user content and pass every other test, so lock the contract here.
  it("never writes setExtra, setContext, or setUser", () => {
    reportError(new Error("boom"), {
      area: "evidence.capture",
      kind: "video",
    });
    expect(mockState.captured[0].scope.extras).toEqual({});
    expect(mockState.captured[0].scope.contexts).toEqual({});
    expect(mockState.setUserCalls).toBe(0);
  });

  it("only writes the area tag and (optionally) the kind tag", () => {
    reportError(new Error("x"), {
      area: "step.mutate",
      kind: "reorder",
    });
    expect(Object.keys(mockState.captured[0].scope.tags).sort()).toEqual([
      "area",
      "kind",
    ]);
  });
});

describe("reportLoggerError", () => {
  it("silently no-ops for unknown scopes", () => {
    reportLoggerError("not-allowlisted-scope", new Error("ignored"));
    expect(mockState.captured).toHaveLength(0);
  });

  it("silently no-ops for the default 'app' scope (too broad)", () => {
    const stubMap: Record<string, ReportContext> = {
      "stub.scope": { area: "key.generate" },
    };

    reportLoggerError("app", new Error("ignored"), stubMap);
    expect(mockState.captured).toHaveLength(0);
  });

  it("forwards mapped scope to reportError with the configured area/kind", () => {
    const stubMap: Record<string, ReportContext> = {
      "stub.scope": { area: "key.generate" },
      "stub.evidence": { area: "evidence.capture", kind: "photo" },
    };
    const err = new Error("mapped");

    reportLoggerError("stub.scope", err, stubMap);
    expect(mockState.captured[0].error).toBe(err);
    expect(mockState.captured[0].scope.tags).toEqual({ area: "key.generate" });

    reportLoggerError("stub.evidence", err, stubMap);
    expect(mockState.captured[1].scope.tags).toEqual({
      area: "evidence.capture",
      kind: "photo",
    });
  });

  describe("production SCOPE_TO_AREA registrations", () => {
    it("routes useFocusModePrefs to focus.mode", () => {
      reportLoggerError("useFocusModePrefs", new Error("boom"));
      expect(mockState.captured).toHaveLength(1);
      expect(mockState.captured[0].scope.tags).toEqual({ area: "focus.mode" });
    });

    it("routes evidenceCleanup to evidence.cleanup", () => {
      reportLoggerError("evidenceCleanup", new Error("boom"));
      expect(mockState.captured).toHaveLength(1);
      expect(mockState.captured[0].scope.tags).toEqual({
        area: "evidence.cleanup",
      });
    });

    it("routes db.queries to db.write", () => {
      reportLoggerError("db.queries", new Error("boom"));
      expect(mockState.captured).toHaveLength(1);
      expect(mockState.captured[0].scope.tags).toEqual({ area: "db.write" });
    });

    it("routes evidenceViewers to evidence.view with no kind (spans link+file)", () => {
      reportLoggerError("evidenceViewers", new Error("boom"));
      expect(mockState.captured).toHaveLength(1);
      expect(mockState.captured[0].scope.tags).toEqual({
        area: "evidence.view",
      });
    });

    it.each([
      ["VideoContent", "video"],
      ["PhotoContent", "photo"],
      ["LinkContent", "link"],
      ["FileContent", "file"],
    ])("routes %s to evidence.view with kind:%s", (scope, kind) => {
      reportLoggerError(scope, new Error("boom"));
      expect(mockState.captured).toHaveLength(1);
      expect(mockState.captured[0].scope.tags).toEqual({
        area: "evidence.view",
        kind,
      });
    });

    it("routes useDensity to settings.density", () => {
      reportLoggerError("useDensity", new Error("boom"));
      expect(mockState.captured).toHaveLength(1);
      expect(mockState.captured[0].scope.tags).toEqual({
        area: "settings.density",
      });
    });

    // The default "app" scope must remain unmapped — db/queries.ts used to use
    // it, and re-introducing it would route every Logger() without a scope
    // through Sentry, bypassing the deliberate per-scope audit.
    it("still no-ops for the default 'app' scope after db.queries rename", () => {
      reportLoggerError("app", new Error("boom"));
      expect(mockState.captured).toHaveLength(0);
    });
  });
});

describe("breadcrumb", () => {
  it("forwards category, message, info level, and no data for non-evidence", () => {
    breadcrumb({ category: "goal", message: "create" });
    expect(mockState.breadcrumbs).toEqual([
      { category: "goal", message: "create", level: "info", data: undefined },
    ]);
  });

  it("attaches { kind } data only for evidence breadcrumbs", () => {
    breadcrumb({ category: "evidence", message: "save", kind: "video" });
    expect(mockState.breadcrumbs[0]).toEqual({
      category: "evidence",
      message: "save",
      level: "info",
      data: { kind: "video" },
    });
  });

  it("does not forward any other free-form fields", () => {
    breadcrumb({ category: "badge", message: "sign" });
    const c = mockState.breadcrumbs[0];
    // Only the four expected keys.
    expect(Object.keys(c).sort()).toEqual([
      "category",
      "data",
      "level",
      "message",
    ]);
  });
});

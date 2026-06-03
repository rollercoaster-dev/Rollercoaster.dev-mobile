/**
 * Icon search index for badge design
 *
 * Provides a curated set of badge-relevant Phosphor icons organized by category,
 * with instant local keyword search. No network calls required.
 *
 * The full Phosphor library has ~1500 icons. We curate ~300 badge-relevant icons
 * into categories while still allowing search across the full set by name.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IconCategory =
  | "popular"
  | "achievement"
  | "learning"
  | "coding"
  | "health"
  | "creativity"
  | "nature"
  | "communication"
  | "finance"
  | "sport"
  | "travel";

export interface IconEntry {
  /** PascalCase Phosphor icon name (e.g. "Trophy") */
  name: string;
  /** Lowercase search keywords (auto-generated from name + manual tags) */
  keywords: string[];
  /** Categories this icon belongs to */
  categories: IconCategory[];
}

// ---------------------------------------------------------------------------
// Curated icon data
// ---------------------------------------------------------------------------

/**
 * Badge-relevant icons organized by primary category.
 *
 * Each icon can appear in multiple categories. Keywords are derived from the
 * icon name (split on PascalCase boundaries) plus manual tags for discoverability.
 */
const CURATED_ICONS: IconEntry[] = [
  // -- Achievement --
  {
    name: "Trophy",
    keywords: ["trophy", "award", "win", "prize", "achievement"],
    categories: ["achievement", "popular"],
  },
  {
    name: "Medal",
    keywords: ["medal", "award", "achievement", "prize"],
    categories: ["achievement", "popular"],
  },
  {
    name: "MedalMilitary",
    keywords: ["medal", "military", "honor", "achievement"],
    categories: ["achievement"],
  },
  {
    name: "Crown",
    keywords: ["crown", "king", "queen", "royal", "achievement"],
    categories: ["achievement", "popular"],
  },
  {
    name: "CrownSimple",
    keywords: ["crown", "simple", "royal"],
    categories: ["achievement"],
  },
  {
    name: "Star",
    keywords: ["star", "favorite", "rating", "achievement"],
    categories: ["achievement", "popular"],
  },
  {
    name: "StarFour",
    keywords: ["star", "four", "sparkle"],
    categories: ["achievement"],
  },
  {
    name: "Sparkle",
    keywords: ["sparkle", "magic", "special", "achievement"],
    categories: ["achievement", "popular"],
  },
  {
    name: "Certificate",
    keywords: ["certificate", "diploma", "qualification"],
    categories: ["achievement", "learning"],
  },
  {
    name: "SealCheck",
    keywords: ["seal", "check", "verified", "approved"],
    categories: ["achievement"],
  },
  {
    name: "Seal",
    keywords: ["seal", "badge", "emblem"],
    categories: ["achievement"],
  },
  {
    name: "ShieldCheck",
    keywords: ["shield", "check", "secure", "verified"],
    categories: ["achievement"],
  },
  {
    name: "ShieldStar",
    keywords: ["shield", "star", "defense", "achievement"],
    categories: ["achievement"],
  },
  {
    name: "Flag",
    keywords: ["flag", "milestone", "checkpoint", "achievement"],
    categories: ["achievement"],
  },
  {
    name: "FlagBanner",
    keywords: ["flag", "banner", "celebration"],
    categories: ["achievement"],
  },
  {
    name: "FlagCheckered",
    keywords: ["flag", "checkered", "finish", "race", "complete"],
    categories: ["achievement", "sport"],
  },
  {
    name: "ThumbsUp",
    keywords: ["thumbs", "up", "like", "approve", "good"],
    categories: ["achievement", "popular"],
  },
  {
    name: "HandFist",
    keywords: ["fist", "power", "strength", "achievement"],
    categories: ["achievement"],
  },
  {
    name: "BoxingGlove",
    keywords: [
      "boxing",
      "glove",
      "gloves",
      "fight",
      "fighter",
      "punch",
      "spar",
      "strength",
      "grit",
      "perseverance",
    ],
    categories: ["achievement", "sport"],
  },
  {
    name: "Confetti",
    keywords: ["confetti", "celebrate", "party"],
    categories: ["achievement"],
  },
  {
    name: "Champagne",
    keywords: ["champagne", "celebrate", "toast"],
    categories: ["achievement"],
  },
  {
    name: "Target",
    keywords: ["target", "goal", "aim", "bullseye"],
    categories: ["achievement", "popular"],
  },

  // -- Learning --
  {
    name: "Book",
    keywords: ["book", "read", "learn", "study"],
    categories: ["learning", "popular"],
  },
  {
    name: "BookOpen",
    keywords: ["book", "open", "read", "learning"],
    categories: ["learning"],
  },
  {
    name: "BookBookmark",
    keywords: ["book", "bookmark", "saved", "reading"],
    categories: ["learning"],
  },
  {
    name: "Books",
    keywords: ["books", "library", "study", "collection"],
    categories: ["learning"],
  },
  {
    name: "GraduationCap",
    keywords: ["graduation", "cap", "education", "degree", "academic"],
    categories: ["learning", "popular"],
  },
  {
    name: "Student",
    keywords: ["student", "learner", "education"],
    categories: ["learning"],
  },
  {
    name: "Chalkboard",
    keywords: ["chalkboard", "teach", "class", "lesson"],
    categories: ["learning"],
  },
  {
    name: "ChalkboardTeacher",
    keywords: ["chalkboard", "teacher", "lesson", "teach"],
    categories: ["learning"],
  },
  {
    name: "Brain",
    keywords: ["brain", "think", "smart", "mind", "knowledge"],
    categories: ["learning", "popular"],
  },
  {
    name: "Lightbulb",
    keywords: ["lightbulb", "idea", "insight", "eureka"],
    categories: ["learning", "popular"],
  },
  {
    name: "LightbulbFilament",
    keywords: ["lightbulb", "filament", "idea", "innovation"],
    categories: ["learning"],
  },
  {
    name: "Atom",
    keywords: ["atom", "science", "physics", "molecular"],
    categories: ["learning"],
  },
  {
    name: "Flask",
    keywords: ["flask", "science", "chemistry", "experiment"],
    categories: ["learning"],
  },
  {
    name: "TestTube",
    keywords: ["test", "tube", "science", "lab"],
    categories: ["learning"],
  },
  {
    name: "MathOperations",
    keywords: ["math", "operations", "calculate", "numbers"],
    categories: ["learning"],
  },
  {
    name: "Exam",
    keywords: ["exam", "test", "quiz", "assessment"],
    categories: ["learning"],
  },
  {
    name: "Notebook",
    keywords: ["notebook", "notes", "journal", "write"],
    categories: ["learning"],
  },
  {
    name: "PencilSimple",
    keywords: ["pencil", "write", "edit", "draw"],
    categories: ["learning", "creativity"],
  },
  { name: "Pen", keywords: ["pen", "write", "sign"], categories: ["learning"] },
  {
    name: "MagnifyingGlass",
    keywords: ["magnifying", "glass", "search", "discover", "explore"],
    categories: ["learning"],
  },
  {
    name: "Compass",
    keywords: ["compass", "direction", "explore", "navigate"],
    categories: ["learning", "travel"],
  },
  {
    name: "Globe",
    keywords: ["globe", "world", "earth", "global"],
    categories: ["learning", "travel"],
  },

  // -- Coding --
  {
    name: "Code",
    keywords: ["code", "programming", "develop", "software"],
    categories: ["coding", "popular"],
  },
  {
    name: "CodeBlock",
    keywords: ["code", "block", "snippet", "programming"],
    categories: ["coding"],
  },
  {
    name: "Terminal",
    keywords: ["terminal", "console", "command", "cli"],
    categories: ["coding"],
  },
  {
    name: "TerminalWindow",
    keywords: ["terminal", "window", "console"],
    categories: ["coding"],
  },
  {
    name: "Bug",
    keywords: ["bug", "debug", "error", "fix"],
    categories: ["coding"],
  },
  {
    name: "BugBeetle",
    keywords: ["bug", "beetle", "debug"],
    categories: ["coding"],
  },
  {
    name: "GitBranch",
    keywords: ["git", "branch", "version", "control"],
    categories: ["coding"],
  },
  {
    name: "GitCommit",
    keywords: ["git", "commit", "version"],
    categories: ["coding"],
  },
  {
    name: "GitMerge",
    keywords: ["git", "merge", "pull", "request"],
    categories: ["coding"],
  },
  {
    name: "GitPullRequest",
    keywords: ["git", "pull", "request", "review"],
    categories: ["coding"],
  },
  {
    name: "Database",
    keywords: ["database", "data", "storage", "sql"],
    categories: ["coding"],
  },
  {
    name: "CloudArrowUp",
    keywords: ["cloud", "upload", "deploy", "devops"],
    categories: ["coding"],
  },
  {
    name: "Cpu",
    keywords: ["cpu", "processor", "hardware", "compute"],
    categories: ["coding"],
  },
  {
    name: "Robot",
    keywords: ["robot", "ai", "automation", "bot"],
    categories: ["coding"],
  },
  {
    name: "Wrench",
    keywords: ["wrench", "tool", "fix", "repair", "settings"],
    categories: ["coding"],
  },
  {
    name: "Gear",
    keywords: ["gear", "settings", "config", "cog"],
    categories: ["coding"],
  },
  {
    name: "GearSix",
    keywords: ["gear", "settings", "six", "config"],
    categories: ["coding"],
  },
  {
    name: "Plugs",
    keywords: ["plugs", "connect", "api", "integration"],
    categories: ["coding"],
  },
  {
    name: "Browsers",
    keywords: ["browsers", "web", "frontend", "internet"],
    categories: ["coding"],
  },
  {
    name: "Layout",
    keywords: ["layout", "design", "ui", "interface"],
    categories: ["coding", "creativity"],
  },
  {
    name: "DeviceMobile",
    keywords: ["device", "mobile", "phone", "app"],
    categories: ["coding"],
  },
  {
    name: "Desktop",
    keywords: ["desktop", "computer", "monitor", "screen"],
    categories: ["coding"],
  },

  // -- Health --
  {
    name: "Heart",
    keywords: ["heart", "love", "health", "wellness"],
    categories: ["health", "popular"],
  },
  {
    name: "Heartbeat",
    keywords: ["heartbeat", "health", "vital", "pulse"],
    categories: ["health"],
  },
  {
    name: "FirstAid",
    keywords: ["first", "aid", "medical", "health"],
    categories: ["health"],
  },
  {
    name: "Pill",
    keywords: ["pill", "medicine", "health", "pharmacy"],
    categories: ["health"],
  },
  {
    name: "Barbell",
    keywords: ["barbell", "gym", "strength", "exercise"],
    categories: ["health", "sport"],
  },
  {
    name: "PersonSimpleRun",
    keywords: ["person", "run", "exercise", "fitness"],
    categories: ["health", "sport"],
  },
  {
    name: "PersonSimpleWalk",
    keywords: ["person", "walk", "exercise", "step"],
    categories: ["health"],
  },
  {
    name: "Bicycle",
    keywords: ["bicycle", "bike", "cycle", "exercise"],
    categories: ["health", "sport", "travel"],
  },
  {
    name: "HandHeart",
    keywords: ["hand", "heart", "care", "wellness"],
    categories: ["health"],
  },
  {
    name: "YinYang",
    keywords: ["yin", "yang", "balance", "harmony", "mindfulness"],
    categories: ["health"],
  },
  {
    name: "SmileyWink",
    keywords: ["smiley", "wink", "happy", "mood"],
    categories: ["health"],
  },
  {
    name: "Smiley",
    keywords: ["smiley", "happy", "mood", "wellbeing"],
    categories: ["health"],
  },
  {
    name: "SunHorizon",
    keywords: ["sun", "horizon", "morning", "wellness", "routine"],
    categories: ["health", "nature"],
  },
  {
    name: "Moon",
    keywords: ["moon", "night", "sleep", "rest"],
    categories: ["health", "nature"],
  },
  {
    name: "BowlFood",
    keywords: ["bowl", "food", "nutrition", "meal"],
    categories: ["health"],
  },
  {
    name: "AppleLogo",
    keywords: ["apple", "fruit", "healthy", "nutrition"],
    categories: ["health", "nature"],
  },

  // -- Creativity --
  {
    name: "PaintBrush",
    keywords: ["paint", "brush", "art", "draw", "creative"],
    categories: ["creativity", "popular"],
  },
  {
    name: "Palette",
    keywords: ["palette", "color", "art", "paint"],
    categories: ["creativity", "popular"],
  },
  {
    name: "Pencil",
    keywords: ["pencil", "draw", "sketch", "write"],
    categories: ["creativity"],
  },
  {
    name: "PaintRoller",
    keywords: ["paint", "roller", "decorate", "design"],
    categories: ["creativity"],
  },
  {
    name: "Camera",
    keywords: ["camera", "photo", "picture", "capture"],
    categories: ["creativity"],
  },
  {
    name: "FilmStrip",
    keywords: ["film", "strip", "movie", "video", "cinema"],
    categories: ["creativity"],
  },
  {
    name: "VideoCamera",
    keywords: ["video", "camera", "film", "record"],
    categories: ["creativity"],
  },
  {
    name: "MusicNote",
    keywords: ["music", "note", "song", "audio"],
    categories: ["creativity", "popular"],
  },
  {
    name: "MusicNotes",
    keywords: ["music", "notes", "melody", "song"],
    categories: ["creativity"],
  },
  {
    name: "Guitar",
    keywords: ["guitar", "music", "instrument", "play"],
    categories: ["creativity"],
  },
  {
    name: "PianoKeys",
    keywords: ["piano", "keys", "music", "instrument"],
    categories: ["creativity"],
  },
  {
    name: "Microphone",
    keywords: ["microphone", "mic", "speak", "record", "sing"],
    categories: ["creativity", "communication"],
  },
  {
    name: "Scissors",
    keywords: ["scissors", "cut", "craft", "create"],
    categories: ["creativity"],
  },
  {
    name: "Cube",
    keywords: ["cube", "3d", "model", "build"],
    categories: ["creativity"],
  },
  {
    name: "Shapes",
    keywords: ["shapes", "design", "geometry", "creative"],
    categories: ["creativity"],
  },
  {
    name: "MagicWand",
    keywords: ["magic", "wand", "sparkle", "create"],
    categories: ["creativity"],
  },
  {
    name: "Aperture",
    keywords: ["aperture", "lens", "focus", "photography"],
    categories: ["creativity"],
  },

  // -- Nature --
  {
    name: "Tree",
    keywords: ["tree", "nature", "forest", "grow"],
    categories: ["nature"],
  },
  {
    name: "Plant",
    keywords: ["plant", "grow", "garden", "green"],
    categories: ["nature", "popular"],
  },
  {
    name: "Flower",
    keywords: ["flower", "bloom", "garden", "spring"],
    categories: ["nature"],
  },
  {
    name: "FlowerLotus",
    keywords: ["flower", "lotus", "zen", "meditation"],
    categories: ["nature", "health"],
  },
  {
    name: "Leaf",
    keywords: ["leaf", "nature", "green", "eco"],
    categories: ["nature"],
  },
  {
    name: "Sun",
    keywords: ["sun", "bright", "day", "energy"],
    categories: ["nature"],
  },
  {
    name: "CloudSun",
    keywords: ["cloud", "sun", "weather", "partly"],
    categories: ["nature"],
  },
  {
    name: "Mountains",
    keywords: ["mountains", "peak", "climb", "nature", "hike"],
    categories: ["nature", "travel"],
  },
  {
    name: "Waves",
    keywords: ["wave", "waves", "ocean", "sea", "water"],
    categories: ["nature"],
  },
  {
    name: "Drop",
    keywords: ["drop", "water", "rain", "liquid"],
    categories: ["nature"],
  },
  {
    name: "Fire",
    keywords: ["fire", "flame", "hot", "energy", "streak"],
    categories: ["nature", "popular"],
  },
  {
    name: "Lightning",
    keywords: ["lightning", "bolt", "power", "energy", "fast"],
    categories: ["nature", "popular"],
  },
  {
    name: "Snowflake",
    keywords: ["snowflake", "winter", "cold", "ice"],
    categories: ["nature"],
  },
  {
    name: "Rainbow",
    keywords: ["rainbow", "color", "hope", "pride"],
    categories: ["nature"],
  },
  {
    name: "PawPrint",
    keywords: ["paw", "print", "pet", "animal", "dog", "cat"],
    categories: ["nature"],
  },
  {
    name: "Bird",
    keywords: ["bird", "fly", "freedom", "nature"],
    categories: ["nature"],
  },
  {
    name: "Butterfly",
    keywords: ["butterfly", "transform", "metamorphosis", "nature"],
    categories: ["nature"],
  },
  {
    name: "Fish",
    keywords: ["fish", "water", "aquatic", "sea"],
    categories: ["nature"],
  },

  // -- Communication --
  {
    name: "ChatCircle",
    keywords: ["chat", "circle", "message", "talk"],
    categories: ["communication"],
  },
  {
    name: "ChatDots",
    keywords: ["chat", "dots", "typing", "message"],
    categories: ["communication"],
  },
  {
    name: "EnvelopeSimple",
    keywords: ["envelope", "email", "mail", "message"],
    categories: ["communication"],
  },
  {
    name: "Megaphone",
    keywords: ["megaphone", "announce", "shout", "broadcast"],
    categories: ["communication"],
  },
  {
    name: "ShareNetwork",
    keywords: ["share", "network", "social", "connect"],
    categories: ["communication"],
  },
  {
    name: "Users",
    keywords: ["users", "people", "team", "group"],
    categories: ["communication", "popular"],
  },
  {
    name: "UserCircle",
    keywords: ["user", "circle", "person", "profile"],
    categories: ["communication"],
  },
  {
    name: "Handshake",
    keywords: ["handshake", "deal", "agreement", "partner"],
    categories: ["communication"],
  },
  {
    name: "Chats",
    keywords: ["chats", "conversation", "discuss", "forum"],
    categories: ["communication"],
  },
  {
    name: "Translate",
    keywords: ["translate", "language", "international"],
    categories: ["communication", "learning"],
  },
  {
    name: "Presentation",
    keywords: ["presentation", "slides", "speak", "demo"],
    categories: ["communication", "learning"],
  },

  // -- Finance --
  {
    name: "CurrencyDollar",
    keywords: ["currency", "dollar", "money", "finance"],
    categories: ["finance"],
  },
  {
    name: "Coin",
    keywords: ["coin", "money", "token", "currency"],
    categories: ["finance"],
  },
  {
    name: "Coins",
    keywords: ["coins", "money", "savings", "collection"],
    categories: ["finance"],
  },
  {
    name: "Wallet",
    keywords: ["wallet", "money", "pay", "finance"],
    categories: ["finance"],
  },
  {
    name: "PiggyBank",
    keywords: ["piggy", "bank", "savings", "money"],
    categories: ["finance"],
  },
  {
    name: "ChartLineUp",
    keywords: ["chart", "line", "up", "growth", "progress"],
    categories: ["finance", "popular"],
  },
  {
    name: "ChartBar",
    keywords: ["chart", "bar", "data", "analytics"],
    categories: ["finance"],
  },
  {
    name: "TrendUp",
    keywords: ["trend", "up", "growth", "increase"],
    categories: ["finance"],
  },
  {
    name: "Scales",
    keywords: ["scales", "balance", "justice", "weigh"],
    categories: ["finance"],
  },

  // -- Sport --
  {
    name: "SoccerBall",
    keywords: ["soccer", "ball", "football", "sport"],
    categories: ["sport"],
  },
  {
    name: "Basketball",
    keywords: ["basketball", "sport", "ball", "game"],
    categories: ["sport"],
  },
  {
    name: "TennisBall",
    keywords: ["tennis", "ball", "racket", "sport"],
    categories: ["sport"],
  },
  {
    name: "Baseball",
    keywords: ["baseball", "sport", "ball", "game"],
    categories: ["sport"],
  },
  {
    name: "Football",
    keywords: ["football", "american", "sport", "ball"],
    categories: ["sport"],
  },
  {
    name: "SwimmingPool",
    keywords: ["swimming", "pool", "water", "sport"],
    categories: ["sport", "health"],
  },
  {
    name: "PersonSimpleBike",
    keywords: ["person", "bike", "cycling", "sport"],
    categories: ["sport", "health"],
  },

  // -- Travel --
  {
    name: "Airplane",
    keywords: ["airplane", "fly", "travel", "trip"],
    categories: ["travel"],
  },
  {
    name: "MapPin",
    keywords: ["map", "pin", "location", "place"],
    categories: ["travel"],
  },
  {
    name: "Tent",
    keywords: ["tent", "camp", "outdoor", "adventure"],
    categories: ["travel"],
  },
  {
    name: "Backpack",
    keywords: ["backpack", "bag", "travel", "hike"],
    categories: ["travel"],
  },
  {
    name: "Binoculars",
    keywords: ["binoculars", "look", "explore", "discover"],
    categories: ["travel"],
  },
  {
    name: "House",
    keywords: ["house", "home", "shelter"],
    categories: ["travel"],
  },
  {
    name: "RocketLaunch",
    keywords: ["rocket", "launch", "space", "blast"],
    categories: ["travel", "popular"],
  },
  {
    name: "Rocket",
    keywords: ["rocket", "space", "launch", "fly"],
    categories: ["travel"],
  },

  // ---- Expansion: extended badge-relevant icons ----
  {
    name: "AddressBook",
    keywords: ["address", "book", "contacts", "directory"],
    categories: ["communication"],
  },
  {
    name: "Alien",
    keywords: ["alien", "ufo", "extraterrestrial"],
    categories: ["achievement"],
  },
  {
    name: "Ambulance",
    keywords: ["ambulance", "emergency", "medical"],
    categories: ["health"],
  },
  {
    name: "Anchor",
    keywords: ["anchor", "steadfast", "grounded", "stable"],
    categories: ["achievement"],
  },
  {
    name: "AngularLogo",
    keywords: ["angular", "logo", "framework"],
    categories: ["coding"],
  },
  {
    name: "AppStoreLogo",
    keywords: ["appstore", "app", "store", "ios"],
    categories: ["coding"],
  },
  {
    name: "AppWindow",
    keywords: ["app", "window", "screen", "ui"],
    categories: ["coding"],
  },
  {
    name: "ApplePodcastsLogo",
    keywords: ["apple", "podcasts", "podcast", "logo"],
    categories: ["creativity", "communication"],
  },
  {
    name: "Archive",
    keywords: ["archive", "store", "box"],
    categories: ["coding"],
  },
  {
    name: "Armchair",
    keywords: ["armchair", "chair", "rest", "relax"],
    categories: ["health"],
  },
  {
    name: "ArrowClockwise",
    keywords: ["arrow", "clockwise", "refresh", "repeat"],
    categories: ["achievement"],
  },
  {
    name: "ArrowsClockwise",
    keywords: ["arrows", "clockwise", "sync", "streak"],
    categories: ["achievement"],
  },
  {
    name: "Avocado",
    keywords: ["avocado", "food", "fruit", "healthy"],
    categories: ["health"],
  },
  {
    name: "Axe",
    keywords: ["axe", "chop", "wood", "outdoor"],
    categories: ["nature"],
  },
  {
    name: "Baby",
    keywords: ["baby", "infant", "family"],
    categories: ["health"],
  },
  {
    name: "BabyCarriage",
    keywords: ["baby", "carriage", "stroller", "pram", "family"],
    categories: ["health"],
  },
  {
    name: "Balloon",
    keywords: ["balloon", "celebrate", "party"],
    categories: ["achievement"],
  },
  {
    name: "Bandaids",
    keywords: ["bandaids", "bandage", "first aid", "heal"],
    categories: ["health"],
  },
  {
    name: "Bank",
    keywords: ["bank", "money", "finance"],
    categories: ["finance"],
  },
  {
    name: "Barn",
    keywords: ["barn", "farm", "rural"],
    categories: ["nature"],
  },
  {
    name: "BaseballCap",
    keywords: ["baseball", "cap", "hat", "sport"],
    categories: ["sport"],
  },
  {
    name: "BaseballHelmet",
    keywords: ["baseball", "helmet", "sport", "protect"],
    categories: ["sport"],
  },
  {
    name: "Basket",
    keywords: ["basket", "carry", "pick"],
    categories: ["nature"],
  },
  {
    name: "Bathtub",
    keywords: ["bathtub", "bath", "self", "care", "rest"],
    categories: ["health"],
  },
  {
    name: "BatteryCharging",
    keywords: ["battery", "charging", "power", "energy"],
    categories: ["coding"],
  },
  {
    name: "BeachBall",
    keywords: ["beach", "ball", "play", "summer"],
    categories: ["sport", "travel"],
  },
  {
    name: "Beanie",
    keywords: ["beanie", "hat", "winter"],
    categories: ["sport"],
  },
  {
    name: "Blueprint",
    keywords: ["blueprint", "plan", "design", "architecture"],
    categories: ["coding"],
  },
  {
    name: "Boat",
    keywords: ["boat", "sail", "water", "travel"],
    categories: ["travel"],
  },
  {
    name: "Bone",
    keywords: ["bone", "anatomy", "skeleton"],
    categories: ["health"],
  },
  {
    name: "Bookmark",
    keywords: ["bookmark", "save", "mark", "reading"],
    categories: ["learning"],
  },
  {
    name: "Boot",
    keywords: ["boot", "footwear", "hike", "travel"],
    categories: ["travel"],
  },
  {
    name: "Boules",
    keywords: ["boules", "petanque", "lawn", "sport"],
    categories: ["sport"],
  },
  {
    name: "BowlSteam",
    keywords: ["bowl", "steam", "soup", "ramen", "food"],
    categories: ["health"],
  },
  {
    name: "BowlingBall",
    keywords: ["bowling", "ball", "strike", "sport"],
    categories: ["sport"],
  },
  {
    name: "Bread",
    keywords: ["bread", "loaf", "bake", "food"],
    categories: ["health"],
  },
  {
    name: "Bridge",
    keywords: ["bridge", "cross", "connect"],
    categories: ["travel"],
  },
  {
    name: "BriefcaseMetal",
    keywords: ["briefcase", "metal", "work", "business"],
    categories: ["coding"],
  },
  {
    name: "Broom",
    keywords: ["broom", "sweep", "clean", "tidy"],
    categories: ["health"],
  },
  {
    name: "Cactus",
    keywords: ["cactus", "plant", "desert"],
    categories: ["nature"],
  },
  {
    name: "Cake",
    keywords: ["cake", "birthday", "celebrate", "achievement"],
    categories: ["achievement"],
  },
  {
    name: "Calculator",
    keywords: ["calculator", "math", "compute"],
    categories: ["coding"],
  },
  {
    name: "Calendar",
    keywords: ["calendar", "date", "schedule"],
    categories: ["achievement"],
  },
  {
    name: "CalendarBlank",
    keywords: ["calendar", "blank", "date"],
    categories: ["achievement"],
  },
  {
    name: "CalendarCheck",
    keywords: ["calendar", "check", "done", "complete"],
    categories: ["achievement"],
  },
  {
    name: "CalendarHeart",
    keywords: ["calendar", "heart", "wellness", "habit"],
    categories: ["achievement", "health"],
  },
  {
    name: "CallBell",
    keywords: ["call", "bell", "service", "alert"],
    categories: ["communication"],
  },
  {
    name: "Campfire",
    keywords: ["campfire", "fire", "camp", "outdoor"],
    categories: ["nature", "travel"],
  },
  {
    name: "Car",
    keywords: ["car", "drive", "vehicle"],
    categories: ["travel"],
  },
  {
    name: "CarBattery",
    keywords: ["car", "battery", "auto", "power"],
    categories: ["travel"],
  },
  {
    name: "Cardholder",
    keywords: ["cardholder", "wallet", "card"],
    categories: ["finance"],
  },
  {
    name: "Carrot",
    keywords: ["carrot", "vegetable", "food", "healthy"],
    categories: ["health"],
  },
  {
    name: "CashRegister",
    keywords: ["cash", "register", "checkout", "money"],
    categories: ["finance"],
  },
  {
    name: "CassetteTape",
    keywords: ["cassette", "tape", "music", "retro"],
    categories: ["creativity"],
  },
  {
    name: "CastleTurret",
    keywords: ["castle", "turret", "fortress"],
    categories: ["travel"],
  },
  {
    name: "Cat",
    keywords: ["cat", "animal", "pet", "feline"],
    categories: ["nature"],
  },
  {
    name: "Chair",
    keywords: ["chair", "sit", "rest"],
    categories: ["health"],
  },
  {
    name: "ChalkboardSimple",
    keywords: ["chalkboard", "simple", "teach", "class"],
    categories: ["learning"],
  },
  {
    name: "ChatCircleSlash",
    keywords: ["chat", "circle", "slash", "mute", "silence"],
    categories: ["communication"],
  },
  {
    name: "ChatCircleText",
    keywords: ["chat", "circle", "text", "message"],
    categories: ["communication"],
  },
  {
    name: "CheckSquare",
    keywords: ["check", "square", "done", "task"],
    categories: ["achievement"],
  },
  {
    name: "Checks",
    keywords: ["checks", "checkmarks", "completed", "tasks"],
    categories: ["achievement"],
  },
  {
    name: "CigaretteSlash",
    keywords: ["cigarette", "slash", "quit", "smoking", "recovery"],
    categories: ["health"],
  },
  {
    name: "Circuitry",
    keywords: ["circuitry", "circuit", "electronics", "hardware"],
    categories: ["coding"],
  },
  {
    name: "City",
    keywords: ["city", "urban", "skyline"],
    categories: ["travel"],
  },
  {
    name: "Clock",
    keywords: ["clock", "time", "hour"],
    categories: ["achievement"],
  },
  {
    name: "ClockClockwise",
    keywords: ["clock", "clockwise", "rewind", "history"],
    categories: ["achievement"],
  },
  {
    name: "CloudFog",
    keywords: ["cloud", "fog", "weather", "mist"],
    categories: ["nature"],
  },
  {
    name: "CloudLightning",
    keywords: ["cloud", "lightning", "storm", "weather"],
    categories: ["nature"],
  },
  {
    name: "CloudMoon",
    keywords: ["cloud", "moon", "night", "weather"],
    categories: ["nature"],
  },
  {
    name: "CloudRain",
    keywords: ["cloud", "rain", "weather", "wet"],
    categories: ["nature"],
  },
  {
    name: "CloudSnow",
    keywords: ["cloud", "snow", "winter", "weather"],
    categories: ["nature"],
  },
  {
    name: "Clover",
    keywords: ["clover", "luck", "shamrock", "plant"],
    categories: ["nature"],
  },
  {
    name: "CompassRose",
    keywords: ["compass", "rose", "navigate", "direction"],
    categories: ["travel"],
  },
  {
    name: "CompassTool",
    keywords: ["compass", "tool", "draft", "measure"],
    categories: ["coding"],
  },
  {
    name: "Cookie",
    keywords: ["cookie", "treat", "snack", "food"],
    categories: ["health"],
  },
  {
    name: "Cow",
    keywords: ["cow", "animal", "farm"],
    categories: ["nature"],
  },
  {
    name: "CowboyHat",
    keywords: ["cowboy", "hat", "western", "adventure"],
    categories: ["travel"],
  },
  {
    name: "Cross",
    keywords: ["cross", "medical", "plus"],
    categories: ["health"],
  },
  {
    name: "Crosshair",
    keywords: ["crosshair", "target", "aim", "focus"],
    categories: ["achievement"],
  },
  {
    name: "Detective",
    keywords: ["detective", "investigate", "search", "mystery"],
    categories: ["achievement"],
  },
  {
    name: "DevToLogo",
    keywords: ["devto", "dev", "logo", "developer"],
    categories: ["coding"],
  },
  {
    name: "DiscoBall",
    keywords: ["disco", "ball", "party", "music"],
    categories: ["creativity"],
  },
  {
    name: "DiscordLogo",
    keywords: ["discord", "logo", "chat", "community"],
    categories: ["communication", "coding"],
  },
  {
    name: "Dna",
    keywords: ["dna", "genetics", "biology", "molecular"],
    categories: ["health"],
  },
  {
    name: "Dog",
    keywords: ["dog", "animal", "pet", "canine"],
    categories: ["nature"],
  },
  {
    name: "Dress",
    keywords: ["dress", "clothing", "outfit"],
    categories: ["achievement"],
  },
  {
    name: "Egg",
    keywords: ["egg", "food", "breakfast"],
    categories: ["health"],
  },
  {
    name: "EggCrack",
    keywords: ["egg", "crack", "hatch", "begin"],
    categories: ["health"],
  },
  {
    name: "Engine",
    keywords: ["engine", "motor", "mechanic"],
    categories: ["coding"],
  },
  {
    name: "Eye",
    keywords: ["eye", "see", "watch", "vision"],
    categories: ["health"],
  },
  {
    name: "EyeClosed",
    keywords: ["eye", "closed", "rest", "sleep"],
    categories: ["health"],
  },
  {
    name: "EyeSlash",
    keywords: ["eye", "slash", "hide", "invisible"],
    categories: ["health"],
  },
  {
    name: "Eyes",
    keywords: ["eyes", "watch", "observe", "vision"],
    categories: ["health"],
  },
  {
    name: "Feather",
    keywords: ["feather", "light", "write", "quill"],
    categories: ["creativity"],
  },
  {
    name: "FileArrowUp",
    keywords: ["file", "arrow", "up", "upload"],
    categories: ["coding"],
  },
  {
    name: "FileAudio",
    keywords: ["file", "audio", "sound", "music"],
    categories: ["coding", "creativity"],
  },
  {
    name: "FileC",
    keywords: ["file", "c", "code", "language"],
    categories: ["coding"],
  },
  {
    name: "FileCSharp",
    keywords: ["file", "csharp", "code", "dotnet"],
    categories: ["coding"],
  },
  {
    name: "FileCloud",
    keywords: ["file", "cloud", "sync", "remote"],
    categories: ["coding"],
  },
  {
    name: "FileCode",
    keywords: ["file", "code", "source"],
    categories: ["coding"],
  },
  {
    name: "FileCpp",
    keywords: ["file", "cpp", "c++", "code"],
    categories: ["coding"],
  },
  {
    name: "FileCss",
    keywords: ["file", "css", "style", "code"],
    categories: ["coding"],
  },
  {
    name: "FileCsv",
    keywords: ["file", "csv", "data", "spreadsheet"],
    categories: ["coding"],
  },
  {
    name: "FileDoc",
    keywords: ["file", "doc", "word", "document"],
    categories: ["coding"],
  },
  {
    name: "FileHtml",
    keywords: ["file", "html", "web", "code"],
    categories: ["coding"],
  },
  {
    name: "FileJs",
    keywords: ["file", "js", "javascript", "code"],
    categories: ["coding"],
  },
  {
    name: "FileJsx",
    keywords: ["file", "jsx", "react", "code"],
    categories: ["coding"],
  },
  {
    name: "FileMd",
    keywords: ["file", "md", "markdown", "docs"],
    categories: ["coding"],
  },
  {
    name: "FilePdf",
    keywords: ["file", "pdf", "document"],
    categories: ["coding"],
  },
  {
    name: "FilePng",
    keywords: ["file", "png", "image"],
    categories: ["coding"],
  },
  {
    name: "FilePpt",
    keywords: ["file", "ppt", "powerpoint", "presentation"],
    categories: ["coding"],
  },
  {
    name: "FilePy",
    keywords: ["file", "py", "python", "code"],
    categories: ["coding"],
  },
  {
    name: "FileRs",
    keywords: ["file", "rs", "rust", "code"],
    categories: ["coding"],
  },
  {
    name: "FileSql",
    keywords: ["file", "sql", "database", "query"],
    categories: ["coding"],
  },
  {
    name: "FileSvg",
    keywords: ["file", "svg", "vector", "image"],
    categories: ["coding"],
  },
  {
    name: "FileTs",
    keywords: ["file", "ts", "typescript", "code"],
    categories: ["coding"],
  },
  {
    name: "FileTsx",
    keywords: ["file", "tsx", "typescript", "react", "code"],
    categories: ["coding"],
  },
  {
    name: "FinnTheHuman",
    keywords: ["finn", "human", "adventure", "character"],
    categories: ["achievement"],
  },
  {
    name: "FireTruck",
    keywords: ["fire", "truck", "emergency", "rescue"],
    categories: ["travel"],
  },
  {
    name: "FirstAidKit",
    keywords: ["first", "aid", "kit", "medical", "emergency"],
    categories: ["health"],
  },
  {
    name: "FlyingSaucer",
    keywords: ["flying", "saucer", "ufo", "space"],
    categories: ["travel"],
  },
  {
    name: "FootballHelmet",
    keywords: ["football", "helmet", "sport", "protect"],
    categories: ["sport"],
  },
  {
    name: "Footprints",
    keywords: ["footprints", "steps", "walk", "trail"],
    categories: ["health"],
  },
  {
    name: "ForkKnife",
    keywords: ["fork", "knife", "eat", "meal", "food"],
    categories: ["health"],
  },
  {
    name: "GameController",
    keywords: ["game", "controller", "play", "console"],
    categories: ["creativity"],
  },
  {
    name: "Ghost",
    keywords: ["ghost", "spooky", "halloween"],
    categories: ["achievement"],
  },
  {
    name: "GithubLogo",
    keywords: ["github", "logo", "git", "code"],
    categories: ["coding"],
  },
  {
    name: "GitlabLogo",
    keywords: ["gitlab", "logo", "git", "code"],
    categories: ["coding"],
  },
  {
    name: "Graph",
    keywords: ["graph", "network", "data", "nodes"],
    categories: ["coding"],
  },
  {
    name: "Hamburger",
    keywords: ["hamburger", "burger", "food", "meal"],
    categories: ["health"],
  },
  {
    name: "Hammer",
    keywords: ["hammer", "build", "fix", "tool"],
    categories: ["coding"],
  },
  {
    name: "Hand",
    keywords: ["hand", "gesture", "wave"],
    categories: ["communication"],
  },
  {
    name: "HandArrowDown",
    keywords: ["hand", "arrow", "down", "deposit"],
    categories: ["communication"],
  },
  {
    name: "HandEye",
    keywords: ["hand", "eye", "mindful", "see"],
    categories: ["health"],
  },
  {
    name: "HandPeace",
    keywords: ["hand", "peace", "calm", "victory"],
    categories: ["health"],
  },
  {
    name: "HandsClapping",
    keywords: ["hands", "clapping", "applause", "celebrate"],
    categories: ["achievement"],
  },
  {
    name: "HandsPraying",
    keywords: ["hands", "praying", "meditate", "gratitude", "mindful"],
    categories: ["health"],
  },
  {
    name: "HardHat",
    keywords: ["hard", "hat", "construction", "safety"],
    categories: ["coding"],
  },
  {
    name: "Headphones",
    keywords: ["headphones", "audio", "music", "listen"],
    categories: ["creativity"],
  },
  {
    name: "HeartStraight",
    keywords: ["heart", "straight", "love", "wellness"],
    categories: ["health"],
  },
  {
    name: "HeartStraightBreak",
    keywords: ["heart", "straight", "break", "broken"],
    categories: ["health"],
  },
  {
    name: "HighHeel",
    keywords: ["high", "heel", "shoe", "fashion"],
    categories: ["achievement"],
  },
  {
    name: "Hoodie",
    keywords: ["hoodie", "sweater", "clothing"],
    categories: ["achievement"],
  },
  {
    name: "Hourglass",
    keywords: ["hourglass", "time", "wait", "patience"],
    categories: ["achievement", "learning"],
  },
  {
    name: "IceCream",
    keywords: ["ice", "cream", "dessert", "treat"],
    categories: ["health"],
  },
  {
    name: "Infinity",
    keywords: ["infinity", "forever", "streak", "endless"],
    categories: ["achievement"],
  },
  {
    name: "Joystick",
    keywords: ["joystick", "game", "play", "arcade"],
    categories: ["creativity"],
  },
  {
    name: "Ladder",
    keywords: ["ladder", "climb", "step", "progress"],
    categories: ["achievement"],
  },
  {
    name: "PersonArmsSpread",
    keywords: ["person", "arms", "spread", "free", "joy"],
    categories: ["health", "achievement"],
  },
  {
    name: "PersonSimpleHike",
    keywords: ["person", "hike", "trail", "walk"],
    categories: ["health", "travel"],
  },
  {
    name: "PersonSimpleSki",
    keywords: ["person", "ski", "snow", "winter", "sport"],
    categories: ["sport"],
  },
  {
    name: "PicnicTable",
    keywords: ["picnic", "table", "outdoor", "meal"],
    categories: ["travel"],
  },
  {
    name: "Pizza",
    keywords: ["pizza", "food", "slice"],
    categories: ["health"],
  },
  {
    name: "Popsicle",
    keywords: ["popsicle", "ice", "treat", "summer"],
    categories: ["health"],
  },
  {
    name: "PottedPlant",
    keywords: ["potted", "plant", "houseplant", "green"],
    categories: ["nature"],
  },
  {
    name: "PuzzlePiece",
    keywords: ["puzzle", "piece", "solve", "problem"],
    categories: ["learning"],
  },
  {
    name: "Rabbit",
    keywords: ["rabbit", "animal", "bunny", "fast"],
    categories: ["nature"],
  },
  {
    name: "Ruler",
    keywords: ["ruler", "measure", "design"],
    categories: ["coding"],
  },
  {
    name: "Scooter",
    keywords: ["scooter", "ride", "travel"],
    categories: ["travel"],
  },
  {
    name: "Shrimp",
    keywords: ["shrimp", "seafood", "food"],
    categories: ["health"],
  },
  {
    name: "SketchLogo",
    keywords: ["sketch", "logo", "design", "app"],
    categories: ["coding"],
  },
  {
    name: "Skull",
    keywords: ["skull", "danger", "death", "spooky"],
    categories: ["achievement"],
  },
  {
    name: "SpeakerHigh",
    keywords: ["speaker", "high", "volume", "audio"],
    categories: ["creativity"],
  },
  {
    name: "Sword",
    keywords: ["sword", "battle", "fight", "warrior"],
    categories: ["achievement"],
  },
  {
    name: "Tag",
    keywords: ["tag", "label", "category", "name"],
    categories: ["achievement"],
  },
  {
    name: "Timer",
    keywords: ["timer", "stopwatch", "time", "countdown"],
    categories: ["achievement"],
  },
  {
    name: "Toolbox",
    keywords: ["toolbox", "tools", "fix", "kit"],
    categories: ["coding"],
  },
  {
    name: "Tractor",
    keywords: ["tractor", "farm", "vehicle"],
    categories: ["travel"],
  },
];

// ---------------------------------------------------------------------------
// Popular icons (a hand-picked subset for quick access)
// ---------------------------------------------------------------------------

/** Default "popular" icons shown when no search query is active */
export const POPULAR_ICON_NAMES: string[] = CURATED_ICONS.filter((icon) =>
  icon.categories.includes("popular"),
).map((icon) => icon.name);

// ---------------------------------------------------------------------------
// Category metadata
// ---------------------------------------------------------------------------

export const CATEGORY_LABELS: Record<IconCategory, string> = {
  popular: "Popular",
  achievement: "Achievement",
  learning: "Learning",
  coding: "Coding",
  health: "Health & Wellness",
  creativity: "Creativity",
  nature: "Nature",
  communication: "Communication",
  finance: "Finance",
  sport: "Sport",
  travel: "Travel",
};

export const CATEGORY_ORDER: IconCategory[] = [
  "popular",
  "achievement",
  "learning",
  "coding",
  "health",
  "creativity",
  "nature",
  "communication",
  "finance",
  "sport",
  "travel",
];

/** Representative Phosphor icon name for each category (used in category tab icons) */
export const CATEGORY_ICONS: Record<IconCategory, string> = {
  popular: "Star",
  achievement: "Trophy",
  learning: "GraduationCap",
  coding: "Code",
  health: "Heart",
  creativity: "PaintBrush",
  nature: "Leaf",
  communication: "ChatCircle",
  finance: "Coin",
  sport: "SoccerBall",
  travel: "Airplane",
};

// ---------------------------------------------------------------------------
// Search index
// ---------------------------------------------------------------------------

/** Lazily built inverted index: keyword -> icon names */
let _invertedIndex: Map<string, Set<string>> | null = null;

function buildInvertedIndex(): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();
  for (const entry of CURATED_ICONS) {
    for (const kw of entry.keywords) {
      // Split multi-word keywords ("first aid" -> "first", "aid") so each
      // word is independently prefix-matchable by searchIcons().
      for (const token of kw.split(/\s+/)) {
        if (!token) continue;
        const existing = index.get(token);
        if (existing) {
          existing.add(entry.name);
        } else {
          index.set(token, new Set([entry.name]));
        }
      }
    }
  }
  return index;
}

function getInvertedIndex(): Map<string, Set<string>> {
  if (!_invertedIndex) {
    _invertedIndex = buildInvertedIndex();
  }
  return _invertedIndex;
}

/**
 * Search icons by query string. Returns matching icon names sorted by relevance.
 *
 * - Splits query into words, matches against keywords (prefix match)
 * - Icons matching more query words rank higher
 * - Empty query returns popular icons
 * - Instant / no network calls
 */
export function searchIcons(query: string): string[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return POPULAR_ICON_NAMES;

  const words = trimmed.split(/\s+/);
  const index = getInvertedIndex();

  // Score each icon by how many query words it matches
  const scores = new Map<string, number>();

  for (const word of words) {
    const matched = new Set<string>();
    // Prefix matching: "tro" matches "trophy"
    for (const [keyword, icons] of index.entries()) {
      if (keyword.startsWith(word)) {
        for (const iconName of icons) {
          matched.add(iconName);
        }
      }
    }
    for (const iconName of matched) {
      scores.set(iconName, (scores.get(iconName) ?? 0) + 1);
    }
  }

  // Sort by score descending, then alphabetically
  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name]) => name);
}

/**
 * Get all icons in a category, sorted alphabetically.
 */
export function getIconsByCategory(category: IconCategory): string[] {
  return CURATED_ICONS.filter((icon) => icon.categories.includes(category))
    .map((icon) => icon.name)
    .sort();
}

/**
 * Get the full curated icon list (all unique names).
 */
export function getAllCuratedIcons(): string[] {
  return CURATED_ICONS.map((icon) => icon.name);
}

/**
 * Formats a PascalCase icon name into a human-readable label.
 * e.g. "GitPullRequest" -> "Git Pull Request"
 */
export function iconNameToLabel(name: string): string {
  return name.replace(/([A-Z])/g, " $1").trim();
}

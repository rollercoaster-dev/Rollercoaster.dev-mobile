/**
 * Icon search index for badge design
 *
 * Provides a curated set of badge-relevant Phosphor icons organized by category,
 * with instant local keyword search. No network calls required.
 *
 * The full Phosphor library has ~1500 icons. We curate ~200 badge-relevant icons
 * into categories while still allowing search across the full set by name.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IconCategory =
  | 'popular'
  | 'achievement'
  | 'learning'
  | 'coding'
  | 'health'
  | 'creativity'
  | 'nature'
  | 'communication'
  | 'finance'
  | 'sport'
  | 'travel';

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
  { name: 'Trophy', keywords: ['trophy', 'award', 'win', 'prize', 'achievement'], categories: ['achievement', 'popular'] },
  { name: 'Medal', keywords: ['medal', 'award', 'achievement', 'prize'], categories: ['achievement', 'popular'] },
  { name: 'MedalMilitary', keywords: ['medal', 'military', 'honor', 'achievement'], categories: ['achievement'] },
  { name: 'Crown', keywords: ['crown', 'king', 'queen', 'royal', 'achievement'], categories: ['achievement', 'popular'] },
  { name: 'CrownSimple', keywords: ['crown', 'simple', 'royal'], categories: ['achievement'] },
  { name: 'Star', keywords: ['star', 'favorite', 'rating', 'achievement'], categories: ['achievement', 'popular'] },
  { name: 'StarFour', keywords: ['star', 'four', 'sparkle'], categories: ['achievement'] },
  { name: 'Sparkle', keywords: ['sparkle', 'magic', 'special', 'achievement'], categories: ['achievement', 'popular'] },
  { name: 'Certificate', keywords: ['certificate', 'diploma', 'qualification'], categories: ['achievement', 'learning'] },
  { name: 'SealCheck', keywords: ['seal', 'check', 'verified', 'approved'], categories: ['achievement'] },
  { name: 'Seal', keywords: ['seal', 'badge', 'emblem'], categories: ['achievement'] },
  { name: 'ShieldCheck', keywords: ['shield', 'check', 'secure', 'verified'], categories: ['achievement'] },
  { name: 'ShieldStar', keywords: ['shield', 'star', 'defense', 'achievement'], categories: ['achievement'] },
  { name: 'Flag', keywords: ['flag', 'milestone', 'checkpoint', 'achievement'], categories: ['achievement'] },
  { name: 'FlagBanner', keywords: ['flag', 'banner', 'celebration'], categories: ['achievement'] },
  { name: 'FlagCheckered', keywords: ['flag', 'checkered', 'finish', 'race', 'complete'], categories: ['achievement', 'sport'] },
  { name: 'ThumbsUp', keywords: ['thumbs', 'up', 'like', 'approve', 'good'], categories: ['achievement', 'popular'] },
  { name: 'HandFist', keywords: ['fist', 'power', 'strength', 'achievement'], categories: ['achievement'] },
  { name: 'Confetti', keywords: ['confetti', 'celebrate', 'party'], categories: ['achievement'] },
  { name: 'Champagne', keywords: ['champagne', 'celebrate', 'toast'], categories: ['achievement'] },
  { name: 'Target', keywords: ['target', 'goal', 'aim', 'bullseye'], categories: ['achievement', 'popular'] },

  // -- Learning --
  { name: 'Book', keywords: ['book', 'read', 'learn', 'study'], categories: ['learning', 'popular'] },
  { name: 'BookOpen', keywords: ['book', 'open', 'read', 'learning'], categories: ['learning'] },
  { name: 'BookBookmark', keywords: ['book', 'bookmark', 'saved', 'reading'], categories: ['learning'] },
  { name: 'Books', keywords: ['books', 'library', 'study', 'collection'], categories: ['learning'] },
  { name: 'GraduationCap', keywords: ['graduation', 'cap', 'education', 'degree', 'academic'], categories: ['learning', 'popular'] },
  { name: 'Student', keywords: ['student', 'learner', 'education'], categories: ['learning'] },
  { name: 'Chalkboard', keywords: ['chalkboard', 'teach', 'class', 'lesson'], categories: ['learning'] },
  { name: 'ChalkboardTeacher', keywords: ['chalkboard', 'teacher', 'lesson', 'teach'], categories: ['learning'] },
  { name: 'Brain', keywords: ['brain', 'think', 'smart', 'mind', 'knowledge'], categories: ['learning', 'popular'] },
  { name: 'Lightbulb', keywords: ['lightbulb', 'idea', 'insight', 'eureka'], categories: ['learning', 'popular'] },
  { name: 'LightbulbFilament', keywords: ['lightbulb', 'filament', 'idea', 'innovation'], categories: ['learning'] },
  { name: 'Atom', keywords: ['atom', 'science', 'physics', 'molecular'], categories: ['learning'] },
  { name: 'Flask', keywords: ['flask', 'science', 'chemistry', 'experiment'], categories: ['learning'] },
  { name: 'TestTube', keywords: ['test', 'tube', 'science', 'lab'], categories: ['learning'] },
  { name: 'MathOperations', keywords: ['math', 'operations', 'calculate', 'numbers'], categories: ['learning'] },
  { name: 'Exam', keywords: ['exam', 'test', 'quiz', 'assessment'], categories: ['learning'] },
  { name: 'Notebook', keywords: ['notebook', 'notes', 'journal', 'write'], categories: ['learning'] },
  { name: 'PencilSimple', keywords: ['pencil', 'write', 'edit', 'draw'], categories: ['learning', 'creativity'] },
  { name: 'Pen', keywords: ['pen', 'write', 'sign'], categories: ['learning'] },
  { name: 'MagnifyingGlass', keywords: ['magnifying', 'glass', 'search', 'discover', 'explore'], categories: ['learning'] },
  { name: 'Compass', keywords: ['compass', 'direction', 'explore', 'navigate'], categories: ['learning', 'travel'] },
  { name: 'Globe', keywords: ['globe', 'world', 'earth', 'global'], categories: ['learning', 'travel'] },

  // -- Coding --
  { name: 'Code', keywords: ['code', 'programming', 'develop', 'software'], categories: ['coding', 'popular'] },
  { name: 'CodeBlock', keywords: ['code', 'block', 'snippet', 'programming'], categories: ['coding'] },
  { name: 'Terminal', keywords: ['terminal', 'console', 'command', 'cli'], categories: ['coding'] },
  { name: 'TerminalWindow', keywords: ['terminal', 'window', 'console'], categories: ['coding'] },
  { name: 'Bug', keywords: ['bug', 'debug', 'error', 'fix'], categories: ['coding'] },
  { name: 'BugBeetle', keywords: ['bug', 'beetle', 'debug'], categories: ['coding'] },
  { name: 'GitBranch', keywords: ['git', 'branch', 'version', 'control'], categories: ['coding'] },
  { name: 'GitCommit', keywords: ['git', 'commit', 'version'], categories: ['coding'] },
  { name: 'GitMerge', keywords: ['git', 'merge', 'pull', 'request'], categories: ['coding'] },
  { name: 'GitPullRequest', keywords: ['git', 'pull', 'request', 'review'], categories: ['coding'] },
  { name: 'Database', keywords: ['database', 'data', 'storage', 'sql'], categories: ['coding'] },
  { name: 'CloudArrowUp', keywords: ['cloud', 'upload', 'deploy', 'devops'], categories: ['coding'] },
  { name: 'Cpu', keywords: ['cpu', 'processor', 'hardware', 'compute'], categories: ['coding'] },
  { name: 'Robot', keywords: ['robot', 'ai', 'automation', 'bot'], categories: ['coding'] },
  { name: 'Wrench', keywords: ['wrench', 'tool', 'fix', 'repair', 'settings'], categories: ['coding'] },
  { name: 'Gear', keywords: ['gear', 'settings', 'config', 'cog'], categories: ['coding'] },
  { name: 'GearSix', keywords: ['gear', 'settings', 'six', 'config'], categories: ['coding'] },
  { name: 'Plugs', keywords: ['plugs', 'connect', 'api', 'integration'], categories: ['coding'] },
  { name: 'Browsers', keywords: ['browsers', 'web', 'frontend', 'internet'], categories: ['coding'] },
  { name: 'Layout', keywords: ['layout', 'design', 'ui', 'interface'], categories: ['coding', 'creativity'] },
  { name: 'DeviceMobile', keywords: ['device', 'mobile', 'phone', 'app'], categories: ['coding'] },
  { name: 'Desktop', keywords: ['desktop', 'computer', 'monitor', 'screen'], categories: ['coding'] },

  // -- Health --
  { name: 'Heart', keywords: ['heart', 'love', 'health', 'wellness'], categories: ['health', 'popular'] },
  { name: 'Heartbeat', keywords: ['heartbeat', 'health', 'vital', 'pulse'], categories: ['health'] },
  { name: 'FirstAid', keywords: ['first', 'aid', 'medical', 'health'], categories: ['health'] },
  { name: 'Pill', keywords: ['pill', 'medicine', 'health', 'pharmacy'], categories: ['health'] },
  { name: 'Barbell', keywords: ['barbell', 'gym', 'strength', 'exercise'], categories: ['health', 'sport'] },
  { name: 'PersonSimpleRun', keywords: ['person', 'run', 'exercise', 'fitness'], categories: ['health', 'sport'] },
  { name: 'PersonSimpleWalk', keywords: ['person', 'walk', 'exercise', 'step'], categories: ['health'] },
  { name: 'Bicycle', keywords: ['bicycle', 'bike', 'cycle', 'exercise'], categories: ['health', 'sport', 'travel'] },
  { name: 'HandHeart', keywords: ['hand', 'heart', 'care', 'wellness'], categories: ['health'] },
  { name: 'YinYang', keywords: ['yin', 'yang', 'balance', 'harmony', 'mindfulness'], categories: ['health'] },
  { name: 'SmileyWink', keywords: ['smiley', 'wink', 'happy', 'mood'], categories: ['health'] },
  { name: 'Smiley', keywords: ['smiley', 'happy', 'mood', 'wellbeing'], categories: ['health'] },
  { name: 'SunHorizon', keywords: ['sun', 'horizon', 'morning', 'wellness', 'routine'], categories: ['health', 'nature'] },
  { name: 'Moon', keywords: ['moon', 'night', 'sleep', 'rest'], categories: ['health', 'nature'] },
  { name: 'BowlFood', keywords: ['bowl', 'food', 'nutrition', 'meal'], categories: ['health'] },
  { name: 'AppleLogo', keywords: ['apple', 'fruit', 'healthy', 'nutrition'], categories: ['health', 'nature'] },

  // -- Creativity --
  { name: 'PaintBrush', keywords: ['paint', 'brush', 'art', 'draw', 'creative'], categories: ['creativity', 'popular'] },
  { name: 'Palette', keywords: ['palette', 'color', 'art', 'paint'], categories: ['creativity', 'popular'] },
  { name: 'Pencil', keywords: ['pencil', 'draw', 'sketch', 'write'], categories: ['creativity'] },
  { name: 'PaintRoller', keywords: ['paint', 'roller', 'decorate', 'design'], categories: ['creativity'] },
  { name: 'Camera', keywords: ['camera', 'photo', 'picture', 'capture'], categories: ['creativity'] },
  { name: 'FilmStrip', keywords: ['film', 'strip', 'movie', 'video', 'cinema'], categories: ['creativity'] },
  { name: 'VideoCamera', keywords: ['video', 'camera', 'film', 'record'], categories: ['creativity'] },
  { name: 'MusicNote', keywords: ['music', 'note', 'song', 'audio'], categories: ['creativity', 'popular'] },
  { name: 'MusicNotes', keywords: ['music', 'notes', 'melody', 'song'], categories: ['creativity'] },
  { name: 'Guitar', keywords: ['guitar', 'music', 'instrument', 'play'], categories: ['creativity'] },
  { name: 'PianoKeys', keywords: ['piano', 'keys', 'music', 'instrument'], categories: ['creativity'] },
  { name: 'Microphone', keywords: ['microphone', 'mic', 'speak', 'record', 'sing'], categories: ['creativity', 'communication'] },
  { name: 'Scissors', keywords: ['scissors', 'cut', 'craft', 'create'], categories: ['creativity'] },
  { name: 'Cube', keywords: ['cube', '3d', 'model', 'build'], categories: ['creativity'] },
  { name: 'Shapes', keywords: ['shapes', 'design', 'geometry', 'creative'], categories: ['creativity'] },
  { name: 'MagicWand', keywords: ['magic', 'wand', 'sparkle', 'create'], categories: ['creativity'] },
  { name: 'Aperture', keywords: ['aperture', 'lens', 'focus', 'photography'], categories: ['creativity'] },

  // -- Nature --
  { name: 'Tree', keywords: ['tree', 'nature', 'forest', 'grow'], categories: ['nature'] },
  { name: 'Plant', keywords: ['plant', 'grow', 'garden', 'green'], categories: ['nature', 'popular'] },
  { name: 'Flower', keywords: ['flower', 'bloom', 'garden', 'spring'], categories: ['nature'] },
  { name: 'FlowerLotus', keywords: ['flower', 'lotus', 'zen', 'meditation'], categories: ['nature', 'health'] },
  { name: 'Leaf', keywords: ['leaf', 'nature', 'green', 'eco'], categories: ['nature'] },
  { name: 'Sun', keywords: ['sun', 'bright', 'day', 'energy'], categories: ['nature'] },
  { name: 'CloudSun', keywords: ['cloud', 'sun', 'weather', 'partly'], categories: ['nature'] },
  { name: 'Mountains', keywords: ['mountains', 'peak', 'climb', 'nature', 'hike'], categories: ['nature', 'travel'] },
  { name: 'Waves', keywords: ['wave', 'waves', 'ocean', 'sea', 'water'], categories: ['nature'] },
  { name: 'Drop', keywords: ['drop', 'water', 'rain', 'liquid'], categories: ['nature'] },
  { name: 'Fire', keywords: ['fire', 'flame', 'hot', 'energy', 'streak'], categories: ['nature', 'popular'] },
  { name: 'Lightning', keywords: ['lightning', 'bolt', 'power', 'energy', 'fast'], categories: ['nature', 'popular'] },
  { name: 'Snowflake', keywords: ['snowflake', 'winter', 'cold', 'ice'], categories: ['nature'] },
  { name: 'Rainbow', keywords: ['rainbow', 'color', 'hope', 'pride'], categories: ['nature'] },
  { name: 'PawPrint', keywords: ['paw', 'print', 'pet', 'animal', 'dog', 'cat'], categories: ['nature'] },
  { name: 'Bird', keywords: ['bird', 'fly', 'freedom', 'nature'], categories: ['nature'] },
  { name: 'Butterfly', keywords: ['butterfly', 'transform', 'metamorphosis', 'nature'], categories: ['nature'] },
  { name: 'Fish', keywords: ['fish', 'water', 'aquatic', 'sea'], categories: ['nature'] },

  // -- Communication --
  { name: 'ChatCircle', keywords: ['chat', 'circle', 'message', 'talk'], categories: ['communication'] },
  { name: 'ChatDots', keywords: ['chat', 'dots', 'typing', 'message'], categories: ['communication'] },
  { name: 'EnvelopeSimple', keywords: ['envelope', 'email', 'mail', 'message'], categories: ['communication'] },
  { name: 'Megaphone', keywords: ['megaphone', 'announce', 'shout', 'broadcast'], categories: ['communication'] },
  { name: 'ShareNetwork', keywords: ['share', 'network', 'social', 'connect'], categories: ['communication'] },
  { name: 'Users', keywords: ['users', 'people', 'team', 'group'], categories: ['communication', 'popular'] },
  { name: 'UserCircle', keywords: ['user', 'circle', 'person', 'profile'], categories: ['communication'] },
  { name: 'Handshake', keywords: ['handshake', 'deal', 'agreement', 'partner'], categories: ['communication'] },
  { name: 'Chats', keywords: ['chats', 'conversation', 'discuss', 'forum'], categories: ['communication'] },
  { name: 'Translate', keywords: ['translate', 'language', 'international'], categories: ['communication', 'learning'] },
  { name: 'Presentation', keywords: ['presentation', 'slides', 'speak', 'demo'], categories: ['communication', 'learning'] },

  // -- Finance --
  { name: 'CurrencyDollar', keywords: ['currency', 'dollar', 'money', 'finance'], categories: ['finance'] },
  { name: 'Coin', keywords: ['coin', 'money', 'token', 'currency'], categories: ['finance'] },
  { name: 'Coins', keywords: ['coins', 'money', 'savings', 'collection'], categories: ['finance'] },
  { name: 'Wallet', keywords: ['wallet', 'money', 'pay', 'finance'], categories: ['finance'] },
  { name: 'PiggyBank', keywords: ['piggy', 'bank', 'savings', 'money'], categories: ['finance'] },
  { name: 'ChartLineUp', keywords: ['chart', 'line', 'up', 'growth', 'progress'], categories: ['finance', 'popular'] },
  { name: 'ChartBar', keywords: ['chart', 'bar', 'data', 'analytics'], categories: ['finance'] },
  { name: 'TrendUp', keywords: ['trend', 'up', 'growth', 'increase'], categories: ['finance'] },
  { name: 'Scales', keywords: ['scales', 'balance', 'justice', 'weigh'], categories: ['finance'] },

  // -- Sport --
  { name: 'SoccerBall', keywords: ['soccer', 'ball', 'football', 'sport'], categories: ['sport'] },
  { name: 'Basketball', keywords: ['basketball', 'sport', 'ball', 'game'], categories: ['sport'] },
  { name: 'TennisBall', keywords: ['tennis', 'ball', 'racket', 'sport'], categories: ['sport'] },
  { name: 'Baseball', keywords: ['baseball', 'sport', 'ball', 'game'], categories: ['sport'] },
  { name: 'Football', keywords: ['football', 'american', 'sport', 'ball'], categories: ['sport'] },
  { name: 'SwimmingPool', keywords: ['swimming', 'pool', 'water', 'sport'], categories: ['sport', 'health'] },
  { name: 'PersonSimpleBike', keywords: ['person', 'bike', 'cycling', 'sport'], categories: ['sport', 'health'] },

  // -- Travel --
  { name: 'Airplane', keywords: ['airplane', 'fly', 'travel', 'trip'], categories: ['travel'] },
  { name: 'MapPin', keywords: ['map', 'pin', 'location', 'place'], categories: ['travel'] },
  { name: 'Tent', keywords: ['tent', 'camp', 'outdoor', 'adventure'], categories: ['travel'] },
  { name: 'Backpack', keywords: ['backpack', 'bag', 'travel', 'hike'], categories: ['travel'] },
  { name: 'Binoculars', keywords: ['binoculars', 'look', 'explore', 'discover'], categories: ['travel'] },
  { name: 'House', keywords: ['house', 'home', 'shelter'], categories: ['travel'] },
  { name: 'RocketLaunch', keywords: ['rocket', 'launch', 'space', 'blast'], categories: ['travel', 'popular'] },
  { name: 'Rocket', keywords: ['rocket', 'space', 'launch', 'fly'], categories: ['travel'] },
];

// ---------------------------------------------------------------------------
// Popular icons (a hand-picked subset for quick access)
// ---------------------------------------------------------------------------

/** Default "popular" icons shown when no search query is active */
export const POPULAR_ICON_NAMES: string[] = CURATED_ICONS
  .filter((icon) => icon.categories.includes('popular'))
  .map((icon) => icon.name);

// ---------------------------------------------------------------------------
// Category metadata
// ---------------------------------------------------------------------------

export const CATEGORY_LABELS: Record<IconCategory, string> = {
  popular: 'Popular',
  achievement: 'Achievement',
  learning: 'Learning',
  coding: 'Coding',
  health: 'Health & Wellness',
  creativity: 'Creativity',
  nature: 'Nature',
  communication: 'Communication',
  finance: 'Finance',
  sport: 'Sport',
  travel: 'Travel',
};

export const CATEGORY_ORDER: IconCategory[] = [
  'popular',
  'achievement',
  'learning',
  'coding',
  'health',
  'creativity',
  'nature',
  'communication',
  'finance',
  'sport',
  'travel',
];

/** Representative Phosphor icon name for each category (used in category tab icons) */
export const CATEGORY_ICONS: Record<IconCategory, string> = {
  popular: 'Star',
  achievement: 'Trophy',
  learning: 'GraduationCap',
  coding: 'Code',
  health: 'Heart',
  creativity: 'PaintBrush',
  nature: 'Leaf',
  communication: 'ChatCircle',
  finance: 'Coin',
  sport: 'SoccerBall',
  travel: 'Airplane',
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
      const existing = index.get(kw);
      if (existing) {
        existing.add(entry.name);
      } else {
        index.set(kw, new Set([entry.name]));
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
  return CURATED_ICONS
    .filter((icon) => icon.categories.includes(category))
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
  return name.replace(/([A-Z])/g, ' $1').trim();
}

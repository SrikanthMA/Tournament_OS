import {
  FormEvent,
  TouchEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io } from "socket.io-client";
import {
  Activity,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Crown,
  LayoutDashboard,
  ListChecks,
  LogIn,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  Swords,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
  Wifi,
  XCircle,
  Shuffle,
  Lock,
  RotateCcw,
  GitBranch,
  Trash2,
} from "lucide-react";

type Role =
  | "Viewer"
  | "Super Admin"
  | "Registration Admin"
  | "Court 1 Umpire"
  | "Court 2 Umpire";
type StaffRole = Exclude<Role, "Viewer">;

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000";

const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"],
});

const STAFF_CREDENTIALS: Record<
  StaffRole,
  { username: string; password: string }
> = {
  "Super Admin": { username: "superadmin", password: "JP@2026" },
  "Registration Admin": { username: "registration", password: "Register@2026" },
  "Court 1 Umpire": { username: "court1", password: "Court1@2026" },
  "Court 2 Umpire": { username: "court2", password: "Court2@2026" },
};
type Page =
  | "Live"
  | "Upcoming"
  | "Registration"
  | "Participants"
  | "Brackets"
  | "Schedule"
  | "Results"
  | "Announcements"
  | "Audit"
  | "Settings";
const PUBLIC_PAGES: Page[] = [
  "Live",
  "Upcoming",
  "Schedule",
  "Brackets",
  "Results",
  "Announcements",
];
type EntryType = "Singles" | "Doubles";
type Gender = "Boys" | "Girls";
type AgeGroup = "U11" | "U13" | "U15" | "U17";
type CheckInStatus = "Registered" | "Checked In" | "Not Arrived" | "Withdrawn";

type Participant = {
  id: string;
  entryType: EntryType;
  ageGroup: AgeGroup;
  gender: Gender;
  player1: string;
  player2?: string;
  teamName?: string;
  phone: string;
  status: CheckInStatus;
  createdAt: string;
};

type BracketMatch = {
  id: string;
  round: number;
  position: number;
  sideA?: string;
  sideB?: string;
  winner?: string;
  status: "Pending" | "Ready" | "Completed" | "Bye";
  nextMatchId?: string;
  nextSlot?: "A" | "B";
};

type Bracket = {
  id: string;
  ageGroup: AgeGroup;
  gender: Gender;
  entryType: EntryType;
  title: string;
  size: number;
  rounds: BracketMatch[][];
  createdAt: string;
};

type LeagueMatch = {
  id: string;
  groupId: string;
  round: number;
  playerA: string;
  playerB: string;
  winner?: string;
  scoreA?: number;
  scoreB?: number;
  status: "Pending" | "Completed";
};

type LeagueGroup = {
  id: string;
  name: string;
  players: string[];
  matches: LeagueMatch[];
};

type LeagueStage = {
  id: string;
  ageGroup: AgeGroup;
  gender: Gender;
  entryType: EntryType;
  title: string;
  groups: LeagueGroup[];
  qualifiersPerGroup: number;
  createdAt: string;
};

type CourtMatch = {
  court: number;
  status: "Empty" | "Live" | "Paused";
  eventType?: EntryType;
  category?: string;
  round?: string;
  teamA?: string;
  teamB?: string;
  scoreA: number;
  scoreB: number;
  startedAt?: string;
  bracketId?: string;
  bracketMatchId?: string;
};

type ScheduleItem = {
  id: string;
  bracketId: string;
  bracketMatchId: string;
  match: string;
  players: string;
  round: string;
  court: string;
  time: string;
  status: "In Progress" | "Completed" | "Walkover";
};

const initialCourts: CourtMatch[] = [
  { court: 1, status: "Empty", scoreA: 0, scoreB: 0 },
  { court: 2, status: "Empty", scoreA: 0, scoreB: 0 },
];

const demoParticipants: Participant[] = [
  {
    id: "P-1001",
    entryType: "Singles",
    ageGroup: "U13",
    gender: "Boys",
    player1: "Arjun Kumar",
    phone: "9876543210",
    status: "Checked In",
    createdAt: "2026-07-17T10:00:00.000Z",
  },
  {
    id: "P-1002",
    entryType: "Singles",
    ageGroup: "U11",
    gender: "Girls",
    player1: "Ananya Rao",
    phone: "9845012345",
    status: "Registered",
    createdAt: "2026-07-17T10:05:00.000Z",
  },
  {
    id: "T-2001",
    entryType: "Doubles",
    ageGroup: "U13",
    gender: "Girls",
    player1: "Ishita Nair",
    player2: "Diya Shah",
    teamName: "Golden Smashers",
    phone: "9988776655",
    status: "Checked In",
    createdAt: "2026-07-17T10:10:00.000Z",
  },
  {
    id: "T-2002",
    entryType: "Doubles",
    ageGroup: "U11",
    gender: "Boys",
    player1: "Rohan Jain",
    player2: "Aarav Shetty",
    teamName: "Phoenix",
    phone: "9900112233",
    status: "Not Arrived",
    createdAt: "2026-07-17T10:20:00.000Z",
  },
  {
    id: "P-1003",
    entryType: "Singles",
    ageGroup: "U13",
    gender: "Boys",
    player1: "Vihaan Rao",
    phone: "9876500003",
    status: "Checked In",
    createdAt: "2026-07-17T10:22:00.000Z",
  },
  {
    id: "P-1004",
    entryType: "Singles",
    ageGroup: "U13",
    gender: "Boys",
    player1: "Kabir Shah",
    phone: "9876500004",
    status: "Checked In",
    createdAt: "2026-07-17T10:24:00.000Z",
  },
  {
    id: "P-1005",
    entryType: "Singles",
    ageGroup: "U13",
    gender: "Boys",
    player1: "Advait Nair",
    phone: "9876500005",
    status: "Checked In",
    createdAt: "2026-07-17T10:26:00.000Z",
  },
  {
    id: "P-1006",
    entryType: "Singles",
    ageGroup: "U13",
    gender: "Boys",
    player1: "Reyansh Jain",
    phone: "9876500006",
    status: "Checked In",
    createdAt: "2026-07-17T10:28:00.000Z",
  },
  {
    id: "P-1007",
    entryType: "Singles",
    ageGroup: "U13",
    gender: "Boys",
    player1: "Dhruv Shetty",
    phone: "9876500007",
    status: "Checked In",
    createdAt: "2026-07-17T10:30:00.000Z",
  },
  {
    id: "P-1008",
    entryType: "Singles",
    ageGroup: "U13",
    gender: "Boys",
    player1: "Arnav Mehta",
    phone: "9876500008",
    status: "Checked In",
    createdAt: "2026-07-17T10:32:00.000Z",
  },
  {
    id: "P-1009",
    entryType: "Singles",
    ageGroup: "U13",
    gender: "Boys",
    player1: "Ishaan Verma",
    phone: "9876500009",
    status: "Checked In",
    createdAt: "2026-07-17T10:34:00.000Z",
  },
];

const initialSchedule = [
  {
    time: "11:05 AM",
    court: "Court 1",
    match: "U11 Girls Singles",
    players: "Ananya vs Meera",
    status: "On time",
  },
  {
    time: "11:10 AM",
    court: "Court 2",
    match: "U11 Boys Doubles",
    players: "Phoenix vs Falcons",
    status: "On time",
  },
  {
    time: "11:35 AM",
    court: "Court 1",
    match: "U13 Boys Singles",
    players: "Kabir vs Advait",
    status: "Estimated",
  },
  {
    time: "11:45 AM",
    court: "Court 2",
    match: "U13 Girls Doubles",
    players: "Blaze vs Thunder",
    status: "Estimated",
  },
];

type Announcement = {
  id: string;
  text: string;
  priority: "Normal" | "Important" | "Urgent";
  createdAt: string;
};
type AuditEntry = { id: string; action: string; actor: string; time: string };

const demoAnnouncements: Announcement[] = [
  {
    id: "a-1",
    text: "Under-13 participants should remain near the reporting desk.",
    priority: "Important",
    createdAt: "10:30 AM",
  },
  {
    id: "a-2",
    text: "Court 2 is running approximately 10 minutes behind schedule.",
    priority: "Normal",
    createdAt: "10:42 AM",
  },
];

const demoAudit: AuditEntry[] = [
  {
    id: "log-1",
    action: "Tournament control system opened",
    actor: "Super Admin",
    time: "09:00 AM",
  },
  {
    id: "log-2",
    action: "Court 1 match started",
    actor: "Court 1 Umpire",
    time: "10:28 AM",
  },
  {
    id: "log-3",
    action: "Golden Smashers checked in",
    actor: "Registration Admin",
    time: "10:10 AM",
  },
];

function createRoundRobinMatches(
  groupId: string,
  players: string[],
): LeagueMatch[] {
  const rotation: Array<string | null> = [...players];
  if (rotation.length % 2 === 1) rotation.push(null);
  const rounds = rotation.length - 1;
  const half = rotation.length / 2;
  const matches: LeagueMatch[] = [];

  for (let round = 0; round < rounds; round++) {
    for (let index = 0; index < half; index++) {
      const playerA = rotation[index];
      const playerB = rotation[rotation.length - 1 - index];
      if (playerA && playerB) {
        matches.push({
          id: `league-${Date.now()}-${groupId}-${round}-${index}`,
          groupId,
          round,
          playerA,
          playerB,
          status: "Pending",
        });
      }
    }
    const fixed = rotation[0];
    const tail = rotation.slice(1);
    tail.unshift(tail.pop() ?? null);
    rotation.splice(0, rotation.length, fixed, ...tail);
  }
  return matches;
}

function createLeagueStage(
  entries: string[],
  ageGroup: AgeGroup,
  gender: Gender,
  entryType: EntryType,
  randomize: boolean,
): LeagueStage {
  const ordered = randomize ? shuffled(entries) : [...entries];
  const groupPlayers: string[][] = ordered.length <= 5 ? [ordered] : [[], []];

  if (ordered.length > 5) {
    ordered.forEach((player, index) => {
      // Snake seeding keeps both groups balanced for odd and even entry counts.
      const block = Math.floor(index / 2);
      const groupIndex = block % 2 === 0 ? index % 2 : 1 - (index % 2);
      groupPlayers[groupIndex].push(player);
    });
  }

  const groups = groupPlayers.map((players, index) => {
    const id = `group-${String.fromCharCode(65 + index)}`;
    return {
      id,
      name: `Group ${String.fromCharCode(65 + index)}`,
      players,
      matches: createRoundRobinMatches(id, players),
    };
  });

  return {
    id: `league-stage-${Date.now()}`,
    ageGroup,
    gender,
    entryType,
    title: `${ageGroup} ${gender} ${entryType}`,
    groups,
    qualifiersPerGroup:
      groups.length === 1
        ? Math.min(entries.length === 5 ? 4 : 2, entries.length)
        : 2,
    createdAt: new Date().toISOString(),
  };
}

function leagueStandings(group: LeagueGroup) {
  const table = group.players.map((player) => ({
    player,
    played: 0,
    won: 0,
    lost: 0,
    pointsFor: 0,
    pointsAgainst: 0,
  }));
  const byPlayer = new Map(table.map((row) => [row.player, row]));
  group.matches.forEach((match) => {
    if (match.status !== "Completed" || !match.winner) return;
    const a = byPlayer.get(match.playerA)!;
    const b = byPlayer.get(match.playerB)!;
    a.played += 1;
    b.played += 1;
    a.pointsFor += match.scoreA ?? 0;
    a.pointsAgainst += match.scoreB ?? 0;
    b.pointsFor += match.scoreB ?? 0;
    b.pointsAgainst += match.scoreA ?? 0;
    if (match.winner === match.playerA) {
      a.won += 1;
      b.lost += 1;
    } else {
      b.won += 1;
      a.lost += 1;
    }
  });
  return table.sort(
    (a, b) =>
      b.won - a.won ||
      b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst) ||
      b.pointsFor - a.pointsFor ||
      a.player.localeCompare(b.player),
  );
}

function nextPowerOfTwo(value: number) {
  let size = 1;
  while (size < value) size *= 2;
  return Math.max(2, size);
}

function shuffled<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function roundName(roundIndex: number, totalRounds: number) {
  const remaining = totalRounds - roundIndex;
  if (remaining === 1) return "Final";
  if (remaining === 2) return "Semifinals";
  if (remaining === 3) return "Quarterfinals";
  return `Round ${roundIndex + 1}`;
}

function createBracket(
  entries: string[],
  ageGroup: AgeGroup,
  gender: Gender,
  entryType: EntryType,
  randomize: boolean,
): Bracket {
  const ordered = randomize ? shuffled(entries) : [...entries];
  const size = nextPowerOfTwo(ordered.length);
  const totalRounds = Math.log2(size);
  // Build first-round pairings without ever creating an empty-vs-empty match.
  // Example: 5 entrants in an 8-slot bracket => 1 playable match + 3 byes.
  const firstRoundMatchCount = size / 2;
  const byeCount = size - ordered.length;
  const playableMatchCount = firstRoundMatchCount - byeCount;
  const pairs: Array<[string | undefined, string | undefined]> = [];

  let entrantIndex = 0;
  for (let i = 0; i < playableMatchCount; i++) {
    pairs.push([ordered[entrantIndex++], ordered[entrantIndex++]]);
  }
  while (entrantIndex < ordered.length) {
    pairs.push([ordered[entrantIndex++], undefined]);
  }

  // Spread playable matches and byes across the bracket for a cleaner layout.
  const arrangedPairs: Array<[string | undefined, string | undefined]> = [];
  let playableIndex = 0;
  let byeIndex = playableMatchCount;
  while (arrangedPairs.length < firstRoundMatchCount) {
    if (playableIndex < playableMatchCount)
      arrangedPairs.push(pairs[playableIndex++]);
    if (byeIndex < pairs.length) arrangedPairs.push(pairs[byeIndex++]);
  }

  const rounds: BracketMatch[][] = [];

  for (let r = 0; r < totalRounds; r++) {
    const count = size / Math.pow(2, r + 1);
    rounds.push(
      Array.from({ length: count }, (_, position) => ({
        id: `m-${Date.now()}-${r}-${position}`,
        round: r,
        position,
        status: "Pending" as const,
      })),
    );
  }

  rounds.forEach((round, r) =>
    round.forEach((match, i) => {
      if (r < totalRounds - 1) {
        match.nextMatchId = rounds[r + 1][Math.floor(i / 2)].id;
        match.nextSlot = i % 2 === 0 ? "A" : "B";
      }
    }),
  );

  rounds[0].forEach((match, i) => {
    match.sideA = arrangedPairs[i]?.[0];
    match.sideB = arrangedPairs[i]?.[1];
    if (match.sideA && match.sideB) match.status = "Ready";
    else if (match.sideA || match.sideB) {
      match.status = "Bye";
      match.winner = match.sideA || match.sideB;
    }
  });

  const bracket: Bracket = {
    id: `bracket-${Date.now()}`,
    ageGroup,
    gender,
    entryType,
    title: `${ageGroup} ${gender} ${entryType}`,
    size,
    rounds,
    createdAt: new Date().toISOString(),
  };
  return propagateByes(bracket);
}

function propagateByes(bracket: Bracket): Bracket {
  const copy: Bracket = JSON.parse(JSON.stringify(bracket));

  for (let r = 0; r < copy.rounds.length - 1; r++) {
    const sourceRound = copy.rounds[r];
    const targetRound = copy.rounds[r + 1];

    // First populate every target slot. Status calculation must happen only
    // after both source matches have been processed, otherwise the first bye
    // can incorrectly auto-win a match before its opponent is inserted.
    sourceRound.forEach((match) => {
      if (!match.winner || !match.nextMatchId || !match.nextSlot) return;
      const next = targetRound.find((item) => item.id === match.nextMatchId);
      if (!next) return;
      if (match.nextSlot === "A") next.sideA = match.winner;
      else next.sideB = match.winner;
    });

    targetRound.forEach((next) => {
      if (next.winner && next.status === "Completed") return;

      const sources = sourceRound.filter(
        (item) => item.nextMatchId === next.id,
      );
      const allSourcesResolved =
        sources.length > 0 &&
        sources.every(
          (item) => item.status === "Bye" || item.status === "Completed",
        );

      if (next.sideA && next.sideB) {
        next.status = "Ready";
        next.winner = undefined;
      } else if ((next.sideA || next.sideB) && allSourcesResolved) {
        next.status = "Bye";
        next.winner = next.sideA || next.sideB;
      } else {
        next.status = "Pending";
        next.winner = undefined;
      }
    });
  }

  return copy;
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

function CourtCard({
  match,
  editable,
  onScore,
  onFinish,
  onWalkover,
  onPause,
}: {
  match: CourtMatch;
  editable: boolean;
  onScore: (court: number, side: "A" | "B", delta: number) => void;
  onFinish: (court: number) => void;
  onWalkover: (court: number) => void;
  onPause: (court: number) => void;
}) {
  if (match.status === "Empty") {
    return (
      <section className="court-card empty-court">
        <div className="court-topline">
          <div>
            <span className="empty-pill">AVAILABLE</span>
            <h2>COURT {match.court}</h2>
          </div>
        </div>
        <div className="empty-court-body">
          <Swords size={42} />
          <h3>Court is empty</h3>
          <p>
            The Super Admin can send the next ready bracket match from the
            Schedule page.
          </p>
        </div>
      </section>
    );
  }
  return (
    <section className="court-card">
      <div className="court-topline">
        <div>
          <span className="live-pill">
            <span className="pulse" />{" "}
            {match.status === "Paused" ? "PAUSED" : "LIVE"}
          </span>
          <h2>COURT {match.court}</h2>
        </div>
        <div className="event-chip">{match.eventType}</div>
      </div>
      <div className="match-meta">
        <strong>{match.category}</strong>
        <span>{match.round}</span>
      </div>
      {(["A", "B"] as const).map((side) => (
        <div className="score-row" key={side}>
          <div className="team-name">
            {side === "A" ? match.teamA : match.teamB}
          </div>
          <div className="score-controls">
            {editable && match.status !== "Paused" && (
              <button onClick={() => onScore(match.court, side, -1)}>
                <Minus size={18} />
              </button>
            )}
            <span>{side === "A" ? match.scoreA : match.scoreB}</span>
            {editable && match.status !== "Paused" && (
              <button onClick={() => onScore(match.court, side, 1)}>
                <Plus size={18} />
              </button>
            )}
          </div>
        </div>
      ))}
      <div className="court-footer">
        <span>
          <Clock3 size={16} /> Started {match.startedAt}
        </span>
        <span>
          <Wifi size={16} /> Local live state
        </span>
      </div>
      {editable && (
        <div className="umpire-actions">
          <button className="secondary" onClick={() => onPause(match.court)}>
            {match.status === "Paused" ? "Resume" : "Pause"}
          </button>
          <button className="walkover" onClick={() => onWalkover(match.court)}>
            Walkover
          </button>
          <button className="primary" onClick={() => onFinish(match.court)}>
            Finish Match
          </button>
        </div>
      )}
    </section>
  );
}

export default function App() {
  const [now, setNow] = useState(new Date());
  const [showIntro, setShowIntro] = useState(true);
  const [role, setRole] = useState<Role>(
    () => (sessionStorage.getItem("jp-staff-role") as Role) || "Viewer",
  );
  const [showLogin, setShowLogin] = useState(false);
  const [loginRole, setLoginRole] = useState<StaffRole>("Super Admin");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [page, setPage] = useState<Page>("Live");
  const [transitionDirection, setTransitionDirection] = useState<
    "forward" | "backward"
  >("forward");
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [courts, setCourts] = useState<CourtMatch[]>(initialCourts);
  const [query, setQuery] = useState("");
  const [participantQuery, setParticipantQuery] = useState("");
  const [participants, setParticipants] =
    useState<Participant[]>(demoParticipants);
  const [form, setForm] = useState({
    entryType: "Singles" as EntryType,
    ageGroup: "U11" as AgeGroup,
    gender: "Boys" as Gender,
    player1: "",
    player2: "",
    teamName: "",
    phone: "",
  });
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [leagueStages, setLeagueStages] = useState<LeagueStage[]>([]);
  const [bracketFilter, setBracketFilter] = useState({
    ageGroup: "U13" as AgeGroup,
    gender: "Boys" as Gender,
    entryType: "Singles" as EntryType,
  });
  const [randomizeBracket, setRandomizeBracket] = useState(true);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [announcements, setAnnouncements] =
    useState<Announcement[]>(demoAnnouncements);
  const [audit, setAudit] = useState<AuditEntry[]>(demoAudit);
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementPriority, setAnnouncementPriority] =
    useState<Announcement["priority"]>("Normal");
  const [settings, setSettings] = useState({
    eventName: "Juniors Championship 2026",
    venue: "Bengaluru",
    restMinutes: 15,
    scoringCap: 21,
    logoUrl: "",
  });

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    const id = window.setTimeout(() => setShowIntro(false), 5600);
    return () => window.clearTimeout(id);
  }, []);
  const backendReady = useRef(false);
  const applyingRemoteState = useRef(false);
  const lastServerUpdatedAt = useRef("");
  const serverVersion = useRef(0);
  const saveTimer = useRef<number | null>(null);

  const applyTournamentState = (state: any) => {
    applyingRemoteState.current = true;
    if (Array.isArray(state.participants)) setParticipants(state.participants);
    if (Array.isArray(state.brackets)) setBrackets(state.brackets);
    if (Array.isArray(state.leagueStages)) setLeagueStages(state.leagueStages);
    if (Array.isArray(state.scheduleItems))
      setScheduleItems(state.scheduleItems);
    if (Array.isArray(state.courts)) setCourts(state.courts);
    if (Array.isArray(state.announcements))
      setAnnouncements(state.announcements);
    if (Array.isArray(state.audit)) setAudit(state.audit);
    if (state.settings && typeof state.settings === "object")
      setSettings((current: any) => ({
        ...current,
        ...state.settings,
        logoUrl: "",
      }));
    window.setTimeout(() => {
      applyingRemoteState.current = false;
    }, 0);
  };

  useEffect(() => {
    let cancelled = false;

    const loadSharedState = async () => {
      try {
        const response = await fetch(`${API_URL}/api/state`);

        if (!response.ok) {
          throw new Error(`Unable to load shared state (${response.status})`);
        }

        const payload = await response.json();

        if (cancelled) return;

        serverVersion.current = Number(payload.version ?? 0);
        lastServerUpdatedAt.current = payload.updatedAt || "";

        if (payload.state) {
          applyTournamentState(payload.state);
        } else {
          const initialState = {
            participants,
            brackets,
            leagueStages,
            scheduleItems,
            courts,
            announcements,
            audit,
            settings,
          };

          const createResponse = await fetch(`${API_URL}/api/state`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              state: initialState,
              baseVersion: 0,
            }),
          });

          const created = await createResponse.json().catch(() => null);

          if (!createResponse.ok) {
            throw new Error(
              created?.error ||
                `Unable to create initial shared state (${createResponse.status})`,
            );
          }

          serverVersion.current = Number(created?.version ?? 0);
          lastServerUpdatedAt.current = created?.updatedAt || "";
        }

        backendReady.current = true;
      } catch (error) {
        console.warn(
          "Backend unavailable; continuing with local browser data.",
          error,
        );
      }
    };

    loadSharedState();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!backendReady.current || applyingRemoteState.current) return;

    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
    }

    saveTimer.current = window.setTimeout(async () => {
      try {
        const response = await fetch(`${API_URL}/api/state`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            state: {
              participants,
              brackets,
              leagueStages,
              scheduleItems,
              courts,
              announcements,
              audit,
              settings,
            },
            baseVersion: serverVersion.current,
          }),
        });

        if (response.status === 409) {
          const payload = await response.json();

          serverVersion.current = Number(payload.version ?? 0);
          lastServerUpdatedAt.current = payload.updatedAt || "";

          if (payload.state) {
            applyTournamentState(payload.state);
          }

          return;
        }

        if (!response.ok) {
          const payload = await response.json().catch(() => null);

          console.warn("Tournament save failed:", response.status, payload);

          return;
        }

        const payload = await response.json();

        serverVersion.current = Number(
          payload.version ?? serverVersion.current,
        );

        lastServerUpdatedAt.current =
          payload.updatedAt || lastServerUpdatedAt.current;
      } catch (error) {
        console.warn("Could not save shared tournament state.", error);
      }
    }, 350);

    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }
    };
  }, [
    participants,
    brackets,
    leagueStages,
    scheduleItems,
    courts,
    announcements,
    audit,
    settings,
  ]);

  useEffect(() => {
    const handleConnect = () => {
      console.log("Socket.IO connected:", socket.id);
    };

    const handleStateUpdated = async (event?: {
      updatedAt?: string;
      version?: number;
    }) => {
      if (!backendReady.current || applyingRemoteState.current) return;

      if (event?.updatedAt && event.updatedAt === lastServerUpdatedAt.current) {
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/state`);

        if (!response.ok) {
          throw new Error(
            `Unable to load the latest tournament state (${response.status})`,
          );
        }

        const payload = await response.json();

        serverVersion.current = Number(
          payload.version ?? serverVersion.current,
        );

        if (!payload.state) return;

        if (
          payload.updatedAt &&
          payload.updatedAt === lastServerUpdatedAt.current
        ) {
          return;
        }

        lastServerUpdatedAt.current = payload.updatedAt || "";
        applyTournamentState(payload.state);
      } catch (error) {
        console.warn("Could not apply the real-time tournament update.", error);
      }
    };

    const handleConnectError = (error: Error) => {
      console.warn("Socket.IO connection error:", error.message);
    };

    socket.on("connect", handleConnect);
    socket.on("state-updated", handleStateUpdated);
    socket.on("connect_error", handleConnectError);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("state-updated", handleStateUpdated);
      socket.off("connect_error", handleConnectError);
    };
  }, []);

  const editableCourts = useMemo(
    () =>
      role === "Court 1 Umpire"
        ? [1]
        : role === "Court 2 Umpire"
          ? [2]
          : role === "Super Admin"
            ? [1, 2]
            : [],
    [role],
  );
  const canManageRegistration =
    role === "Super Admin" || role === "Registration Admin";

  const handleStaffLogin = (e: FormEvent) => {
    e.preventDefault();
    const expected = STAFF_CREDENTIALS[loginRole];
    if (
      loginUsername.trim() !== expected.username ||
      loginPassword !== expected.password
    ) {
      setLoginError("Incorrect username or password for the selected role.");
      return;
    }
    setRole(loginRole);
    sessionStorage.setItem("jp-staff-role", loginRole);
    setShowLogin(false);
    setLoginUsername("");
    setLoginPassword("");
    setLoginError("");
    setPage(loginRole === "Registration Admin" ? "Registration" : "Live");
  };

  const logoutStaff = () => {
    setRole("Viewer");
    sessionStorage.removeItem("jp-staff-role");
    if (!PUBLIC_PAGES.includes(page)) setPage("Live");
  };

  const logAction = (action: string) =>
    setAudit((current) =>
      [
        {
          id: `log-${Date.now()}`,
          action,
          actor: role,
          time: formatTime(new Date()),
        },
        ...current,
      ].slice(0, 100),
    );

  const publishAnnouncement = () => {
    if (role !== "Super Admin" || !announcementText.trim()) return;
    setAnnouncements((current) => [
      {
        id: `a-${Date.now()}`,
        text: announcementText.trim(),
        priority: announcementPriority,
        createdAt: formatTime(new Date()),
      },
      ...current,
    ]);
    logAction(`Published announcement: ${announcementText.trim()}`);
    setAnnouncementText("");
  };

  const deleteAnnouncement = (announcement: Announcement) => {
    if (role !== "Super Admin") return;
    if (!window.confirm("Delete this announcement?")) return;
    setAnnouncements((current) =>
      current.filter((item) => item.id !== announcement.id),
    );
    logAction(`Deleted announcement: ${announcement.text}`);
  };

  const updateScore = (court: number, side: "A" | "B", delta: number) => {
    if (!editableCourts.includes(court)) return;
    setCourts((current) =>
      current.map((match) => {
        if (match.court !== court || match.status !== "Live") return match;
        return side === "A"
          ? { ...match, scoreA: Math.max(0, match.scoreA + delta) }
          : { ...match, scoreB: Math.max(0, match.scoreB + delta) };
      }),
    );
  };

  const advanceBracketWinner = (
    bracketId: string,
    matchId: string,
    winner: string,
  ) => {
    setBrackets((current) =>
      current.map((bracket) => {
        if (bracket.id !== bracketId) return bracket;
        const copy: Bracket = JSON.parse(JSON.stringify(bracket));
        const match = copy.rounds.flat().find((item) => item.id === matchId);
        if (!match || (winner !== match.sideA && winner !== match.sideB))
          return bracket;
        match.winner = winner;
        match.status = "Completed";
        if (match.nextMatchId && match.nextSlot) {
          const next = copy.rounds
            .flat()
            .find((item) => item.id === match.nextMatchId);
          if (next) {
            if (match.nextSlot === "A") next.sideA = winner;
            else next.sideB = winner;
            if (next.sideA && next.sideB) next.status = "Ready";
          }
        }
        return propagateByes(copy);
      }),
    );
  };

  const clearCourt = (court: number) => {
    setCourts((current) =>
      current.map((item) =>
        item.court === court
          ? { court, status: "Empty", scoreA: 0, scoreB: 0 }
          : item,
      ),
    );
  };

  const finishMatch = (court: number) => {
    if (!editableCourts.includes(court)) return;
    const match = courts.find((item) => item.court === court);
    if (
      !match ||
      match.status === "Empty" ||
      !match.teamA ||
      !match.teamB ||
      !match.bracketId ||
      !match.bracketMatchId
    )
      return;
    if (match.scoreA === match.scoreB) {
      window.alert("The match cannot be finished while the scores are tied.");
      return;
    }
    const winner = match.scoreA > match.scoreB ? match.teamA : match.teamB;
    const loser = match.scoreA > match.scoreB ? match.teamB : match.teamA;
    if (
      !window.confirm(
        `Finish Court ${court} match?\n\nWinner: ${winner}\nFinal score: ${match.scoreA} - ${match.scoreB}`,
      )
    )
      return;
    advanceBracketWinner(match.bracketId, match.bracketMatchId, winner);
    setScheduleItems((current) =>
      current.map((item) =>
        item.bracketMatchId === match.bracketMatchId
          ? { ...item, status: "Completed" }
          : item,
      ),
    );
    logAction(
      `Court ${court} match completed: ${winner} defeated ${loser} ${match.scoreA}-${match.scoreB}. Court is now available.`,
    );
    clearCourt(court);
  };

  const walkoverMatch = (court: number) => {
    if (!editableCourts.includes(court)) return;
    const match = courts.find((item) => item.court === court);
    if (
      !match ||
      match.status === "Empty" ||
      !match.teamA ||
      !match.teamB ||
      !match.bracketId ||
      !match.bracketMatchId
    )
      return;
    const choice = window
      .prompt(
        `Walkover on Court ${court}. Type A if ${match.teamA} advances, or B if ${match.teamB} advances.`,
      )
      ?.trim()
      .toUpperCase();
    if (choice !== "A" && choice !== "B") return;
    const winner = choice === "A" ? match.teamA : match.teamB;
    const absent = choice === "A" ? match.teamB : match.teamA;
    if (
      !window.confirm(
        `Confirm walkover?\n\nWinner: ${winner}\nAbsent/withdrawn: ${absent}`,
      )
    )
      return;
    advanceBracketWinner(match.bracketId, match.bracketMatchId, winner);
    setScheduleItems((current) =>
      current.map((item) =>
        item.bracketMatchId === match.bracketMatchId
          ? { ...item, status: "Walkover" }
          : item,
      ),
    );
    logAction(
      `Court ${court} walkover: ${winner} advanced over ${absent}. Court is now available.`,
    );
    clearCourt(court);
  };

  const togglePause = (court: number) => {
    if (!editableCourts.includes(court)) return;
    setCourts((current) =>
      current.map((item) =>
        item.court !== court || item.status === "Empty"
          ? item
          : { ...item, status: item.status === "Paused" ? "Live" : "Paused" },
      ),
    );
  };

  const addParticipant = (e: FormEvent) => {
    e.preventDefault();
    if (
      !form.player1.trim() ||
      !form.phone.trim() ||
      (form.entryType === "Doubles" && !form.player2.trim())
    )
      return;
    const prefix = form.entryType === "Singles" ? "P" : "T";
    const participant: Participant = {
      id: `${prefix}-${Date.now().toString().slice(-6)}`,
      ...form,
      player1: form.player1.trim(),
      player2: form.entryType === "Doubles" ? form.player2.trim() : undefined,
      teamName:
        form.entryType === "Doubles"
          ? form.teamName.trim() ||
            `${form.player1.trim()} / ${form.player2.trim()}`
          : undefined,
      status: "Registered",
      createdAt: new Date().toISOString(),
    };
    setParticipants((current) => [participant, ...current]);
    logAction(
      `Registered ${participant.entryType === "Singles" ? participant.player1 : participant.teamName}`,
    );
    setForm((current) => ({
      ...current,
      player1: "",
      player2: "",
      teamName: "",
      phone: "",
    }));
  };

  const setStatus = (id: string, status: CheckInStatus) => {
    setParticipants((current) =>
      current.map((p) => (p.id === id ? { ...p, status } : p)),
    );
    logAction(`Changed ${id} status to ${status}`);
  };

  const deleteParticipant = (participant: Participant) => {
    if (!canManageRegistration) return;
    const entryName =
      participant.entryType === "Doubles"
        ? participant.teamName ||
          `${participant.player1} / ${participant.player2}`
        : participant.player1;
    const isOnCourt = courts.some(
      (court) =>
        court.status !== "Empty" &&
        (court.teamA === entryName || court.teamB === entryName),
    );
    if (isOnCourt) {
      window.alert(
        "This participant is currently assigned to a live court. Finish or clear the match before deleting the entry.",
      );
      return;
    }
    const isInBracket = brackets.some((bracket) =>
      bracket.rounds
        .flat()
        .some(
          (match) =>
            match.sideA === entryName ||
            match.sideB === entryName ||
            match.winner === entryName,
        ),
    );
    const warning = isInBracket
      ? `Delete ${entryName}?\n\nThis entry already appears in a generated bracket. The existing bracket will not be changed automatically, so regenerate that category after deletion.`
      : `Delete ${entryName}?\n\nThis permanently removes the registration from this browser.`;
    if (!window.confirm(warning)) return;
    setParticipants((current) =>
      current.filter((item) => item.id !== participant.id),
    );
    logAction(`Deleted participant ${entryName} (${participant.id})`);
  };
  const eligibleEntries = participants.filter(
    (p) =>
      p.status === "Checked In" &&
      p.ageGroup === bracketFilter.ageGroup &&
      p.gender === bracketFilter.gender &&
      p.entryType === bracketFilter.entryType,
  );
  const entryNames = eligibleEntries.map((p) =>
    p.entryType === "Doubles"
      ? p.teamName || `${p.player1} / ${p.player2}`
      : p.player1,
  );
  const currentBracket = brackets.find(
    (b) =>
      b.ageGroup === bracketFilter.ageGroup &&
      b.gender === bracketFilter.gender &&
      b.entryType === bracketFilter.entryType,
  );
  const currentLeague = leagueStages.find(
    (stage) =>
      stage.ageGroup === bracketFilter.ageGroup &&
      stage.gender === bracketFilter.gender &&
      stage.entryType === bracketFilter.entryType,
  );
  const leagueComplete = currentLeague
    ? currentLeague.groups.every((group) =>
        group.matches.every((match) => match.status === "Completed"),
      )
    : false;
  const readyMatches = brackets.flatMap((bracket) =>
    bracket.rounds.flatMap((round, roundIndex) =>
      round
        .filter(
          (match) => match.status === "Ready" && match.sideA && match.sideB,
        )
        .filter(
          (match) => !courts.some((court) => court.bracketMatchId === match.id),
        )
        .map((match) => ({
          bracket,
          match,
          roundLabel: roundName(roundIndex, bracket.rounds.length),
        })),
    ),
  );

  const sendMatchToCourt = (
    bracketId: string,
    matchId: string,
    courtNumber: number,
  ) => {
    if (role !== "Super Admin") return;
    const court = courts.find((item) => item.court === courtNumber);
    if (!court || court.status !== "Empty") {
      window.alert(`Court ${courtNumber} is currently occupied.`);
      return;
    }
    const bracket = brackets.find((item) => item.id === bracketId);
    const bracketMatch = bracket?.rounds
      .flat()
      .find((item) => item.id === matchId);
    if (
      !bracket ||
      !bracketMatch ||
      bracketMatch.status !== "Ready" ||
      !bracketMatch.sideA ||
      !bracketMatch.sideB
    )
      return;
    const roundIndex = bracketMatch.round;
    const startedAt = formatTime(new Date());
    setCourts((current) =>
      current.map((item) =>
        item.court === courtNumber
          ? {
              court: courtNumber,
              status: "Live",
              eventType: bracket.entryType,
              category: bracket.title,
              round: roundName(roundIndex, bracket.rounds.length),
              teamA: bracketMatch.sideA,
              teamB: bracketMatch.sideB,
              scoreA: 0,
              scoreB: 0,
              startedAt,
              bracketId,
              bracketMatchId: matchId,
            }
          : item,
      ),
    );
    setScheduleItems((current) => [
      {
        id: `schedule-${Date.now()}`,
        bracketId,
        bracketMatchId: matchId,
        match: bracket.title,
        players: `${bracketMatch.sideA} vs ${bracketMatch.sideB}`,
        round: roundName(roundIndex, bracket.rounds.length),
        court: `Court ${courtNumber}`,
        time: startedAt,
        status: "In Progress",
      },
      ...current.filter((item) => item.bracketMatchId !== matchId),
    ]);
    logAction(
      `Sent ${bracketMatch.sideA} vs ${bracketMatch.sideB} to Court ${courtNumber}`,
    );
  };

  const generateTournamentFormat = () => {
    if (role !== "Super Admin" || entryNames.length < 2) return;
    const generated = createLeagueStage(
      entryNames,
      bracketFilter.ageGroup,
      bracketFilter.gender,
      bracketFilter.entryType,
      randomizeBracket,
    );
    setLeagueStages((current) => [
      ...current.filter(
        (stage) =>
          !(
            stage.ageGroup === generated.ageGroup &&
            stage.gender === generated.gender &&
            stage.entryType === generated.entryType
          ),
      ),
      generated,
    ]);
    setBrackets((current) =>
      current.filter(
        (bracket) =>
          !(
            bracket.ageGroup === generated.ageGroup &&
            bracket.gender === generated.gender &&
            bracket.entryType === generated.entryType
          ),
      ),
    );
    logAction(
      `Generated ${generated.groups.length === 1 ? "one league group" : "two balanced league groups"} for ${generated.title}`,
    );
  };

  const recordLeagueResult = (
    groupId: string,
    matchId: string,
    winner: string,
  ) => {
    if (role !== "Super Admin") return;
    const score = window.prompt(
      `Enter final score as A-B for this match. Example: 21-15`,
      "21-15",
    );
    if (!score) return;
    const parsed = score.match(/^\s*(\d+)\s*[-:]\s*(\d+)\s*$/);
    if (!parsed) {
      window.alert("Please enter the score in A-B format, for example 21-15.");
      return;
    }
    const scoreA = Number(parsed[1]);
    const scoreB = Number(parsed[2]);
    if (scoreA === scoreB) {
      window.alert("A completed badminton match cannot end in a tie.");
      return;
    }
    setLeagueStages((current) =>
      current.map((stage) => {
        if (stage.id !== currentLeague?.id) return stage;
        return {
          ...stage,
          groups: stage.groups.map((group) =>
            group.id !== groupId
              ? group
              : {
                  ...group,
                  matches: group.matches.map((match) =>
                    match.id !== matchId
                      ? match
                      : {
                          ...match,
                          winner,
                          scoreA,
                          scoreB,
                          status: "Completed" as const,
                        },
                  ),
                },
          ),
        };
      }),
    );
    logAction(`Recorded league result for ${winner}`);
  };

  const generateKnockoutFromLeague = () => {
    if (role !== "Super Admin" || !currentLeague || !leagueComplete) return;
    const qualifiers = currentLeague.groups.flatMap((group) =>
      leagueStandings(group)
        .slice(0, currentLeague.qualifiersPerGroup)
        .map((row) => row.player),
    );
    const seeded =
      currentLeague.groups.length === 2 && qualifiers.length >= 4
        ? [qualifiers[0], qualifiers[3], qualifiers[1], qualifiers[2]]
        : qualifiers;
    const generated = createBracket(
      seeded,
      currentLeague.ageGroup,
      currentLeague.gender,
      currentLeague.entryType,
      false,
    );
    setBrackets((current) => [
      ...current.filter(
        (b) =>
          !(
            b.ageGroup === generated.ageGroup &&
            b.gender === generated.gender &&
            b.entryType === generated.entryType
          ),
      ),
      generated,
    ]);
    logAction(
      `Generated knockout bracket for ${generated.title} from league qualifiers`,
    );
  };

  const selectWinner = (matchId: string, winner: string) => {
    if (role !== "Super Admin") return;
    setBrackets((current) =>
      current.map((bracket) => {
        const target = bracket.rounds
          .flat()
          .find((match) => match.id === matchId);
        if (
          !target ||
          target.status !== "Ready" ||
          (winner !== target.sideA && winner !== target.sideB)
        )
          return bracket;
        const copy: Bracket = JSON.parse(JSON.stringify(bracket));
        const match = copy.rounds.flat().find((item) => item.id === matchId)!;
        match.winner = winner;
        match.status = "Completed";
        if (match.nextMatchId && match.nextSlot) {
          const next = copy.rounds
            .flat()
            .find((item) => item.id === match.nextMatchId);
          if (next) {
            if (match.nextSlot === "A") next.sideA = winner;
            else next.sideB = winner;
            if (next.sideA && next.sideB) next.status = "Ready";
          }
        }
        return propagateByes(copy);
      }),
    );
  };

  const resetBracket = () => {
    if (role !== "Super Admin") return;
    setBrackets((current) =>
      current.filter(
        (b) =>
          !(
            b.ageGroup === bracketFilter.ageGroup &&
            b.gender === bracketFilter.gender &&
            b.entryType === bracketFilter.entryType
          ),
      ),
    );
    setLeagueStages((current) =>
      current.filter(
        (stage) =>
          !(
            stage.ageGroup === bracketFilter.ageGroup &&
            stage.gender === bracketFilter.gender &&
            stage.entryType === bracketFilter.entryType
          ),
      ),
    );
  };
  const navigateToPage = (nextPage: Page) => {
    if (nextPage === page) return;
    const currentIndex = PUBLIC_PAGES.indexOf(page);
    const nextIndex = PUBLIC_PAGES.indexOf(nextPage);
    setTransitionDirection(
      currentIndex !== -1 && nextIndex !== -1 && nextIndex < currentIndex
        ? "backward"
        : "forward",
    );
    setPage(nextPage);
  };

  const handleWorkspaceTouchStart = (event: TouchEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (
      target.closest("input, textarea, select, button, details, .rounds-scroll")
    )
      return;
    touchStartX.current = event.touches[0]?.clientX ?? null;
    touchStartY.current = event.touches[0]?.clientY ?? null;
  };

  const handleWorkspaceTouchEnd = (event: TouchEvent<HTMLElement>) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const endY = event.changedTouches[0]?.clientY ?? touchStartY.current;
    const deltaX = endX - touchStartX.current;
    const deltaY = endY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(deltaX) < 70 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25)
      return;
    const currentIndex = PUBLIC_PAGES.indexOf(page);
    if (currentIndex === -1) return;
    const nextIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < PUBLIC_PAGES.length)
      navigateToPage(PUBLIC_PAGES[nextIndex]);
  };

  const filteredParticipants = participants.filter((p) =>
    `${p.id} ${p.player1} ${p.player2 ?? ""} ${p.teamName ?? ""} ${p.ageGroup} ${p.gender} ${p.entryType} ${p.status}`
      .toLowerCase()
      .includes(participantQuery.toLowerCase()),
  );
  const checkedIn = participants.filter(
    (p) => p.status === "Checked In",
  ).length;
  const singlesCount = participants.filter(
    (p) => p.entryType === "Singles",
  ).length;
  const doublesCount = participants.filter(
    (p) => p.entryType === "Doubles",
  ).length;

  return (
    <div className="app-shell">
      {showLogin && (
        <div
          className="login-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="staff-login-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowLogin(false);
          }}
        >
          <section className="login-modal">
            <button
              type="button"
              className="login-close"
              onClick={() => setShowLogin(false)}
              aria-label="Close staff login"
            >
              <XCircle />
            </button>
            <div className="login-emblem">
              <img
                src={settings.logoUrl || "/jp-emblem-safe.png"}
                alt="JP Badminton Events"
              />
            </div>
            <span className="login-kicker">AUTHORIZED STAFF ONLY</span>
            <h2 id="staff-login-title">Staff login</h2>
            <p>
              Select your assigned role and enter the credentials provided by
              the tournament manager.
            </p>
            <form onSubmit={handleStaffLogin}>
              <label>
                Role
                <select
                  value={loginRole}
                  onChange={(e) => {
                    setLoginRole(e.target.value as StaffRole);
                    setLoginError("");
                  }}
                >
                  <option>Super Admin</option>
                  <option>Registration Admin</option>
                  <option>Court 1 Umpire</option>
                  <option>Court 2 Umpire</option>
                </select>
              </label>
              <label>
                Username
                <input
                  autoFocus
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  autoComplete="username"
                  placeholder="Enter username"
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter password"
                />
              </label>
              {loginError && <div className="login-error">{loginError}</div>}
              <button type="submit" className="login-submit">
                <Lock size={17} /> Sign in securely
              </button>
            </form>
            <small>Viewer mode remains public and read-only.</small>
          </section>
        </div>
      )}
      {showIntro && (
        <div
          className="brand-intro"
          role="status"
          aria-label="Opening JP Badminton Events"
        >
          <div className="intro-ambient" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="intro-court" aria-hidden="true">
            <span className="court-outline" />
            <span className="court-midline" />
            <span className="court-left-service" />
            <span className="court-right-service" />
          </div>
          <div className="intro-shuttle intro-shuttle-live" aria-hidden="true">
            <span className="shuttle-trail" />
            <img src="/shuttle-live.png" alt="" />
            <span className="shuttle-impact" />
          </div>
          <div className="intro-center">
            <div className="intro-mark">
              <img
                src={settings.logoUrl || "/jp-emblem-safe.png"}
                alt="JP Badminton Events"
              />
            </div>
            <div className="intro-copy">
              <span>JP BADMINTON EVENTS</span>
              <strong>Juniors Championship 2026</strong>
              <small>Bengaluru · August 8–9</small>
            </div>
          </div>
          <div className="intro-categories" aria-hidden="true">
            <span>U11</span>
            <span>U13</span>
            <span>U15</span>
            <span>U17</span>
          </div>
          <div className="intro-progress" aria-hidden="true">
            <i />
          </div>
          <button
            type="button"
            className="intro-skip"
            onClick={() => setShowIntro(false)}
          >
            Skip intro
          </button>
        </div>
      )}
      <header className="topbar">
        <div className="brand">
          <div className="brand-logo">
            <img
              src={settings.logoUrl || "/jp-emblem-safe.png"}
              alt="JP Badminton Events"
            />
          </div>
          <div>
            <p>JP BADMINTON EVENTS</p>
            <h1>{settings.eventName}</h1>
          </div>
        </div>
        <div className="top-actions">
          <div className="compact-live">
            <span className="pulse" />
            LIVE
          </div>
          <div className="compact-clock">
            <Clock3 size={16} />
            <div>
              <strong>{formatTime(now)}</strong>
              <span>Aug 8–9 · Bengaluru</span>
            </div>
          </div>
          <div
            className={`role-indicator ${role === "Viewer" ? "viewer" : "staff"}`}
          >
            <ShieldCheck size={15} /> {role}
          </div>
          {role === "Viewer" ? (
            <button className="login" onClick={() => setShowLogin(true)}>
              <LogIn size={17} /> Staff login
            </button>
          ) : (
            <button className="login logout" onClick={logoutStaff}>
              <LogIn size={17} /> Logout
            </button>
          )}
        </div>
      </header>

      <nav className="nav-tabs simple-menu" aria-label="Tournament sections">
        <div className="public-tabs">
          <button
            className={page === "Live" ? "active" : ""}
            onClick={() => navigateToPage("Live")}
          >
            Live Courts
          </button>
          <button
            className={page === "Upcoming" ? "active" : ""}
            onClick={() => navigateToPage("Upcoming")}
          >
            Upcoming
          </button>
          <button
            className={page === "Schedule" ? "active" : ""}
            onClick={() => navigateToPage("Schedule")}
          >
            Schedule
          </button>
          <button
            className={page === "Brackets" ? "active" : ""}
            onClick={() => navigateToPage("Brackets")}
          >
            League & Brackets
          </button>
          <button
            className={page === "Results" ? "active" : ""}
            onClick={() => navigateToPage("Results")}
          >
            Results
          </button>
          <button
            className={page === "Announcements" ? "active" : ""}
            onClick={() => navigateToPage("Announcements")}
          >
            Announcements
          </button>
        </div>
        {role !== "Viewer" && (
          <details className="staff-menu">
            <summary>Staff Tools</summary>
            <div className="staff-menu-popover">
              <button
                className={page === "Registration" ? "active" : ""}
                onClick={(event) => {
                  navigateToPage("Registration");
                  event.currentTarget
                    .closest("details")
                    ?.removeAttribute("open");
                }}
              >
                Registration
              </button>
              <button
                className={page === "Participants" ? "active" : ""}
                onClick={(event) => {
                  navigateToPage("Participants");
                  event.currentTarget
                    .closest("details")
                    ?.removeAttribute("open");
                }}
              >
                Participants
              </button>
              <button
                className={page === "Audit" ? "active" : ""}
                onClick={(event) => {
                  navigateToPage("Audit");
                  event.currentTarget
                    .closest("details")
                    ?.removeAttribute("open");
                }}
              >
                Audit
              </button>
              <button
                className={page === "Settings" ? "active" : ""}
                onClick={(event) => {
                  navigateToPage("Settings");
                  event.currentTarget
                    .closest("details")
                    ?.removeAttribute("open");
                }}
              >
                Settings
              </button>
            </div>
          </details>
        )}
      </nav>

      <main
        onTouchStart={handleWorkspaceTouchStart}
        onTouchEnd={handleWorkspaceTouchEnd}
      >
        <div key={page} className={`page-transition ${transitionDirection}`}>
          {page === "Live" && (
            <>
              <section className="live-overview clean-live-heading live-hero-banner">
                <div className="live-hero-copy">
                  <span>LIVE NOW</span>
                  <h2>
                    <b>Live</b> court updates
                  </h2>
                  <p>Real-time scores and tournament activity.</p>
                </div>
                <div className="live-shuttle-art" aria-hidden="true">
                  <span className="shuttle-red-glow" />
                  <img src="/shuttle-live.png" alt="" />
                </div>
              </section>

              <section className="live-dashboard-grid">
                <div className="live-main-column">
                  <div className="court-grid court-grid-priority">
                    {courts.map((match) => (
                      <CourtCard
                        key={match.court}
                        match={match}
                        editable={editableCourts.includes(match.court)}
                        onScore={updateScore}
                        onFinish={finishMatch}
                        onWalkover={walkoverMatch}
                        onPause={togglePause}
                      />
                    ))}
                  </div>
                  <div className="live-stats-row">
                    <article>
                      <LayoutDashboard size={22} />
                      <div>
                        <span>Total Courts</span>
                        <strong>{courts.length}</strong>
                        <small>Tournament courts</small>
                      </div>
                    </article>
                    <article>
                      <Activity size={22} />
                      <div>
                        <span>Live Matches</span>
                        <strong>
                          {courts.filter((c) => c.status === "Live").length}
                        </strong>
                        <small>Across all courts</small>
                      </div>
                    </article>
                    <article>
                      <Users size={22} />
                      <div>
                        <span>Participants</span>
                        <strong>{participants.length}</strong>
                        <small>Players and teams</small>
                      </div>
                    </article>
                    <article>
                      <CalendarDays size={22} />
                      <div>
                        <span>Event Days</span>
                        <strong>2</strong>
                        <small>Aug 8–9, 2026</small>
                      </div>
                    </article>
                  </div>
                </div>

                <aside className="announcement-panel">
                  <div className="announcement-panel-head">
                    <div className="announcement-icon">
                      <Bell size={20} />
                    </div>
                    <h3>Announcements</h3>
                    <button onClick={() => navigateToPage("Announcements")}>
                      View all
                    </button>
                  </div>
                  <div className="announcement-panel-list">
                    {announcements.slice(0, 4).map((announcement, index) => (
                      <article key={announcement.id}>
                        <div
                          className={`announcement-dot ${announcement.priority.toLowerCase()}`}
                        />
                        <div>
                          <span>
                            {index === 0 ? "Just now" : announcement.createdAt}
                          </span>
                          <p>{announcement.text}</p>
                        </div>
                      </article>
                    ))}
                    {announcements.length === 0 && (
                      <div className="empty-announcements">
                        No announcements yet.
                      </div>
                    )}
                  </div>
                  <button
                    className="all-announcements"
                    onClick={() => navigateToPage("Announcements")}
                  >
                    All announcements <span>→</span>
                  </button>
                </aside>
              </section>
            </>
          )}

          {page === "Upcoming" && (
            <>
              <section className="page-intro compact-intro">
                <div>
                  <span>NEXT UP</span>
                  <h2>Upcoming matches</h2>
                  <p>
                    Find the next assigned match without leaving the tournament
                    workspace.
                  </p>
                </div>
                <div className="search-box">
                  <Search size={17} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Find player or team"
                  />
                </div>
              </section>
              <section className="schedule-card standalone-schedule">
                <div className="schedule-list">
                  {scheduleItems
                    .filter((item: ScheduleItem) =>
                      `${item.match} ${item.players} ${item.court}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    )
                    .map((item: ScheduleItem) => (
                      <div
                        className="schedule-item"
                        key={`${item.time}-${item.players}`}
                      >
                        <div className="time-box">{item.time}</div>
                        <div>
                          <strong>{item.match}</strong>
                          <span>
                            {item.round} · {item.players}
                          </span>
                        </div>
                        <div className="court-label">{item.court}</div>
                        <div className="status-label">{item.status}</div>
                      </div>
                    ))}
                </div>
                {scheduleItems.length === 0 && (
                  <div className="empty-state">
                    No matches have been assigned yet.
                  </div>
                )}
              </section>
            </>
          )}

          {page === "Registration" && (
            <>
              <section className="page-intro">
                <div>
                  <span>PHASE 2</span>
                  <h2>Registration desk</h2>
                  <p>
                    Create singles or doubles entries and prepare participants
                    for check-in.
                  </p>
                </div>
                <div className="access-badge">
                  <ShieldCheck />{" "}
                  {canManageRegistration
                    ? "Editing enabled"
                    : "Viewer access only"}
                </div>
              </section>
              <section className="stats-grid">
                <div>
                  <UserPlus />
                  <span>Total entries</span>
                  <strong>{participants.length}</strong>
                </div>
                <div>
                  <UserCheck />
                  <span>Checked in</span>
                  <strong>{checkedIn}</strong>
                </div>
                <div>
                  <Users />
                  <span>Singles</span>
                  <strong>{singlesCount}</strong>
                </div>
                <div>
                  <Swords />
                  <span>Doubles</span>
                  <strong>{doublesCount}</strong>
                </div>
              </section>
              <section className="registration-layout">
                <form className="registration-form" onSubmit={addParticipant}>
                  <div className="card-heading">
                    <div>
                      <span>NEW ENTRY</span>
                      <h3>Register participant</h3>
                    </div>
                  </div>
                  {!canManageRegistration && (
                    <div className="permission-warning">
                      Switch role to Registration Admin or Super Admin to add
                      entries.
                    </div>
                  )}
                  <div className="form-grid">
                    <label>
                      Event type
                      <select
                        disabled={!canManageRegistration}
                        value={form.entryType}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            entryType: e.target.value as EntryType,
                          })
                        }
                      >
                        <option>Singles</option>
                        <option>Doubles</option>
                      </select>
                    </label>
                    <label>
                      Age group
                      <select
                        disabled={!canManageRegistration}
                        value={form.ageGroup}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            ageGroup: e.target.value as AgeGroup,
                          })
                        }
                      >
                        <option>U11</option>
                        <option>U13</option>
                        <option>U15</option>
                        <option>U17</option>
                      </select>
                    </label>
                    <label>
                      Gender
                      <select
                        disabled={!canManageRegistration}
                        value={form.gender}
                        onChange={(e) =>
                          setForm({ ...form, gender: e.target.value as Gender })
                        }
                      >
                        <option>Boys</option>
                        <option>Girls</option>
                      </select>
                    </label>
                    <label>
                      Contact number
                      <input
                        disabled={!canManageRegistration}
                        value={form.phone}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            phone: e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 10),
                          })
                        }
                        placeholder="10-digit mobile"
                      />
                    </label>
                    <label className="wide">
                      {form.entryType === "Singles"
                        ? "Player name"
                        : "Player 1"}
                      <input
                        disabled={!canManageRegistration}
                        value={form.player1}
                        onChange={(e) =>
                          setForm({ ...form, player1: e.target.value })
                        }
                        placeholder="Full name"
                      />
                    </label>
                    {form.entryType === "Doubles" && (
                      <>
                        <label className="wide">
                          Player 2
                          <input
                            disabled={!canManageRegistration}
                            value={form.player2}
                            onChange={(e) =>
                              setForm({ ...form, player2: e.target.value })
                            }
                            placeholder="Partner full name"
                          />
                        </label>
                        <label className="wide">
                          Team name <small>(optional)</small>
                          <input
                            disabled={!canManageRegistration}
                            value={form.teamName}
                            onChange={(e) =>
                              setForm({ ...form, teamName: e.target.value })
                            }
                            placeholder="Example: Golden Smashers"
                          />
                        </label>
                      </>
                    )}
                  </div>
                  <button
                    className="submit-entry"
                    disabled={!canManageRegistration}
                  >
                    <UserPlus size={18} /> Add registration
                  </button>
                </form>
                <aside className="checkin-guide">
                  <span>DESK WORKFLOW</span>
                  <h3>Fast, clear check-in</h3>
                  <ol>
                    <li>
                      <b>1</b>
                      <div>
                        <strong>Search the entry</strong>
                        <p>Use player, team or registration ID.</p>
                      </div>
                    </li>
                    <li>
                      <b>2</b>
                      <div>
                        <strong>Verify both players</strong>
                        <p>Doubles entries require both partners.</p>
                      </div>
                    </li>
                    <li>
                      <b>3</b>
                      <div>
                        <strong>Mark checked in</strong>
                        <p>The entry becomes bracket-ready.</p>
                      </div>
                    </li>
                  </ol>
                </aside>
              </section>
            </>
          )}

          {page === "Participants" && (
            <>
              <section className="page-intro">
                <div>
                  <span>CHECK-IN CONTROL</span>
                  <h2>Participants</h2>
                  <p>
                    Search, verify and update arrival status at the registration
                    desk.
                  </p>
                </div>
                <div className="search-box large">
                  <Search size={18} />
                  <input
                    value={participantQuery}
                    onChange={(e) => setParticipantQuery(e.target.value)}
                    placeholder="Search name, team, ID, category..."
                  />
                </div>
              </section>
              <section className="participant-table-card">
                <div className="participant-table-header">
                  <span>ENTRY</span>
                  <span>EVENT</span>
                  <span>CONTACT</span>
                  <span>STATUS</span>
                  <span>ACTIONS</span>
                </div>
                {filteredParticipants.length === 0 ? (
                  <div className="empty-state">
                    No matching participants found.
                  </div>
                ) : (
                  filteredParticipants.map((p) => (
                    <div className="participant-row" key={p.id}>
                      <div className="participant-entry">
                        <strong>
                          {p.entryType === "Doubles" ? p.teamName : p.player1}
                        </strong>
                        <span>
                          {p.entryType === "Doubles"
                            ? `${p.player1} + ${p.player2}`
                            : p.id}
                        </span>
                      </div>
                      <div className="participant-event">
                        <strong>
                          {p.ageGroup} {p.gender}
                        </strong>
                        <span>{p.entryType}</span>
                      </div>
                      <div className="participant-contact">
                        <strong>{p.phone}</strong>
                        <span>{p.id}</span>
                      </div>
                      <div className="participant-status">
                        <span
                          className={`status-chip ${p.status.toLowerCase().replaceAll(" ", "-")}`}
                        >
                          {p.status}
                        </span>
                      </div>
                      <div className="row-actions">
                        <button
                          disabled={!canManageRegistration}
                          onClick={() => setStatus(p.id, "Checked In")}
                          title="Checked in"
                          aria-label={`Mark ${p.player1} checked in`}
                        >
                          <CheckCircle2 />
                        </button>
                        <button
                          disabled={!canManageRegistration}
                          onClick={() => setStatus(p.id, "Not Arrived")}
                          title="Not arrived"
                          aria-label={`Mark ${p.player1} not arrived`}
                        >
                          <Clock3 />
                        </button>
                        <button
                          disabled={!canManageRegistration}
                          onClick={() => setStatus(p.id, "Withdrawn")}
                          title="Withdraw"
                          aria-label={`Withdraw ${p.player1}`}
                        >
                          <XCircle />
                        </button>
                        <button
                          className="delete-participant"
                          disabled={!canManageRegistration}
                          onClick={() => deleteParticipant(p)}
                          title="Delete participant"
                          aria-label={`Delete ${p.player1}`}
                        >
                          <Trash2 />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </section>
            </>
          )}

          {page === "Brackets" && (
            <>
              <section className="page-intro">
                <div>
                  <span>LEAGUE + KNOCKOUT</span>
                  <h2>Tournament format engine</h2>
                  <p>
                    Generate round-robin league groups first, calculate
                    standings automatically, and then move qualifiers into
                    semifinals or finals.
                  </p>
                </div>
                <div className="access-badge">
                  <GitBranch />{" "}
                  {role === "Super Admin"
                    ? "Tournament controls enabled"
                    : "Read-only tournament view"}
                </div>
              </section>
              <section className="bracket-toolbar">
                <div className="bracket-filters">
                  <label>
                    Age group
                    <select
                      value={bracketFilter.ageGroup}
                      onChange={(e) =>
                        setBracketFilter({
                          ...bracketFilter,
                          ageGroup: e.target.value as AgeGroup,
                        })
                      }
                    >
                      <option>U11</option>
                      <option>U13</option>
                      <option>U15</option>
                      <option>U17</option>
                    </select>
                  </label>
                  <label>
                    Gender
                    <select
                      value={bracketFilter.gender}
                      onChange={(e) =>
                        setBracketFilter({
                          ...bracketFilter,
                          gender: e.target.value as Gender,
                        })
                      }
                    >
                      <option>Boys</option>
                      <option>Girls</option>
                    </select>
                  </label>
                  <label>
                    Event
                    <select
                      value={bracketFilter.entryType}
                      onChange={(e) =>
                        setBracketFilter({
                          ...bracketFilter,
                          entryType: e.target.value as EntryType,
                        })
                      }
                    >
                      <option>Singles</option>
                      <option>Doubles</option>
                    </select>
                  </label>
                </div>
                <div className="bracket-actions">
                  <label className="random-toggle">
                    <input
                      type="checkbox"
                      checked={randomizeBracket}
                      onChange={(e) => setRandomizeBracket(e.target.checked)}
                    />
                    <Shuffle size={16} /> Randomize / snake seed
                  </label>
                  <button
                    className="generate-bracket"
                    disabled={role !== "Super Admin" || entryNames.length < 2}
                    onClick={generateTournamentFormat}
                  >
                    {currentLeague
                      ? "Regenerate league"
                      : "Generate league stage"}
                  </button>
                  {(currentLeague || currentBracket) && (
                    <button
                      className="reset-bracket"
                      disabled={role !== "Super Admin"}
                      onClick={resetBracket}
                    >
                      <RotateCcw size={16} /> Reset format
                    </button>
                  )}
                </div>
              </section>
              <section className="eligibility-card">
                <div>
                  <UserCheck />
                  <span>Checked-in eligible entries</span>
                  <strong>{entryNames.length}</strong>
                </div>
                <p>
                  {entryNames.length < 2
                    ? "At least two checked-in entries are required."
                    : entryNames.length <= 5
                      ? `One group of ${entryNames.length}. Everyone plays everyone.`
                      : `Two balanced groups: ${Math.ceil(entryNames.length / 2)} and ${Math.floor(entryNames.length / 2)}. Everyone plays all opponents in their group.`}
                </p>
              </section>

              {!currentLeague ? (
                <section className="empty-bracket">
                  <GitBranch size={44} />
                  <h3>No league stage generated</h3>
                  <p>
                    For five or fewer entries the system creates one group.
                    Above five entries it creates two balanced groups and
                    generates every round-robin fixture.
                  </p>
                </section>
              ) : (
                <>
                  <section className="league-overview">
                    <div>
                      <span>ACTIVE FORMAT</span>
                      <h3>{currentLeague.title}</h3>
                      <p>
                        {currentLeague.groups.length === 1
                          ? "Single league group"
                          : "Two balanced league groups"}{" "}
                        · Top {currentLeague.qualifiersPerGroup} from each group
                        qualify
                      </p>
                    </div>
                    <div className="league-progress">
                      <strong>
                        {currentLeague.groups.reduce(
                          (sum, group) =>
                            sum +
                            group.matches.filter(
                              (match) => match.status === "Completed",
                            ).length,
                          0,
                        )}
                      </strong>
                      <span>
                        of{" "}
                        {currentLeague.groups.reduce(
                          (sum, group) => sum + group.matches.length,
                          0,
                        )}{" "}
                        league matches completed
                      </span>
                    </div>
                  </section>
                  <div className="league-section-title">
                    <div>
                      <span>LEAGUE STAGE</span>
                      <h3>League groups and fixtures</h3>
                    </div>
                    <p>
                      Every entry plays all opponents in its group before the
                      knockout stage begins.
                    </p>
                  </div>
                  <section className="league-groups">
                    {currentLeague.groups.map((group) => {
                      const standings = leagueStandings(group);
                      return (
                        <article className="league-group-card" key={group.id}>
                          <div className="league-group-heading">
                            <div>
                              <span>ROUND ROBIN</span>
                              <h3>{group.name}</h3>
                            </div>
                            <b>{group.players.length} entries</b>
                          </div>
                          <div className="standings-table">
                            <div className="standings-head">
                              <span>#</span>
                              <span>Player / Team</span>
                              <span>P</span>
                              <span>W</span>
                              <span>L</span>
                              <span>Diff</span>
                            </div>
                            {standings.map((row, index) => (
                              <div
                                className={`standings-row ${index < currentLeague.qualifiersPerGroup ? "qualifying" : ""}`}
                                key={row.player}
                              >
                                <span>{index + 1}</span>
                                <strong>{row.player}</strong>
                                <span>{row.played}</span>
                                <span>{row.won}</span>
                                <span>{row.lost}</span>
                                <span>{row.pointsFor - row.pointsAgainst}</span>
                              </div>
                            ))}
                          </div>
                          <div className="league-fixtures">
                            {group.matches.map((match) => (
                              <div
                                className={`league-fixture ${match.status.toLowerCase()}`}
                                key={match.id}
                              >
                                <div>
                                  <small>ROUND {match.round + 1}</small>
                                  <strong>
                                    {match.playerA} <b>VS</b> {match.playerB}
                                  </strong>
                                  {match.status === "Completed" && (
                                    <span>
                                      {match.scoreA}–{match.scoreB} · Winner:{" "}
                                      {match.winner}
                                    </span>
                                  )}
                                </div>
                                {match.status === "Pending" && (
                                  <div className="fixture-actions">
                                    <button
                                      disabled={role !== "Super Admin"}
                                      onClick={() =>
                                        recordLeagueResult(
                                          group.id,
                                          match.id,
                                          match.playerA,
                                        )
                                      }
                                    >
                                      A wins
                                    </button>
                                    <button
                                      disabled={role !== "Super Admin"}
                                      onClick={() =>
                                        recordLeagueResult(
                                          group.id,
                                          match.id,
                                          match.playerB,
                                        )
                                      }
                                    >
                                      B wins
                                    </button>
                                  </div>
                                )}
                                {match.status === "Completed" && (
                                  <CheckCircle2 size={20} />
                                )}
                              </div>
                            ))}
                          </div>
                        </article>
                      );
                    })}
                  </section>
                  <section className="qualification-panel">
                    <div>
                      <Trophy />
                      <div>
                        <span>QUALIFICATION</span>
                        <h3>
                          {leagueComplete
                            ? "League stage complete"
                            : "Complete every league fixture"}
                        </h3>
                        <p>
                          {leagueComplete
                            ? "Standings are final. Generate the knockout bracket using the qualified entries."
                            : "Wins, point difference, then total points scored determine the ranking."}
                        </p>
                      </div>
                    </div>
                    <button
                      disabled={role !== "Super Admin" || !leagueComplete}
                      onClick={generateKnockoutFromLeague}
                    >
                      {currentBracket
                        ? "Regenerate knockout"
                        : "Generate knockout bracket"}
                    </button>
                  </section>
                </>
              )}

              {currentBracket && (
                <section className="bracket-board knockout-board">
                  <div className="bracket-summary">
                    <div>
                      <span>KNOCKOUT STAGE</span>
                      <h3>{currentBracket.title}</h3>
                    </div>
                    <div>
                      <strong>{currentBracket.size}</strong>
                      <span>slots</span>
                    </div>
                    <div>
                      <strong>{currentBracket.rounds.length}</strong>
                      <span>rounds</span>
                    </div>
                    <div>
                      <Lock />
                      <span>League qualifiers seeded</span>
                    </div>
                  </div>
                  <div className="rounds-scroll">
                    {currentBracket.rounds.map((round, roundIndex) => (
                      <div className="bracket-round" key={roundIndex}>
                        <div className="round-title">
                          <span>ROUND {roundIndex + 1}</span>
                          <strong>
                            {roundName(
                              roundIndex,
                              currentBracket.rounds.length,
                            )}
                          </strong>
                        </div>
                        <div className="round-matches">
                          {round.map((match) => (
                            <article
                              className={`bracket-match ${match.status.toLowerCase()}`}
                              key={match.id}
                            >
                              <div className="match-code">
                                MATCH {match.position + 1}{" "}
                                <span>{match.status}</span>
                              </div>
                              {(["A", "B"] as const).map((side) => {
                                const entrant =
                                  side === "A" ? match.sideA : match.sideB;
                                return (
                                  <button
                                    key={side}
                                    disabled={
                                      role !== "Super Admin" ||
                                      match.status !== "Ready" ||
                                      !entrant
                                    }
                                    className={
                                      match.winner === entrant ? "winner" : ""
                                    }
                                    onClick={() =>
                                      entrant && selectWinner(match.id, entrant)
                                    }
                                  >
                                    <span>{entrant || "BYE / TBD"}</span>
                                    {match.winner === entrant && (
                                      <Trophy size={15} />
                                    )}
                                  </button>
                                );
                              })}
                              {match.status === "Bye" && (
                                <small>Automatically advanced</small>
                              )}
                            </article>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {page === "Schedule" && (
            <>
              <section className="page-intro">
                <div>
                  <span>COURT OPERATIONS</span>
                  <h2>Match control</h2>
                  <p>
                    Send any ready bracket match to an available court.
                    Finishing or declaring a walkover clears that court
                    automatically.
                  </p>
                </div>
                <div className="access-badge">
                  <CalendarDays />{" "}
                  {role === "Super Admin"
                    ? "Court assignment enabled"
                    : "Public schedule view"}
                </div>
              </section>
              <section className="court-availability">
                {courts.map((court) => (
                  <article
                    className={
                      court.status === "Empty" ? "available" : "occupied"
                    }
                    key={court.court}
                  >
                    <span>COURT {court.court}</span>
                    <strong>
                      {court.status === "Empty" ? "Available" : court.status}
                    </strong>
                    <p>
                      {court.status === "Empty"
                        ? "Ready for the next match"
                        : `${court.teamA} vs ${court.teamB}`}
                    </p>
                  </article>
                ))}
              </section>
              <section className="ready-match-panel">
                <div className="card-heading">
                  <div>
                    <span>READY FROM BRACKETS</span>
                    <h3>Send participants to court</h3>
                  </div>
                  <b>{readyMatches.length} ready</b>
                </div>
                {readyMatches.length === 0 ? (
                  <div className="empty-state">
                    No unscheduled playable bracket matches are ready yet.
                    Complete earlier rounds or generate a bracket.
                  </div>
                ) : (
                  readyMatches.map(({ bracket, match, roundLabel }) => (
                    <article className="ready-match-row" key={match.id}>
                      <div>
                        <strong>{bracket.title}</strong>
                        <span>
                          {roundLabel} · Match {match.position + 1}
                        </span>
                      </div>
                      <div className="ready-players">
                        {match.sideA}
                        <b>VS</b>
                        {match.sideB}
                      </div>
                      <div className="court-send-actions">
                        <button
                          disabled={
                            role !== "Super Admin" ||
                            courts[0].status !== "Empty"
                          }
                          onClick={() =>
                            sendMatchToCourt(bracket.id, match.id, 1)
                          }
                        >
                          Send to Court 1
                        </button>
                        <button
                          disabled={
                            role !== "Super Admin" ||
                            courts[1].status !== "Empty"
                          }
                          onClick={() =>
                            sendMatchToCourt(bracket.id, match.id, 2)
                          }
                        >
                          Send to Court 2
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </section>
              <section className="schedule-manager">
                <div className="card-heading">
                  <div>
                    <span>MATCH HISTORY</span>
                    <h3>Assigned and completed matches</h3>
                  </div>
                </div>
                {scheduleItems.length === 0 ? (
                  <div className="empty-state">
                    No matches have been assigned to a court yet.
                  </div>
                ) : (
                  scheduleItems.map((item: ScheduleItem) => (
                    <article key={item.id}>
                      <div className="time-box">{item.time}</div>
                      <div>
                        <strong>{item.match}</strong>
                        <span>
                          {item.round} · {item.players}
                        </span>
                      </div>
                      <b>{item.court}</b>
                      <span className="status-label">{item.status}</span>
                    </article>
                  ))
                )}
              </section>
            </>
          )}

          {page === "Results" && (
            <>
              <section className="page-intro results-hero">
                <div>
                  <span>CHAMPIONSHIP HONOURS</span>
                  <h2>The victory podium</h2>
                  <p>
                    Every completed draw earns its place in the JP Badminton
                    Events hall of champions.
                  </p>
                </div>
                <div className="results-hero-mark" aria-hidden="true">
                  <Trophy />
                  <span>2026</span>
                </div>
              </section>
              <section className="podium-results">
                {brackets.length === 0 ? (
                  <div className="empty-state premium-empty">
                    <Trophy size={34} />
                    <strong>The podium is waiting</strong>
                    <span>
                      Generate and complete brackets to publish the first
                      champions.
                    </span>
                  </div>
                ) : (
                  brackets.map((bracket) => {
                    const finalRound =
                      bracket.rounds[bracket.rounds.length - 1] || [];
                    const final = finalRound[0];
                    const semiFinals =
                      bracket.rounds.length > 1
                        ? bracket.rounds[bracket.rounds.length - 2]
                        : [];
                    const champion = final?.winner;
                    const runnerUp =
                      champion && final
                        ? final.sideA === champion
                          ? final.sideB
                          : final.sideA
                        : undefined;
                    const thirdPlace = semiFinals
                      .map((match) =>
                        match.winner
                          ? match.sideA === match.winner
                            ? match.sideB
                            : match.sideA
                          : undefined,
                      )
                      .filter(Boolean) as string[];
                    const completed = bracket.rounds
                      .flat()
                      .filter((match) => match.status === "Completed").length;
                    return (
                      <article
                        className={`podium-card ${champion ? "is-complete" : "is-progress"}`}
                        key={bracket.id}
                      >
                        <div className="podium-card-head">
                          <div>
                            <span>
                              {bracket.ageGroup} · {bracket.gender} ·{" "}
                              {bracket.entryType}
                            </span>
                            <h3>{bracket.title}</h3>
                          </div>
                          <b>
                            {champion
                              ? "Final result"
                              : `${completed} completed`}
                          </b>
                        </div>
                        <div
                          className={`podium-stage ${champion ? "published" : "preview"}`}
                        >
                          {!champion && (
                            <div className="podium-preview-note">
                              <Trophy size={16} />
                              <span>
                                Podium preview — names appear automatically
                                after the final is completed.
                              </span>
                            </div>
                          )}
                          <div className="podium-place second">
                            <div className="medal-orbit">
                              <span>2</span>
                            </div>
                            <strong>{runnerUp || "Runner-up TBA"}</strong>
                            <small>Silver medallist</small>
                            <div className="podium-block">
                              <b>2</b>
                            </div>
                          </div>
                          <div className="podium-place first">
                            <Crown className="champion-crown" />
                            <div className="medal-orbit">
                              <span>1</span>
                            </div>
                            <strong>{champion || "Champion TBA"}</strong>
                            <small>Champion</small>
                            <div className="podium-block">
                              <Trophy />
                              <b>1</b>
                            </div>
                          </div>
                          <div className="podium-place third">
                            <div className="medal-orbit">
                              <span>3</span>
                            </div>
                            <strong>
                              {thirdPlace.length
                                ? thirdPlace.join(" & ")
                                : "Semi-finalists TBA"}
                            </strong>
                            <small>Joint bronze</small>
                            <div className="podium-block">
                              <b>3</b>
                            </div>
                          </div>
                          <div className="podium-sparkles" aria-hidden="true">
                            <i />
                            <i />
                            <i />
                            <i />
                            <i />
                            <i />
                          </div>
                        </div>
                        {!champion && (
                          <div className="podium-progress">
                            <div className="progress-trophy">
                              <Trophy />
                            </div>
                            <div>
                              <strong>Championship in progress</strong>
                              <span>
                                {completed} matches completed · finish the final
                                to publish names
                              </span>
                            </div>
                            <div className="progress-line">
                              <i
                                style={{
                                  width: `${Math.min(100, Math.max(8, (completed / Math.max(1, bracket.rounds.flat().length)) * 100))}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })
                )}
              </section>
            </>
          )}

          {page === "Announcements" && (
            <>
              <section className="page-intro">
                <div>
                  <span>PUBLIC COMMUNICATIONS</span>
                  <h2>Announcements</h2>
                  <p>
                    Publish reporting calls, delays, breaks and urgent venue
                    notices.
                  </p>
                </div>
                <div className="access-badge">
                  <Bell />{" "}
                  {role === "Super Admin"
                    ? "Publishing enabled"
                    : "Read-only notice board"}
                </div>
              </section>
              <section className="announcement-layout">
                <div className="announcement-compose">
                  <h3>Publish announcement</h3>
                  <textarea
                    disabled={role !== "Super Admin"}
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    placeholder="Example: Under-15 Boys Singles participants report to Court 1."
                  />
                  <div>
                    <select
                      disabled={role !== "Super Admin"}
                      value={announcementPriority}
                      onChange={(e) =>
                        setAnnouncementPriority(
                          e.target.value as Announcement["priority"],
                        )
                      }
                    >
                      <option>Normal</option>
                      <option>Important</option>
                      <option>Urgent</option>
                    </select>
                    <button
                      disabled={role !== "Super Admin"}
                      onClick={publishAnnouncement}
                    >
                      Publish notice
                    </button>
                  </div>
                </div>
                <div className="announcement-feed">
                  {announcements.map((item) => (
                    <article
                      className={item.priority.toLowerCase()}
                      key={item.id}
                    >
                      <div className="announcement-meta">
                        <div>
                          <strong>{item.priority}</strong>
                          <span>{item.createdAt}</span>
                        </div>
                        {role === "Super Admin" && (
                          <button
                            className="delete-announcement"
                            type="button"
                            onClick={() => deleteAnnouncement(item)}
                            aria-label="Delete announcement"
                          >
                            <Trash2 size={16} /> Delete
                          </button>
                        )}
                      </div>
                      <p>{item.text}</p>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}

          {page === "Audit" && (
            <>
              <section className="page-intro">
                <div>
                  <span>ACCOUNTABILITY</span>
                  <h2>Audit log</h2>
                  <p>
                    Review score edits, registrations, check-ins and
                    administrative actions.
                  </p>
                </div>
                <div className="access-badge">
                  <ListChecks /> Last 100 actions
                </div>
              </section>
              <section className="audit-list">
                {audit.map((entry) => (
                  <article key={entry.id}>
                    <div>
                      <strong>{entry.action}</strong>
                      <span>{entry.actor}</span>
                    </div>
                    <time>{entry.time}</time>
                  </article>
                ))}
              </section>
            </>
          )}

          {page === "Settings" && (
            <>
              <section className="page-intro">
                <div>
                  <span>TOURNAMENT CONFIGURATION</span>
                  <h2>Settings and branding</h2>
                  <p>
                    Prepare the event identity, venue information and scoring
                    rules.
                  </p>
                </div>
                <div className="access-badge">
                  <ShieldCheck />{" "}
                  {role === "Super Admin"
                    ? "Configuration unlocked"
                    : "Super Admin required"}
                </div>
              </section>
              <section className="settings-card">
                <label>
                  Event name
                  <input
                    disabled={role !== "Super Admin"}
                    value={settings.eventName}
                    onChange={(e) =>
                      setSettings({ ...settings, eventName: e.target.value })
                    }
                  />
                </label>
                <label>
                  Venue
                  <input
                    disabled={role !== "Super Admin"}
                    value={settings.venue}
                    onChange={(e) =>
                      setSettings({ ...settings, venue: e.target.value })
                    }
                  />
                </label>
                <label>
                  Minimum rest period
                  <input
                    type="number"
                    disabled={role !== "Super Admin"}
                    value={settings.restMinutes}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        restMinutes: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Points per game
                  <input
                    type="number"
                    disabled={role !== "Super Admin"}
                    value={settings.scoringCap}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        scoringCap: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="wide">
                  Logo image URL / placeholder
                  <input
                    disabled={role !== "Super Admin"}
                    value={settings.logoUrl}
                    onChange={(e) =>
                      setSettings({ ...settings, logoUrl: e.target.value })
                    }
                    placeholder="Upload integration can be connected later"
                  />
                </label>
                <div className="branding-preview">
                  <div className="brand-logo preview-logo">
                    <img
                      src={settings.logoUrl || "/jp-emblem-safe.png"}
                      alt="Tournament logo"
                    />
                  </div>
                  <div>
                    <span>BRANDING PREVIEW</span>
                    <h3>{settings.eventName}</h3>
                    <p>{settings.venue}</p>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
        <section className="role-strip">
          <div>
            <ShieldCheck />
            <span>Current access</span>
            <strong>{role}</strong>
          </div>
          <p>
            {canManageRegistration
              ? "Registration and check-in controls are enabled."
              : editableCourts.length
                ? `Score controls are enabled for Court ${editableCourts.join(" and Court ")}.`
                : "Viewer mode is read-only."}
          </p>
        </section>
      </main>
      <footer>
        <span>JP Badminton Event · Tournament Control System</span>
        <span>Complete local tournament prototype · Data saved in browser</span>
      </footer>
    </div>
  );
}
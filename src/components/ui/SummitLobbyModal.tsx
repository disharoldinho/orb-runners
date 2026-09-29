import { useState } from 'react';
import {
  ArrowLeft,
  Bot,
  Check,
  Copy,
  Globe,
  KeyRound,
  Lock,
  Mountain,
  PlusCircle,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';

function generateRandomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function SummitLobbyModal() {
  const avatar = useGameStore((s) => s.avatar);
  const updateAvatar = useGameStore((s) => s.updateAvatar);
  const summitLobby = useGameStore((s) => s.summitLobby);
  const summitBestAltitudeM = useGameStore((s) => s.summitBestAltitudeM);
  const launchSummitClimb = useGameStore((s) => s.launchSummitClimb);
  const setScreen = useGameStore((s) => s.setScreen);

  const [activeTab, setActiveTab] = useState<'public' | 'create' | 'join'>(
    summitLobby.mode === 'private' ? (summitLobby.action === 'create' ? 'create' : 'join') : 'public'
  );

  const [climberName, setClimberName] = useState(avatar.name || 'Pip');
  const [createCode, setCreateCode] = useState(() =>
    summitLobby.lobbyCode && summitLobby.lobbyCode !== 'PUBLIC'
      ? summitLobby.lobbyCode
      : generateRandomCode()
  );
  const [createLobbyName, setCreateLobbyName] = useState(
    summitLobby.lobbyName && summitLobby.lobbyName !== 'Global Summit Server'
      ? summitLobby.lobbyName
      : `${avatar.name || 'Pip'}'s Summit Room`
  );
  const [createPassword, setCreatePassword] = useState(summitLobby.password || '');
  const [includeBots, setIncludeBots] = useState(summitLobby.includeBots);

  const [joinCode, setJoinCode] = useState(
    summitLobby.lobbyCode && summitLobby.lobbyCode !== 'PUBLIC' ? summitLobby.lobbyCode : ''
  );
  const [joinPassword, setJoinPassword] = useState(summitLobby.password || '');
  const [localError, setLocalError] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const saveNameIfChanged = () => {
    const trimmed = climberName.trim() || 'Runner';
    if (trimmed !== avatar.name) {
      updateAvatar({ name: trimmed });
    }
  };

  const handleLaunchPublic = () => {
    saveNameIfChanged();
    setLocalError(null);
    launchSummitClimb({
      mode: 'public',
      action: 'public',
      lobbyCode: 'PUBLIC',
      lobbyName: 'Global Summit Server',
      password: '',
      includeBots: true,
    });
  };

  const handleCreatePrivate = () => {
    saveNameIfChanged();
    const cleanCode = createCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (cleanCode.length < 3) {
      setLocalError('Please enter a Lobby Code of at least 3 characters.');
      return;
    }
    setLocalError(null);
    launchSummitClimb({
      mode: 'private',
      action: 'create',
      lobbyCode: cleanCode,
      lobbyName: createLobbyName.trim() || `Room ${cleanCode}`,
      password: createPassword.trim(),
      includeBots,
    });
  };

  const handleJoinPrivate = () => {
    saveNameIfChanged();
    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode) {
      setLocalError('Please enter your friend’s Lobby Code to join!');
      return;
    }
    setLocalError(null);
    launchSummitClimb({
      mode: 'private',
      action: 'join',
      lobbyCode: cleanCode,
      lobbyName: `Private Room ${cleanCode}`,
      password: joinPassword.trim(),
      includeBots: true,
    });
  };

  const handleCopyInvite = () => {
    const inviteText = `Join my Orb Runners "Reach the Summit" Private Lobby!\nURL: ${window.location.origin}\nLobby Code: ${createCode}\nPassword: ${createPassword || '(None)'}`;
    navigator.clipboard?.writeText(inviteText).catch(() => {});
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2200);
  };

  const displayedError = localError || summitLobby.errorMessage;

  return (
    <div className="summit-lobby-screen">
      <div className="summit-lobby-card">
        {/* Top Bar */}
        <div className="summit-lobby-header">
          <button className="btn-secondary" onClick={() => setScreen('menu')}>
            <ArrowLeft size={16} />
            Back to Menu
          </button>

          <div className="summit-lobby-title-group">
            <span className="summit-badge-pill">
              <Mountain size={14} /> 5-PHASE • 25-STAGE MEGA-CLIMB
            </span>
            <h1>REACH THE SUMMIT</h1>
            <p>
              Ascend 25 interconnected stages across 5 themed biomes from{' '}
              <strong>0m Base Camp</strong> to the <strong>250m Celestial Golden Crown</strong> with
              live players!
            </p>
          </div>

          <div className="summit-best-record-box">
            <span>YOUR PEAK ALTITUDE</span>
            <strong>{summitBestAltitudeM}m / 250m</strong>
          </div>
        </div>

        {/* Climber Display Name Bar */}
        <div className="summit-climber-profile-row">
          <div className="summit-profile-input-wrap">
            <label>CLIMBER DISPLAY NAME</label>
            <input
              type="text"
              maxLength={18}
              value={climberName}
              onChange={(e) => setClimberName(e.target.value)}
              placeholder="Enter your climber name..."
            />
          </div>
          <button
            className="btn-secondary"
            onClick={() => {
              saveNameIfChanged();
              setScreen('character-creator');
            }}
          >
            <Sparkles size={16} />
            Customize 3D Orb ({avatar.bodyType})
          </button>
        </div>

        {displayedError && (
          <div className="summit-error-banner">
            <ShieldAlert size={18} />
            <span>{displayedError}</span>
          </div>
        )}

        {/* Mode Tabs */}
        <div className="summit-lobby-tabs">
          <button
            className={`summit-tab-btn ${activeTab === 'public' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('public');
              setLocalError(null);
            }}
          >
            <Globe size={17} />
            Public Server
          </button>
          <button
            className={`summit-tab-btn ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('create');
              setLocalError(null);
            }}
          >
            <PlusCircle size={17} />
            Create Private Lobby
          </button>
          <button
            className={`summit-tab-btn ${activeTab === 'join' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('join');
              setLocalError(null);
            }}
          >
            <KeyRound size={17} />
            Join Private Lobby
          </button>
        </div>

        {/* Tab Body */}
        {activeTab === 'public' && (
          <div className="summit-tab-panel">
            <div className="summit-public-hero">
              <div className="summit-public-info">
                <h3>🌐 Global Public Summit Server</h3>
                <p>
                  Jump straight into the open 25-stage vertical climb alongside everyone on the
                  public server plus 5 animated AI Climber Bots. No password required!
                </p>
                <div className="summit-feature-chips">
                  <span>🏔️ 25 Continuous Stages</span>
                  <span>🏕️ 5 Biome Base Camps</span>
                  <span>💬 Live 3D Emotes (Keys 1-4)</span>
                </div>
              </div>
              <button className="btn-summit-launch" onClick={handleLaunchPublic}>
                <Mountain size={20} />
                JOIN PUBLIC SUMMIT
              </button>
            </div>
          </div>
        )}

        {activeTab === 'create' && (
          <div className="summit-tab-panel">
            <div className="summit-form-grid">
              <div className="summit-field">
                <label>LOBBY CODE (SHARE WITH FRIENDS)</label>
                <div className="summit-code-input-row">
                  <input
                    type="text"
                    maxLength={10}
                    value={createCode}
                    onChange={(e) => setCreateCode(e.target.value.toUpperCase())}
                    className="summit-code-input"
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setCreateCode(generateRandomCode())}
                    title="Generate New Code"
                  >
                    <RefreshCw size={15} />
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleCopyInvite}
                    title="Copy Lobby Code & Password Invite"
                  >
                    {copiedInvite ? <Check size={15} /> : <Copy size={15} />}
                    {copiedInvite ? 'Copied!' : 'Copy Invite'}
                  </button>
                </div>
              </div>

              <div className="summit-field">
                <label>
                  <Lock size={13} /> LOBBY PASSWORD (OPTIONAL)
                </label>
                <input
                  type="text"
                  maxLength={24}
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="Leave blank for open code, or set a secret password..."
                />
              </div>

              <div className="summit-field">
                <label>PRIVATE LOBBY NAME</label>
                <input
                  type="text"
                  maxLength={28}
                  value={createLobbyName}
                  onChange={(e) => setCreateLobbyName(e.target.value)}
                  placeholder="e.g. Friday Night Summit Race"
                />
              </div>

              <div className="summit-field">
                <label>AI CLIMBER BOTS IN LOBBY</label>
                <button
                  type="button"
                  className={`summit-bot-toggle ${includeBots ? 'on' : 'off'}`}
                  onClick={() => setIncludeBots(!includeBots)}
                >
                  <Bot size={16} />
                  {includeBots
                    ? 'AI Climber Bots: ENABLED (Pacesetters on the mountain)'
                    : 'AI Climber Bots: DISABLED (Humans Only)'}
                </button>
              </div>
            </div>

            <div className="summit-panel-actions">
              <button className="btn-summit-launch" onClick={handleCreatePrivate}>
                <Users size={20} />
                CREATE & LAUNCH PRIVATE LOBBY ({createCode})
              </button>
            </div>
          </div>
        )}

        {activeTab === 'join' && (
          <div className="summit-tab-panel">
            <div className="summit-form-grid">
              <div className="summit-field">
                <label>ENTER FRIEND&apos;S LOBBY CODE</label>
                <input
                  type="text"
                  maxLength={10}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ORB777"
                  className="summit-code-input"
                />
              </div>

              <div className="summit-field">
                <label>
                  <Lock size={13} /> ENTER LOBBY PASSWORD (IF PROTECTED)
                </label>
                <input
                  type="password"
                  maxLength={24}
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  placeholder="Enter password if the host set one..."
                />
              </div>
            </div>

            <div className="summit-panel-actions">
              <button className="btn-summit-launch" onClick={handleJoinPrivate}>
                <KeyRound size={20} />
                JOIN PRIVATE LOBBY
              </button>
            </div>
          </div>
        )}

        {/* Quick Online Friend Testing Guide Footer */}
        <div className="summit-online-guide">
          <h4>🌍 How to Test Online with a Friend (Single-Port Tunnel):</h4>
          <ol>
            <li>
              Keep both the game dev server (<code>npm run dev</code>) and multiplayer server (
              <code>npm run server</code>) running.
            </li>
            <li>
              Open a terminal and run{' '}
              <code>npx cloudflared tunnel --url http://localhost:5173</code> (or{' '}
              <code>ngrok http 5173</code>) and send the generated <code>https://...</code> link to
              your friend.
            </li>
            <li>
              Create a Private Lobby above, copy your <strong>Lobby Code &amp; Password</strong>,
              and your friend can join from anywhere in the world!
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

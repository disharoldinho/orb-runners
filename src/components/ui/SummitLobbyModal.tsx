import { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { SummitPoster } from './brand';
import { Icon } from './icons';

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
    summitLobby.mode === 'private'
      ? summitLobby.action === 'create'
        ? 'create'
        : 'join'
      : 'public',
  );

  const [climberName, setClimberName] = useState(avatar.name || 'Pip');
  const [createCode, setCreateCode] = useState(() =>
    summitLobby.lobbyCode && summitLobby.lobbyCode !== 'PUBLIC'
      ? summitLobby.lobbyCode
      : generateRandomCode(),
  );
  const [createLobbyName, setCreateLobbyName] = useState(
    summitLobby.lobbyName && summitLobby.lobbyName !== 'Global Summit Server'
      ? summitLobby.lobbyName
      : `${avatar.name || 'Pip'}'s Summit Room`,
  );
  const [createPassword, setCreatePassword] = useState(summitLobby.password || '');
  const [includeBots, setIncludeBots] = useState(summitLobby.includeBots);

  const [joinCode, setJoinCode] = useState(
    summitLobby.lobbyCode && summitLobby.lobbyCode !== 'PUBLIC' ? summitLobby.lobbyCode : '',
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
    const cleanCode = createCode
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '');
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

  const TABS = [
    { id: 'public' as const, icon: 'globe' as const, label: 'Public' },
    { id: 'create' as const, icon: 'plus' as const, label: 'Create' },
    { id: 'join' as const, icon: 'key' as const, label: 'Join' },
  ];

  return (
    <div className="lobby-screen paper">
      <header className="screen-head">
        <button className="btn btn-paper btn-sm" onClick={() => setScreen('menu')}>
          <Icon name="arrowLeft" size={18} />
          <span>Back</span>
        </button>
        <h1 className="screen-title">Reach the Summit</h1>
        <span className="tag tag-sun" title="Your best altitude">
          <Icon name="crown" size={16} />
          {summitBestAltitudeM} / 250 m
        </span>
      </header>

      <div className="lobby-layout">
        <aside className="card lobby-poster">
          <SummitPoster />
          <div className="lobby-poster-body">
            <p>
              9 themed stages on one spiral road, from the meadow base camp to the golden crown at
              250 m. Pass the 8 camps in order.
            </p>
            <label className="field">
              <span>Climber name</span>
              <input
                type="text"
                maxLength={18}
                value={climberName}
                onChange={(e) => setClimberName(e.target.value)}
                placeholder="Your climber name"
              />
            </label>
            <button
              className="btn btn-paper btn-sm"
              onClick={() => {
                saveNameIfChanged();
                setScreen('character-creator');
              }}
            >
              <Icon name="sparkle" size={16} />
              <span>Customise runner</span>
            </button>
          </div>
        </aside>

        <section className="card lobby-panel">
          <div className="segmented tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={activeTab === t.id}
                className={activeTab === t.id ? 'on' : ''}
                onClick={() => {
                  setActiveTab(t.id);
                  setLocalError(null);
                }}
              >
                <Icon name={t.icon} size={16} />
                {t.label}
              </button>
            ))}
          </div>

          {displayedError && (
            <div className="error-sticker">
              <Icon name="alert" size={18} />
              <span>{displayedError}</span>
            </div>
          )}

          {activeTab === 'public' && (
            <div className="lobby-tab">
              <h3>Global public server</h3>
              <p>Jump straight in with everyone online plus 5 bot climbers. No code needed.</p>
              <ul className="facts">
                <li>
                  <Icon name="mountain" size={16} /> 9 stages
                </li>
                <li>
                  <Icon name="tent" size={16} /> 8 base camps
                </li>
                <li>
                  <Icon name="wave" size={16} /> Live emotes
                </li>
              </ul>
              <button className="btn btn-go btn-lg" onClick={handleLaunchPublic}>
                <Icon name="mountain" size={20} />
                <span>Join public climb</span>
              </button>
            </div>
          )}

          {activeTab === 'create' && (
            <div className="lobby-tab">
              <label className="field">
                <span>Lobby code (share it)</span>
                <div className="field-row">
                  <input
                    type="text"
                    maxLength={10}
                    value={createCode}
                    onChange={(e) => setCreateCode(e.target.value.toUpperCase())}
                    className="code-input"
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setCreateCode(generateRandomCode())}
                    title="Generate new code"
                    aria-label="Generate new code"
                  >
                    <Icon name="refresh" size={18} />
                  </button>
                  <button type="button" className="btn btn-paper btn-sm" onClick={handleCopyInvite}>
                    <Icon name={copiedInvite ? 'check' : 'copy'} size={16} />
                    <span>{copiedInvite ? 'Copied' : 'Invite'}</span>
                  </button>
                </div>
              </label>
              <label className="field">
                <span>
                  <Icon name="lock" size={13} /> Password (optional)
                </span>
                <input
                  type="text"
                  maxLength={24}
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="Leave blank for code-only"
                />
              </label>
              <label className="field">
                <span>Lobby name</span>
                <input
                  type="text"
                  maxLength={28}
                  value={createLobbyName}
                  onChange={(e) => setCreateLobbyName(e.target.value)}
                  placeholder="e.g. Friday night summit race"
                />
              </label>
              <button
                type="button"
                className={`toggle wide ${includeBots ? 'on' : ''}`}
                onClick={() => setIncludeBots(!includeBots)}
                aria-pressed={includeBots}
              >
                <Icon name="bot" size={20} />
                <span>Bot climbers</span>
                <em>{includeBots ? 'On' : 'Humans only'}</em>
              </button>
              <button className="btn btn-go btn-lg" onClick={handleCreatePrivate}>
                <Icon name="users" size={20} />
                <span>Create &amp; launch {createCode}</span>
              </button>
            </div>
          )}

          {activeTab === 'join' && (
            <div className="lobby-tab">
              <label className="field">
                <span>Friend&apos;s lobby code</span>
                <input
                  type="text"
                  maxLength={10}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ORB777"
                  className="code-input"
                />
              </label>
              <label className="field">
                <span>
                  <Icon name="lock" size={13} /> Password (if set)
                </span>
                <input
                  type="password"
                  maxLength={24}
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  placeholder="Only if the host set one"
                />
              </label>
              <button className="btn btn-go btn-lg" onClick={handleJoinPrivate}>
                <Icon name="key" size={20} />
                <span>Join private lobby</span>
              </button>
            </div>
          )}

          <details className="fold fold-flat">
            <summary>
              <Icon name="globe" size={16} />
              <span>Hosting your own server?</span>
              <Icon name="chevronDown" size={16} className="fold-chev" />
            </summary>
            <ol className="fold-body host-steps">
              <li>
                Run the game (<code>npm run dev</code>) and the multiplayer server (
                <code>npm run server</code>).
              </li>
              <li>
                Open a tunnel: <code>npx cloudflared tunnel --url http://localhost:5173</code> (or{' '}
                <code>ngrok http 5173</code>) and share the https link.
              </li>
              <li>Create a private lobby and send your friend the code and password.</li>
            </ol>
          </details>
        </section>
      </div>
    </div>
  );
}

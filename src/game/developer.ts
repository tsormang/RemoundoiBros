const DEVELOPER_MODE_STORAGE_KEY = 'remoundoi-developer-mode';

export function loadDeveloperMode(): boolean {
  try {
    return localStorage.getItem(DEVELOPER_MODE_STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
}

export function saveDeveloperMode(enabled: boolean): void {
  try {
    localStorage.setItem(DEVELOPER_MODE_STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
}

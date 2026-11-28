export async function usernameIdentity(username) {
  if (typeof username !== "string" || !username.trim() || username.length > 80) {
    throw new Error("Name must be 1–80 characters.");
  }
  const bytes = new TextEncoder().encode(username);
  const hex = data => Array.from(data, byte => byte.toString(16).padStart(2, "0")).join("");
  const identity = `wt-${hex(bytes)}@weight-tracker.invalid`;
  if (identity.length <= 254) return identity;
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return `wt-h-${hex(digest)}@weight-tracker.invalid`;
}

export class JournalServer {
  constructor(config, fetcher = (...args) => fetch(...args)) {
    this.url = config.url.replace(/\/$/, "");
    this.apiKey = config.key;
    this.fetcher = fetcher;
    this.session = null;
  }

  async request(path, { method = "GET", body, token, headers = {} } = {}) {
    if (!this.url || !this.apiKey) {
      throw new Error("Weight Tracker server is not configured. See the server setup guide.");
    }
    const response = await this.fetcher(`${this.url}${path}`, {
      method,
      headers: { apikey: this.apiKey, "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    let result;
    try {
      result = text ? JSON.parse(text) : null;
    } catch (error) {
      throw new Error("The server returned an invalid response.", { cause: error });
    }
    if (!response.ok) {
      throw new Error(result?.msg || result?.message || result?.error_description || `Server request failed (${response.status}).`);
    }
    return result;
  }

  setSession(result) {
    if (!result?.access_token || !result.refresh_token || !result.user?.id) {
      throw new Error("The server did not return a valid sign-in session.");
    }
    this.session = { ...result, expiresAt: Date.now() + (result.expires_in || 3600) * 1000 };
  }

  async signIn(username, password) {
    const result = await this.request("/auth/v1/token?grant_type=password", {
      method: "POST", body: { email: await usernameIdentity(username), password },
    });
    this.setSession(result);
  }

  async signUp(username, password) {
    const result = await this.request("/auth/v1/signup", {
      method: "POST", body: {
        email: await usernameIdentity(username),
        password,
        data: { username: `wt-${crypto.randomUUID()}`, name: "Weight Tracker user" },
      },
    });
    if (!result?.access_token) {
      throw new Error("Account was not activated. The server must have email confirmation disabled; contact the administrator.");
    }
    this.setSession(result);
  }

  async token() {
    if (!this.session) throw new Error("Please sign in again.");
    if (Date.now() >= this.session.expiresAt - 60000) {
      const result = await this.request("/auth/v1/token?grant_type=refresh_token", {
        method: "POST", body: { refresh_token: this.session.refresh_token },
      });
      this.setSession(result);
    }
    return this.session.access_token;
  }

  async load() {
    const token = await this.token();
    const rows = await this.request(`/rest/v1/weight_tracker_journals?user_id=eq.${encodeURIComponent(this.session.user.id)}&select=envelope,revision`, { token });
    if (!Array.isArray(rows) || rows.length > 1) throw new Error("The server returned invalid journal data.");
    if (rows.length && (!rows[0].envelope || typeof rows[0].envelope !== "object"
      || !Number.isSafeInteger(rows[0].revision) || rows[0].revision < 1)) {
      throw new Error("The server returned an invalid journal. Contact the administrator before making changes.");
    }
    return rows[0] || null;
  }

  async save(envelope, revision) {
    const token = await this.token();
    const result = await this.request("/rest/v1/rpc/save_weight_tracker_journal", {
      method: "POST", token, body: { journal: envelope, expected_revision: revision },
    });
    if (!Number.isSafeInteger(result) || result < 1) {
      throw new Error("The server did not confirm the journal save. Sign out and sign in to reload it.");
    }
    return result;
  }

  async signOut() {
    try {
      const token = await this.token();
      await this.request("/auth/v1/logout?scope=local", { method: "POST", token });
    } catch (error) {
      throw new Error(`Logged out on this device, but the server session could not be revoked: ${error.message}`, { cause: error });
    } finally {
      this.session = null;
    }
  }
}

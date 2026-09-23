import { Injectable, signal, computed } from '@angular/core';

interface AuthUser {
  id: string;
  phone: string;
  name: string | null;
}

const TOKEN_KEY = 'wa_finance_token';
const USER_KEY = 'wa_finance_user';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private _user = signal<AuthUser | null>(
    JSON.parse(localStorage.getItem(USER_KEY) ?? 'null'),
  );

  readonly token = this._token.asReadonly();
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => !!this._token());

  setAuth(token: string, user: AuthUser) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this._token.set(token);
    this._user.set(user);
  }

  updateUserName(name: string) {
    const current = this._user();
    if (current) {
      const updated = { ...current, name };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      this._user.set(updated);
    }
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._token.set(null);
    this._user.set(null);
  }
}

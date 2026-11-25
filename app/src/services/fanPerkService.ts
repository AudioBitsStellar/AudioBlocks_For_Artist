import type { FanPerk } from '@/types/api';

export interface FanPerkInput {
  title: string;
  description: string;
  minimumTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
}

// #573: still raw `fetch` rather than the shared axios/queryClient hooks (no
// CSRF header, retry or 401 handling) — migrating that is a larger follow-up.
// The `localStorage.getItem('auth_token')`/`REACT_APP_API_URL` bug this issue
// originally reported no longer exists; this already uses the same-origin
// `/api/backend` proxy.
export class FanPerkService {
  private static baseUrl = '/api/backend';

  public static async getPerks(): Promise<FanPerk[]> {
    const res = await fetch(`${this.baseUrl}/artists/me/perks`);
    if (!res.ok) throw new Error('Failed to fetch fan perks');
    return res.json();
  }

  public static async createPerk(input: FanPerkInput): Promise<FanPerk> {
    const res = await fetch(`${this.baseUrl}/artists/me/perks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error('Failed to create fan perk');
    return res.json();
  }

  public static async updatePerk(id: string, input: Partial<FanPerkInput>): Promise<FanPerk> {
    const res = await fetch(`${this.baseUrl}/artists/me/perks/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error('Failed to update fan perk');
    return res.json();
  }

  public static async deletePerk(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/artists/me/perks/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete fan perk');
  }
}
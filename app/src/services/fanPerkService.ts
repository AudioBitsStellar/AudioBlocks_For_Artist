export interface FanPerkInput {
  title: string;
  description: string;
  minimumTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
}

export class FanPerkService {
  private static baseUrl = '/api/backend';

  public static async getPerks(): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/artists/me/perks`);
    if (!res.ok) throw new Error('Failed to fetch fan perks');
    return res.json();
  }

  public static async createPerk(input: FanPerkInput): Promise<any> {
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

  public static async updatePerk(id: string, input: Partial<FanPerkInput>): Promise<any> {
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
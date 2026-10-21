export interface ReleaseInput {
  title: string;
  type: 'SINGLE' | 'EP' | 'ALBUM';
  coverUrl: string;
  releaseDate: string;
  trackIds: string[];
  status?: 'DRAFT' | 'PUBLISHED';
}

export class ReleaseService {
  private static baseUrl = '/api/backend';

  public static async getReleases(): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/releases`);
    if (!res.ok) throw new Error('Failed to fetch releases');
    return res.json();
  }

  public static async createRelease(input: ReleaseInput): Promise<any> {
    const res = await fetch(`${this.baseUrl}/releases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error('Failed to create release');
    return res.json();
  }

  public static async updateRelease(id: string, input: Partial<ReleaseInput>): Promise<any> {
    const res = await fetch(`${this.baseUrl}/releases/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error('Failed to update release');
    return res.json();
  }
}
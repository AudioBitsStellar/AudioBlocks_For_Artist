export interface RoyaltyRecipient {
  address: string;
  role: string;
  percentage: number;
}

export interface RoyaltyTemplateInput {
  name: string;
  recipients: RoyaltyRecipient[];
}

export class RoyaltyTemplateService {
  private static baseUrl = process.env.REACT_APP_API_URL || 'https://api.audiobits.io';

  public static async getTemplates(): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/api/royalty-templates`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
    });
    if (!res.ok) throw new Error('Failed to fetch royalty templates');
    return res.json();
  }

  public static async createTemplate(input: RoyaltyTemplateInput): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/royalty-templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to create royalty template');
    }
    return res.json();
  }

  public static async updateTemplate(id: string, input: RoyaltyTemplateInput): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/royalty-templates/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to update royalty template');
    }
    return res.json();
  }

  public static async deleteTemplate(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/royalty-templates/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
    });
    if (!res.ok) throw new Error('Failed to delete royalty template');
  }

  public static async applyTemplateToTrack(templateId: string, trackId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/royalty-templates/${templateId}/apply/${trackId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to apply royalty template to track');
    }
    return res.json();
  }
}
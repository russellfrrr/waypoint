import * as vscode from 'vscode';

export type AiProvider = 'disabled' | 'openai-compatible';

export type AiSettings = {
  provider: AiProvider;
  model: string;
  baseUrl: string;
  hasApiKey: boolean;
};

const apiKeySecretKey = 'waypoint.ai.apiKey';

export class AiSettingsService {
  public constructor(private readonly secrets: vscode.SecretStorage) {}

  public async getSettings(): Promise<AiSettings> {
    const config = vscode.workspace.getConfiguration('waypoint.ai');
    const provider = config.get<AiProvider>('provider', 'disabled');
    const model = config.get<string>('model', 'gpt-4.1-mini');
    const baseUrl = config.get<string>('baseUrl', 'https://api.openai.com/v1');
    const apiKey = await this.getApiKey();

    return {
      provider,
      model,
      baseUrl,
      hasApiKey: Boolean(apiKey),
    };
  }

  public async getApiKey(): Promise<string | undefined> {
    return this.secrets.get(apiKeySecretKey);
  }

  public async setApiKey(apiKey: string): Promise<void> {
    await this.secrets.store(apiKeySecretKey, apiKey);
  }

  public async clearApiKey(): Promise<void> {
    await this.secrets.delete(apiKeySecretKey);
  }
}

import { AiInsight, FileAnalysisResult } from '../types';
import { AiSettingsService } from './AiSettingsService';

type ChatCompletionResponse = {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
};

export type AiInsightResult = {
  insight?: AiInsight;
  error?: string;
};

export class AiInsightService {
  public constructor(private readonly settingsService: AiSettingsService) {}

  public async generateInsight(result: FileAnalysisResult): Promise<AiInsightResult> {
    const settings = await this.settingsService.getSettings();

    if (settings.provider === 'disabled') {
      return { error: 'AI provider is disabled. Set waypoint.ai.provider first.' };
    }

    const apiKey = await this.settingsService.getApiKey();

    if (!apiKey) {
      return { error: 'No AI API key saved. Run Waypoint: Set AI API Key first.' };
    }

    try {
      const response = await fetch(`${settings.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: settings.model,
          temperature: 0.2,
          messages: [
            {
              role: 'system',
              content: [
                'You explain codebase files using cautious language.',
                'Never present guesses as absolute truth.',
                'Return compact JSON with summary, responsibilities, changeRisk, confidence, and evidence.',
              ].join(' '),
            },
            {
              role: 'user',
              content: JSON.stringify(createInsightContext(result)),
            },
          ],
        }),
      });

      if (!response.ok) {
        return { error: `AI request failed with HTTP ${response.status}.` };
      }

      const data = await response.json() as ChatCompletionResponse;
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        return { error: 'AI provider returned an empty response.' };
      }

      return { insight: parseAiInsight(content) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'AI request failed.' };
    }
  }
}

const createInsightContext = (result: FileAnalysisResult) => {
  const analysis = result.staticAnalysis;

  return {
    fileName: analysis.fileName,
    relativePath: analysis.relativePath,
    languageId: analysis.languageId,
    lineCount: analysis.lineCount,
    purpose: analysis.purpose,
    imports: analysis.imports,
    outgoingDependencies: analysis.outgoingDependencies.map((item) => item.relativePath),
    exports: analysis.exports,
    incomingDependents: analysis.incomingDependents.map((item) => item.relativePath),
    impactLevel: analysis.impactLevel,
  };
};

const parseAiInsight = (content: string): AiInsight => {
  const parsed = JSON.parse(extractJson(content)) as Partial<AiInsight>;

  return {
    summary: normalizeString(parsed.summary, 'No AI summary returned.'),
    responsibilities: normalizeStringArray(parsed.responsibilities),
    changeRisk: normalizeString(parsed.changeRisk, 'No change risk returned.'),
    confidence: normalizeConfidence(parsed.confidence),
    evidence: normalizeStringArray(parsed.evidence),
  };
};

const extractJson = (content: string): string => {
  const firstBrace = content.indexOf('{');
  const lastBrace = content.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error('AI response did not include JSON.');
  }

  return content.slice(firstBrace, lastBrace + 1);
};

const normalizeString = (value: unknown, fallback: string): string => {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
};

const normalizeConfidence = (value: unknown): AiInsight['confidence'] => {
  if (value === 'high' || value === 'medium' || value === 'low') {
    return value;
  }

  return 'low';
};

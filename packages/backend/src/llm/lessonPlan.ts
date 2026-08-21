import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { AnyTranslationLine, GlossaryEntry, LanguageCode } from '@teagent/shared';
import { getTextModel } from './openaiClients.js';
import { buildLessonPlanSystemPrompt, buildLessonPlanUserPrompt } from './prompts/lessonPlan.prompt.js';

export async function generateLessonPlan(params: {
  language: LanguageCode;
  chapterTitle: string;
  translation: AnyTranslationLine[];
  glossary: GlossaryEntry[];
}): Promise<string> {
  const model = await getTextModel();
  const response = await model.invoke([
    new SystemMessage(buildLessonPlanSystemPrompt(params.language, params.chapterTitle)),
    new HumanMessage(buildLessonPlanUserPrompt(params.translation, params.glossary)),
  ]);
  return typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
}

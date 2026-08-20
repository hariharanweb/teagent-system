import { END, START, StateGraph } from '@langchain/langgraph';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { glossarySchema, translationLinesSchema, type AnyTranslationLine } from '@teagent/shared';
import { getTextModel, getVisionModel } from '../llm/openaiClients.js';
import {
  buildExtractionRepairPrompt,
  buildExtractionSystemPrompt,
} from '../llm/prompts/extraction.prompt.js';
import { buildGlossarySystemPrompt, buildGlossaryUserPrompt } from '../llm/prompts/glossary.prompt.js';
import { extractJson } from '../llm/parseJson.js';
import { resolveVisionImageUrl } from '../s3/presign.js';
import { ExtractState, type ExtractStateType } from './state.js';

const MAX_EXTRACTION_ATTEMPTS = 2; // one initial attempt + one self-repair retry

async function fetchImageNode(state: ExtractStateType): Promise<Partial<ExtractStateType>> {
  const imageUrl = await resolveVisionImageUrl(state.imageS3Key);
  return { imageUrl };
}

async function extractionNode(state: ExtractStateType): Promise<Partial<ExtractStateType>> {
  const model = await getVisionModel();
  const attempt = state.extractionAttempts + 1;
  const systemPrompt = buildExtractionSystemPrompt(state.language);

  const messages = [
    new SystemMessage(systemPrompt),
    new HumanMessage({
      content: [{ type: 'image_url', image_url: { url: state.imageUrl } }],
    }),
  ];

  if (state.warnings.length > 0 && attempt > 1) {
    messages.push(new SystemMessage(buildExtractionRepairPrompt(state.warnings.at(-1) ?? '')));
  }

  const response = await model.invoke(messages);
  const rawText = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

  try {
    const parsed = extractJson(rawText);
    const translationLines = translationLinesSchema(state.language).parse(parsed) as AnyTranslationLine[];
    return { translationLines, extractionAttempts: attempt };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      extractionAttempts: attempt,
      warnings: [`extraction attempt ${attempt} failed schema validation: ${message}`],
    };
  }
}

function shouldRetryExtraction(state: ExtractStateType): 'extractionNode' | 'glossaryNode' {
  const succeeded = state.translationLines.length > 0;
  if (succeeded) return 'glossaryNode';
  if (state.extractionAttempts < MAX_EXTRACTION_ATTEMPTS) return 'extractionNode';
  return 'glossaryNode'; // give up after max attempts; warnings[] already records the failure
}

async function glossaryNode(state: ExtractStateType): Promise<Partial<ExtractStateType>> {
  if (state.translationLines.length === 0) {
    return { warnings: ['skipped glossary generation: no translation lines were extracted'] };
  }

  const model = await getTextModel();
  const messages = [
    new SystemMessage(buildGlossarySystemPrompt(state.language)),
    new HumanMessage(buildGlossaryUserPrompt(state.translationLines)),
  ];

  try {
    const response = await model.invoke(messages);
    const rawText = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    const parsed = extractJson(rawText);
    const glossary = glossarySchema.parse(parsed);
    return { glossary };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { warnings: [`glossary generation failed, returning empty glossary: ${message}`] };
  }
}

const graph = new StateGraph(ExtractState)
  .addNode('fetchImageNode', fetchImageNode)
  .addNode('extractionNode', extractionNode)
  .addNode('glossaryNode', glossaryNode)
  .addEdge(START, 'fetchImageNode')
  .addEdge('fetchImageNode', 'extractionNode')
  .addConditionalEdges('extractionNode', shouldRetryExtraction, {
    extractionNode: 'extractionNode',
    glossaryNode: 'glossaryNode',
  })
  .addEdge('glossaryNode', END);

export const extractChapterGraph = graph.compile();

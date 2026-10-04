import { END, START, StateGraph } from '@langchain/langgraph';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { pageTranscriptSchema } from '@teagent/shared';
import { getVisionModel } from '../llm/openaiClients.js';
import {
  buildTranscriptionRepairPrompt,
  buildTranscriptionSystemPrompt,
} from '../llm/prompts/extraction.prompt.js';
import { extractJson } from '../llm/parseJson.js';
import { resolveVisionImageUrl } from '../s3/presign.js';
import { ExtractState, type ExtractStateType } from './state.js';

const MAX_EXTRACTION_ATTEMPTS = 2; // one initial attempt + one self-repair retry

async function fetchImageNode(state: ExtractStateType): Promise<Partial<ExtractStateType>> {
  const imageUrl = await resolveVisionImageUrl(state.imageS3Key);
  return { imageUrl };
}

/** Step 1 of extraction: transcribe the page as printed. Translation happens in translateChapterGraph. */
async function transcribeNode(state: ExtractStateType): Promise<Partial<ExtractStateType>> {
  const model = await getVisionModel();
  const attempt = state.extractionAttempts + 1;

  const messages = [
    new SystemMessage(buildTranscriptionSystemPrompt(state.language)),
    new HumanMessage({
      // 'high' detail keeps small boxed/side-panel text legible; 'auto' downscales and lines get skipped.
      content: [{ type: 'image_url', image_url: { url: state.imageUrl, detail: 'high' } }],
    }),
  ];

  if (state.warnings.length > 0 && attempt > 1) {
    messages.push(new SystemMessage(buildTranscriptionRepairPrompt(state.warnings.at(-1) ?? '')));
  }

  const response = await model.invoke(messages);
  const rawText = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

  try {
    const transcript = pageTranscriptSchema.parse(extractJson(rawText));
    return { transcript, extractionAttempts: attempt };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      extractionAttempts: attempt,
      warnings: [`extraction attempt ${attempt} failed schema validation: ${message}`],
    };
  }
}

function shouldRetryTranscription(state: ExtractStateType): 'transcribeNode' | typeof END {
  if (state.transcript.length > 0) return END;
  return state.extractionAttempts < MAX_EXTRACTION_ATTEMPTS ? 'transcribeNode' : END;
}

const graph = new StateGraph(ExtractState)
  .addNode('fetchImageNode', fetchImageNode)
  .addNode('transcribeNode', transcribeNode)
  .addEdge(START, 'fetchImageNode')
  .addEdge('fetchImageNode', 'transcribeNode')
  .addConditionalEdges('transcribeNode', shouldRetryTranscription, {
    transcribeNode: 'transcribeNode',
    [END]: END,
  });

export const extractChapterGraph = graph.compile();

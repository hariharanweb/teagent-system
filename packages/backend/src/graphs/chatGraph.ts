import { END, START, StateGraph } from '@langchain/langgraph';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { chatScopeSchema } from '@teagent/shared';
import { getTextModel } from '../llm/openaiClients.js';
import {
  buildDevSystemPrompt,
  buildScopeCheckPrompt,
  getDeclineMessage,
} from '../llm/prompts/devChat.prompt.js';
import { extractJson } from '../llm/parseJson.js';
import { ChatState, type ChatStateType } from './state.js';

const scopeDecisionSchema = z.object({ decision: chatScopeSchema });

async function scopeCheckNode(state: ChatStateType): Promise<Partial<ChatStateType>> {
  const model = await getTextModel();
  const response = await model.invoke([
    new SystemMessage(
      'You are a strict message classifier. Respond with ONLY the requested JSON, no other text.',
    ),
    new HumanMessage(buildScopeCheckPrompt(state.chapterTitle, state.userMessage)),
  ]);
  const rawText = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

  try {
    const parsed = extractJson(rawText);
    const { decision } = scopeDecisionSchema.parse(parsed);
    return { scope: decision };
  } catch {
    // Fail closed: if the classifier's output is unparseable, treat as off_topic
    // rather than risk letting an unclassified message through to the answer prompt.
    return { scope: 'off_topic' };
  }
}

function routeByScope(state: ChatStateType): 'answerNode' | 'politeDeclineNode' {
  return state.scope === 'on_topic' ? 'answerNode' : 'politeDeclineNode';
}

async function answerNode(state: ChatStateType): Promise<Partial<ChatStateType>> {
  const model = await getTextModel();
  const historyMessages = state.history.map((m) =>
    m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content),
  );

  const response = await model.invoke([
    new SystemMessage(
      buildDevSystemPrompt(state.language, state.chapterTitle, state.translation, state.glossary),
    ),
    ...historyMessages,
    new HumanMessage(state.userMessage),
  ]);

  const reply = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
  return { reply };
}

function politeDeclineNode(state: ChatStateType): Partial<ChatStateType> {
  const scope = state.scope === 'off_topic' ? 'off_topic' : 'override_attempt';
  return { reply: getDeclineMessage(scope, state.chapterTitle) };
}

const graph = new StateGraph(ChatState)
  .addNode('scopeCheckNode', scopeCheckNode)
  .addNode('answerNode', answerNode)
  .addNode('politeDeclineNode', politeDeclineNode)
  .addEdge(START, 'scopeCheckNode')
  .addConditionalEdges('scopeCheckNode', routeByScope, {
    answerNode: 'answerNode',
    politeDeclineNode: 'politeDeclineNode',
  })
  .addEdge('answerNode', END)
  .addEdge('politeDeclineNode', END);

export const chatGraph = graph.compile();

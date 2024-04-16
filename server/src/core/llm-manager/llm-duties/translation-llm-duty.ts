import {
  type LLMDutyParams,
  type LLMDutyResult,
  LLMDuty
} from '@/core/llm-manager/llm-duty'
import { LogHelper } from '@/helpers/log-helper'
import { LLM_MANAGER } from '@/core'
import { LLMDuties } from '@/core/llm-manager/types'
import { LLM_CONTEXT_SIZE, LLM_THREADS } from '@/core/llm-manager/llm-manager'

interface TranslationLLMDutyParams extends LLMDutyParams {
  data: {
    source?: string | null
    target: string | null
    autoDetectLanguage?: boolean
  }
}

export class TranslationLLMDuty extends LLMDuty {
  protected readonly systemPrompt: LLMDutyParams['systemPrompt'] = null
  protected readonly name = 'Translation LLM Duty'
  protected input: LLMDutyParams['input'] = null
  protected data = {
    source: null,
    target: null,
    autoDetectLanguage: false
  } as TranslationLLMDutyParams['data']

  constructor(params: TranslationLLMDutyParams) {
    super()

    LogHelper.title(this.name)
    LogHelper.success('New instance')

    this.input = params.input
    this.data = params.data

    if (this.data.autoDetectLanguage && !this.data.source) {
      this.systemPrompt = `You are an AI system that can translate a given text to "${this.data.target}" by auto-detecting the source language.`
    } else {
      this.systemPrompt = `You are an AI system that can translate a given text from "${this.data.source}" to "${this.data.target}".`
    }
  }

  public async execute(): Promise<LLMDutyResult | null> {
    LogHelper.title(this.name)
    LogHelper.info('Executing...')

    try {
      const { LlamaCompletion, LlamaJsonSchemaGrammar } = await import(
        'node-llama-cpp'
      )
      const context = await LLM_MANAGER.model.createContext({
        contextSize: LLM_CONTEXT_SIZE,
        threads: LLM_THREADS
      })
      const completion = new LlamaCompletion({
        contextSequence: context.getSequence()
      })
      const grammar = new LlamaJsonSchemaGrammar(LLM_MANAGER.llama, {
        type: 'object',
        properties: {
          translation: {
            type: 'string'
          }
        }
      })
      const prompt = `Text: ${this.input}`
      const rawResult = await completion.generateCompletion(prompt, {
        grammar,
        maxTokens: context.contextSize
      })
      const parsedResult = grammar.parse(rawResult)
      const result = {
        dutyType: LLMDuties.Translation,
        systemPrompt: this.systemPrompt,
        input: prompt,
        output: parsedResult,
        data: this.data
      }

      LogHelper.title(this.name)
      LogHelper.success(`Duty executed: ${JSON.stringify(result)}`)

      return result
    } catch (e) {
      LogHelper.title(this.name)
      LogHelper.error(`Failed to execute: ${e}`)
    }

    return null
  }
}

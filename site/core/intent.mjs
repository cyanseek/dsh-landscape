import { normalizeText } from './capabilities.mjs'

const RULES = [
  ['disable', /\b(?:disable|remove|uninstall|turn off)\b|(?:禁用|停用|卸载|移除)/i],
  ['upgrade', /\b(?:upgrade|update|migrate)\b|(?:升级|更新|迁移)/i],
  ['replace', /\b(?:replace|switch|alternative)\b|(?:替换|换掉|替代)/i],
  ['install', /\b(?:install|add|enable)\b|(?:安装|添加|接入|启用)/i],
  ['build', /\b(?:build|develop|implement|create|write)\b|(?:开发|实现|新建|构建|编写|自己做)/i],
  ['compare', /\b(?:compare|versus|\bvs\b|choose between)\b|(?:比较|对比|哪个好|怎么选)/i],
  ['compose', /\b(?:compose|combine|orchestrate|integrate)\b|(?:组合|编排|集成多个|一起用)/i],
  ['find', /\b(?:find|search|discover|does .+ exist|already (?:have|support))\b|(?:查找|搜索|有没有|是否已有|已经支持)/i],
  ['use', /\b(?:use|adopt|recommend)\b|(?:使用|采用|推荐)/i],
]

export function inferPreflightIntent(query) {
  const source = String(query ?? '').trim()
  const normalized = normalizeText(source)
  for (const [kind, pattern] of RULES) {
    const match = source.match(pattern)
    if (!match) continue
    return {
      kind,
      inferred: true,
      confidence: 'high',
      signals: [String(match[0]).toLowerCase()].filter(Boolean),
    }
  }
  return {
    kind: 'assess',
    inferred: true,
    confidence: normalized ? 'medium' : 'low',
    signals: [],
  }
}

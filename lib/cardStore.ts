import { AsciiParams } from './asciiEngine'

export interface CardData {
  mediaSrc: string
  mediaType: 'video' | 'image'
  params: AsciiParams
  title: string
  desc: string
}

let store: CardData | null = null

export function setCardData(data: CardData) { store = data }
export function getCardData(): CardData | null { return store }

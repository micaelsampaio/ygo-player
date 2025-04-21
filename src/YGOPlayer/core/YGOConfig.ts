import { YGOPropsOptions } from "ygo-core";
import { YGOProps } from "ygo-core";


export interface YGOConfigOptions extends YGOPropsOptions {
  player?: number
  showHand?: boolean
}

export interface YGOConfig extends YGOProps {
  cdnUrl: string
  autoChangePlayer?: boolean
  options: YGOConfigOptions
}

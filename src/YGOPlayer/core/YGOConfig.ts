import { YGOProps } from "ygo-core";

export interface YGOConfig extends YGOProps {
  cdnUrl: string;
  autoChangePlayer?: boolean;
}

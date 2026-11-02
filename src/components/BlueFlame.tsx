/** Синий огонёк — серия дней подряд (в приложении и в виджете). */
import { SvgXml } from "react-native-svg";
import { blueFlameSvg } from "./blueFlameSvg";
export { blueFlameSvg };

export function BlueFlame({ size = 22, lit = true }: { size?: number; lit?: boolean }) {
  return <SvgXml xml={blueFlameSvg(lit)} width={size} height={size} />;
}

/** Простые анимации на встроенном Animated (без дополнительных библиотек). */
import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

/** Появление снизу с затуханием (для карточек меню, списков). */
export function FadeInUp({ delay = 0, children, style }: { delay?: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, delay]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** Лёгкое покачивание вверх-вниз (канчиль «дышит»). */
export function Bob({ children, amount = 4, period = 2400, style }: { children: React.ReactNode; amount?: number; period?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: period / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: period / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [v, period]);
  return <Animated.View style={[style, { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -amount] }) }] }]}>{children}</Animated.View>;
}

/** «Выпрыгивание» при появлении (награды, ответы). */
export function Pop({ children, style, trigger }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; trigger?: unknown }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    v.setValue(0);
    Animated.spring(v, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }).start();
  }, [v, trigger]);
  return <Animated.View style={[style, { opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }]}>{children}</Animated.View>;
}

/** Кнопка, которая чуть сжимается при нажатии. */
export function PressScale({ style, children, ...rest }: PressableProps & { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(1)).current;
  const to = (x: number) => Animated.spring(v, { toValue: x, friction: 6, tension: 220, useNativeDriver: true }).start();
  return (
    <Pressable {...rest} onPressIn={(e) => { to(0.96); rest.onPressIn?.(e); }} onPressOut={(e) => { to(1); rest.onPressOut?.(e); }}>
      <Animated.View style={[style, { transform: [{ scale: v }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

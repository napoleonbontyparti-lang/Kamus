import { ScrollView, StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { KancilSays, Text } from "../../components/ui";
import { useTheme, soft } from "../../lib/theme";

export default function AboutScreen() {
  const t = useTheme();
  const Block = ({ title, children }: { title: string; children: string }) => (
    <View style={[styles.block, { backgroundColor: t.card }, soft(t)]}>
      <Text style={{ color: t.accent, fontWeight: "800", fontSize: 16, marginBottom: 4 }}>{title}</Text>
      <Text style={{ color: t.text, lineHeight: 21 }}>{children}</Text>
    </View>
  );
  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: "О словаре" }} />
      <KancilSays mood="read" size={110} title="Saya Si Kancil!"
        text="KataCil: kata — «слово», cil — от kancil и kecil. Я маленький, но хитрый оленёк из индонезийских сказок: найду любое слово и не дам его забыть." />
      <View style={{ height: 14 }} />
      <Block title="Словарь">Большой индонезийско-русский словарь Р. Н. Коригодского и соавторов. Работает без интернета: около 34 тысяч гнёзд и 55 тысяч словоформ, с номерами страниц печатного издания.</Block>
      <Block title="Поиск">Слово можно вводить в любой форме: приставки di-, me-, ber-, ter-, pe-, per-, ke-…-an и суффиксы -kan, -i, -nya, -lah отрезаются сами. Если ввести корень, под ним появятся все производные. Русское слово ищется по переводам.</Block>
      <Block title="KBBI">Если слова нет в словаре — кнопка внизу результатов поиска или «KBBI» в статье. Нужен интернет.</Block>
      <Block title="Карточки и метки">Закладка в статье создаёт карточку. Копытце отмечает слово: бирюзовое — выучено, янтарное — не выучено. В календаре видно, когда слова добавлены и какие тренировки пройдены; долгое нажатие на день — метки для всех слов дня.</Block>
      <Block title="Ошибки распознавания">Словарь оцифрован со скана, поэтому встречаются опечатки. Карандаш в статье позволяет их исправить — правки сохраняются и переживают обновления.</Block>
      <Block title="Озвучка">Используется индонезийский голос телефона. Если звука нет, установите голос «Bahasa Indonesia» в настройках синтеза речи.</Block>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  block: { borderRadius: 18, padding: 14, marginBottom: 10 },
});

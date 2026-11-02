"""Русско-индонезийский словарь (сканы, OCR tesseract rus+ind) → статьи.
Индонезийский текст — в старой орфографии (до 1972 г.): переводим в современную (EYD),
исходный вариант сохраняем."""
import bisect, difflib, glob, json, re, sys, itertools
from functools import lru_cache
import pymorphy3
MORPH = pymorphy3.MorphAnalyzer()

LABELS = ["м", "ж", "с", "мн", "несов", "сов", "прил", "нареч", "межд", "союз", "предл", "частица", "числ",
          "мест", "безл", "вводн", "сокр", "сравн", "см", "разг", "прич", "дееприч", "собир", "кратк", "неизм",
          "женск", "уст", "спорт", "мат", "мед", "воен", "тех", "юр", "полит", "физ", "хим", "бот", "зоол"]
BODY_LABELS = LABELS + ["перен", "прям", "бран", "высок", "посл", "букв", "ирон", "шутл", "фин", "кул", "разг", "презр",
                        "груб", "поэт", "книжн", "церк", "ист", "мор", "ж.-д", "эк", "лингв", "грам", "муз", "рел"]


def fix_labels(text: str) -> str:
    def rep(m):
        w = m.group(1)
        if w in BODY_LABELS or MORPH.word_is_known(w):
            return m.group(0)
        c = difflib.get_close_matches(w, BODY_LABELS, n=1, cutoff=0.75)
        return (c[0] + ".") if c else m.group(0)
    return re.sub(r"(?<![\w-])([а-яё]{3,7})\.", rep, text)
HOMO = str.maketrans({"C": "с", "c": "с", "0": "о", "O": "о", "o": "о", "6": "в", "B": "в", "8": "в", "M": "м",
                      "m": "м", "H": "н", "e": "е", "E": "е", "p": "р", "P": "р", "a": "а", "A": "а", "x": "х",
                      "y": "у", "K": "к", "k": "к", "T": "т", "n": "п", "u": "и", "r": "г", "3": "з"})
CYR = re.compile(r"[а-яё]", re.I)
LAT = re.compile(r"[a-z]", re.I)
RU_ORDER = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя"


def label_of(tok: str):
    t = tok.translate(HOMO).lower().strip(".,;:")
    if not t or len(t) > 9:
        return None
    if t in LABELS:
        return t
    if len(t) >= 3:
        m = difflib.get_close_matches(t, LABELS, n=1, cutoff=0.75)
        return m[0] if m else None
    return None


def clean_hw(tok: str) -> str:
    t = tok.translate(str.maketrans({"á": "а", "é": "е", "ó": "о", "ý": "у", "ú": "у", "í": "и", "à": "а", "è": "е",
                                     "́": "", "|": "", "]": "", "[": ""}))
    return t.strip(".,;:‘’'\"_ ")


# ударные гласные OCR читает как другие буквы: о́→б, и́→й, е́→ё, а́→ё/А…
SUBS = {"б": "о", "й": "и", "ё": "еа", "А": "а", "Е": "е", "О": "о", "6": "о", "0": "о", "e": "е", "a": "а", "o": "о"}


@lru_cache(maxsize=None)
def fix_ru_word(w: str) -> str:
    low = w
    base = low[:-4] if low.endswith("(ся)") else low
    suf = low[len(base):]
    if len(base) < 3 or MORPH.word_is_known(base.replace("|", "")):
        return w
    plain = base.replace("|", "")
    pos = [i for i, ch in enumerate(plain) if ch in SUBS]
    for k in (1, 2):
        for combo in itertools.combinations(pos, k):
            for repl in itertools.product(*[SUBS[plain[i]] for i in combo]):
                cand = list(plain)
                for i, r in zip(combo, repl):
                    cand[i] = r
                c = "".join(cand)
                if MORPH.word_is_known(c):
                    return c + suf
    return w


def fix_ru_text(text: str) -> str:
    return re.sub(r"[А-Яа-яЁё][А-Яа-яЁёA-Za-z0-9|]*[а-яё]", lambda m: fix_ru_word(m.group(0)) if CYR.search(m.group(0)) and not re.search(r"[A-Za-z]{2}", m.group(0)) else m.group(0), text)


def norm_ru(s: str) -> str:
    s = s.lower().replace("ё", "е").replace("(ся)", "").replace("(сь)", "")
    return re.sub(r"[^а-я\- ]", "", s).strip()


TO_LAT = str.maketrans({"а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x", "к": "k", "м": "m",
                        "т": "t", "г": "r", "п": "n", "и": "u", "в": "b", "ь": "b", "А": "A", "Е": "E", "О": "O",
                        "Р": "P", "С": "C", "К": "K", "М": "M", "Т": "T", "Н": "H", "В": "B", "Х": "X"})


def fix_mixed(text: str) -> str:
    """Индонезийские слова, частично распознанные кириллицей: persaudaгаап → persaudaraan."""
    def rep(m):
        w = m.group(0)
        lat = len(LAT.findall(w)); cyr = len(CYR.findall(w))
        if lat and cyr and lat >= cyr:
            return w.translate(TO_LAT)
        return w
    return re.sub(r"[A-Za-zА-Яа-яЁё]+", rep, text)


def modern(text: str) -> str:
    """Старая индонезийская орфография → современная (только в латинских словах)."""
    def conv(m):
        w = m.group(0)
        if not LAT.search(w) or CYR.search(w):
            return w
        w = w.replace("dj", "\x01").replace("Dj", "\x02").replace("DJ", "\x02")
        w = w.replace("tj", "c").replace("Tj", "C").replace("TJ", "C")
        w = w.replace("j", "y").replace("J", "Y")
        w = w.replace("\x01", "j").replace("\x02", "J")
        w = w.replace("ch", "kh").replace("Ch", "Kh")
        w = w.replace("oe", "u").replace("Oe", "U")
        return w
    return re.sub(r"[A-Za-z\-]+", conv, text)


def column_lines(path: str):
    lines = [l.rstrip() for l in open(path, encoding="utf-8").read().split("\n")]
    out = []
    for i, l in enumerate(lines):
        s = l.strip().strip("|").strip()
        if not s:
            out.append("")
            continue
        if i < 3 and (re.fullmatch(r"[—\-–\s\d]+", s) or re.fullmatch(r"[А-ЯЁA-Z]{2,4}\s*[—\-–]?", s)):
            continue  # колонтитул «АВИ —», «— 40 —»
        out.append(s)
    return out


def main(src_dir, out_path):
    files = sorted(glob.glob(f"{src_dir}/*.txt"))
    pages = sorted({int(f.split("/")[-1][:3]) for f in files})
    stream = []
    for p in pages:
        if p < 8:  # предисловие, сокращения, алфавит
            continue
        for c in range(4):
            f = f"{src_dir}/{p:03d}_{c}.txt"
            try:
                stream += [(p, l) for l in column_lines(f)]
            except FileNotFoundError:
                pass

    # кандидаты в начала статей
    cand = []
    for i, (p, l) in enumerate(stream):
        if not l:
            continue
        toks = l.split()
        if len(toks) < 2:
            continue
        hw = clean_hw(toks[0])
        if not hw or not CYR.search(hw) or not hw[0].islower() or LAT.search(hw):
            continue
        # заглавное слово может быть из двух токенов: «высказать(ся)», «бра́т|ец»
        lab = label_of(toks[1]) or (len(toks) > 2 and label_of(toks[2]) and (hw := hw + " " + clean_hw(toks[1])) and label_of(toks[2]))
        if lab:
            cand.append((i, hw, lab))

    # алфавитный порядок: наибольшая неубывающая подпоследовательность ключей
    def key(hw):
        n = norm_ru(hw).replace("-", "").replace(" ", "")
        return tuple(RU_ORDER.find(ch) for ch in n[:3])
    keys = [key(h) for _, h, _ in cand]
    tails, tails_i, parent = [], [], [-1] * len(cand)
    for j, k in enumerate(keys):
        pos = bisect.bisect_right(tails, k)
        if pos == len(tails):
            tails.append(k); tails_i.append(j)
        else:
            tails[pos] = k; tails_i[pos] = j
        parent[j] = tails_i[pos - 1] if pos > 0 else -1
    keep = set()
    j = tails_i[-1] if tails_i else -1
    while j >= 0:
        keep.add(j); j = parent[j]
    starts = [cand[j] for j in sorted(keep)]
    print("кандидатов", len(cand), "статей", len(starts))

    entries = []
    for n, (i, hw, lab) in enumerate(starts):
        end = starts[n + 1][0] if n + 1 < len(starts) else len(stream)
        page = stream[i][0]
        body_lines = [l for _, l in stream[i:end] if l]
        text = " ".join(body_lines)
        text = re.sub(r"(\w)- (\w)", r"\1\2", text)  # переносы
        text = re.sub(r"\s+", " ", text).strip()
        # убрать само заглавное слово из начала
        first = text.split(" ", 1)
        body = first[1] if len(first) > 1 else ""
        if " " in hw:
            body = body.split(" ", 1)[1] if " " in body else body
        body = re.sub(r"<[>»]?|◊|◊|<\s*>", "◊", body)
        body = re.sub(r"(?<=\s)(№\S*|[^\w\s(\[«\-—~◊]{1,3}|[A-ZА-ЯЁ])(?=\s|$)", "", body)  # мусор с полей
        body = re.sub(r"\s+", " ", body).strip()
        hw = " ".join(fix_ru_word(x) for x in hw.split())
        body = fix_mixed(body)
        body = re.sub(r"([a-z])- ([a-z])", r"\1\2", body)
        body = fix_labels(fix_ru_text(body))
        # первая помета статьи уже распознана — ставим её правильно
        parts = body.split(" ", 1)
        if parts and label_of(parts[0]) == lab:
            body = lab + "." + (" " + parts[1] if len(parts) > 1 else "")
        for bad, good in (("разе.", "разг."), ("pase.", "разг."), ("лесов.", "несов."), ("перен,", "перен.")):
            body = body.replace(" " + bad, " " + good)
        entries.append({"hw": hw, "gram": lab, "page": page, "old": body, "body": modern(body)})
    json.dump(entries, open(out_path, "w", encoding="utf-8"), ensure_ascii=False)
    print("готово:", len(entries))


if __name__ == "__main__":
    main(*sys.argv[1:3])

"""Разбор OCR-текста словаря Коригодского в структурированные статьи.

Вход: build/lines.json (из lines.py). Выход: build/entries.json
Статья: {"hw": корень, "hom": номер омонима|None, "page": стр,
         "senses": [{"w": форма, "d": толкование}, ...]}  (senses[0] — сам корень)
"""
import json, re, sys, statistics, unicodedata

FIRST_PAGE, LAST_PAGE = 12, 1037

LAT = "abcdefghijklmnopqrstuvwxyz"
# Кириллические буквы, которые ABBYY спутал с латинскими
HOMO = str.maketrans({
    "а": "a", "в": "b", "Ь": "b", "е": "e", "ё": "e", "к": "k", "м": "m", "о": "o",
    "р": "p", "с": "c", "у": "y", "х": "x", "г": "r", "п": "n", "и": "u", "ј": "j",
    "А": "A", "В": "B", "Е": "E", "К": "K", "М": "M", "Н": "H", "О": "O", "Р": "P",
    "С": "C", "Т": "T", "Х": "X", "У": "Y", "І": "I", "і": "i", "ѕ": "s", "Ѕ": "S",
})
CYR = re.compile(r"[а-яё]", re.I)
LATR = re.compile(r"[a-z]", re.I)


def fix_indo(tok: str) -> str:
    """Слово, которое заведомо индонезийское: переводим кириллические двойники в латиницу."""
    t = tok.translate(HOMO)
    t = t.replace("0", "o") if re.search(r"[a-z]0|0[a-z]", t) else t
    t = re.sub(r"(?<=[a-z])I|I(?=[a-z]*[a-z]I)|(?<=[a-z])1(?=[a-z])", "l", t)  # pukuI -> pukul
    return t


def fix_mixed(text: str) -> str:
    """В толковании: смешанные токены (латиница+кириллица) — индонезийские."""
    def rep(m):
        w = m.group(0)
        if CYR.search(w) and LATR.search(w):
            # больше латиницы — значит индонезийское слово
            lat = len(LATR.findall(w)); cyr = len(CYR.findall(w))
            if lat >= cyr or all(ch.translate(HOMO) != ch or not CYR.match(ch) for ch in w):
                return fix_indo(w)
        return w
    return re.sub(r"[\wёЁ]+", rep, text)


TILDE = re.compile(r"(?<![\wа-яё])(?:оо|со|сю|°°|о о|oo|ос|ио|с/э|<~|<->|—'|-\^)(?![\wа-яё])", re.I)
DIAMOND = re.compile(r"(?<![\wа-яё])(?:Q|П|□|О|Г\]|\[\]|\\2|0)(?=\s)")


def clean_def(text: str) -> str:
    text = text.replace("­", "")
    text = TILDE.sub("~", text)
    text = DIAMOND.sub("◊", text)
    text = text.replace("•", "◊")
    text = re.sub(r"\s*\|\s*\|\s*|\s*\|\|\s*|\s(?:1\||j\||!\||\|\[|\]\||I\||l\|)(?=\s)", " ‖ ", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = fix_mixed(text)
    # латинские слова с «I» вместо «l» внутри: memukuIkan -> memukulkan
    text = re.sub(r"\b[a-z]+I[A-Za-z]*\b", lambda m: re.sub(r"(?<=[a-z])I", "l", m.group(0)), text)
    return text


HW_RE = re.compile(
    r"^(?P<hw>[\w'’\-\.\[\]~/]+(?:\s[A-Z][\w\-\.]*)*?)"   # корень (+ имена собств.)
    r"(?:\s*\((?P<hom>[0-9lIi]{1,2})\))?"
    r"(?P<colon>:)?\s*(?P<rest>.*)$")


def parse_hw_line(text):
    first = text.split(" ", 1)[0]
    m = HW_RE.match(fix_indo(first) + text[len(first):])
    hw, hom, colon, rest = m.group("hw"), m.group("hom"), m.group("colon"), m.group("rest")
    if hom:
        hom = int(hom.replace("l", "1").replace("I", "1").replace("i", "1"))
    return hw, hom, bool(colon), rest


def core_variants(root: str):
    r = root.lower().split()[0].strip("-[]~")
    v = {r}
    if len(r) > 3:
        v.add(r[1:])          # meN-/peN- съедают p, t, k, s
    return {x for x in v if len(x) >= 2}


PREF = re.compile(r"^(?:(?:me|pe)(?:ng|ny|n|m)?e?|ber|be|bel|ter|te|per|pel|di|ke|se|ku|kau|ketidak|tidak|memper|diper|mem|pem)*$")
NASAL_END = re.compile(r"(?:m|n|ng|ny)$")


def _derived_from(seg, root):
    """seg = приставки + корень (+ суффиксы)? Проверяем, что перед корнем стоят именно приставки."""
    r = root.lower().split()[0].strip("-[]~")
    if len(r) < 2:
        return False
    i = seg.find(r)
    if i >= 0 and PREF.match(seg[:i]):
        return True
    if len(r) > 3:  # назализация: memukul ← pukul
        i = seg.find(r[1:])
        if i > 0 and PREF.match(seg[:i]) and NASAL_END.search(seg[:i]):
            return True
    return False


def looks_derivative(line_text, root, prev_text):
    if prev_text.endswith("\u00ad") or prev_text.endswith("-"):
        return False
    tok = fix_indo(line_text.split(" ", 1)[0]).strip(",;:")
    bare = re.sub(r"[\[\]\(\)~\.…]", "", tok).lower()
    if not bare or CYR.search(bare) or not re.fullmatch(r"[a-z'\-]+", bare):
        return False
    r = root.lower().split()[0].strip("-[]~")
    if bare == r:
        return False  # корень не бывает собственным производным
    segs = [x for x in bare.split("-") if x]
    return any(_derived_from(x, root) for x in segs)


def classify_column(lines):
    """Отметить строки, начинающиеся у левого края колонки (заглавные слова).
    Учитываем перекос скана: подгоняем линию края x = a + b*y."""
    xs = [l[2] for l in lines]
    base = min(xs)
    low = [(l[3], l[2]) for l in lines if l[2] < base + 6]
    if len(low) >= 3:
        ys_, xs_ = zip(*low)
        my, mx = statistics.mean(ys_), statistics.mean(xs_)
        var = sum((y - my) ** 2 for y in ys_)
        b = sum((y - my) * (x - mx) for y, x in low) / var if var else 0
        b = max(-0.02, min(0.02, b))
        a = mx - b * my
        edge = lambda y: min(x - b * yy for yy, x in low) + b * y
    else:
        edge = lambda y: base
    # если в колонке нет двух уровней отступа — вся колонка продолжение статьи
    spread = max(xs) - base if xs else 0
    out = []
    for l in lines:
        is_hw = (l[2] - edge(l[3])) < 4.5
        out.append(is_hw)
    levels = sorted(set(round(x) for x in xs))
    if spread < 5 and len(lines) > 5:
        # одна колонка без уровней — не знаем; считаем всё продолжением, кроме явных
        out = [False] * len(lines)
    return out


def main(lines_path, out_path):
    L = json.load(open(lines_path, encoding="utf-8"))
    cols = {}
    for pg, col, x, y, t in L:
        if not (FIRST_PAGE <= pg <= LAST_PAGE):
            continue
        if y < 32 or y > 760:          # колонтитулы и номера страниц
            continue
        if re.fullmatch(r"[\d\*\s]+", t):
            continue
        cols.setdefault((pg, col), []).append([pg, col, x, y, t])

    stream = []   # (page, is_hw, text)
    for key in sorted(cols):
        ls = sorted(cols[key], key=lambda l: l[3])
        # склеиваем строки одной высоты (разрыв внутри строки)
        merged = []
        for l in ls:
            if merged and abs(merged[-1][3] - l[3]) < 3:
                merged[-1][4] += " " + l[4]
            else:
                merged.append(list(l))
        flags = classify_column(merged)
        for l, f in zip(merged, flags):
            stream.append((l[0], f, l[4]))

    # 1) кандидаты в заглавные слова
    cand = []
    prev = ""
    for i, (pg, is_hw, text) in enumerate(stream):
        t = text.strip()
        first = t.split(" ", 1)[0] if t else ""
        fixed = fix_indo(first)
        ok = (is_hw and t and not prev.endswith("\u00ad") and not prev.endswith("-")
              and not CYR.search(fixed) and re.match(r"^[A-Za-z0-9\[]", fixed) is not None
              and not re.fullmatch(r"[A-ZА-Я]", t))
        cand.append(ok)
        prev = t
    # 2) алфавитный фильтр: наибольшая неубывающая подпоследовательность ключей
    import bisect
    idx = [i for i, c in enumerate(cand) if c]
    def key(i):
        w = re.sub(r"[^a-z]", "", fix_indo(stream[i][2].split(" ", 1)[0]).lower())
        return w[:3]
    keys = [key(i) for i in idx]
    tails, tails_i, parent = [], [], [-1] * len(idx)
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
        keep.add(idx[j]); j = parent[j]
    print("headword candidates:", len(idx), "kept:", len(keep))

    entries = []
    cur = None
    prev_text = ""
    for i, (pg, is_hw, text) in enumerate(stream):
        t = text.strip()
        if not t:
            continue
        if re.fullmatch(r"[A-ZА-Я]", t):
            prev_text = ""
            continue
        if i in keep:
            hw, hom, colon, rest = parse_hw_line(t)
            cur = {"hw": hw, "hom": hom, "page": pg - 1,  # печатный номер = индекс PDF - 1
                   "senses": [{"w": hw, "d": ""}], "_cores": hw}
            entries.append(cur)
            if colon and rest:
                # «adu (2): beradu высок. ...» — у корня нет своего значения
                tok = rest.split(" ", 1)
                w = fix_indo(tok[0])
                if w.lstrip("—~") and (looks_derivative(w, cur["_cores"], "") or w.startswith("~") or w.startswith("—")):
                    cur["senses"].append({"w": w.lstrip("—~"), "d": tok[1] if len(tok) > 1 else ""})
                else:
                    cur["senses"][0]["d"] = rest
            else:
                cur["senses"][0]["d"] = rest
        elif cur is not None and looks_derivative(t, cur["_cores"], prev_text):
            tok = t.split(" ", 1)
            cur["senses"].append({"w": fix_indo(tok[0]), "d": tok[1] if len(tok) > 1 else ""})
        elif cur is not None:
            s_ = cur["senses"][-1]
            if s_["d"].endswith("\u00ad"):
                s_["d"] = s_["d"][:-1] + t
            elif s_["d"].endswith("-") and t.startswith("-"):
                s_["d"] = s_["d"] + t[1:]
            elif re.search(r"[a-z]-$", s_["d"]) and re.match(r"[a-z]", t):
                # перенос внутри индонезийского слова: «tan-» + «gan» (настоящий дефис повторяется в начале строки)
                s_["d"] = s_["d"][:-1] + t
            else:
                s_["d"] = (s_["d"] + " " + t).strip()
        prev_text = t

    GLUED = re.compile(r"^(?:~\s?|[oоcс][oоcс]|°°)\s?([a-z][a-z\-]*)\s*(.*)$")
    for e in entries:
        e.pop("_cores", None)
        for s in e["senses"]:
            s["w"] = s["w"].replace("­", "").strip(",;:")
            s["d"] = clean_def(s["d"])
            # «menanda...: ~tangani подписывать» → menandatangani
            if s["w"].endswith(("...", "\u2026")):
                m = GLUED.match(s["d"])
                if m:
                    s["w"] = s["w"].rstrip(".\u2026") + m.group(1)
                    s["d"] = m.group(2)
    json.dump(entries, open(out_path, "w", encoding="utf-8"), ensure_ascii=False)
    print("entries:", len(entries), "senses:", sum(len(e["senses"]) for e in entries))


if __name__ == "__main__":
    main(*sys.argv[1:3])

"""entries.json -> dictionary.db (SQLite) для приложения."""
import json, re, sqlite3, sys, os


def expand(form: str):
    """mengaduk[-aduk] -> mengaduk, mengaduk-aduk; meracun(i) -> meracun, meracuni."""
    f = form.strip().strip(",;:.")
    out = set()
    m = re.search(r"[\[\(]([^\]\)]*)[\]\)]", f)
    if m:
        a = f[:m.start()] + f[m.end():]
        b = f[:m.start()] + m.group(1) + f[m.end():]
        for x in (a, b):
            out |= expand(x)
        return out
    f = f.replace("…", "").replace("...", "").strip("-~ ")
    if f:
        out.add(f)
    return out


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9\- ']", "", s.lower()).strip()


def add_extra(db, proverbs_path, ru_id_path):
    """Пословицы о животных и русско-индонезийский словарь."""
    db.executescript("""
    CREATE TABLE ru_entries(id INTEGER PRIMARY KEY, hw TEXT NOT NULL, norm TEXT NOT NULL, page INTEGER,
                            body TEXT NOT NULL, old TEXT NOT NULL);
    CREATE TABLE prov_chapters(id INTEGER PRIMARY KEY, title_id TEXT, title_ru TEXT, lang TEXT, section TEXT,
                               page INTEGER, text TEXT NOT NULL);
    CREATE TABLE proverbs(id INTEGER PRIMARY KEY, chapter INTEGER NOT NULL, lang TEXT NOT NULL, text TEXT NOT NULL,
                          meaning_id TEXT, meaning_ru TEXT, grp TEXT, search TEXT NOT NULL);
    """)
    n_ru = n_pr = 0
    if ru_id_path and os.path.exists(ru_id_path):
        for e in json.load(open(ru_id_path, encoding="utf-8")):
            nrm = re.sub(r"[^а-я\- ]", "", e["hw"].lower().replace("ё", "е").replace("(ся)", "").replace("|", "")).strip()
            db.execute("INSERT INTO ru_entries(hw, norm, page, body, old) VALUES(?,?,?,?,?)",
                       (e["hw"].replace("|", ""), nrm, e["page"], e["body"], e["old"]))
            n_ru += 1
        db.execute("CREATE INDEX ru_norm ON ru_entries(norm)")
    if proverbs_path and os.path.exists(proverbs_path):
        d = json.load(open(proverbs_path, encoding="utf-8"))
        for c in d["chapters"]:
            db.execute("INSERT INTO prov_chapters VALUES(?,?,?,?,?,?,?)",
                       (c["id"], c["title_id"], c["title_ru"], c["lang"], c["section"], c["page"],
                        json.dumps(c["text"], ensure_ascii=False)))
        for p in d["proverbs"]:
            search = " ".join([p["text"], p.get("meaning_id", ""), p.get("meaning_ru", "")]).lower().replace("ё", "е")
            db.execute("INSERT INTO proverbs(chapter, lang, text, meaning_id, meaning_ru, grp, search) VALUES(?,?,?,?,?,?,?)",
                       (p["chapter"], p["lang"], p["text"], p.get("meaning_id", ""), p.get("meaning_ru", ""), p.get("group", ""), search))
            n_pr += 1
    db.executemany("INSERT OR REPLACE INTO meta VALUES(?,?)", [("ru_entries", str(n_ru)), ("proverbs", str(n_pr))])
    print("ru_entries", n_ru, "proverbs", n_pr)


def main(src, dst, proverbs_path=None, ru_id_path=None):
    E = json.load(open(src, encoding="utf-8"))
    if os.path.exists(dst):
        os.remove(dst)
    db = sqlite3.connect(dst)
    db.executescript("""
    PRAGMA page_size=4096;
    CREATE TABLE entries(id INTEGER PRIMARY KEY, hw TEXT NOT NULL, hom INTEGER, page INTEGER,
                         data TEXT NOT NULL, ru TEXT NOT NULL);
    CREATE TABLE forms(norm TEXT NOT NULL, flat TEXT NOT NULL, form TEXT NOT NULL, entry_id INTEGER NOT NULL,
                       sense INTEGER NOT NULL, gloss TEXT);
    CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT);
    """)
    nforms = 0
    for i, e in enumerate(E, 1):
        senses = [{"w": s["w"], "d": s["d"]} for s in e["senses"]]
        ru = " | ".join(s["d"] for s in senses).lower()
        db.execute("INSERT INTO entries VALUES(?,?,?,?,?,?)",
                   (i, e["hw"], e["hom"], e["page"], json.dumps(senses, ensure_ascii=False), ru))
        seen = set()
        for si, s in enumerate(senses):
            gloss = s["d"]
            if si == 0 and not gloss and len(senses) > 1:
                gloss = "→ " + ", ".join(x["w"] for x in senses[1:4])
            gloss = re.split(r"\s◊\s", gloss)[0][:120]
            for f in expand(s["w"]):
                n = norm(f)
                if not n or (n, si) in seen:
                    continue
                seen.add((n, si))
                db.execute("INSERT INTO forms VALUES(?,?,?,?,?,?)", (n, re.sub(r"[ \-']", "", n), f, i, si, gloss))
                nforms += 1
    db.execute("CREATE INDEX forms_norm ON forms(norm)")
    db.execute("CREATE INDEX forms_flat ON forms(flat)")
    db.execute("CREATE INDEX entries_hw ON entries(hw COLLATE NOCASE)")
    db.executemany("INSERT INTO meta VALUES(?,?)", [
        ("title", "Большой индонезийско-русский словарь (Р. Н. Коригодский и др.)"),
        ("version", "1"), ("entries", str(len(E))), ("forms", str(nforms))])
    add_extra(db, proverbs_path, ru_id_path)
    db.commit()
    db.execute("VACUUM")
    db.close()
    print("entries", len(E), "forms", nforms, "size MB", round(os.path.getsize(dst) / 1e6, 1))


if __name__ == "__main__":
    main(*sys.argv[1:5])

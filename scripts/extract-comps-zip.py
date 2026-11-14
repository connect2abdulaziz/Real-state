"""Extract comps PDFs from Estate Valora .zip, stripping trailing spaces in paths."""
import zipfile
import pathlib
import re

ROOT = pathlib.Path(r"D:\PersonalProject\valuation-app\data\estate-valora-comps")
ZIP = pathlib.Path(r"D:\PersonalProject\valuation-app\Estate Valora .zip")

ROOT.mkdir(parents=True, exist_ok=True)
count = 0

with zipfile.ZipFile(ZIP) as z:
    for info in z.infolist():
        name = info.filename.replace("\\", "/")
        if name.startswith("__MACOSX") or name.endswith("/") or not name.lower().endswith(".pdf"):
            continue
        parts = [p.strip() for p in name.split("/") if p and p.strip() and p.strip() != "."]
        # Drop top "Estate Valora" folder
        if parts and re.match(r"^Estate Valora", parts[0], re.I):
            parts = parts[1:]
        if not parts:
            continue
        # Sanitize each segment for Windows
        safe_parts = []
        for p in parts:
            p = p.strip().rstrip(". ")
            p = re.sub(r'[<>:"|?*]', "_", p)
            if p:
                safe_parts.append(p)
        dest = ROOT.joinpath(*safe_parts)
        dest.parent.mkdir(parents=True, exist_ok=True)
        with z.open(info) as src, open(dest, "wb") as out:
            out.write(src.read())
        count += 1
        print(dest.relative_to(ROOT))

print("PDF_COUNT", count)

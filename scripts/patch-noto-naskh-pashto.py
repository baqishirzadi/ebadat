#!/usr/bin/env python3
"""Give Pashto letters precomposed glyphs in Noto Naskh Arabic so iOS draws them correctly.

Stock Noto Naskh builds ښ ټ ڼ ږ from a base glyph plus two marks (GSUB ccmp) and
places the marks with GPOS mark anchors. iOS TextKit (what React Native uses)
drops those mark positions for letters that decompose into two marks, so the
dots and rings land at their raw glyph height: ڼ loses its ring ("بڼه" reads
"بنه"), ټ's ring floats away, ښ's dots sit above the ascenders and below the line.

For each such letter this script removes the decomposition and adds one
composite glyph per base variant the letter can take (isolated, init, medi,
fina and contextual `.wide` forms), with both marks placed at that variant's own
anchors. Each composite inherits its base variant's GSUB substitutions, context
coverage, harakat anchors and GDEF class, so it shapes exactly like the stock
font. ښ additionally pulls its dots a little closer to the letter.

Usage:
  python3 scripts/patch-noto-naskh-pashto.py SRC.ttf [--out DST.ttf]

Patches SRC in place unless --out is given. Re-running on a patched font is a no-op.
Always start from the upstream Noto Naskh Arabic TTFs. Requires fontTools.
"""

import argparse
import copy
import shutil
import sys

from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphComponent

# Letter -> per-weight (dx, dy) shifts for its first and second mark, in font units.
# ښ: brings both dots from Noto's ~85-100 unit gap to ~55-60, centred on the letter
# (tucking the upper dot between the teeth reads as س + ن).
LETTERS = {
    'uni069A': {'regular': ((0, -35), (0, 25)), 'bold': ((0, -45), (0, 30))},  # ښ
    'uni067C': None,  # ټ
    'uni06BC': None,  # ڼ
    'uni0696': None,  # ږ
}
CCMP_DECOMPOSITION_LENGTH = 3
ROUND_XY_TO_GRID = 0x0004


def subtables_of(lookup):
    for sub in lookup.SubTable:
        if lookup.LookupType in (7, 9) and hasattr(sub, 'ExtSubTable'):
            yield sub.ExtensionLookupType, sub.ExtSubTable
        else:
            yield lookup.LookupType, sub


def subtables(table):
    for lookup in table.LookupList.Lookup:
        yield from subtables_of(lookup)


def single_mappings(font):
    """Every 1:1 substitution mapping (single subst, or multiple subst with one output)."""
    for lookup_type, sub in subtables(font['GSUB'].table):
        if lookup_type in (1, 2):
            yield sub.mapping


def one_to_one(value):
    if isinstance(value, list):
        return value[0] if len(value) == 1 else None
    return value


def decompositions(font):
    found = {}
    for lookup_type, sub in subtables(font['GSUB'].table):
        if lookup_type == 2:
            for letter in LETTERS:
                if letter in sub.mapping and len(sub.mapping[letter]) == CCMP_DECOMPOSITION_LENGTH:
                    found[letter] = (sub.mapping, list(sub.mapping[letter]))
    return found


def variant_closure(font, base):
    """All glyphs `base` can become through 1:1 substitutions, base first."""
    seen, queue = [base], [base]
    mappings = list(single_mappings(font))
    while queue:
        glyph = queue.pop()
        for mapping in mappings:
            target = one_to_one(mapping.get(glyph))
            if target and target not in seen:
                seen.append(target)
                queue.append(target)
    return seen


def marks_seen_by(font, lookup, marks):
    """The letter's own marks as a context lookup with `lookup`'s flags would see them."""
    if lookup.LookupFlag & 0x0008:
        return []
    if lookup.LookupFlag & 0x0010:
        allowed = set(font['GDEF'].table.MarkGlyphSetsDef.Coverage[lookup.MarkFilteringSet].glyphs)
        return [m for m in marks if m in allowed]
    return list(marks)


def resolve_with_own_marks(font, variant, marks):
    """Follow context rules that fire on `variant` because its own marks come next.

    Noto widens ٮ before two-dot marks (rlig), so ټ's init/medi base is `.wide`.
    The composite carries those marks inside it, so it must be built on the result.
    Returns the resolved glyph and the context subtables that produced it.
    """
    lookups = font['GSUB'].table.LookupList.Lookup
    resolved, used = variant, set()
    for lookup in lookups:
        for lookup_type, sub in subtables_of(lookup):
            if (lookup_type != 6 or getattr(sub, 'Format', None) != 3 or sub.BacktrackCoverage
                    or len(sub.InputCoverage) != 1 or resolved not in sub.InputCoverage[0].glyphs):
                continue
            seen = marks_seen_by(font, lookup, marks)
            ahead = sub.LookAheadCoverage
            if not ahead or len(ahead) > len(seen) or not all(m in c.glyphs for m, c in zip(seen, ahead)):
                continue
            for record in sub.SubstLookupRecord:
                for _, nested in subtables_of(lookups[record.LookupListIndex]):
                    target = one_to_one(getattr(nested, 'mapping', {}).get(resolved))
                    if target:
                        resolved = target
                        break
            used.add(id(sub))
    return resolved, used


def clone_name(letter, base, variant):
    if variant == base:
        return letter
    suffix = variant[variant.index('.'):] if '.' in variant else ''
    if not suffix:
        sys.exit(f'Cannot name the {letter} clone of {variant}')
    return letter + suffix


def mark_offset(font, base, mark):
    """Where GPOS mark-to-base puts `mark` on `base`, relative to the base origin."""
    for lookup_type, sub in subtables(font['GPOS'].table):
        if lookup_type != 4:
            continue
        if base in sub.BaseCoverage.glyphs and mark in sub.MarkCoverage.glyphs:
            mark_record = sub.MarkArray.MarkRecord[sub.MarkCoverage.glyphs.index(mark)]
            base_anchor = sub.BaseArray.BaseRecord[sub.BaseCoverage.glyphs.index(base)].BaseAnchor[mark_record.Class]
            if base_anchor is None:
                continue
            return (base_anchor.XCoordinate - mark_record.MarkAnchor.XCoordinate,
                    base_anchor.YCoordinate - mark_record.MarkAnchor.YCoordinate)
    sys.exit(f'No mark-to-base anchor for {mark} on {base}')


def insert_sorted(font, glyphs, name):
    """Insert `name` into a coverage glyph list, keeping glyph-ID order; return its index."""
    gid = font.getGlyphID(name)
    index = next((i for i, g in enumerate(glyphs) if font.getGlyphID(g) > gid), len(glyphs))
    glyphs.insert(index, name)
    return index


def component(name, x, y):
    c = GlyphComponent()
    c.glyphName = name
    c.x, c.y = x, y
    c.flags = ROUND_XY_TO_GRID
    return c


def add_glyph(font, name, glyph, advance):
    glyf, hmtx = font['glyf'], font['hmtx']
    order = font.getGlyphOrder()
    if name not in order:
        order.append(name)
        glyf.glyphOrder = order
        font.setGlyphOrder(order)
    glyf.glyphs[name] = glyph
    glyph.recalcBounds(glyf)
    hmtx.metrics[name] = (advance, glyph.xMin)


def mark_positions(font, shape, marks, shifts):
    positions = {}
    for mark, (dx, dy) in zip(marks, shifts):
        x, y = mark_offset(font, shape, mark)
        positions[mark] = (x + dx, y + dy)
    return positions


def stacked_position(font, mark, positions):
    """Where mark-to-mark would put `mark` after the letter's own marks, or None.

    In the stock font a fatha or kasra on ښ stacks on its dot, not on the seen.
    """
    allowed_sets = font['GDEF'].table.MarkGlyphSetsDef.Coverage
    result = None
    for lookup in font['GPOS'].table.LookupList.Lookup:
        for lookup_type, sub in subtables_of(lookup):
            if lookup_type != 6 or mark not in sub.Mark1Coverage.glyphs:
                continue
            visible = [m for m in positions
                       if not (lookup.LookupFlag & 0x0010) or m in allowed_sets[lookup.MarkFilteringSet].glyphs]
            if not visible or visible[-1] not in sub.Mark2Coverage.glyphs:
                continue
            below = visible[-1]
            record = sub.Mark1Array.MarkRecord[sub.Mark1Coverage.glyphs.index(mark)]
            anchor = sub.Mark2Array.Mark2Record[sub.Mark2Coverage.glyphs.index(below)].Mark2Anchor[record.Class]
            if anchor is not None:
                x, y = positions[below]
                result = (x + anchor.XCoordinate - record.MarkAnchor.XCoordinate,
                          y + anchor.YCoordinate - record.MarkAnchor.YCoordinate)
    return result


def restack_base_record(font, sub, record, positions):
    """Move the composite's harakat anchors to where they stacked on its own marks."""
    by_class = {}
    for mark, mark_record in zip(sub.MarkCoverage.glyphs, sub.MarkArray.MarkRecord):
        by_class.setdefault(mark_record.Class, []).append((mark, mark_record.MarkAnchor))
    for cls, members in by_class.items():
        base_anchor = record.BaseAnchor[cls]
        if base_anchor is None:
            continue
        votes = {}
        for mark, mark_anchor in members:
            stacked = stacked_position(font, mark, positions)
            if stacked is None:
                target = (base_anchor.XCoordinate, base_anchor.YCoordinate)
            else:
                target = (stacked[0] + mark_anchor.XCoordinate, stacked[1] + mark_anchor.YCoordinate)
            votes[target] = votes.get(target, 0) + 1
        x, y = max(votes, key=votes.get)
        base_anchor.XCoordinate, base_anchor.YCoordinate = x, y


def build_composites(font, marks, clones, shapes, shifts):
    gdef = font['GDEF'].table
    for variant, name in clones.items():
        shape = shapes[variant][0]
        glyph = Glyph()
        glyph.numberOfContours = -1
        glyph.components = [component(shape, 0, 0)]
        for mark, (x, y) in mark_positions(font, shape, marks, shifts).items():
            glyph.components.append(component(mark, x, y))
        add_glyph(font, name, glyph, font['hmtx'].metrics[shape][0])
        gdef.GlyphClassDef.classDefs[name] = gdef.GlyphClassDef.classDefs.get(shape, 1)


def clone_gsub(font, clones, shapes):
    for lookup_type, sub in subtables(font['GSUB'].table):
        if lookup_type in (1, 2):
            mapping = sub.mapping
            for variant, name in clones.items():
                target = one_to_one(mapping.get(variant))
                if target is None or name in mapping:
                    continue
                if target not in clones:
                    sys.exit(f'{variant} -> {target} leaves the variant set')
                mapping[name] = [clones[target]] if isinstance(mapping[variant], list) else clones[target]
        elif lookup_type in (5, 6):
            if getattr(sub, 'Format', None) != 3:
                referenced = str(vars(sub))
                if any(f"'{v}'" in referenced for v in clones):
                    sys.exit(f'Context lookup format {sub.Format} references a base variant; extend the script')
                continue
            coverages = list(getattr(sub, 'Coverage', None) or []) + list(getattr(sub, 'BacktrackCoverage', [])) \
                + list(getattr(sub, 'InputCoverage', [])) + list(getattr(sub, 'LookAheadCoverage', []))
            for coverage in coverages:
                for variant, name in clones.items():
                    if id(sub) in shapes[variant][1]:
                        continue
                    if variant in coverage.glyphs and name not in coverage.glyphs:
                        insert_sorted(font, coverage.glyphs, name)


def clone_gpos(font, marks, clones, shapes, shifts):
    for lookup_type, sub in subtables(font['GPOS'].table):
        if lookup_type == 4:
            for variant, name in clones.items():
                shape = shapes[variant][0]
                if shape in sub.BaseCoverage.glyphs and name not in sub.BaseCoverage.glyphs:
                    record = copy.deepcopy(sub.BaseArray.BaseRecord[sub.BaseCoverage.glyphs.index(shape)])
                    restack_base_record(font, sub, record, mark_positions(font, shape, marks, shifts))
                    index = insert_sorted(font, sub.BaseCoverage.glyphs, name)
                    sub.BaseArray.BaseRecord.insert(index, record)
                    sub.BaseArray.BaseCount = len(sub.BaseArray.BaseRecord)
        elif lookup_type == 2:
            glyphs = set(sub.Coverage.glyphs)
            if sub.Format == 2:
                glyphs |= set(sub.ClassDef2.classDefs)
            else:
                glyphs |= {r.SecondGlyph for ps in sub.PairSet for r in ps.PairValueRecord}
            if glyphs & set(clones):
                sys.exit('A kerning table references a base variant; extend the script')


def patch(font, weight):
    found = decompositions(font)
    if set(found) != set(LETTERS):
        sys.exit(f'Expected ccmp decompositions for {sorted(LETTERS)}, found {sorted(found)}; '
                 'start from the upstream font')

    for tag in ('glyf', 'hmtx', 'post', 'cmap', 'GDEF', 'GSUB', 'GPOS'):
        font[tag]

    plans = []
    for letter, config in LETTERS.items():
        mapping, (base, *marks) = found[letter]
        variants = variant_closure(font, base)
        clones = {v: clone_name(letter, base, v) for v in variants}
        if len(set(clones.values())) != len(clones):
            sys.exit(f'Clone names collide for {letter}: {clones}')
        shapes = {v: resolve_with_own_marks(font, v, marks) for v in variants}
        shifts = config[weight] if config else ((0, 0),) * len(marks)
        plans.append((letter, mapping, marks, clones, shapes, shifts))

    for letter, mapping, marks, clones, shapes, shifts in plans:
        build_composites(font, marks, clones, shapes, shifts)
        clone_gsub(font, clones, shapes)
        clone_gpos(font, marks, clones, shapes, shifts)
        del mapping[letter]

    others = [k for t, sub in subtables(font['GSUB'].table) if t == 2
              for k, v in sub.mapping.items() if len(v) >= CCMP_DECOMPOSITION_LENGTH]
    return others


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('src')
    parser.add_argument('--out')
    args = parser.parse_args()
    out = args.out or args.src

    font = TTFont(args.src)
    if not decompositions(font):
        print(f'{args.src}: already patched, skipping')
        if out != args.src:
            shutil.copyfile(args.src, out)
        return

    weight = 'bold' if font['OS/2'].usWeightClass >= 600 else 'regular'
    others = patch(font, weight)
    font.save(out)
    print(f'{args.src} -> {out}: {weight}, precomposed {", ".join(LETTERS)}')
    if others:
        print(f'  other multi-mark decompositions left untouched: {", ".join(sorted(others))}')


if __name__ == '__main__':
    main()

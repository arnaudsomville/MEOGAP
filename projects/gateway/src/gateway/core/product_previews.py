"""Deterministic illustrative previews for the M0 demo product catalogue.

The previews are synthetic SVG illustrations embedded as data URLs. They are
deliberately labelled as illustrations so the UI never presents them as real
satellite observations or validated scientific results.
"""

from __future__ import annotations

from typing import Any
from urllib.parse import quote

WIDTH = 320
HEIGHT = 180
LABEL_BAND = (
    "<rect x='12' y='154' width='296' height='16' rx='4' "
    "fill='#04141d' fill-opacity='.68'/>"
    "<text x='18' y='165' fill='#dff6f1' font-family='sans-serif' "
    "font-size='9'>ILLUSTRATIVE PREVIEW</text>"
    "<text x='302' y='165' text-anchor='end' fill='#9fb8b4' "
    "font-family='sans-serif' font-size='8'>NOT A SCIENTIFIC RESULT</text>"
)


def _svg(name: str, defs: str, body: str) -> str:
    """Wrap one illustrative scene in the shared SVG frame.

    Args:
    ----
        name(str): product display name shown in the corner.
        defs(str): SVG definitions such as gradients, patterns and filters.
        body(str): SVG scene content.

    Returns:
    -------
        str: complete SVG document.

    """
    return (
        "<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180' "
        "viewBox='0 0 320 180'>"
        f'<defs>{defs}</defs>'
        f'{body}'
        f'{LABEL_BAND}'
        "<text x='16' y='26' fill='#f4fffc' font-family='sans-serif' "
        f"font-size='17' font-weight='700'>{name}</text>"
        '</svg>'
    )


def _ndvi(name: str) -> str:
    """Build a vegetation-index illustration with farmland and leaf motifs."""
    defs = (
        "<linearGradient id='ndvi-bg' x1='0' y1='0' x2='1' y2='1'>"
        "<stop offset='0' stop-color='#08261b'/>"
        "<stop offset='1' stop-color='#123f26'/></linearGradient>"
        "<pattern id='ndvi-fields' width='38' height='28' "
        "patternUnits='userSpaceOnUse' patternTransform='rotate(9)'>"
        "<rect width='38' height='28' fill='#2b6b3f'/>"
        "<rect width='16' height='28' fill='#4f9b52' fill-opacity='.85'/>"
        "<rect x='24' width='9' height='28' fill='#8cc46f' fill-opacity='.7'/>"
        "<path d='M0 0v28M19 0v28' stroke='#dff0b8' stroke-opacity='.18'/>"
        '</pattern>'
        "<radialGradient id='ndvi-sun' cx='.8' cy='.18' r='.7'>"
        "<stop offset='0' stop-color='#d8efb4' stop-opacity='.38'/>"
        "<stop offset='1' stop-color='#d8efb4' stop-opacity='0'/>"
        '</radialGradient>'
    )
    body = (
        "<rect width='320' height='180' fill='url(#ndvi-bg)'/>"
        "<rect width='320' height='180' fill='url(#ndvi-fields)' opacity='.88'/>"
        "<rect width='320' height='180' fill='url(#ndvi-sun)'/>"
        "<path d='M0 130c48-22 84-14 128-2 44 12 92 10 192-16v68H0Z' "
        "fill='#0b2e1d' fill-opacity='.46'/>"
        "<path d='M221 42c18-5 33 5 35 23-18 4-32-6-35-23Z' "
        "fill='#dff0b8' fill-opacity='.86'/>"
        "<path d='M223 45c9 7 16 13 32 18' fill='none' stroke='#6da35b' "
        "stroke-width='1.4' stroke-opacity='.8'/>"
        "<path d='M196 52c15-3 27 5 29 19-15 3-26-5-29-19Z' "
        "fill='#8cc46f' fill-opacity='.7'/>"
        "<circle cx='264' cy='36' r='24' fill='#d8efb4' fill-opacity='.16'/>"
    )
    return _svg(name, defs, body)


def _ndwi(name: str) -> str:
    """Build a water-index illustration with shoreline and water body motifs."""
    defs = (
        "<linearGradient id='ndwi-water' x1='0' y1='0' x2='0' y2='1'>"
        "<stop offset='0' stop-color='#0b4f69'/>"
        "<stop offset='1' stop-color='#062a3d'/></linearGradient>"
        "<radialGradient id='ndwi-glow' cx='.72' cy='.34' r='.6'>"
        "<stop offset='0' stop-color='#8ff0e4' stop-opacity='.34'/>"
        "<stop offset='1' stop-color='#8ff0e4' stop-opacity='0'/>"
        '</radialGradient>'
    )
    body = (
        "<rect width='320' height='180' fill='#072734'/>"
        "<path d='M0 0h320v64c-46 18-84 4-126 14S84 98 0 82Z' "
        "fill='#2b513b'/>"
        "<path d='M0 78c58 14 104 8 152 24 52 18 110 8 168 22v56H0Z' "
        "fill='url(#ndwi-water)'/>"
        "<path d='M0 78c58 14 104 8 152 24 52 18 110 8 168 22v56H0Z' "
        "fill='url(#ndwi-glow)'/>"
        "<path d='M0 96c58 12 106 4 156 22 50 18 108 10 164 24' "
        "fill='none' stroke='#6fdcd8' stroke-width='2' stroke-opacity='.55'/>"
        "<path d='M0 111c58 12 106 4 156 22 50 18 108 10 164 24' "
        "fill='none' stroke='#b7f5ee' stroke-width='1' stroke-opacity='.32'/>"
        "<path d='M236 38c13 0 22 10 22 22s-11 24-22 35c-11-11-22-23-22-35 "
        "0-12 9-22 22-22Z' fill='#b7f5ee' fill-opacity='.24' "
        "stroke='#b7f5ee' stroke-opacity='.5'/>"
        "<path d='M236 50v28' stroke='#dffbf8' stroke-width='1.4' "
        "stroke-opacity='.7'/>"
    )
    return _svg(name, defs, body)


def _lst(name: str) -> str:
    """Build a land-surface-temperature illustration with a heat-island motif."""
    defs = (
        "<linearGradient id='lst-bg' x1='0' y1='0' x2='1' y2='1'>"
        "<stop offset='0' stop-color='#2a0d13'/>"
        "<stop offset='1' stop-color='#6f2f1e'/></linearGradient>"
        "<radialGradient id='lst-hot' cx='.56' cy='.48' r='.52'>"
        "<stop offset='0' stop-color='#ffe29a' stop-opacity='.95'/>"
        "<stop offset='.38' stop-color='#f0a24f' stop-opacity='.7'/>"
        "<stop offset='1' stop-color='#a53b25' stop-opacity='0'/>"
        '</radialGradient>'
        "<filter id='lst-blur'><feGaussianBlur stdDeviation='7'/></filter>"
    )
    body = (
        "<rect width='320' height='180' fill='url(#lst-bg)'/>"
        "<g filter='url(#lst-blur)'>"
        "<ellipse cx='178' cy='87' rx='92' ry='54' fill='#d87a34' "
        "fill-opacity='.5'/>"
        "<ellipse cx='164' cy='82' rx='52' ry='34' fill='#ffca72' "
        "fill-opacity='.55'/>"
        "<ellipse cx='92' cy='126' rx='50' ry='24' fill='#8d3a27' "
        "fill-opacity='.45'/>"
        '</g>'
        "<rect width='320' height='180' fill='url(#lst-hot)'/>"
        "<g fill='none' stroke='#f7dd94' stroke-opacity='.42' stroke-width='1.2'>"
        "<path d='M-8 138c58-26 94-4 138-20s72-26 116-10 62 8 84-6'/>"
        "<path d='M-8 118c52-22 88-2 128-16s72-24 112-8 68 6 96-8'/>"
        "<path d='M-8 158c64-26 104-6 146-20s70-22 112-8 66 8 92-4'/>"
        '</g>'
        "<rect x='142' y='64' width='34' height='20' rx='2' fill='#f7dd94' "
        "fill-opacity='.16'/>"
        "<rect x='186' y='92' width='46' height='24' rx='2' fill='#f7dd94' "
        "fill-opacity='.12'/>"
        "<path d='M154 74h10v12h-10zM194 100h12v10h-12z' fill='#ffe29a' "
        "fill-opacity='.3'/>"
    )
    return _svg(name, defs, body)


def _ch4(name: str) -> str:
    """Build a methane-proxy illustration with an atmospheric plume motif."""
    defs = (
        "<linearGradient id='ch4-sky' x1='0' y1='0' x2='1' y2='1'>"
        "<stop offset='0' stop-color='#140c27'/>"
        "<stop offset='1' stop-color='#2a1742'/></linearGradient>"
        "<radialGradient id='ch4-plume' cx='.5' cy='.5' r='.5'>"
        "<stop offset='0' stop-color='#d7b8f5' stop-opacity='.75'/>"
        "<stop offset='.55' stop-color='#8c5bd1' stop-opacity='.42'/>"
        "<stop offset='1' stop-color='#8c5bd1' stop-opacity='0'/>"
        '</radialGradient>'
        "<filter id='ch4-blur'><feGaussianBlur stdDeviation='8'/></filter>"
    )
    body = (
        "<rect width='320' height='180' fill='url(#ch4-sky)'/>"
        "<path d='M0 142c46-18 84-8 126 0s94 10 194-10v48H0Z' "
        "fill='#0b2530'/>"
        "<path d='M0 132c48-14 86-6 128 2s92 8 192-12' fill='none' "
        "stroke='#4d3b70' stroke-width='2' stroke-opacity='.6'/>"
        "<g filter='url(#ch4-blur)'>"
        "<ellipse cx='190' cy='88' rx='96' ry='34' fill='url(#ch4-plume)'/>"
        "<ellipse cx='236' cy='70' rx='56' ry='22' fill='#a56cf0' "
        "fill-opacity='.35'/>"
        "<ellipse cx='132' cy='106' rx='42' ry='18' fill='#6b3fa0' "
        "fill-opacity='.35'/>"
        '</g>'
        "<path d='M108 124c18-18 40-22 62-28 26-7 46-18 76-16 22 2 36-6 50-16' "
        "fill='none' stroke='#d7b8f5' stroke-width='2' stroke-dasharray='4 7' "
        "stroke-opacity='.55'/>"
        "<g fill='#dcc3fa' fill-opacity='.6'>"
        "<circle cx='150' cy='96' r='2'/><circle cx='174' cy='84' r='2.4'/>"
        "<circle cx='202' cy='74' r='2.2'/><circle cx='228' cy='58' r='2'/>"
        "<circle cx='252' cy='50' r='2.6'/><circle cx='270' cy='42' r='2'/>"
        '</g>'
        "<path d='M96 126h16l-3-16h-10Z' fill='#3a2a52'/>"
        "<circle cx='104' cy='108' r='4' fill='#dcc3fa' fill-opacity='.35'/>"
        "<path d='M270 26h20m0 0-5-4m5 4-5 4' stroke='#9fb8b4' "
        "stroke-width='1.2' stroke-opacity='.6'/>"
    )
    return _svg(name, defs, body)


BUILDERS = {
    'ndvi': _ndvi,
    'ndwi': _ndwi,
    'lst': _lst,
    'ch4': _ch4,
}


def build_product_preview(product_id: str, name: str) -> dict[str, Any]:
    """Return a local illustrative preview descriptor for one demo product.

    Args:
    ----
        product_id(str): product identifier selecting the illustration.
        name(str): product display name shown by the illustration.

    Returns:
    -------
        dict[str, Any]: data URL, alternative text and attribution.

    """
    builder = BUILDERS.get(product_id, _ndvi)
    svg = builder(name)
    return {
        'url': f'data:image/svg+xml,{quote(svg)}',
        'alt': f'Illustrative preview for the {name} demo product',
        'attribution': 'MEOGAP synthetic illustration, not a scientific result',
    }

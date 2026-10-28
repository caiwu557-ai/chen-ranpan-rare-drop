"""Keep PNG masters; encode same-size WebP textures with exact alpha."""
from pathlib import Path
from PIL import Image, ImageChops
import json

root = Path(__file__).resolve().parents[1]
records = []
for source in sorted((root / 'assets').rglob('*.png')):
    if source.stem == 'preview':
        continue  # Composite preview is not requested by the production page.
    target = source.with_suffix('.webp')
    assert not target.exists(), f'Choose a new output version: {target}'
    with Image.open(source) as image:
        image = image.convert('RGBA')
        lossless = source.stem in {'text', 'lineart', 'shape-mask'}
        image.save(target, 'WEBP', lossless=lossless, quality=90, method=6, exact=True)
        with Image.open(target) as check:
            check = check.convert('RGBA')
            assert check.size == image.size
            assert ImageChops.difference(check.getchannel('A'), image.getchannel('A')).getbbox() is None
            if lossless:
                assert check.tobytes() == image.tobytes()
        assert target.stat().st_size < source.stat().st_size, f'No size benefit: {target}'
        records.append({'file': str(source.relative_to(root)).replace('\\', '/'), 'pngBytes': source.stat().st_size, 'webpBytes': target.stat().st_size, 'size': image.size, 'lossless': lossless})
result = {'images': records, 'pngBytes': sum(r['pngBytes'] for r in records), 'webpBytes': sum(r['webpBytes'] for r in records), 'alphaUnchanged': True}
(root / 'image-optimization.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
print(json.dumps(result))

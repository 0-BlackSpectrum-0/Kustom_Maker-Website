# tools/analyze_images.py
import sys, os, json
from PIL import Image

def analyze_image(path):
    try:
        with Image.open(path) as img:
            w, h = img.size
            fmt = img.format
            mode = img.mode
            has_alpha = ('A' in mode) or ('transparency' in img.info)
            
            transparent_fraction = 0.0
            corner_alpha = 255
            
            if has_alpha:
                rgba = img.convert('RGBA')
                # check 4 corners
                corners = [
                    rgba.getpixel((0, 0))[3],
                    rgba.getpixel((w - 1, 0))[3],
                    rgba.getpixel((0, h - 1))[3],
                    rgba.getpixel((w - 1, h - 1))[3],
                ]
                corner_alpha = min(corners)
                
                # Sample pixels to compute transparent fraction
                # for speed on large images, resize to max 200x200
                thumb = rgba.copy()
                thumb.thumbnail((200, 200))
                tw, th = thumb.size
                total_pixels = tw * th
                transparent_pixels = sum(1 for p in thumb.getdata() if p[3] < 128)
                transparent_fraction = transparent_pixels / total_pixels
            
            aspect = w / h if h > 0 else 0
            
            # Determine kind
            kind = "unknown"
            if transparent_fraction > 0.05 or corner_alpha == 0:
                kind = "widget-only"
            elif aspect >= 0.4 and aspect <= 0.58 and (h >= 1000 or w >= 400):
                kind = "phone-fullscreen"
            elif "mockup" in os.path.basename(path).lower():
                kind = "phone-mockup"
            else:
                kind = "unknown"
                
            return {
                "path": path.replace('\\', '/'),
                "name": os.path.basename(path),
                "width": w,
                "height": h,
                "format": fmt,
                "mode": mode,
                "has_alpha": has_alpha,
                "corner_alpha": corner_alpha,
                "transparent_fraction": round(transparent_fraction, 4),
                "aspect": round(aspect, 4),
                "kind": kind
            }
    except Exception as e:
        return {"path": path.replace('\\', '/'), "name": os.path.basename(path), "error": str(e)}

def analyze_thumb_bytes(data):
    if len(data) >= 12 and data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        real_fmt = 'WEBP'
    elif len(data) >= 3 and data[:3] == b'\xff\xd8\xff':
        real_fmt = 'JPEG'
    elif len(data) >= 8 and data[:4] == b'\x89PNG':
        real_fmt = 'PNG'
    else:
        real_fmt = 'UNKNOWN'
        
    try:
        import io
        with Image.open(io.BytesIO(data)) as img:
            return {
                "real_format": real_fmt,
                "width": img.width,
                "height": img.height,
                "size_bytes": len(data)
            }
    except Exception as e:
        return {
            "real_format": real_fmt,
            "error": str(e),
            "size_bytes": len(data)
        }

if __name__ == '__main__':
    if len(sys.argv) > 1:
        img_paths = sys.argv[1:]
        results = [analyze_image(p) for p in img_paths]
        print(json.dumps(results))

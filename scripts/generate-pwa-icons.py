"""Generate PWA icons for Aegis Map using Pillow."""

import math
import os
from PIL import Image, ImageDraw

def render_aegis_icon(size: int, is_maskable: bool = False) -> Image.Image:
    scale = 4
    canvas_size = size * scale
    
    image = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    
    bg_color = (15, 23, 42, 255)
    
    if is_maskable:
        draw.rectangle([0, 0, canvas_size, canvas_size], fill=bg_color)
        content_margin = canvas_size * 0.15
    else:
        radius = canvas_size * (96.0 / 512.0)
        draw.rounded_rectangle([0, 0, canvas_size, canvas_size], radius=radius, fill=bg_color)
        content_margin = canvas_size * 0.08

    cx = canvas_size / 2.0
    top_y = content_margin + canvas_size * 0.05
    shield_w = (canvas_size - 2 * content_margin) * 0.82
    shield_h = (canvas_size - 2 * content_margin) * 0.88
    
    points = []
    steps = 16
    for i in range(steps + 1):
        t = i / steps
        x = cx + (shield_w / 2) * t
        y = top_y + (shield_h * 0.12) * (t ** 0.85)
        points.append((x, y))
        
    right_x = cx + shield_w / 2
    right_y = top_y + shield_h * 0.12
    bottom_y = top_y + shield_h
    
    for i in range(1, steps + 1):
        t = i / steps
        inv = 1 - t
        p0 = (right_x, right_y)
        p1 = (right_x, right_y + shield_h * 0.45)
        p2 = (cx + shield_w * 0.15, bottom_y - shield_h * 0.05)
        p3 = (cx, bottom_y)
        x = (inv**3)*p0[0] + 3*(inv**2)*t*p1[0] + 3*inv*(t**2)*p2[0] + (t**3)*p3[0]
        y = (inv**3)*p0[1] + 3*(inv**2)*t*p1[1] + 3*inv*(t**2)*p2[1] + (t**3)*p3[1]
        points.append((x, y))
        
    left_points = []
    for (px, py) in points[:-1]:
        left_points.append((2 * cx - px, py))
    left_points.reverse()
    
    all_points = points + left_points
    
    shield_color = (37, 99, 235, 255)
    draw.polygon(all_points, fill=shield_color)
    
    stroke_w = int(canvas_size * (14.0 / 512.0))
    stroke_color = (147, 197, 253, 255)
    for i in range(len(all_points)):
        p1 = all_points[i]
        p2 = all_points[(i + 1) % len(all_points)]
        draw.line([p1, p2], fill=stroke_color, width=stroke_w)
    
    s_factor = (shield_w / (512.0 * 0.55))
    chk_start = (cx - 44 * s_factor, top_y + shield_h * 0.48)
    chk_mid = (cx - 14 * s_factor, top_y + shield_h * 0.57)
    chk_end = (cx + 48 * s_factor, top_y + shield_h * 0.36)
    
    chk_w = int(canvas_size * (24.0 / 512.0))
    chk_color = (255, 255, 255, 255)
    
    draw.line([chk_start, chk_mid], fill=chk_color, width=chk_w)
    draw.line([chk_mid, chk_end], fill=chk_color, width=chk_w)
    r_cap = chk_w / 2.0
    for pt in [chk_start, chk_mid, chk_end]:
        draw.ellipse([pt[0] - r_cap, pt[1] - r_cap, pt[0] + r_cap, pt[1] + r_cap], fill=chk_color)
        
    return image.resize((size, size), Image.Resampling.LANCZOS)

def main():
    icons_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "apps", "web", "public", "icons"))
    os.makedirs(icons_dir, exist_ok=True)
    
    targets = [
        ("icon-192.png", 192, False),
        ("icon-512.png", 512, False),
        ("maskable-512.png", 512, True),
        ("apple-touch-icon.png", 180, False),
        ("favicon-32x32.png", 32, False),
        ("favicon-16x16.png", 16, False),
    ]
    
    for filename, size, maskable in targets:
        dest = os.path.join(icons_dir, filename)
        img = render_aegis_icon(size, maskable)
        img.save(dest, "PNG", optimize=True)
        print(f"Generated {dest} ({size}x{size}, maskable={maskable})")

if __name__ == "__main__":
    main()

import os
import io
import base64
from PIL import Image

SOURCE_IMAGE = r"C:/Users/Farhan Ayan Emon/.gemini/antigravity/brain/259bf574-5c65-4141-9547-33f8c2ce81d7/.user_uploaded/media_1792001567427_66710352.png"
REPO_ROOT = r"C:/himewo"

def main():
    print(f"Loading source image from {SOURCE_IMAGE}...")
    src = Image.open(SOURCE_IMAGE).convert("RGBA")
    w, h = src.size
    pixels = src.load()

    # Create raw transparent image
    raw = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    raw_pixels = raw.load()

    # Lum thresholds:
    # Everything >= 248 is outer background or eye cutout (alpha = 0)
    # Everything <= 20 is solid black body (alpha = 255)
    # 20 < lum < 248 is smooth anti-aliased edge (pure black RGB with exact alpha)
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            if lum >= 248:
                raw_pixels[x, y] = (0, 0, 0, 0)
            elif lum <= 20:
                raw_pixels[x, y] = (0, 0, 0, 255)
            else:
                alpha = int(round((248 - lum) / (248 - 20) * 255))
                alpha = max(0, min(255, alpha))
                raw_pixels[x, y] = (0, 0, 0, alpha)

    bbox = raw.getbbox()
    print(f"Cat silhouette bounding box: {bbox}")
    cropped = raw.crop(bbox)
    cw, ch = cropped.size
    print(f"Cropped cat size: {cw}x{ch}")

    # 1. Master Brand Logo (1024x1024) - Cat scaled to ~82% of canvas, perfectly centered
    target_scale = 0.82
    scale = (1024 * target_scale) / max(cw, ch)
    new_cw = int(round(cw * scale))
    new_ch = int(round(ch * scale))
    scaled_cat = cropped.resize((new_cw, new_ch), Image.Resampling.LANCZOS)

    master_logo = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    offset_x = (1024 - new_cw) // 2
    offset_y = (1024 - new_ch) // 2
    master_logo.paste(scaled_cat, (offset_x, offset_y), scaled_cat)

    # 2. Adaptive Icon Foreground (1024x1024) - Cat scaled to ~58% of canvas (fits 61% safe zone)
    target_scale_adaptive = 0.58
    scale_a = (1024 * target_scale_adaptive) / max(cw, ch)
    new_cw_a = int(round(cw * scale_a))
    new_ch_a = int(round(ch * scale_a))
    scaled_cat_a = cropped.resize((new_cw_a, new_ch_a), Image.Resampling.LANCZOS)

    adaptive_logo = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    offset_x_a = (1024 - new_cw_a) // 2
    offset_y_a = (1024 - new_ch_a) // 2
    adaptive_logo.paste(scaled_cat_a, (offset_x_a, offset_y_a), scaled_cat_a)

    # 3. Favicon PNG (64x64 and 128x128)
    fav_64 = master_logo.resize((64, 64), Image.Resampling.LANCZOS)
    fav_128 = master_logo.resize((128, 128), Image.Resampling.LANCZOS)
    fav_180 = master_logo.resize((180, 180), Image.Resampling.LANCZOS) # apple-touch-icon

    # Base64 string for SVG embedding
    buf_svg = io.BytesIO()
    fav_128.save(buf_svg, format="PNG")
    b64_svg = base64.b64encode(buf_svg.getvalue()).decode("ascii")
    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 128 128" width="128" height="128">
  <image width="128" height="128" xlink:href="data:image/png;base64,{b64_svg}" />
</svg>
'''

    # Multi-resolution ICO
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    ico_images = [master_logo.resize(s, Image.Resampling.LANCZOS) for s in ico_sizes]

    # Target Web Directories
    web_dirs = [
        os.path.join(REPO_ROOT, "artifacts", "web", "public"),
        os.path.join(REPO_ROOT, "artifacts", "ads-dashboard", "public"),
        os.path.join(REPO_ROOT, "artifacts", "admin", "public"),
        os.path.join(REPO_ROOT, "artifacts", "app-landing", "public"),
    ]

    for d in web_dirs:
        os.makedirs(d, exist_ok=True)
        # logo.png (1024x1024 transparent)
        master_logo.save(os.path.join(d, "logo.png"), format="PNG")
        # favicon.png (128x128 transparent)
        fav_128.save(os.path.join(d, "favicon.png"), format="PNG")
        # apple-touch-icon.png (180x180 transparent)
        fav_180.save(os.path.join(d, "apple-touch-icon.png"), format="PNG")
        # favicon.svg
        with open(os.path.join(d, "favicon.svg"), "w", encoding="utf-8") as f:
            f.write(svg_content)
        # favicon.ico
        ico_images[0].save(
            os.path.join(d, "favicon.ico"),
            format="ICO",
            sizes=ico_sizes,
            append_images=ico_images[1:]
        )
        print(f"Updated web assets in {d}")

    # Also update web-specific original aliases
    web_public = os.path.join(REPO_ROOT, "artifacts", "web", "public")
    master_logo.save(os.path.join(web_public, "original_user_pixel_cat_zoomed.png"), format="PNG")
    master_logo.save(os.path.join(web_public, "original_user_pixel_cat.png"), format="PNG")

    # Mobile directories
    mobile_roots = [
        os.path.join(REPO_ROOT, "artifacts", "mobile"),
        os.path.join(REPO_ROOT, "artifacts", "mobile-chat"),
    ]

    for m_root in mobile_roots:
        for sub in ["assets", os.path.join("assets", "images")]:
            target_sub = os.path.join(m_root, sub)
            os.makedirs(target_sub, exist_ok=True)
            master_logo.save(os.path.join(target_sub, "icon.png"), format="PNG")
            adaptive_logo.save(os.path.join(target_sub, "adaptive-icon.png"), format="PNG")
            fav_128.save(os.path.join(target_sub, "favicon.png"), format="PNG")
            master_logo.save(os.path.join(target_sub, "splash-icon.png"), format="PNG")
            master_logo.save(os.path.join(target_sub, "splash.png"), format="PNG")
            print(f"Updated mobile assets in {target_sub}")

    # Generate Android Res Drawables and Mipmaps
    # 1. Android Adaptive foreground & legacy icons
    mipmap_densities = {
        "mdpi": {"launcher": 48, "foreground": 108},
        "hdpi": {"launcher": 72, "foreground": 162},
        "xhdpi": {"launcher": 96, "foreground": 216},
        "xxhdpi": {"launcher": 144, "foreground": 324},
        "xxxhdpi": {"launcher": 192, "foreground": 432},
    }

    splash_densities = {
        "mdpi": 288,
        "hdpi": 432,
        "xhdpi": 576,
        "xxhdpi": 864,
        "xxxhdpi": 1152,
    }

    for m_root in mobile_roots:
        res_dir = os.path.join(m_root, "android", "app", "src", "main", "res")
        if not os.path.exists(res_dir):
            continue

        for density, sizes in mipmap_densities.items():
            density_dir = os.path.join(res_dir, f"mipmap-{density}")
            os.makedirs(density_dir, exist_ok=True)

            # Foreground (transparent)
            fg_size = sizes["foreground"]
            fg_img = adaptive_logo.resize((fg_size, fg_size), Image.Resampling.LANCZOS)
            fg_img.save(os.path.join(density_dir, "ic_launcher_foreground.webp"), format="WEBP")

            # Legacy ic_launcher.webp (clean white background with cat)
            l_size = sizes["launcher"]
            # Create white rounded squircle or clean white square with cat
            legacy_bg = Image.new("RGBA", (l_size, l_size), (255, 255, 255, 255))
            # Cat sized to ~70% of launcher icon
            cat_l_size = int(round(l_size * 0.72))
            cat_l = master_logo.resize((cat_l_size, cat_l_size), Image.Resampling.LANCZOS)
            l_off = (l_size - cat_l_size) // 2
            legacy_bg.paste(cat_l, (l_off, l_off), cat_l)
            legacy_bg.save(os.path.join(density_dir, "ic_launcher.webp"), format="WEBP")

            # Legacy ic_launcher_round.webp (clean white circle with cat)
            circle_mask = Image.new("L", (l_size, l_size), 0)
            from PIL import ImageDraw
            draw = ImageDraw.Draw(circle_mask)
            draw.ellipse((0, 0, l_size - 1, l_size - 1), fill=255)
            round_bg = Image.new("RGBA", (l_size, l_size), (0, 0, 0, 0))
            round_bg.paste(legacy_bg, (0, 0), circle_mask)
            round_bg.save(os.path.join(density_dir, "ic_launcher_round.webp"), format="WEBP")

            print(f"Updated mipmap-{density} in {res_dir}")

        for density, splash_dim in splash_densities.items():
            drawable_dir = os.path.join(res_dir, f"drawable-{density}")
            os.makedirs(drawable_dir, exist_ok=True)
            splash_img = master_logo.resize((splash_dim, splash_dim), Image.Resampling.LANCZOS)
            splash_img.save(os.path.join(drawable_dir, "splashscreen_logo.png"), format="PNG")
            print(f"Updated drawable-{density}/splashscreen_logo.png in {res_dir}")

    print("\n[SUCCESS] All brand, favicon, and icon assets successfully generated and synced!")

if __name__ == "__main__":
    main()

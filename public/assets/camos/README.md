# Camo Image Assets

Place weapon and camo images here, organized as:

```
public/assets/camos/<game-slug>/<weapon-slug>/<image>.webp
```

Example:

```
public/assets/camos/mw2019/kilo-141/weapon.webp
public/assets/camos/mw2019/kilo-141/base-01.webp
public/assets/camos/mw2019/kilo-141/gold.webp
```

- Every weapon and challenge record in the database stores its expected
  image path in this structure (see the `image` column on `weapons` and
  `camo_challenges`).
- If a file is missing, the frontend shows an elegant placeholder instead
  of a broken image — you can add real images at any time without any
  code changes.
- Use the Admin Panel's "Upload Camo Image" form to upload files directly
  into the correct folder, or copy files here manually and point a
  challenge/weapon's `image` field at the path via the admin API.
- Recommended format: WebP, under ~200KB per image, for fast page loads.

# Differance Labs

Minimal static homepage for differancelabs.com.

## Structure

- `index.html` contains the page markup and metadata.
- `styles.css` contains the complete visual system and responsive layout.
- `assets/mark.svg` contains the geometric Differance Labs mark and favicon.

## Local Preview

Open `index.html` directly in a browser, or serve the folder locally:

```powershell
python -m http.server 3000
```

Then visit `http://localhost:3000`.

## Deploying to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel, create a new project and import that repository.
3. Keep the framework preset as `Other` or `Static`.
4. Leave the build command empty.
5. Leave the output directory empty or set it to `.`.
6. Deploy.

After deployment, add `differancelabs.com` in the Vercel project domain settings and follow Vercel's DNS instructions.

# Vercel preview setup

Create a NEW Vercel project named `artison-hallow` from the existing `DifferanceLabs/differancelabs` repository.

Settings:
- Framework Preset: Other
- Root Directory: `projects/artison-hallow`
- Production Branch: keep `main` for later; preview the `artison-hallow-mvp` branch now.
- Do not attach the differancelabs.com domain.
- Do not copy Differance Labs merchant/payment environment variables.
- Live payments remain disabled.

This isolated root contains only two serverless functions, staying below the Hobby-plan function limit.

After the preview succeeds, use its generated vercel.app URL for review. Keep noindex enabled until launch details are confirmed.
